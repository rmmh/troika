; title: Breakout
; Game-mode demo: tile+sprite GPU, 2 BG layers, gamepad input, vblank-sync.
; Controls: left/right arrows or A/D to move paddle.
; BG0 scrolls each vblank for low-contrast parallax. Bricks clear on hit.
;
; Memory layout: VRAM pages 0-8 = -9841..-3281. Code starts at JAA = -3280.
; ISR at JAA+1 = -3279 (7 trytes). main_start at -3272.

$bx: B  $by: C  $vx: D  $vy: E  $px: F
$t:  G  $ptr: N  $n:  K  $a:  L

        J main_start          ; 1 tryte — skip over 7-tryte vblank ISR

vblank:
        R t 41                ; t = BG0 scroll X (_OA)
        I t -1                ; scroll left 1px/frame
        W 41 t                ; write back
        R P 0sNZ              ; return: P = saved PC at _NZ (address 40)

; --- Init ---
main_start:
        W 0sNB @vblank          ; install vblank handler at _NB (address 15, IRQ line 0)
        W Z 0sDMG             ; enable game mode (DMG → address 0)

        ; Tile 1: solid color1 — 9 rows of ZZZ (9841 = all trit-1 = color1)
        M a -7645             ; PATTERN_BASE + 9 = tile 1 start
        M n 9
fill_t1:
        W a 9841
        I a 1
        I n -1
        N n Z J fill_t1

        ; Palette RAM at IMA = -3685 (27 palettes × 2 colours each)
        ; Pal A(-13): subtle scrolling BG texture (dark gray tones)
        W 0sIMA 0sGGG         ; dark gray
        W 0sIMB 0sJJJ         ; medium gray
        ; Pal _ (0): white — ball and paddle
        W 0sIMZ 0sZZZ         ; white
        W 0sI_A 0sZZZ         ; white
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
        W 0sI_J 0sAZA         ; green
        W 0sI_K 0sZZA         ; bright yellow

        ; BG0 tilemap (GAA = -5467): fill 27×27 with tile 1, pal A
        ; Entry = pal=-13, tile=1 → value -9476
        M a 0sGAA
        M n 0sN__
fill_bg0:
        W a -9476
        I a 1
        I n -1
        N n Z J fill_bg0

        ; BG1 tilemap (HAA = -4738): brick rows 2–6, cols 1–16
        ; Entry = pal*729 + tile-1 (tile=1): row palettes N,O,P,Q,R → 730,1459,2188,2917,3646
        M a -4683             ; HAA + 27*2 + 1 = -4738 + 55
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

        ; OAM: sprite 0 = ball, sprites 1+2 = paddle (two adjacent 9×9)
        ; Tile entry 1 → pal=_(0), tile=1 (white solid)
        M bx 76
        M by 100
        W -4009 by            ; OAM y[0]
        W -3928 bx            ; OAM x[0]
        W -3847 1             ; OAM tile[0]: pal=_, tile=1
        W -3766 Z             ; OAM attr[0]: 0 = 9×9, priority=front
        M px 72
        W -4008 140           ; OAM y[1]
        W -3927 px            ; OAM x[1]
        W -3846 1
        W -3765 Z
        M t px
        I t 9
        W -4007 140           ; OAM y[2]
        W -3926 t             ; OAM x[2] = px + 9
        W -3845 1
        W -3764 Z

        M vx 1
        M vy -1

; --- Game loop ---
game_loop:
        H 0sRAA Z             ; sleep until vblank (mask trit-0=1 = wake-past-H)

        ; Paddle: read gamepad X axis
        R t 51                ; t = pad1 at _OK (address 51)
        F t -8                ; isolate X axis: divRound(t, 3^8) → -1/0/+1
        A px t
        L px Z
        M px Z                ; clamp: pad_x = max(0, pad_x)
        G px 144
        M px 144              ; clamp: pad_x = min(144, pad_x)

        ; Move ball
        A bx vx
        A by vy

        ; Wall bounces (set direction explicitly to avoid sticking)
        L bx Z
        M vx 1                ; left wall: force rightward
        G bx 153
        M vx -1               ; right wall: force leftward (162-9=153)
        L by Z
        M vy 1                ; top wall: force downward

        ; Paddle collision: ball bottom in [140,149) → bounce
        M t by
        I t 9                 ; t = by + 9 = ball bottom
        L t 140
        J no_paddle
        G t 149
        J no_paddle
        M vy -1               ; bounce: force upward
no_paddle:

        ; Bottom bounce (no lives for this demo)
        G by 153
        M vy -1

        ; Brick collision: look up BG1 tilemap at ball tile position
        M ptr by
        F ptr -2              ; tile_row = round(by / 9)
        M t bx
        F t -2                ; tile_col = round(bx / 9)
        F ptr 3               ; tile_row * 27
        A ptr t               ; tile_row*27 + tile_col
        A ptr -4738           ; + BG1 map base (HAA)
        R t ptr               ; t = tilemap entry at that cell
        E t Z
        J no_brick            ; 0 = transparent = no brick
        W ptr Z               ; clear brick
        Z vy Z                ; negate vy
no_brick:

        ; Update OAM positions
        W -4009 by
        W -3928 bx
        W -4008 140
        W -3927 px
        M t px
        I t 9
        W -4007 140
        W -3926 t

        J game_loop
