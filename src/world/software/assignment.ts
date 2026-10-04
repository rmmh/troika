import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const ASSIGNMENT_SOFTWARE:TextSoftware = {
  number:153,kind:'text',id:'assignment-plan',site:'station',title:'Minimum Cost Assignment',
  description:'Enter four costs for a 2x2 matrix or nine costs for a 3x3 matrix, in row order. Costs are signed integers in -99..99. Assigns exactly one distinct column to every row with minimum total cost. Prints the total and zero-based columns in row order. Equal totals choose the lexicographically smallest column sequence. Native enumeration checks every complete assignment.',
  inputs:['Row-order costs'],outputs:['Cost and columns'],
  algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 M L 2 ifn E 4 ifn E 9 J app_bad end M L 3 end W 3001 999 M G Z
assign_first: M H Z
assign_second: E G H J assign_next M I 2900 A I G R D I M I 2900 A I L A I H R E I A D E M J 3 S J G S J H ife L 3 M I 2906 A I J R E I A D E end R E 3001 ifl D E W 3001 D W 3010 G W 3011 H W 3012 J end
assign_next: I H 1 ifl H L J assign_second end I G 1 ifl G L J assign_first end M A @assign_cost C S stats_label R F 3001 C S stats_int M A @assign_columns C S stats_label M J Z
assign_print: ifn J Z M A 32 C S app_put end M I 3010 A I J R F I C S stats_int I J 1 ifl J L J assign_print end M A Z O S P
assign_cost: ${text('cost=')}
assign_columns: ${text(' columns=')}
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P`,
  examples:[{input:'9 2 3 8',output:'cost=5 columns=1 0'},{input:'1 1 1 1',output:'cost=2 columns=0 1'},{input:'9 2 7 6 4 3 5 8 1',output:'cost=9 columns=1 0 2'},{input:'1 2 3',error:true}],
};
