; title: Sound Sequencer
; Four-channel _Sx sound demo with a tiny game-mode step sequencer.
;
; Controls, after clicking the game display:
;   arrows / WASD  move the edit cursor
;   Z / E          toggle the selected step
;   X / R          raise the selected note's pitch/period offset
;   C / T          lower the selected note's pitch/period offset
;
; Rows are pulse 1, pulse 2, wave, and noise.  The default pattern starts
; playing immediately; each row writes its generator into the corresponding
; _Sx registers when the playhead reaches an enabled step.  Frequency offsets
; are per-note: move to a step and nudge it with X/R or C/T.

$step:   A       ; current playhead step 0..15
$cursor: B       ; edited step 0..15
$sel:    C       ; selected channel row 0..3
$tick:   D       ; frame divider for song tempo
$pad:    E       ; gamepad state
$held:   F       ; input latch: one action per key press
$ch:     G       ; draw/play channel loop
$col:    H       ; draw/play column loop
$ptr:    I       ; address scratch
$tmp:    J
$tile:   K
$val:    L
$delta:  Q

        @0sJAA
        M S 0sZZZ

        W Z 0sDMG             ; game-mode display
        W 47 0sDDD            ; backdrop
        K 0sGAA 729           ; clear BG0 map
        K 0sHAA 729           ; clear BG1 map

        ; Tilemap entries below use balanced palette index _ (0), whose two
        ; colours live at palette base + 26/+27.
        W 0sIMZ 0sCCC        ; dark off cells
        W 0sI_A 0sNZZ        ; bright active cells
        W 0sI_B 0sZZZ        ; cursor palette colour 0: bright white
        W 0sI_C 0sZNA        ; cursor palette colour 1: orange

        C S init_tiles
        C S init_wave
        C S init_sound

main:
        C S draw_grid
        C S read_input

        A tick 1
        L tick 18 J wait_frame
        M tick Z
        C S play_step
        A step 1
        L step 16 J wait_frame
        M step Z

wait_frame:
        H 0sAAA 1200          ; sleep a short wall-clock slice, all IRQs masked
        J main


; --- Input -------------------------------------------------------------------

read_input:
        R pad 51              ; _OK gamepad 1
        ife pad Z
          M held Z
        else
          ife held Z
            C S handle_input
            M held 1
          end
        end
        O S P

handle_input:
        M val pad             ; X axis = round(pad / 3^8)
        F val -8
        ifl val Z
          A cursor -1
          L cursor Z M cursor 15
        end
        ifg val Z
          A cursor 1
          L cursor 16 J hi_x_ok
          M cursor Z
hi_x_ok:
        end

        M delta pad           ; Y axis = round(pad / 3^7) - 3*X
        F delta -7
        M tmp val
        P tmp 3
        S delta tmp
        ifl delta Z
          A sel -1
          L sel Z M sel 3
        end
        ifg delta Z
          A sel 1
          L sel 4 J hi_y_ok
          M sel Z
hi_y_ok:
        end

        M tmp val             ; strip axes before testing buttons
        P tmp 6561
        S pad tmp
        M tmp delta
        P tmp 2187
        S pad tmp

        M tmp pad             ; A button = round(remainder / 3^6)
        F tmp -6
        ifn tmp Z
          C S toggle_step
        end

        M val tmp             ; strip A before B
        P val 729
        S pad val

        M tmp pad             ; B raises selected note period offset
        F tmp -5
        ifn tmp Z
          M delta 1
          C S tweak_freq
        end

        M val tmp             ; strip B before X
        P val 243
        S pad val

        M tmp pad             ; X lowers selected note period offset
        F tmp -4
        ifn tmp Z
          M delta -1
          C S tweak_freq
        end
        O S P

toggle_step:
        C S selected_pattern_addr
        R val ptr
        ife val Z
          W ptr 1
        else
          W ptr Z
        end
        O S P

tweak_freq:
        C S selected_freq_addr
        R tmp ptr
        A tmp delta
        ifl tmp -24
          M tmp -24
        end
        ifg tmp 24
          M tmp 24
        end
        W ptr tmp
        O S P

selected_pattern_addr:
        M ptr sel
        P ptr 16
        A ptr cursor
        A ptr @pattern
        O S P

selected_freq_addr:
        M ptr sel
        P ptr 16
        A ptr cursor
        A ptr @freq
        O S P


; --- Sound -------------------------------------------------------------------

init_sound:
        W 149 7               ; _SA master volume: loud, but less buzzy
        W 150 #111100000      ; _SB enable pulse1, pulse2, wave, noise
        W 156 0s_OP           ; _SH pulse 1 envelope: softer attack/decay
        W 160 0s_OP           ; _SL pulse 2 envelope: softer attack/decay
        W 162 0sN_P           ; _S_ wave envelope: gentle lead
        W 169 0s_NP           ; _ST noise envelope: percussion decay/release
        W 165 @wave           ; _SP wave table base
        O S P

play_step:
        M ch Z
play_ch:
        M ptr ch
        P ptr 16
        A ptr step
        A ptr @pattern
        R val ptr
        M ptr ch
        P ptr 16
        A ptr step
        A ptr @notes
        R ptr ptr
        M tmp ptr
        M ptr ch
        P ptr 16
        A ptr step
        A ptr @freq
        R ptr ptr
        A tmp ptr

        E ch Z J play_pulse1
        E ch 1 J play_pulse2
        E ch 2 J play_wave
        J play_noise

