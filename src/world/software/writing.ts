import type { TextSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const bad='app_bad: M A -1 O S P';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const upper='app_upper: ifge A 97 ifle A 122 S A 32 end end O S P';
const roman=`roman_emit: M I @roman_table M H 13
roman_next: R E I ifl G E I I 3 I H -1 N H Z J roman_next M A Z O S P end
 S G E M A I/1 C S app_put M A I/2 ifn A Z C S app_put end J roman_next
roman_table: 1000 77 0 900 67 77 500 68 0 400 67 68 100 67 0 90 88 67 50 76 0 40 88 76 10 88 0 9 73 88 5 86 0 4 73 86 1 73 0`;
const b64table=`b64_table: ${ascii('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')}`;
/** B=2^D, preserves G..L. */
const power='app_power: M B 1 power_loop: E D Z O S P P B 2 I D -1 J power_loop';

export const WRITING_SOFTWARE: TextSoftware[] = [
  {
    number:76,kind:'text',id:'path-normalize',site:'toolshed',title:'Lexical path normalizer',
    description:'Normalizes an absolute slash-separated path: collapses repeated slashes, removes dot segments, and resolves dot-dot without climbing above root. Trailing slashes disappear except for root. This is lexical only: it does not inspect disks, links or file permissions. Other characters are literal.',
    inputs:['Absolute path'],outputs:['Normalized path'],
    algorithm:`app_compute: R K 2610 E K Z J app_bad M J 2552 R E J N E 47 J app_bad W 3000 Z
path_next: E K Z J path_output R E J ife E 47 I J 1 I K -1 J path_next end M G J M H Z
path_segment: E K Z J path_save R E J E E 47 J path_save I J 1 I K -1 I H 1 J path_segment
path_save: R E G ife E 46 ife H 1 J path_next end ife H 2 M E G/1 ife E 46 R E 3000 ifg E Z I E -1 W 3000 E end J path_next end end end
 R E 3000 M I E P I 2 A I 2900 W I G M I/1 H I E 1 W 3000 E J path_next
path_output: R H 3000 M G 2900 ife H Z M A 47 J app_put end
path_copy: M A 47 C S app_put R A G M B G/1 C S app_emit I G 2 I H -1 N H Z J path_copy M A Z O S P
${bad}`,
    examples:[{input:'/a//b/../c/./',output:'/a/c'},{input:'/../../a',output:'/a'},{input:'/a/..',output:'/'},{input:'/',output:'/'},{input:'/.../.x',output:'/.../.x'},{input:'relative/path',error:true},{input:'',error:true}],
  },
  {
    number:77,kind:'text',id:'roman-write',site:'cinema',title:'Roman numeral compositor',
    description:'Converts decimal integers 1..3999 to canonical uppercase Roman numerals with subtractive pairs IV, IX, XL, XC, CD and CM. Digits only; leading zeros are accepted. Useful for titles and credits; zero and larger values are rejected.',
    inputs:['Decimal integer'],outputs:['Roman numeral'],
    algorithm:`app_compute: R K 2610 E K Z J app_bad M J 2552 M G Z
roman_digit: R E J ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 ifg G 399 J app_bad end P G 10 A G E ifg G 3999 J app_bad end I J 1 I K -1 N K Z J roman_digit E G Z J app_bad J roman_emit
${roman}
${bad}`,
    examples:[{input:'1984',output:'MCMLXXXIV'},{input:'3999',output:'MMMCMXCIX'},{input:'0004',output:'IV'},{input:'0',error:true},{input:'4000',error:true},{input:'-1',error:true},{input:'',error:true}],
  },
  {
    number:78,kind:'text',id:'roman-read',site:'archivist',title:'Roman numeral reader',
    description:'Reads canonical Roman numerals I..MMMCMXCIX, accepting either letter case. It regenerates the canonical form and rejects noncanonical spellings such as IIII, IC or VX. Returns a decimal number; empty input is invalid.',
    inputs:['Roman numeral'],outputs:['Decimal integer'],
    algorithm:`app_compute: R K 2610 E K Z J app_bad M J 2551 A J K M G Z M H Z
roman_scan: R A J C S app_upper M I @roman_letters M D 7
roman_lookup: R E I ife A E M E I/1 J roman_value end I I 2 I D -1 N D Z J roman_lookup J app_bad
roman_value: ifl E H S G E else A G E M H E end ifg G 3999 J app_bad end ifl G Z J app_bad end I J -1 I K -1 N K Z J roman_scan
 E G Z J app_bad W 3000 G C S roman_emit R K 2610 R E 2620 N E K J app_bad M J 2552 M I 2700
roman_check: R A J C S app_upper R E I N A E J app_bad I J 1 I I 1 I K -1 N K Z J roman_check
 W 2620 Z R G 3000 M H 1000 M L Z
roman_decimal: M A G M B H C S app_div M G C ifn A Z M L 1 end ifn L Z A A 48 C S app_put end E H 1 M A Z E H 1 O S P Q H 10 J roman_decimal
roman_letters: 73 1 86 5 88 10 76 50 67 100 68 500 77 1000
${upper}
${roman}
${POSITIVE_DIVISION}
${bad}`,
    examples:[{input:'mcmlxxxiv',output:'1984'},{input:'MMMCMXCIX',output:'3999'},{input:'IV',output:'4'},{input:'IIII',error:true},{input:'IC',error:true},{input:'VX',error:true},{input:'MMMM',error:true},{input:'',error:true}],
  },
  {
    number:79,kind:'text',id:'base64-encode',site:'relay',title:'Base64 message encoder',
    description:'Encodes the printable ASCII input as standard Base64 with the plus/slash alphabet and equals padding. Spaces are data. The native bit reservoir never needs an integer larger than 4095; output is at most 72 characters.',
    inputs:['ASCII message'],outputs:['Base64'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z M H Z
b64_next: E K Z J b64_tail R E J P G 256 A G E A H 8 I J 1 I K -1
b64_bits: ifl H 6 J b64_next end I H -6 M D H C S app_power M A G C S app_div M G C C S b64_put J b64_bits
b64_tail: ife H Z M A Z O S P end M D 6 S D H C S app_power M A G P A B C S b64_put M A 61 C S app_put ife H 2 M A 61 C S app_put end M A Z O S P
b64_put: M I @b64_table A I A R A I J app_put
${b64table}
${power}
${POSITIVE_DIVISION}`,
    examples:[{input:'Man',output:'TWFu'},{input:'M',output:'TQ=='},{input:'Ma',output:'TWE='},{input:'hello world',output:'aGVsbG8gd29ybGQ='},{input:'',output:''},{input:'x'.repeat(54),output:'eHh4'.repeat(18)}],
  },
  {
    number:80,kind:'text',id:'base64-decode',site:'radios',title:'Base64 message decoder',
    description:'Decodes standard padded Base64 into printable ASCII. Requires groups of four, canonical zero padding bits and no whitespace. Rejects malformed padding, nonalphabet characters and decoded controls or non-ASCII bytes. Empty input is allowed.',
    inputs:['Base64'],outputs:['ASCII message'],
    algorithm:`app_compute: R A 2610 M B 4 C S app_div N C Z J app_bad M J 2552 R K 2610 M G Z M H Z
b64_next: E K Z M A Z E K Z O S P R E J E E 61 J b64_padding M I @b64_table M L Z
b64_lookup: R A I E A E J b64_value I I 1 I L 1 ifl L 64 J b64_lookup end J app_bad
b64_value: P G 64 A G L I H 6 I J 1 I K -1 ifl H 8 J b64_next end I H -8 M D H C S app_power M A G C S app_div M G C ifl A 32 J app_bad end ifg A 126 J app_bad end C S app_put J b64_next
b64_padding: N G Z J app_bad ife H 4 N K 2 J app_bad M E J/1 N E 61 J app_bad else ife H 2 N K 1 J app_bad else J app_bad end end M A Z O S P
${b64table}
${power}
${POSITIVE_DIVISION}
${bad}`,
    examples:[{input:'TWFu',output:'Man'},{input:'TQ==',output:'M'},{input:'TWE=',output:'Ma'},{input:'',output:''},{input:'TR==',error:true},{input:'TWF=',error:true},{input:'TQ=',error:true},{input:'TQ==TQ==',error:true},{input:'AA==',error:true},{input:'////',error:true}],
  },
  {
    number:81,kind:'text',id:'soundex',site:'letters',title:'Soundex name index',
    description:'Produces a four-character Soundex key for one ASCII-letter name. Keeps its first letter, groups similar consonants, suppresses adjacent duplicate groups, and pads with zeros. Vowels and Y separate groups; H and W do not. This coarse English-name index can collide.',
    inputs:['Name'],outputs:['Soundex key'],
    algorithm:`app_compute: R K 2610 E K Z J app_bad M J 2552
soundex_validate: R A J C S app_upper ifl A 65 J app_bad end ifg A 90 J app_bad end I J 1 I K -1 N K Z J soundex_validate
 M J 2552 R K 2610 R A J C S app_upper M G A C S app_put M A G C S soundex_code M H A I J 1 I K -1
soundex_next: E K Z J soundex_pad R A J C S app_upper E A 72 J soundex_advance E A 87 J soundex_advance C S soundex_code
 ifn A Z ifn A H M G A A A 48 C S app_put M A G end end M H A R E 2620 ife E 4 M A Z O S P end
soundex_advance: I J 1 I K -1 J soundex_next
soundex_pad: R E 2620 ife E 4 M A Z O S P end M A 48 C S app_put J soundex_pad
soundex_code: S A 65 M I @soundex_table A I A R A I O S P
soundex_table: ${[...'01230120022455012623010202'].map(Number).join(' ')}
${upper}
${bad}`,
    examples:[{input:'Robert',output:'R163'},{input:'Rupert',output:'R163'},{input:'Ashcraft',output:'A261'},{input:'Tymczak',output:'T522'},{input:'Pfister',output:'P236'},{input:'A',output:'A000'},{input:'Van Dyke',error:true},{input:'',error:true}],
  },
  {
    number:82,kind:'text',id:'isbn-check',site:'zine',title:'ISBN check-digit verifier',
    description:'Checks ISBN-10 or ISBN-13 check digits, ignoring spaces and hyphens. ISBN-10 allows X only in the final position; ISBN-13 requires prefix 978 or 979. VALID verifies syntax and checksum only, not whether a book or assigned ISBN exists.',
    inputs:['ISBN'],outputs:['VALID / INVALID'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z
isbn_scan: E K Z J isbn_length R A J E A 32 J isbn_advance E A 45 J isbn_advance ifge G 13 J isbn_invalid end C S app_upper
 ife A 88 M A 10 else ifl A 48 J isbn_invalid end ifg A 57 J isbn_invalid end S A 48 end M I 2900 A I G W I A I G 1
isbn_advance: I J 1 I K -1 J isbn_scan
isbn_length: ife G 10 M H 10 M L 11 else ife G 13 R E 2900 N E 9 J isbn_invalid R E 2901 N E 7 J isbn_invalid R E 2902 ifn E 8 ifn E 9 J isbn_invalid end end M H 1 M L 10 else J isbn_invalid end end M I 2900 M J Z M K Z
isbn_sum: R E I ife E 10 ifn G 10 J isbn_invalid end ifn J 9 J isbn_invalid end end P E H A K E
 ife G 10 I H -1 else M E 4 S E H M H E end I I 1 I J 1 ifl J G J isbn_sum end
 M A K M B L C S app_div N C Z J isbn_invalid M A @isbn_yes M B 5 J app_emit
isbn_invalid: M A @isbn_no M B 7 J app_emit
isbn_yes: ${ascii('VALID')}
isbn_no: ${ascii('INVALID')}
${upper}
${POSITIVE_DIVISION}`,
    examples:[{input:'0-306-40615-2',output:'VALID'},{input:'9780306406157',output:'VALID'},{input:'080442957x',output:'VALID'},{input:'9780306406158',output:'INVALID'},{input:'0000000000000',output:'INVALID'},{input:'X306406152',output:'INVALID'},{input:'',output:'INVALID'}],
  },
  {
    number:83,kind:'text',id:'pig-latin',site:'riddles',title:'Pig Latin word game',
    description:'Transforms space-separated ASCII-letter words to lowercase Pig Latin. Initial vowels add way; otherwise move the leading consonant run to the end and add ay. Only a/e/i/o/u count as vowels. A word without vowels stays in order and adds ay. Spaces normalize; punctuation is rejected.',
    inputs:['Words'],outputs:['Pig Latin'],
    algorithm:`app_compute: M J 2552 R K 2610
pig_validate: E K Z J pig_start R A J ifn A 32 C S pig_lower ifl A 97 J app_bad end ifg A 122 J app_bad end end I J 1 I K -1 J pig_validate
pig_start: M J 2552 R K 2610
pig_next: E K Z M A Z E K Z O S P R E J ife E 32 I J 1 I K -1 J pig_next end M G J M H Z M L -1
pig_scan: E K Z J pig_word R A J E A 32 J pig_word C S pig_lower ife L -1 E A 97 M L H E A 101 M L H E A 105 M L H E A 111 M L H E A 117 M L H end I H 1 I J 1 I K -1 J pig_scan
pig_word: W 3000 J W 3001 K R E 2620 ifn E Z M A 32 C S app_put ifl A Z O S P end end
 ifl L Z M L H end M J G A J L M K H S K L C S pig_copy ifl A Z O S P end M J G M K L C S pig_copy ifl A Z O S P end
 ife L Z M A 119 C S app_put ifl A Z O S P end end M A 97 C S app_put ifl A Z O S P end M A 121 C S app_put ifl A Z O S P end R J 3000 R K 3001 J pig_next
pig_copy: E K Z M A Z E K Z O S P R A J C S pig_lower C S app_put ifl A Z O S P end I J 1 I K -1 J pig_copy
pig_lower: ifge A 65 ifle A 90 A A 32 end end O S P
${bad}`,
    examples:[{input:'Hello apple string',output:'ellohay appleway ingstray'},{input:'  I am  ',output:'iway amway'},{input:'rhythm',output:'rhythmay'},{input:'Hello!',error:true},{input:'',output:''},{input:'a '.repeat(27),output:Array(27).fill('away').join(' ')}],
  },
];
