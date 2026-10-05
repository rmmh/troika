import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
const common=`${SAMPLE_PARSE.replace('ifge D 9','ifge D 24')}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P
sd_pad: M B A
sd_padding: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J sd_padding
sd_samples: C S stats_parse N A Z O S P M L Z
sd_sample: M I 2900 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I L 1 R E 3000 ifl L E J sd_sample end M A Z O S P
`;
const coefficients=[[2,0,0,0],[0,1,0,-1],[0,0,-2,0],[0,-1,0,-1],[-2,0,0,0],[0,-1,0,1],[0,0,2,0],[0,1,0,1]];
const fourier=`app_compute: C S sd_samples N A Z O S P R E 3000 ifn E 8 J app_bad end M A @ft_heading C S stats_label M A 27 C S sd_pad W 3400 Z
ft_bin: M I 3100 M K 4 K I K W 3401 Z
ft_sample: R A 3400 R E 3401 P A E M B 8 C S app_div P C 4 A C @ft_coeff W 3402 C R I 3401 A I 2900 R G I M L Z
ft_component: R I 3402 A I L R E I P E G M I 3100 A I L R F I A F E W I F I L 1 ifl L 4 J ft_component end R E 3401 I E 1 W 3401 E ifl E 8 J ft_sample end R F 3400 C S stats_int M A 58 C S app_put M A 32 C S app_put M L Z
ft_print: M I 3100 A I L R F I C S stats_int I L 1 ifge L 4 J ft_next end M A 44 ife L 2 M A 32 end C S app_put J ft_print
ft_next: R E 3400 I E 1 W 3400 E M A E I A 1 P A 27 C S sd_pad R E 3400 ifl E 5 J ft_bin end M A Z O S P
ft_heading: ${ascii('2X: Re(a,b) Im(c,d)')}
ft_coeff: ${coefficients.flat().join(' ')}
${common}`;
export const SIGNAL_DYNAMICS:TextSoftware[]=[{number:371,kind:'text',id:'fourier-eight',site:'signals',title:'Exact Fourier Eight',inputs:['Eight samples'],outputs:['Pairs mean a+b*sqrt(2)'],description:'Enter eight equally spaced real samples -9..9. Compute X[k]=sum x[n]*exp(-2*pi*i*k*n/8) exactly, without normalization. Row k gives two pairs: a,b for real 2X and c,d for imaginary 2X. Each pair means a+b*sqrt(2); divide by two to recover X. Bins 0..4 are shown; bins 5..7 are conjugates of bins 3..1. Example 1 0 0 0 0 0 0 0 gives 2,0 0,0 in every row. Input 0 1 0 -1 0 1 0 -1 isolates the negative imaginary bin 2. This is a Fourier transform, not Walsh or a power spectrum.',algorithm:fourier,examples:[{"input":"1 0 0 0 0 0 0 0","output":"2X: Re(a,b) Im(c,d)        0: 2,0 0,0                 1: 2,0 0,0                 2: 2,0 0,0                 3: 2,0 0,0                 4: 2,0 0,0                 "},{"input":"0 1 0 -1 0 1 0 -1","output":"2X: Re(a,b) Im(c,d)        0: 0,0 0,0                 1: 0,0 0,0                 2: 0,0 -8,0                3: 0,0 0,0                 4: 0,0 0,0                 "}]}];
// NIST EDA definition: common whole-record mean and zero-lag normalization.
// https://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm
// n<=8, |x|<=3 => sum(n*x-sum(x))^2 <= n^3*9 <=4608.
const correlation=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end ifg E 8 J app_bad end M L Z M G Z
ac_validate: M I 2900 A I L R E I ifl E -3 J app_bad end ifg E 3 J app_bad end A G E I L 1 R E 3000 ifl L E J ac_validate end W 3400 G M L Z M H Z
ac_center: M I 2900 A I L R E I R F 3000 P E F R F 3400 S E F M I 3100 A I L W I E P E E A H E I L 1 R E 3000 ifl L E J ac_center end W 3401 H M A @ac_mean C S stats_label R F 3400 R D 3000 C S stats_fraction M A 27 C S sd_pad R E 3401 ife E Z M A @ac_undefined J stats_label end W 3402 Z
ac_lag: M G Z M L Z
ac_product: R J 3402 A J L R E 3000 ifge J E J ac_value end M I 3100 A I L R E I M I 3100 A I J R F I P E F A G E I L 1 J ac_product
ac_value: R F 3402 C S stats_int M A 58 C S app_put M F G R D 3401 C S stats_fraction R E 3402 I E 1 W 3402 E M A E M B 2 C S app_div ife C Z I A 1 P A 27 else P A 27 A A 40 end C S sd_pad R E 3402 R F 3000 ifl E F J ac_lag end M A 135 C S sd_pad M A @ac_legend J stats_label
ac_mean: ${ascii('Record mean=')}
ac_undefined: ${ascii('UNDEFINED: constant series')}
ac_legend: ${ascii('lag:rho; same denominator')}
${common}`;
SIGNAL_DYNAMICS.push({number:372,kind:'text',id:'autocorrelation',site:'cassettes',title:'Autocorrelation Bench',inputs:['Samples -3..3'],outputs:['Centered lag correlations'],description:'Enter 2..8 equally spaced samples -3..3. At each lag k, sum (x[i]-mean)*(x[i+k]-mean) over overlapping pairs, then divide by the full-record sum of squared deviations. The mean and every result are exact fractions. Lag 0 is 1; this common-denominator definition does not separately renormalize short overlaps. Constant records are UNDEFINED. Example 1 -1 1 -1 gives rho 1=-3/4, revealing alternation. These small-record correlations are descriptive, not significance tests.',algorithm:correlation,examples:[{"input":"1 -1 1 -1","output":"Record mean=0              0:1          1:-3/4        2:1/2        3:-1/4                                                              lag:rho; same denominator"},{"input":"3 3","output":"Record mean=3              UNDEFINED: constant series"}]});
const markov=`app_compute: R E 2610 ifn E 13 J app_bad end R E 2552 S E 48 ifl E Z J app_bad end ifg E 2 J app_bad end W 3401 E R E 2553 ifn E 32 J app_bad end R E 2554 S E 48 ifl E Z J app_bad end ifg E 3 J app_bad end W 3402 E R E 2555 ifn E 124 J app_bad end M L Z
mk_validate_row: M H Z M J Z
mk_validate_cell: M I L P I 3 A I J A I 2556 R E I S E 48 ifl E Z J app_bad end ifg E 3 J app_bad end A H E M I L P I 3 A I J A I 3100 W I E I J 1 ifl J 3 J mk_validate_cell end ifn H 3 J app_bad end I L 1 ifl L 3 J mk_validate_row end M I 3200 M K 3 K I K R I 3401 A I 3200 W I 1 W 3400 1 W 3403 Z
mk_row: M A 116 C S app_put R F 3403 C S stats_int M A 58 C S app_put M L Z
mk_row_value: M A 32 C S app_put M I 3200 A I L R F I R D 3400 C S stats_fraction I L 1 ifl L 3 J mk_row_value end R E 3403 M A E I A 1 P A 27 C S sd_pad R E 3403 R F 3402 ifge E F J mk_stationary end M L Z
mk_destination: M G Z M J Z
mk_source: M I J P I 3 A I L A I 3100 R E I M I 3200 A I J R F I P E F A G E I J 1 ifl J 3 J mk_source end M I 3210 A I L W I G I L 1 ifl L 3 J mk_destination end M I 3200 M J 3210 M K 3
mk_publish: R E J W I E I I 1 I J 1 I K -1 N K Z J mk_publish R E 3400 P E 3 W 3400 E R E 3403 I E 1 W 3403 E J mk_row
mk_stationary: W 3404 Z M L Z
mk_minor: M A L I A 1 M B 3 C S app_div M G C M A L I A 2 C S app_div M H C M I G P I 4 A I 3100 R E I M J 3 S J E M I H P I 4 A I 3100 R E I M K 3 S K E P J K M I G P I 3 A I H A I 3100 R E I M I H P I 3 A I G A I 3100 R F I P E F S J E M I 3220 A I L W I J R E 3404 A E J W 3404 E I L 1 ifl L 3 J mk_minor end R E 3404 ife E Z M A @mk_multiple C S stats_label M A Z O S P end M A @mk_stat C S stats_label R E 3403 M A E A A 2 P A 27 C S sd_pad M L Z
mk_stationary_value: ifn L Z M A 32 C S app_put end M I 3220 A I L R F I R D 3404 C S stats_fraction I L 1 ifl L 3 J mk_stationary_value end M A Z O S P
mk_stat: ${ascii('Stationary (states 0,1,2):')}
mk_multiple: ${ascii('MULTIPLE stationary laws')}
${common}`;
SIGNAL_DYNAMICS.push({number:373,kind:'text',id:'markov-three',site:'relay',title:'Three-State Markov',inputs:['start steps|9wts'],outputs:['Exact state probabilities'],description:'Enter one-digit start state 0..2, a space, steps 0..3, |, and nine row-major weights 0..3. Each three-weight row must sum 3; divide weights by 3 for transition probabilities. Example 0 3|210120012. Prints t0 through the chosen step in state order 0,1,2, then the unique stationary law or MULTIPLE stationary laws. Exact principal cofactors handle reducible and absorbing chains too. A unique stationary law need not be a time limit for a periodic chain. This is a three-state model, not fitted probabilities.',algorithm:markov,examples:[{"input":"0 3|210120012","output":"t0: 1 0 0                  t1: 2/3 1/3 0              t2: 5/9 4/9 0              t3: 14/27 13/27 0          Stationary (states 0,1,2): 1/2 1/2 0"},{"input":"2 2|300030003","output":"t0: 0 0 1                  t1: 0 0 1                  t2: 0 0 1                  MULTIPLE stationary laws"}]});
// Divide before multiplying: x*(81-x)<=1640. For r<=12, splitting by243
// bounds the remainder product by2904 and keeps the exact floor unchanged.
const logistic=`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 2 J app_bad end R E 2900 ifl E Z J app_bad end ifg E 12 J app_bad end R E 2901 ifl E Z J app_bad end ifg E 81 J app_bad end W 3400 E M I 3100 M K 82
lg_clear: W I -1 I I 1 I K -1 N K Z J lg_clear W 3401 Z
lg_visit: R I 3400 A I 3100 R E I ifge E Z W 3402 E R F 3401 S F E W 3403 F J lg_result end R E 3401 W I E M I 3200 A I E R F 3400 W I F I E 1 W 3401 E M A F M G 81 S G F P A G M B 243 C S app_div R G 2900 P A G W 3404 A M A C P A G C S app_div R E 3404 A A E W 3400 A J lg_visit
lg_result: M A @lg_parameter C S stats_label R F 2900 M D 3 C S stats_fraction M A @lg_scale C S stats_label M A 27 C S sd_pad M A @lg_transient C S stats_label R F 3402 C S stats_int M A @lg_period C S stats_label R F 3403 C S stats_int M A 54 C S sd_pad M A @lg_cycle C S stats_label M A 81 C S sd_pad M L Z
lg_cycle_value: ifn L Z M A 32 C S app_put end R I 3402 A I L A I 3200 R F I C S stats_int I L 1 R E 3403 ifge L E J lg_footer end ifl L 12 J lg_cycle_value end
lg_footer: M A 135 C S sd_pad R E 3403 M A @lg_all ifg E 12 M A @lg_first end J stats_label
lg_parameter: ${ascii('r=')}
lg_scale: ${ascii('; state value=x/81')}
lg_transient: ${ascii('transient=')}
lg_period: ${ascii(' period=')}
lg_cycle: ${ascii('Cycle numerators:')}
lg_all: ${ascii('Complete cycle shown')}
lg_first: ${ascii('First 12 cycle states shown')}
${common}`;
SIGNAL_DYNAMICS.push({number:374,kind:'text',id:'logistic-cycle',site:'pendulum',title:'Quantized Logistic Map',inputs:['r x'],outputs:['Transient and cycle lengths'],description:'Enter r=0..12 and x=0..81; the real-valued parameter is r/3 and state x/81. Each tick is exactly x=floor(r*x*(81-x)/243), always in 0..81. Native first-visit indexing finds the transient length and eventual cycle within 82 visits. Example 12 40 eventually enters a finite cycle. Prints at most twelve cycle numerators and says if truncated. Integer quantization is part of this model: these cycles are not a claim about the corresponding continuous-state logistic map. No floating point or wrapped products.',algorithm:logistic,examples:[{"input":"12 40","output":"r=4; state value=x/81      transient=1 period=4       Cycle numerators:          80 3 11 38                                            Complete cycle shown"}]});
// Weighted isotonic regression, pool adjacent violators (including equal means).
// https://www.stat.umn.edu/geyer/8054/notes/isotonic.html
// At most8 weights<=3, |value|<=9: weighted sum<=216; comparison product<=5184.
const isotonic=`app_compute: C S stats_parse N A Z O S P R A 3000 M B 2 C S app_div ifn C Z J app_bad end ifl A 1 J app_bad end ifg A 8 J app_bad end W 3401 A W 3400 Z W 3402 Z
is_input: R L 3402 M I L P I 2 A I 2900 R G I M H I/1 ifl G -9 J app_bad end ifg G 9 J app_bad end ifl H 1 J app_bad end ifg H 3 J app_bad end P G H R I 3400 P I 4 A I 3100 W I G M I/1 H M I/2 L M I/3 L R E 3400 I E 1 W 3400 E
is_merge: R E 3400 ifl E 2 J is_next end I E -2 P E 4 A E 3100 M I E M J E I J 4 R G I M H I/1 R K J M L J/1 M E G P E L M F K P F H ifl E F J is_next end A G K A H L W I G M I/1 H M E J/3 M I/3 E R E 3400 I E -1 W 3400 E J is_merge
is_next: R E 3402 I E 1 W 3402 E R F 3401 ifl E F J is_input end W 3402 Z
is_expand: R I 3402 P I 4 A I 3100 R G I M H I/1 M J I/2 M K I/3
is_observation: M I 3300 A I J W I G M I 3320 A I J W I H I J 1 ifle J K J is_observation end R E 3402 I E 1 W 3402 E R F 3400 ifl E F J is_expand end M A @is_blocks C S stats_label R F 3400 C S stats_int M A 27 C S sd_pad M L Z
is_print: M F L I F 1 C S stats_int M A 58 C S app_put M I 3300 A I L R F I M I 3320 A I L R D I C S stats_fraction I L 1 M A L M B 2 C S app_div ife C Z I A 1 P A 27 else P A 27 A A 40 end C S sd_pad R E 3401 ifl L E J is_print end M A 135 C S sd_pad M A @is_legend J stats_label
is_blocks: ${ascii('Pooled blocks=')}
is_legend: ${ascii('index:fitted value')}
${common}`;
SIGNAL_DYNAMICS.push({number:375,kind:'text',id:'isotonic-fit',site:'lenses',title:'Isotonic Calibration',inputs:['value weight ...'],outputs:['Weighted nondecreasing fit'],description:'Enter 1..8 value/weight pairs in measurement order. Values -9..9, weights 1..3. Native pool-adjacent-violators finds the nondecreasing fitted values minimizing weighted squared error; all reported means are exact fractions. Adjacent equal-mean blocks are merged too. Example 3 1 1 1 4 1 gives fitted 2,2,4: the reversed first pair is pooled, not sorted. Input order is preserved; indices start 1. Useful for calibrating a response expected to increase, without imposing a straight line.',algorithm:isotonic,examples:[{"input":"3 1 1 1 4 1","output":"Pooled blocks=2            1:2          2:2           3:4                                                                              index:fitted value"}]});
// Exact L1 segmentation: every interval's lower median minimizes its absolute error.
// Values±9 and <=12 samples bound all costs by216; DP uses999 as infinity.
const segmentation=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end ifg E 13 J app_bad end I E -1 W 3400 E R F 2900 ifl F 1 J app_bad end ifg F 3 J app_bad end ifg F E J app_bad end W 3401 F M L Z
sg_validate: M I 2901 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I L 1 R E 3400 ifl L E J sg_validate end W 3402 Z
sg_start: R E 3402 W 3403 E
sg_end: R G 3402 R H 3403 M J Z
sg_copy: M I 2901 A I G R E I M I 3600 A I J W I E I G 1 I J 1 ifle G H J sg_copy end W 3404 J
sg_sort_pass: ifl J 2 J sg_median end M K J I K -1 M I 3600
sg_sort_pair: R E I M F I/1 ifg E F W I F M I/1 E end I I 1 I K -1 N K Z J sg_sort_pair I J -1 J sg_sort_pass
sg_median: R A 3404 I A -1 M B 2 C S app_div M I 3600 A I A R G I W 3405 G M H Z M L Z
sg_cost: M I 3600 A I L R E I S E G F E A A H E I L 1 R E 3404 ifl L E J sg_cost end R I 3402 P I 12 R E 3403 A I E A I 3100 W I H A I 144 W I G R E 3403 I E 1 W 3403 E R F 3400 ifl E F J sg_end end R E 3402 I E 1 W 3402 E ifl E F J sg_start end M I 3700 M K 104
sg_dp_clear: W I 999 I I 1 I K -1 N K Z J sg_dp_clear W 3700 Z W 3490 1
sg_segments: R E 3490 W 3491 E
sg_prefix: R E 3491 R F 3400 ifg E F J sg_next_layer end M G 999 W 3493 G R E 3490 I E -1 W 3492 E
sg_split: R J 3492 R K 3491 ifge J K J sg_store end R I 3490 I I -1 P I 13 A I J A I 3700 R G I M I J P I 12 A I K I I -1 A I 3100 R E I A G E R E 3493 ifl G E W 3493 G W 3494 J end R E 3492 I E 1 W 3492 E J sg_split
sg_store: R I 3490 P I 13 R E 3491 A I E A I 3700 R E 3493 W I E A I 52 R E 3494 W I E R E 3491 I E 1 W 3491 E J sg_prefix
sg_next_layer: R E 3490 I E 1 W 3490 E R F 3401 ifle E F J sg_segments end R E 3400 W 3491 E R E 3401 W 3490 E
sg_reconstruct: R E 3490 ife E Z J sg_output end M I E P I 13 R F 3491 A I F A I 3752 R G I M I E I I -1 P I 3 A I 3550 W I G I F -1 M I/1 F M J G P J 12 A J F A J 3244 R H J M I/2 H W 3491 G I E -1 W 3490 E J sg_reconstruct
sg_output: M A @sg_cost_label C S stats_label R I 3401 P I 13 R E 3400 A I E A I 3700 R F I C S stats_int M A 27 C S sd_pad W 3490 Z
sg_print: R I 3490 P I 3 A I 3550 R F I I F 1 C S stats_int M A 45 C S app_put R I 3490 P I 3 A I 3551 R F I I F 1 C S stats_int M A @sg_value_label C S stats_label R I 3490 P I 3 A I 3552 R F I C S stats_int R E 3490 I E 1 W 3490 E M A E I A 1 P A 27 C S sd_pad R E 3490 R F 3401 ifl E F J sg_print end M A @sg_tie J stats_label
sg_cost_label: ${ascii('Minimum absolute error=')}
sg_value_label: ${ascii(' value=')}
sg_tie: ${ascii('1-based; lower medians')}
${common}`;
SIGNAL_DYNAMICS.push({number:376,kind:'text',id:'signal-segments',site:'weather',title:'Signal Segmenter',inputs:['k then samples'],outputs:['Optimal contiguous segments'],description:'Enter k=1..3 then 1..12 samples -9..9, with k no larger than sample count. Split into exactly k nonempty contiguous segments and fit each by its lower median, minimizing total absolute error. Example 2 0 0 8 8 finds 1-2 at 0 and 3-4 at 8 with zero error. Native interval costs and dynamic programming find the global optimum. Equal costs choose the smallest last split recursively. Reports one-based inclusive boundaries and representative values; useful for robust step-change summaries, not a significance test.',algorithm:segmentation,examples:[{"input":"2 0 0 8 8","output":"Minimum absolute error=0   1-2 value=0                3-4 value=8                1-based; lower medians"}]});
