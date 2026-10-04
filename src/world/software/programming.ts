import type { TextSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const bad='app_bad: M A -1 O S P';
/** Signed decimal output in F, preserving G..L; no host formatter. */
const decimal=`dev_int: ifl F Z M A 45 C S app_put P F -1 end M D 1000 M I Z
int_digit: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S app_put end E D 1 M A Z E D 1 O S P Q D 10 J int_digit
${POSITIVE_DIVISION}`;
const label=`dev_label: M I A
label_next: R A I E A Z O S P C S app_put I I 1 J label_next`;
/** G/H operands -> F result, A status; preserves operands and J/K/L. */
const checked=`math_add: ifg H Z M E 9841 S E H ifg G E J app_bad end else ifl H Z M E -9841 S E H ifl G E J app_bad end end end M F G A F H M A Z O S P
math_multiply: ife H Z M F Z M A Z O S P end M A 9841 M B H F B A C S app_div M F G F F A ifg F A J app_bad end M F G P F H M A Z O S P`;

export const PROGRAMMING_SOFTWARE: TextSoftware[] = [
  {
    number:101,kind:'text',id:'stack-calc',site:'ada',title:'Checked Stack Calculator',
    description:'Space-separated postfix tokens: signed integers -9841..9841; + - * / %; d duplicates, s swaps, x drops, n negates. Division truncates toward zero and remainder follows the dividend. Exactly one value must remain. Stack underflow, division by zero and arithmetic overflow are errors; nothing silently wraps.',
    inputs:['Postfix program'],outputs:['Integer result'],
    algorithm:`app_compute: M J 2552 R K 2610 W 3000 Z
calc_space: E K Z J calc_done R E J ife E 32 I J 1 I K -1 J calc_space end M G J M H Z
calc_token: E K Z J calc_dispatch R E J E E 32 J calc_dispatch I J 1 I K -1 I H 1 J calc_token
calc_dispatch: R E G ife H 1 W 3001 E E E 100 J calc_dup E E 115 J calc_swap E E 120 J calc_drop E E 110 J calc_neg E E 43 J calc_binary E E 45 J calc_binary E E 42 J calc_binary E E 47 J calc_binary E E 37 J calc_binary end
 M L 1 ife E 45 M L -1 I G 1 I H -1 else ife E 43 I G 1 I H -1 end end E H Z J app_bad M F Z
calc_number: R E G ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 ifg F 984 J app_bad end ife F 984 ifg E 1 J app_bad end end P F 10 A F E I G 1 I H -1 N H Z J calc_number P F L J calc_push
calc_dup: R E 3000 E E Z J app_bad M I 2899 A I E R F I J calc_push
calc_drop: R E 3000 E E Z J app_bad I E -1 W 3000 E J calc_space
calc_neg: R E 3000 E E Z J app_bad M I 2899 A I E R F I P F -1 W I F J calc_space
calc_swap: R E 3000 ifl E 2 J app_bad end M I 2899 A I E R F I M G I/-1 W I G M I/-1 F J calc_space
calc_binary: R E 3000 ifl E 2 J app_bad end I E -2 W 3000 E M I 2900 A I E R G I M H I/1 R E 3001
 E E 42 J calc_multiply E E 47 J calc_divide E E 37 J calc_divide ife E 45 P H -1 end C S math_add N A Z O S P J calc_push
calc_multiply: C S math_multiply N A Z O S P J calc_push
calc_divide: E H Z J app_bad M A G F A A M B H F B A C S app_div R E 3001 ife E 37 M F C else M F A ifl H Z P F -1 end end ifl G Z P F -1 end
calc_push: R E 3000 ifge E 27 J app_bad end M I 2900 A I E W I F I E 1 W 3000 E J calc_space
calc_done: R E 3000 N E 1 J app_bad R F 2900 J dev_int
${checked}
${decimal}
${bad}`,
    examples:[{input:'3 4 + 2 *',output:'14'},{input:'7 d * 2 /',output:'24'},{input:'7 -3 %',output:'1'},{input:'-7 3 /',output:'-2'},{input:'3 8 s - n',output:'-5'},{input:'2 3 x',output:'2'},{input:'9841 1 +',error:true},{input:'99 100 *',error:true},{input:'1 0 /',error:true},{input:'1 2',error:true},{input:'+',error:true}],
  },
  {
    number:102,kind:'text',id:'tape-lab',site:'adventure',title:'Bounded Tape Language Lab',
    description:'Runs Brainfuck-style + - < > [ ] . , over 27 wrapping byte cells. Other characters are comments; comma writes zero. Dot prints a byte as hex. Brackets must balance. Runs are limited to 2048 instructions and 32 output bytes; exceeding a limit replaces output with LIMIT or OUTPUT LIMIT plus the zero-based program counter, tape pointer and cell value. Each run resets the tape.',
    inputs:['Tape program'],outputs:['Hex / diagnostic'],
    algorithm:`app_compute: M G Z M H Z R K 2610
bf_match: ifge G K J bf_matched end M I 2552 A I G R E I ife E 91 M I 2900 A I H W I G I H 1 end
 ife E 93 E H Z J app_bad I H -1 M I 2900 A I H R E I M I 3000 A I G W I E M I 3000 A I E W I G end I G 1 J bf_match
bf_matched: N H Z J app_bad M I 3100 M E 27
bf_clear: W I Z I I 1 I E -1 N E Z J bf_clear M G Z M J Z W 3200 Z
bf_step: ifge G K M A Z O S P end ifge J 2048 M A @bf_limit J bf_diagnostic end I J 1 M I 2552 A I G R A I M I 3100 A I H R L I
 E A 43 J bf_plus E A 45 J bf_minus E A 62 J bf_right E A 60 J bf_left E A 46 J bf_output E A 44 J bf_input
 ife A 91 ife L Z M I 3000 A I G R G I end end ife A 93 ifn L Z M I 3000 A I G R G I end end J bf_next
bf_plus: I L 1 ife L 256 M L Z end W I L J bf_next
bf_minus: I L -1 ifl L Z M L 255 end W I L J bf_next
bf_right: I H 1 ife H 27 M H Z end J bf_next
bf_left: I H -1 ifl H Z M H 26 end J bf_next
bf_input: W I Z J bf_next
bf_output: R E 3200 ifge E 32 M A @bf_output_limit J bf_diagnostic end ifn E Z M A 32 C S app_put end I E 1 W 3200 E M A L M B 16 C S app_div M D C C S bf_hex C S app_put M A D C S bf_hex C S app_put
bf_next: I G 1 J bf_step
bf_hex: ifl A 10 A A 48 else A A 55 end O S P
bf_diagnostic: W 2620 Z C S dev_label M F G C S dev_int M A @bf_ptr C S dev_label M F H C S dev_int M A @bf_cell C S dev_label M I 3100 A I H R F I J dev_int
bf_limit: ${text('LIMIT pc=')}
bf_output_limit: ${text('OUTPUT LIMIT pc=')}
bf_ptr: ${text(' ptr=')}
bf_cell: ${text(' cell=')}
${label}
${decimal}
${bad}`,
    examples:[{input:'+++[>++<-]>.',output:'06'},{input:'-.+.',output:'FF 00'},{input:'<+.>.',output:'01 00'},{input:'+++,.',output:'00'},{input:'[++++].',output:'00'},{input:'+[]',output:'LIMIT pc=2 ptr=0 cell=1'},{input:'+[.]',output:'OUTPUT LIMIT pc=2 ptr=0 cell=1'},{input:'[',error:true},{input:']',error:true},{input:'',output:''}],
  },
];
