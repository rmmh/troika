; title: Maze Generator
; Iterative randomized depth-first maze on a 41x41 cell grid, rendered on the
; 81x81 raw display.  Cell (r,c) maps to pixel (2r,2c), with corridors between.
;
; The DFS stack uses T as a private stack pointer in ordinary RAM.  The CPU
; call stack still uses S, so helper calls do not interfere with DFS state.
; PRNG: LCG state = state * 757 + 1, full period 3^9 = 19,683.
; Regenerates forever, each time continuing from the current PRNG state.

$state:   A
$r:       B
$c:       C
$ptr:     D
$stack:   T
$tmp:     H
$dir:     I
$tries:   J
$nr:      K
$nc:      L
$wall:    N


        W Z 0sDPN             ; enable legacy raw framebuffer display
        M state 1

restart:
        K -9841 6561          ; clear display (gray walls)
        M stack 0sMZZ

        ; Push start cell (0,0) and mark it visited.
        M r Z
        M c Z
        W -9841 0sZZZ
        U stack r
        U stack c

; ---- iterative randomized DFS ----
dfs_loop:
        E stack 0sMZZ  J done_maze

        ; Peek current cell by popping then immediately pushing it back.
        O stack c
        O stack r
        U stack r
        U stack c

        ; Choose a random starting direction, then probe all four.
        P state 0sNNN
        A state 1
        M dir Z
        L state -4920  J have_dir
        M dir 1
        L state Z      J have_dir
        M dir 2
        L state 4920   J have_dir
        M dir 3
have_dir:
        M tries 4

try_dir:
        M nr r
        M nc c
        E dir Z  J try_up
        E dir 1  J try_right
        E dir 2  J try_down
        J try_left

try_up:
        E r Z  J next_dir
        A nr -1
        J check_neighbor

try_right:
        E c 40  J next_dir
        A nc 1
        J check_neighbor

try_down:
        E r 40  J next_dir
        A nr 1
        J check_neighbor

try_left:
        E c Z  J next_dir
        A nc -1

check_neighbor:
        ; ptr = current cell pixel
        M ptr r
        F ptr 4
        A ptr ptr
        A ptr c
        A ptr c
        A ptr -9841
        M wall ptr
        E dir Z  J neigh_up
        E dir 1  J neigh_right
        E dir 2  J neigh_down
        A wall -1
        A ptr -2
        J check_open
neigh_up:
        S wall 81
        S ptr 162
        J check_open
neigh_right:
        A wall 1
        A ptr 2
        J check_open
neigh_down:
        A wall 81
        A ptr 162

check_open:
        R tmp ptr
        N tmp Z  J next_dir   ; nonzero means already visited

carve:
        W wall 0sZZZ
        W ptr 0sZZZ
        M r nr
        M c nc

        ; Push neighbor.
        U stack r
        U stack c
        J dfs_loop

next_dir:
        A dir 1
        L dir 4  J dir_ok
        M dir Z
dir_ok:
        A tries -1
        N tries Z  J try_dir

        ; Dead end: pop.
        O stack c
        O stack r
        J dfs_loop

done_maze:
        H 0sAAA -54           ; pause about one second before regenerating
        J restart
