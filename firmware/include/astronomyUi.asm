; Complete guest UI for immutable DE441 raw media. Position work is owned by
; astroEphemeris; this UI retains 11 XYZ vectors at4400 and correctedEarth4730.
$au_year:4800
$au_month:4801
$au_day:4802
$au_hour:4803
$au_minute:4804
$au_second:4805
$au_ms:4806
$au_body:4807
$au_mode:4808
$au_zoom:4809
$au_loading:4810
$au_load:4811
$au_error:4812
$au_edit:4813
$au_length:4814
$au_axis:4815
$au_cursor:4816
$au_parse:4817
$au_field:4818
$au_count:4819
$au_temp:4820
$au_sign:4821
$au_digits:4822
$au_format_out:4823
$au_map_body:4824
$au_map_x:4825
$au_caret:4826
$au_palette:4827
$au_pointer:4828
$au_play:4830
$au_speed:4831
$au_direction:4832
$au_ended:4833
$au_year_sign:4834
$au_number:5000
$au_decimal:5020
$au_line:5060

app_entry:
 M S 5710 W 2485 Z W 2486 Z W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
 W Z 0sDMT W -3659 -8297 W -3658 7599
 W -3657 249 W -3656 -8297 W -3655 8177 W -3654 -8297
 W -3651 -8297 W -3650 8177 W -3649 -8297 W -3648 249
 M I 4800 M K 40
au_init_clear: W I Z I I 1 I K -1 N K Z J au_init_clear
 C S ah_save_palette
 W au_direction 1 W au_year 2000 W au_month 1 W au_day 1 W au_hour 12 W au_body 2 W au_length 23
 M I 2552 M J @au_default M K 23
au_init_date: R E J W I E I I 1 I J 1 I K -1 N K Z J au_init_date
 J au_start
au_start: W au_ended Z W au_load Z W au_loading 1 W au_error Z W au_edit Z W 3990 Z C S au_draw
app_key:
 W 2514 1 R E 68 ife E 4 R A 69 E A 91 J au_exit R E au_edit ifn E Z J au_edit_key end J au_key end
 R E au_loading ifn E Z J au_load_next end
 R E au_play ifn E Z J au_animate end
 H 0sAAA -1 J app_key
au_animate:
 H 0sAAA -8 R E 68 E E 4 J app_key M I @au_steps R E au_speed A I E R B I R E au_direction P B E M A au_year C S ep_step
 ifn A Z W au_play Z W au_ended 1 C S au_draw J app_key end
 C S au_date_string W au_load Z W au_loading 1 W au_error Z J app_key
au_date_string: W au_field Z
au_date_string_field:
 R E au_field M I 4800 A I E R F I ife E Z F F A end W au_temp F P E 2 M I @au_fields A I E R J I I I 1 R K I A J K I J -1
au_date_string_digit:
 R E au_temp M F E Q F 10 M G F P G 10 S E G ifl E Z I F -1 I E 10 end W au_temp F A E 48 W J E I J -1 I K -1 N K Z J au_date_string_digit
 R E au_field I E 1 W au_field E ifl E 7 J au_date_string_field end
 W 2556 45 W 2559 45 W 2562 32 W 2565 58 W 2568 58 W 2571 46 W au_length 23 R E au_year ifl E Z J au_prefix_minus end O S P
au_prefix_minus: R E au_length M I 2552 A I E M K E
au_prefix_shift: M J I I J -1 R F J W I F I I -1 I K -1 N K Z J au_prefix_shift W 2552 45 I E 1 W au_length E O S P
au_load_next:
 R E 3990 ifl E Z W au_error -5 W au_play Z W au_loading Z C S au_draw J app_key end
 R A au_year R B au_month R C au_day R D au_hour R E au_minute R F au_second R G au_ms R H au_load M I H P I 30 A I 4400
 W 2514 Z C S ep_position
 ife A 1 H 0sAAA -2 J app_key end
 ifn A Z W au_error A W au_play Z W au_loading Z C S au_draw J app_key end
 R E au_load I E 1 W au_load E ifl E 11 J app_key end
 ; Correct Earth = EMB - Moon/(1+EMRAT), reciprocal encoded atQ=3^27.
 W au_axis Z
au_earth_loop:
 R E au_axis P E 10 M B 4670 A B E M A 4760 M C @au_mass_fraction C S am_mul
 ifn A Z J au_math_error end
 R E au_axis P E 10 M B 4460 A B E M A 4730 A A E M C 4760 C S am_sub
 ifn A Z J au_math_error end
 R E au_axis I E 1 W au_axis E ifl E 3 J au_earth_loop end
 W au_loading Z C S au_draw J app_key
