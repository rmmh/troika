import type { TextSoftware } from './native';
import { PAIR_SPLIT } from './search';
const bad='app_bad: M A -1 O S P';

export const PATTERN_SOFTWARE: TextSoftware[] = [
  {
    number:107,kind:'text',id:'palindrome-span',site:'riddles',title:'Longest palindrome span',
    description:'Extracts the longest contiguous palindrome from up to 54 printable ASCII characters. Matching is case-sensitive and includes spaces and punctuation. Equal-length spans prefer the earliest start. Empty input produces empty output. Unlike the phrase checker, this tool searches inside arbitrary text.',
    inputs:['Text'],outputs:['Palindrome'],
    algorithm:`app_compute: R H 2610 E H Z M A Z E H Z O S P
pal_length: M G Z
pal_start: M E G A E H R F 2610 ifg E F I H -1 J pal_length end M I 2552 A I G M J I A J H I J -1
pal_pair: ifge I J M A 2552 A A G M B H J app_emit end R E I R F J ifn E F I G 1 J pal_start end I I 1 I J -1 J pal_pair`,
    examples:[{input:'banana',output:'anana'},{input:'abacdc',output:'aba'},{input:'Aa',output:'A'},{input:'a b a',output:'a b a'},{input:'',output:''}],
  },
  {
    number:108,kind:'text',id:'repeat-unit',site:'loom',title:'Smallest repeating unit',
    description:'Extracts the shortest unit whose whole-number repetitions reproduce the complete input exactly. Case, spaces and punctuation matter. An input with no smaller unit returns itself; an empty input returns empty. Partial repetitions do not qualify.',
    inputs:['Pattern'],outputs:['Unit'],
    algorithm:`app_compute: R L 2610 E L Z M A Z E L Z O S P M H 1
unit_candidate: M E L
unit_divides: ifge E H S E H J unit_divides end ifn E Z J unit_next end M K H M D Z
unit_compare: ifge K L M A 2552 M B H J app_emit end M I 2552 A I K R E I M I 2552 A I D R F I N E F J unit_next I K 1 I D 1 ife D H M D Z end J unit_compare
unit_next: I H 1 J unit_candidate`,
    examples:[{input:'abcabcabc',output:'abc'},{input:'abababa',output:'abababa'},{input:'zzzz',output:'z'},{input:'Abab',output:'Abab'},{input:'',output:''}],
  },
  {
    number:109,kind:'text',id:'rotation-offset',site:'typecase',title:'Cyclic rotation finder',
    description:'Enter original|target. Finds the smallest left-rotation offset that transforms the original into the target, or NONE if no rotation does. Both strings must have equal length; comparison is case-sensitive. Only the first vertical bar separates the strings. Empty strings match at offset zero.',
    inputs:['Original|target'],outputs:['Left shift'],
    algorithm:`app_compute: C S app_split N A Z O S P ifn H K J rotation_none end M L Z E H Z J rotation_found
rotation_start: ifge L H J rotation_none end M D Z
rotation_compare: ifge D H J rotation_found end M I L A I D ifge I H S I H end A I G R E I M I J A I D R F I ifn E F I L 1 J rotation_start end I D 1 J rotation_compare
rotation_found: M F L J app_decimal
rotation_none: M A @none M B 4 J app_emit
none: 78 79 78 69
${PAIR_SPLIT}
${bad}`,
    examples:[{input:'abcde|cdeab',output:'2'},{input:'abab|baba',output:'1'},{input:'abc|acb',output:'NONE'},{input:'a|aa',output:'NONE'},{input:'|',output:'0'},{input:'abc',error:true}],
  },
  {
    number:110,kind:'text',id:'common-span',site:'letters',title:'Longest common text span',
    description:'Enter first|second. Extracts the longest contiguous substring present in both strings, preserving case and punctuation. Ties prefer the earliest start in the first string. Empty inputs or no shared characters produce empty output. Only the first vertical bar separates the strings. Unlike a subsequence, a span cannot skip characters.',
    inputs:['First|second'],outputs:['Shared span'],
    algorithm:`app_compute: C S app_split N A Z O S P W 3000 G W 3001 H W 3002 J W 3003 K M G Z M L Z W 3004 Z
common_first: R E 3001 ifge G E J common_done end M H Z
common_second: R E 3003 ifge H E I G 1 J common_first end M D Z
common_compare: M E G A E D R F 3001 ifge E F J common_save end M I H A I D R F 3003 ifge I F J common_save end R F 3000 A E F R B E R F 3002 A I F R C I ifn B C J common_save end I D 1 J common_compare
common_save: ifg D L M L D W 3004 G end I H 1 J common_second
common_done: R A 3000 R E 3004 A A E M B L J app_emit
${PAIR_SPLIT}
${bad}`,
    examples:[{input:'troika|rejoice',output:'oi'},{input:'abcXYZ|XYZabc',output:'abc'},{input:'banana|ananas',output:'anana'},{input:'cat|DOG',output:''},{input:'|abc',output:''},{input:'abc',error:true}],
  },
];
