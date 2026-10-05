import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
const support=`tl_bad: M A -1 O S P
tl_pad: M D A
tl_spaces: R E 2620 ifge E D M A Z O S P end M A 32 C S app_put J tl_spaces
${SAMPLE_OUTPUT}`;

export const TERNARY_LINEAR:TextSoftware[]=[{
 number:402,kind:'text',id:'ternary-matrix',site:'ternary',title:'Ternary Matrix Workshop',
 inputs:['R/N r c|digits'],outputs:['Row reduction / nullspace'],
 description:'Work over the field with elements 0,1,2, all arithmetic modulo 3. Enter R r c|digits for reduced row-echelon form or N r c|digits for a homogeneous nullspace basis: r=1..4 rows, c=1..5 columns, followed by exactly r*c row-major digits. Example R 2 3|121212 has rank 1. Pivot columns are numbered from 1. A nullspace basis sets one free variable to 1 at a time in column order; it describes all solutions of A*x=0, not an augmented right-hand-side system. Full column rank means only the zero vector. Native row swaps, scaling and elimination provide exact results.',
 algorithm:`app_compute: R K 2610 ifl K 7 J tl_bad end R E 2552 ifn E 82 ifn E 78 J tl_bad end end W 3082 E R E 2553 ifn E 32 J tl_bad end R E 2555 ifn E 32 J tl_bad end R E 2557 ifn E 124 J tl_bad end R G 2554 S G 48 ifl G 1 J tl_bad end ifg G 4 J tl_bad end W 3080 G R L 2556 S L 48 ifl L 1 J tl_bad end ifg L 5 J tl_bad end W 3081 L M E G P E L A E 6 N E K J tl_bad
 M I 3000 M E 20 K I E M I 3050 M E 5
tm_clear: W I -1 I I 1 I E -1 N E Z J tm_clear M G Z M H Z M J 2558
tm_parse: R E J S E 48 ifl E Z J tl_bad end ifg E 2 J tl_bad end M I G P I 5 A I H A I 3000 W I E I J 1 I H 1 ifl H L J tm_parse end M H Z I G 1 R E 3080 ifl G E J tm_parse end M G Z M H Z
tm_column: ifge H L J tm_output end R E 3080 ifge G E J tm_output end M K G
tm_find: R E 3080 ifge K E J tm_next_column end M I K P I 5 A I H A I 3000 R E I ifn E Z J tm_swap end I K 1 J tm_find
tm_swap: M J Z
tm_swap_cell: M I G P I 5 A I J A I 3000 R E I M A K P A 5 A A J A A 3000 R F A W I F W A E I J 1 ifl J L J tm_swap_cell end M I G P I 5 A I H A I 3000 R E I ife E 2 M J Z
tm_scale: M I G P I 5 A I J A I 3000 R E I P E 2 ifge E 3 I E -3 end W I E I J 1 ifl J L J tm_scale end end M K Z
tm_eliminate: R E 3080 ifge K E J tm_pivot_done end ife K G J tm_next_row end M I K P I 5 A I H A I 3000 R F I W 3084 F ife F Z J tm_next_row end M J Z
tm_subtract: M I G P I 5 A I J A I 3000 R E I R F 3084 P E F M I K P I 5 A I J A I 3000 R A I S A E A A 6 M B 3 C S app_div W I C I J 1 ifl J L J tm_subtract end
tm_next_row: I K 1 J tm_eliminate
tm_pivot_done: M I 3030 A I G W I H M I 3050 A I H W I G I G 1
tm_next_column: I H 1 J tm_column
tm_output: W 3083 G M A @tm_rank C S stats_label R F 3083 C S stats_int M A @tm_nullity C S stats_label M F L R E 3083 S F E C S stats_int M A 27 C S tl_pad R E 3082 ife E 78 J tm_nullspace end
 M A @tm_pivots C S stats_label M G Z
tm_pivot_out: R E 3083 ifge G E J tm_rows end M I 3030 A I G R A I A A 49 C S app_put M A 32 C S app_put I G 1 J tm_pivot_out
tm_rows: M A 54 C S tl_pad M G Z
tm_row_out: M A G A A 49 C S app_put M A 58 C S app_put M A 32 C S app_put M H Z
tm_cell_out: M I G P I 5 A I H A I 3000 R A I A A 48 C S app_put M A 32 C S app_put I H 1 ifl H L J tm_cell_out end I G 1 M A G A A 2 P A 27 C S tl_pad R E 3080 ifl G E J tm_row_out end M A Z O S P
tm_nullspace: R E 3083 ife E L M A @tm_zero J stats_label end M H Z M G Z
tm_basis_column: ifge H L M A Z O S P end M I 3050 A I H R E I ifge E Z J tm_basis_next end I G 1 M A 118 C S app_put M A G A A 48 C S app_put M A 58 C S app_put M A 32 C S app_put M J Z
tm_basis_entry: M A Z ife J H M A 1 else M I 3050 A I J R E I ifge E Z P E 5 A E H A E 3000 R E E M A 3 S A E ife A 3 M A Z end end end A A 48 C S app_put M A 32 C S app_put I J 1 ifl J L J tm_basis_entry end M A G I A 1 P A 27 C S tl_pad
tm_basis_next: I H 1 J tm_basis_column
tm_rank: ${ascii('Rank ')}
tm_nullity: ${ascii('; nullity ')}
tm_pivots: ${ascii('Pivot columns: ')}
tm_zero: ${ascii('Only the zero vector')}
${support}`,
 examples:[{input:'R 2 3|121212',output:row('Rank 1; nullity 2')+row('Pivot columns: 1 ')+row('1: 1 2 1 ')+row('2: 0 0 0 ')},{input:'N 2 3|121212',output:row('Rank 1; nullity 2')+row('v1: 1 1 0 ')+row('v2: 2 0 1 ')}],
}];

