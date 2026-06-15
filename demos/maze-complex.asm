; title: Maze Generator + Wall-Follower
; Growing perfect maze in high-resolution bitmap mode.
;
; Eller generation streams row-by-row, using two row-sized set buffers instead
; of a maze-sized stack.  Cells are at odd pixels, walls/corridors between them
; are the even pixels.
; The demo starts with 5x5 mazes, solves each one, then grows by one cell per
; loop until it reaches the full 80x80 maze.

$py:     A       ; pixel row
$px:     B       ; pixel column
$size:   C       ; maze size in cells, 3..80
$ptr:    D
$last:   E       ; size - 1
$tmp:    F
$row:    G
$col:    H
$state:  I
$scan:   J
$choice: K       ; direction candidate / random branch
$dir:    L       ; 0 up, 1 right, 2 down, 3 left
$tx:     N
$ty:     Q
$rem:    R       ; x % 9
$mask:   T
$val:    U
$curptr: W
$currem: X
$base:   Y       ; centering offset in pixels
$setid:  V

        W 47 0sAAA           ; mode-H backdrop: black walls
        W 49 0sAZA           ; trit T: green solver marker
        W 50 0sZZZ           ; trit 1: white passages
        W Z 0sDMH
        M size 5

restart:
        K -9841 2916
        K @set_row 160
        M state 1
        M last size
        A last -1
        M setid 1
        M base 81
        S base size

        ; Entry at the top edge.
        M py Z
        M px 1
        C S plot_white

; ---- Eller perfect-maze generation, size x size cells ----
        M row Z
gen_row:
        K @next_row 80
        M col Z
assign_col:
        M ptr @set_row
        A ptr col
        R tmp ptr
        N tmp Z  J paint_assigned
        W ptr setid
        A setid 1
paint_assigned:
        ; Paint current cell at (2*row+1, 2*col+1).
        M py row
        P py 2
        A py 1
        M px col
        P px 2
        A px 1
        C S plot_white

        A col 1
        L col size  J assign_col

        M col Z
join_col:
        E col last  J verticals
        M ptr @set_row
        A ptr col
        R val ptr
        A ptr 1
        R tmp ptr

        ; Never join cells already in the same set.  On the final row, join
        ; every remaining adjacent pair of different sets so the maze becomes
        ; one connected component.
        E val tmp  J next_join_col
        E row last  J join_sets

        P state 0sNNN
        A state 1
        L state Z  J join_sets
        J next_join_col

join_sets:
        ; Merge the right set into the left set across the active row.
        M choice tmp
        M scan Z
merge_scan:
        M ptr @set_row
        A ptr scan
        R tmp ptr
        E tmp choice  W ptr val
        A scan 1
        L scan size  J merge_scan

        ; Open the east wall at (2*row+1, 2*col+2).  Do this after merging:
        ; plot_white clobbers val.
        M py row
        P py 2
        A py 1
        M px col
        P px 2
        A px 2
        C S plot_white

next_join_col:
        A col 1
        J join_col

verticals:
        E row last  J done_generation

        M col Z
down_col:
        M ptr @set_row
        A ptr col
        R val ptr

        P state 0sNNN
        A state 1
        L state Z  J carve_down

        ; If this set has no downward connection yet, force one here.  Scanning
        ; next_row makes the guarantee independent of whether the set appears
        ; in one run or several disjoint columns.
        M scan Z
find_down:
        M ptr @next_row
        A ptr scan
        R tmp ptr
        E tmp val  J next_down_col
        A scan 1
        L scan size  J find_down

carve_down:
        M ptr @next_row
        A ptr col
        W ptr val
        M py row
        P py 2
        A py 2
        M px col
        P px 2
        A px 1
        C S plot_white

next_down_col:
        A col 1
        L col size  J down_col

        M col Z
copy_next:
        M ptr @next_row
        A ptr col
        R val ptr
        M ptr @set_row
        A ptr col
        W ptr val
        A col 1
        L col size  J copy_next

        A row 1
        L row size  J gen_row

done_generation:
        ; Exit at the bottom edge.
        M py size
        P py 2
        M px last
        P px 2
        A px 1
        C S plot_white

; ---- Solver ----
; Start at the entry and follow the right-hand wall to the exit.  This is much
; less informed than the reverse Sidewinder solver and visibly explores the
; maze.  Yellow trail pixels remain traversable so backtracking is allowed.
        M py Z
        M px 1
        M dir 2              ; facing down, into the maze