play_pulse1:
        W 154 tmp             ; _SF period
        ife val Z
          W 153 Z             ; gate off: release
        else
          W 153 2             ; gate on: 25% duty, less square buzz
          W 155 0sTN_         ; max 7, sustain 1
        end
        J next_play_ch

play_pulse2:
        W 158 tmp             ; _SJ period
        ife val Z
          W 157 Z
        else
          W 157 2             ; 25% duty
          W 159 0sSN_         ; max 6, sustain 1
        end
        J next_play_ch

play_wave:
        W 163 tmp             ; _SN period
        ife val Z
          W 161 Z
        else
          W 161 1
          W 164 0sVP_         ; max 9, sustain 3
        end
        J next_play_ch

play_noise:
        W 167 tmp             ; _SR period
        ife val Z
          W 166 Z
        else
          W 166 1
          W 168 0sP__         ; max 3, sustain 0: soft decaying hit
        end

next_play_ch:
        A ch 1
        L ch 4 J play_ch
        O S P


; --- Display -----------------------------------------------------------------

draw_grid:
        M ch Z
draw_row:
        M col Z
draw_col:
        M ptr ch
        P ptr 16
        A ptr col
        A ptr @pattern
        R val ptr

        M tile 2              ; off tile
        ifn val Z
          M tile 1            ; active tile
        end
        ife col step
          M tile 4            ; playhead tile
        end
        M ptr ch              ; visible map row = 5 + ch*2
        P ptr 2
        A ptr 5
        P ptr 27
        A ptr col
        A ptr 1
        A ptr 0sGAA
        W ptr tile

        A col 1
        L col 16 J draw_col
        A ch 1
        L ch 4 J draw_row
        C S draw_cursor_sprite
        O S P

draw_cursor_sprite:
        M ptr sel             ; y = (5 + sel*2) * 9
        P ptr 2
        A ptr 5
        P ptr 9
        W 0sIAA ptr           ; sprite 0 y

        M ptr cursor          ; x = (1 + cursor) * 9
        A ptr 1
        P ptr 9
        W 0sIDA ptr           ; sprite 0 x

        W 0sIGA 732           ; sprite 0 tile = palette 1, cursor border
        W 0sIJA Z             ; 9x9, front
        O S P

init_tiles:
        ; tile 1: active, filled with colour 1
        K -7645 9
        W -7645 #111111111
        W -7644 #111111111
        W -7643 #111111111
        W -7642 #111111111
        W -7641 #111111111
        W -7640 #111111111
        W -7639 #111111111
        W -7638 #111111111
        W -7637 #111111111

        ; tile 2: inactive, filled with colour 0
        W -7636 #TTTTTTTTT
        W -7635 #TTTTTTTTT
        W -7634 #TTTTTTTTT
        W -7633 #TTTTTTTTT
        W -7632 #TTTTTTTTT
        W -7631 #TTTTTTTTT
        W -7630 #TTTTTTTTT
        W -7629 #TTTTTTTTT
        W -7628 #TTTTTTTTT

        ; tile 3: selected cursor sprite, transparent interior
        W -7627 #111111111
        W -7626 #0_______1
        W -7625 #0_______1
        W -7624 #0_______1
        W -7623 #0_______1
        W -7622 #0_______1
        W -7621 #0_______1
        W -7620 #0_______1
        W -7619 #111111111

        ; tile 4: playhead, vertical stripe
        W -7618 #TTT111TTT
        W -7617 #TTT111TTT
        W -7616 #TTT111TTT
        W -7615 #TTT111TTT
        W -7614 #TTT111TTT
        W -7613 #TTT111TTT
        W -7612 #TTT111TTT
        W -7611 #TTT111TTT
        W -7610 #TTT111TTT
        O S P

init_wave:
        M ptr @wave
        M tmp @wave_shape
        M val 27
wave_copy:
        D ptr tmp
        A val -1
        G val 1 J wave_copy
        O S P


; --- Default song and note values --------------------------------------------

pattern:
        ; pulse 1 sparkle
        1 0 0 1  0 1 0 0  1 0 1 0  0 1 0 0
        ; pulse 2 bass pulse
        1 0 0 1  0 0 1 0  1 0 0 1  0 1 0 0
        ; wave lead
        1 1 1 1  1 1 1 1  1 1 1 1  1 1 1 1
        ; noise drums, sparse
        1 0 0 0  1 0 0 0  1 0 1 0  1 0 0 0

notes:
        ; pulse 1 periods: light arpeggio
        75 0 0 50  0 59 0 0  67 0 59 0  0 50 0 0
        ; pulse 2 periods: bass
        150 0 0 150  0 0 200 0  178 0 0 178  0 200 0 0
        ; wave periods: full wave cycle is period*27 samples
        4 4 5 4  3 4 5 4  6 5 4 3  4 5 4 3
        ; noise periods
        7 0 0 0  5 0 0 0  9 0 4 0  5 0 0 0

freq:
        ; per-step editable period offsets
        0 0 0 0  0 0 0 0  0 0 0 0  0 0 0 0
        0 0 0 0  0 0 0 0  0 0 0 0  0 0 0 0
        0 0 0 0  0 0 0 0  0 0 0 0  0 0 0 0
        0 0 0 0  0 0 0 0  0 0 0 0  0 0 0 0

wave:
        0 0 0 0 0 0 0 0 0
        0 0 0 0 0 0 0 0 0
        0 0 0 0 0 0 0 0 0

wave_shape:
        0 3 6 9 11 13 11 9 6
        3 0 -3 -6 -9 -11 -13 -11 -9
        -6 -3 0 2 4 2 0 -2 -4
