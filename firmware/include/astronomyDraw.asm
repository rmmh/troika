; Draw literal J to VRAM I. Palette offset held in4827.
au_text: R E J I J 1 E E Z O S P ife E 10 M F I A F 9828 Q F 27 I F 1 P F 27 S F 9841 M I F J au_text end R F au_palette A E F W I E I I 1 J au_text
au_row: M I A P I 27 S I 9841 M J B J au_text
au_draw:
 W Z 0sDMT W 2514 Z M I -9841 M K 729
au_draw_clear: W I 32 I I 1 I K -1 N K Z J au_draw_clear
 W au_palette 2916 M A Z M B @app_title C S au_row W au_palette Z
 M I -9814 M J 2552 R K au_length
au_date_draw: E K Z J au_date_done R E J W I E I I 1 I J 1 I K -1 J au_date_draw
au_date_done:
 M A 2 M B @au_clock C S au_row
 R E au_body M I @au_names A I E R B I M A 3 W au_palette 3645 C S au_row W au_palette Z
 M A 24 M B @au_animation_keys C S au_row
 M A 25 M B @au_keys C S au_row M A 26 M B @au_keys2 C S au_row
 R E au_play ife E Z M B @au_paused else M B @au_playing end M A 4 C S au_row
 M I -9726 R E au_direction ifg E Z M E 43 else M E 45 end W I E I I 1 R E au_speed M J @au_step_names A J E R J J C S au_text
 R E au_ended ifn E Z M A 4 M B @au_endpoint C S au_row end
 R E au_edit ifn E Z M A 5 M B @au_edit_help C S au_row M A 7 M B @au_format C S au_row R I au_caret S I 9814 R E I A E 1458 W I E R E au_error ifl E Z M A 9 M B @au_bad_date C S au_row end O S P end
 R E au_error ifn E Z ife E -5 M B @au_fetch_error else ife E -1 M B @au_bad_date else M B @au_data_error end end M A 6 C S au_row M A 8 M B @au_retry C S au_row O S P end
 R E au_loading ifn E Z M A 6 M B @au_wait C S au_row M A 8 M B @au_wait_help C S au_row O S P end
 R E au_mode E E 1 J au_map E E 2 J au_help E E 3 J au_facts
 M A 5 M B @au_bary R E au_body ife E 9 M B @au_geocentric end C S au_row
 W au_axis Z
au_xyz_loop:
 C S au_selected R E au_axis P E 10 A A E C S au_format_mm
 R E au_axis M I E P I 27 S I 9652 M F E A F 88 W I F I I 1 W I 32 I I 1 M J au_line C S au_text
 R E au_axis I E 1 W au_axis E ifl E 3 J au_xyz_loop end
 M A 12 M B @au_precision C S au_row M A 14 M B @au_reference C S au_row
 M A 16 M B @au_origin C S au_row M A 18 M B @au_map_hint C S au_row O S P
au_selected: R E au_body ife E 2 M A 4730 O S P end ife E 11 M A 4460 O S P end M A E P A 30 A A 4400 O S P

; Convert signed base81 integer millimeters into exact decimal kilometers.
; Only scratch5000..5089 is changed; source is immutable.
au_format_mm: M B A M A au_number C S am_copy W au_sign Z M I 5009 M K 10
au_format_sign: R E I ifn E Z ifl E Z W au_sign 1 end J au_format_abs end I I -1 I K -1 N K Z J au_format_sign
au_format_abs: R E au_sign ifn E Z M I au_number M K 10
au_negate: R E I P E -1 W I E I I 1 I K -1 N K Z J au_negate end
 W au_digits Z
au_decimal_loop:
 C S au_div10 R I au_digits A I au_decimal A G 48 W I G R E au_digits I E 1 W au_digits E
 M I au_number M K 10 M F Z
au_decimal_nonzero: R E I ifn E Z M F 1 end I I 1 I K -1 N K Z J au_decimal_nonzero
 N F Z J au_decimal_loop
 M I au_line R E au_sign ifn E Z W I 45 I I 1 end
 R E au_digits ifle E 6 W I 48 I I 1 W I 46 I I 1 M F 6 S F E
au_decimal_zero: ifg F Z W I 48 I I 1 I F -1 J au_decimal_zero end end
 R E au_digits M J au_decimal A J E I J -1
au_decimal_emit: R F J W I F I I 1 I J -1 I E -1 ife E 6 W I 46 I I 1 end N E Z J au_decimal_emit W I Z O S P
; Divide a nonnegative value represented in ten possibly unbalanced base81
; digits by10, returning remainderG. Intermediate digits may be-4..80.
au_div10: M I 5009 M K 10 M G Z
au_div10_loop: R E I P G 81 A E G M F E Q F 10 M G F P G 10 S E G ifl E Z I F -1 I E 10 end W I F M G E I I -1 I K -1 N K Z J au_div10_loop O S P

; Approximate drawing coordinate only: truncate millimeters to million km,
; then round by declared scale. Position display uses full native precision.
au_map_coordinate: M B A M A au_number C S am_copy W au_sign Z M I 5009 M K 10
au_map_sign: R E I ifn E Z ifl E Z W au_sign 1 end J au_map_abs end I I -1 I K -1 N K Z J au_map_sign
au_map_abs: R E au_sign ifn E Z M I au_number M K 10
au_map_negate: R E I P E -1 W I E I I 1 I K -1 N K Z J au_map_negate end
 W au_count 12
au_map_reduce: C S au_div10 R E au_count I E -1 W au_count E N E Z J au_map_reduce
 R A 5002 P A 81 R E 5001 A A E P A 81 R E 5000 A A E R E au_zoom ife E Z Q A 5 else Q A 150 end R E au_sign ifn E Z P A -1 end O S P
au_help: M A 5 M B @au_help_text C S au_row O S P
au_facts: R E au_body M I @au_facts_table A I E R B I M A 5 C S au_row M A 17 M B @au_facts_source C S au_row O S P

; 2000-01-01 12:00:00.000