solve_loop:
        C S plot_yellow
        M curptr ptr
        M currem rem
        H 0sAAA 3000

        M tmp size
        P tmp 2
        E py tmp  J maybe_solved

try_right:
        M choice dir
        A choice 1
        L choice 4  J right_ok
        M choice Z
right_ok:
        C S try_dir
        N tmp Z  J take_step

try_forward:
        M choice dir
        C S try_dir
        N tmp Z  J take_step

try_left:
        M choice dir
        A choice -1
        G choice Z  J left_ok
        M choice 3
left_ok:
        C S try_dir
        N tmp Z  J take_step

try_back:
        M choice dir
        A choice 2
        L choice 4  J back_ok
        A choice -4
back_ok:
        C S try_dir

take_step:
        C S is_yellow
        E tmp Z  J keep_trail
        C S plot_white
keep_trail:
        M dir choice
        M px tx
        M py ty
        J solve_loop

maybe_solved:
        M tmp last
        P tmp 2
        A tmp 1
        N px tmp  J try_right

solve_done:
        C S plot_yellow
        H 0sAAA -54
        L size 80  J grow_maze
        M size 5
        J restart
grow_maze:
        A size 1
        J restart

; try_dir: compute one-pixel step in direction "choice" and test openness.
; out: tmp = 1 if open, 0 if wall/out of bounds; tx,ty and ptr/rem = candidate.
try_dir:
        M tmp Z
        M ptr curptr
        M rem currem
        M tx px
        M ty py
        E choice Z  J cand_up
        E choice 1  J cand_right
        E choice 2  J cand_down

        ; left: same row, previous trit; crossing tryte boundary moves ptr -1.
        A tx -1
        L tx Z  J try_dir_ret
        E rem Z  J left_wrap
        A rem -1
        J cand_test
left_wrap:
        A ptr -1
        M rem 8
        J cand_test
cand_up:
        ; up: same trit in previous bitmap row.
        A ty -1
        L ty Z  J try_dir_ret
        A ptr -18
        J cand_test
cand_right:
        ; right: same row, next trit; crossing tryte boundary moves ptr +1.
        A tx 1
        G tx 161  J try_dir_ret
        E rem 8  J right_wrap
        A rem 1
        J cand_test
right_wrap:
        A ptr 1
        M rem Z
        J cand_test
cand_down:
        ; down: same trit in next bitmap row.
        A ty 1
        G ty 161  J try_dir_ret
        A ptr 18
cand_test:
        R val ptr
        M mask @open_masks
        A mask rem
        R mask mask
        Y val mask
        E val 0sZZZ  M tmp 1
        N tmp Z  J try_dir_ret
        R val ptr
        M mask @one_masks
        A mask rem
        R mask mask
        B val mask
        E val 0sAAA  M tmp 1
try_dir_ret:
        O S P

@_QA
; is_yellow: test whether the candidate ptr/rem is already part of the green trail.
is_yellow:
        M tmp Z
        R val ptr
        M mask @one_masks
        A mask rem
        R mask mask
        B val mask
        E val 0sAAA  M tmp 1
is_yellow_ret:
        O S P

plot_white:
        C S pixel_addr
        R val ptr
        M mask @one_masks
        A mask rem
        R mask mask
        Y val mask
        W ptr val
        O S P

plot_yellow:
        C S pixel_addr
        R val ptr
        M mask @neg_masks
        A mask rem
        R mask mask
        B val mask
        W ptr val
        O S P

; pixel_addr: ptr = bitmap tryte for centered local pixel (py,px), rem = x % 9.
pixel_addr:
        M ptr py
        A ptr base
        P ptr 18
        A ptr -9841
        M rem px
        A rem base
pixel_div9:
        L rem 9  J pixel_addr_done
        A rem -9
        A ptr 1
        J pixel_div9
pixel_addr_done:
        O S P

one_masks:
        RAA GAA CAA ARA AGA ACA AAR AAG AAC
neg_masks:
        IZZ TZZ XZZ ZIZ ZTZ ZXZ ZZI ZZT ZZX
open_masks:
        QZZ WZZ YZZ ZQZ ZWZ ZYZ ZZQ ZZW ZZY

set_row//80
next_row//80
