; Mandelbrot set rendered to the nine VRAM pages (A.. through I.., an 81x81 grid).
;
; Fixed point: all coordinates carry a scale factor of 27, so one pixel is one
; fixed-point step and values stay well inside a tryte (+-9841). Each pixel
; maps to c = (cx/27, cy/27) where
;   cx = 27*page_col + col - 15    (re spans about -2.04 .. 0.93)
;   cy = 27*page_row + row         (im spans about -1.48 .. 1.48)
; A product of two scaled values carries 27*27, so it is divided by 27 (Q,
; round-to-nearest) to get back to scale; the escape test |z|^2 >= 4 becomes
; x^2/27 + y^2/27 >= 4*27 = 108.
;
; The page loops walk pages in ID order and the cell loops walk each page in
; row-major order -- which is exactly VRAM address order -- so the output
; pointer simply starts at the first page tryte (AAA = -9841) and increments
; once per pixel.

$page_row: B
$page_col: U
$row: R
$col: C
$ptr: D
$cx: K
$cy: L
$x: X
$y: Y
$iter: I
$color: G

@_AA
        M S _ZZ              ; call stack grows down from the top of page _
        M ptr -9841          ; first tryte of VRAM page A
        M page_row -1
prow:   M page_col -1
pcol:   M row -13
rloop:  M col -13
cloop:  C S pixel
        I ptr 1
        I col 1
        L col 14 J cloop     ; each predicate guards its loop's back-edge
        I row 1
        L row 14 J rloop
        I page_col 1
        L page_col 2 J pcol
        I page_row 1
        L page_row 2 J prow
        H Z Z                ; full canvas painted -- sleep forever

; Paint the pixel for the current loop counters at ptr.
pixel:  M cx page_col
        P cx 27
        A cx col
        S cx 15              ; cx = 27*page_col + col - 15
        M cy page_row
        P cy 27
        A cy row             ; cy = 27*page_row + row

        ; iterate z = z^2 + c from z = 0, at most 26 rounds
        M x Z
        M y Z
        M iter Z
        M color -9841        ; pixels that never escape stay black
orbit:  M E x
        P E x
        Q E 27               ; E = x^2, rescaled (x*x carries 27*27)
        M F y
        P F y
        Q F 27               ; F = y^2, rescaled
        M T E
        A T F
        ifg T 108            ; escaped: gray by speed (dark = escaped fast)
          M color iter
          S color 13
          P color NNN        ; splat the gray level into R, G and B
          J draw
        end
        M T x
        P T y
        Q T 27
        A T T                ; T = 2xy
        M x E
        S x F
        A x cx               ; x' = x^2 - y^2 + cx
        M y T
        A y cy               ; y' = 2xy + cy
        I iter 1
        L iter 26 J orbit
draw:   W ptr color
        O S P                ; return
