import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';
const bad='app_bad: M A -1 O S P';
export const PERMUTATION_SOFTWARE:TextSoftware[] = [
  {
    number:138,kind:'text',id:'next-permutation',site:'typecase',title:'Next text permutation',
    description:'Finds the next distinct rearrangement of your text in ascending ASCII order. Spaces, punctuation, case and repeated characters are significant. Accepts up to 54 characters. Prints NONE if the input is already the last arrangement, including empty or one-character input. Native pivot, swap and suffix reversal avoid enumerating all permutations.',
    inputs:['Text'],outputs:['Next arrangement'],
    algorithm:`app_compute: R L 2610 M J Z
next_copy: ifge J L J next_start end M I 2552 A I J R E I M I 2900 A I J W I E I J 1 J next_copy
next_start: M G L I G -2
next_pivot: ifl G Z M A 78 C S app_put M A 79 C S app_put M A 78 C S app_put M A 69 J app_put end M I 2900 A I G R H I M E I/1 ifl H E J next_swap end I G -1 J next_pivot
next_swap: M J L I J -1
next_larger: M I 2900 A I J R E I ifle E H I J -1 J next_larger end W I H M I 2900 A I G W I E I G 1 M J L I J -1
next_reverse: ifge G J J next_emit end M I 2900 A I G R E I M K 2900 A K J R F K W I F W K E I G 1 I J -1 J next_reverse
next_emit: M J 2900 M K L
next_print: R A J C S app_put I J 1 I K -1 N K Z J next_print M A Z O S P`,
    examples:[{input:'abca',output:'acab'},{input:'aabb',output:'abab'},{input:'cba',output:'NONE'},{input:'',output:'NONE'}],
  },
  {
    number:139,kind:'text',id:'permutation-rank',site:'cardtable',title:'Permutation rank',
    description:'Enter a permutation of digits 0 through n-1 with no separators, for n in 1..7. Reports its zero-based position in lexicographic order using native inversion counts and factorial weights. For example 012 has rank zero and 210 has rank five. Repeated, missing or out-of-range digits are errors. The largest rank is 5039.',
    inputs:['Digit ordering'],outputs:['Zero-based rank'],
    algorithm:`app_compute: R L 2610 ifl L 1 J app_bad end ifg L 7 J app_bad end M J Z M G Z
rank_digit: M I 2552 A I J R H I S H 48 ifl H Z J app_bad end ifge H L J app_bad end M K Z
rank_unique: ifge K J J rank_count end M I 2552 A I K R E I S E 48 E E H J app_bad I K 1 J rank_unique
rank_count: M K J I K 1 M D Z
rank_smaller: ifge K L J rank_accumulate end M I 2552 A I K R E I S E 48 ifl E H I D 1 end I K 1 J rank_smaller
rank_accumulate: M E L S E J P G E A G D I J 1 ifl J L J rank_digit end M F G J stats_int
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'012',output:'0'},{input:'210',output:'5'},{input:'2301',output:'16'},{input:'6543210',output:'5039'},{input:'001',error:true}],
  },
  {
    number:140,kind:'text',id:'permutation-at',site:'cardtable',title:'Permutation at rank',
    description:'Enter a size in 1..7 and a zero-based rank separated by one space. Reconstructs the corresponding lexicographic permutation of digits 0 through size-1 using native factorial division and selection without generating earlier permutations. Rank must be below size factorial (at most 5039). No signs or surrounding spaces are accepted; leading zeros in the rank are allowed.',
    inputs:['Size rank'],outputs:['Digit ordering'],
    algorithm:`app_compute: R E 2610 ifl E 3 J app_bad end R L 2552 S L 48 ifl L 1 J app_bad end ifg L 7 J app_bad end R E 2553 ifn E 32 J app_bad end M J 2 M G Z
at_parse: R E 2610 ifge J E J at_factorial end M I 2552 A I J R E I ifl E 48 J app_bad end ifg E 57 J app_bad end ifg G 503 J app_bad end P G 10 S E 48 A G E ifg G 5039 J app_bad end I J 1 J at_parse
at_factorial: M H 1 M J 1
at_product: P H J I J 1 ifle J L J at_product end ifge G H J app_bad end M J Z
at_digits: M I 2900 A I J W I J I J 1 ifl J L J at_digits end M K L
at_select: M A H M B K C S app_div M H A M A G M B H C S app_div M G C M J A M I 2900 A I J R A I A A 48 C S app_put
at_shift: M E K I E -1 ifge J E J at_next end M I 2900 A I J M E I/1 W I E I J 1 J at_shift
at_next: I K -1 N K Z J at_select M A Z O S P
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'3 5',output:'210'},{input:'4 16',output:'2301'},{input:'7 5039',output:'6543210'},{input:'1 0',output:'0'},{input:'3 6',error:true}],
  },
];
