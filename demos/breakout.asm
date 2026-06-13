; title: Breakout
; Game-mode demo: tile+sprite GPU, 2 BG layers, gamepad input, vblank-sync.
; Controls: left/right arrows or A/D to move the paddle.
;
; BG0 is a low-contrast diagonal texture that ripples via a real per-scanline
; HBLANK interrupt: a scanline-compare handler (line 1, _NC) rewrites BG0's
; scroll X for each line from a sine LUT and re-arms the compare one line later,
; so every visible line gets its own horizontal offset. The vblank handler
; (line 0, _NB) runs the game logic frame, drifts the base scroll, and advances
; the wave phase. BG1 holds the bricks (rows 2-6) and a digit-tile readout.
; The ball is a circular sprite; the paddle is two 9x9 sprites.
;
; Ball physics use sub-pixels (x3). Paddle reflection is Breakout-style: a
; constant ball speed whose ANGLE depends on where it hits the paddle — steep
; near the centre, shallow toward the edges, and never purely horizontal.
; Brick collisions probe the ball's leading edges per axis, so a hit on the
; side of a brick reverses X and a hit on top/bottom reverses Y.
;
; Memory layout: VRAM pages 0-8 = -9841..-3281. Code starts at JAA = -3280.

$bxs: B   $bys: C        ; ball position, sub-pixels (×3)
$vx:  D   $vy:  E        ; ball velocity, sub-pixels/frame
$px:  F                  ; paddle x, pixels (left edge)
$bx:  G   $by:  H        ; ball position, pixels (derived from sub-pixels)
$t:   I                  ; scratch (also clobbered by the vblank ISR)
$ptr: J   $n: K   $a: L  ; loop / addressing / probe scratch
$lives: N $score: Q $bricks: R $state: T   ; T=0 play, 1 win, 2 game over
$tens: U                 ; draw_score scratch
; HBLANK/raster ISR registers — touched only by the interrupt handlers, so the
; game-logic frame never needs to save/restore them (handlers run with all
; lines masked, so they can't nest or pre-empt mainline code).
$wphase: V               ; wave animation phase (advanced once per frame)
$widx:  W                ; per-line LUT index (reset to wphase each frame)
$wbase: X                ; BG0 base scroll X (drifts each frame)
$wtmp:  A                ; hblank scratch
$chaos: Y                ; chaos counter / fractional wave increment

        @0sJAA               ; assemble into code space just past VRAM (-3280),
                             ; clear of the register/MMIO band at 0..67
        J main_start          ; skip over the ISRs

; --- vblank ISR (line 0): wakes the game loop once per frame. It also resets
;     the raster state for the next frame: drift the base scroll, advance the
;     wave phase, reseed the per-line index, and arm the first hblank at line 0.
vblank:
        A wbase -1            ; parallax: drift BG0 left 1px/frame
        W 41 wbase            ; BG0 scroll X base for the top (off-screen) lines
        E state Z
        J vb_no_wipe
        W 42 162              ; wipe active -> map scanline 0 to blank row 162
        W 44 162
        J vb_done
vb_no_wipe:
        W 42 Z
        W 44 Z
vb_done:
        A wphase 1            ; animate the ripple
        L wphase 27 J vb_wrap ; keep phase in 0..26 (LUT period)
        A wphase -27
vb_wrap:
        M widx wphase         ; per-line walk starts at the phase
        F widx 2              ; shift left by 2 (multiply by 9)
        W 46 Z                ; _OF scanline-compare = 0 → first hblank at line 0
        R P 0sNZ              ; return: P = saved PC at _NZ (40); wakes the loop

; --- hblank ISR (line 1): runs once per visible scanline. Set BG0 scroll X/Y for
;     the next line. Returns to the H (resume) so the loop stays asleep. ---
hblank:
        R wtmp 45             ; wtmp = current scanline (y)
        E state Z
        J no_wipe             ; state == 0 → draw normally

        ; wipe phase: if y < wipe_y (chaos) OR y + wipe_y >= 162, scroll to off-screen row 162
        L wtmp chaos
        J show_black
        M widx wtmp
        A widx chaos          ; widx = y + chaos
        G widx 162
        J show_black
        W 42 Z                ; normal Y scroll (0)
        W 44 Z
        J finish_scroll

show_black:
        M widx 162            ; clobber widx as scratch (safe during game over)
        S widx wtmp           ; scrollY = 162 - y
        W 42 widx
        W 44 widx
        J finish_scroll

no_wipe:
        M wtmp widx           ; copy fractional index
        F wtmp -2             ; wtmp = round(widx / 9)
        L wtmp 27 J index_ok
        M wtmp Z              ; wrap 27 to 0
index_ok:
        A wtmp @wave_lut      ; wtmp = &wave_lut[index]
        R wtmp wtmp           ; wtmp = wave_lut[index]
        A wtmp wbase          ; base + ripple
        W 41 wtmp             ; BG0 scroll X for the upcoming line

        ; Ensure scroll Y is reset to 0 (in case we just restarted)
        W 42 Z
        W 44 Z

        A widx chaos          ; walk the LUT by fractional increment
        L widx 243 J hb_wrap  ; wrap fractional index
        A widx -243
hb_wrap:

finish_scroll:
        R wtmp 45             ; current scanline (_OE)
        A wtmp 1
        W 46 wtmp             ; _OF = next scanline → hblank fires again
        R P 0sNZ              ; return to the H (resume sleep)

; --- Init ---
main_start:
        M S 0sZZZ            ; stack top (well above code/VRAM) for C/O calls
        W 0sNB @vblank          ; install vblank handler at _NB (line 0 vector)
        W 0sNC @hblank          ; install hblank handler at _NC (line 1 vector)
        W Z 0sDMG             ; enable game mode (DMG → address 0)
        W 48 Z               ; show all layers
        W 47 AAA             ; reset backdrop to black
        ; seed the raster wave state and arm the first scanline compare
        M wbase Z
        M wphase Z
        M widx Z
        M chaos 9            ; normal wave increment (1x wavelength)
        W 46 Z               ; _OF scanline-compare = 0

        ; Tile 1: solid color1 (paddle, bricks) — 9 rows of ZZZ
        M a -7645             ; PATTERN_BASE + 9 = tile 1 start
        M n 9
        M t 9841
        C S memfill

        ; Tile 2: BG0 diagonal texture — color1 on column r of row r, color0
        ; elsewhere (value = -9841 + 2*3^(8-r)). Marches when scrolled.
        M a -7636            ; PATTERN_BASE + 18 = tile 2 start
        W a 3281
        I a 1   W a -5467
        I a 1   W a -8383
        I a 1   W a -9355
        I a 1   W a -9679
        I a 1   W a -9787
        I a 1   W a -9823
        I a 1   W a -9835
        I a 1   W a -9839

        ; Tiles 3-12: digit glyphs 0-9. Copy 90 trytes from the inline `font`
        ; table into pattern RAM at tile 3 (-7654 + 9*3 = -7627).
        M ptr @font
        M a -7627
        M n 90
        C S memcpy

        ; Tile 13: circular ball (color1 disc on transparent).
        M a -7537            ; PATTERN_BASE + 9*13 = tile 13 start
        W a 1089             ; ..XXXXX..
        I a 1   W a 3279     ; .XXXXXXX.
        I a 1   W a 9841     ; XXXXXXXXX
        I a 1   W a 9841
        I a 1   W a 9841
        I a 1   W a 9841
        I a 1   W a 9841
        I a 1   W a 3279     ; .XXXXXXX.
        I a 1   W a 1089     ; ..XXXXX..

        ; Palette A(-13): subtle scrolling BG texture (dark gray tones)
        W 0sIMA 0sGGG         ; color0 dark gray
        W 0sIMB 0sJJJ         ; color1 medium gray
        ; Palette _ (0): white — ball, paddle, and score digits
        W 0sIMZ 0sZZZ         ; color0 white
        W 0sI_A 0sZZZ         ; color1 white
        ; Pal N(1): blue bricks
        W 0sI_B 0sAAN         ; dark navy
        W 0sI_C 0sANZ         ; bright blue
        ; Pal O(2): green bricks
        W 0sI_D 0sAOA         ; dark green
        W 0sI_E 0sAZA         ; bright green
        ; Pal P(3): red bricks
        W 0sI_F 0sNAA         ; dark red
        W 0sI_G 0sZAA         ; bright red
        ; Pal Q(4): yellow bricks
        W 0sI_H 0sNNA         ; dark gold
        W 0sI_I 0sZZA         ; bright yellow
        ; Pal R(5): magenta bricks
        W 0sI_J 0sZAZ         ; magenta
        W 0sI_K 0sZNZ         ; pink

        ; BG0 tilemap (GAA): fill first 18 rows (18*27=486 entries) with [pal A, tile 2] = -9475
        M a 0sGAA
        M n 486
        M t -9475
        C S memfill

        ; BG1 tilemap (HAA): brick rows 2-6, cols 1-16, tile 1 (solid).
        ; Entry = pal*729 + 1; row palettes N,O,P,Q,R → 730,1459,2188,2917,3646
        M a -4683             ; HAA + 27*2 + 1
        M n 16
        M t 730
        C S memfill
        M a -4656             ; row 3
        M n 16
        M t 1459
        C S memfill
        M a -4629             ; row 4
        M n 16
        M t 2188
        C S memfill
        M a -4602             ; row 5
        M n 16
        M t 2917
        C S memfill
        M a -4575             ; row 6
        M n 16
        M t 3646
        C S memfill

        ; OAM: sprite 0 = ball (tile 13, circular), sprites 1+2 = paddle.
        M bx 76
        M by 100
        W -4009 by            ; ball y[0]
        W -3928 bx            ; ball x[0]
        W -3847 13            ; ball tile[0] = pal 0, tile 13 (disc)
        W -3766 Z             ; ball attr[0] = 9×9, front
        M px 72
        W -4008 140           ; paddle-L y[1]
        W -3927 px            ; paddle-L x[1]
        W -3846 1
        W -3765 Z
        M t px
        I t 9
        W -4007 140           ; paddle-R y[2]
        W -3926 t             ; paddle-R x[2] = px + 9
        W -3845 1
        W -3764 Z

        ; Ball + game state. Launch at an angle (down-right).
        M bxs 228            ; 76 * 3
        M bys 300            ; 100 * 3
        M vx 5
        M vy 8
        M lives 3
        M score Z
        M bricks 80          ; 5 rows × 16 cols
        M state Z
        C S draw_score       ; paint initial readout

; --- Game loop (one iteration per frame) ---
game_loop:
        H 0sUAA Z             ; sleep: line 0 (vblank) wakes, line 1 (hblank) resumes
        E state Z
        J playing             ; state == 0 → run a normal frame
        ; --- end state: wipe the screen to black ---
        W 48 729             ; hide sprite layer
        W 47 AAA             ; reset backdrop to black (-9841)
        A chaos 2            ; increment wipe Y threshold (2px per frame)
        L chaos 81
        J game_loop          ; loop if wipe is not complete
        J main_start         ; wipe complete -> restart game

playing:
        ; --- Decay chaos (wave increment back to 9) once every 10 frames ---
        ifl chaos 9
          M t wphase
        mod_loop:
          L t 10 J mod_done
          A t -10
          J mod_loop
        mod_done:
          ife t Z
            A chaos 2
          end
        end
        ; --- Paddle: gamepad X axis → ±5 px/frame, clamped to [0,144] ---
        R t 51                ; pad1 (_OK)
        F t -8                ; X axis → -1/0/+1
        M a t
        P a 5
        A px a
        ifl px Z
          M px Z
        end
        ifg px 144
          M px 144            ; 162 - 18 (paddle width)
        end

        ; --- Move ball in sub-pixels, derive pixel position ---
        A bxs vx
        A bys vy
        M bx bxs
        F bx -1               ; bx = round(bxs / 3)
        M by bys
        F by -1               ; by = round(bys / 3)

        ; --- Wall bounces (force the sign so the ball can't stick) ---
        ifl bx 1              ; bx <= 0 → left wall
          M bx Z
          M bxs Z
          F vx A              ; vx = |vx| (rightward)
        end
        ifg bx 153            ; bx >= 153 (162 - 9) → right wall
          M bx 153
          M bxs 459
          F vx A
          Z vx Z              ; vx = -|vx| (leftward)
        end
        ifl by 1              ; by <= 0 → top wall
          M by Z
          M bys Z
          F vy A              ; vy = |vy| (downward)
        end

        ; --- Paddle collision (only while falling) ---
        L vy 1
        J no_paddle           ; not moving down
        M t by
        A t 9                 ; ball bottom
        L t 140
        J no_paddle           ; above the paddle band
        G t 149
        J no_paddle           ; below the paddle band (140..148)
        M a bx
        A a 8
        L a px
        J no_paddle           ; ball entirely left of paddle
        M n px
        A n 18
        G bx n
        J no_paddle           ; ball entirely right of paddle
        ; hit: pick a Breakout-style angle by where it struck, then lift clear.
        ; rel = (ball centre) - (paddle left), 0..18. Constant speed (~9.5),
        ; steep near centre, shallow at the edges, vy always up.
        M t bx
        A t 4
        S t px                ; t = rel
        M vx 9
        M vy -3
        ifl t 15
          M vx 8
          M vy -6
        end
        ifl t 12
          M vx 3
          M vy -9
        end
        ifl t 9
          M vx -3
          M vy -9
        end
        ifl t 6
          M vx -8
          M vy -6
        end
        ifl t 3
          M vx -9
          M vy -3
        end
        M bys 393             ; lift to by=131 to avoid re-hitting the paddle
        M chaos 5             ; set wave increment to 5 (1.8x wavelength)
no_paddle:

        ; --- Brick collisions: probe each leading edge, reflect per axis ---
        ; Vertical probe at (cx, cy + 5*sign(vy)): a top/bottom hit reverses Y.
        M t bx
        A t 4
        M a by
        A a 4
        ifl vy Z
          A a -5
        else
          A a 5
        end
        C S probe
        ife n 1
          Z vy Z
        end
        ; Horizontal probe at (cx + 5*sign(vx), cy): a side hit reverses X.
        M t bx
        A t 4
        ifl vx Z
          A t -5
        else
          A t 5
        end
        M a by
        A a 4
        C S probe
        ife n 1
          Z vx Z
        end
        ifn bricks Z
        else
          M state 1           ; all bricks cleared → win
          M chaos Z           ; start screen wipe
        end

        ; --- Miss: ball fell past the paddle ---
        L by 154
        J no_miss
        A lives -1
        C S draw_score
        ifn lives Z
        else
          M state 2           ; out of lives → game over
          M chaos Z           ; start screen wipe
        end
        ifn lives Z
          M bxs 228           ; respawn the ball
          M bys 300
          M bx 76             ; refresh derived pixels so this frame's OAM is right
          M by 100
          M vx 5
          M vy 8
        end
no_miss:

        ; --- Update sprite positions ---
        W -4009 by
        W -3928 bx
        W -4008 140
        W -3927 px
        M t px
        I t 9
        W -4007 140
        W -3926 t

        J game_loop

; --- probe: test the brick cell containing pixel (t = x, a = y). If a brick
;     is there (and within rows 2-6), clear it, score it, and return n=1;
;     otherwise n=0. Clobbers t, a, ptr. Uses floor(/9) — matching the
;     renderer's tile mapping — so the hit cell is exactly the drawn cell. ---
probe:
        M n Z                 ; default: no hit
        M ptr Z               ; tile_row = floor(y / 9)
pr_row:
        L a 9  J pr_rowd
        A a -9
        A ptr 1
        J pr_row
pr_rowd:
        L ptr 2  J probe_ret  ; above bricks
        G ptr 7  J probe_ret  ; below bricks
        M a Z                 ; reuse a for tile_col = floor(x / 9)
pr_col:
        L t 9  J pr_cold
        A t -9
        A a 1
        J pr_col
pr_cold:
        F ptr 3               ; tile_row * 27
        A ptr a               ; + tile_col
        A ptr -4738           ; + BG1 map base (HAA)
        R t ptr               ; tilemap entry
        E t Z  J probe_ret    ; transparent → no brick
        W ptr Z               ; clear brick
        A score 1
        A bricks -1
        C S draw_score
        M n 1                 ; hit
        M chaos 5             ; set wave increment to 5 (1.8x wavelength)
probe_ret:
        O S P

; --- draw_score: paint score (2 digits, BG1 row 0 cols 0-1) and lives
;     (1 digit, col 26). Tilemap entry for digit d is [pal 0, tile 3+d] = 3+d.
;     Uses floor division by repeated subtraction (Q rounds, so is unusable). ---
draw_score:
        M tens Z
        M t score
ds_tens:
        L t 10
        J ds_done            ; t < 10 → tens settled, t = ones
        A t -10
        A tens 1
        J ds_tens
ds_done:
        A tens 3
        W -4738 tens         ; HAA + 0  (tens digit)
        A t 3
        W -4737 t            ; HAA + 1  (ones digit)
        M t lives
        A t 3
        W -4712 t            ; HAA + 26 (lives digit)
        O S P                ; return

; --- memcpy: copy `n` trytes from memory pointer `ptr` to destination `a`.
;     Clobbers: ptr, a, n (register stomping details: ptr/a advance by n, n becomes 0). ---
memcpy:
        E n Z J memcpy_ret   ; if n == 0, return
memcpy_loop:
        D a ptr              ; *a++ = *ptr++
        I n -1               ; n--
        N n Z J memcpy_loop  ; if n != 0, loop
memcpy_ret:
        O S P                ; return

; --- memfill: fill `n` trytes at destination `a` with value `t`.
;     Clobbers: a, n (register stomping details: a advances by n, n becomes 0). ---
memfill:
        E n Z J memfill_ret  ; if n == 0, return
memfill_loop:
        W a t                ; *a = t
        I a 1                ; a++
        I n -1               ; n--
        N n Z J memfill_loop ; if n != 0, loop
memfill_ret:
        O S P                ; return

; --- Digit font: tiles 3-12 = glyphs 0-9, 3×5 in the top-left of each 9×9
;     tile (color1 = white on transparent). Each row is one tryte; because the
;     glyph occupies columns 0-2, every row encodes as 0s?__ (high tribble).
;     9 trytes per glyph: 5 glyph rows then 4 blank rows. ---
font:
        Z__W__W__W__Z______________   ; 0
        P__P__P__P__P______________   ; 1
        Z__N__Z__V__Z______________   ; 2
        Z__N__Z__N__Z______________   ; 3
        W__W__Z__N__N______________   ; 4
        Z__V__Z__N__Z______________   ; 5
        Z__V__Z__W__Z______________   ; 6
        Z__N__P__P__P______________   ; 7
        Z__W__Z__W__Z______________   ; 8
        Z__W__Z__N__Z______________   ; 9

; --- Sine LUT for the hblank wave: 27 trytes, one period, amplitude 6px.
;     Each entry is a small signed tryte (high tribbles 0, low tribble = value):
;     round(6*sin(2*pi*i/27)) for i = 0..26. Indexed per scanline by the hblank
;     handler; the period spans 27 scanlines so ~6 ripples fill the 162px frame.
wave_lut:
        ___ __N __P __Q __R __S __S __S   ; i=0..7 :  0  1  3  4  5  6  6  6
        __S __R __Q __P __O __N __M __L   ; i=8..15:  6  5  4  3  2  1 -1 -2
        __K __J __I __H __H __H __H __I   ; i=16..23: -3 -4 -5 -6 -6 -6 -6 -5
        __J __K __M                       ; i=24..26: -4 -3 -1
