import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const PACKING_SOFTWARE:TextSoftware = {
  number:152,kind:'text',id:'bin-pack',site:'toolshed',title:'Minimum Bin Packing',
  description:'Enter a capacity in 1..99 followed by one to eight positive item sizes no larger than that capacity. Native subset dynamic programming finds the minimum number of equal-capacity bins and prints a zero-based bin assignment in original item order. Every item is used once. States prefer fewer bins, then a lighter last bin, then the lower last-added item index. This is exact for the stated input limit.',
  inputs:['Capacity sizes'],outputs:['Bin assignment'],
  algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end I E -1 W 3005 E R L 2900 ifl L 1 J app_bad end M J Z M H 1
pack_validate: M I 2901 A I J R E I ifl E 1 J app_bad end ifg E L J app_bad end P H 2 I J 1 R E 3005 ifl J E J pack_validate end W 3001 H W 3100 1 W 3400 Z M J 1
pack_state: R E 3001 ifge J E J pack_trace_start end W 3002 99 W 3003 99 M G J M K 1 M H Z
pack_item: E G Z J pack_store M A G M B 2 C S app_div M G A ife C Z J pack_next end M I J S I K A I 3100 R F I A I 300 R E I M I 2901 A I H R D I A E D ifg E L I F 1 M E D end R D 3002 ifl F D J pack_better end ife F D R D 3003 ifl E D J pack_better end end J pack_next
pack_better: W 3002 F W 3003 E W 3004 H
pack_next: P K 2 I H 1 J pack_item
pack_store: M I 3100 A I J R E 3002 W I E A I 300 R E 3003 W I E A I 300 R E 3004 W I E I J 1 J pack_state
pack_trace_start: R J 3001 I J -1 M I 3100 A I J R G I W 3006 G I G -1
pack_trace: E J Z J pack_output M I 3700 A I J R K I M I 3010 A I K W I G M H 1 M E K
pack_power: E E Z J pack_parent P H 2 I E -1 J pack_power
pack_parent: M I 3100 A I J R F I S J H M I 3100 A I J R E I ifl E F I G -1 end J pack_trace
pack_output: M A @pack_bins C S stats_label R F 3006 C S stats_int M A @pack_places C S stats_label M J Z
pack_print: ifn J Z M A 32 C S app_put end M I 3010 A I J R F I C S stats_int I J 1 R E 3005 ifl J E J pack_print end M A Z O S P
pack_bins: ${text('bins=')}
pack_places: ${text(' assignment=')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P`,
  examples:[{input:'10 6 4',output:'bins=1 assignment=0 0'},{input:'5 5 5',output:'bins=2 assignment=1 0'},{input:'10 11',error:true},{input:'5 0',error:true}],
};
