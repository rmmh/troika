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
$cp:     G       ; col-1 wrapped
$cn:     H       ; col+1 wrapped
$cnt:    I       ; neighbour count
$nbr:    J       ; scratch for one neighbour
$self:   K       ; current cell (normalised 0 or 1)
$nxt:    L       ; next cell value (0 or ZZZ)
$dst:    N       ; write pointer into BUF1
$state:  Q       ; PRNG state
$tmp:    R       ; scratch address register
$csrc:   T       ; copy: BUF1 read pointer
$cdst:   U       ; copy: BUF0 write pointer
$ccnt:   V       ; copy: tryte count
$iptr:   W       ; init write pointer
$icnt:   X       ; init count

@_AA
        W Z DPN               ; enable framebuffer display (write DPN to ___)
        ; --- random initial state ---
        M state 1
        M iptr -9841
        M icnt 6561
init:   P state NNN           ; LCG step  (NNN = 757)
        I state 1
        ifg state Z           ; state >= 0 → alive
          W iptr ZZZ
        end
        I iptr 1
        I icnt -1
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

        M c Z
col_loop:
        ; column neighbours with toroidal wrap
        M cp c
        ifl cp 1
          M cp 80
        else
          I cp -1
        end

        M cn c
        ife cn 80
          M cn Z
        else
          I cn 1
        end

        ; --- count 8 neighbours (each normalised to 0 or 1) ---
        M tmp rp  A tmp cp  R cnt tmp
        ifn cnt Z  M cnt 1  end

        M tmp rp  A tmp c   R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        M tmp rp  A tmp cn  R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        M tmp rbase  A tmp cp  R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        M tmp rbase  A tmp cn  R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        M tmp rn  A tmp cp  R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        M tmp rn  A tmp c   R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        M tmp rn  A tmp cn  R nbr tmp
        ifn nbr Z  M nbr 1  end
        A cnt nbr

        ; current cell (normalised)
        M tmp rbase  A tmp c  R self tmp
        ifn self Z  M self 1  end

        ; --- apply rule ---
        M nxt Z               ; default dead
        ife cnt 3
          M nxt ZZZ
          J write_cell
        end
        ife cnt 2
          ifn self Z
            M nxt ZZZ
          end
        end

write_cell:
        W dst nxt
        I dst 1

        I c 1
        L c 81  J col_loop

        I r 1
        L r 81  J row_loop

        ; --- copy BUF1 → BUF0 ---
        M csrc 3281
        M cdst -9841
        M ccnt 6561
cploop: D cdst csrc
        I ccnt -1
        N ccnt Z  J cploop

        J main
