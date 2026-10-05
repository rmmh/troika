import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const shared=`pw_pad: M B A
pw_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J pw_pad_next
pw_hist: M A @pw_total C S stats_label R F 3304 C S stats_int M A 27 C S pw_pad R J 3300 W 3305 54
pw_row: M F J C S stats_int M A 58 C S app_put R A 2620 I A 1 C S pw_pad M K Z
pw_cell: R G 2620 R E 3303 A G E M I 3100 A I J R F I C S stats_int M A G C S pw_pad I J 1 I K 1 R E 3301 ifg J E J pw_row_end end R E 3302 ifl K E J pw_cell end
pw_row_end: R A 3305 C S pw_pad R E 3305 A E 27 W 3305 E R E 3301 ifle J E J pw_row end M A Z O S P
pw_copy: M J Z
pw_copy_next: M I 3160 A I J R E I M I 3100 A I J W I E I J 1 ifl J 30 J pw_copy_next end M A Z O S P
pw_clear: M E 3160 M F 30 K E F M A Z O S P
app_bad: M A -1 O S P
pw_total: ${ascii('total=')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}`;
const parse=(n:number)=>`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E ${n} J app_bad end `;
const bounds=(address:number,lo:number,hi:number)=>`R E ${address} ifl E ${lo} J app_bad end ifg E ${hi} J app_bad end `;
const init=`M E 3100 M F 120 K E F `;
const table=(start:string,end:string,group=5,width=4)=>`W 3300 ${start} W 3301 ${end} W 3302 ${group} W 3303 ${width} J pw_hist`;
export const PROBABILITY_WORKSHOP:TextSoftware[]=[
{number:277,kind:'text',id:'dice-counts',site:'cardtable',title:'Dice Distribution',description:'Exact sum counts for independent fair dice. Enter n sides, with n=1..4 and sides=2..6. Total is sides to the power n. Each table row starts with its first sum and then up to five consecutive counts, in four-character fields. Divide any count by total for its probability. For 2 6, sums 2..12 have counts 1,2,3,4,5,6,5,4,3,2,1.',inputs:['n sides'],outputs:['Exact sum counts'],algorithm:parse(2)+bounds(2900,1,4)+bounds(2901,2,6)+init+`W 3100 1 M L Z W 3304 1
pd_round: C S pw_clear M G Z
pd_sum: M I 3100 A I G R H I M K 1
pd_face: M I 3160 A I G A I K R E I A E H W I E I K 1 R E 2901 ifle K E J pd_face end I G 1 ifle G 18 J pd_sum end C S pw_copy R E 3304 R F 2901 P E F W 3304 E I L 1 R E 2900 ifl L E J pd_round end R G 2900 R H 2901 P H G `+table('G','H')+`
${shared}`,examples:[{"input":"2 6","output":"total=36                   2: 1   2   3   4   5       7: 6   5   4   3   2       12: 1                      "},{"input":"4 6","output":"total=1296                 4: 1   4   10  20  35      9: 56  80  104 125 140     14: 146 140 125 104 80     19: 56  35  20  10  4      24: 1                      "},{"input":"5 6","error":true}]},
{number:278,kind:'text',id:'urn-draw',site:'market',title:'Urn Draw',description:'Exact success counts when drawing without replacement. Enter N K d: population N=1..12, successful objects K=0..N and draws d=0..N. All subsets of d objects are equally likely. Total is choose(N,d). A row labels its first success count, followed by up to five consecutive counts in four-character fields; impossible counts are zero. Divide by total for probabilities.',inputs:['N K d'],outputs:['Without replacement'],algorithm:parse(3)+bounds(2900,1,12)+bounds(2901,0,12)+bounds(2902,0,12)+`R E 2900 R F 2901 ifg F E J app_bad end R F 2902 ifg F E J app_bad end `+init+`R A 2900 R B 2902 C S pu_choose W 3304 A M J Z
pu_outcome: R A 2901 M B J C S pu_choose M G A R A 2900 R E 2901 S A E R B 2902 S B J C S pu_choose P A G M I 3100 A I J W I A I J 1 R E 2902 ifle J E J pu_outcome end R H 2902 `+table('Z','H')+`
pu_choose: ifl B Z M A Z O S P end ifg B A M A Z O S P end W 3320 A W 3321 B W 3322 1 W 3323 1
pu_factor: R E 3323 R F 3321 ifg E F R A 3322 O S P end R A 3320 S A E I A 1 R F 3322 P A F M B E C S app_div W 3322 A R E 3323 I E 1 W 3323 E J pu_factor
${shared}`,examples:[{"input":"6 2 3","output":"total=20                   0: 4   12  4   0           "},{"input":"12 6 6","output":"total=924                  0: 1   36  225 400 225     5: 36  1                   "},{"input":"3 4 1","error":true}]},
{number:279,kind:'text',id:'run-probability',site:'relay',title:'Run Probability',description:'Count fair binary strings containing at least one run of k copies of a specified bit. Enter n k bit, with length n=1..13, k=1..n and bit=0 or 1. Overlapping runs count only once per string. Reports matching strings, all 2^n strings, and a reduced exact probability. The two bit choices have equal counts by symmetry; this is a run of the chosen bit, not a run of either bit.',inputs:['n k bit'],outputs:['Run counts / probability'],algorithm:parse(3)+bounds(2900,1,13)+bounds(2901,1,13)+bounds(2902,0,1)+`R E 2900 R F 2901 ifg F E J app_bad end `+init+`W 3100 1 W 3304 1 M L Z
pr_round: C S pw_clear M J Z R K 2901
pr_state: M I 3100 A I J R E I R F 3160 A F E W 3160 F M G J I G 1 ifl G K M I 3160 A I G W I E end I J 1 ifl J K J pr_state end C S pw_copy R E 3304 P E 2 W 3304 E I L 1 R E 2900 ifl L E J pr_round end M J Z M H Z R K 2901
pr_sum: M I 3100 A I J R E I A H E I J 1 ifl J K J pr_sum end R G 3304 S G H W 3306 G M A @pr_matching C S stats_label M F G C S stats_int M A 27 C S pw_pad M A @pw_total C S stats_label R F 3304 C S stats_int M A 54 C S pw_pad M A @pr_probability C S stats_label R F 3306 R D 3304 J stats_fraction
pr_matching: ${ascii('matching=')}
pr_probability: ${ascii('probability=')}
${shared}`,examples:[{"input":"5 3 1","output":"matching=8                 total=32                   probability=1/4"},{"input":"13 1 0","output":"matching=8191              total=8192                 probability=8191/8192"},{"input":"2 3 0","error":true}]},
{number:280,kind:'text',id:'gambler-walk',site:'footpath',title:'Gambler Walk',description:'Exact symmetric random walks with absorbing endpoints. Enter boundary start steps: boundary=2..8, start=0..boundary and steps=0..12. Interior states move one step left or right. Once at 0 or boundary a path stays there. Total counts all 2^steps direction strings, including choices after absorption. Rows label their first position then up to four consecutive counts in five-character fields. Endpoint counts are absorbed totals; interior counts are surviving paths.',inputs:['bound start step'],outputs:['Position / path counts'],algorithm:parse(3)+bounds(2900,2,8)+bounds(2901,0,8)+bounds(2902,0,12)+`R E 2900 R F 2901 ifg F E J app_bad end `+init+`M I 3100 R E 2901 A I E W I 1 W 3304 1 M L Z
pg_round: R E 2902 ifge L E J pg_done end C S pw_clear M J Z R K 2900
pg_state: M I 3100 A I J R E I ife J Z P E 2 W 3160 E else ife J K P E 2 M I 3160 A I J R F I A F E W I F else M I 3159 A I J R F I A F E W I F M I 3161 A I J R F I A F E W I F end end I J 1 ifle J K J pg_state end C S pw_copy R E 3304 P E 2 W 3304 E I L 1 J pg_round
pg_done: R H 2900 `+table('Z','H',4,5)+`
${shared}`,examples:[{"input":"4 2 4","output":"total=16                   0: 6    0    4    0        4: 6                       "},{"input":"8 4 12","output":"total=4096                 0: 1092 0    560  0        4: 792  0    560  0        8: 1092                    "},{"input":"3 4 1","error":true}]},
{number:281,kind:'text',id:'coupon-collector',site:'postbox',title:'Coupon Collector',description:'Exact expected draws to collect every kind of coupon, when each draw independently chooses one of n equally likely kinds and duplicates are kept. Enter n=1..8. Adds the waiting times n/n, n/(n-1), ..., n/1 and reduces the result exactly. The expectation is a mean, not a deadline or guarantee. Eight kinds need 761/35 draws on average. The bound keeps rational arithmetic within native integers.',inputs:['Kinds (1..8)'],outputs:['Expected collection time'],algorithm:parse(1)+bounds(2900,1,8)+`W 3300 Z W 3301 1 M J 1 R K 2900
pc_term: R G 3300 P G J R E 3301 P E K A G E R H 3301 P H J M A G M B H
pc_gcd: E B Z J pc_reduce C S app_div M A B M B C J pc_gcd
pc_reduce: M L A M A G M B L C S app_div W 3300 A M A H M B L C S app_div W 3301 A I J 1 ifle J K J pc_term end M A @pc_kinds C S stats_label M F K C S stats_int M A 27 C S pw_pad M A @pc_expected C S stats_label R F 3300 R D 3301 J stats_fraction
pc_kinds: ${ascii('kinds=')}
pc_expected: ${ascii('expected draws=')}
${shared}`,examples:[{"input":"8","output":"kinds=8                    expected draws=761/35"},{"input":"1","output":"kinds=1                    expected draws=1"},{"input":"9","error":true}]},
{number:282,kind:'text',id:'cycle-counts',site:'hexclub',title:'Permutation Cycles',description:'Exact distribution of the number of disjoint cycles in a uniformly chosen permutation of n labelled objects, n=1..7. Fixed points count as cycles. Total is n factorial. A row labels its first cycle count, followed by up to four consecutive counts in five-character fields. For n=3, there are two one-cycle, three two-cycle and one three-cycle permutations. Uses the unsigned Stirling recurrence, rather than enumerating permutations.',inputs:['Objects (1..7)'],outputs:['Cycle counts'],algorithm:parse(1)+bounds(2900,1,7)+init+`W 3100 1 W 3304 1 M L 1
ps_round: M J L M K L I K -1
ps_state: M I 3100 A I J R E I P E K M F I/-1 A E F W I E I J -1 N J Z J ps_state W 3100 Z R E 3304 P E L W 3304 E I L 1 R E 2900 ifle L E J ps_round end R H 2900 `+table('1','H',4,5)+`
${shared}`,examples:[{"input":"3","output":"total=6                    1: 2    3    1             "},{"input":"7","output":"total=5040                 1: 720  1764 1624 735      5: 175  21   1             "},{"input":"8","error":true}]},
];
