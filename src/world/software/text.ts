import type { TextSoftware } from './native';
import { FORMAT_SOFTWARE } from './formats';

const lower = `app_lower: ifge A 65 ifle A 90 A A 32 end end O S P`;
const bad = 'app_bad: M A -1 O S P';

export const TEXT_SOFTWARE: TextSoftware[] = [
  {
    number:15, kind:'text', id:'title-case', site:'typecase', title:'Title-case compositor',
    description:'Capitalizes the first character of each space-separated word and lowercases later letters. Punctuation is preserved; this is mechanical title casing, not editorial grammar.',
    inputs:['Text'], outputs:['Title case'],
    algorithm:`app_compute: M J 2552 R K 2610 M G 1
app_next: E K Z M A Z E K Z O S P R A J
 ife A 32 M G 1 else C S app_lower ifn G Z ifge A 97 ifle A 122 S A 32 end end end M G Z end
 C S app_put I J 1 I K -1 J app_next
${lower}`,
    examples:[{input:'tHE SMALL wEB',output:'The Small Web'},{input:"don't PANIC",output:"Don't Panic"},{input:'  TWO  WORDS ',output:'  Two  Words '},{input:'',output:''}],
  },
  {
    number:16, kind:'text', id:'slug', site:'zine', title:'Address slug maker',
    description:'Converts ASCII letters to lowercase, keeps digits, and joins runs of letters/digits with one hyphen. Leading and trailing punctuation disappear. Useful for short document names.',
    inputs:['Title'], outputs:['Slug'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z
app_next: E K Z M A Z E K Z O S P R A J C S app_lower
 ifge A 97 ifle A 122 J app_keep end end ifge A 48 ifle A 57 J app_keep end end M G 1 J app_advance
app_keep: M H A ifn G Z R E 2620 ifn E Z M A 45 C S app_put end end M G Z M A H C S app_put
app_advance: I J 1 I K -1 J app_next
${lower}`,
    examples:[{input:'Hello, Small WEB!',output:'hello-small-web'},{input:'---1984 / 2---',output:'1984-2'},{input:'a___b',output:'a-b'},{input:'?!',output:''}],
  },
  {
    number:17, kind:'text', id:'palindrome', site:'riddles', title:'Palindrome checker',
    description:'Compares ASCII letters and digits from both ends, ignoring case, spaces and punctuation. An input with no letters or digits is a palindrome by convention.',
    inputs:['Phrase'], outputs:['Verdict'],
    algorithm:`app_compute: M G 2552 M H G R E 2610 A H E I H -1
app_compare: ifg G H M A @app_yes M B 10 J app_emit end
 R A G C S app_normalize ife A Z I G 1 J app_compare end M J A
 R A H C S app_normalize ife A Z I H -1 J app_compare end
 ifn A J M A @app_no M B 16 J app_emit end I G 1 I H -1 J app_compare
app_normalize: C S app_lower ifge A 97 ifle A 122 O S P end end ifge A 48 ifle A 57 O S P end end M A Z O S P
${lower}
app_yes: 80 65 76 73 78 68 82 79 77 69
app_no: 78 79 84 32 65 32 80 65 76 73 78 68 82 79 77 69`,
    examples:[{input:'A man, a plan, a canal: Panama!',output:'PALINDROME'},{input:'12321',output:'PALINDROME'},{input:'Troika',output:'NOT A PALINDROME'},{input:'...',output:'PALINDROME'}],
  },
  {
    number:18, kind:'text', id:'brackets', site:'ada', title:'Bracket nesting checker',
    description:'Checks properly nested round, square and curly brackets with a native stack. Other characters are ignored; quotes and comments have no special meaning.',
    inputs:['Expression'], outputs:['Verdict'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z
app_scan: E K Z J app_end R A J
 E A 40 M B 41 E A 40 J app_push E A 91 M B 93 E A 91 J app_push E A 123 M B 125 E A 123 J app_push
 E A 41 J app_pop E A 93 J app_pop E A 125 J app_pop J app_advance
app_push: M I 2900 A I G W I B I G 1 J app_advance
app_pop: E G Z J app_no I G -1 M I 2900 A I G R E I N E A J app_no
app_advance: I J 1 I K -1 J app_scan
app_end: N G Z J app_no M A @app_yes M B 8 J app_emit
app_no: M A @app_failure M B 10 J app_emit
app_yes: 66 65 76 65 78 67 69 68
app_failure: 85 78 66 65 76 65 78 67 69 68`,
    examples:[{input:'([{}])',output:'BALANCED'},{input:'([)]',output:'UNBALANCED'},{input:'hello',output:'BALANCED'},{input:'x)',output:'UNBALANCED'},{input:'(',output:'UNBALANCED'}],
  },
  {
    number:19, kind:'text', id:'rot13', site:'postcards', title:'ROT13 postcard',
    description:'Applies the reversible ROT13 letter substitution, preserving case and nonletters. Applying it twice restores the original. A puzzle convention, not encryption.',
    inputs:['Message'], outputs:['Transformed'],
    algorithm:`app_compute: M J 2552 R K 2610
app_next: E K Z M A Z E K Z O S P R A J
 ifge A 65 ifle A 90 ifle A 77 A A 13 else S A 13 end J app_write end end
 ifge A 97 ifle A 122 ifle A 109 A A 13 else S A 13 end end end
app_write: C S app_put I J 1 I K -1 J app_next`,
    examples:[{input:'Hello, World!',output:'Uryyb, Jbeyq!'},{input:'Uryyb, Jbeyq!',output:'Hello, World!'},{input:'AMNZ amnz 0123',output:'NZAM nzam 0123'},{input:'',output:''}],
  },
  {
    number:20, kind:'text', id:'run-counts', site:'stitch', title:'Run-length stitch list',
    description:'Groups consecutive equal characters. Each output record is the original character, a decimal count, then a space. Useful for turning a short color-letter pattern into stitch runs.',
    inputs:['Pattern'], outputs:['Runs'],
    algorithm:`app_compute: M J 2552 R K 2610
app_group: E K Z M A Z E K Z O S P R G J M F Z
app_count: R E J N E G J app_record I F 1 I J 1 I K -1 N K Z J app_count
app_record: M A G C S app_put C S app_decimal M A 32 C S app_put J app_group`,
    examples:[{input:'aaabbc',output:'a3 b2 c1 '},{input:'A'.repeat(54),output:'A54 '},{input:'AB'.repeat(27),output:'A1 B1 '.repeat(27)},{input:'ABAB',output:'A1 B1 A1 B1 '},{input:'',output:''}],
  },
  {
    number:21, kind:'text', id:'reverse-words', site:'letters', title:'Words in reverse order',
    description:'Reverses the order of space-separated words without reversing letters inside them. Extra spaces collapse to one and edge spaces disappear.',
    inputs:['Sentence'], outputs:['Reordered words'],
    algorithm:`app_compute: M G 2552 R E 2610 A G E I G -1
app_word: ifl G 2552 M A Z O S P end R E G ife E 32 I G -1 J app_word end
 M H G
app_start: ifl G 2552 J app_copy end R E G E E 32 J app_copy I G -1 J app_start
app_copy: R E 2620 ifn E Z M A 32 C S app_put end M J G I J 1
app_word_copy: ifg J H J app_word end R A J C S app_put I J 1 J app_word_copy`,
    examples:[{input:'one two three',output:'three two one'},{input:'  red   blue  ',output:'blue red'},{input:'alone',output:'alone'},{input:'   ',output:''}],
  },
  {
    number:22, kind:'text', id:'text-census', site:'iris', title:'Letter and digit census',
    description:'Counts ASCII vowels (A,E,I,O,U), other ASCII letters, and digits. Case is ignored, Y is a consonant, and punctuation/spaces are not counted.',
    inputs:['Text'], outputs:['Counts V/C/D'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z M H Z M L Z
app_next: E K Z J app_report R A J C S app_lower
 ifge A 48 ifle A 57 I L 1 J app_advance end end
 ifl A 97 J app_advance end ifg A 122 J app_advance end
 E A 97 J app_vowel E A 101 J app_vowel E A 105 J app_vowel E A 111 J app_vowel E A 117 J app_vowel I H 1 J app_advance
app_vowel: I G 1
app_advance: I J 1 I K -1 J app_next
app_report: M A 86 C S app_put M A 61 C S app_put M F G C S app_decimal
 M A 32 C S app_put M A 67 C S app_put M A 61 C S app_put M F H C S app_decimal
 M A 32 C S app_put M A 68 C S app_put M A 61 C S app_put M F L J app_decimal
${lower}`,
    examples:[{input:'Hello 123!',output:'V=2 C=3 D=3'},{input:'AEIOU xyz',output:'V=5 C=3 D=0'},{input:'',output:'V=0 C=0 D=0'},{input:'a'.repeat(54),output:'V=54 C=0 D=0'}],
  },
  {
    number:23, kind:'text', id:'anagram-key', site:'riddles', title:'Anagram filing key',
    description:'Keeps ASCII letters, lowercases them, and sorts them into a canonical anagram key using a 26-cell frequency table. Equal keys identify the same multiset of letters.',
    inputs:['Phrase'], outputs:['Sorted letters'],
    algorithm:`app_compute: M I 2900 M K 26
app_zero: W I Z I I 1 I K -1 N K Z J app_zero
 M J 2552 R K 2610
app_count: E K Z J app_sorted R A J C S app_lower
 ifge A 97 ifle A 122 M I A S I 97 A I 2900 R E I I E 1 W I E end end
 I J 1 I K -1 J app_count
app_sorted: M G 97 M I 2900
app_letter: R H I
app_copies: E H Z J app_next_letter M A G C S app_put I H -1 J app_copies
app_next_letter: I I 1 I G 1 ifle G 122 J app_letter end M A Z O S P
${lower}`,
    examples:[{input:'Tea!',output:'aet'},{input:'Ate',output:'aet'},{input:'School master',output:'acehlmoorsst'},{input:'123',output:''}],
  },
  {
    number:24, kind:'text', id:'morse', site:'relay', title:'Morse message encoder',
    description:'Encodes letters A-Z and digits 0-9 as International Morse symbols, separated by spaces. Input spaces become slash separators. Other characters and results over 162 cells are rejected.',
    inputs:['Letters/digits'], outputs:['Morse symbols'],
    algorithm:`app_compute: M G 2552 R H 2610
app_next: E H Z M A Z E H Z O S P R A G
 ife A 32 M A 47 C S app_put ifl A Z O S P end J app_separator end
 C S app_lower
 ifge A 97 ifle A 122 S A 97 J app_lookup end end
 ifge A 48 ifle A 57 S A 48 A A 26 J app_lookup end end J app_bad
app_lookup: M I @app_codes A I A R I I R K I I I 1
app_symbols: R A I C S app_put ifl A Z O S P end I I 1 I K -1 N K Z J app_symbols
app_separator: I G 1 I H -1 E H Z M A Z E H Z O S P M A 32 C S app_put ifl A Z O S P end J app_next
${lower}
${bad}
app_codes: ${Array.from({length:36},(_,i)=>`@app_m${i}`).join(' ')}
${['.-','-...','-.-.','-..','.','..-.','--.','....','..','.---','-.-','.-..','--','-.','---','.--.','--.-','.-.','...','-','..-','...-','.--','-..-','-.--','--..','-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'].map((code,i)=>`app_m${i}: ${code.length} ${[...code].map(c=>c.charCodeAt(0)).join(' ')}`).join('\n')}`,
    examples:[{input:'SOS',output:'... --- ...'},{input:'a 2',output:'.- / ..---'},{input:'Hello!',error:true},{input:'0'.repeat(54),error:true},{input:'',output:''}],
  },
  {
    number:25, kind:'text', id:'ascii-hex', site:'keys', title:'ASCII hex encoder',
    description:'Shows each printable ASCII character as two uppercase hexadecimal digits, with spaces between bytes. Spaces in the input are encoded as 20.',
    inputs:['Text'], outputs:['Hex bytes'],
    algorithm:`app_compute: M J 2552 R K 2610
app_next: E K Z M A Z E K Z O S P R A J
 M G A Q G 16 M H G P H 16 ifg H A I G -1 S H 16 end S A H M H A
 M A G C S app_hex C S app_put M A H C S app_hex C S app_put I J 1 I K -1
 ifn K Z M A 32 C S app_put end J app_next
app_hex: ifl A 10 A A 48 else A A 55 end O S P`,
    examples:[{input:'Ab!',output:'41 62 21'},{input:' ',output:'20'},{input:'~',output:'7E'},{input:'A'.repeat(54),output:Array(54).fill('41').join(' ')}],
  },
  {
    number:26, kind:'text', id:'hex-ascii', site:'tickets', title:'Printable hex decoder',
    description:'Decodes hexadecimal pairs to printable ASCII (20..7E). Spaces are allowed between pairs, not inside a pair. Accepts either hex letter case; rejects odd digits and control bytes.',
    inputs:['Hex bytes'], outputs:['Decoded text'],
    algorithm:`app_compute: M J 2552 R K 2610 M G -1
app_next: E K Z J app_done R A J
 ife A 32 N G -1 J app_bad J app_advance end C S app_nibble ifl A Z J app_bad end
 ife G -1 M G A else P G 16 A A G ifl A 32 J app_bad end ifg A 126 J app_bad end C S app_put M G -1 end
app_advance: I J 1 I K -1 J app_next
app_done: N G -1 J app_bad M A Z O S P
app_nibble: ifge A 48 ifle A 57 S A 48 O S P end end C S app_lower
 ifge A 97 ifle A 102 S A 87 O S P end end M A -1 O S P
${lower}
${bad}`,
    examples:[{input:'41 62 21',output:'Ab!'},{input:'207e',output:' ~'},{input:'4 1',error:true},{input:'0A',error:true},{input:'4',error:true},{input:'GG',error:true},{input:'',output:''}],
  },
  ...FORMAT_SOFTWARE,
];
