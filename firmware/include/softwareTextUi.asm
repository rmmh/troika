; Native text application UI: immutable ASCII input 2552..2605, count 2610;
; output 2700..2861, count 2620, status 2621. Algorithms return A=status.
; app_put(A=ASCII) appends one output cell, preserves B..L and returns status.
app_entry:
 M S 5710 W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
 W Z 0sDMT W -3659 -9841 W -3658 9841
 W 2610 Z W 2620 Z W 2621 Z
app_redraw:
 W 2514 Z M I -9841 M K 729
app_clear: W I 32 I I 1 I K -1 N K Z J app_clear
 M I -9841 M J @app_title C S app_draw
 M I -9787 M J @app_help C S app_draw
 M I -9220 M J @app_exit C S app_draw
 M I -9733 M J @app_i0 C S app_draw M J @app_limit C S app_draw
 M I -9706 M J 2552 R K 2610 C S app_span
 M I -9625 M J @app_o0 C S app_draw
 R E 2621 ifl E Z M I -9598 M J @app_error C S app_draw else
 M I -9598 M J 2700 R K 2620 C S app_span end
app_key:
 W 2514 1 R E 68 N E 4 J app_key R A 69
 E A 91 J program_menu E A 88 J app_run E A 27 J app_run
 E A 86 J app_back E A 87 J app_back
 C S text_ascii ifl A 32 J app_key end ifg A 126 J app_key end
 R E 2610 ifge E 54 J app_key end M I 2552 A I E W I A I E 1 W 2610 E J app_redraw
app_back: R E 2610 E E Z J app_key I E -1 W 2610 E J app_redraw
app_run: W 2514 Z W 2620 Z C S app_compute W 2621 A J app_redraw
app_draw: R E J I J 1 E E Z O S P W I E I I 1 J app_draw
app_span: E K Z O S P R E J W I E I J 1 I I 1 I K -1 J app_span
app_put:
 U S E U S I R E 2620
 ifge E 162 O S I O S E M A -1 O S P end
 M I 2700 A I E W I A I E 1 W 2620 E O S I O S E M A Z O S P
; Literal ASCII span. A=pointer, B=count. Clobbers J/K.
app_emit:
 M J A M K B
app_emit_loop: E K Z M A Z E K Z O S P
 R A J C S app_put ifl A Z O S P end I J 1 I K -1 J app_emit_loop
; F=0..99, decimal output; clobbers A/E/F, preserves the other registers.
app_decimal:
 M E F Q E 10 M A E P A 10 ifg A F I E -1 S A 10 end
 S F A ifn E Z M A E A A 48 C S app_put ifl A Z O S P end end
 M A F A A 48 J app_put
app_help: 69 110 116 101 114 58 32 114 117 110 32 32 66 97 99 107 115 112 97 99 101 58 32 101 100 105 116 0
app_exit: 70 49 58 32 112 114 111 103 114 97 109 115 0
app_limit: 32 40 109 97 120 32 53 52 41 0
app_error: 73 110 118 97 108 105 100 32 105 110 112 117 116 32 111 114 32 114 101 115 117 108 116 32 116 111 111 32 108 111 110 103 0
