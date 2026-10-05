import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';

const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
const support=`seq_pad: M D A
seq_padding: R E 2620 ifge E D M A Z O S P end M A 32 C S app_put J seq_padding
seq_bad: M A -1 O S P
${SAMPLE_OUTPUT}`;

// SA/LCP each use 16 cells, at 3000/3020; suffix scratch is 3050..3053.
// All comparisons use original input characters. The longest repeat is at most
// 15 characters; six output rows fit the shared 162-cell output arena.
export const SEQUENCE_WORKSHOP:TextSoftware[]=[{
 number:369,kind:'text',id:'suffix-index',site:'typecase',title:'Suffix Index',
 inputs:['Letters (1..16)'],outputs:['Sorted suffixes / repeats'],
 description:'Build the suffix array of one to sixteen ASCII letters, preserving case (A..Z before a..z). SA lists zero-based starting positions, eight per row. LC gives each suffix longest common prefix with its preceding sorted suffix; the first is zero. All numbers have two digits. Repeat shows the longest repeated substring, allowing overlaps; equally long repeats choose the lexicographically first. A dash means no repeat. Example banana has SA 05 03 01 00 04 02 and repeat ana. The empty suffix is omitted. Sorting and character comparisons run inside the guest.',
 algorithm:`app_compute: R K 2610 ifl K 1 J seq_bad end ifg K 16 J seq_bad end W 3050 K M G Z
sx_init: M I 2552 A I G R E I ifl E 65 J seq_bad end ifg E 122 J seq_bad end ifg E 90 ifl E 97 J seq_bad end end M I 3000 A I G W I G M I 3020 A I G W I Z I G 1 ifl G K J sx_init end
 M G Z
sx_sort: M L G M H G I H 1
sx_scan: ifge H K J sx_swap end M I 3000 A I H R A I M I 3000 A I L R B I C S sx_compare ifl C Z M L H end I H 1 J sx_scan
sx_swap: M I 3000 A I G R E I M J 3000 A J L R F J W I F W J E I G 1 ifl G K J sx_sort end
 W 3051 Z W 3052 Z M G 1
sx_lcp: ifge G K J sx_output end M I 3000 A I G R A I M B I/-1 W 3053 A C S sx_compare M I 3020 A I G W I D R E 3051 ifg D E W 3051 D R E 3053 W 3052 E end I G 1 J sx_lcp
; A/B are suffix positions; return signed comparison C and common length D.
sx_compare: M D Z
sx_chars: ifge A K ifge B K M C Z O S P end M C -1 O S P end ifge B K M C 1 O S P end M I 2552 A I A R E I M I 2552 A I B R F I M C E S C F N C Z O S P I A 1 I B 1 I D 1 J sx_chars
sx_output: M A @sx_heading C S stats_label M A 27 C S seq_pad M A @sx_sa C S stats_label M G 3000 M H Z C S sx_eight M A 54 C S seq_pad M A @sx_indent C S stats_label C S sx_eight M A 81 C S seq_pad
 M A @sx_lc C S stats_label M G 3020 M H Z C S sx_eight M A 108 C S seq_pad M A @sx_indent C S stats_label C S sx_eight M A 135 C S seq_pad M A @sx_repeat C S stats_label R H 3051 ife H Z M A 45 C S app_put M A Z O S P end R G 3052 A G 2552
sx_repeat_chars: R A G C S app_put I G 1 I H -1 N H Z J sx_repeat_chars M A Z O S P
sx_eight: M L 8
sx_number: ifge H K M A Z O S P end M I G A I H R A I M B 10 C S app_div A A 48 C S app_put M A C A A 48 C S app_put M A 32 C S app_put I H 1 I L -1 N L Z J sx_number M A Z O S P
sx_heading: ${ascii('Suffix positions / LCP')}
sx_sa: ${ascii('SA ')}
sx_lc: ${ascii('LC ')}
sx_indent: ${ascii('   ')}
sx_repeat: ${ascii('Repeat: ')}
${support}`,
 examples:[{input:'banana',output:row('Suffix positions / LCP')+row('SA 05 03 01 00 04 02 ')+row('')+row('LC 00 01 03 00 00 02 ')+row('')+'Repeat: ana'},{input:'abc',output:row('Suffix positions / LCP')+row('SA 00 01 02 ')+row('')+row('LC 00 00 00 ')+row('')+'Repeat: -'},{input:'',error:true}],
}];