au_math_error: W au_error -4 W au_play Z W au_loading Z C S au_draw J app_key
au_key:
 E A 89 M A 83 E A 90 M A 84
 E A 88 J au_start E A 27 J au_start
 ife A 83 R E au_body I E -1 ifl E Z M E 11 end W au_body E C S au_draw J app_key end
 ife A 84 R E au_body I E 1 ifg E 11 M E Z end W au_body E C S au_draw J app_key end
 C S text_ascii ifge A 65 ifle A 90 A A 32 end end
 ife A 32 R E au_play ife E Z M E 1 else M E Z end W au_play E W au_ended Z C S au_draw J app_key end
 ife A 114 R E au_direction P E -1 W au_direction E C S au_draw J app_key end
 ife A 43 R E au_speed ifl E 4 I E 1 W au_speed E end C S au_draw J app_key end
 ife A 45 R E au_speed ifg E Z I E -1 W au_speed E end C S au_draw J app_key end
 ife A 100 W au_play Z W au_edit 1 W au_error Z W au_length Z W au_caret Z C S au_draw J app_key end
 ife A 109 R E au_mode ife E 1 M E Z else M E 1 end W au_mode E C S au_draw J app_key end
 ife A 122 R E au_zoom ife E Z M E 1 else M E Z end W au_zoom E W au_mode 1 C S au_draw J app_key end
 ife A 104 W au_mode 2 C S au_draw J app_key end
 ife A 102 W au_mode 3 C S au_draw J app_key end
 J app_key
au_edit_key:
 E A 88 J au_parse_date E A 27 J au_parse_date
 ife A 83 R E au_caret ifg E Z I E -1 W au_caret E end C S au_draw J app_key end
 ife A 84 R E au_caret R F au_length ifl E F I E 1 W au_caret E end C S au_draw J app_key end
 ife A 86 R E au_caret ife E Z J app_key end I E -1 W au_caret E J au_delete end
 ife A 87 J au_delete end
 C S text_ascii ifge A 65 ifle A 90 A A 32 end end ife A 100 W au_length Z W au_caret Z W au_error Z C S au_draw J app_key end ifl A 32 J app_key end ifg A 126 J app_key end
 R E au_length ifge E 24 J app_key end R F au_caret M I 2552 A I E
au_insert_shift: ifg E F M J I I J -1 R G J W I G I I -1 I E -1 J au_insert_shift end
 W I A R E au_length I E 1 W au_length E I F 1 W au_caret F C S au_draw J app_key
au_delete: R E au_caret R F au_length ifge E F J app_key end M I 2552 A I E I F -1
au_delete_loop: ifl E F M J I I J 1 R G J W I G I I 1 I E 1 J au_delete_loop end
 W au_length F C S au_draw J app_key
; Strict YYYY-MM-DD HH:MM:SS[.mmm], Gregorian validity checked by ep_position.
au_parse_date:
 W au_year_sign Z R E au_length ifn E 19 ifn E 20 ifn E 23 ifn E 24 J au_parse_bad end end end end R E 2552 ife E 45 W au_year_sign 1 R K au_length I K -1 W au_length K M I 2552
au_remove_minus: M J I I J 1 R F J W I F I I 1 I K -1 N K Z J au_remove_minus end
 R E au_length ifn E 19 ifn E 23 J au_parse_bad end end
 R E 2556 ifn E 45 J au_parse_bad end R E 2559 ifn E 45 J au_parse_bad end
 R E 2562 ifn E 32 J au_parse_bad end R E 2565 ifn E 58 J au_parse_bad end R E 2568 ifn E 58 J au_parse_bad end
 R E au_length ife E 23 R E 2571 ifn E 46 J au_parse_bad end end
 W au_field Z W 4906 Z
au_parse_field:
 R E au_field M I @au_fields P E 2 A I E R F I I I 1 R G I W au_parse F W au_count G W au_temp Z
au_parse_digits:
 R I au_parse R E I ifl E 48 J au_parse_bad end ifg E 57 J au_parse_bad end
 S E 48 R F au_temp P F 10 A F E W au_temp F I I 1 W au_parse I R E au_count I E -1 W au_count E N E Z J au_parse_digits
 R E au_field M I 4900 A I E R F au_temp W I F I E 1 W au_field E
 ifl E 6 J au_parse_field end R F au_length ife E 6 ife F 23 J au_parse_field end end
 R E au_year_sign ifn E Z R E 4900 P E -1 W 4900 E end
 M I 4900 M J 4800 M K 7
au_copy_date: R E I W J E I I 1 I J 1 I K -1 N K Z J au_copy_date
 C S au_date_string J au_start
au_parse_bad: R E au_year_sign ifn E Z C S au_prefix_minus W au_year_sign Z end W au_error -1 C S au_draw J app_key


