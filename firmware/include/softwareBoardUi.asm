; Native board UI. Games implement game_reset() and game_move(A=cell index).
; Board cells are printable ASCII; no host callbacks or Forth interpreter.
$game_board: 2900
$game_cursor: 2630
$game_moves: 2631
$game_status: 2632
$game_message: 2633
$board_row: 2634
$board_col: 2635
app_entry:
 M S 5710 W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
 W Z 0sDMT W -3659 -9841 W -3658 9841
board_reset:
 W 2514 Z W game_moves Z W game_status Z W board_row Z W board_col Z
 C S game_reset
board_redraw:
 W 2514 Z R E board_row P E game_columns R F board_col A E F W game_cursor E
 M I -9841 M K 729
board_clear: W I 32 I I 1 I K -1 N K Z J board_clear
 M I -9841 M J @app_title C S board_draw
 M I -9787 M J @board_help C S board_draw
 M I -9760 M J @board_action C S board_draw
 M H board_origin M G Z M L Z
board_cell:
 M I H M E L P E 3 A I E M J game_board A J G R F J M I/1 F
 R E game_cursor ife E G W I 91 M I/2 93 end
 I G 1 I L 1 ife L game_columns M L Z A H 54 end
 ifl G game_cells J board_cell end
 M I -9247 R J game_message C S board_draw
 M I -9220 M J @board_moves C S board_draw
 M I -9213 R F game_moves C S board_number
 M I -9166 M J @board_exit C S board_draw
app_key:
 W 2514 1 R E 68 N E 4 J app_key R E 69
 E E 91 J program_menu E E 5 J board_reset E E -22 J board_reset
 E E 88 J board_play E E 27 J board_play E E -27 J board_play
 E E 81 J board_next E E 82 J board_previous
 E E 83 J board_left E E 84 J board_right E E 89 J board_up E E 90 J board_down
 J app_key
board_play: W 2514 Z R A game_cursor C S game_move J board_redraw
board_left: R E board_col E E Z J app_key I E -1 W board_col E J board_redraw
board_right: R E board_col I E 1 ifge E game_columns J app_key end W board_col E J board_redraw
board_up: R E board_row E E Z J app_key I E -1 W board_row E J board_redraw
board_down: R E board_row I E 1 ifge E game_rows J app_key end W board_row E J board_redraw
board_next: R E board_col I E 1 ifge E game_columns M E Z R F board_row I F 1 ifge F game_rows M F Z end W board_row F end W board_col E J board_redraw
board_previous: R E board_col I E -1 ifl E Z M E game_columns I E -1 R F board_row I F -1 ifl F Z M F game_rows I F -1 end W board_row F end W board_col E J board_redraw
; Accepted moves saturate instead of wrapping a long-running game's counter.
game_count_move: R E game_moves ifl E 9841 I E 1 W game_moves E end O S P
board_draw: R E J E E Z O S P W I E I J 1 I I 1 J board_draw
board_number:
 M J 5720 M K Z
board_digits:
 M E F Q E 10 M G E P G 10 ifg G F I E -1 S G 10 end
 S F G A F 48 W J F I J 1 I K 1 M F E N F Z J board_digits
board_digit_draw: I J -1 R E J W I E I I 1 I K -1 N K Z J board_digit_draw O S P
board_help: 65 114 114 111 119 115 47 84 97 98 58 32 99 104 111 111 115 101 32 115 113 117 97 114 101 0
board_action: 69 110 116 101 114 47 83 112 97 99 101 58 32 112 108 97 121 32 32 82 58 32 114 101 115 101 116 0
board_moves: 77 111 118 101 115 58 32 0
board_exit: 70 49 58 32 114 101 116 117 114 110 32 116 111 32 112 114 111 103 114 97 109 115 0
