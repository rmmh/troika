; title: Langton's Ant
; Langton's ant on an 81x81 toroidal grid.  Cells start 'white' (K-zeroed = 0).
; White cell (0): turn right, flip to ZZZ, step forward.
; Black cell (ZZZ): turn left, flip to 0, step forward.
; After ~10,000 steps a periodic 'highway' diagonal emerges.
;
; Direction: 0=North 1=East 2=South 3=West.

$ax:   A       ; x-coordinate (col) 0..80
$ay:   B       ; y-coordinate (row) 0..80
$dir:  C       ; direction 0..3
$cell: D       ; current cell value
$ptr:  E       ; pixel address

@_AA
        K -9841 6561          ; zero all display pixels (white for Langton)

        M ax 40               ; start at centre
        M ay 40
        M dir Z               ; facing North (0)

step:   M ptr ay
        F ptr 4               ; ptr = ay * 81
        A ptr ax              ; ptr += ax
        A ptr -9841           ; ptr += BUF0 base

        R cell ptr            ; cell = *ptr

        ife cell Z
          I dir 1             ; white: turn right
          W ptr ZZZ           ; paint black
        else
          I dir -1            ; black: turn left
          W ptr Z             ; paint white
        end

        E dir -1   M dir 3   ; wrap dir below 0 → 3
        E dir 4    M dir Z   ; wrap dir above 3 → 0

        E dir Z    I ay -1   ; North: ay--
        E dir 1    I ax 1    ; East:  ax++
        E dir 2    I ay 1    ; South: ay++
        E dir 3    I ax -1   ; West:  ax--

        E ax -1    M ax 80   ; toroidal wrap
        E ax 81    M ax Z
        E ay -1    M ay 80
        E ay 81    M ay Z

        J step
