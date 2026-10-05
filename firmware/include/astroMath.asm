; Native ephemeris arithmetic. No host arithmetic or callbacks.
; A value is ten little-endian balanced base81 limbs, each -40..40.
; Integer coefficients/results use millimeters. Normalized x uses scale 3^27.
; am_add/am_sub/am_mul(A=out,B=left,C=right): A=0 success, -1 overflow,
; -2 malformed limb. am_mul rounds the exact product divided by 3^27.
; am_eval(A=out,B=ascending coefficients,C=degree0..14,D=x): same errors,
; -3 invalid degree or x outside [-3^27,+3^27]. Coefficients have ten limbs.
; am_unpack_mm(A=out,B=packed,C=count0..4): signed balanced19683 limbs in
; little-endian meters become ten base81 limbs in millimeters; -3 bad count.
; All registers clobbered, S balanced. Non-reentrant scratch3800..3899.
; Caller supplies valid ten-cell/packed/coefficient RAM spans disjoint from
; scratch and the stack. Outputs may alias inputs. Errors leave output intact.
; Multiplication's largest limb sum is 1661, below tryte maximum9841.
$am_dest: 3800
$am_left: 3801
$am_right: 3802
$am_sign: 3803
$am_i: 3804
$am_j: 3805
$am_carry: 3806
$am_product: 3810
$am_result: 3830
$am_eval_dest: 3840
$am_coeff: 3841
$am_degree: 3842
$am_x_ptr: 3843
$am_b1: 3850
$am_b2: 3860
$am_tmp: 3870
$am_twox: 3880
$am_x: 3890

am_validate: M I A M K 10
am_validate_loop: R E I ifl E -40 M A -2 O S P end ifg E 40 M A -2 O S P end I I 1 I K -1 N K Z J am_validate_loop M A Z O S P
am_prepare: W am_dest A W am_left B W am_right C M A B C S am_validate ifn A Z O S P end R A am_right J am_validate
am_copy: M K 10
am_copy_loop: R E B W A E I A 1 I B 1 I K -1 N K Z J am_copy_loop O S P
am_commit: R A am_dest M B am_result C S am_copy M A Z O S P
am_overflow: M A -1 O S P

am_add: W am_sign 1 J am_sum
am_sub: W am_sign -1
am_sum: C S am_prepare ifn A Z O S P end R I am_left R J am_right M L am_result M K 10 M G Z R H am_sign
am_sum_loop: R E I R F J P F H A E F A E G M G E Q G 81 M F G P F 81 S E F W L E I I 1 I J 1 I L 1 I K -1 N K Z J am_sum_loop ifn G Z J am_overflow end J am_commit

am_mul: C S am_prepare ifn A Z O S P end M I am_product M K 20
am_mul_clear: W I Z I I 1 I K -1 N K Z J am_mul_clear W am_i Z
am_mul_row: R E am_i R I am_left A I E R H I M L am_product A L E R J am_right M K 10 M G Z
am_mul_column: R E J P E H R F L A E F A E G M G E Q G 81 M F G P F 81 S E F W L E I J 1 I L 1 I K -1 N K Z J am_mul_column W L G R E am_i I E 1 W am_i E ifl E 10 J am_mul_row end
; Drop six balanced base81 limbs (24 trits), then divide by27 (3 trits).
; Their absolute tail is <1/2, and odd radix27 has no half-integer tie.
 M I 3829 M K 14 M G Z
am_mul_scale: P G 81 R E I A E G M G E Q E 27 M F E P F 27 S G F W I E I I -1 I K -1 N K Z J am_mul_scale
 M I 3826 M K 4
am_mul_high: R E I ifn E Z J am_overflow end I I 1 I K -1 N K Z J am_mul_high M A am_result M B 3816 C S am_copy J am_commit

am_eval: W am_eval_dest A W am_coeff B W am_degree C W am_x_ptr D ifl C Z J am_bad_eval end ifg C 14 J am_bad_eval end M A D C S am_validate ifn A Z O S P end M A am_x R B am_x_ptr C S am_copy
; Compare the balanced representation lexicographically against +/-3^27.
 M I 3899 M K 3
am_x_high: R E I ifn E Z J am_bad_eval end I I -1 I K -1 N K Z J am_x_high R E 3896 ifg E 27 J am_bad_eval end ifl E -27 J am_bad_eval end ife E 27 M H 1 J am_x_tail end ife E -27 M H -1 J am_x_tail end J am_x_valid
am_x_tail: M I 3895 M K 6
am_x_tail_loop: R E I ifn E Z P E H ifg E Z J am_bad_eval end J am_x_valid end I I -1 I K -1 N K Z J am_x_tail_loop
am_x_valid: M A am_twox M B am_x M C am_x C S am_add ifn A Z O S P end M I am_b1 M K 20
am_eval_zero: W I Z I I 1 I K -1 N K Z J am_eval_zero R E am_degree ife E Z J am_eval_last end
am_eval_loop: M A am_tmp M B am_twox M C am_b1 C S am_mul ifn A Z O S P end M A am_tmp M B am_tmp M C am_b2 C S am_sub ifn A Z O S P end R C am_degree P C 10 R E am_coeff A C E M A am_tmp M B am_tmp C S am_add ifn A Z O S P end M A am_b2 M B am_b1 C S am_copy M A am_b1 M B am_tmp C S am_copy R E am_degree I E -1 W am_degree E ifg E Z J am_eval_loop end
am_eval_last: M A am_tmp M B am_x M C am_b1 C S am_mul ifn A Z O S P end M A am_tmp M B am_tmp M C am_b2 C S am_sub ifn A Z O S P end M A am_tmp M B am_tmp R C am_coeff C S am_add ifn A Z O S P end R A am_eval_dest M B am_tmp C S am_copy M A Z O S P
am_bad_eval: M A -3 O S P

am_unpack_mm: W am_dest A W am_left B ifl C Z J am_bad_eval end ifg C 4 J am_bad_eval end I C -1 W am_i C M I am_result M K 10
am_unpack_zero: W I Z I I 1 I K -1 N K Z J am_unpack_zero R E am_i ifl E Z J am_commit end
am_unpack_digit: M I 3839 M K 8
am_unpack_shift: M E I/-2 W I E I I -1 I K -1 N K Z J am_unpack_shift W 3830 Z W 3831 Z R I am_left R E am_i A I E R G I M I am_result M K 10
am_unpack_horner: R E I P E 3 A E G M G E Q G 81 M F G P F 81 S E F W I E I I 1 I K -1 N K Z J am_unpack_horner ifn G Z J am_overflow end R E am_i I E -1 W am_i E ifge E Z J am_unpack_digit end W am_i 3
am_unpack_thousand: M I am_result M K 10 M G Z
am_unpack_ten: R E I P E 10 A E G M G E Q G 81 M F G P F 81 S E F W I E I I 1 I K -1 N K Z J am_unpack_ten ifn G Z J am_overflow end R E am_i I E -1 W am_i E ifg E Z J am_unpack_thousand end J am_commit
