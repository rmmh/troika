; Native numeric application UI. App supplies ASCII title/labels, input/output
; counts (1..3), and app_compute(): A=0 success, negative domain/range error.
; Inputs 2552..2554, signs 2555..2557, outputs 2560..2562. No host callbacks.
$app_selected: 2558
$app_status: 2559
$app_row: 2563
$app_label: 2564
$app_index: 2565
app_entry:
      M S 5710 W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
      W Z 0sDMT W -3659 -9841 W -3658 9841
      M I 2552 M K 14
app_zero: W I Z I I 1 I K -1 N K Z J app_zero
      C S app_compute W app_status A
app_redraw:
      M I -9841 M K 729
app_clear: W I 32 I I 1 I K -1 N K Z J app_clear
      M I -9841 M J @app_title C S app_draw
      M I -9787 M J @app_help C S app_draw
      M I -9220 M J @app_exit_help C S app_draw
      W app_row -9705 W app_label @app_inputs W app_index Z
app_input_row:
      R I app_row R J app_label R J J C S app_draw
      R I app_index M J I A J 2552 R F J
      A I 2555 R E I ifn E Z P F -1 end
      R I app_row A I 18 C S app_number
      R E app_index R F app_selected ife E F R I app_row I I -1 W I 62 end
      C S app_next_row R E app_index ifl E app_input_count J app_input_row end
      R E app_status ifl E Z
        M I -9490 M J @app_error C S app_draw J app_key
      end
      W app_row -9489 W app_label @app_outputs W app_index Z
app_output_row:
      R I app_row R J app_label R J J C S app_draw
      R I app_index A I 2560 R F I R I app_row A I 18 C S app_number
      C S app_next_row R E app_index ifl E app_output_count J app_output_row end
app_key:
      W 2514 1 R E 68 N E 4 J app_key R E 69
      E E 91 J program_menu E E 81 J app_next E E 82 J app_previous
      E E 88 J app_run E E 27 J app_run
      R I app_selected M J I A I 2552 A J 2555
      E E 20 J app_negative E E 86 J app_back E E 87 J app_back
      ifl E 28 J app_key end ifg E 37 J app_key end
      S E 28 R F I ifg F 984 J app_key end
      ife F 984 ifg E 1 J app_key end end
      P F 10 A F E W I F J app_redraw
app_negative: R E J M F 1 S F E W J F J app_redraw
app_back:
      R F I Q F 10 M E F P E 10 R G I ifg E G I F -1 end
      W I F J app_redraw
app_next:
      R E app_selected I E 1 ife E app_input_count M E Z end W app_selected E J app_redraw
app_previous:
      R E app_selected I E -1 ifl E Z M E app_input_count I E -1 end W app_selected E J app_redraw
app_run:
      W 2514 Z
      ; Temporarily apply signs for the algorithm, then restore edit magnitudes.
      C S app_signs C S app_compute W app_status A C S app_signs J app_redraw
app_signs:
      M I 2552 M J 2555 M K app_input_count
app_sign_loop:
      R E J ifn E Z R F I P F -1 W I F end
      I I 1 I J 1 I K -1 N K Z J app_sign_loop O S P
app_next_row:
      R E app_row A E 54 W app_row E
      R E app_label I E 1 W app_label E
      R E app_index I E 1 W app_index E O S P
; ASCII drawing and signed decimal output use only native screen cells.
app_draw: R E J I J 1 E E Z O S P W I E I I 1 J app_draw
app_number:
      ifl F Z W I 45 I I 1 P F -1 end
      M J 5720 M K Z
app_digits:
      M E F Q E 10 M G E P G 10 ifg G F I E -1 S G 10 end
      S F G A F 48 W J F I J 1 I K 1 M F E N F Z J app_digits
app_digit_draw: I J -1 R E J W I E I I 1 I K -1 N K Z J app_digit_draw O S P
app_help: 84 97 98 58 32 102 105 101 108 100 32 32 69 110 116 101 114 58 32 114 117 110 0
app_exit_help: 70 49 58 32 112 114 111 103 114 97 109 115 32 32 45 58 32 115 105 103 110 0
app_error: 73 110 118 97 108 105 100 32 111 114 32 111 117 116 32 111 102 32 114 97 110 103 101 0
