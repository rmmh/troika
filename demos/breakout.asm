; title: Breakout
; Game-mode demo: tile+sprite GPU, 2 BG layers, gamepad input, vblank-sync.
; Controls: left/right arrows or A/D to move the paddle.
;
; BG0 is a low-contrast diagonal texture scrolled left each vblank (parallax).
; BG1 holds the brick field (rows 2-6) and a digit-tile score/lives readout
; (row 0). Ball + paddle are sprites. Paddle reflection is 5-zone and the ball
; moves in sub-pixels (×3) so the bounce angle is finer than one pixel/frame.
;
; Memory layout: VRAM pages 0-8 = -9841..-3281. Code starts at JAA = -3280.
; ISR at JAA+1 = -3279 (4 trytes). main_start follows.

$bxs: B   $bys: C        ; ball position, sub-pixels (×3)
$vx:  D   $vy:  E        ; ball velocity, sub-pixels/frame
$px:  F                  ; paddle x, pixels (left edge)
$bx:  G   $by:  H        ; ball position, pixels (derived from sub-pixels)
$t:   I                  ; scratch (also clobbered by the vblank ISR)
$ptr: J   $n: K   $a: L  ; loop / addressing scratch
$lives: N $score: Q $bricks: R $state: T   ; T=0 play, 1 win, 2 game over
$tens: U                 ; draw_score scratch

        @0sJAA               ; assemble into code space just past VRAM (-3280),
                             ; clear of the register/MMIO band at 0..67
        J main_start          ; skip over the 4-tryte vblank ISR

vblank:
        R t 41                ; t = BG0 scroll X (_OA)
        I t -1                ; scroll left 1px/frame
        W 41 t                ; write back
        R P 0sNZ              ; return: P = saved PC at _NZ (40)

; --- Init ---
main_start:
        M S 0sZZZ            ; stack top (well above code/VRAM) for C/O calls
        W 0sNB @vblank          ; install vblank handler at _NB (line 0 vector)
        W Z 0sDMG             ; enable game mode (DMG → address 0)

        ; Tile 1: solid color1 (paddle, ball, bricks) — 9 rows of ZZZ
        M a -7645             ; PATTERN_BASE + 9 = tile 1 start
        M n 9
fill_t1:
        W a 9841
        I a 1
        I n -1
        N n Z J fill_t1

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
fcopy:  D a ptr
        I n -1
        N n Z J fcopy

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

        ; BG0 tilemap (GAA): fill 27×27 with [pal A, tile 2] = -9475
        M a 0sGAA
        M n 0sN__
fill_bg0:
        W a -9475
        I a 1
        I n -1
        N n Z J fill_bg0

        ; BG1 tilemap (HAA): brick rows 2-6, cols 1-16, tile 1 (solid).
        ; Entry = pal*729 + 1; row palettes N,O,P,Q,R → 730,1459,2188,2917,3646
        M a -4683             ; HAA + 27*2 + 1
        M n 16
fill_b0:
        W a 730
        I a 1
        I n -1
        N n Z J fill_b0
        M a -4656             ; row 3
        M n 16
fill_b1:
        W a 1459
        I a 1
        I n -1
        N n Z J fill_b1
        M a -4629             ; row 4
        M n 16
fill_b2:
        W a 2188
        I a 1
        I n -1
        N n Z J fill_b2
        M a -4602             ; row 5
        M n 16
fill_b3:
        W a 2917
        I a 1
        I n -1
        N n Z J fill_b3
        M a -4575             ; row 6
        M n 16
fill_b4:
        W a 3646
        I a 1
        I n -1
        N n Z J fill_b4

        ; OAM: sprite 0 = ball, sprites 1+2 = paddle (two adjacent 9×9).
        ; Tile entry 1 → pal _(0), tile 1 (white solid). attr Z = 9×9, front.
        M bx 76
        M by 100
        W -4009 by            ; ball y[0]
        W -3928 bx            ; ball x[0]
        W -3847 1             ; ball tile[0]
        W -3766 Z             ; ball attr[0]
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

        ; Ball + game state
        M bxs 228            ; 76 * 3
        M bys 300            ; 100 * 3
        M vx Z
        M vy 4               ; falling
        M lives 3
        M score Z
        M bricks 80          ; 5 rows × 16 cols
        M state Z
        C S draw_score       ; paint initial readout

; --- Game loop (one iteration per frame) ---
game_loop:
        H 0sRAA Z             ; sleep until vblank (line 0 wakes past the H)
        E state Z
        J playing             ; state == 0 → run a normal frame
        ; --- end state: cycle the backdrop so win/loss is obvious ---
        R t 41               ; ISR-driven frame counter
        ife state 1
          P t 27             ; win → animate the green channel
        else
          P t 729            ; game over → animate the red channel
        end
        W 47 t               ; backdrop (_OG)
        J game_loop

playing:
        ; --- Paddle: gamepad X axis → ±3 px/frame, clamped to [0,144] ---
        R t 51                ; pad1 (_OK)
        F t -8                ; X axis → -1/0/+1
        M a t
        P a 3
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
        ; hit: reflect up, lift clear of the paddle, pick angle by hit zone
        F vy A
        Z vy Z                ; vy = -|vy|
        M bys 417             ; by = 139
        M t bx
        A t 4
        S t px                ; t = (ball centre) - (paddle left), 0..18
        M vx 5
        L t 14
        M vx 3
        L t 11
        M vx Z
        L t 7
        M vx -3
        L t 4
        M vx -5
no_paddle:

        ; --- Brick collision: only inside brick rows 2-6 ---
        M ptr by
        F ptr -2              ; tile_row = round(by / 9)
        L ptr 2
        J no_brick            ; above bricks
        G ptr 7
        J no_brick            ; below bricks
        M t bx
        F t -2                ; tile_col = round(bx / 9)
        F ptr 3               ; tile_row * 27
        A ptr t               ; + tile_col
        A ptr -4738           ; + BG1 map base (HAA)
        R t ptr               ; tilemap entry at that cell
        E t Z
        J no_brick            ; transparent → no brick
        W ptr Z               ; clear brick
        Z vy Z                ; reverse vertical direction
        A score 1
        A bricks -1
        C S draw_score
        ife bricks Z
          M state 1           ; all bricks cleared → win
        end
no_brick:

        ; --- Miss: ball fell past the paddle ---
        L by 154
        J no_miss
        A lives -1
        C S draw_score
        ife lives Z
          M state 2           ; out of lives → game over
        else
          M bxs 228           ; respawn the ball
          M bys 300
          M bx 76             ; refresh derived pixels so this frame's OAM is right
          M by 100
          M vx Z
          M vy 4
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
