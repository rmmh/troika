; title: Maze Generator
; Binary-tree maze on a 41x41 cell grid rendered on the 81x81 display.
; Cell (r,c) maps to pixel (2r,2c).  Passages open to the East or North.
; PRNG: LCG state = state * 757 + 1, full period 3^9 = 19,683.
; Regenerates forever, each time continuing from the current PRNG state.

$state: A
$r:     B
$c:     C
$ptr:   D
$eptr:  E
$nptr:  F


        W Z 0sDPN             ; enable framebuffer display (write DPN to ___)
restart:
        K -9841 6561          ; clear display (gray walls)

        M r Z
row_loop:
        M c Z
col_loop:
        ; ptr = -9841 + r*162 + 2c   (pixel address of cell (r,c))
        M ptr r
        F ptr 4               ; ptr = r * 81
        A ptr ptr             ; ptr = r * 162
        A ptr c
        A ptr c               ; ptr += 2c
        A ptr -9841

        E r Z   J handle_top  ; top row: always East (if c<40)
        E c 40  J do_north    ; right column: always North

        P state 0sNNN         ; LCG step  (NNN = 757)
        A state 1
        L state Z  J do_north ; state < 0 → North, else East

do_east:
        M eptr ptr
        A eptr 1              ; east wall pixel = ptr + 1
        W eptr 0sZZZ
        J done

do_north:
        M nptr ptr
        S nptr 81             ; north wall pixel = ptr - 81
        W nptr 0sZZZ
        J done

handle_top:
        E c 40  J done        ; top-right corner: cell only
        J do_east

done:   W ptr 0sZZZ           ; always paint cell pixel white

        A c 1
        L c 41  J col_loop

        A r 1
        L r 41  J row_loop

        H Z -1                ; brief pause (~18 ms)
        J restart
