import type { TextSoftware } from './native';
import { PAIR_SPLIT } from './search';
export const TEXT_DIFF_SOFTWARE:TextSoftware = {
  number:151,kind:'text',id:'text-diff',site:'letters',title:'Minimum Text Edit Script',
  description:'Enter old|new (only the first | separates them). Prints a minimum-cost Levenshtein edit script: =c keeps c, -c deletes c, +c inserts c, and ~ab replaces a with b. Records are separated by spaces; characters inside records are literal, including spaces and punctuation. Ties prefer a diagonal keep/replace, then deletion, then insertion during backward tracing. Empty-to-empty has an empty script. All matching and traceback run natively.',
  inputs:['Old|new'],outputs:['Edit script'],
  algorithm:`app_compute: C S app_split N A Z O S P W 3900 G W 3901 J W 3902 H W 3903 K I K 1 W 3904 K M J Z
 diff_first: M I 3100 A I J W I J I J 1 ifl J K J diff_first end M H 1
 diff_row: R E 3902 ifg H E J diff_trace_start end R L 3904 M I H P I L A I 3100 W I H M K 1
 diff_cell: R E 3903 ifg K E I H 1 J diff_row end M I H P I L A I K A I 3100 M B I S B L R D B I B -1 R E B M F I/-1 I D 1 I F 1
 R B 3900 A B H I B -1 R G B R B 3901 A B K I B -1 R J B ifn G J I E 1 end ifl D E M E D end ifl F E M E F end W I E I K 1 J diff_cell
 diff_trace_start: R H 3902 R K 3903 M L Z
 diff_trace: ife H Z ife K Z J diff_emit_start end end R E 3904 M I H P I E A I K A I 3100 R D I
 ifg H Z ifg K Z M B I S B E I B -1 R E B R B 3900 A B H I B -1 R G B R B 3901 A B K I B -1 R J B M A 61 ifn G J I E 1 M A 126 end ife E D I H -1 I K -1 J diff_record end end end
 ifg H Z R E 3904 M B I S B E R E B I E 1 ife E D R B 3900 A B H I B -1 R G B M A 45 I H -1 J diff_record end end
 R B 3901 A B K I B -1 R J B M A 43 I K -1
 diff_record: M I L P I 3 A I 2900 W I A M I/1 G M I/2 J I L 1 J diff_trace
 diff_emit_start: I L -1
 diff_emit: ifl L Z M A Z O S P end R E 2620 ifn E Z M A 32 C S app_put end M I L P I 3 A I 2900 R G I M H I/1 M K I/2 M A G C S app_put M A H ife G 43 M A K end C S app_put ife G 126 M A K C S app_put end I L -1 J diff_emit
${PAIR_SPLIT}
app_bad: M A -1 O S P`,
  examples:[{input:'cat|cut',output:'=c ~au =t'},{input:'ab|a',output:'=a -b'},{input:'|hi',output:'+h +i'},{input:'|',output:''},{input:'missing',error:true}],
};