// Alignment scores and back-pointers occupy 13*13 cells at 3000 and 3200.
// A score is at most 2*12=24. Traceback uses at most 24 steps, stored backwards
// at 3400/3430; scratch is 3500..3509. No arithmetic approaches tryte limits.
SEQUENCE_WORKSHOP.push({
 number:370,kind:'text',id:'local-alignment',site:'library',title:'Local Sequence Alignment',
 inputs:['letters|letters'],outputs:['Best matching regions'],
 description:'Find the highest-scoring local alignment of two one-to-twelve-letter ASCII sequences, separated by |. Case matters. A match earns 2, a mismatch costs 1 and each gap costs 2. Native dynamic programming starts a fresh alignment whenever its score would be negative. Show score, zero-based end-exclusive source spans, aligned strings and a guide: | match, . mismatch, space gap. Ties choose the first ending pair in row-major order, then diagonal before deletion before insertion. Example ABCD|ABXD gives score 5 with one mismatch. A zero score reports no positive local match. This is local, gapped similarity rather than whole-string edit distance.',
 algorithm:`app_compute: R K 2610 M G Z W 3502 Z
al_parse: ifge G K J al_parsed end M I 2552 A I G R E I ife E 124 R F 3502 N F Z J seq_bad M F I W 3502 F W 3500 G else ifl E 65 J seq_bad end ifg E 122 J seq_bad end ifg E 90 ifl E 97 J seq_bad end end end I G 1 J al_parse
al_parsed: R E 3502 E E Z J seq_bad R F 3500 ifl F 1 J seq_bad end ifg F 12 J seq_bad end M F K R E 3500 S F E I F -1 ifl F 1 J seq_bad end ifg F 12 J seq_bad end W 3501 F
 M I 3000 M K 169 K I K M I 3200 M K 169 K I K W 3504 Z W 3505 Z W 3506 Z M G 1
al_row: M H 1
al_cell: M I G P I 13 A I H A I 3000 M L I/-14 M J 1 M A 2551 A A G R E A R A 3502 A A H R F A ife E F I L 2 else I L -1 end ifl L Z M L Z M J Z end
 M E I/-13 I E -2 ifg E L M L E M J 2 end M E I/-1 I E -2 ifg E L M L E M J 3 end W I L A I 200 W I J R E 3504 ifg L E W 3504 L W 3505 G W 3506 H end
 I H 1 R E 3501 ifle H E J al_cell end I G 1 R E 3500 ifle G E J al_row end
 R G 3505 R H 3506 M K Z
al_trace: M I G P I 13 A I H A I 3000 R E I E E Z J al_traced A I 200 R E I M A 45 M B 45 ifn E 3 M I 2551 A I G R A I I G -1 end ifn E 2 R I 3502 A I H R B I I H -1 end M I 3400 A I K W I A M I 3430 A I K W I B I K 1 J al_trace
al_traced: W 3507 G W 3508 H W 3509 K M A @al_score C S stats_label R F 3504 C S stats_int M A @al_scoring C S stats_label M A 27 C S seq_pad R E 3504 ife E Z M A @al_none J stats_label end
 M A @al_a C S stats_label R F 3507 C S stats_int M A @al_dots C S stats_label R F 3505 C S stats_int M A @al_b C S stats_label R F 3508 C S stats_int M A @al_dots C S stats_label R F 3506 C S stats_int M A 54 C S seq_pad
 M G 3400 C S al_string M A 81 C S seq_pad R H 3509 I H -1
al_guide: M I 3400 A I H R E I M I 3430 A I H R F I M A 46 ife E F M A 124 end ife E 45 M A 32 end ife F 45 M A 32 end C S app_put I H -1 ifge H Z J al_guide end M A 108 C S seq_pad M G 3430 C S al_string M A 135 C S seq_pad M A @al_legend J stats_label
al_string: R H 3509 I H -1
al_letter: M I G A I H R A I C S app_put I H -1 ifge H Z J al_letter end M A Z O S P
al_score: ${ascii('Score: ')}
al_scoring: ${ascii(' (+2/-1/-2)')}
al_none: ${ascii('No positive local match')}
al_a: ${ascii('A:')}
al_b: ${ascii(' B:')}
al_dots: ${ascii('..')}
al_legend: ${ascii('0-based end-exclusive spans')}
${support}`,
 examples:[{input:'ABCD|ABXD',output:row('Score: 5 (+2/-1/-2)')+row('A:0..4 B:0..4')+row('ABCD')+row('||.|')+row('ABXD')+'0-based end-exclusive spans'}, {input:'ABC|xyz',output:row('Score: 0 (+2/-1/-2)')+'No positive local match'}, {input:'A||B',error:true}],
});
