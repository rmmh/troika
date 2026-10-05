import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const parse=(n:number)=>`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E ${n} J app_bad end `;
const bound=(p:number,lo:number,hi:number)=>`R E ${p} ifl E ${lo} J app_bad end ifg E ${hi} J app_bad end `;
const common=`sc_pad: M B A
sc_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J sc_pad_next
sc_gcd: E B Z O S P C S app_div M A B M B C J sc_gcd
; Truncate signed A divided by positive B toward zero, preserving G/H/J/K/L.
sc_trunc: ifl A Z F A A C S app_div P A -1 else C S app_div end O S P
app_bad: M A -1 O S P
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}`;
const determinant=(omit:number)=>{const cols=[0,1,2,3].filter(c=>c!==omit),perms=[[0,1,2,1],[1,2,0,1],[2,0,1,1],[2,1,0,-1],[1,0,2,-1],[0,2,1,-1]];return 'M G Z '+perms.map(([a,b,c,sign])=>`R E ${3100+cols[a!]!*3} R F ${3101+cols[b!]!*3} P E F R F ${3102+cols[c!]!*3} P E F ${sign===1?'A':'S'} G E `).join('')+(omit%2?'P G -1 ':'')+`W ${3200+omit} G\n`;};
export const SCIENTIFIC_WORKSHOP:TextSoftware[]=[
{number:307,kind:'text',id:'resistor-stack',site:'radios',title:'Resistor Stack',inputs:['RPN: 1..9 S P'],outputs:['Equivalent resistance'],description:'Combine positive resistors in series and parallel using postfix notation. Digits 1..9 push that many ohms; S replaces the last two resistors by their series sum, P by their parallel equivalent. No spaces, at most eight pending values, and exactly one final value. Example 236PS means 2+(3 parallel 6), giving 4 ohms. Results are reduced exact fractions. Native arithmetic rejects any intermediate numerator or denominator above 9841 rather than wrapping. Uses ideal positive resistances.',algorithm:`app_compute: M J 2552 R K 2610 M L Z
rs_token: E K Z J rs_finish R E J I J 1 I K -1 ifge E 49 ifle E 57 ifge L 8 J app_bad end S E 48 M I 3100 A I L W I E M I 3120 A I L W I 1 I L 1 J rs_token end end ifl L 2 J app_bad end ifn E 83 ifn E 80 J app_bad end end W 3300 E I L -2 M I 3100 A I L R E I W 3301 E M E I/1 W 3302 E M I 3120 A I L R E I W 3303 E M E I/1 W 3304 E R A 3301 R B 3304 C S rs_mul N A Z O S P W 3305 C R A 3302 R B 3303 C S rs_mul N A Z O S P R E 3305 M F 9841 S F E ifg C F J app_bad end A E C W 3305 E R E 3300 ife E 83 R A 3303 R B 3304 else R A 3301 R B 3302 end C S rs_mul N A Z O S P R E 3300 ife E 83 R G 3305 M H C else M G C R H 3305 end M A G M B H C S sc_gcd M B A M A G C S app_div M I 3100 A I L W I A M A H C S app_div M I 3120 A I L W I A I L 1 J rs_token
rs_finish: ifn L 1 J app_bad end M A @rs_label C S stats_label R F 3100 R D 3120 C S stats_fraction M A @rs_unit J stats_label
; Checked positive multiplication returns status A and product C.
rs_mul: W 3310 A W 3311 B M A 9841 C S app_div R E 3310 ifg E A J app_bad end R C 3310 R E 3311 P C E M A Z O S P
rs_label: ${ascii('R=')}
rs_unit: ${ascii(' ohms')}
${common}`,examples:[{"input":"236PS","output":"R=4 ohms"},{"input":"23P","output":"R=6/5 ohms"},{"input":"2S","error":true}]},
{number:308,kind:'text',id:'thin-lens',site:'lenses',title:'Thin Lens Bench',inputs:['f u (same units)'],outputs:['Image / magnification'],description:'Ideal thin lens with a real object. Enter focal length f=-99..99 except 0 and positive object distance u=1..99, in the same length unit. Positive f converges; negative f diverges. Reports exact image distance v=f*u/(u-f) and signed magnification M=-f/(u-f). Positive v is a real inverted image; negative v a virtual upright image. u=f gives AT INFINITY. Example 10 15 gives v=30, M=-2. No thickness, aberration or diffraction is modeled.',algorithm:parse(2)+bound(2901,1,99)+`R G 2900 E G Z J app_bad R H 2901 S H G ife H Z M A @ln_infinity J stats_label end R K 2901 P K G M L G P L -1 ifl H Z P H -1 P K -1 P L -1 end M A @ln_v C S stats_label M F K M D H C S stats_fraction M A 27 C S sc_pad M A @ln_m C S stats_label M F L M D H C S stats_fraction M A 54 C S sc_pad M A @ln_real ifl K Z M A @ln_virtual end J stats_label
ln_v: ${ascii('v=')}
ln_m: ${ascii('M=')}
ln_real: ${ascii('REAL inverted')}
ln_virtual: ${ascii('VIRTUAL upright')}
ln_infinity: ${ascii('AT INFINITY (u=f)')}
${common}`,examples:[{"input":"10 15","output":"v=30                       M=-2                       REAL inverted"},{"input":"10 5","output":"v=-10                      M=2                        VIRTUAL upright"},{"input":"10 10","output":"AT INFINITY (u=f)"}]},
{number:309,kind:'text',id:'spring-stepper',site:'pendulum',title:'Spring Stepper',inputs:['x v k d steps'],outputs:['Discrete spring trajectory'],description:'Explore an explicitly quantized spring model. Enter position x and velocity v in -9..9, stiffness k and damping d in 0..9 tenths, and steps 0..4. Each tick sets v=v-trunc(k*x/10)-trunc(d*v/10), then x=x+v. Both force terms use the old state; truncation is toward zero. Reports every state including t0. This discrete integer model can stick near zero and is not an exact continuous oscillator. Example 8 0 5 0 4 crosses the origin.',algorithm:parse(5)+bound(2900,-9,9)+bound(2901,-9,9)+bound(2902,0,9)+bound(2903,0,9)+bound(2904,0,4)+`R G 2900 R H 2901 M J Z
sp_row: M A @sp_t C S stats_label M F J C S stats_int M A @sp_x C S stats_label M F G C S stats_int M A @sp_v C S stats_label M F H C S stats_int R E 2904 ifge J E M A Z O S P end M A J I A 1 P A 27 C S sc_pad M A G R E 2902 P A E M B 10 C S sc_trunc W 3300 A M A H R E 2903 P A E M B 10 C S sc_trunc S H A R E 3300 S H E A G H I J 1 J sp_row
sp_t: ${ascii('t')}
sp_x: ${ascii(' x=')}
sp_v: ${ascii(' v=')}
${common}`,examples:[{"input":"8 0 5 0 4","output":"t0 x=8 v=0                 t1 x=4 v=-4                t2 x=-2 v=-6               t3 x=-7 v=-5               t4 x=-9 v=-2"},{"input":"9 9 0 0 4","output":"t0 x=9 v=9                 t1 x=18 v=9                t2 x=27 v=9                t3 x=36 v=9                t4 x=45 v=9"}]},
{number:310,kind:'text',id:'mixing-tanks',site:'bottles',title:'Mixing Tanks',inputs:['V A B steps'],outputs:['Exact amounts in each tank'],description:'Two well-mixed tanks each hold volume V=1..9. Initial dissolved amounts A,B are 0..9; enter V A B steps with steps 0..3. Each tick simultaneously swaps one volume unit of fluid. New A=((V-1)*A+B)/V and new B=((V-1)*B+A)/V, using both old amounts. Volume stays fixed and total amount is exactly conserved. Lists amounts, not concentrations; divide by V for concentration. Example 3 9 0 2 gives amounts 5 and 4 after two swaps. Fractions remain exact.',algorithm:parse(4)+bound(2900,1,9)+bound(2901,0,9)+bound(2902,0,9)+bound(2903,0,3)+`R G 2901 R H 2902 M K 1 M J Z M A @mx_total C S stats_label M F G A F H C S stats_int M A 27 C S sc_pad
mx_row: M A @mx_t C S stats_label M F J C S stats_int M A @mx_a C S stats_label M F G M D K C S stats_fraction M A @mx_b C S stats_label M F H M D K C S stats_fraction R E 2903 ifge J E M A Z O S P end M A J A A 2 P A 27 C S sc_pad R E 2900 I E -1 M F G P F E A F H P H E A H G M G F R E 2900 P K E I J 1 J mx_row
mx_total: ${ascii('conserved total=')}
mx_t: ${ascii('t')}
mx_a: ${ascii(' A=')}
mx_b: ${ascii(' B=')}
${common}`,examples:[{"input":"3 9 0 2","output":"conserved total=9          t0 A=9 B=0                 t1 A=6 B=3                 t2 A=5 B=4"},{"input":"9 1 2 3","output":"conserved total=3          t0 A=1 B=2                 t1 A=10/9 B=17/9           t2 A=97/81 B=146/81        t3 A=922/729 B=1265/729"}]},
{number:311,kind:'text',id:'reaction-balance',site:'rye',title:'Reaction Balance',inputs:['Four CHO triples'],outputs:['Primitive positive balance'],description:'Balance two reactants into two products using carbon, hydrogen and oxygen atom counts. Enter exactly 12 digits: a CHO triple for each species, reactants first, then products. Each atom count is 0..9. Example 140002102021 represents CH4+O2 -> CO2+H2O and returns 1 2 -> 1 2. Native 3x3 minors find the unique primitive positive integer ratio. UNDERDETERMINED means matrix rank below 3; NO POSITIVE BALANCE means its unique nullspace direction cannot give four positive coefficients. Other elements and charge are outside this model.',algorithm:`app_compute: R E 2610 ifn E 12 J app_bad end M J Z
rx_parse: M I 2552 A I J R E I ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 ifge J 6 P E -1 end M I 3100 A I J W I E I J 1 ifl J 12 J rx_parse end
`+[0,1,2,3].map(determinant).join('')+`M G Z M J Z
rx_nonzero: M I 3200 A I J R E I ifn E Z M G E J rx_sign end I J 1 ifl J 4 J rx_nonzero end M A @rx_rank J stats_label
rx_sign: M H 1 ifl G Z M H -1 end M G Z M J Z
rx_positive: M I 3200 A I J R E I P E H ifle E Z M A @rx_none J stats_label end W I E M A G M B E C S sc_gcd M G A I J 1 ifl J 4 J rx_positive end M J Z
rx_reduce: M I 3200 A I J R A I M B G C S app_div M I 3200 A I J W I A I J 1 ifl J 4 J rx_reduce end M A @rx_left C S stats_label R F 3200 C S stats_int M A 32 C S app_put R F 3201 C S stats_int M A 27 C S sc_pad M A @rx_right C S stats_label R F 3202 C S stats_int M A 32 C S app_put R F 3203 C S stats_int M A 54 C S sc_pad M A @rx_ok J stats_label
rx_left: ${ascii('reactants: ')}
rx_right: ${ascii('products: ')}
rx_ok: ${ascii('C/H/O atoms conserved')}
rx_rank: ${ascii('UNDERDETERMINED')}
rx_none: ${ascii('NO POSITIVE BALANCE')}
${common}`,examples:[{"input":"140002102021","output":"reactants: 1 2             products: 1 2              C/H/O atoms conserved"},{"input":"000000000000","output":"UNDERDETERMINED"},{"input":"100010001111","output":"NO POSITIVE BALANCE"}]},
{number:312,kind:'text',id:'simpson-bench',site:'weather',title:'Simpson Bench',inputs:['h y0 y1 ...'],outputs:['Exact sampled integrals'],description:'Enter positive spacing h=1..9 followed by 3,5 or 7 equally spaced samples y=-9..9. Computes composite Simpson and trapezoid estimates for the area under the sampled curve, plus Simpson minus trapezoid. Fractions are exact; estimates need not equal the unknown true integral. Simpson integrates cubic polynomials exactly under these assumptions. Example 1 0 1 4 estimates x squared on 0..2: Simpson 8/3, trapezoid 3. The difference is a comparison, not a guaranteed error bound.',algorithm:`app_compute: C S stats_parse N A Z O S P R L 3000 ifl L 4 J app_bad end ifg L 8 J app_bad end M A L M B 2 C S app_div ifn C Z J app_bad end `+bound(2900,1,9)+`M G Z M H Z M J 1
si_sample: M I 2900 A I J R K I ifl K -9 J app_bad end ifg K 9 J app_bad end M E L I E -1 ife J 1 A G K A H K else ife J E A G K A H K else M F K P F 2 A H F M A J M B 2 C S app_div ife C Z M F K P F 4 else M F K P F 2 end A G F end end I J 1 ifl J L J si_sample end R E 2900 P G E P H E W 3300 G W 3301 H M A @si_s C S stats_label M F G M D 3 C S stats_fraction M A 27 C S sc_pad M A @si_t C S stats_label M F H M D 2 C S stats_fraction M A 54 C S sc_pad M A @si_d C S stats_label R F 3300 P F 2 R E 3301 P E 3 S F E M D 6 J stats_fraction
si_s: ${ascii('Simpson=')}
si_t: ${ascii('trapezoid=')}
si_d: ${ascii('difference=')}
${common}`,examples:[{"input":"1 0 1 4","output":"Simpson=8/3                trapezoid=3                difference=-1/3"},{"input":"2 -1 0 1","output":"Simpson=0                  trapezoid=0                difference=0"}]},
];
