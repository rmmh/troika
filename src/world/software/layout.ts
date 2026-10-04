import type { TextSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
export const LAYOUT_SOFTWARE:TextSoftware[] = [
  {
    number:154,kind:'text',id:'paragraph-wrap',site:'paper',title:'Optimal Paragraph Wrap',
    description:'Enter width|paragraph, with width 1..27 in one or two decimal digits. Native dynamic programming chooses word-preserving lines minimizing squared unused width, excluding the last line. Equal costs prefer the longer first line. Spaces between words are normalized; other characters are literal. Words wider than the chosen width are errors. Output pads each nonfinal line to the 27-column display stride, so lines appear on separate rows. More than six display rows is an error.',
    inputs:['Width|paragraph'],outputs:['Wrapped lines'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z M H Z
wrap_width: E K Z J app_bad R E J I J 1 I K -1 E E 124 J wrap_width_done ifge H 2 J app_bad end ifl E 48 J app_bad end ifg E 57 J app_bad end P G 10 S E 48 A G E I H 1 J wrap_width
wrap_width_done: E H Z J app_bad ifl G 1 J app_bad end ifg G 27 J app_bad end W 3200 G M D Z
wrap_space: E K Z J wrap_parsed R E J ife E 32 I J 1 I K -1 J wrap_space end M G J M H Z
wrap_word: E K Z J wrap_save R E J E E 32 J wrap_save I H 1 I J 1 I K -1 J wrap_word
wrap_save: R E 3200 ifg H E J app_bad end M I D P I 2 A I 2900 W I G M I/1 H I D 1 J wrap_space
wrap_parsed: W 3201 D E D Z M A Z E D Z O S P M I 3000 A I D W I Z M H D I H -1
wrap_dp: ifl H Z J wrap_output end W 3202 9841 M J H M G Z
wrap_end: M I J P I 2 A I 2901 R E I ifg J H I G 1 end A G E R E 3200 ifg G E J wrap_store end M D J I D 1 R F 3201 ife D F M E Z else S E G P E E M I 3000 A I D R F I A E F end R F 3202 ifle E F W 3202 E W 3203 D end I J 1 R E 3201 ifl J E J wrap_end end
wrap_store: M I 3000 A I H R E 3202 W I E A I 100 R E 3203 W I E I H -1 J wrap_dp
wrap_output: M G Z
wrap_line: M I 3100 A I G R H I M L Z
wrap_emit_word: ifn L Z M A 32 C S app_put N A Z O S P I L 1 end M I G P I 2 A I 2900 R J I M K I/1
wrap_character: R A J C S app_put N A Z O S P I L 1 I J 1 I K -1 N K Z J wrap_character I G 1 ifl G H J wrap_emit_word end R E 3201 ifge G E M A Z O S P end
wrap_pad: ifge L 27 J wrap_line end M A 32 C S app_put N A Z O S P I L 1 J wrap_pad
app_bad: M A -1 O S P`,
    examples:[{input:'6|aaa bb c ddddd',output:'aaa'+' '.repeat(24)+'bb c'+' '.repeat(23)+'ddddd'},{input:'10|  a   b ',output:'a b'},{input:'1|ab',error:true},{input:'27|',output:''}],
  },
  {
    number:155,kind:'text',id:'tab-preview',site:'typecase',title:'Tab Stop Preview',
    description:'Enter a tab width 1..9, |, then text with literal escape sequences: \\t advances to the next tab stop, \\n starts a new 27-column display row, and \\\\ inserts a backslash. Other escapes are errors. Tab stops restart on each display row and are clipped at its edge. Ordinary characters wrap after column 27. Output is bounded to six rows (162 cells); overflow is an error. The input keyboard itself uses printable characters.',
    inputs:['Width|escaped'],outputs:['Expanded text'],
    algorithm:`app_compute: R E 2610 ifl E 2 J app_bad end R L 2552 S L 48 ifl L 1 J app_bad end ifg L 9 J app_bad end R E 2553 ifn E 124 J app_bad end M J 2554 R K 2610 I K -2 M G Z
tab_read: E K Z M A Z E K Z O S P R A J I J 1 I K -1 ifn A 92 C S tab_put N A Z O S P J tab_read end E K Z J app_bad R A J I J 1 I K -1 ife A 92 C S tab_put N A Z O S P J tab_read end M H 27 S H G ife A 110 J tab_spaces end ifn A 116 J app_bad end M A G M B L C S app_div M E L S E C ifl E H M H E end
tab_spaces: M A 32 C S tab_put N A Z O S P I H -1 N H Z J tab_spaces J tab_read
tab_put: C S app_put N A Z O S P I G 1 ife G 27 M G Z end O S P
${POSITIVE_DIVISION}
app_bad: M A -1 O S P`,
    examples:[{input:'4|a\\tb',output:'a   b'},{input:'4|a\\nb',output:'a'+' '.repeat(26)+'b'},{input:'8|\\\\',output:'\\'},{input:'4|\\x',error:true},{input:'3|',output:''}],
  },
];
