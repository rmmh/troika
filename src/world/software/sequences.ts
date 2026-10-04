import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';

const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const helpers=`${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;

export const SEQUENCE_SOFTWARE: TextSoftware[] = [
  {
    number:103,kind:'text',id:'best-segment',site:'creek',title:'Strongest contiguous span',
    description:'Finds the nonempty contiguous span with the largest sum among one to nine signed observations in -99..99. Reports the sum and zero-based inclusive endpoints. Ties prefer the earliest start, then earliest end. Useful for finding sustained positive stretches in a sequence of changes.',
    inputs:['Signed changes'],outputs:['Best span'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R G 2900 M H G M J 1 M K Z M L Z W 3020 Z
segment_next: R E 3000 ifge J E J segment_done end M I 2900 A I J R E I
 ifl G Z M G E M K J else A G E end
 ifg G H M H G M L K W 3020 J end I J 1 J segment_next
segment_done: M A @sum_label C S stats_label M F H C S stats_int M A @start_label C S stats_label M F L C S stats_int M A @end_label C S stats_label R F 3020 J stats_int
sum_label: ${ascii('sum=')}
start_label: ${ascii(' start=')}
end_label: ${ascii(' end=')}
${helpers}`,
    examples:[{input:'-2 3 -1 4 -8 5',output:'sum=6 start=1 end=3'},{input:'-3 -1 -1',output:'sum=-1 start=1 end=1'},{input:'0 0',output:'sum=0 start=0 end=0'},{input:'',error:true}],
  },
  {
    number:104,kind:'text',id:'rising-subseq',site:'lichen',title:'Longest rising subsequence',
    description:'Finds the length of a longest strictly increasing subsequence of one to nine signed values in -99..99. Values may be skipped but their order is preserved; equal values cannot extend a rise. A native dynamic-programming table evaluates every earlier candidate.',
    inputs:['Observations'],outputs:['Length'],
    algorithm:`app_compute: C S stats_parse N A Z O S P M J Z M L 1
rise_outer: R E 3000 ifge J E M F L J stats_int end M I 2900 A I J R G I M H 1 M K Z
rise_inner: ifge K J J rise_save end M I 2900 A I K R E I ifl E G M I 3100 A I K R E I I E 1 ifg E H M H E end end I K 1 J rise_inner
rise_save: M I 3100 A I J W I H ifg H L M L H end I J 1 J rise_outer
${helpers}`,
    examples:[{input:'3 1 2 5 4 6',output:'4'},{input:'5 4 3',output:'1'},{input:'2 2 2',output:'1'},{input:'-3 -2 -1 0',output:'4'},{input:'100',error:true}],
  },
  {
    number:105,kind:'text',id:'peak-drop',site:'weather',title:'Largest peak-to-later drop',
    description:'Measures the greatest nonnegative fall from an earlier observation to a later one. Enter one to nine signed readings in -99..99. Reports the drop and zero-based peak/trough indices; ties prefer the earliest peak then trough. A series without a fall reports zero at indices 0,0.',
    inputs:['Readings'],outputs:['Largest fall'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R G 2900 M H Z M J 1 M K Z M L Z W 3020 Z
 drop_next: R E 3000 ifge J E J drop_done end M I 2900 A I J R E I ifg E G M G E M K J end M F G S F E ifg F H M H F M L K W 3020 J end I J 1 J drop_next
 drop_done: M A @drop_label C S stats_label M F H C S stats_int M A @peak_label C S stats_label M F L C S stats_int M A @trough_label C S stats_label R F 3020 J stats_int
 drop_label: ${ascii('drop=')}
 peak_label: ${ascii(' peak=')}
 trough_label: ${ascii(' trough=')}
${helpers}`,
    examples:[{input:'3 8 2 6 -1',output:'drop=9 peak=1 trough=4'},{input:'-99 99 -99',output:'drop=198 peak=1 trough=2'},{input:'1 2 3',output:'drop=0 peak=0 trough=0'},{input:'9',output:'drop=0 peak=0 trough=0'}],
  },
  {
    number:106,kind:'text',id:'turning-points',site:'pendulum',title:'Trend reversal counter',
    description:'Counts peaks and troughs in one to nine signed readings in -99..99. Flat stretches are ignored: a rise followed by a fall is one peak, even with a plateau between them. Endpoints are not extrema. Reports peaks, troughs and total reversals.',
    inputs:['Readings'],outputs:['Reversals'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R G 2900 M H Z M J 1 M K Z M L Z
turn_next: R E 3000 ifge J E J turn_done end M I 2900 A I J R E I M F Z ifg E G M F 1 end ifl E G M F -1 end M G E
 ifn F Z ifn H Z ifn F H ife H 1 I K 1 else I L 1 end end end M H F end I J 1 J turn_next
turn_done: M A @peaks_label C S stats_label M F K C S stats_int M A @troughs_label C S stats_label M F L C S stats_int M A @turns_label C S stats_label M F K A F L J stats_int
peaks_label: ${ascii('peaks=')}
troughs_label: ${ascii(' troughs=')}
turns_label: ${ascii(' turns=')}
${helpers}`,
    examples:[{input:'1 3 3 2 2 4',output:'peaks=1 troughs=1 turns=2'},{input:'4 4 4',output:'peaks=0 troughs=0 turns=0'},{input:'3 2 1 2 1',output:'peaks=1 troughs=1 turns=2'},{input:'',error:true}],
  },
];
