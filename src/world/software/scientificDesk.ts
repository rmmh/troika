import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const lit=(n:string,s:string)=>`${n}: ${ascii(s)}\n`,say=(n:string)=>`M A @${n} C S stats_label `,pad=(n:number)=>`M A ${n*27} C S sd_pad `,integer=(a:number)=>`R F ${a} C S stats_int `,fraction=(a:number,b:number)=>`R F ${a} R D ${b} C S stats_fraction `;
const common=`${SAMPLE_PARSE.replace('ifge D 9','ifge D 24')}\n${SAMPLE_OUTPUT}
app_bad: M A -1 O S P
sd_pad: M B A
sd_pad_loop: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J sd_pad_loop
`;
const lines=(...rows:string[])=>rows.map((s,i)=>i===rows.length-1?s:s.padEnd(27)).join('');
export const SCIENTIFIC_DESK:TextSoftware[]=[];
// Box boundaries ensure every nonempty feasible set has a vertex, including
// line segments and isolated points. |det|<=18; objective comparisons<=5832.
const linear=`app_compute: C S stats_parse N A Z O S P R A 3000 ifl A 4 J app_bad end ifg A 16 J app_bad end I A -4 M B 3 C S app_div N C Z J app_bad I A 4 W 3300 A M L Z
lp_objective: M I 2900 A I L R E I ifl E -3 J app_bad end ifg E 3 J app_bad end I L 1 ifl L 2 J lp_objective end
R E 2902 ifl E 1 J app_bad end ifg E 9 J app_bad end W 3142 E R E 2903 ifl E 1 J app_bad end ifg E 9 J app_bad end W 3143 E
W 3100 -1 W 3120 Z W 3140 Z W 3101 Z W 3121 -1 W 3141 Z W 3102 1 W 3122 Z W 3103 Z W 3123 1 M L 4
lp_constraints: R E 3300 ifge L E J lp_start end M I L I I -4 P I 3 A I 2904 R E I ifl E -3 J app_bad end ifg E 3 J app_bad end M J 3100 A J L W J E M E I/1 ifl E -3 J app_bad end ifg E 3 J app_bad end M J 3120 A J L W J E M E I/2 ifl E -9 J app_bad end ifg E 9 J app_bad end M J 3140 A J L W J E I L 1 J lp_constraints
lp_start: W 3301 Z W 3302 Z W 3303 Z
lp_first: R H 3303 R E 3300 ifge H E J lp_output end I H 1 W 3304 H
lp_second: R J 3304 R E 3300 ifge J E J lp_next_first end R H 3303 M I 3100 A I H R E I M I 3120 A I J R F I P E F M I 3100 A I J R F I M I 3120 A I H R G I P F G S E F E E Z J lp_next_second W 3312 E
M I 3140 A I H R E I M I 3120 A I J R F I P E F M I 3140 A I J R F I M I 3120 A I H R G I P F G S E F W 3310 E
M I 3100 A I H R E I M I 3140 A I J R F I P E F M I 3100 A I J R F I M I 3140 A I H R G I P F G S E F W 3311 E
R E 3312 ifl E Z P E -1 W 3312 E R E 3310 P E -1 W 3310 E R E 3311 P E -1 W 3311 E end M L Z
lp_inside: R E 3300 ifge L E J lp_candidate end M I 3100 A I L R E I R F 3310 P E F M I 3120 A I L R G I R F 3311 P G F A E G M I 3140 A I L R G I R F 3312 P G F ifg E G J lp_next_second end I L 1 J lp_inside
lp_candidate: R E 2900 R F 3310 P E F R G 2901 R F 3311 P G F A E G W 3313 E R E 3301 E E Z J lp_better R E 3313 R F 3322 P E F R G 3323 R F 3312 P G F ifg E G J lp_better end ifl E G J lp_next_second end
R E 3310 R F 3322 P E F R G 3320 R F 3312 P G F ifn E G W 3302 1 ifl E G J lp_store end J lp_next_second end R E 3311 R F 3322 P E F R G 3321 R F 3312 P G F ifn E G W 3302 1 ifl E G J lp_store end end J lp_next_second
lp_better: W 3301 1 W 3302 Z
lp_store: R E 3310 W 3320 E R E 3311 W 3321 E R E 3312 W 3322 E R E 3313 W 3323 E
lp_next_second: R E 3304 I E 1 W 3304 E J lp_second
lp_next_first: R E 3303 I E 1 W 3303 E J lp_first
lp_output: R E 3301 ife E Z ${say('lp_none')}M A Z O S P end ${say('lp_value')}${fraction(3323,3322)}${pad(1)}${say('lp_x')}${fraction(3320,3322)}${pad(2)}${say('lp_y')}${fraction(3321,3322)}${pad(3)}R E 3302 ifn E Z ${say('lp_tied')}else ${say('lp_unique')}end ${pad(4)}${say('lp_lex')}${pad(5)}${say('lp_domain')}M A Z O S P
${lit('lp_none','INFEASIBLE in the box')}${lit('lp_value','Maximum objective=')}${lit('lp_x','x=')}${lit('lp_y','y=')}${lit('lp_tied','MULTIPLE optimal points')}${lit('lp_unique','UNIQUE optimal point')}${lit('lp_lex','Tie: smallest x, then y')}${lit('lp_domain','Continuous, not integer x/y')}
${common}`;
SCIENTIFIC_DESK.push({number:433,id:'box-linear-plan',site:'depot',title:'Bounded Linear Program',kind:'text',inputs:['cx cy X Y a b c'],outputs:['Exact continuous optimum'],description:'Maximize cx*x+cy*y. Enter cx cy X Y, then 0..4 triples a b c meaning a*x+b*y<=c. Objective and constraint coefficients are -3..3; c is -9..9. The mandatory box is 0<=x<=X, 0<=y<=Y with X,Y in 1..9. Native vertex enumeration reports exact rational x,y and objective, including infeasible sets, segments and isolated points. Equal optima choose smallest x then y and report MULTIPLE when different optimal points exist. This is continuous optimization, not integer bundle buying. Example 1 1 4 4 1 1 5 has an optimal edge; 3 2 4 4 1 1 5 has unique optimum (4,1).',algorithm:linear,examples:[{input:'3 2 4 4 1 1 5',output:lines('Maximum objective=14','x=4','y=1','UNIQUE optimal point','Tie: smallest x, then y','Continuous, not integer x/y')},{input:'1 1 4 4 1 1 5',output:lines('Maximum objective=5','x=1','y=4','MULTIPLE optimal points','Tie: smallest x, then y','Continuous, not integer x/y')}]});
// -u[i-1]+2u[i]-u[i+1]=f[i]. Common denominator n+1<=9.
// Initial slope numerator <=342; all recurrence intermediates <3000.
const boundary=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 3 J app_bad end ifg E 10 J app_bad end I E -2 W 3300 E I E 1 W 3301 E M L Z
bv_validate: R E 3000 ifge L E J bv_start end M I 2900 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I L 1 J bv_validate
bv_start: R E 2901 R F 2900 S E F W 3302 E M L Z
bv_slope: R E 3300 ifge L E J bv_walk_start end S E L M I 2902 A I L R F I P E F R F 3302 A F E W 3302 F I L 1 J bv_slope
bv_walk_start: R E 3302 W 3303 E R E 2900 R F 3301 P E F W 3304 E M L Z
bv_walk: R E 3300 ifge L E J bv_output end R E 3304 R F 3303 A E F W 3304 E M I 3100 A I L W I E M I 2902 A I L R E I R F 3301 P E F R F 3303 S F E W 3303 F I L 1 J bv_walk
bv_output: ${say('bv_header')}${pad(1)}${say('bv_left')}${fraction(3302,3301)}${say('bv_right')}${fraction(3303,3301)}${pad(2)}M L Z
bv_print: R E 3300 ifge L E M A Z O S P end M F L I F 1 C S stats_int M A 58 C S app_put M I 3100 A I L R F I R D 3301 C S stats_fraction I L 1 R E 3300 ifge L E M A Z O S P end M A L M B 2 C S app_div P A 27 P C 13 A A C A A 54 C S sd_pad J bv_print
${lit('bv_header','Exact interior u[1..n]')}${lit('bv_left','Flux L=')}${lit('bv_right',' R=')}
${common}`;
SCIENTIFIC_DESK.push({number:434,id:'boundary-solve',site:'tide',title:'Discrete Boundary Solver',kind:'text',inputs:['Left Right f...'],outputs:['Spatial boundary problem'],description:'Enter left and right endpoint values, then 1..8 forcing samples; every number is an integer -9..9. Solve -u[i-1]+2*u[i]-u[i+1]=f[i] with unit spacing and fixed endpoints u[0]=left, u[n+1]=right. Outputs exact interior values and signed endpoint differences Flux L=u[1]-u[0], R=u[n+1]-u[n]. No time stepping or rounding is used. These are a discrete model and abstract units, not a continuum accuracy claim. Example 0 0 1 1 1 gives 3/2,2,3/2. With zero forcing the values interpolate linearly between the endpoints.',algorithm:boundary,examples:[{input:'0 0 1 1 1',output:lines('Exact interior u[1..n]','Flux L=3/2 R=-3/2','1:3/2        2:2','3:3/2')}]});
// [m/1] coefficient matching needs only q*a[m]+a[m+1]=0.
// Numerator coefficients a[i]*den + qnum*a[i-1] have magnitude <=162.
const pade=`app_compute: C S stats_parse N A Z O S P R E 2900 ifl E Z J app_bad end ifg E 3 J app_bad end W 3300 E I E 3 R F 3000 N E F J app_bad M L 1
pd_validate: R E 3000 ifge L E J pd_begin end M I 2900 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I L 1 J pd_validate
pd_begin: R I 3300 A I 2901 R E I M F I/1 W 3301 E P F -1 W 3302 F W 3303 Z ife E Z ifn F Z ${say('pd_impossible')}M A Z O S P end W 3301 1 W 3303 1 else ifl E Z P E -1 W 3301 E P F -1 W 3302 F end end M L Z
pd_numerator: R E 3300 ifg L E J pd_output end M I 2901 A I L R E I R F 3301 P E F ifg L Z M F I/-1 R G 3302 P F G A E F end M I 3100 A I L W I E I L 1 J pd_numerator
pd_output: R E 3303 ifn E Z ${say('pd_many')}else ${say('pd_unique')}end ${pad(1)}${say('pd_den')}${fraction(3302,3301)}${pad(2)}${say('pd_num')}${pad(3)}M L Z
pd_print: M I 3100 A I L R F I R D 3301 C S stats_fraction R E 3300 ifge L E J pd_footer end M A 32 C S app_put I L 1 J pd_print
pd_footer: ${pad(4)}${say('pd_match')}R F 3300 I F 1 C S stats_int ${pad(5)}${say('pd_normal')}M A Z O S P
${lit('pd_impossible','IMPOSSIBLE with Q(0)=1')}${lit('pd_many','NONUNIQUE; choose q=0')}${lit('pd_unique','UNIQUE normalized match')}${lit('pd_den','Q ascending: 1 ')}${lit('pd_num','P ascending coefficients:')}${lit('pd_match','Matches powers 0..')}${lit('pd_normal','Series P(x)/Q(x); Q(0)=1')}
${common}`;
SCIENTIFIC_DESK.push({number:435,id:'rational-series',site:'comet',title:'Rational Series Fit',kind:'text',inputs:['m a0 ... a[m+1]'],outputs:['Exact Pade [m/1] match'],description:'Enter m in 0..3 followed by exactly m+2 integer series coefficients -9..9, in ascending power order. Construct P(x)/Q(x), degree P at most m and Q(x)=1+q*x, matching the supplied coefficients through x^(m+1). Native exact arithmetic prints ascending P and Q coefficients. If a[m]=0 but a[m+1] is nonzero, the normalized match is impossible. If both are zero, the denominator is nonunique and q=0 is chosen. This fits a formal power series, not sampled points; it does not promise accuracy or convergence away from x=0. Example 1 1 1 1 reconstructs 1/(1-x).',algorithm:pade,examples:[{input:'1 1 1 1',output:lines('UNIQUE normalized match','Q ascending: 1 -1','P ascending coefficients:','1 0','Matches powers 0..2','Series P(x)/Q(x); Q(0)=1')}]});
// Each Lagrange polynomial has degree<=4, denominator<=360. Multiplying
// the requested coefficient by derivative order factorial remains <9841.
const stencil=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 3 J app_bad end ifg E 6 J app_bad end I E -1 W 3300 E R F 2900 ifl F Z J app_bad end ifge F E J app_bad end W 3301 1 M G 1
st_factorial: ifg G F J st_validate_start end R E 3301 P E G W 3301 E I G 1 J st_factorial
st_validate_start: M H Z
st_validate: R E 3300 ifge H E J st_start end M I 2901 A I H R E I ifl E -3 J app_bad end ifg E 3 J app_bad end M J Z
st_distinct: ifge J H J st_validate_next end M I 2901 A I J R F I E E F J app_bad I J 1 J st_distinct
st_validate_next: I H 1 J st_validate
st_start: W 3302 Z
st_node: R H 3302 R E 3300 ifge H E J st_output end M A 3200 M B 5 K A B W 3200 1 W 3303 1 W 3304 Z W 3305 Z
st_other: R J 3305 R E 3300 ifge J E J st_weight end R H 3302 E J H J st_other_next M I 2901 A I J R E I W 3306 E M I 2901 A I H R F I S F E R E 3303 P E F W 3303 E R K 3304 I K 1
st_poly: M I 3200 A I K R E I R F 3306 P E F P E -1 ifg K Z M F I/-1 A E F end W I E I K -1 ifge K Z J st_poly end R E 3304 I E 1 W 3304 E
st_other_next: R E 3305 I E 1 W 3305 E J st_other
st_weight: R I 2900 A I 3200 R E I R F 3301 P E F R F 3303 ifl F Z P E -1 P F -1 end R H 3302 M I 3100 A I H W I E M I 3120 A I H W I F I H 1 W 3302 H J st_node
st_output: ${say('st_order')}${integer(2900)}${say('st_at')}${pad(1)}${say('st_label')}${pad(2)}M L Z
st_print: R E 3300 ifge L E J st_footer end M I 2901 A I L R F I C S stats_int M A 58 C S app_put M I 3100 A I L R F I M I 3120 A I L R D I C S stats_fraction I L 1 R E 3300 ifge L E J st_footer end M A L M B 2 C S app_div P A 27 P C 13 A A C A A 54 C S sd_pad J st_print
st_footer: ${pad(5)}${say('st_exact')}R F 3300 I F -1 C S stats_int M A Z O S P
${lit('st_order','Derivative ')}${lit('st_at',' at x=0')}${lit('st_label','Offset: exact weight')}${lit('st_exact','Exact through degree ')}
${common}`;
SCIENTIFIC_DESK.push({number:436,id:'stencil-forge',site:'weather',title:'Difference Stencil Forge',kind:'text',inputs:['order offsets...'],outputs:['Exact derivative weights'],description:'Enter derivative order k followed by 2..5 distinct integer sample offsets -3..3. Require 0<=k<number of offsets. Native Lagrange construction gives exact weights w such that sum(w[i]*f(offset[i])) equals f^(k)(0) for every polynomial through degree n-1. Order 0 interpolates a value. Unit sample spacing is assumed; no noise or truncation-error estimate is supplied. Input order is preserved, and repeated offsets are rejected as singular. Example 1 -1 0 1 gives weights -1/2,0,1/2; example 2 -1 0 1 gives 1,-2,1.',algorithm:stencil,examples:[{input:'1 -1 0 1',output:lines('Derivative 1 at x=0','Offset: exact weight','-1:-1/2      0:0','1:1/2','','Exact through degree 2')}]});
// |a*x+b*y|<=1782 before truncation; clipping then restores |y|<=99.
const filter=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 5 J app_bad end ifg E 14 J app_bad end I E -4 W 3300 E M L Z
rf_coeff: M I 2900 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I L 1 ifl L 2 J rf_coeff end R E 2902 ifl E 1 J app_bad end ifg E 9 J app_bad end R E 2903 W 3301 E W 3302 Z M L Z
rf_step: R E 3300 ifge L E J rf_output end M I 2904 A I L R E I R F 2900 P E F R G 3301 R F 2901 P G F A E G M G E M A E F A A R B 2902 C S app_div ifl G Z P A -1 end ifg A 99 M A 99 R E 3302 I E 1 W 3302 E end ifl A -99 M A -99 R E 3302 I E 1 W 3302 E end W 3301 A M I 3100 A I L W I A I L 1 J rf_step
rf_output: ${say('rf_rule')}${pad(1)}${say('rf_clips')}${integer(3302)}${say('rf_final')}${integer(3301)}${pad(2)}M L Z
rf_print: R E 3300 ifge L E M A Z O S P end M F L I F 1 C S stats_int M A 58 C S app_put M I 3100 A I L R F I C S stats_int I L 1 R E 3300 ifge L E M A Z O S P end M A L P A 9 A A 54 C S sd_pad J rf_print
${lit('rf_rule','Truncate; then clip +/-99')}${lit('rf_clips','Clipped ')}${lit('rf_final',' Final ')}
${common}`;
SCIENTIFIC_DESK.push({number:437,id:'recursive-filter',site:'radios',title:'Recursive Filter Bench',kind:'text',inputs:['a b d y0 x...'],outputs:['Native feedback response'],description:'Enter a b d y0 followed by 1..10 input samples. Coefficients a,b are -9..9, divisor d is 1..9, and y0/samples are -99..99. For each sample x, compute y=trunc((a*x+b*previous_y)/d), truncating toward zero; then clip to -99..99 before feeding that result into the next step. Reports every output, final state and number of clipped updates. This explicit quantized recurrence is not ideal real-valued filtering. Example 1 3 4 0 8 8 8 8 gives 2,3,4,5. Initial state and input are editable; each Enter reruns from y0 rather than continuing old state.',algorithm:filter,examples:[{input:'1 3 4 0 8 8 8 8',output:lines('Truncate; then clip +/-99','Clipped 0 Final 5','1:2      2:3      3:4','4:5')}]});
// Four row masks each have at most six choices after row-sum filtering.
// DFS applies column bounds before descent; at most 1296 row combinations.
const tomography=`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 8 ifn E 10 J app_bad end end M L Z
bt_validate: R E 3000 ifge L E J bt_start end M I 2900 A I L R E I ifl E Z J app_bad end ifg E 4 J app_bad end I L 1 J bt_validate
bt_start: M A 3100 M B 120 K A B W 3300 Z W 3301 Z M I 3180 M K 16
bt_all_one: W I 1 I I 1 I K -1 N K Z J bt_all_one C S bt_search J bt_output
bt_search: R E 3301 ifge E 4 J bt_solution end M I 3100 A I E W I Z
bt_mask: R H 3301 M I 3100 A I H R A I ifge A 16 O S P end M G Z M L Z
bt_decode: M B 2 C S app_div R I 3301 P I 4 A I L A I 3140 W I C A G C I L 1 ifl L 4 J bt_decode end R H 3301 M I 2900 A I H R E I N G E J bt_next_mask M L Z
bt_check: M I 3120 A I L R E I R I 3301 P I 4 A I L A I 3140 R F I A E F M I 2904 A I L R F I ifg E F J bt_next_mask end M G 3 R H 3301 S G H A E G ifl E F J bt_next_mask end I L 1 ifl L 4 J bt_check end M L Z
bt_add: R I 3301 P I 4 A I L A I 3140 R E I M I 3120 A I L R F I A F E W I F I L 1 ifl L 4 J bt_add end R E 3301 I E 1 W 3301 E C S bt_search R E 3301 I E -1 W 3301 E M L Z
bt_remove: R I 3301 P I 4 A I L A I 3140 R E I M I 3120 A I L R F I S F E W I F I L 1 ifl L 4 J bt_remove end
bt_next_mask: R H 3301 M I 3100 A I H R E I I E 1 W I E J bt_mask
bt_solution: R E 3000 ife E 10 R E 3140 R F 3145 A E F R F 3150 A E F R F 3155 A E F R F 2908 N E F O S P R E 3143 R F 3146 A E F R F 3149 A E F R F 3152 A E F R F 2909 N E F O S P end R E 3300 I E 1 W 3300 E M L Z
bt_accumulate: M I 3140 A I L R E I R G 3300 ife G 1 M I 3160 A I L W I E end ife E Z M I 3180 A I L W I Z else M I 3200 A I L W I 1 end I L 1 ifl L 16 J bt_accumulate end O S P
bt_output: R E 3300 ife E Z ${say('bt_none')}${pad(1)}${say('bt_inconsistent')}M A Z O S P end ${say('bt_count')}${integer(3300)}${pad(1)}${say('bt_legend')}${pad(2)}M L Z
bt_row: M K Z
bt_first: M I L P I 4 A I K A I 3160 R E I M A 46 ifn E Z M A 35 end C S app_put I K 1 ifl K 4 J bt_first end ${say('bt_bar')}M K Z
bt_forced: M I L P I 4 A I K A I 3180 R E I M I L P I 4 A I K A I 3200 R F I M A 63 ife E F M A 46 ifn E Z M A 35 end end C S app_put I K 1 ifl K 4 J bt_forced end I L 1 ifge L 4 M A Z O S P end M A L A A 2 P A 27 C S sd_pad J bt_row
${lit('bt_none','NO RECONSTRUCTION')}${lit('bt_inconsistent','Projection sums conflict')}${lit('bt_count','Solutions ')}${lit('bt_legend','First | fixed (? varies)')}${lit('bt_bar',' | ')}
${common}`;
SCIENTIFIC_DESK.push({number:438,id:'binary-tomogram',site:'lenses',title:'Binary Tomography',kind:'text',inputs:['4 row 4 col [DD]'],outputs:['Native inverse imaging'],description:'Enter four row sums followed by four column sums for a 4 x 4 binary image; optionally append main and anti-diagonal sums. Every sum is 0..4. Native row-mask search counts all reconstructions and reports the first image and cells fixed across every solution. # means 1, . means 0, ? means both values occur. Rows go top to bottom, columns left to right; first-solution order tries row masks 0..15 with the left pixel as bit 0. Empty/full images are valid, inconsistent sums give NO RECONSTRUCTION. This is editable inverse-projection analysis, not a fixed picture puzzle. Example 2 2 2 2 2 2 2 2 has 90 solutions.',algorithm:tomography,examples:[{input:'2 2 2 2 2 2 2 2',output:lines('Solutions 90','First | fixed (? varies)','##.. | ????','##.. | ????','..## | ????','..## | ????')},{input:'4 4 4 4 4 4 4 4',output:lines('Solutions 1','First | fixed (? varies)','#### | ####','#### | ####','#### | ####','#### | ####')},{input:'0 0 0 0 0 0 0 0',output:lines('Solutions 1','First | fixed (? varies)','.... | ....','.... | ....','.... | ....','.... | ....')}]});
