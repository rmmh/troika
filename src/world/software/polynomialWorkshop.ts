import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const shared=`${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P
; D += E*F with a small multiplier E; detect signed wrap on each monotone addition.
pw_add: ifl E Z P E -1 P F -1 end
pw_add_next: E E Z M A Z E E Z O S P M B D A D F ifg F Z ifl D B J app_bad end end ifl F Z ifg D B J app_bad end end I E -1 J pw_add_next
; Exact signed quotient A/B. Division helper preserves G/H/J/K/L.
pw_divide: W 3490 A W 3491 B F A A F B A E B Z J app_bad C S app_div N C Z J app_bad R E 3490 R F 3491 ifl E Z P A -1 end ifl F Z P A -1 end O S P
pw_small: M I 2900 R G 3000
pw_small_next: R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I I 1 I G -1 N G Z J pw_small_next M A Z O S P
; Render indexed coefficients in nine-cell fields, three per 27-column row.
pw_fields: W 3500 A W 3501 B W 3502 C W 3503 D W 3504 Z R E 2620 W 3505 E
pw_field: R G 3504 R H 3501 ifge G H J pw_field_end end R A 3503 C S app_put R A 3502 A A G A A 48 C S app_put M A 61 C S app_put R I 3500 A I G R F I C S stats_int R B 3505 I B 9 W 3505 B C S pw_pad R G 3504 I G 1 W 3504 G J pw_field
pw_field_end: R A 2620 M B 27 C S app_div ifn C Z R B 2620 A B 27 S B C C S pw_pad end M A Z O S P
pw_pad: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put N A Z O S P J pw_pad`;
const resultant=`app_compute: C S stats_parse N A Z O S P R E 3000 N E 6 J app_bad M I 2900 M G 6
rs_bound: R E I ifl E -3 J app_bad end ifg E 3 J app_bad end I I 1 I G -1 N G Z J rs_bound R E 2902 E E Z J app_bad R E 2905 E E Z J app_bad
 R G 2902 R E 2903 P G E R E 2900 R F 2905 P E F S G E P G G
 R H 2902 R E 2904 P H E R E 2901 R F 2905 P E F S H E
 R L 2901 R E 2903 P L E R E 2900 R F 2904 P E F S L E P H L S G H
 M A @rs_label C S stats_label M F G C S stats_int M B 27 C S pw_pad ife G Z M A @rs_shared else M A @rs_coprime end J stats_label
rs_label: ${ascii('R=')}
rs_shared: ${ascii('SHARED FACTOR')}
rs_coprime: ${ascii('COPRIME')}
${shared}`;
const division=`app_compute: C S stats_parse N A Z O S P C S pw_small N A Z O S P R G 2900 ifl G 1 J app_bad end ifg G 4 J app_bad end W 3400 G R H 3000 S H G I H -1 ifl H 1 J app_bad end ifg H 4 J app_bad end W 3401 H M J 2901 M I 3200 M K G
pd_copy_a: R E J W I E I J 1 I I 1 I K -1 N K Z J pd_copy_a M I 3300 M K H
pd_copy_b: R E J W I E I J 1 I I 1 I K -1 N K Z J pd_copy_b M I 3100 M K 4
pd_clear: W I Z I I 1 I K -1 N K Z J pd_clear
pd_trim_b: R H 3401 M I 3299 A I H R E I ife E Z ife H 1 J app_bad end I H -1 W 3401 H J pd_trim_b end
pd_trim_a: R G 3400 M I 3199 A I G R E I ife E Z ifg G 1 I G -1 W 3400 G J pd_trim_a end J pd_done end R H 3401 ifl G H J pd_done end M K G S K H W 3402 K R A I M I 3299 A I H R B I C S pw_divide ; quotient status is remainder rather than signed A
 N C Z J app_bad W 3403 A M I 3100 R K 3402 A I K W I A W 3404 Z
pd_subtract: R J 3404 R H 3401 ifge J H J pd_trim_a end M I 3300 A I J R E I P E -1 R F 3403 M I 3200 R K 3402 A I K A I J R D I W 3405 I C S pw_add N A Z O S P R I 3405 W I D R J 3404 I J 1 W 3404 J J pd_subtract
pd_done: M G 4
pd_trim_q: M I 3099 A I G R E I ife E Z ifg G 1 I G -1 J pd_trim_q end end M A 3100 M B G M C Z M D 113 C S pw_fields M A 3200 R B 3400 M C Z M D 114 J pw_fields
${shared}`;
const interpolation=`app_compute: C S stats_parse N A Z O S P C S pw_small N A Z O S P R A 3000 ifl A 4 J app_bad end M B 2 C S app_div N C Z J app_bad W 3400 A M G A M J 2900 M K Z
pi_copy: R E J ifl E -3 J app_bad end ifg E 3 J app_bad end M I 3100 A I K W I E M E J/1 M I 3200 A I K W I E A J 2 I K 1 ifl K G J pi_copy end W 3401 1
pi_order: R G 3401 R H 3400 ifge G H J pi_convert end I H -1 W 3402 H
pi_difference: R H 3402 R G 3401 ifl H G J pi_next_order end M I 3200 A I H R A I M E I/-1 S A E M I 3100 A I H R B I S I G R E I S B E E B Z J app_bad C S pw_divide N C Z J app_bad M I 3200 R H 3402 A I H W I A I H -1 W 3402 H J pi_difference
pi_next_order: R G 3401 I G 1 W 3401 G J pi_order
pi_convert: M I 3300 M G 4
pi_zero: W I Z I I 1 I G -1 N G Z J pi_zero R G 3400 I G -1 M I 3200 A I G R E I W 3300 E I G -1 W 3401 G W 3402 Z
pi_outer: R G 3401 ifl G Z J pi_done end R H 3402 I H 1 W 3402 H W 3403 H
pi_inner: R H 3403 E H Z J pi_constant M I 3300 A I H M D I/-1 R F I M I 3100 R G 3401 A I G R E I P E -1 C S pw_add N A Z O S P M I 3300 R H 3403 A I H W I D I H -1 W 3403 H J pi_inner
pi_constant: R G 3401 M I 3200 A I G R D I M I 3100 A I G R E I P E -1 R F 3300 C S pw_add N A Z O S P W 3300 D R G 3401 I G -1 W 3401 G J pi_outer
pi_done: M A 3300 R B 3400 M C Z M D 99 J pw_fields
${shared}`;
const roots=`app_compute: C S stats_parse N A Z O S P C S pw_small N A Z O S P R E 3000 N E 3 J app_bad R G 2900 R H 2901 R L 2902 ife G Z ife H Z ife L Z M A @qr_all else M A @qr_none end J stats_label end M F L P F -1 M D H C S qr_sign W 3400 F W 3401 D M A @qr_x C S stats_label R F 3400 R D 3401 J stats_fraction end
 M K H P K H M E G P E L P E 4 S K E ifl K Z M A @qr_complex J stats_label end M J Z
qr_sqrt: M E J P E J ifge E K J qr_classify end I J 1 J qr_sqrt
qr_classify: ifn E K M A @qr_irr C S stats_label M F K J stats_int end M D G P D 2 M F H P F -1 C S qr_sign W 3400 F W 3401 D W 3402 J M A @qr_x1 ife J Z M A @qr_x end C S stats_label R F 3400 R E 3402 S F E R D 3401 C S stats_fraction R J 3402 E J Z M A Z E J Z O S P M B 27 C S pw_pad M A @qr_x2 C S stats_label R F 3400 R E 3402 A F E R D 3401 J stats_fraction
qr_sign: ifl D Z P D -1 P F -1 end O S P
qr_all: ${ascii('ALL REAL')}
qr_none: ${ascii('NONE')}
qr_complex: ${ascii('COMPLEX')}
qr_irr: ${ascii('IRRATIONAL D=')}
qr_x: ${ascii('x=')}
qr_x1: ${ascii('x1=')}
qr_x2: ${ascii('x2=')}
${shared}`;
const translate=`app_compute: C S stats_parse N A Z O S P C S pw_small N A Z O S P R G 3000 ifl G 2 J app_bad end ifg G 8 J app_bad end R E 2900 ifl E -3 J app_bad end ifg E 3 J app_bad end I G -1 W 3400 G M I 3300 M K 7
pt_zero: W I Z I I 1 I K -1 N K Z J pt_zero M I 2900 A I G R E I W 3300 E I G -1 W 3401 G W 3402 Z
pt_outer: R G 3401 E G Z J pt_done R H 3402 I H 1 W 3402 H W 3403 H
pt_inner: R H 3403 E H Z J pt_constant M I 3300 A I H M D I/-1 R F I R E 2900 C S pw_add N A Z O S P M I 3300 R H 3403 A I H W I D I H -1 W 3403 H J pt_inner
pt_constant: R G 3401 M I 2900 A I G R D I R E 2900 R F 3300 C S pw_add N A Z O S P W 3300 D R G 3401 I G -1 W 3401 G J pt_outer
pt_done: M A 3300 R B 3400 M C Z M D 99 J pw_fields
${shared}`;
const cumulative=`app_compute: C S stats_parse N A Z O S P C S pw_small N A Z O S P R G 3000 ifl G 2 J app_bad end ifg G 7 J app_bad end I G -1 W 3400 G R E 2900 ifl E 1 J app_bad end W 3401 E M J 2901 M I 3100 M K G
ns_copy: R E J W I E I J 1 I I 1 I K -1 N K Z J ns_copy W 3402 Z
ns_order: R G 3402 R H 3400 ifge G H J ns_prepare end R E 3100 M I 3200 A I G W I E S H G I H -1 M J 3100
ns_difference: E H Z J ns_next_order R E J M F J/1 S F E W J F I J 1 I H -1 J ns_difference
ns_next_order: R G 3402 I G 1 W 3402 G J ns_order
ns_prepare: R K 3400 M J 3200 M I 3100
ns_recopy: R E J W I E I J 1 I I 1 I K -1 N K Z J ns_recopy W 3402 Z W 3403 Z
ns_sum: R D 3403 R F 3100 M E 1 C S pw_add N A Z O S P W 3403 D M I 3300 R G 3402 A I G W I D I G 1 W 3402 G R H 3401 ifge G H J ns_done end W 3404 Z
ns_advance: R G 3404 R H 3400 I H -1 ifge G H J ns_sum end M I 3100 A I G R D I M F I/1 M E 1 C S pw_add N A Z O S P M I 3100 R G 3404 A I G W I D I G 1 W 3404 G J ns_advance
ns_done: M A 3200 R B 3400 M C 1 M D 66 C S pw_fields M A 3300 R B 3401 M C 1 M D 81 J pw_fields
${shared}`;
const fields=(prefix:string,values:number[],start=0)=>{let s=values.map((v,i)=>`${prefix}${i+start}=${v}`.padEnd(9)).join('');return s.padEnd(Math.ceil(s.length/27)*27)};
export const POLYNOMIAL_WORKSHOP:TextSoftware[]=[
 {number:263,kind:'text',id:'quad-resultant',site:'crystal',title:'Quadratic Resultant',inputs:['a0 a1 a2 b0...'],outputs:['Resultant / common factor'],description:'Enter six integers a0 a1 a2 b0 b1 b2 in -3..3, ascending coefficients of two quadratic polynomials. Both quadratic coefficients must be nonzero. Computes their exact resultant: zero means a shared polynomial factor over the complex numbers; otherwise COPRIME. This tests a shared root without estimating either root.',algorithm:resultant,examples:[{input:'-1 0 1 -2 1 1',output:'R=0'.padEnd(27)+'SHARED FACTOR'},{input:'0 0 1 1 0 1',output:'R=1'.padEnd(27)+'COPRIME'},{input:'1 0 0 1 0 1',error:true}]},
 {number:264,kind:'text',id:'poly-division',site:'ada',title:'Integer Polynomial Division',inputs:['n a0 ... b0 ...'],outputs:['q=quotient r=remainder'],description:'Enter n, then n dividend coefficients, then all divisor coefficients. Each polynomial has 1..4 ascending coefficients in -9..9. Trailing zeros are trimmed; zero divisor is invalid. Native long division requires every quotient step to be integral and rejects arithmetic overflow. q and r fields are ascending coefficients; a zero polynomial is one zero field. Example: 3 -1 0 1 -1 1 divides x squared minus 1 by x minus 1.',algorithm:division,examples:[{input:'3 -1 0 1 -1 1',output:fields('q',[1,1])+fields('r',[0])},{input:'1 1 2',error:true}]},
 {number:265,kind:'text',id:'integral-fit',site:'pendulum',title:'Integral Polynomial Fit',inputs:['x0 y0 x1 y1 ...'],outputs:['Ascending coefficients'],description:'Enter 2..4 distinct x/y pairs. x must be -3..3 and y -9..9. Finds the unique polynomial of degree below the point count, using exact divided differences. Only integral coefficients are accepted; fractional fits, duplicate x values and overflow are errors. c0 is the constant coefficient; high zero coefficients are retained. Points may appear in any order.',algorithm:interpolation,examples:[{input:'0 1 1 2 2 5',output:fields('c',[1,0,1])},{input:'0 0 2 1',error:true}]},
 {number:266,kind:'text',id:'quadratic-roots',site:'observatory',title:'Exact Quadratic Roots',inputs:['a b c (-9..9)'],outputs:['ax^2+bx+c=0'],description:'Enter three integers a b c in -9..9. Square discriminants give exact reduced rational roots, sorted numerically; repeated roots appear once. Non-square positive discriminants report IRRATIONAL with D; negative discriminants report COMPLEX. a=0 solves a linear equation; a=b=0 reports ALL REAL when c=0, otherwise NONE. No decimal approximations are invented.',algorithm:roots,examples:[{input:'2 -3 1',output:'x1=1/2'.padEnd(27)+'x2=1'},{input:'1 0 1',output:'COMPLEX'},{input:'0 0 0',output:'ALL REAL'}]},
 {number:267,kind:'text',id:'poly-translate',site:'ternary',title:'Polynomial Translation',inputs:['h c0 c1 ...'],outputs:['Coefficients of p(x+h)'],description:'Enter integer h in -3..3 followed by 1..7 ascending polynomial coefficients in -9..9. Computes the exact coefficients of p(x+h) using polynomial Horner steps. c0 is the constant term. High zero coefficients are retained. Any intermediate coefficient outside -9841..9841 is an error rather than wrapped arithmetic.',algorithm:translate,examples:[{input:'2 1 0 1',output:fields('c',[5,4,1])},{input:'3 9 9 9 9 9 9 9',error:true}]},
 {number:268,kind:'text',id:'newton-sums',site:'weather',title:'Discrete Antiderivative',inputs:['k y0 y1 ...'],outputs:['Q(0)=0; B=binomial coeffs'],description:'Enter k in 1..9 followed by 1..6 samples in -9..9 at x=0,1,2,... . Fit the unique polynomial p of degree below the sample count, then form Q(m)=p(0)+...+p(m-1), with Q(0)=0. B1..Bn are its coefficients in the binomial(m,k) basis, not ordinary powers. Q1..Qk are prefix totals, extrapolated from that polynomial when necessary. Rejects any intermediate overflow; this is an exact mathematical model, not a forecast.',algorithm:cumulative,examples:[{input:'5 1 3 5',output:fields('B',[1,2,0],1)+fields('Q',[1,4,9,16,25],1)},{input:'0 1',error:true}]},
];
