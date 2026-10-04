import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const HOUSEHOLD_TOOLS:TextSoftware[]=[
 {
  number:210,kind:'text',id:'receipt-total',site:'enzo',title:'Receipt Adder',
  inputs:['Signed prices'],outputs:['Receipt total'],
  description:'Add space-separated prices with exactly two decimal places, such as 3.25 1.40 -0.50. A minus sign records a return; a plus sign is optional. Each price has one or two whole digits and magnitude at most 98.41. The running total must also stay within -98.41..98.41. Reports the item count and exact total; no floating-point rounding. Blank input and malformed prices are rejected.',
  algorithm:`app_compute: M J 2552 R K 2610 W 3100 Z W 3101 Z
receipt_space: E K Z J receipt_done R E J ife E 32 I J 1 I K -1 J receipt_space end M H 1 M G Z M L Z
 ife E 45 M H -1 I J 1 I K -1 else ife E 43 I J 1 I K -1 end end
receipt_whole: E K Z J app_bad R E J E E 46 J receipt_point ifl E 48 J app_bad end ifg E 57 J app_bad end ifge L 2 J app_bad end P G 10 S E 48 A G E I L 1 I J 1 I K -1 J receipt_whole
receipt_point: E L Z J app_bad I J 1 I K -1 M L 2
receipt_fraction: E K Z J app_bad R E J ifl E 48 J app_bad end ifg E 57 J app_bad end ifg G 984 J app_bad end ife G 984 ifg E 49 J app_bad end end P G 10 S E 48 A G E I J 1 I K -1 I L -1 N L Z J receipt_fraction
 ifg G 9841 J app_bad end ifn K Z R E J N E 32 J app_bad end
 R F 3100 ifg H Z ifg F Z M E 9841 S E F ifg G E J app_bad end end else ifl F Z M E 9841 A E F ifg G E J app_bad end end end
 P G H A F G W 3100 F R E 3101 I E 1 W 3101 E J receipt_space
receipt_done: R F 3101 E F Z J app_bad M A @receipt_items C S stats_label C S stats_int M A @receipt_total C S stats_label R A 3100 ifl A Z M A 45 C S app_put end R A 3100 F A A M B 100 C S app_div M L C M F A C S stats_int M A 46 C S app_put M A L M B 10 C S app_div M F C A A 48 C S app_put M A F A A 48 C S app_put M A Z O S P
receipt_items: ${ascii('items=')}
receipt_total: ${ascii(' total=')}
app_bad: M A -1 O S P
${SAMPLE_OUTPUT}`,
  examples:[{input:'3.25 1.40 -0.50',output:'items=3 total=4.15'},{input:'0.01 0.09',output:'items=2 total=0.10'},{input:'-5.00 +1.25',output:'items=2 total=-3.75'},{input:'98.41 0.01',error:true},{input:'1.2',error:true}],
 },
 {
  number:211,kind:'text',id:'portion-shares',site:'lunchbox',title:'Whole Portion Shares',
  inputs:['Count + weights'],outputs:['Whole portions'],
  description:'Divide 1..99 whole portions among one to eight recipients. Enter the portion count followed by nonnegative weights 0..99; at least one weight must be positive. Each recipient first receives the whole part of their proportional share. Remaining portions go to the largest fractional remainders, with earlier recipients winning ties. Outputs shares in input order, summing exactly to the requested count. Zero weights receive zero portions.',
  algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end I E -1 W 3001 E R E 2900 ifl E 1 J app_bad end W 3002 E M J Z M G Z
share_sum: M I 2901 A I J R E I ifl E Z J app_bad end A G E I J 1 R E 3001 ifl J E J share_sum end E G Z J app_bad W 3003 G R H 3002 M J Z
share_floor: M I 2901 A I J R A I R E 3002 P A E M B G C S app_div M I 3100 A I J W I A S H A M I 3200 A I J W I C I J 1 R E 3001 ifl J E J share_floor end W 3004 H
share_extra: R E 3004 E E Z J share_output M J Z M G -1 M H Z
share_best: M I 3200 A I J R E I ifg E G M G E M H J end I J 1 R E 3001 ifl J E J share_best end M I 3100 A I H R E I I E 1 W I E M I 3200 A I H W I -1 R E 3004 I E -1 W 3004 E J share_extra
share_output: M J Z
share_write: ifn J Z M A 32 C S app_put end M I 3100 A I J R F I C S stats_int I J 1 R E 3001 ifl J E J share_write end M A Z O S P
app_bad: M A -1 O S P
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}`,
  examples:[{input:'10 1 1 1',output:'4 3 3'},{input:'7 4 2 1',output:'4 2 1'},{input:'5 0 1 1',output:'0 3 2'},{input:'1 0 0',error:true},{input:'0 1',error:true}],
 },
];
