import type { TextSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const ascii=(text:string)=>[...text].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const bad='app_bad: M A -1 O S P';
/** Immutable text -> up to nine signed -99..99 samples at 2900, count at 3000. */
export const SAMPLE_PARSE=`stats_parse: M J 2552 R K 2610 M D Z
stats_space: E K Z J stats_parsed R E J ife E 32 I J 1 I K -1 J stats_space end ifge D 9 J app_bad end M H 1 M G Z M L Z
 ife E 45 M H -1 I J 1 I K -1 else ife E 43 I J 1 I K -1 end end
stats_digit: E K Z J stats_save R E J E E 32 J stats_save ifl E 48 J app_bad end ifg E 57 J app_bad end ifg G 9 J app_bad end P G 10 S E 48 A G E I L 1 I J 1 I K -1 J stats_digit
stats_save: E L Z J app_bad P G H M I 2900 A I D W I G I D 1 J stats_space
stats_parsed: E D Z J app_bad W 3000 D M A Z O S P`;
/** Bubble sort the small native sample array, in place. */
const sort=`stats_sort: R G 3000
sort_pass: ifl G 2 M A Z O S P end M H G I H -1 M J 2900
sort_pair: R E J M F J/1 ifg E F W J F M J/1 E end I J 1 I H -1 N H Z J sort_pair I G -1 J sort_pass`;
/** Output helpers preserve G/H/J/K/L; I is scratch. Integer F, fraction F/D, literal A. */
export const SAMPLE_OUTPUT=`stats_label: M I A
label_next: R A I E A Z O S P C S app_put I I 1 J label_next
stats_int: ifl F Z M A 45 C S app_put P F -1 end M D 1000 M I Z
int_next: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S app_put end E D 1 M A Z E D 1 O S P Q D 10 J int_next
stats_fraction: W 3010 F W 3011 D M A F F A A M B D
fraction_gcd: E B Z J fraction_reduce C S app_div M A B M B C J fraction_gcd
fraction_reduce: M B A R A 3011 C S app_div W 3012 A R A 3010 F A A C S app_div M F A R E 3010 ifl E Z P F -1 end C S stats_int
 R F 3012 ifn F 1 M A 47 C S app_put C S stats_int end M A Z O S P
${POSITIVE_DIVISION}`;
const small=`stats_small: M I 2900 R D 3000
small_next: R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I I 1 I D -1 N D Z J small_next M A Z O S P`;

export const STATISTICS_SOFTWARE: TextSoftware[] = [
  {
    number:84,kind:'text',id:'sample-summary',site:'pendulum',title:'Measurement summary',
    description:'Enter one to nine space-separated signed integers in -99..99. Reports count, sum, minimum, maximum and the exact reduced mean. Plus signs and surrounding spaces are accepted; commas and decimal points are not. No rounding hides a fractional mean.',
    inputs:['Measurements'],outputs:['Summary'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R K 3000 M J 2900 M G Z R H J M L H
summary_next: R E J A G E ifl E H M H E end ifg E L M L E end I J 1 I K -1 N K Z J summary_next
 M A @summary_n C S stats_label R F 3000 C S stats_int M A @summary_sum C S stats_label M F G C S stats_int M A @summary_min C S stats_label M F H C S stats_int M A @summary_max C S stats_label M F L C S stats_int M A @summary_mean C S stats_label M F G R D 3000 J stats_fraction
summary_n: ${ascii('n=')}
summary_sum: ${ascii(' sum=')}
summary_min: ${ascii(' min=')}
summary_max: ${ascii(' max=')}
summary_mean: ${ascii(' mean=')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'1 2 3 4',output:'n=4 sum=10 min=1 max=4 mean=5/2'},{input:'-9 +3 0',output:'n=3 sum=-6 min=-9 max=3 mean=-2'},{input:'99',output:'n=1 sum=99 min=99 max=99 mean=99'},{input:'',error:true},{input:'100',error:true},{input:'1,2',error:true}],
  },
  {
    number:85,kind:'text',id:'quartiles',site:'orchard',title:'Median and quartiles',
    description:'Enter one to nine signed integers in -99..99. Sorts them and reports Q1, median and Q3 as exact fractions. Quartiles are medians of the lower/upper halves, excluding the central observation when count is odd. For a single observation all three equal it.',
    inputs:['Measurements'],outputs:['Quartiles'],
    algorithm:`app_compute: C S stats_parse N A Z O S P C S stats_sort R G 3000 M A G M B 2 C S app_div M H A M L C ife H Z M H 1 end
 M A @quartile_low C S stats_label M J 2900 M K H C S stats_median M A @quartile_mid C S stats_label M J 2900 M K G C S stats_median
 M A @quartile_high C S stats_label M J 2900 ifg G 1 A J H A J L end M K H J stats_median
stats_median: M A K M B 2 C S app_div M I J A I A R F I M D 1 ife C Z M E I/-1 A F E M D 2 end J stats_fraction
quartile_low: ${ascii('Q1=')}
quartile_mid: ${ascii(' median=')}
quartile_high: ${ascii(' Q3=')}
${SAMPLE_PARSE}
${sort}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'5 1 3 2 4',output:'Q1=3/2 median=3 Q3=9/2'},{input:'8 2 6 4',output:'Q1=3 median=5 Q3=7'},{input:'-3',output:'Q1=-3 median=-3 Q3=-3'},{input:'1 2',output:'Q1=1 median=3/2 Q3=2'},{input:'',error:true}],
  },
  {
    number:86,kind:'text',id:'frequency-table',site:'roofbirds',title:'Observation frequency table',
    description:'Enter one to nine signed integer observations in -99..99. Sorts the distinct observed values and prints value:count for each, with no missing categories filled in. Repeated observations contribute to counts; input order does not affect the table.',
    inputs:['Observations'],outputs:['Value:count'],
    algorithm:`app_compute: C S stats_parse N A Z O S P C S stats_sort M J 2900 R K 3000
frequency_next: E K Z M A Z E K Z O S P R G J M H Z
frequency_run: E K Z J frequency_write R E J N E G J frequency_write I H 1 I J 1 I K -1 J frequency_run
frequency_write: R E 2620 ifn E Z M A 32 C S app_put end M F G C S stats_int M A 58 C S app_put M F H C S stats_int J frequency_next
${SAMPLE_PARSE}
${sort}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'3 1 3 2 1 3',output:'1:2 2:1 3:3'},{input:'-1 0 -1 +0',output:'-1:2 0:2'},{input:'99',output:'99:1'},{input:'1 2 3 4 5 6 7 8 9 0',error:true}],
  },
  {
    number:87,kind:'text',id:'exact-variance',site:'mothlight',title:'Exact variance notebook',
    description:'Enter one to nine signed integers in -9..9. Reports exact reduced population variance and sample variance. Sample variance is NA with one observation. The small input range keeps all squared sums in native trytes. These are squared input units, not standard deviations.',
    inputs:['Values (-9..9)'],outputs:['Variances'],
    algorithm:`app_compute: C S stats_parse N A Z O S P C S stats_small N A Z O S P M J 2900 R K 3000 M G Z M H Z
variance_next: R E J A G E P E E A H E I J 1 I K -1 N K Z J variance_next R L 3000 P H L P G G S H G
 M A @variance_pop C S stats_label M F H M D L P D L C S stats_fraction M A @variance_sample C S stats_label ife L 1 M A @variance_na J stats_label end M F H M D L I D -1 P D L J stats_fraction
variance_pop: ${ascii('population=')}
variance_sample: ${ascii(' sample=')}
variance_na: ${ascii('NA')}
${SAMPLE_PARSE}
${small}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'1 2 3',output:'population=2/3 sample=1'},{input:'-9 9',output:'population=81 sample=162'},{input:'5',output:'population=0 sample=NA'},{input:'2 2 2',output:'population=0 sample=0'},{input:'10',error:true}],
  },
  {
    // With at most nine |y|<=9 values, the final slope/intercept numerators
    // are bounded by 1620/7452. Products may wrap; subtracting modulo 19683
    // still recovers each exact signed result within the tryte range.
    number:88,kind:'text',id:'linear-fit',site:'weather',title:'Equally spaced line fit',
    description:'Enter two to nine signed y values in -9..9 at x=0,1,2,... . Computes the least-squares slope and intercept as exact reduced fractions. Equal spacing is assumed; no uncertainty or causal claim is inferred. The range bounds every final native intermediate.',
    inputs:['Values (-9..9)'],outputs:['Slope/intercept'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end C S stats_small N A Z O S P W 3001 Z W 3002 Z W 3003 Z W 3004 Z M J 2900 R K 3000 M G Z
fit_next: R E J R F 3001 A F E W 3001 F P E G R F 3002 A F E W 3002 F R E 3003 A E G W 3003 E M E G P E G R F 3004 A F E W 3004 F I G 1 I J 1 I K -1 N K Z J fit_next
 R H 3000 R E 3004 P H E R E 3003 P E E S H E
 R G 3000 R E 3002 P G E R E 3003 R F 3001 P E F S G E
 R L 3001 R E 3004 P L E R E 3003 R F 3002 P E F S L E
 M A @fit_slope C S stats_label M F G M D H C S stats_fraction M A @fit_intercept C S stats_label M F L M D H J stats_fraction
fit_slope: ${ascii('slope=')}
fit_intercept: ${ascii(' intercept=')}
${SAMPLE_PARSE}
${small}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'1 3 5 7',output:'slope=2 intercept=1'},{input:'3 1 -1',output:'slope=-2 intercept=3'},{input:'0 0 1',output:'slope=1/2 intercept=-1/6'},{input:'9 -9',output:'slope=-18 intercept=9'},{input:'1',error:true},{input:'0 10',error:true}],
  },
  {
    number:89,kind:'text',id:'differences',site:'creek',title:'Successive differences',
    description:'Enter two to nine signed integers in -99..99 in observation order. Reports first differences and then differences of those differences. With two values the second row is NA. Outputs preserve signs and input units; time spacing is not inferred.',
    inputs:['Measurements'],outputs:['Differences'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R K 3000 ifl K 2 J app_bad end I K -1 M J 2900 M A @difference_first C S stats_label
first_next: R E J M F J/1 S F E W J F C S stats_int I J 1 I K -1 ifn K Z M A 32 C S app_put J first_next end
 M A @difference_second C S stats_label R K 3000 ife K 2 M A @difference_na J stats_label end I K -2 M J 2900
second_next: R E J M F J/1 S F E C S stats_int I J 1 I K -1 ifn K Z M A 32 C S app_put J second_next end M A Z O S P
difference_first: ${ascii('d1=')}
difference_second: ${ascii(' d2=')}
difference_na: ${ascii('NA')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'1 4 9 16',output:'d1=3 5 7 d2=2 2'},{input:'99 -99 99',output:'d1=-198 198 d2=396'},{input:'2 2',output:'d1=0 d2=NA'},{input:'7',error:true}],
  },
  {
    number:90,kind:'text',id:'moving-average',site:'clouds',title:'Three-point moving average',
    description:'Enter three to nine signed integers in -99..99 in observation order. Reports each full three-observation window mean as an exact fraction. These centered averages omit the first/last endpoints; there is no padding or extrapolation.',
    inputs:['Measurements'],outputs:['Window means'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R K 3000 ifl K 3 J app_bad end I K -2 M J 2900
average_next: R F J M E J/1 A F E M E J/2 A F E M D 3 C S stats_fraction I J 1 I K -1 ifn K Z M A 32 C S app_put J average_next end M A Z O S P
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'1 2 3 4 5',output:'2 3 4'},{input:'0 0 1 0',output:'1/3 1/3'},{input:'-99 -99 -99',output:'-99'},{input:'1 2',error:true}],
  },
  {
    number:91,kind:'text',id:'rank-trend',site:'lichen',title:'Ordered rank trend',
    description:'Enter two to nine signed values in -99..99 in observation order. Counts rising minus falling pairs, tied pairs, and Kendall tau-a as an exact fraction over all pairs. Ties remain in the denominator. This describes ordering only, not statistical significance.',
    inputs:['Measurements'],outputs:['Score/ties/tau-a'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R L 3000 ifl L 2 J app_bad end M G Z M H Z M J Z
trend_outer: M K J I K 1 ifge K L J trend_done end M I 2900 A I J R D I
trend_inner: M I 2900 A I K R E I ifg E D I G 1 else ifl E D I G -1 else I H 1 end end I K 1 ifl K L J trend_inner end I J 1 J trend_outer
trend_done: M A @trend_score C S stats_label M F G C S stats_int M A @trend_ties C S stats_label M F H C S stats_int M A @trend_tau C S stats_label M D L I D -1 P D L Q D 2 M F G J stats_fraction
trend_score: ${ascii('score=')}
trend_ties: ${ascii(' ties=')}
trend_tau: ${ascii(' tau-a=')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'1 2 3',output:'score=3 ties=0 tau-a=1'},{input:'3 2 1',output:'score=-3 ties=0 tau-a=-1'},{input:'1 1 2',output:'score=2 ties=1 tau-a=2/3'},{input:'0 0',output:'score=0 ties=1 tau-a=0'},{input:'1',error:true}],
  },
];
