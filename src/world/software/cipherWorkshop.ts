import type {TextSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const COMMON=`cw_bad: M A -1 O S P
cw_upper: ifge A 97 ifle A 122 S A 32 end end O S P
; A is a small signed integer; reduce modulo 26 to0..25.
cw_mod: ifl A Z A A 26 J cw_mod end ifge A 26 S A 26 J cw_mod end O S P
cw_two: ifl F 10 M A 48 C S app_put end J app_decimal
cw_pad: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put N A Z O S P J cw_pad`;
const KEYED=`cw_parse: R E 2610 ifl E 4 J cw_bad end R A 2552 C S cw_upper ife A 69 W 3100 Z else ife A 68 W 3100 1 else J cw_bad end end R E 2553 N E 124 J cw_bad M J 2554 R K 2610 I K -2 M G Z
cw_key: E K Z J cw_bad R A J E A 124 J cw_key_end C S cw_upper ifl A 65 J cw_bad end ifg A 90 J cw_bad end ifge G 8 J cw_bad end M I 3000 A I G W I A I G 1 I J 1 I K -1 J cw_key
cw_key_end: E G Z J cw_bad W 3101 G I J 1 I K -1 W 3102 K M I 3200
cw_text: E K Z M A Z E K Z O S P R A J C S cw_upper ifn A 32 ifl A 65 J cw_bad end ifg A 90 J cw_bad end end W I A I I 1 I J 1 I K -1 J cw_text`;
const caesar=`app_compute: R G 2610 E G Z J cw_bad M J 2552 M I 3200 M K G W 3110 Z
ca_validate: R A J C S cw_upper ifn A 32 ifl A 65 J cw_bad end ifg A 90 J cw_bad end R E 3110 I E 1 W 3110 E end W I A I I 1 I J 1 I K -1 N K Z J ca_validate R E 3110 E E Z J cw_bad W 3100 Z
ca_rotation: M G Z M J 3200 R K 2610
ca_score: R A J ifn A 32 S A 65 R E 3100 S A E C S cw_mod M I @ca_weights A I A R E I A G E end I J 1 I K -1 N K Z J ca_score R E 3100 M I 3000 A I E W I G I E 1 W 3100 E ifl E 26 J ca_rotation end W 3101 Z
ca_rank: M G -1 M H Z M L Z
ca_best: M I 3000 A I L R E I ifg E G M G E M H L end I L 1 ifl L 26 J ca_best end W 3102 H W 3103 G M I 3000 A I H W I -1 M F H C S cw_two M A 32 C S app_put R F 3103 M E F Q E 100 M A E P A 100 ifg A F I E -1 S A 100 end S F A M A E A A 48 C S app_put C S cw_two M A 32 C S app_put
 M J 3200 R K 2610 ifg K 20 M K 20 end
ca_preview: E K Z J ca_pad R A J ifn A 32 S A 65 R E 3102 S A E C S cw_mod A A 65 end C S app_put I J 1 I K -1 J ca_preview
ca_pad: R E 3101 I E 1 W 3101 E M B E P B 27 C S cw_pad R E 3101 ifl E 3 J ca_rank end M A Z O S P
ca_weights: 8 1 3 4 13 2 2 6 7 0 1 4 2 7 8 2 0 6 6 9 3 1 2 0 2 0
${COMMON}`;
const columnar=`app_compute: C S cw_parse N A Z O S P M G Z
ct_init: R E 3101 ifge G E J ct_sort_start end M I 3020 A I G W I G I G 1 J ct_init
ct_sort_start: W 3110 1
ct_sort: R E 3110 R F 3101 ifge E F J ct_begin end W 3111 E
ct_sort_inner: R E 3111 E E Z J ct_sort_next M I 3020 A I E R G I M H I/-1 M J 3000 A J G R E J M J 3000 A J H R F J ifge E F J ct_sort_next end W I H M I/-1 G R E 3111 I E -1 W 3111 E J ct_sort_inner
ct_sort_next: R E 3110 I E 1 W 3110 E J ct_sort
ct_begin: W 3110 Z W 3112 Z
ct_column: R E 3110 R F 3101 ifge E F J ct_finish end M I 3020 A I E R G I
ct_cell: R E 3102 ifge G E J ct_next_column end R E 3100 ife E Z M I 3200 A I G R A I C S app_put else M I 3200 R E 3112 A I E R A I M I 3300 A I G W I A I E 1 W 3112 E end R E 3101 A G E J ct_cell
ct_next_column: R E 3110 I E 1 W 3110 E J ct_column
ct_finish: R E 3100 ife E Z M A Z O S P end M A 3300 R B 3102 J app_emit
${KEYED}
${COMMON}`;
const vigenere=`app_compute: C S cw_parse N A Z O S P M J 3200 R K 3102 M G Z
vg_next: E K Z M A Z E K Z O S P R A J ifn A 32 S A 65 M I 3000 A I G R E I S E 65 R F 3100 ife F Z A A E else S A E end C S cw_mod A A 65 I G 1 R E 3101 ifge G E M G Z end end C S app_put I J 1 I K -1 J vg_next
${KEYED}
${COMMON}`;
const affine=`app_compute: R E 2610 ifl E 6 J cw_bad end R E 2554 N E 58 J cw_bad R E 2557 N E 124 J cw_bad M J 2552 M I 3100 M G Z
af_pairs: R A J C S cw_upper ifl A 65 J cw_bad end ifg A 90 J cw_bad end S A 65 W I A I I 1 I J 1 I G 1 ife G 2 I J 1 end ifl G 4 J af_pairs end M J 2558 R K 2610 I K -6 W 3104 K M I 3200
 af_text: E K Z J af_search R A J C S cw_upper ifn A 32 ifl A 65 J cw_bad end ifg A 90 J cw_bad end end W I A I I 1 I J 1 I K -1 J af_text
 af_search: W 3105 Z W 3106 Z
 af_key: R E 3105 M I @af_multipliers A I E R G I W 3107 G R E 3100 P E G R A 3102 S A E C S cw_mod W 3108 A R E 3101 R G 3107 P E G A A E C S cw_mod R E 3103 ife A E R E 3106 M I 3000 A I E R G 3107 W I G M I 3020 A I E R G 3108 W I G I E 1 W 3106 E end R E 3105 I E 1 W 3105 E ifl E 12 J af_key end R E 3106 E E Z J af_none E E 1 J af_unique
 M F E C S app_decimal M A @af_many M B 11 C S app_emit M B 27 C S cw_pad W 3110 Z W 3111 Z W 3112 54
 af_list: R E 3110 R F 3106 ifge E F J af_list_end end M I 3000 A I E R F I C S cw_two M A 44 C S app_put R E 3110 M I 3020 A I E R F I C S cw_two R E 3110 I E 1 W 3110 E R E 3111 I E 1 W 3111 E ife E 4 R B 3112 C S cw_pad R E 3112 A E 27 W 3112 E W 3111 Z else M A 32 C S app_put end J af_list
 af_list_end: R E 3111 ifn E Z R B 3112 C S cw_pad end M A Z O S P
 af_unique: M A 97 C S app_put M A 61 C S app_put R F 3000 C S cw_two M A 32 C S app_put M A 98 C S app_put M A 61 C S app_put R F 3020 C S cw_two M B 27 C S cw_pad M J 3200 R K 3104
 af_apply: E K Z M A Z E K Z O S P R A J ifn A 32 S A 65 R E 3000 P A E R E 3020 A A E C S cw_mod A A 65 end C S app_put I J 1 I K -1 J af_apply
 af_none: M A @af_no M B 17 J app_emit
 af_multipliers: 1 3 5 7 9 11 15 17 19 21 23 25
 af_no: ${ascii('NO INVERTIBLE KEY')}
 af_many: ${ascii(' KEYS (a,b)')}
${COMMON}`;
export const CIPHER_WORKSHOP:TextSoftware[]=[
 {number:249,kind:'text',id:'caesar-analysis',site:'postcards',title:'Caesar Frequency Workshop',inputs:['Ciphertext'],outputs:['Shift score preview'],description:'Rank all 26 Caesar decoding rotations of ASCII letters and spaces; at least one letter is required. Output has three 27-column rows: shift 00..25, three-digit score, and the first 20 decoded characters. Decoding subtracts the shift; ties prefer smaller shifts. This teaching score adds fixed letter weights: E13 T9 A/O8 I/N7 S/H/R6 D/L4 C/U3 M/W/F/G/Y/P2 B/V/K1 J/X/Q/Z0. Spaces score zero. It is a rough frequency exercise, not a claim that the first candidate is correct.',algorithm:caesar,examples:[{input:'KHOOR ZRUOG',output:'06 068 EBIIL TLOIA         10 064 AXEEH PHKEW         03 059 HELLO WORLD         '},{input:'123',error:true}]},
 {number:250,kind:'text',id:'keyed-columns',site:'library',title:'Keyed Columnar Cipher',inputs:['E/D|KEY|text'],outputs:['Transposed text'],description:'Enter E|KEY|TEXT to encode or D|KEY|TEXT to decode a classical columnar transposition. Mode and key ignore case; keys use 1..8 ASCII letters. Text uses letters and spaces and becomes uppercase. Fill rows under the key, then read columns in alphabetical key order; repeated key letters keep their left-to-right order. Decode reconstructs an irregular final row exactly. Spaces, including edge spaces, are preserved; no padding letters are added. Empty text is allowed.',algorithm:columnar,examples:[{input:'E|CAB|ABCDE',output:'BECAD'},{input:'D|CAB|BECAD',output:'ABCDE'},{input:'E||TEXT',error:true}]},
 {number:251,kind:'text',id:'vigenere',site:'ada',title:'Vigenere Letter Workshop',inputs:['E/D|KEY|text'],outputs:['Letter-shift text'],description:'Enter E|KEY|TEXT to encode or D|KEY|TEXT to decode a repeating-key classical cipher. Modes and keys ignore case; keys use 1..8 ASCII letters. A is shift 0 and Z shift 25. Text uses letters and spaces and becomes uppercase. The key advances only when a letter is processed, so spaces keep their positions without consuming key letters. Each run restarts at the first key letter; empty text is allowed.',algorithm:vigenere,examples:[{input:'E|LEMON|ATTACK AT DAWN',output:'LXFOPV EF RNHR'},{input:'D|LEMON|LXFOPV EF RNHR',output:'ATTACK AT DAWN'},{input:'X|KEY|TEXT',error:true}]},
 {number:252,kind:'text',id:'affine-keys',site:'typecase',title:'Affine Key Investigator',inputs:['AB:CD|text'],outputs:['Keys and encoded text'],description:'Investigate the classical affine alphabet rule y=(a*x+b) modulo 26 with A=0. Input AB:CD|TEXT means plaintext A maps to C and plaintext B maps to D; substitute any four letters, then append text using only letters and spaces. Case is ignored. Enumerate only invertible multipliers 1,3,5,7,9,11,15,17,19,21,23,25. No compatible key reports NO INVERTIBLE KEY. Multiple keys are listed as two-digit a,b pairs, four per 27-column row. A unique key is shown on its own row and applied to the text; ambiguity never silently chooses a key. Empty text is allowed.',algorithm:affine,examples:[{input:'AB:FI|ABC',output:'a=03 b=05                  FIL'},{input:'AB:AA|TEXT',output:'NO INVERTIBLE KEY'},{input:'AA:AB|TEXT',output:'NO INVERTIBLE KEY'}]},
];
