import type { TextSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const bad='app_bad: M A -1 O S P';
export const BURROWS_WHEELER_SOFTWARE:TextSoftware[] = [
  {
    number:143,kind:'text',id:'bwt-write',site:'cassettes',title:'Burrows-Wheeler writer',
    description:'Transforms up to 48 printable characters by sorting cyclic rotations in ASCII order. Outputs a two-digit original-row index, a | separator and the last column. Equal rotations retain their original offset order. Empty input becomes 00|. This reversible rearrangement groups repeated symbols for later compression but does not itself shorten text. The paired reader accepts its output.',
    inputs:['Text (max 48)'],outputs:['Row and column'],
    algorithm:`app_compute: R L 2610 ifg L 48 J app_bad end M J Z
bwt_init: ifge J L J bwt_sort_start end M I 2900 A I J W I J I J 1 J bwt_init
bwt_sort_start: M J 1
bwt_sort: ifge J L J bwt_find_start end M I 2900 A I J R G I M K J I K -1
bwt_compare: ifl K Z J bwt_place end M I 2900 A I K R H I M D Z
bwt_character: ifge D L J bwt_place end M I G A I D ifge I L S I L end A I 2552 R E I M I H A I D ifge I L S I L end A I 2552 R F I ifl E F J bwt_shift end ifg E F J bwt_place end I D 1 J bwt_character
bwt_shift: M I 2901 A I K W I H I K -1 J bwt_compare
bwt_place: M I 2901 A I K W I G I J 1 J bwt_sort
bwt_find_start: M J Z E L Z J bwt_header
bwt_find: M I 2900 A I J R E I E E Z J bwt_header I J 1 J bwt_find
bwt_header: M A J M B 10 C S app_div M D C A A 48 C S app_put M A D A A 48 C S app_put M A 124 C S app_put M J Z
bwt_column: ifge J L M A Z O S P end M I 2900 A I J R I I I I -1 ifl I Z A I L end A I 2552 R A I C S app_put I J 1 J bwt_column
${POSITIVE_DIVISION}
${bad}`,
    examples:[{input:'banana',output:'03|nnbaaa'},{input:'abab',output:'00|bbaa'},{input:'',output:'00|'},{input:'x'.repeat(49),error:true}],
  },
  {
    number:144,kind:'text',id:'bwt-read',site:'cassettes',title:'Burrows-Wheeler reader',
    description:'Reads the paired writer format: two decimal row-index digits, |, then up to 48 last-column characters. Native last-to-first mapping reconstructs the text, including repeated characters and spaces. Empty data requires row 00; otherwise the row must be below the column length. Malformed headers and oversized columns are errors. Use blocks produced by the writer; arbitrary columns are not checked for a canonical rotation matrix.',
    inputs:['Row|column'],outputs:['Restored text'],
    algorithm:`app_compute: R L 2610 ifl L 3 J app_bad end I L -3 ifg L 48 J app_bad end R E 2554 ifn E 124 J app_bad end R G 2552 R H 2553 ifl G 48 J app_bad end ifg G 57 J app_bad end ifl H 48 J app_bad end ifg H 57 J app_bad end S G 48 P G 10 S H 48 A G H W 3100 G
 ife L Z N G Z J app_bad M A Z O S P end ifge G L J app_bad end M J Z
bwt_map: M I 2555 A I J R G I M H Z M K Z
bwt_count: M I 2555 A I K R E I ifl E G I H 1 else ife E G ifl K J I H 1 end end end I K 1 ifl K L J bwt_count end M I 2900 A I J W I H I J 1 ifl J L J bwt_map end R J 3100 M K L I K -1
bwt_restore: M I 2555 A I J R E I M I 3000 A I K W I E M I 2900 A I J R J I I K -1 ifge K Z J bwt_restore end M J Z
bwt_output: M I 3000 A I J R A I C S app_put I J 1 ifl J L J bwt_output end M A Z O S P
${bad}`,
    examples:[{input:'03|nnbaaa',output:'banana'},{input:'00|bbaa',output:'abab'},{input:'00|',output:''},{input:'02|aa',error:true},{input:'0|x',error:true}],
  },
];
