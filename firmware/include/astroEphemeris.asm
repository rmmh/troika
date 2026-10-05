; DE441 raw-cartridge reader. Requires block_io and astroMath.asm.
; ep_position(Ayear,Bmonth,Cday,Dhour,Eminute,Fsecond,Gmillisecond,Hbody,Iout).
; Gregorian1000..3000, TDB clock, body0..10 DE441 order. Output30 base81
; limbs: XYZ integer millimeters. Atomic output. All registers clobbered.
; 0 success,+1 missing medium,-1 invalid input,-2 malformed media,-3 I/O,
; -4 arithmetic. Unit0 restored on every return. 3990 holds requested drive
; only while an unavailable cartridge needs mounting. Caller retries +1.
; Work3000..3149,3160..3169,3300..3329,3800..4009,4100..4342. Output must
; avoid these spans and code/stack/MMIO. No host date or polynomial callbacks.
$ep_year:3900
$ep_month:3901
$ep_day:3902
$ep_hour:3903
$ep_minute:3904
$ep_second:3905
$ep_ms:3906
$ep_body:3907
$ep_out:3908
$ep_unit:3909
$ep_doy:3910
$ep_leap:3911
$ep_records:3912
$ep_record:3913
$ep_day_rem:3914
$ep_cache:3917
$ep_block:3918
$ep_cell:3919
$ep_record_block:3920
$ep_record_cell:3921
$ep_ncoef:3922
$ep_width:3923
$ep_skip:3924
$ep_axis:3925
$ep_coef:3926
$ep_heads:3927
$ep_length:3929
$ep_index:3930
$ep_header:3931
$ep_payload:3932
$ep_first_year:3933
$ep_lengths:3940
$ep_packed:3960
$ep_duration:3970
$ep_elapsed:3980
$ep_request:3990
$ep_norm_count:3991
$ep_digit:3993
$ep_half:4000

ep_position: W ep_year A W ep_month B W ep_day C W ep_hour D W ep_minute E W ep_second F W ep_ms G W ep_body H W ep_out I W ep_request Z W ep_cache -1
 ifl A 1000 J ep_bad_input end ifg A 3000 J ep_bad_input end ifl B 1 J ep_bad_input end ifg B 12 J ep_bad_input end ifl C 1 J ep_bad_input end ifg C 31 J ep_bad_input end ifl D Z J ep_bad_input end ifg D 23 J ep_bad_input end ifl E Z J ep_bad_input end ifg E 59 J ep_bad_input end ifl F Z J ep_bad_input end ifg F 59 J ep_bad_input end ifl G Z J ep_bad_input end ifg G 999 J ep_bad_input end ifl H Z J ep_bad_input end ifg H 10 J ep_bad_input end
 W ep_leap Z R A ep_year M B 4 C S ep_div ifn C Z J ep_date end R A ep_year M B 100 C S ep_div ifn C Z W ep_leap 1 J ep_date end R A ep_year M B 400 C S ep_div ife C Z W ep_leap 1 end
ep_date: R E ep_month I E -1 M I @ep_month_days A I E R F I ife E 1 R G ep_leap A F G end R G ep_day ifg G F J ep_bad_input end M I @ep_month_start A I E R F I A F G I F -1 ifge E 2 R G ep_leap A F G end W ep_doy F R A ep_year M B 100 C S ep_div M E A P E 100 W ep_first_year E S A 9 W ep_unit A W ep_request A M A Z C S ep_read_block ifn A Z J ep_finish end
 R E 4100 ifn E 441 J ep_bad_media end R E 4101 ifn E 1 J ep_bad_media end R E 4102 R F ep_first_year ifn E F J ep_bad_media end R E 4103 ifl E 1 J ep_bad_media end ifg E 100 J ep_bad_media end R F ep_year R G ep_first_year S F G ifge F E J ep_bad_media end R E 4104 ifl E 1 J ep_bad_media end ifg E 1200 J ep_bad_media end W ep_records E
 M I 4106 M J @ep_format M K 10
