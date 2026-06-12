; ===============================================================================
; TROIKA MULTI-PAGE MANDELBROT SET GENERATOR v8.0
; TARGET PC: _AA (Main entry execution point)
; OUTPUT VRAM CANVAS: 9 Pages (A?? through I?? forming a continuous 81x81 grid)
; ===============================================================================
; DESIGN & MATHEMATICAL STRATEGY:
;
; 1. GRID CORRESPONDENCE:
;    The VRAM canvas spans 9 contiguous pages from A?? to I??, forming an 81x81 
;    pixel grid[cite: 63]. By looping the outer macro page coordinates (page_row and 
;    page_col) from -1 to +1, and the inner local page cell coordinates (row 
;    and col) from -13 to +13, we map out the entire space[cite: 62]. The unique 9-trit 
;    hardware target address is dynamically constructed as: 0s[Page ID][Row][Column].
;
; 2. FIXED-POINT SCALING:
;    To eliminate fractional values on a machine operating entirely on integer 
;    trytes, all complex numbers are scaled by a factor of 27 (3^3)[cite: 60]. This provides 
;    high-fidelity tracking within the native limits of a balanced tryte (+-9841) 
;    without inducing numerical truncation or arithmetic overflow during 
;    multiplication operations[cite: 60].
;
; 3. PLANE MAPPING:
;    - Real Axis (cx): Calculated via 27 * page_col + col - 15. This perfectly 
;      maps the horizontal canvas span to an unscaled interval of approx [-2.03, 0.92].
;    - Imaginary Axis (cy): Calculated via 27 * page_row + row. This maps the 
;      vertical canvas span symmetrically to an unscaled interval of approx [-1.48, 1.48].
;
; 4. ESCAPE ORBIT FORMULA:
;    - E = x^2 / 27 and F = y^2 / 27 [cite: 68]
;    - If (E + F) >= 108, the complex coordinate has successfully escaped the 
;      localized gravity threshold (4 * 27 = 108) and is routed to the symmetric 
;      grayscale gradient engine[cite: 29].
; ===============================================================================

; --- REGISTER ALIASES ---
$page_row: B
$page_col: U
$row: R
$col: C
$vram_ptr: D
$cx: K
$cy: L
$mandel_x: X
$mandel_y: Y
$iter: I

; ===============================================================================
; MAIN EXECUTION FLOW
; ===============================================================================
@_AA                ; Set Origin to execution start path

; --- GLOBAL INITIALIZATION ---
M W 13              ; Intra-page loop upper limit constraint
M T 108             ; Fixed Escape Threshold: 4 * 27
M V 26              ; Max iteration cutoff ceiling

M page_row -1       ; Start Page Row loop index at top row (-1)
page_row_loop:
    M page_col -1   ; Start Page Column loop index at left column (-1)
page_col_loop:
    M row -13   ; Initialize local page row cell counter
row_loop:
    M col -13 ; Initialize local page column cell counter
col_loop:
    ; --- 1. CALCULATE 9-TRIT POINTER ADDRESS ---
    M G page_row
    P G 3
    A G page_col
    S G 9       ; G = 3 * page_row + page_col - 9 (Computes current Page ID)
    F G 6       ; Shift Page ID to High Tribble position (0s[ID]__)
    
    M H row     ; Fetch local page row
    F H 3       ; Shift local row to Mid Tribble position (0s_R_)
    
    M vram_ptr G
    A vram_ptr H
    A vram_ptr col ; D = Packed address word: 0s[Page ID][R][C]

    ; --- 2. MAP GLOBAL GRID TO COMPLEX PLANE (cx, cy) ---
    M cx page_col
    P cx 27
    A cx col
    S cx 15     ; cx = 27 * page_col + col - 15 (Real Axis window shift)
    
    M cy page_row
    P cy 27
    A cy row    ; cy = 27 * page_row + row (Symmetric Imaginary Axis)

    ; --- 3. ITERATION ORBIT SETUP ---
    M mandel_x Z ; Reset X tracking coordinate to 0
    M mandel_y Z ; Reset Y tracking coordinate to 0
    M iter Z     ; Reset loop iteration step depth counter

mandel_iter:
    ; Compute x^2
    M E mandel_x
    P E mandel_x
    Q E 27      ; Scale intermediate product back down

    ; Compute y^2
    M F mandel_y
    P F mandel_y
    Q F 27      ; Scale intermediate product back down

    ; Check Escape Condition: x^2 + y^2 >= 108
    M G E
    A G F       ; G = x^2 + y^2
    L G T       ; Check if distance magnitude sits inside threshold boundary
    J under_orbit ; Within limits: advance orbit step sequence
    J escape_now  ; Escaped: branch away to color computation pipeline

under_orbit:
    ; Compute next Y coordinate: 2xy + cy
    M H mandel_x
    P H mandel_y
    Q H 27      ; Normalize product scale
    A H H       ; H = 2xy
    A H cy      ; H = 2xy + cy
    
    ; Compute next X coordinate: x^2 - y^2 + cx
    M mandel_x E
    S mandel_x F
    A mandel_x cx

    M mandel_y H ; Commit valid structural Y from storage scratchpad

    ; Loop Bounds Verification
    I iter 1    ; Increment escape velocity step tracking counter
    N iter V    ; Ensure depth counter doesn't violate max threshold
    J mandel_iter ; Valid: recalculate next iterative loop pass

    ; IN-SET PATH (Max iterations reached -> Paint Black 'AAA')
    M G -9841   ; Load minimum tryte value (Pure Black)
    W vram_ptr G ; Store value to active pointer address
    J write_done ; Sequence complete: step matrix forward

escape_now:
    ; ESCAPED PATH (Generate beautiful uniform gradient distribution)
    V G -13     ; Establish minimum base color tint spectrum 'A'
    A G iter    ; Dynamically alter luminance target by escape speed
    M H G       ; Map to Blue color bit line
    F H 3       ; Shift up into Green color bit line positioning
    A H G       ; Combine channels
    M A G       ; Load tracking value to alternate address register A
    F A 6       ; Shift up into Red color bit line positioning
    A H A       ; Perform final channel aggregation
    W vram_ptr H ; Commit composite color tryte word directly to VRAM

write_done:
    ; --- 4. NESTED LOOP CONTROL ADVANCEMENT ---
    N col W     ; Is local column index exhausted? (col != 13)
    J col_inc   ; True: step column position forward
    J col_done  ; False: drop out of horizontal trace layer
col_inc:
    I col 1
    J col_loop
col_done:
    N row W     ; Is local row index exhausted? (row != 13)
    J row_inc   ; True: step row position forward
    J row_done  ; False: drop out of vertical trace layer
row_inc:
    I row 1
    J row_loop
row_done:
    N page_col 1 ; Have all 3 horizontal pages been traced? (page_col != 1)
    J page_col_inc ; True: shift viewport focus to next block right
    J page_col_done ; False: row horizontal macro span completed
page_col_inc:
    I page_col 1
    J page_col_loop
page_col_done:
    N page_row 1 ; Have all 3 vertical pages been mapped? (page_row != 1)
    J page_row_inc ; True: drop viewport focus to next page row down
    J page_row_done ; False: complete canvas execution achieved!
page_row_inc:
    I page_row 1
    J page_row_loop
page_row_done:
    H Z Z       ; Calculations exhausted. Put CPU into deep low-power sleep.
