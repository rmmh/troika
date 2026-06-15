; title: Conway's Game of Life
; 81x81 toroidal Game of Life with double-buffered display.
;
; BUF0 (display, pages A-I): AAA = -9841.  BUF1 (scratch, pages S-Z): SAA = 3281.
; Dead = 0 (gray).  Alive = ZZZ = 9841 (white).
; PRNG seeds the initial pattern: LCG state = state * 757 + 1.

$r:      B       ; row 0..80
$c:      C       ; col 0..80
$rbase:  D       ; BUF0 start of row r
$rp:     E       ; BUF0 start of row r-1 (toroidal)
$rn:     F       ; BUF0 start of row r+1 (toroidal)
$cnt:    I       ; neighbour count
$nxt:    L       ; next cell value (0 or ZZZ)
$dst:    N       ; write pointer into BUF1
$state:  Q       ; PRNG state
$csrc:   T       ; copy: BUF1 read pointer
$cdst:   U       ; copy: BUF0 write pointer
$ccnt:   V       ; copy: tryte count
$iptr:   W       ; init write pointer
$icnt:   X       ; init count

$cell/3:
        ; --- count 8 neighbours ---
        ; Alive cells are ZZZ; wrapped sums are unique for 0..8 neighbours:
        ; 2 -> __M, 3 -> ZZY.
        M cnt Z

        A cnt rp/0
        A cnt rp/$2
        A cnt rp/$3

        A cnt rbase/0
        A cnt rbase/$3

        A cnt rn/0
        A cnt rn/$2
        A cnt rn/$3

        ; --- apply rule ---
        M nxt Z               ; default dead
        E cnt 0sZZY  J live_cell_$$
        N cnt 0s__M  J write_cell_$$
        N rbase/$2 Z  M nxt 0sZZZ
        J write_cell_$$

live_cell_$$:
        M nxt 0sZZZ

write_cell_$$:
        W dst nxt
        A dst 1
        J $1
end


        W Z 0sDPN             ; enable framebuffer display (write DPN to ___)
        ; --- random initial state ---
        M state 1
        M iptr -9841
        M icnt 6561
init:   P state 0sNNN         ; LCG step  (NNN = 757)
        A state 1
        ifg state Z           ; state >= 0 → alive
          W iptr 0sZZZ
        end
        A iptr 1
        A icnt -1
        N icnt Z  J init

; ---- per-generation loop ----
main:   M dst 3281            ; reset BUF1 write pointer
        M r Z
row_loop:
        ; rbase = BUF0 + r*81
        M rbase r
        F rbase 4
        A rbase -9841

        ; rp: row r-1 base (wraps from row 80 when r==0)
        M rp rbase
        ifl r 1
          A rp 6480           ; r==0: rp = -9841 + 80*81
        else
          S rp 81
        end

        ; rn: row r+1 base (wraps to row 0 when r==80)
        M rn rbase
        ife r 80
          S rn 6480           ; r==80: rn = rbase - 6480 = -9841
        else
          A rn 81
        end

        ; Bias row pointers to the left-neighbour column for each cell.
        ; Column 0 wraps left to 80.
        M c Z
        A rp 80
        A rbase 80
        A rn 80
        cell first_col_done -80 -79

first_col_done:
        A rp -80
        A rbase -80
        A rn -80
        M c 1
col_loop:
        cell middle_col_done 1 2

middle_col_done:
        A c 1
        A rp 1
        A rbase 1
        A rn 1
        L c 80  J col_loop

        ; column 80 wraps right to 0.
        cell row_done 1 -79

row_done:
        A r 1
        L r 81  J row_loop

        ; --- copy BUF1 → BUF0 ---
        M csrc 3281
        M cdst -9841
        M ccnt 6561
cploop:
        D cdst csrc
        D cdst csrc
        D cdst csrc
        D cdst csrc
        D cdst csrc
        D cdst csrc
        D cdst csrc
        D cdst csrc
        D cdst csrc
        A ccnt -9
        N ccnt Z  J cploop

        J main