ep_check_format: R E I R F J ifn E F J ep_bad_media end I I 1 I J 1 I K -1 N K Z J ep_check_format
 R E ep_year R F ep_first_year S E F P E 2 M I 4116 A I E R F I ifl F Z J ep_bad_media end R G ep_records ifge F G J ep_bad_media end W ep_record F M E I/1 ifl E Z J ep_bad_media end ifg E 31 J ep_bad_media end R F ep_doy A E F M A E M B 32 C S ep_div W ep_day_rem C R E ep_record A E A R F ep_records ifge E F J ep_bad_media end W ep_record E
 P E 2 A E 243 M A E C S ep_seek M A Z C S ep_next ifn B Z M A B J ep_finish end ifl A 1 J ep_bad_media end W ep_record_block A C S ep_next ifn B Z M A B J ep_finish end ifl A Z J ep_bad_media end ifge A 243 J ep_bad_media end W ep_record_cell A
 R E ep_body M I @ep_counts A I E R F I W ep_ncoef F M I @ep_widths A I E R F I W ep_width F R A ep_day_rem M B F C S ep_div P A 3 W ep_skip A W ep_day_rem C C S ep_normalize ifn A Z J ep_finish end
 R E ep_record_block W ep_block E R A ep_record_cell R E ep_body A A E C S ep_seek_relative C S ep_next ifn B Z M A B J ep_finish end ifl A 11 J ep_bad_media end R E ep_record_block W ep_block E R E ep_record_cell A A E C S ep_seek_relative W ep_axis Z
ep_poly: R A ep_ncoef M B 5 C S ep_div ifn C Z I A 1 end W ep_heads A W ep_index Z W ep_payload Z
ep_header_next: C S ep_next ifn B Z M A B J ep_finish end ifl A Z J ep_bad_media end ifg A 3124 J ep_bad_media end W ep_header A M E 5 W ep_coef E
ep_length_next: R A ep_header M B 5 C S ep_div W ep_header A R E ep_index R F ep_ncoef ifge E F ifn C Z J ep_bad_media end else M I ep_lengths A I E W I C R F ep_payload A F C W ep_payload F end I E 1 W ep_index E R E ep_coef I E -1 W ep_coef E ifg E Z J ep_length_next end R E ep_heads I E -1 W ep_heads E ifg E Z J ep_header_next end
 R E ep_skip ife E Z J ep_decode end R A ep_cell R E ep_payload A A E C S ep_seek_relative R E ep_skip I E -1 W ep_skip E J ep_poly
ep_decode: W ep_coef Z
ep_decode_coefficient: R E ep_coef M I ep_lengths A I E R E I W ep_length E W ep_index Z
ep_limb: R E ep_index R F ep_length ifge E F J ep_expand end C S ep_next ifn B Z M A B J ep_finish end M I ep_packed R E ep_index A I E W I A I E 1 W ep_index E J ep_limb
ep_expand: R A ep_coef P A 10 A A 3000 M B ep_packed R C ep_length C S am_unpack_mm ifn A Z J ep_bad_math end R E ep_coef I E 1 W ep_coef E R F ep_ncoef ifl E F J ep_decode_coefficient end R A ep_axis P A 10 A A 3300 M B 3000 R C ep_ncoef I C -1 M D 3160 C S am_eval ifn A Z J ep_bad_math end R E ep_axis I E 1 W ep_axis E ifl E 3 J ep_poly end R A ep_out M B 3300 M K 30
ep_output: R E B W A E I A 1 I B 1 I K -1 N K Z J ep_output M A Z J ep_finish

ep_bad_input: M A -1 J ep_finish
ep_bad_media: M A -2 J ep_finish
ep_bad_math: M A -4
ep_finish: W 0s_BL Z ifn A 1 W ep_request Z end O S P

; Positive floor division; result quotientA, remainderC. E clobbered.
ep_div: M C A Q A B M E A P E B S C E ifl C Z I A -1 A C B end O S P
; A absolute cell offset into medium -> logical block/cell cursor.
ep_seek: M B 243 C S ep_div W ep_block A W ep_cell C O S P
; A cell offset from current block; normalize cursor without reading.
ep_seek_relative: M B 243 C S ep_div R E ep_block A E A W ep_block E W ep_cell C O S P
; A block; codeA=0,+1 unavailable,-3 I/O. Cache retained across polynomials.
ep_read_block: R E ep_cache ife A E M A Z O S P end M C A R B ep_unit M D 4100 M A 1 C S block_io ife A -2 M A 1 O S P end ifn A Z M A -3 O S P end W ep_cache C M A Z O S P
; Sequential signed cellA, statusB. Cursor normalized before read.
ep_next: R A ep_cell ifge A 243 C S ep_seek_relative end R A ep_block C S ep_read_block ifn A Z M B A M A Z O S P end R I ep_cell A I 4100 R A I R E ep_cell I E 1 W ep_cell E M B Z O S P