// Finite-prefix Berlekamp-Massey over GF(3). Sequence:3000..3029, connection
// polynomials C/B/T:3040/3080/3120 (25 cells each), scalar state3160..3169.
TERNARY_LINEAR.push({
 number:403,kind:'text',id:'ternary-recur',site:'signals',title:'Ternary Recurrence Finder',
 inputs:['Sequence 0..2'],outputs:['Minimal finite-prefix rule'],
 description:'Enter 1..24 ternary digits. Native Berlekamp-Massey finds a shortest linear recurrence over arithmetic modulo 3 matching the supplied finite prefix. C prints connection coefficients C0..CL, with C0=1: s[n]+C1*s[n-1]+...+CL*s[n-L]=0 for observed positions n>=L. Next 6 extrapolates that rule; a finite prefix can admit several rules, so this is not a claim about unknown data. Example 012012012012 gives C:111 and predicts 012012. All-zero input has order 0 and predicts zeros. Coefficients use ordinary digits 0,1,2, not signed tribbles.',
 algorithm:`app_compute: R K 2610 ifl K 1 J tl_bad end ifg K 24 J tl_bad end W 3160 K M G Z
tr_parse: M I 2552 A I G R E I S E 48 ifl E Z J tl_bad end ifg E 2 J tl_bad end M I 3000 A I G W I E I G 1 ifl G K J tr_parse end M I 3040 M E 25 K I E M I 3080 M E 25 K I E W 3040 1 W 3080 1 W 3161 Z W 3162 1 W 3163 1 W 3164 Z
tr_iteration: R G 3164 R E 3160 ifge G E J tr_predict end M I 3000 A I G R H I M J 1
tr_discrepancy: R E 3161 ifg J E J tr_reduce end M I 3040 A I J R E I M I G S I J A I 3000 R F I P E F A H E I J 1 J tr_discrepancy
tr_reduce: M A H M B 3 C S app_div W 3165 C ife C Z J tr_shift end M G Z
tr_backup: M I 3040 A I G R E I M I 3120 A I G W I E I G 1 ifl G 25 J tr_backup end R A 3165 R E 3163 P A E M B 3 C S app_div W 3166 C M G Z
tr_update: R H 3162 M I G A I H ifge I 25 J tr_order end A I 3040 M J 3080 A J G R E J R F 3166 P E F R A I S A E A A 6 M B 3 C S app_div W I C I G 1 J tr_update
tr_order: R E 3161 P E 2 R F 3164 ifg E F J tr_shift end R E 3161 S F E I F 1 W 3161 F M G Z
tr_remember: M I 3120 A I G R E I M I 3080 A I G W I E I G 1 ifl G 25 J tr_remember end R E 3165 W 3163 E W 3162 1 J tr_next
tr_shift: R E 3162 I E 1 W 3162 E
tr_next: R E 3164 I E 1 W 3164 E J tr_iteration
tr_predict: R G 3160 M K G I K 6
tr_future: M H Z M J 1
tr_sum: R E 3161 ifg J E J tr_future_reduce end M I 3040 A I J R E I M I G S I J A I 3000 R F I P E F A H E I J 1 J tr_sum
tr_future_reduce: M A H M B 3 C S app_div M E 3 S E C ife E 3 M E Z end M I 3000 A I G W I E I G 1 ifl G K J tr_future end
 M A @tr_order_label C S stats_label R F 3161 C S stats_int M A 27 C S tl_pad M A @tr_c C S stats_label M G Z
tr_coefficients: M I 3040 A I G R A I A A 48 C S app_put I G 1 R E 3161 ifle G E J tr_coefficients end M A 54 C S tl_pad M A @tr_next_label C S stats_label R G 3160 M H G I H 6
tr_future_print: M I 3000 A I G R A I A A 48 C S app_put I G 1 ifl G H J tr_future_print end M A 81 C S tl_pad M A @tr_rule C S stats_label M A 108 C S tl_pad M A @tr_caution C S stats_label M A 135 C S tl_pad M A @tr_lags J stats_label
tr_order_label: ${ascii('Order: ')}
tr_c: ${ascii('C:')}
tr_next_label: ${ascii('Next 6: ')}
tr_rule: ${ascii('Rule: s+sum(Ci*past)=0')}
tr_caution: ${ascii('Finite prefix; not a law')}
tr_lags: ${ascii('C0=1; oldest lag last')}
${support}`,
 examples:[{input:'012012012012',output:row('Order: 2')+row('C:111')+row('Next 6: 012012')+row('Rule: s+sum(Ci*past)=0')+row('Finite prefix; not a law')+'C0=1; oldest lag last'},{input:'0000',output:row('Order: 0')+row('C:1')+row('Next 6: 000000')+row('Rule: s+sum(Ci*past)=0')+row('Finite prefix; not a law')+'C0=1; oldest lag last'}],
});
