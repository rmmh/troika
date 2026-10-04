import type { TextSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const bad='app_bad: M A -1 O S P';
export const COMPRESSION_SOFTWARE:TextSoftware[] = [
  {
    number:134,kind:'text',id:'lz-pack',site:'archivist',title:'Text back-reference packer',
    description:'Packs up to 54 printable characters using a small documented LZ-style format. Literals copy unchanged except ~ becomes ~~. A reference ~DDLL copies LL characters from distance DD, both two decimal digits. The guest chooses the longest match, then nearest distance, and emits references only for lengths at least six. Packed output must fit 54 characters for pasting into the unpacker; expansion beyond that is an error.',
    inputs:['Text'],outputs:['Packed text'],
    algorithm:`app_compute: M G Z
lz_position: R E 2610 ifge G E J lz_done end M H Z M L Z M J 1
lz_distance: ifg J G J lz_emit end M K Z
lz_match: M I G A I K R E 2610 ifge I E J lz_candidate end A I 2552 R E I S I J R F I ifn E F J lz_candidate end I K 1 J lz_match
lz_candidate: ifg K H M H K M L J end I J 1 J lz_distance
lz_emit: ifge H 6 M A 126 C S app_put M A L C S lz_pair_emit M A H C S lz_pair_emit A G H else M I 2552 A I G R A I M D A C S app_put ife D 126 M A 126 C S app_put end I G 1 end J lz_position
lz_done: R E 2620 ifg E 54 J app_bad end M A Z O S P
lz_pair_emit: M B 10 C S app_div M D C A A 48 C S app_put M A D A A 48 C S app_put M A Z O S P
${POSITIVE_DIVISION}
${bad}`,
    examples:[{input:'abcabcabc',output:'abc~0306'},{input:'a'.repeat(54),output:'a~0153'},{input:'~',output:'~~'},{input:'hello',output:'hello'},{input:'',output:''}],
  },
  {
    number:135,kind:'text',id:'lz-unpack',site:'archivist',title:'Text back-reference reader',
    description:'Unpacks the paired text format: ordinary characters are literals, ~~ means a literal tilde, and ~DDLL copies LL characters from distance DD. DD is 01..99 and must not exceed output already produced; LL is 03..99. Copies may overlap, so a~0106 expands to seven a characters. Encoded input is at most 54 characters; output is bounded to 162. Truncated tokens, bad digits, impossible distances and overflow report errors.',
    inputs:['Packed text'],outputs:['Unpacked text'],
    algorithm:`app_compute: M J 2552 R K 2610
lz_read: E K Z M A Z E K Z O S P R A J I J 1 I K -1 ifn A 126 C S app_put N A Z O S P J lz_read end E K Z J app_bad R A J
 ife A 126 I J 1 I K -1 C S app_put N A Z O S P J lz_read end ifl K 4 J app_bad end
 C S lz_pair_read N A Z O S P M G D C S lz_pair_read N A Z O S P M H D E G Z J app_bad ifl H 3 J app_bad end R E 2620 ifg G E J app_bad end A E H ifg E 162 J app_bad end
lz_copy: R I 2620 A I 2700 S I G R A I C S app_put N A Z O S P I H -1 N H Z J lz_copy J lz_read
lz_pair_read: M D Z M F 2
lz_digit: R E J ifl E 48 J app_bad end ifg E 57 J app_bad end P D 10 S E 48 A D E I J 1 I K -1 I F -1 N F Z J lz_digit M A Z O S P
${bad}`,
    examples:[{input:'abc~0306',output:'abcabcabc'},{input:'a~0153',output:'a'.repeat(54)},{input:'~~~0103',output:'~~~~'},{input:'~0103',error:true},{input:'a~0102',error:true},{input:'',output:''}],
  },
];