; Ten-limb multiply by small positive B and add signed C. A=word pointer.
; Used only with factors<=60 and addends<=999; limbs remain canonical.
ep_scalar: M I A M K 10 M G C
ep_scalar_loop: R E I P E B A E G M G E Q G 81 M F G P F 81 S E F W I E I I 1 I K -1 N K Z J ep_scalar_loop M A Z ifn G Z M A -4 end O S P
; Compare canonical ten-limb wordsA,B; returns signA.
ep_compare: A A 9 A B 9 M K 10
ep_compare_loop: R E A R F B ifg E F M A 1 O S P end ifl E F M A -1 O S P end I A -1 I B -1 I K -1 N K Z J ep_compare_loop M A Z O S P
; Build milliseconds from day/hour/minute/second, using native scalar arithmetic.
ep_normalize: M I ep_duration M K 20
ep_time_zero: W I Z I I 1 I K -1 N K Z J ep_time_zero M I ep_half M K 10
ep_half_zero: W I Z I I 1 I K -1 N K Z J ep_half_zero R E ep_width W ep_duration E Q E 2 W ep_half E R E ep_day_rem W ep_elapsed E
 M A ep_elapsed M B 24 R C ep_hour C S ep_scalar M A ep_elapsed M B 60 R C ep_minute C S ep_scalar M A ep_elapsed M B 60 R C ep_second C S ep_scalar M A ep_elapsed M B 10 M C Z C S ep_scalar M A ep_elapsed M B 10 M C Z C S ep_scalar M A ep_elapsed M B 10 R C ep_ms C S ep_scalar
 M A ep_duration C S ep_days_ms M A ep_half C S ep_days_ms M A ep_elapsed M B ep_elapsed M C ep_elapsed C S am_add ifn A Z M A -4 O S P end M A ep_elapsed M B ep_elapsed M C ep_duration C S am_sub ifn A Z M A -4 O S P end M I 3160 M K 10
ep_x_zero: W I Z I I 1 I K -1 N K Z J ep_x_zero W ep_norm_count 27 C S ep_choose_digit M A 3160 M B 1 R C ep_digit C S ep_scalar
ep_trit: M A ep_elapsed M B 3 M C Z C S ep_scalar C S ep_choose_digit M A 3160 M B 3 R C ep_digit C S ep_scalar R E ep_norm_count I E -1 W ep_norm_count E ifg E Z J ep_trit end
; The only half-unit ambiguity is rounded toward zero, matching am_mul.
 M A 3870 M B ep_elapsed M C ep_half C S am_sub M A 3870 C S ep_sign ife A Z M A 3160 C S ep_sign ifl A Z M A 3160 M B 1 M C 1 C S ep_scalar end J ep_normalized end M A 3870 M B ep_elapsed M C ep_half C S am_add M A 3870 C S ep_sign ife A Z M A 3160 C S ep_sign ifg A Z M A 3160 M B 1 M C -1 C S ep_scalar end end
ep_normalized: M A Z O S P
ep_days_ms: W 3934 A M B 24 M C Z C S ep_scalar R A 3934 M B 60 M C Z C S ep_scalar R A 3934 M B 60 M C Z C S ep_scalar R A 3934 M B 10 M C Z C S ep_scalar R A 3934 M B 10 M C Z C S ep_scalar R A 3934 M B 10 M C Z J ep_scalar
ep_choose_digit: W ep_digit Z M A ep_elapsed M B ep_half C S ep_compare ifg A Z W ep_digit 1 M A ep_elapsed M B ep_elapsed M C ep_duration J am_sub end M A 3870 M B ep_elapsed M C ep_half C S am_add M A 3870 C S ep_sign ifl A Z W ep_digit -1 M A ep_elapsed M B ep_elapsed M C ep_duration J am_add end M A Z O S P
ep_sign: A A 9 M K 10
ep_sign_loop: R E A ifg E Z M A 1 O S P end ifl E Z M A -1 O S P end I A -1 I K -1 N K Z J ep_sign_loop M A Z O S P

ep_month_days: 31 28 31 30 31 30 31 31 30 31 30 31
ep_month_start: 0 31 59 90 120 151 181 212 243 273 304 334
ep_counts: 14 10 13 11 8 7 6 6 6 13 11
ep_widths: 8 16 16 32 32 32 32 32 32 4 16
ep_format: 1 2 11 32 1 5 0 0 0 0
