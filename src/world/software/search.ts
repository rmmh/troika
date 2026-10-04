import type { TextSoftware } from './native';

const bad = 'app_bad: M A -1 O S P';
const literal = (s:string) => [...s].map(c=>c.charCodeAt(0)).join(' ');
/** First | separates two immutable ASCII spans: G/H and J/K. */
export const PAIR_SPLIT = `app_split: M G 2552 M J G R K 2610 M H Z
split_scan: E K Z J app_bad R E J E E 124 J split_found I J 1 I K -1 I H 1 J split_scan
split_found: I J 1 I K -1 M A Z O S P`;
/** At most 27 space-delimited words, represented as pointer/length pairs. */
const words = `app_words: M J 2552 R K 2610 M L 2900 M D Z
words_next: E K Z J words_done R E J ife E 32 I J 1 I K -1 J words_next end M G J M H Z
words_scan: E K Z J words_save R E J E E 32 J words_save I H 1 I J 1 I K -1 J words_scan
words_save: W L G M L/1 H I L 2 I D 1 J words_next
words_done: W 3000 D M A Z O S P`;
/** Compare descriptors A/B lexicographically; return -1/0/1, preserve G/H/J/K/L. */
const compare = `app_compare: M I A R C I M D I/1 M I B R E I M F I/1
compare_next: ife D Z M A Z ifn F Z M A -1 end O S P end ife F Z M A 1 O S P end
 R A C R B E ifl A B M A -1 O S P end ifg A B M A 1 O S P end I C 1 I E 1 I D -1 I F -1 J compare_next`;

