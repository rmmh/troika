import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
/** Exact domains: polygon cross-products <=648 and eight shoelace terms <=1296;
 * rectangle cells <=324. Bezier Bernstein numerator <=9*64=576.
 * Clipping uses a 60-unit grid: each original-edge denominator divides lcm(1..6),
 * and new rectangle edges are axis aligned. Cancel dx/dy before multiplying;
 * remaining numerator <=6 and parameter <=360, so products <=2160.
 * Circle grid has25 points: exhaustive test of every noncollinear triple bounds
 * determinant16, U/V32, W128, radius numerator8192, denominator1024. Fractions
 * are compared by Euclidean quotients, avoiding unbounded cross multiplication.
 */
const helpers=`${SAMPLE_PARSE.replace('ifge D 9','ifge D 20')}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P
geo_parse: C S stats_parse N A Z O S P M I 2900 R G 3000
geo_bound: R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I I 1 I G -1 N G Z J geo_bound M A Z O S P
geo_pad: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put N A Z O S P J geo_pad
geo_frac: ifl D Z P D -1 P F -1 end J stats_fraction
; AB cross AC, result F; G..L preserved.
geo_cross: M I A R D I M E I/1 M I B R A I S A D M B I/1 S B E M I C R F I S F D M C I/1 S C E P A C P B F M F A S F B O S P
; Integer gcd A,B nonnegative, result A.
geo_gcd: E B Z O S P C S app_div M A B M B C J geo_gcd
; Segment AB contains C when cross is zero. Result A=1/0.
geo_on: M I A R D I M E I/1 M I B R F I M B I/1 M I C R A I M C I/1 ifg D F M I D M D F M F I end ifl A D M A Z O S P end ifg A F M A Z O S P end ifg E B M I E M E B M B I end ifl C E M A Z O S P end ifg C B M A Z O S P end M A 1 O S P
; Polygon count 3020, data2900; distinct noncollinear adjacent corners, simple.
geo_polygon: R A 3000 M B 2 C S app_div N C Z J app_bad ifl A 3 J app_bad end ifg A 8 J app_bad end W 3020 A W 3021 Z W 3022 Z
geo_poly_edge: R G 3021 R H 3020 M J G I J 1 ifge J H M J Z end M K J I K 1 ifge K H M K Z end M A G P A 2 A A 2900 M B J P B 2 A B 2900 M C K P C 2 A C 2900 C S geo_cross E F Z J app_bad
 M I G P I 2 A I 2900 R E I M F I/1 M I J P I 2 A I 2900 R A I M B I/1 P E B P F A S E F R F 3022 A F E W 3022 F
 W 3023 J W 3024 Z
geo_poly_pair: R G 3024 R H 3020 ifge G H J geo_poly_next end R J 3021 R K 3023 ifle G J J geo_poly_skip end ife G K J geo_poly_skip end M L G I L 1 ifge L H M L Z end ife L J J geo_poly_skip end
 M A J P A 2 A A 2900 W 3030 A M B K P B 2 A B 2900 W 3031 B M C G P C 2 A C 2900 W 3032 C M E L P E 2 A E 2900 W 3033 E C S geo_cross W 3034 F ife F Z R A 3030 R B 3031 R C 3032 C S geo_on N A Z J app_bad end
 R A 3030 R B 3031 R C 3033 C S geo_cross W 3035 F ife F Z R A 3030 R B 3031 R C 3033 C S geo_on N A Z J app_bad end
 R A 3032 R B 3033 R C 3030 C S geo_cross W 3036 F ife F Z R A 3032 R B 3033 R C 3030 C S geo_on N A Z J app_bad end
 R A 3032 R B 3033 R C 3031 C S geo_cross W 3037 F ife F Z R A 3032 R B 3033 R C 3031 C S geo_on N A Z J app_bad end
 R E 3034 R F 3035 ifl E Z ifle F Z J geo_poly_skip end else ifge F Z J geo_poly_skip end end R E 3036 R F 3037 ifl E Z ifg F Z J app_bad end else ifl F Z J app_bad end end
geo_poly_skip: R G 3024 I G 1 W 3024 G J geo_poly_pair
geo_poly_next: R G 3021 I G 1 W 3021 G R H 3020 ifl G H J geo_poly_edge end R E 3022 E E Z J app_bad M A Z O S P`;
const lattice=`app_compute: C S geo_parse N A Z O S P C S geo_polygon N A Z O S P W 3040 Z W 3041 Z
lt_edge: R G 3041 R H 3020 M J G I J 1 ifge J H M J Z end P G 2 A G 2900 P J 2 A J 2900 R A G R E J S A E F A A M B G/1 M E J/1 S B E F B A C S geo_gcd R E 3040 A E A W 3040 E R G 3041 I G 1 W 3041 G R H 3020 ifl G H J lt_edge end
 M A @lt_area C S stats_label R F 3022 F F A M D 2 C S stats_fraction M B 27 C S geo_pad M A @lt_boundary C S stats_label R F 3040 C S stats_int M B 54 C S geo_pad M A @lt_inside C S stats_label R F 3022 F F A R E 3040 S F E I F 2 Q F 2 J stats_int
lt_area: ${ascii('Area=')}
lt_boundary: ${ascii('Boundary lattice points=')}
lt_inside: ${ascii('Interior lattice points=')}
${helpers}`;
const point=`app_compute: C S geo_parse N A Z O S P R E 3000 ifl E 8 J app_bad end R E 2900 W 3060 E R E 2901 W 3061 E R G 3000 I G -2 W 3000 G M I 2900 M J 2902
pt_copy: R E J W I E I I 1 I J 1 I G -1 N G Z J pt_copy C S geo_polygon N A Z O S P W 3040 Z W 3041 Z
pt_edge: R G 3041 R H 3020 M J G I J 1 ifge J H M J Z end P G 2 A G 2900 P J 2 A J 2900 M A G M B J M C 3060 C S geo_cross W 3042 F ife F Z M A G M B J M C 3060 C S geo_on ifn A Z M A @pt_boundary J stats_label end end
 M E G/1 M F J/1 R K 3061 ifle E K ifg F K R E 3042 ifg E Z R E 3040 I E 1 W 3040 E end end else ifle F K R E 3042 ifl E Z R E 3040 I E -1 W 3040 E end end end R G 3041 I G 1 W 3041 G R H 3020 ifl G H J pt_edge end R E 3040 ife E Z M A @pt_out else M A @pt_in end J stats_label
pt_boundary: ${ascii('BOUNDARY')}
pt_out: ${ascii('OUTSIDE')}
pt_in: ${ascii('INSIDE')}
${helpers}`;
const rectangles=`app_compute: C S geo_parse N A Z O S P R A 3000 M B 4 C S app_div N C Z J app_bad ifg A 4 J app_bad end W 3020 A M I 2900 M G A
ru_validate: R E I M F I/2 ifge E F J app_bad end M E I/1 M F I/3 ifge E F J app_bad end I I 4 I G -1 N G Z J ru_validate
 M I 3100 M G 324
ru_clear: W I Z I I 1 I G -1 N G Z J ru_clear W 3040 Z
ru_rect: R G 3040 P G 4 A G 2900 R E G W 3041 E M E G/2 W 3042 E M E G/1 W 3043 E M E G/3 W 3044 E
ru_y: R E 3041 W 3045 E
ru_x: R I 3043 A I 9 P I 18 R E 3045 A E 9 A I E A I 3100 W I 1 R E 3045 I E 1 W 3045 E R F 3042 ifl E F J ru_x end R E 3043 I E 1 W 3043 E R F 3044 ifl E F J ru_y end R E 3040 I E 1 W 3040 E R F 3020 ifl E F J ru_rect end
 W 3040 Z W 3041 Z W 3042 Z
ru_scan: R G 3040 M I 3100 A I G R E I ifn E Z R E 3041 I E 1 W 3041 E R H 3042 A H 4
 ifge G 18 M E I/-18 S H E end ifl G 306 M E I/18 S H E end M A G M B 18 C S app_div ifn C Z M E I/-1 S H E end ifn C 17 M E I/1 S H E end W 3042 H end R G 3040 I G 1 W 3040 G ifl G 324 J ru_scan end
 M A @ru_area C S stats_label R F 3041 C S stats_int M B 27 C S geo_pad M A @ru_perimeter C S stats_label R F 3042 J stats_int
ru_area: ${ascii('Union area=')}
ru_perimeter: ${ascii('Boundary length=')}
${helpers}`;
const bezier=`app_compute: C S geo_parse N A Z O S P R E 3000 ifn E 6 ifn E 8 J app_bad end end W 3040 Z
bz_sample: R E 3040 M F 4 S F E W 3050 F W 3051 E R G 3000 ife G 6 P F F W 3060 F R F 3050 P F E P F 2 W 3061 F P E E W 3062 E W 3063 Z W 3045 16 else R F 3050 P F F R E 3050 P F E W 3060 F R F 3050 P F F R E 3051 P F E P F 3 W 3061 F R F 3051 P F F R E 3050 P F E P F 3 W 3062 F R F 3051 P F F R E 3051 P F E W 3063 F W 3045 64 end W 3041 Z W 3042 Z W 3043 Z
bz_term: R G 3041 M I 3060 A I G R H I M I G P I 2 A I 2900 R E I P E H R F 3042 A F E W 3042 F M E I/1 P E H R F 3043 A F E W 3043 F I G 1 W 3041 G R E 3000 Q E 2 ifl G E J bz_term end
 M A @bz_t C S stats_label R F 3040 M D 4 C S stats_fraction M A 32 C S app_put R F 3042 R D 3045 C S stats_fraction M A 44 C S app_put R F 3043 R D 3045 C S stats_fraction R G 3040 I G 1 W 3040 G ifge G 5 M A Z O S P end M B G P B 27 C S geo_pad J bz_sample
bz_t: ${ascii('t=')}
${helpers}`;
const clipping=`app_compute: C S geo_parse N A Z O S P R E 3000 ifn E 10 ifn E 12 J app_bad end end M I 2900 M G E
cl_bound: R E I ifl E -3 J app_bad end ifg E 3 J app_bad end I I 1 I G -1 N G Z J cl_bound R E 2900 R F 2902 ifge E F J app_bad end R E 2901 R F 2903 ifge E F J app_bad end
 M I 2900 M J 3090 M G 4
cl_rect_copy: R E I P E 60 W J E I I 1 I J 1 I G -1 N G Z J cl_rect_copy R G 3000 I G -4 W 3000 G M I 2900 M J 2904
cl_move: R E J W I E I I 1 I J 1 I G -1 N G Z J cl_move C S geo_polygon N A Z O S P W 3040 Z
cl_convex: R G 3040 R H 3020 M J G I J 1 ifge J H M J Z end M K J I K 1 ifge K H M K Z end M A G P A 2 A A 2900 M B J P B 2 A B 2900 M C K P C 2 A C 2900 C S geo_cross R E 3022 ifg E Z ifl F Z J app_bad end else ifg F Z J app_bad end end R G 3040 I G 1 W 3040 G R H 3020 ifl G H J cl_convex end
 R G 3000 M I 2900 M J 3100
cl_scale: R E I P E 60 W J E I I 1 I J 1 I G -1 N G Z J cl_scale R E 3020 W 3400 E W 3401 Z
cl_boundary: R E 3400 ife E Z M A @cl_empty J stats_label end R G 3401 M I 3090 A I G R E I W 3402 E M A G M B 2 C S app_div W 3403 C W 3404 Z W 3405 Z R I 3400 I I -1 P I 2 A I 3100 R E I W 3410 E M E I/1 W 3411 E C S cl_inside W 3406 A
cl_edge: R I 3405 P I 2 A I 3100 R E I W 3412 E M E I/1 W 3413 E R E 3410 W 3414 E R E 3411 W 3415 E R E 3412 W 3410 E R E 3413 W 3411 E C S cl_inside W 3407 A R E 3406 ifn E A C S cl_intersection C S cl_append end R E 3407 ifn E Z R E 3412 W 3416 E R E 3413 W 3417 E C S cl_append end R E 3407 W 3406 E R E 3405 I E 1 W 3405 E R F 3400 ifl E F J cl_edge end
 R E 3404 W 3400 E P E 2 M G E M I 3300 M J 3100 E G Z J cl_copied
cl_publish: R E I W J E I I 1 I J 1 I G -1 N G Z J cl_publish
cl_copied: R E 3401 I E 1 W 3401 E ifl E 4 J cl_boundary end R E 3400 ife E Z M A @cl_empty J stats_label end
 ; Remove consecutive duplicate vertices (touching boundaries can generate them).
 W 3404 Z W 3405 Z R I 3400 I I -1 P I 2 A I 3100 R E I W 3414 E M E I/1 W 3415 E
cl_unique: R I 3405 P I 2 A I 3100 R E I W 3416 E M F I/1 W 3417 F R G 3414 R H 3415 ifn E G C S cl_append else ifn F H C S cl_append end end R E 3416 W 3414 E R E 3417 W 3415 E R E 3405 I E 1 W 3405 E R F 3400 ifl E F J cl_unique end R E 3404 ife E Z W 3404 1 R E 3416 W 3300 E R E 3417 W 3301 E end
 M A @cl_vertices C S stats_label R F 3404 C S stats_int M B 27 C S geo_pad W 3405 Z
cl_print: R I 3405 P I 2 A I 3300 R F I M D 60 C S stats_fraction M A 44 C S app_put R I 3405 P I 2 A I 3301 R F I M D 60 C S stats_fraction R E 3405 I E 1 W 3405 E R F 3404 ifge E F M A Z O S P end M A E M B 2 C S app_div ife C Z M B A P B 27 A B 27 else M B A P B 27 A B 40 end C S geo_pad J cl_print
cl_inside: R I 3403 A I 3410 R E I R F 3402 R G 3401 ifl G 2 ifge E F M A 1 O S P end else ifle E F M A 1 O S P end end M A Z O S P
cl_intersection: R G 3403 M I 3412 A I G R E I M I 3414 A I G R F I S E F W 3420 E R E 3402 S E F W 3421 E M G 1 R E 3403 S G E M I 3412 A I G R E I M I 3414 A I G R F I S E F W 3422 E W 3423 F
 ; Cancel denominator before multiplication; boundary intersections remain on original integer edges or rectangle sides. Ratio numerator <=6, parameter<=360.
 R A 3420 F A A R B 3422 F B A C S geo_gcd W 3424 A M B A R A 3420 F A A C S app_div W 3425 A R A 3422 F A A R B 3424 C S app_div R E 3422 ifl E Z P A -1 end W 3426 A R A 3421 F A A R B 3425 C S app_div N C Z J app_bad R E 3421 ifl E Z P A -1 end R E 3420 ifl E Z P A -1 end R E 3426 P E A R F 3423 A E F R G 3403 ife G Z R F 3402 W 3416 F W 3417 E else W 3416 E R F 3402 W 3417 F end O S P
cl_append: R I 3404 ifge I 16 J app_bad end P I 2 A I 3300 R E 3416 W I E R E 3417 M I/1 E R E 3404 I E 1 W 3404 E O S P
cl_empty: ${ascii('EMPTY')}
cl_vertices: ${ascii('Clipped vertices=')}
${helpers}`;
const circle=`app_compute: C S geo_parse N A Z O S P R A 3000 M B 2 C S app_div N C Z J app_bad ifg A 6 J app_bad end W 3400 A M I 2900 R G 3000
sc_bound: R E I ifl E -2 J app_bad end ifg E 2 J app_bad end I I 1 I G -1 N G Z J sc_bound W 3450 -1 W 3401 Z
sc_single: R I 3401 P I 2 A I 2900 R E I M F I/1 M G E P G 2 W 3421 G M G F P G 2 W 3422 G P E E P F F A E F P E -1 W 3423 E W 3420 1 C S sc_consider R E 3401 I E 1 W 3401 E R F 3400 ifl E F J sc_single end W 3401 Z
sc_pair_i: R E 3401 I E 1 W 3402 E
sc_pair_j: R E 3402 R F 3400 ifge E F J sc_pair_next end R I 3401 P I 2 A I 2900 R J 3402 P J 2 A J 2900 R E I R F J M G E A G F W 3421 G P E F M G I/1 M H J/1 M F G A F H W 3422 F P G H A E G P E -1 W 3423 E W 3420 1 C S sc_consider R E 3402 I E 1 W 3402 E J sc_pair_j
sc_pair_next: R E 3401 I E 1 W 3401 E R F 3400 ifl E F J sc_pair_i end W 3401 Z
sc_triple_i: R E 3401 I E 1 W 3402 E
sc_triple_j: R E 3402 R F 3400 ifge E F J sc_triple_next_i end I E 1 W 3403 E
sc_triple_k: R E 3403 R F 3400 ifge E F J sc_triple_next_j end R I 3401 P I 2 A I 2900 R J 3402 P J 2 A J 2900 R K 3403 P K 2 A K 2900 R E I W 3430 E M E I/1 W 3431 E R E J R F I S E F W 3432 E M E J/1 M F I/1 S E F W 3433 E R E K R F I S E F W 3434 E M E K/1 M F I/1 S E F W 3435 E
 R E J P E E M F J/1 P F F A E F R F I P F F S E F M F I/1 P F F S E F W 3436 E R E K P E E M F K/1 P F F A E F R F I P F F S E F M F I/1 P F F S E F W 3437 E
 R E 3432 R F 3435 P E F R F 3433 R G 3434 P F G S E F W 3420 E E E Z J sc_triple_skip R E 3436 R F 3435 P E F R F 3437 R G 3433 P F G S E F W 3421 E R E 3432 R F 3437 P E F R F 3434 R G 3436 P F G S E F W 3422 E R E 3430 P E E R F 3431 P F F A E F R F 3420 P E F R F 3421 R G 3430 P F G S E F R F 3422 R G 3431 P F G S E F W 3423 E R E 3420 ifl E Z M I 3420 M G 4
sc_flip: R E I P E -1 W I E I I 1 I G -1 N G Z J sc_flip end C S sc_consider
sc_triple_skip: R E 3403 I E 1 W 3403 E J sc_triple_k
sc_triple_next_j: R E 3402 I E 1 W 3402 E J sc_triple_j
sc_triple_next_i: R E 3401 I E 1 W 3401 E R F 3400 ifl E F J sc_triple_i end
 M A @sc_x C S stats_label R F 3451 R D 3450 P D 2 C S stats_fraction M A @sc_y C S stats_label R F 3452 R D 3450 P D 2 C S stats_fraction M B 27 C S geo_pad M A @sc_radius C S stats_label R F 3454 R D 3455 J stats_fraction
sc_consider: W 3440 Z
sc_contain: R I 3440 P I 2 A I 2900 R E I M F I/1 M G E P G G M H F P H H A G H R H 3420 P G H R H 3421 P E H S G E R H 3422 P F H S G F R E 3423 ifg G E O S P end R E 3440 I E 1 W 3440 E R F 3400 ifl E F J sc_contain end
 R E 3421 P E E R F 3422 P F F A E F R F 3423 R G 3420 P F G P F 4 A E F W 3441 E R F 3420 P F F P F 4 W 3442 F R E 3450 ifl E Z J sc_adopt end
 ; Compare nonnegative fractions by Euclidean quotients, never cross-multiply.
 R E 3441 W 3460 E R E 3442 W 3461 E R E 3454 W 3462 E R E 3455 W 3463 E W 3464 1
sc_compare: R A 3460 R B 3461 C S app_div W 3465 A W 3466 C R A 3462 R B 3463 C S app_div R E 3465 ifn E A R F 3464 ifl E A ifg F Z J sc_adopt end else ifl F Z J sc_adopt end end O S P end R E 3466 ife E Z ife C Z O S P end R F 3464 ifg F Z J sc_adopt end O S P end ife C Z R F 3464 ifl F Z J sc_adopt end O S P end R E 3461 W 3460 E R E 3466 W 3461 E R E 3463 W 3462 E W 3463 C R E 3464 P E -1 W 3464 E J sc_compare
sc_adopt: M I 3420 M J 3450 M G 4
sc_save: R E I W J E I I 1 I J 1 I G -1 N G Z J sc_save R E 3441 W 3454 E R E 3442 W 3455 E O S P
sc_x: ${ascii('Center x=')}
sc_y: ${ascii(' y=')}
sc_radius: ${ascii('Radius squared=')}
${helpers}`;
const make=(number:number,id:string,site:string,title:string,algorithm:string,description:string,input:string,output:string):TextSoftware=>({number,id,site,title,kind:'text',algorithm,description,inputs:[['Polygon x y','x0 y0 x1 y1','Rect + polygon','Point + polygon','Control points','Points -2..2'][number-352]!],outputs:['Exact result'],examples:[{input,output},{input:'invalid',error:true}]});
export const GEOMETRY_WORKSHOP:TextSoftware[]=[
 make(352,'lattice-polygon','maps','Lattice Polygon Census',lattice,'Enter 3..8 integer x y polygon vertices in boundary order, coordinates -9..9, separated by spaces. Returns exact area and counts of boundary/interior lattice points using native gcd and Pick arithmetic. Rejects self-intersections, repeated vertices, zero area and collinear adjacent corners; do not repeat the first vertex.','0 0 4 0 4 3 0 3','Area=12'.padEnd(27)+'Boundary lattice points=14'.padEnd(27)+'Interior lattice points=6'),
 make(353,'rectangle-union','miniature','Rectangle Union',rectangles,'Enter 1..4 rectangles as xLow yLow xHigh yHigh, integers -9..9 with low strictly below high. Native exact unit-cell coverage returns union area and total boundary length, including hole boundaries. Overlaps and duplicate rectangles count only once; edge-touching rectangles share no boundary along that edge.','0 0 3 2 2 1 4 3','Union area=9'.padEnd(27)+'Boundary length=14'),
 make(354,'convex-clip','gallery','Convex Polygon Clip',clipping,'Enter rectangle xLow yLow xHigh yHigh followed by 3..4 polygon x y vertices in boundary order. All integers -3..3; rectangle bounds must increase. Polygon must be simple and strictly convex, no repeated or collinear corners. Native clipping returns exact reduced rational vertices in original winding, no repeated closure; EMPTY, a point or a segment are valid intersections. Two vertices per row.','0 0 2 2 -1 1 1 -1 3 1 1 3','Clipped vertices=4'.padEnd(27)+'0,2'.padEnd(13)+'0,0'.padEnd(14)+'2,0'.padEnd(13)+'2,2'),
 make(355,'polygon-point','lighthouse','Polygon Point Test',point,'Enter query x y then 3..8 polygon x y vertices in boundary order; all integers -9..9. Native winding-number classification returns INSIDE, OUTSIDE or BOUNDARY, including concave polygons. Rejects self-intersections, repeated vertices, zero area and collinear adjacent corners. Do not repeat the first vertex.','1 1 0 0 3 0 3 3 0 3','INSIDE'),
 make(356,'bezier-sampler','lenses','Bezier Sampler',bezier,'Enter 3 quadratic or 4 cubic control points as space-separated x y integers -9..9. Native Bernstein evaluation prints exact reduced rational positions at t=0,1/4,1/2,3/4,1, one per row. Repeated control points are valid. These are sampled positions, not an arc-length estimate.','0 0 2 4 4 0','t=0 0,0'.padEnd(27)+'t=1/4 1,3/2'.padEnd(27)+'t=1/2 2,2'.padEnd(27)+'t=3/4 3,3/2'.padEnd(27)+'t=1 4,0'),
 make(357,'enclosing-circle','observatory','Smallest Enclosing Circle',circle,'Enter 1..6 points as space-separated x y integers -2..2. Native exhaustive single, diameter-pair and circumcircle candidates find the exact smallest enclosing circle. Reports rational center and radius squared; duplicate and collinear points are valid. Equal candidates keep the first support examined, singles then pairs then triples in input order.','-2 0 2 0 0 2','Center x=0 y=0'.padEnd(27)+'Radius squared=4'),
];
