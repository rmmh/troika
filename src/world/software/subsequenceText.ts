import type { TextSoftware } from './native';
import { PAIR_SPLIT } from './search';

export const SUBSEQUENCE_TEXT_SOFTWARE:TextSoftware[] = [
  {
    number:164,kind:'text',id:'shortest-merge',site:'loom',title:'Shortest Sequence Merge',
    description:'Enter first|second. Produces a shortest string containing each input as a subsequence, preserving character order while allowing gaps. Matching is case-sensitive; only the first | separates the inputs. When equally short merges are possible, take the next character from the first input. Empty inputs are allowed. Native suffix dynamic programming constructs the result, rather than merely reporting a length.',
    inputs:['First|second'],outputs:['Shortest merge'],
    algorithm:`app_compute: C S app_split N A Z O S P W 3900 G W 3901 J W 3902 H W 3903 K M L K I L 1 W 3904 L
merge_row: R K 3903
merge_cell: M I H P I L A I K A I 3100 R E 3902 R F 3903
 ife H E M D F S D K J merge_store end ife K F M D E S D H J merge_store end
 R B 3900 A B H R E B R B 3901 A B K R F B M B I A B L
 ife E F I B 1 R D B else R D B M E I/1 ifl E D M D E end end I D 1
merge_store: W I D I K -1 ifg K -1 J merge_cell end I H -1 ifg H -1 J merge_row end M H Z M K Z
merge_trace: R E 3902 R F 3903 ife H E ife K F M A Z O S P end J merge_second end ife K F J merge_first end
 R B 3900 A B H R E B R B 3901 A B K R F B ife E F M A E C S app_put I H 1 I K 1 J merge_trace end
 M I H P I L A I K A I 3100 M B I A B L R D B M E I/1 ifg D E J merge_second end
merge_first: R B 3900 A B H R A B C S app_put I H 1 J merge_trace
merge_second: R B 3901 A B K R A B C S app_put I K 1 J merge_trace
${PAIR_SPLIT}
app_bad: M A -1 O S P`,
    examples:[{input:'ab|bc',output:'abc'},{input:'ab|ba',output:'aba'},{input:'cat|car',output:'catr'},{input:'|hello',output:'hello'},{input:'|',output:''},{input:'missing',error:true}],
  },
  {
    number:165,kind:'text',id:'pal-subsequence',site:'riddles',title:'Palindrome Subsequence',
    description:'Enter up to 27 characters. Finds a longest palindromic subsequence: characters remain in order but may have gaps. Matching is case-sensitive, including spaces and punctuation. Equal endpoint characters are retained; otherwise equal-length alternatives discard the left endpoint. Empty input produces empty output. Native interval dynamic programming and traceback produce an actual palindrome, distinct from searching for a contiguous palindrome.',
    inputs:['Text (max 27)'],outputs:['Palindrome'],
    algorithm:`app_compute: R L 2610 ifg L 27 J app_bad end ife L Z M A Z O S P end W 3900 L M D L P D L M I 3100
pal_clear: W I Z I I 1 I D -1 N D Z J pal_clear M H L I H -1
pal_row: M K H
pal_cell: M I H P I L A I K A I 3100 ife H K M D 1 J pal_store end M B H A B 2552 R E B M B K A B 2552 R F B M B I A B L
 ife E F I B -1 R D B I D 2 else R D B M E I/-1 ifg E D M D E end end
pal_store: W I D I K 1 ifl K L J pal_cell end I H -1 ifg H -1 J pal_row end M H Z M K L I K -1 M J Z
pal_trace: ifg H K J pal_tail end M B H A B 2552 R E B M B K A B 2552 R F B
 ife E F M A E C S app_put ifl H K M B J A B 3920 W B E I J 1 end I H 1 I K -1 J pal_trace end
 M I H P I L A I K A I 3100 M B I A B L R D B M E I/-1 ifl D E I K -1 else I H 1 end J pal_trace
pal_tail: I J -1 ifl J Z M A Z O S P end M B J A B 3920 R A B C S app_put J pal_tail
app_bad: M A -1 O S P`,
    examples:[{input:'character',output:'carac'},{input:'bbbab',output:'bbbb'},{input:'abc',output:'c'},{input:'',output:''},{input:'x'.repeat(28),error:true}],
  },
];