export const SEARCH_SOFTWARE: TextSoftware[] = [
  {
    number:57,kind:'text',id:'find-all',site:'archivist',title:'Find every occurrence',
    description:'Enter needle|text. Lists every zero-based character offset of the literal needle, including overlapping matches. Matching is case-sensitive; the needle must be nonempty. Only the first | is a separator. NONE means no matches.',
    inputs:['Needle|text'],outputs:['Match offsets'],
    algorithm:`app_compute: C S app_split N A Z O S P E H Z J app_bad M L Z
find_start: ifl K H J find_done end M B G M C J M D H
find_compare: R E B R F C N E F J find_advance I B 1 I C 1 I D -1 N D Z J find_compare
 R E 2620 ifn E Z M A 32 C S app_put end M F L C S app_decimal
find_advance: I J 1 I K -1 I L 1 J find_start
find_done: R E 2620 ife E Z M A @find_none M B 4 J app_emit end M A Z O S P
find_none: ${literal('NONE')}
${PAIR_SPLIT}
${bad}`,
    examples:[{input:'ana|banana',output:'1 3'},{input:'aa|aaaa',output:'0 1 2'},{input:'X|xxx',output:'NONE'},{input:'a|',output:'NONE'},{input:'|abc',error:true},{input:'abc',error:true},{input:'a|'+'a'.repeat(52),output:Array.from({length:52},(_,i)=>String(i)).join(' ')}],
  },
  {
    number:58,kind:'text',id:'edit-distance',site:'letters',title:'Levenshtein distance',
    description:'Enter first|second. Counts the minimum single-character insertions, deletions and substitutions transforming the first string into the second. Matching is case-sensitive. Empty strings are allowed; only the first | separates them.',
    inputs:['First|second'],outputs:['Edit distance'],
    algorithm:`app_compute: C S app_split N A Z O S P M I 2900 M E Z
edit_init: W I E I I 1 I E 1 ifle E K J edit_init end M D Z
edit_row: E H Z J edit_done R L 2900 I D 1 W 2900 D M I 2901 M B J M C K
edit_cell: E C Z J edit_advance R E I M F L R A B N A G/0 I F 1
 M A E I A 1 ifl A F M F A end M A I/-1 I A 1 ifl A F M F A end
 W I F M L E I I 1 I B 1 I C -1 J edit_cell
edit_advance: I G 1 I H -1 J edit_row
edit_done: M I 2900 A I K R F I J app_decimal
${PAIR_SPLIT}
${bad}`,
    examples:[{input:'kitten|sitting',output:'3'},{input:'Saturday|Sunday',output:'3'},{input:'|abc',output:'3'},{input:'abc|',output:'3'},{input:'|',output:'0'},{input:'a|A',output:'1'},{input:'missing',error:true}],
  },
  {
    number:59,kind:'text',id:'glob-match',site:'toolshed',title:'Wildcard pattern matcher',
    description:'Enter pattern|text. Matches the entire text: ? consumes one character and * consumes any number, including zero. Everything else is literal and case-sensitive. There is no escape syntax. Only the first | separates the two parts.',
    inputs:['Pattern|text'],outputs:['MATCH / NO MATCH'],
    algorithm:`app_compute: C S app_split N A Z O S P M I 2900 M E K I E 1
match_init: W I Z I I 1 I E -1 N E Z J match_init W 2900 1
match_row: E H Z J match_done R D G R L 2900 ifn D 42 W 2900 Z end M I 2901 M B J M C K
match_cell: E C Z J match_advance R E I M F Z
 ife D 42 M F E M A I/-1 ifn A Z M F 1 end else ifn L Z R A B ife D 63 M F 1 else ife D A M F 1 end end end end
 W I F M L E I I 1 I B 1 I C -1 J match_cell
match_advance: I G 1 I H -1 J match_row
match_done: M I 2900 A I K R E I ife E Z M A @match_no M B 8 else M A @match_yes M B 5 end J app_emit
match_yes: ${literal('MATCH')}
match_no: ${literal('NO MATCH')}
${PAIR_SPLIT}
${bad}`,
    examples:[{input:'a*b?d|axxxbcd',output:'MATCH'},{input:'a?c|ac',output:'NO MATCH'},{input:'*|',output:'MATCH'},{input:'|',output:'MATCH'},{input:'|a',output:'NO MATCH'},{input:'a*|A',output:'NO MATCH'},{input:'a**b|ab',output:'MATCH'},{input:'none',error:true}],
  },
  {
    number:60,kind:'text',id:'lcs-length',site:'loom',title:'Shared subsequence length',
    description:'Enter first|second. Finds the length of their longest common subsequence: characters stay in order but need not be adjacent. Case-sensitive, with empty strings allowed. Only the first | is a separator.',
    inputs:['First|second'],outputs:['Subsequence size'],
    algorithm:`app_compute: C S app_split N A Z O S P M I 2900 M E K I E 1
lcs_init: W I Z I I 1 I E -1 N E Z J lcs_init
lcs_row: E H Z J lcs_done M L Z M I 2901 M B J M C K
lcs_cell: E C Z J lcs_advance R E I R A B R F G
 ife A F M F L I F 1 else M F E M A I/-1 ifg A F M F A end end
 W I F M L E I I 1 I B 1 I C -1 J lcs_cell
lcs_advance: I G 1 I H -1 J lcs_row
lcs_done: M I 2900 A I K R F I J app_decimal
${PAIR_SPLIT}
${bad}`,
    examples:[{input:'ABCBDAB|BDCABA',output:'4'},{input:'abc|axbyc',output:'3'},{input:'abc|cba',output:'1'},{input:'ABC|abc',output:'0'},{input:'|abc',output:'0'},{input:'abc|',output:'0'},{input:'',error:true}],
  },
  {
    number:61,kind:'text',id:'word-sort',site:'typecase',title:'Word-list sorter',
    description:'Sorts space-separated words in raw ASCII order, preserving duplicates. Uppercase sorts before lowercase. Punctuation belongs to its word. Leading/trailing spaces disappear and separators become one space.',
    inputs:['Word list'],outputs:['Sorted words'],
    algorithm:`app_compute: C S app_words R G 3000
sort_pass: ifl G 2 J sort_output end M H G I H -1 M J 2900
sort_pair: M A J M B J I B 2 C S app_compare
 ifg A Z R C J M D J/1 M E J/2 M F J/3 W J E M J/1 F M J/2 C M J/3 D end
 I J 2 I H -1 N H Z J sort_pair I G -1 J sort_pass
sort_output: M G 2900 R H 3000
sort_word: E H Z M A Z E H Z O S P R E 2620 ifn E Z M A 32 C S app_put end
 R J G M K G/1
sort_copy: R A J C S app_put I J 1 I K -1 N K Z J sort_copy I G 2 I H -1 J sort_word
${words}
${compare}`,
    examples:[{input:'pear apple banana apple',output:'apple apple banana pear'},{input:' a A aa Z ',output:'A Z a aa'},{input:'word',output:'word'},{input:'   ',output:''},{input:'a '.repeat(27),output:Array(27).fill('a').join(' ')}],
  },
  {
    number:62,kind:'text',id:'unique-words',site:'zine',title:'Distinct word collector',
    description:'Keeps the first occurrence of each space-separated word in original order. Words are case-sensitive and punctuation remains part of a word. Whitespace is normalized to single spaces.',
    inputs:['Word list'],outputs:['Distinct words'],
    algorithm:`app_compute: C S app_words M G Z R H 3000
unique_word: E G H M A Z E G H O S P M J G P J 2 A J 2900 M K Z
unique_check: E K G J unique_copy M A J M B K P B 2 A B 2900 C S app_compare E A Z J unique_next I K 1 J unique_check
unique_copy: R E 2620 ifn E Z M A 32 C S app_put end R A J M B J/1 C S app_emit
unique_next: I G 1 J unique_word
${words}
${compare}`,
    examples:[{input:'red blue red RED blue',output:'red blue RED'},{input:'a ab a ab a',output:'a ab'},{input:' word word, word ',output:'word word,'},{input:'',output:''},{input:'x '.repeat(27),output:'x'}],
  },
  {
    number:63,kind:'text',id:'common-prefix',site:'keys',title:'Common word prefix',
    description:'Finds the longest shared starting text of every space-separated word. Comparison is case-sensitive. One word returns itself; no words or no shared prefix returns an empty result. Punctuation is literal.',
    inputs:['Word list'],outputs:['Shared prefix'],
    algorithm:`app_compute: C S app_words R K 3000 E K Z M A Z E K Z O S P R G 2900 R H 2901 M J 2902 I K -1
prefix_word: E K Z J prefix_done E H Z J prefix_done R B J M C J/1 ifl C H M H C end M L Z
prefix_char: ifge L H J prefix_next end M I G A I L R E I R F B ifn E F M H L J prefix_next end I B 1 I L 1 J prefix_char
prefix_next: I J 2 I K -1 J prefix_word
prefix_done: M A G M B H J app_emit
${words}`,
    examples:[{input:'flower flow flight',output:'fl'},{input:'interstellar internet internal',output:'inter'},{input:'abc ab a',output:'a'},{input:'a A',output:''},{input:'  only  ',output:'only'},{input:'',output:''}],
  },
  {
    number:64,kind:'text',id:'word-frequency',site:'iris',title:'Most frequent word',
    description:'Reports the most frequent space-separated word followed by its count. Matching is case-sensitive, punctuation is literal, and ties choose the earliest word. NONE means the input has no words.',
    inputs:['Word list'],outputs:['Word: count'],
    algorithm:`app_compute: C S app_words R H 3000 ife H Z M A @freq_none M B 4 J app_emit end W 3001 Z M G Z
freq_word: E G H J freq_done M J G P J 2 A J 2900 M K Z M L Z
freq_compare: M A J M B K P B 2 A B 2900 C S app_compare E A Z I L 1 I K 1 ifl K H J freq_compare end
 R E 3001 ifg L E W 3001 L W 3002 J end I G 1 J freq_word
freq_done: R I 3002 R A I M B I/1 C S app_emit M A 58 C S app_put M A 32 C S app_put R F 3001 J app_decimal
freq_none: ${literal('NONE')}
${words}
${compare}`,
    examples:[{input:'one two two three one two',output:'two: 3'},{input:'b a a b',output:'b: 2'},{input:'A a a',output:'a: 2'},{input:'x '.repeat(27),output:'x: 27'},{input:'  ',output:'NONE'}],
  },
];
