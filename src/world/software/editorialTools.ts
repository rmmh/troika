import type {TextSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const TOKENS=`ed_tokenize: M J A M K B M I 3200 M G Z M H Z
ed_token_loop: E K Z J ed_token_end R E J ifge E 65 ifle E 90 A E 32 end end W I E ife E 32 C S ed_close else ifl E 97 J ed_bad end ifg E 122 J ed_bad end ife H Z ifge G 27 J ed_bad end M F 3000 A F G W F I end I H 1 end I I 1 I J 1 I K -1 J ed_token_loop
ed_token_end: C S ed_close W 3100 G M H Z
ed_order_init: ifge H G M A Z O S P end M I 3060 A I H W I H I H 1 J ed_order_init
ed_close: E H Z O S P M F 3030 A F G W F H I G 1 M H Z O S P
ed_sort: W 3102 1
ed_sort_outer: R E 3102 R F 3100 ifge E F M A Z O S P end W 3103 E
ed_sort_inner: R E 3103 E E Z J ed_sort_next M I 3060 A I E R A I M B I/-1 C S ed_compare ifge A Z J ed_sort_next end R E 3103 M I 3060 A I E R G I M H I/-1 W I H M I/-1 G I E -1 W 3103 E J ed_sort_inner
ed_sort_next: R E 3102 I E 1 W 3102 E J ed_sort_outer
; Compare token indices A/B lexically. Equal tokens retain original positions.
ed_compare: M I 3000 A I A R G I M I 3030 A I A R K I M I 3000 A I B R H I M I 3030 A I B R L I
ed_compare_loop: E K Z J ed_compare_end E L Z J ed_greater R E G R F H ifl E F J ed_less end ifg E F J ed_greater end I G 1 I H 1 I K -1 I L -1 J ed_compare_loop
ed_compare_end: N L Z J ed_less M A Z O S P
ed_less: M A -1 O S P
ed_greater: M A 1 O S P
ed_word: M I 3000 A I A R J I M I 3030 A I A R K I
ed_word_loop: E K Z M A Z E K Z O S P R A J C S app_put N A Z O S P I J 1 I K -1 J ed_word_loop
ed_bad: M A -1 O S P`;
const concordance=`app_compute: M A 2552 R B 2610 C S ed_tokenize N A Z O S P C S ed_sort W 3110 Z
con_next: R E 3110 R F 3100 ifge E F M A Z O S P end M I 3060 A I E R A I W 3111 A ifn E Z I I -1 R B I C S ed_compare ife A Z M A 44 C S app_put N A Z O S P J con_position end M A 59 C S app_put N A Z O S P M A 32 C S app_put N A Z O S P end R A 3111 C S ed_word N A Z O S P M A 58 C S app_put N A Z O S P
con_position: R F 3111 I F 1 C S app_decimal N A Z O S P R E 3110 I E 1 W 3110 E J con_next
${TOKENS}`;
const context=`app_compute: M J 2552 R K 2610 M H Z M I 3300
ctx_keyword: E K Z J ctx_bad R E J E E 124 J ctx_text ifge E 65 ifle E 90 A E 32 end end ifl E 97 J ctx_bad end ifg E 122 J ctx_bad end ifge H 8 J ctx_bad end W I E I I 1 I H 1 I J 1 I K -1 J ctx_keyword
ctx_text: E H Z J ctx_bad W 3310 H I J 1 I K -1 W 3311 K M I 3200
ctx_normalize: E K Z J ctx_start R E J ifge E 65 ifle E 90 A E 32 end end ifn E 32 ifl E 97 J ctx_bad end ifg E 122 J ctx_bad end end W I E I I 1 I J 1 I K -1 J ctx_normalize
ctx_start: W 3312 Z W 3313 Z
ctx_seek: R G 3312 R H 3311 ifge G H J ctx_done end ifn G Z M I 3199 A I G R E I ifn E 32 J ctx_advance end end R E 3310 A E G ifg E H J ctx_advance end M I 3200 A I G M J 3300 R K 3310
ctx_match: R E I R F J ifn E F J ctx_advance end I I 1 I J 1 I K -1 N K Z J ctx_match
 M E I S E 3200 R F 3311 ifl E F R E I ifn E 32 J ctx_advance end end R E 3313 ifge E 6 J ctx_bad end I E 1 W 3313 E
 R F 3312 I F 1 ifl F 10 M A 48 C S app_put end C S app_decimal M A 58 C S app_put
 R G 3312 M H G S H 6 ifl H Z M H Z end M E G S E H M F 6 S F E
ctx_left_pad: E F Z J ctx_left M A 32 C S app_put I F -1 J ctx_left_pad
ctx_left: ifge H G J ctx_open end M I 3200 A I H R A I C S app_put I H 1 J ctx_left
ctx_open: M A 91 C S app_put R G 3312 R H 3310
ctx_word: M I 3200 A I G R A I C S app_put I G 1 I H -1 N H Z J ctx_word M A 93 C S app_put M H 6
ctx_right: E H Z J ctx_pad R E 3311 ifge G E J ctx_pad end M I 3200 A I G R A I C S app_put I G 1 I H -1 J ctx_right
ctx_pad: R E 3313 P E 27 R F 2620 ifge F E J ctx_advance end M A 32 C S app_put J ctx_pad
ctx_advance: R E 3312 I E 1 W 3312 E J ctx_seek
ctx_done: R E 3313 ife E Z M A @ctx_none M B 8 J app_emit end M A Z O S P
ctx_bad: M A -1 O S P
ctx_none: ${ascii('NO MATCH')}`;
const sentence=`app_compute: M J 2552 R K 2610 M G 1 M H Z M L Z
sent_next: E K Z M A Z E K Z O S P R E J I J 1 I K -1 ife E 32 ifn L Z M H 1 end J sent_next end
 ifge E 65 ifle E 90 A E 32 end end
 ifge E 97 ifle E 122 J sent_word end end ifge E 48 ifle E 57 J sent_digit end end
 E L Z J sent_bad E E 46 J sent_stop E E 33 J sent_stop E E 63 J sent_stop E E 44 J sent_punct E E 58 J sent_punct E E 59 J sent_punct J sent_bad
sent_stop: M G 1
sent_punct: M A E C S app_put N A Z O S P M H 1 J sent_next
sent_word: ifn G Z S E 32 end
sent_digit: ifn H Z M A 32 C S app_put N A Z O S P end M A E C S app_put N A Z O S P M G Z M H Z M L 1 J sent_next
sent_bad: M A -1 O S P`;
const columns=`app_compute: M J 2552 R K 2610 M G Z M H Z
col_width: E K Z J ed_bad R E J E E 124 J col_text ifl E 48 J ed_bad end ifg E 57 J ed_bad end P G 10 S E 48 A G E I H 1 ifg H 2 J ed_bad end I J 1 I K -1 J col_width
col_text: E H Z J ed_bad ifl G 1 J ed_bad end ifg G 12 J ed_bad end W 3120 G I J 1 I K -1 M A J M B K C S ed_tokenize N A Z O S P
 R G 3100 M H Z
col_lengths: ifge H G J col_layout end M I 3030 A I H R E I R F 3120 ifg E F J ed_bad end I H 1 J col_lengths
col_layout: C S ed_sort R H 3120 I H 1 M G 28 Q G H M E G P E H ifg E 28 I G -1 end W 3121 G R E 3100 M F Z
col_rows: ifle E Z J col_rows_done end S E G I F 1 J col_rows
col_rows_done: ifg F 6 J ed_bad end W 3122 F W 3123 Z
col_row: R E 3123 R F 3122 ifge E F M A Z O S P end W 3124 Z
col_cell: R E 3124 R F 3121 ifge E F J col_endrow end R G 3122 P G E R E 3123 A G E R H 3100 ifl G H M I 3060 A I G R A I C S ed_word N A Z O S P end R E 3124 I E 1 W 3124 E R F 3121 ifge E F J col_endrow end R F 3120 I F 1 P E F R F 3123 P F 27 A E F W 3125 E
col_cellpad: R E 2620 R F 3125 ifge E F J col_cell end M A 32 C S app_put N A Z O S P J col_cellpad
col_endrow: R E 3123 I E 1 W 3123 E P E 27 W 3125 E
col_rowpad: R E 2620 R F 3125 ifge E F J col_row end M A 32 C S app_put N A Z O S P J col_rowpad
${TOKENS}`;
export const EDITORIAL_TOOLS:TextSoftware[]=[
 {number:237,kind:'text',id:'concordance',site:'library',title:'Word Position Concordance',inputs:['Words'],outputs:['Word:positions'],description:'Index ASCII words by their original one-based word positions. Input uses letters and spaces only; repeated spaces are ignored and case is folded. Distinct words appear alphabetically, each followed by every original position. For example red blue red becomes blue:2; red:1,3. This preserves occurrences rather than only counting them. Empty input gives an empty index.',algorithm:concordance,examples:[{input:'red blue red',output:'blue:2; red:1,3'},{input:'A a B',output:'a:1,2; b:3'},{input:'word!',error:true}]},
 {number:238,kind:'text',id:'context-search',site:'gazette',title:'Keyword Context Windows',inputs:['WORD|text'],outputs:['Position:context'],description:'Enter a keyword of 1..8 ASCII letters, a |, then text containing letters and spaces. Matching ignores case and requires a whole word. Each hit shows its one-based character position and up to six characters on either side, with the keyword in brackets. Context may cut a neighboring word. Rows are padded to 27 columns. Up to six hits fit; more are an explicit error. No hits returns NO MATCH.',algorithm:context,examples:[{input:'cat|the cat sat by cat',output:'05:  the [cat] sat b       '+'16:at by [cat]             '},{input:'at|cat',output:'NO MATCH'},{input:'|cat',error:true}]},
 {number:239,kind:'text',id:'sentence-format',site:'zine',title:'Sentence Case Formatter',inputs:['Plain sentences'],outputs:['Formatted text'],description:'Normalize short ASCII prose. Accepts letters, digits, spaces and .,!?:; only. Words are lowercased; a letter at the start or immediately after a sentence-ending .!? is capitalized. A leading number consumes that sentence-start position. Punctuation runs attach to the previous word; the next word gets one space. Commas, colons and semicolons do not start a sentence. Extra spaces disappear. Leading punctuation, quotes, apostrophes and hyphens are rejected; no abbreviation exceptions are guessed.',algorithm:sentence,examples:[{input:'  HELLO ,WORLD!how ARE you? ',output:'Hello, world! How are you?'},{input:'FIRST: SECOND; THIRD.',output:'First: second; third.'},{input:'...hello',error:true}]},
 {number:240,kind:'text',id:'word-columns',site:'typecase',title:'Alphabetical Word Columns',inputs:['WIDTH|words'],outputs:['Column-major list'],description:'Lay out a sorted word list in columns. Enter a width 1..12, a |, then ASCII words separated by spaces. Case is folded and duplicates are retained. Words fill each column downward before continuing to its right. Width is a strict maximum word length, not a truncation request. Columns have one separating space; each output row fills 27 cells. More than six rows or a word wider than its column is an explicit error. Empty lists produce no rows.',algorithm:columns,examples:[{input:'3|fig yam pea tea oat',output:'fig oat pea tea yam        '},{input:'2|long',error:true}]},
];
