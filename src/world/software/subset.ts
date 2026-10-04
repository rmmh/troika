import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const SUBSET_SOFTWARE:TextSoftware = {
  number:133,kind:'text',id:'subset-target',site:'menus',title:'Smallest exact selection',
  description:'Enter a target followed by one to eight signed values, all in -99..99. Finds a smallest selection summing exactly to the target, using each value at most once. Prints original zero-based value indices. Ties choose the smaller membership bitmask (index zero is the low bit). Target zero returns EMPTY; an impossible target returns NONE. Negative values and repeated values are allowed.',
  inputs:['target values...'],outputs:['Selected indices'],
  algorithm:`app_compute: C S stats_parse N A Z O S P R L 3000 ifl L 2 J app_bad end I L -1 M E 1 M F L
subset_bound: P E 2 I F -1 N F Z J subset_bound W 3004 E W 3002 -1 W 3003 9 R H 2900 M J Z
subset_mask: R E 3004 ifge J E J subset_done end M K J M I 2901 M D Z M G Z
subset_bit: E K Z J subset_compare M A K M B 2 C S app_div M K A ifn C Z R E I A D E I G 1 end I I 1 J subset_bit
subset_compare: ife D H R E 3003 ifl G E W 3002 J W 3003 G end end I J 1 J subset_mask
subset_done: R G 3002 ifl G Z M A @subset_none J stats_label end ife G Z M A @subset_empty J stats_label end M J Z M K Z
subset_print: E G Z M A Z E G Z O S P M A G M B 2 C S app_div M G A ifn C Z ifn K Z M A 32 C S app_put end M F J C S stats_int I K 1 end I J 1 J subset_print
subset_none: ${ascii('NONE')}
subset_empty: ${ascii('EMPTY')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P`,
  examples:[{input:'7 2 3 4 5',output:'1 2'},{input:'5 2 3 5',output:'2'},{input:'-3 8 -5 2 -1',output:'1 2'},{input:'0 1 -1',output:'EMPTY'},{input:'9 2 4',output:'NONE'},{input:'1',error:true}],
};
