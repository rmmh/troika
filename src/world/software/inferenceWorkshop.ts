import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const label=(s:string)=>`M A @${s} C S stats_label `;
const pad=(row:number)=>`M A ${row*27} C S iw_pad `;
const integer=(address:number)=>`R F ${address} C S stats_int `;
const fraction=(n:number,d:number)=>`R F ${n} R D ${d} C S stats_fraction `;
const lit=(name:string,s:string)=>`${name}: ${ascii(s)}\n`;
const common=`${SAMPLE_PARSE.replace('ifge D 9','ifge D 24')}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P
iw_pad: M B A
iw_pad_loop: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J iw_pad_loop
`;
// Conditional table-probability two-sided definition, also used by R fisher.test:
// https://stat.ethz.ch/R-manual/R-devel/library/stats/html/fisher.test.html
const fisher=`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 4 J app_bad end M L Z M G Z
fi_validate: M I 2900 A I L R E I ifl E Z J app_bad end ifg E 12 J app_bad end A G E I L 1 ifl L 4 J fi_validate end ifl G 1 J app_bad end ifg G 12 J app_bad end W 3400 G R E 2900 R F 2901 A E F W 3401 E R E 2900 R F 2902 A E F W 3402 E M I 3100 M K 169 K I K W 3100 1 M L 1
fi_pascal_row: M I L P I 13 A I 3100 W I 1 M H 1
fi_pascal_col: M I L P I 13 A I H A I 3100 M E I/-14 M F I/-13 A E F W I E I H 1 ifle H L J fi_pascal_col end I L 1 ifle L 12 J fi_pascal_row end R A 3400 R B 3401 C S fi_choose W 3403 A R G 2900 C S fi_weight W 3404 A W 3405 Z W 3406 Z W 3407 Z W 3408 Z
fi_table: R G 3408 C S fi_weight M H A R E 3408 R F 2900 ifle E F R E 3405 A E H W 3405 E end R E 3408 ifge E F R E 3406 A E H W 3406 E end R E 3404 ifle H E R E 3407 A E H W 3407 E end R E 3408 I E 1 W 3408 E R F 3401 ifle E F J fi_table end
${label('fi_total')}${integer(3400)}${pad(1)}${label('fi_observed')}${fraction(3404,3403)}${pad(2)}${label('fi_less')}${fraction(3405,3403)}${pad(3)}${label('fi_greater')}${fraction(3406,3403)}${pad(4)}${label('fi_two')}${fraction(3407,3403)}${pad(5)}${label('fi_footer')}M A Z O S P
fi_choose: ifl B Z M A Z O S P end ifg B A M A Z O S P end M I A P I 13 A I B A I 3100 R A I O S P
fi_weight: R A 3402 M B G C S fi_choose M J A R A 3400 R E 3402 S A E R B 3401 S B G C S fi_choose P A J O S P
${lit('fi_total','Fixed margins; total=')}${lit('fi_observed','Observed P=')}${lit('fi_less','A<=observed: ')}${lit('fi_greater','A>=observed: ')}${lit('fi_two','Two-sided P=')}${lit('fi_footer','Two: table P <= observed P')}
${common}`;
export const INFERENCE_WORKSHOP:TextSoftware[]=[{number:385,id:'fisher-table',site:'market',title:'Fisher Table',kind:'text',inputs:['a b c d'],outputs:['Exact fixed-margin tails'],description:'Enter four nonnegative counts a b c d for the rows of a 2-by-2 table; total 1..12. Condition on both row and column totals under independence. Reports the observed-table probability, inclusive lower/upper tails for cell a, and a two-sided probability summing every possible table no more likely than the observed one. This is not necessarily twice a one-sided tail. Example 1 4 4 1 compares two groups of five. Zero margins are allowed and give a degenerate exact distribution. No significance cutoff is imposed.',algorithm:fisher,examples:[{"input":"1 4 4 1","output":"Fixed margins; total=10    Observed P=25/252          A<=observed: 13/126        A>=observed: 251/252       Two-sided P=13/63          Two: table P <= observed P"},{"input":"6 0 0 6","output":"Fixed margins; total=12    Observed P=1/924           A<=observed: 1             A>=observed: 1/924         Two-sided P=1/462          Two: table P <= observed P"}]}];
// Exact conditional sign enumeration with averaged absolute ranks and omitted zeros.
// https://stat.ethz.ch/R-manual/R-devel/library/stats/html/wilcox.test.html
const signed=`app_compute: C S stats_parse N A Z O S P R E 3000 ifg E 10 J app_bad end W 3400 Z M L Z
sr_filter: M I 2900 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end ifn E Z R I 3400 A I 3310 W I E R E 3400 I E 1 W 3400 E end I L 1 R E 3000 ifl L E J sr_filter end R E 3400 ife E Z ${label('sr_undefined')}M A Z O S P end W 3401 Z W 3402 Z M L Z
sr_rank: M I 3310 A I L R G I F G A M H 1 M J Z
sr_compare: M I 3310 A I J R E I F E A ifl E G I H 2 end ife E G I H 1 end I J 1 R E 3400 ifl J E J sr_compare end M I 3300 A I L W I H R E 3401 A E H W 3401 E M I 3310 A I L R E I ifg E Z R E 3402 A E H W 3402 E end I L 1 R E 3400 ifl L E J sr_rank end R E 3402 P E 2 R F 3401 S E F F E A W 3403 E M I 3100 M K 111 K I K W 3100 1 W 3404 1 W 3405 Z W 3406 Z W 3407 Z
sr_dp_item: R I 3406 A I 3300 R G I R H 3407
sr_dp_sum: M I 3100 A I H R E I A I G R F I A F E W I F I H -1 ifge H Z J sr_dp_sum end R E 3407 A E G W 3407 E R E 3404 P E 2 W 3404 E R E 3406 I E 1 W 3406 E R F 3400 ifl E F J sr_dp_item end M L Z
sr_tail: M E L P E 2 R F 3401 S E F F E A R F 3403 ifge E F M I 3100 A I L R E I R F 3405 A E F W 3405 E end I L 1 R E 3401 ifle L E J sr_tail end R E 3401 R F 3402 S E F W 3408 E
${label('sr_n')}${integer(3400)}${pad(1)}${label('sr_plus')}R F 3402 M D 2 C S stats_fraction ${label('sr_minus')}R F 3408 M D 2 C S stats_fraction ${pad(2)}${label('sr_two')}${fraction(3405,3404)}${pad(3)}${label('sr_extreme')}${integer(3405)}M A 47 C S app_put ${integer(3404)}${pad(4)}${label('sr_ties')}${pad(5)}${label('sr_footer')}M A Z O S P
${lit('sr_undefined','UNDEFINED: all zero changes')}${lit('sr_n','Nonzero pairs=')}${lit('sr_plus','W+=')}${lit('sr_minus',' W-=')}${lit('sr_two','Two-sided P=')}${lit('sr_extreme','Extreme signs=')}${lit('sr_ties','Ties averaged; zeros omit')}${lit('sr_footer','P: |W+ - W-| >= observed')}
${common}`;
INFERENCE_WORKSHOP.push({number:386,id:'signed-ranks',site:'orchard',title:'Paired Signed Ranks',kind:'text',inputs:['Paired changes'],outputs:['Exact conditional sign test'],description:'Enter 1..10 paired changes in -9..9. Zero changes are omitted; tied absolute changes receive average ranks. W+ and W- sum positive and negative ranks. Under independently exchangeable signs, enumerate every sign assignment to the observed absolute ranks. The two-sided P includes assignments with |W+ - W-| at least the observed value. This symmetry assumption matters; no significance cutoff is applied. Example 1 2 3 4 has all positive ranks and P=1/8. All-zero input is explicitly undefined.',algorithm:signed,examples:[{"input":"1 2 3 4","output":"Nonzero pairs=4            W+=10 W-=0                 Two-sided P=1/8            Extreme signs=2/16         Ties averaged; zeros omit  P: |W+ - W-| >= observed"},{"input":"1 -1 2 -2 0","output":"Nonzero pairs=4            W+=5 W-=5                  Two-sided P=1              Extreme signs=16/16        Ties averaged; zeros omit  P: |W+ - W-| >= observed"}]});
// Spearman statistic: Pearson correlation of averaged ranks. Exact labeled
// permutations here deliberately avoid asymptotic/tie approximations.
// https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/cor.test.html
const rank=`app_compute: C S stats_parse N A Z O S P R A 3000 ifl A 4 J app_bad end ifg A 12 J app_bad end M B 2 C S app_div N C Z J app_bad W 3400 A M L Z
ra_validate: M I 2900 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I L 1 R E 3000 ifl L E J ra_validate end W 3401 Z
ra_side: M L Z
ra_rank: M I L P I 2 R E 3401 A I E A I 2900 R G I R H 3400 P H -1 M J Z
ra_compare: M I J P I 2 R E 3401 A I E A I 2900 R E I ifl E G I H 2 end ife E G I H 1 end I J 1 R E 3400 ifl J E J ra_compare end R I 3401 P I 20 A I L A I 3100 W I H I L 1 R E 3400 ifl L E J ra_rank end R E 3401 I E 1 W 3401 E ifl E 2 J ra_side end W 3200 Z W 3201 Z W 3202 Z W 3204 Z W 3205 Z M L Z
ra_moments: M I 3100 A I L R G I M I 3120 A I L R H I M E G P E G R F 3200 A E F W 3200 E M E H P E H R F 3201 A E F W 3201 E P G H R E 3202 A E G W 3202 E M I 3140 A I L W I L I L 1 R E 3400 ifl L E J ra_moments end R E 3200 E E Z J ra_undefined R F 3201 E F Z J ra_undefined P E F W 3203 E R E 3202 F E A W 3207 E
ra_permutation: M L Z M G Z
ra_dot: M I 3140 A I L R E I M I 3120 A I E R H I M I 3100 A I L R E I P E H A G E I L 1 R E 3400 ifl L E J ra_dot end F G A R E 3207 ifge G E R E 3204 I E 1 W 3204 E end R E 3205 I E 1 W 3205 E R L 3400 A L -2
ra_pivot: ifl L Z J ra_output end M I 3140 A I L R G I M H I/1 ifl G H J ra_successor end I L -1 J ra_pivot
ra_successor: R J 3400 I J -1
ra_seek: M I 3140 A I J R H I ifg H G J ra_swap end I J -1 J ra_seek
ra_swap: W I G M I 3140 A I L W I H I L 1 R J 3400 I J -1
ra_reverse: ifge L J J ra_permutation end M I 3140 A I L R G I M K 3140 A K J R H K W I H W K G I L 1 I J -1 J ra_reverse
ra_undefined: ${label('ra_none')}M A Z O S P
ra_output: ${label('ra_header')}${pad(1)}${label('ra_rho')}M G Z
ra_root: M E G P E G R F 3203 ifge E F J ra_root_done end I G 1 J ra_root
ra_root_done: ife E F R F 3202 M D G C S stats_fraction else ${integer(3202)}${label('ra_sqrt')}${integer(3203)}M A 41 C S app_put end ${pad(2)}${label('ra_two')}${fraction(3204,3205)}${pad(3)}${label('ra_extreme')}${integer(3204)}M A 47 C S app_put ${integer(3205)}${pad(4)}${label('ra_labeled')}${pad(5)}${label('ra_footer')}M A Z O S P
${lit('ra_none','UNDEFINED: constant ranks')}${lit('ra_header','Spearman; average ties')}${lit('ra_rho','rho=')}${lit('ra_sqrt','/sqrt(')}${lit('ra_two','Two-sided P=')}${lit('ra_extreme','Extreme orders=')}${lit('ra_labeled','All labeled permutations')}${lit('ra_footer','P: |rho| >= observed |rho|')}
${common}`;
INFERENCE_WORKSHOP.push({number:387,id:'rank-association',site:'lichen',title:'Rank Association',kind:'text',inputs:['x y pairs'],outputs:['Spearman and exact tail'],description:'Enter 2..6 x/y pairs with values -9..9. Compute Spearman correlation using average ranks for ties. A nonsquare denominator is shown exactly as rho=num/sqrt(den). Constant ranks are undefined. The two-sided P is the proportion of all n! labeled permutations of y whose absolute rho is at least observed; tied values retain their permutation multiplicity. This tests exchangeable pairings, without an asymptotic approximation or a significance cutoff. Example 1 1 2 2 3 3 gives rho=1 and P=1/3.',algorithm:rank,examples:[{"input":"1 1 2 2 3 3","output":"Spearman; average ties     rho=1                      Two-sided P=1/3            Extreme orders=2/6         All labeled permutations   P: |rho| >= observed |rho|"},{"input":"1 1 1 2 2 2","output":"Spearman; average ties     rho=1/2                    Two-sided P=1              Extreme orders=6/6         All labeled permutations   P: |rho| >= observed |rho|"}]});
// Six observations in {-1,0,1}. Gram entries <=6; every 3x3 determinant
// expansion sums six terms <=216 (1296). Cramer determinants are cross-Gram
// minors <=216 by Cauchy-Binet/Hadamard. Residual numerator has four terms
// each <=1296, so every intermediate is <=5184, below one tryte's9841.
const determinant3=[[0,4,8],[1,5,6],[2,3,7],[2,4,6],[1,3,8],[0,5,7]].map((p,i)=>`R E ${3130+p[0]!} R F ${3130+p[1]!} P E F R F ${3130+p[2]!} P E F ${i<3?'A':'S'} G E`).join(' ');
// https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd141.htm
const plane=`app_compute: C S stats_parse N A Z O S P R A 3000 ifl A 12 J app_bad end ifg A 18 J app_bad end M B 3 C S app_div N C Z J app_bad W 3400 A M L Z
pf_validate: M I 2900 A I L R E I ifl E -1 J app_bad end ifg E 1 J app_bad end I L 1 R E 3000 ifl L E J pf_validate end M I 3100 M K 14 K I K M L Z
pf_observation: M I L P I 3 A I 2900 W 3300 1 R E I W 3301 E M E I/1 W 3302 E M E I/2 W 3303 E M J Z
pf_row: M I 3300 A I J R G I M K Z
pf_col: M I 3300 A I K R E I P E G M I J P I 3 A I K A I 3100 R F I A F E W I F I K 1 ifl K 3 J pf_col end R E 3303 P E G M I 3110 A I J R F I A F E W I F I J 1 ifl J 3 J pf_row end R E 3303 P E E R F 3113 A F E W 3113 F I L 1 R E 3400 ifl L E J pf_observation end C S pf_copy C S pf_det W 3401 A ife A Z ${label('pf_rank')}${pad(1)}${label('pf_unique')}M A Z O S P end M L Z
pf_coefficient: C S pf_copy M J Z
pf_replace: M I J P I 3 A I L A I 3130 M K 3110 A K J R E K W I E I J 1 ifl J 3 J pf_replace end C S pf_det M I 3402 A I L W I A I L 1 ifl L 3 J pf_coefficient end R G 3113 R E 3401 P G E M L Z
pf_residual: M I 3402 A I L R E I M I 3110 A I L R F I P E F S G E I L 1 ifl L 3 J pf_residual end W 3405 G
${label('pf_header')}${pad(1)}${label('pf_a')}${fraction(3402,3401)}${pad(2)}${label('pf_b')}${fraction(3403,3401)}${pad(3)}${label('pf_c')}${fraction(3404,3401)}${pad(4)}${label('pf_sse')}${fraction(3405,3401)}${pad(5)}${label('pf_n')}${integer(3400)}${label('pf_df')}R F 3400 A F -3 C S stats_int M A Z O S P
pf_copy: M I 3100 M J 3130 M K 9
pf_copy_loop: R E I W J E I I 1 I J 1 I K -1 N K Z J pf_copy_loop O S P
pf_det: M G Z ${determinant3} M A G O S P
${lit('pf_rank','RANK DEFICIENT')}${lit('pf_unique','No unique plane fit')}${lit('pf_header','Least squares y=a+b*x+c*z')}${lit('pf_a','a=')}${lit('pf_b','b=')}${lit('pf_c','c=')}${lit('pf_sse','Residual SS=')}${lit('pf_n','n=')}${lit('pf_df','; residual df=')}
${common}`;
INFERENCE_WORKSHOP.push({number:388,id:'plane-fit',site:'lenses',title:'Plane Fit',kind:'text',inputs:['x z y triples'],outputs:['Exact two-predictor fit'],description:'Enter 4..6 triples x z y, with each coordinate -1, 0 or 1. Fit y=a+b*x+c*z by ordinary least squares. Reports exact rational coefficients, residual sum of squares and n-3 residual degrees of freedom. If the intercept and predictor columns are linearly dependent, reports no unique plane instead of dividing by zero. Example 0 0 0 1 0 1 0 1 1 1 1 1 fits a=1/4, b=c=1/2. The deliberately small experimental grid keeps all native determinant arithmetic exact.',algorithm:plane,examples:[{"input":"0 0 0 1 0 1 0 1 1 1 1 1","output":"Least squares y=a+b*x+c*z  a=1/4                      b=1/2                      c=1/2                      Residual SS=1/4            n=4; residual df=1"}]});
// NIST one-way decomposition and degrees of freedom:
// https://www.itl.nist.gov/div898/handbook/prc/section4/prc433.htm
// Counts1..3 imply lcm(n1,n2,n3,N)<=42, N<=9 and sum(y*y)<=36.
// Thus scaled sums<=1512 and F's unreduced numerator<=9072; no wrap.
const anova=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 7 J app_bad end ifg E 12 J app_bad end M L Z M G Z
av_counts: M I 2900 A I L R E I ifl E 1 J app_bad end ifg E 3 J app_bad end A G E I L 1 ifl L 3 J av_counts end ifl G 4 J app_bad end W 3400 G A G 3 R E 3000 N E G J app_bad M L 3
av_validate: M I 2900 A I L R E I ifl E -2 J app_bad end ifg E 2 J app_bad end I L 1 R E 3000 ifl L E J av_validate end W 3401 Z W 3402 Z M L Z M G 3
av_group: M I 2900 A I L R H I M J Z M K Z
av_observation: M I 2900 A I G R E I A J E P E E A K E I G 1 I H -1 N H Z J av_observation M I 3100 A I L W I J R E 3401 A E J W 3401 E R E 3402 A E K W 3402 E I L 1 ifl L 3 J av_group end W 3403 1 M L Z
av_lcm: R G 3403 ifl L 3 M I 2900 A I L R H I else R H 3400 end M J G P J H
av_gcd: ife H Z J av_lcm_done end M A G M B H C S app_div M G H M H C J av_gcd
av_lcm_done: M A J M B G C S app_div W 3403 A I L 1 ifl L 4 J av_lcm end W 3404 Z M L Z
av_meansq: R A 3403 M I 2900 A I L R B I C S app_div M I 3100 A I L R E I P E E P E A R F 3404 A F E W 3404 F I L 1 ifl L 3 J av_meansq end R E 3402 R F 3403 P E F R F 3404 S E F W 3405 E R A 3403 R B 3400 C S app_div R E 3401 P E E P E A R F 3404 S F E W 3404 F R E 3400 A E -3 P F E W 3406 F R E 3405 P E 2 W 3407 E
${label('av_means')}M L Z
av_print_mean: ifn L Z M A 32 C S app_put end M I 3100 A I L R F I M I 2900 A I L R D I C S stats_fraction I L 1 ifl L 3 J av_print_mean end ${pad(1)}${label('av_between')}${fraction(3404,3403)}${pad(2)}${label('av_within')}${fraction(3405,3403)}${pad(3)}${label('av_f')}R E 3405 ife E Z R E 3404 ife E Z ${label('av_undefined')}else ${label('av_infinite')}end else ${fraction(3406,3407)}end ${pad(4)}${label('av_df')}R F 3400 A F -3 C S stats_int ${label('av_n')}${integer(3400)}${pad(5)}${label('av_footer')}M A Z O S P
${lit('av_means','Group means: ')}${lit('av_between','Between SS=')}${lit('av_within','Within SS=')}${lit('av_f','F=')}${lit('av_undefined','UNDEFINED')}${lit('av_infinite','INFINITE')}${lit('av_df','df=2,')}${lit('av_n','; N=')}${lit('av_footer','No p-value or cutoff')}
${common}`;
INFERENCE_WORKSHOP.push({number:389,id:'one-way-compare',site:'weather',title:'One-Way Comparison',kind:'text',inputs:['n1 n2 n3 samples'],outputs:['Exact one-way decomposition'],description:'Enter three group sizes in 1..3, then each group\'s observations in order, all -2..2. Total sample size must be at least four. Reports group means, between/within sums of squares and F=(between/2)/(within/(N-3)), exactly. The usual statistical F interpretation assumes independent normal errors with equal variance; this tool supplies no p-value or cutoff. Zero within variation gives INFINITE if means differ, otherwise UNDEFINED. Example 2 2 2 0 1 1 2 -1 0 compares three pairs.',algorithm:anova,examples:[{"input":"2 2 2 0 1 1 2 -1 0","output":"Group means: 1/2 3/2 -1/2  Between SS=4               Within SS=3/2              F=4                        df=2,3; N=6                No p-value or cutoff"}]});
// Observed-center Manhattan objective; bounded exhaustive search, not PAM swaps.
// https://stat.ethz.ch/R-manual/R-patched/library/cluster/html/pam.html
const medoids=`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end ifg E 11 J app_bad end I E -1 W 3401 E R E 2900 ifl E 1 J app_bad end ifg E 3 J app_bad end W 3400 E M L Z
md_copy: M I 2901 A I L R E I ifl E -9 J app_bad end ifg E 9 J app_bad end M I 3100 A I L W I E I L 1 R E 3401 ifl L E J md_copy end R H 3401
md_sort_pass: ifl H 2 J md_unique_start end M L Z M J H I J -1
md_sort_pair: M I 3100 A I L R E I M F I/1 ifg E F W I F M I/1 E end I L 1 ifl L J J md_sort_pair end I H -1 J md_sort_pass
md_unique_start: W 3402 Z M L Z M G 999
md_unique: M I 3100 A I L R E I ifn E G M G E R I 3402 A I 3100 W I E R E 3402 I E 1 W 3402 E end I L 1 R E 3401 ifl L E J md_unique end R E 3400 R F 3402 ifg E F J app_bad end M L Z
md_init: M I 3120 A I L W I L I L 1 R E 3400 ifl L E J md_init end W 3403 999
md_candidate: W 3404 Z M J Z
md_point: M I 2901 A I J R G I M H 999 M K Z M L Z
md_distance: M I 3120 A I L R E I M I 3100 A I E R E I S E G F E A ifl E H M H E M K L end I L 1 R E 3400 ifl L E J md_distance end R E 3404 A E H W 3404 E M I 3180 A I J W I K I J 1 R E 3401 ifl J E J md_point end R E 3404 R F 3403 ifge E F J md_advance end W 3403 E M L Z
md_best_centers: M I 3120 A I L R E I M I 3100 A I E R E I M I 3140 A I L W I E I L 1 R E 3400 ifl L E J md_best_centers end M L Z
md_best_assign: M I 3180 A I L R E I M I 3160 A I L W I E I L 1 R E 3401 ifl L E J md_best_assign end
md_advance: R L 3400 I L -1
md_pivot: ifl L Z J md_output end M I 3120 A I L R E I R G 3402 R F 3400 S G F A G L ifl E G J md_increment end I L -1 J md_pivot
md_increment: I E 1 W I E I I 1 I L 1 R F 3400 ifge L F J md_candidate end J md_increment
md_output: ${label('md_cost')}${integer(3403)}${pad(1)}${label('md_centers')}M L Z
md_print_centers: ifn L Z M A 32 C S app_put end M I 3140 A I L R F I C S stats_int I L 1 R E 3400 ifl L E J md_print_centers end ${pad(2)}${label('md_assignment')}${pad(3)}M L Z
md_print_assign: ifn L Z M A 32 C S app_put end M I 3160 A I L R A I A A 49 C S app_put I L 1 R E 3401 ifl L E J md_print_assign end ${pad(4)}${label('md_ids')}${pad(5)}${label('md_tie')}M A Z O S P
${lit('md_cost','Minimum absolute cost=')}${lit('md_centers','Centers: ')}${lit('md_assignment','Assignments (input order):')}${lit('md_ids','1-based sorted center IDs')}${lit('md_tie','Ties: smaller center first')}
${common}`;
INFERENCE_WORKSHOP.push({number:390,id:'medoid-clusters',site:'pebbles',title:'Medoid Clustering',kind:'text',inputs:['k then samples'],outputs:['Optimal observed centers'],description:'Enter k in 1..3 followed by 1..10 samples -9..9, with at least k distinct values. Select k different observed values minimizing the total distance from each sample to its nearest center. Searches every candidate set exactly, not a greedy update. Ties choose the lexicographically smallest sorted center set; equal-distance samples choose the smaller center. Assignment IDs refer to that sorted set, retaining input order. Example 2 -8 -7 6 7 gives centers -8 and 6, cost 2. Values may be interleaved; clusters need not be adjacent in input order.',algorithm:medoids,examples:[{"input":"2 -8 -7 6 7","output":"Minimum absolute cost=2    Centers: -8 6              Assignments (input order): 1 1 2 2                    1-based sorted center IDs  Ties: smaller center first"},{"input":"2 0 8 1 9","output":"Minimum absolute cost=2    Centers: 0 8               Assignments (input order): 1 2 1 2                    1-based sorted center IDs  Ties: smaller center first"}]});
