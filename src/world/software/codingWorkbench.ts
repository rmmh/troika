import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const lit=(name:string,value:string)=>`${name}: ${[...value].map(c=>c.charCodeAt(0)).concat(0).join(' ')}\n`;
const text=(name:string)=>`M A @${name} C S stats_label `;
const pad=(row:number)=>`M A ${row*27} C S cw_pad `;
const num=(address:number)=>`R F ${address} C S stats_int `;
const common=`${SAMPLE_OUTPUT}
cw_bad: M A -1 O S P
cw_pad: M B A
cw_pad_loop: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J cw_pad_loop
cw_take: R I 3400 R E 3401 ifge I E J cw_bad end R E I I I 1 W 3400 I M A Z O S P
cw_var: C S cw_take N A Z O S P ifl E 97 J cw_bad end ifg E 102 J cw_bad end S E 97 M A Z O S P
`;
const apps:TextSoftware[]=[];
const heap=`app_compute: M A 2900 M B 120 K A B W 3410 Z W 3411 Z W 3400 2552 R E 2610 A E 2552 W 3401 E C S cw_take N A Z O S P ifl E 49 J cw_bad end ifg E 57 J cw_bad end S E 48 W 3410 E C S cw_take N A Z O S P ifn E 124 ifl E 48 J cw_bad end ifg E 57 J cw_bad end S E 48 R F 3410 P F 10 A E F W 3410 E C S cw_take N A Z O S P N E 124 J cw_bad end R E 3410 ifg E 54 J cw_bad end
hp_command: R E 3400 R F 3401 ifge E F J cw_bad end C S cw_take N A Z O S P W 3412 E ifn E 43 N E 45 J cw_bad end C S cw_var N A Z O S P I E 1 W 3413 E R F 3412 ife F 45 J hp_free end C S cw_take N A Z O S P ifl E 49 J cw_bad end ifg E 57 J cw_bad end S E 48 W 3414 E R I 3413 A I 3000 R E I ifn E Z J hp_reject end M L Z M H Z
hp_find: R E 3410 ifge L E J hp_reject end M I 2900 A I L R E I ife E Z I H 1 else M H Z end R E 3414 ife H E J hp_allocate end I L 1 J hp_find
hp_allocate: M I 2901 A I L S I H R E 3413
hp_fill: W I E I I 1 I H -1 N H Z J hp_fill R I 3413 A I 3000 R E 3414 W I E J hp_next
hp_free: R I 3413 A I 3000 R E I ife E Z J hp_reject end W I Z M L Z
hp_clear: M I 2900 A I L R E I R F 3413 ife E F W I Z end I L 1 R E 3410 ifl L E J hp_clear end J hp_next
hp_reject: R E 3411 I E 1 W 3411 E
hp_next: R E 3400 R F 3401 ife E F J hp_report end C S cw_take N A Z O S P N E 44 J cw_bad J hp_command
hp_report: W 3415 Z W 3416 Z M H Z M L Z
hp_holes: M I 2900 A I L R E I ife E Z I H 1 R E 3415 I E 1 W 3415 E R E 3416 ifg H E W 3416 H end else M H Z end I L 1 R E 3410 ifl L E J hp_holes end
${text('hp_free_text')}${num(3415)}${text('hp_largest')}${num(3416)}${pad(1)}${text('hp_rejected')}${num(3411)}${pad(2)}M L Z
hp_map: M I 2900 A I L R A I ife A Z M A 46 else A A 96 end C S app_put I L 1 R E 3410 ifl L E J hp_map end ${pad(4)}${text('hp_legend')}M A Z O S P
${lit('hp_free_text','Free=')}${lit('hp_largest',' largest hole=')}${lit('hp_rejected','Rejected requests=')}${lit('hp_legend','Map: one unit/char, base 0')}${common}`;
apps.push({number:423,kind:'text',id:'heap-workshop',site:'depot',title:'Heap Workshop',inputs:['N|+a5,-a,...'],outputs:['First-fit heap / holes'],description:'Simulate a heap of N=1..54 units, initially free. Requests separated by commas: +a5 allocates five contiguous units to ID a; -a frees that ID. IDs a..f, sizes 1..9. First fit chooses the lowest address; freeing coalesces adjacent holes. Duplicate live IDs, absent frees and insufficient contiguous space count as rejected requests and leave the heap unchanged. Syntax errors reject the whole input. Map starts at address 0: letters mark allocations and dots mark free units. Example 12|+a4,+b4,+c4,-a,-c,+d5 rejects d despite eight free units; freeing b would make one large hole.',algorithm:heap,examples:[{"input":"12|+a4,+b4,+c4,-a,-c,+d5","output":"Free=8 largest hole=4      Rejected requests=1        ....bbbb....                                          Map: one unit/char, base 0"}]});
// Backward straight-line liveness: use union (out minus def).
// https://courses.cs.cornell.edu/courses/cs4120/2026sp/notes.html?id=livevar
const live=`app_compute: M A 2900 M B 180 K A B W 3410 Z W 3400 2552 R E 2610 A E 2552 W 3401 E
lv_statement: R E 3410 ifge E 7 J cw_bad end C S cw_var N A Z O S P R I 3410 A I 2900 W I E C S cw_take N A Z O S P N E 61 J cw_bad C S cw_var N A Z O S P R I 3410 P I 6 A I 2920 A I E W I 1 C S cw_take N A Z O S P ife E 59 J lv_next end ife E 124 J lv_outputs end ifn E 43 ifn E 45 N E 42 J cw_bad end end C S cw_var N A Z O S P R I 3410 P I 6 A I 2920 A I E W I 1 C S cw_take N A Z O S P ife E 124 J lv_outputs end N E 59 J cw_bad
lv_next: R E 3410 I E 1 W 3410 E J lv_statement
lv_outputs: R E 3410 I E 1 W 3410 E
lv_output_loop: R E 3400 R F 3401 ife E F J lv_analyze end C S cw_var N A Z O S P M I 3000 A I E R F I ifn F Z J cw_bad end W I 1 J lv_output_loop
lv_analyze: W 3411 Z C S lv_count R L 3410 I L -1
lv_backward: M I 2900 A I L R E I M I 3000 A I E R F I ife F Z M I 3020 A I L W I 1 end M I 3000 A I E W I Z M H Z
lv_union: M I L P I 6 A I 2920 A I H R E I M J 3000 A J H R F J ifn E Z M F 1 W J F end M I L P I 6 A I 3040 A I H W I F I H 1 ifl H 6 J lv_union end C S lv_count I L -1 ifge L Z J lv_backward end
${text('lv_dead')}M L Z W 3413 Z
lv_dead_loop: M I 3020 A I L R E I ifn E Z W 3413 1 M A L A A 49 C S app_put M A 32 C S app_put end I L 1 R E 3410 ifl L E J lv_dead_loop end R E 3413 ife E Z ${text('lv_none')}end ${pad(1)}${text('lv_peak')}${num(3411)}${pad(2)}M L Z
lv_print: M A L A A 49 C S app_put M A 58 C S app_put M H Z W 3412 Z
lv_letters: M I L P I 6 A I 3040 A I H R E I ifn E Z M A H A A 97 C S app_put W 3412 1 end I H 1 ifl H 6 J lv_letters end R E 3412 ife E Z M A 45 C S app_put end I L 1 M A L P A 9 A A 54 C S cw_pad R E 3410 ifl L E J lv_print end M A Z O S P
lv_count: M H Z M F Z
lv_count_loop: M I 3000 A I H R E I A F E I H 1 ifl H 6 J lv_count_loop end R E 3411 ifg F E W 3411 F end O S P
${lit('lv_none','none')}${lit('lv_dead','Unused: ')}${lit('lv_peak','Peak live variables=')}${common}`;
apps.push({number:424,kind:'text',id:'live-variables',site:'ada',title:'Live Variable Analysis',inputs:['assignments|out'],outputs:['Line: live variables before'],description:'Analyze 1..7 assignments separated by semicolons, then | and distinct observed variables. Variables a..f; forms a=b or a=b+c, using binary +,-,* only. No spaces. Example a=b+c;b=a*d;d=b|d. Native backward dataflow reports variables needed before each line, maximum simultaneously live variables, and lines whose assigned result is unused. Empty observed set is allowed; - means no live variables. Assignments are pure, but this reports the original code without deleting dead lines, so inputs to an unused assignment still count. Lines start at 1; no arithmetic is executed.',algorithm:live,examples:[{"input":"a=b+c;b=a*d;d=b|d","output":"Unused: none               Peak live variables=3      1:bcd    2:ad     3:b      "}]});
export const CODING_WORKBENCH=apps;
// Candidate keys form an antichain. With six attributes their names plus spaces
// total at most max_k (k+1)*choose(6,k)=80 characters (LYM inequality).
// Whole-key wrapping wastes at most six columns/row, so four rows suffice.
const keys=`app_compute: W 3400 2552 R E 2610 A E 2552 W 3401 E W 3410 Z W 3411 Z W 3412 Z W 3413 1 M A 2900 M B 180 K A B
rk_attributes: C S cw_take N A Z O S P ife E 124 R E 3410 E E Z J cw_bad J rk_rule end R F 3410 A F 65 N E F J cw_bad R E 3410 I E 1 ifg E 6 J cw_bad end W 3410 E R E 3413 P E 2 W 3413 E J rk_attributes
rk_rule: R E 3411 ifge E 8 J cw_bad end W 3415 Z W 3416 Z
rk_left: C S cw_take N A Z O S P ife E 126 R E 3415 N E Z J cw_bad C S cw_take N A Z O S P N E 62 J cw_bad J rk_right_start end ife E 62 R E 3415 E E Z J cw_bad J rk_right_start end C S rk_attribute N A Z O S P R A 3415 M B F C S cw_union R E 3415 E A E J cw_bad W 3415 A J rk_left
rk_right_start: W 3416 Z
rk_right: R E 3400 R F 3401 ife E F J rk_store end C S cw_take N A Z O S P ife E 44 J rk_store_more end C S rk_attribute N A Z O S P R A 3416 M B F C S cw_union R E 3416 E A E J cw_bad W 3416 A J rk_right
rk_store_more: W 3412 1 J rk_save
rk_store: W 3412 Z
rk_save: R E 3416 E E Z J cw_bad R I 3411 A I 2900 R E 3415 W I E R I 3411 A I 2910 R E 3416 W I E R E 3411 I E 1 W 3411 E R E 3412 ifn E Z J rk_rule end R E 3413 I E -1 W 3413 E W 3430 Z W 3431 Z
rk_candidate: R A 3430 C S rk_closure R E 3413 ifn A E J rk_candidate_next end W 3432 Z
rk_minimal: R E 3432 R F 3430 ifge E F J rk_found end M I 3000 A I E R E I ifn E Z R A 3432 R B 3430 C S cw_subset ifn A Z J rk_candidate_next end end R E 3432 I E 1 W 3432 E J rk_minimal
rk_found: R I 3430 A I 3000 W I 1 R E 3431 I E 1 W 3431 E
rk_candidate_next: R E 3430 I E 1 W 3430 E R F 3413 ifle E F J rk_candidate end
${text('rk_keys')}${num(3431)}${pad(1)}W 3430 Z
rk_print_key: R I 3430 A I 3000 R E I ife E Z J rk_print_next end R A 3430 M L Z M H A M K Z
rk_key_count: M E H Q E 2 M F E P F 2 S H F A L H M H E I K 1 ifl K 6 J rk_key_count end ife L Z M L 1 end I L 1 R A 2620 M B 27 C S app_div A C L ifg C 27 R E 2620 M A 27 S A C A A L A A E C S cw_pad end R E 3430 ife E Z M A 126 C S app_put else M H E M K Z
rk_key_chars: M E H Q E 2 M F E P F 2 S H F ifn H Z M A K A A 65 C S app_put end M H E I K 1 ifl K 6 J rk_key_chars end end M A 32 C S app_put
rk_print_next: R E 3430 I E 1 W 3430 E R F 3413 ifle E F J rk_print_key end ${pad(5)}${text('rk_bcnf')}W 3430 Z W 3431 Z
rk_violation: R I 3430 A I 2900 R B I R I 3430 A I 2910 R A I C S cw_subset ifn A Z J rk_vnext end R I 3430 A I 2900 R A I C S rk_closure R E 3413 ife A E J rk_vnext end R A 3430 A A 49 C S app_put M A 32 C S app_put W 3431 1
rk_vnext: R E 3430 I E 1 W 3430 E R F 3411 ifl E F J rk_violation end R E 3431 ife E Z ${text('rk_yes')}end M A Z O S P
rk_attribute: S E 65 ifl E Z J cw_bad end R F 3410 ifge E F J cw_bad end M I @rk_powers A I E R F I M A Z O S P
rk_closure: W 3420 A
rk_pass: W 3421 Z W 3422 Z
rk_edge: R I 3421 A I 2900 R A I R B 3420 C S cw_subset ife A Z J rk_enext end R I 3421 A I 2910 R B I R A 3420 C S cw_union R E 3420 ifn A E W 3420 A W 3422 1 end
rk_enext: R E 3421 I E 1 W 3421 E R F 3411 ifl E F J rk_edge end R E 3422 ifn E Z J rk_pass end R A 3420 O S P
; Nonnegative binary masks <=63; Q /2 floors because odd halves tie toward zero.
cw_subset: W 3419 B C S cw_union R E 3419 ife A E M A 1 else M A Z end O S P
cw_union: M C Z M D 1
cw_union_loop: M E A Q E 2 M F E P F 2 S A F M G B Q G 2 M H G P H 2 S B H A A B ifn A Z A C D end M A E M B G P D 2 ifl D 64 J cw_union_loop end M A C O S P
rk_powers: 1 2 4 8 16 32
${lit('rk_keys','Minimal candidate keys=')}${lit('rk_bcnf','BCNF bad: ')}${lit('rk_yes','none')}${common}`;
apps.push({number:425,kind:'text',id:'relation-keys',site:'library',title:'Relation Keys',inputs:['ABC|A>B,B>C'],outputs:['Keys / BCNF rule witnesses'],description:'Declare attributes as A, AB, ABC, up to ABCDEF, then | and 1..8 comma-separated functional dependencies such as AB>C. Each side lists distinct declared attributes; ~ is an empty left side. Example ABC|A>B,B>C has the sole candidate key A. Native fixed-point closure and subset enumeration find every minimal key; ~ denotes an empty key. Boyce-Codd normal form (BCNF) failing rules are one-based input rules whose left side is not a superkey and whose right side adds an attribute. Dependencies with multiple left attributes require all of them. All keys fit the bounded six-attribute report; line breaks keep each key intact.',algorithm:keys,examples:[{"input":"ABC|A>B,B>C","output":"Minimal candidate keys=1   A                                                                                                           BCNF bad: 2 "}]});
const tokens=`app_compute: W 3400 2552 R E 2610 A E 2552 W 3401 E W 3410 Z
 tk_next: R I 3400 R E 3401 ifge I E J tk_report end R E I W 3411 I W 3412 79 ife E 32 I I 1 W 3400 I J tk_next end ife E 34 W 3412 83 I I 1 W 3400 I J tk_string end ifge E 48 ifle E 57 W 3412 78 J tk_number end end C S tk_isletter ifn A Z W 3412 73 J tk_identifier end R I 3400 R E I ife E 47 M F I I F 1 R G 3401 ifl F G R F F ife F 42 I I 2 W 3400 I J tk_comment end end end
 M J @tk_punctuation
 tk_punc: R F J ife F Z J tk_operator end ife E F W 3412 80 J tk_one end I J 1 J tk_punc
 tk_operator: M J @tk_operators
 tk_op: R F J ife F Z J tk_error end ife E F J tk_op_found end I J 1 J tk_op
 tk_op_found: M H E I I 1 W 3400 I R F 3401 ifge I F J tk_emit end R F I ife F 61 ife H 61 J tk_double end ife H 33 J tk_double end ife H 60 J tk_double end ife H 62 J tk_double end end ife F H ife H 38 J tk_double end ife H 124 J tk_double end end J tk_emit
 tk_double: I I 1 W 3400 I J tk_emit
 tk_one: I I 1 W 3400 I J tk_emit
 tk_identifier: R I 3400 I I 1 W 3400 I R F 3401 ifge I F J tk_emit end R E I C S tk_isletter ifn A Z J tk_identifier end ifge E 48 ifle E 57 J tk_identifier end end J tk_emit
 tk_number: R I 3400 R E I ife E 48 M F I I F 1 R G 3401 ifl F G R E F ife E 120 I I 2 W 3400 I R E 3401 ifge I E J tk_error end R E I C S tk_ishex ife A Z J tk_error end J tk_hex end end end
 tk_decimal: R I 3400 I I 1 W 3400 I R F 3401 ifge I F J tk_emit end R E I ifge E 48 ifle E 57 J tk_decimal end end C S tk_isletter ifn A Z J tk_error end J tk_emit
 tk_hex: R I 3400 I I 1 W 3400 I R F 3401 ifge I F J tk_emit end R E I C S tk_ishex ifn A Z J tk_hex end C S tk_isletter ifn A Z J tk_error end J tk_emit
 tk_string: R I 3400 R E 3401 ifge I E J tk_error end R E I I I 1 W 3400 I ife E 34 J tk_emit end ifn E 92 J tk_string end R E 3401 ifge I E J tk_error end R E I I I 1 W 3400 I ife E 34 J tk_string end ife E 92 J tk_string end ife E 110 J tk_string end ife E 114 J tk_string end ife E 116 J tk_string end J tk_error
 tk_comment: R I 3400 R E 3401 ifge I E J tk_error end R E I I I 1 W 3400 I ifn E 42 J tk_comment end R E 3401 ifge I E J tk_error end R E I ifn E 47 J tk_comment end I I 1 W 3400 I J tk_next
 tk_emit: R E 3410 ifl E 12 M I 2900 A I E R F 3411 S F 2552 W I F M I 2920 A I E R F 3400 S F 2552 W I F M I 2940 A I E R F 3412 W I F end I E 1 W 3410 E J tk_next
 tk_error: ${text('tk_error_text')}R F 3411 S F 2552 C S stats_int M A Z O S P
 tk_report: R E 3410 ifg E 12 ${text('tk_limit')}M A Z O S P end ife E Z ${text('tk_empty')}M A Z O S P end M L Z
 tk_print: M I 2940 A I L R A I C S app_put M A 32 C S app_put M I 2900 A I L R F I C S stats_int M A 58 C S app_put M I 2920 A I L R F I C S stats_int I L 1 M A L M B 2 C S app_div P A 27 ifn C Z A A 13 end C S cw_pad R E 3410 ifl L E J tk_print end M A Z O S P
 tk_isletter: M A 1 ife E 95 O S P end ifge E 65 ifle E 90 O S P end end ifge E 97 ifle E 122 O S P end end M A Z O S P
 tk_ishex: M A 1 ifge E 48 ifle E 57 O S P end end ifge E 65 ifle E 70 O S P end end ifge E 97 ifle E 102 O S P end end M A Z O S P
 ${lit('tk_punctuation','(){}[],;:')}${lit('tk_operators','+-*/=%!<>&|^~')}${lit('tk_error_text','LEXICAL ERROR; token at ')}${lit('tk_limit','VALID; TOKEN LIMIT (12)')}${lit('tk_empty','No tokens')}${common}`;
apps.push({number:426,kind:'text',id:'token-inspector',site:'typecase',title:'Token Inspector',inputs:['Source text'],outputs:['Kind start:end (exclusive)'],description:'Scan a tiny C-like language without executing it. I identifiers use ASCII letters, digits and underscore, starting with a letter/underscore. N integers are decimal digit runs or 0x plus hex digits; a following letter/underscore is an error. S strings use double quotes and escapes for quote, backslash, n, r or t. O operators include maximal-munch == != <= >= && ||; P marks parentheses, braces, brackets, comma, semicolon or colon. Spaces and nonnested /*comments*/ are skipped. Spans are zero-based and end-exclusive. Example sum=0xA+2 yields five tokens. An error names its token start; over twelve valid tokens reports an explicit limit.',algorithm:tokens,examples:[{"input":"sum=0xA+2","output":"I 0:3        O 3:4         N 4:7        O 7:8         N 8:9        "}]});
// Bounded documented subset of JSON; full grammar is independently checked in tests.
// https://www.rfc-editor.org/rfc/rfc8259
const query=`app_compute: W 3400 2552 R E 2610 A E 2552 W 3401 E W 3460 Z W 3461 Z W 3440 2552
jq_path: R I 3400 R E 3401 ifge I E J cw_bad end R E I ife E 124 J jq_path_end end R F 3400 S F 2552 ifge F 12 J cw_bad end ife E 46 J jq_segment end I I 1 W 3400 I J jq_path
jq_segment: C S jq_save_segment N A Z O S P R I 3400 I I 1 W 3400 I W 3440 I J jq_path
jq_path_end: R E 3400 ifn E 2552 C S jq_save_segment N A Z O S P end R I 3400 I I 1 W 3400 I W 3420 Z W 3421 Z W 3422 -1 W 3423 Z W 3424 Z C S jq_value N A Z O S P C S jq_space R E 3400 R F 3401 N E F J cw_bad W 3442 Z W 3461 Z
jq_select: R E 3461 R F 3460 ifge E F J jq_result end M I 3100 A I E R E I W 3440 E R I 3461 A I 3120 R E I W 3441 E W 3443 Z
jq_find: R E 3443 R F 3420 ifge E F ${text('jq_missing')}M A Z O S P end M I 2960 A I E R E I R F 3442 ifn E F J jq_find_next end R I 3443 A I 2980 R E I ife E -1 R E 3441 ifn E 1 J jq_find_next end R I 3440 R E I S E 48 R I 3443 A I 3000 R F I ifn E F J jq_find_next end J jq_found end W 3450 E R I 3443 A I 3000 R E I R F 3441 ifn E F J jq_find_next end R I 3450 R J 3440 M K E
jq_compare: R E I R F J ifn E F J jq_find_next end I I 1 I J 1 I K -1 N K Z J jq_compare
jq_found: R E 3443 W 3442 E R E 3461 I E 1 W 3461 E J jq_select
jq_find_next: R E 3443 I E 1 W 3443 E J jq_find
jq_result: R I 3442 A I 2940 R E I M I @jq_types A I E R A I C S stats_label ${pad(1)}R I 3442 A I 2900 R J I R I 3442 A I 2920 R K I
jq_raw: ifge J K M A Z O S P end R A J C S app_put I J 1 J jq_raw
jq_save_segment: R I 3440 R K 3400 S K I ifl K 1 J cw_bad end ifg K 8 J cw_bad end R E I ifge E 48 ifle E 57 N K 1 J cw_bad J jq_segment_ok end end M J I M H K
jq_segment_letters: R E J ifl E 97 J cw_bad end ifg E 122 J cw_bad end I J 1 I H -1 N H Z J jq_segment_letters
jq_segment_ok: R E 3460 ifge E 6 J cw_bad end M J 3100 A J E W J I M J 3120 A J E W J K I E 1 W 3460 E M A Z O S P
jq_space: R I 3400 R E 3401 ifge I E M E -1 O S P end R E I ifn E 32 O S P end I I 1 W 3400 I J jq_space
jq_value: C S jq_space R E 3421 I E 1 ifg E 4 J cw_bad end W 3421 E R L 3420 ifge L 16 J cw_bad end M E L I E 1 W 3420 E M I 2900 A I L R E 3400 W I E M I 2960 A I L R E 3422 W I E M I 2980 A I L R E 3423 W I E M I 3000 A I L R E 3424 W I E C S cw_take N A Z O S P
 ife E 123 M F 1 J jq_object end ife E 91 M F 2 J jq_array end ife E 34 M F 3 C S jq_type J jq_string end ife E 116 M F 5 M J @jq_true J jq_literal end ife E 102 M F 5 M J @jq_false J jq_literal end ife E 110 M F 6 M J @jq_null J jq_literal end M F 4 C S jq_type ife E 45 C S cw_take N A Z O S P end ifl E 48 J cw_bad end ifg E 57 J cw_bad end W 3453 E W 3454 1
jq_digits: R I 3400 R E 3401 ifge I E J jq_done end R E I ifl E 48 J jq_done end ifg E 57 J jq_done end R F 3453 E F 48 J cw_bad R F 3454 I F 1 ifg F 2 J cw_bad end W 3454 F I I 1 W 3400 I J jq_digits
jq_type: M I 2940 A I L W I F O S P
jq_literal: C S jq_type I J 1
jq_literal_next: R F J ife F Z J jq_done end C S cw_take N A Z O S P N E F J cw_bad I J 1 J jq_literal_next
jq_string: C S cw_take N A Z O S P ife E 34 J jq_done end ife E 92 C S cw_take N A Z O S P ifn E 34 ifn E 92 N E 47 J cw_bad end end end J jq_string
jq_object: C S jq_type C S jq_space ife E 125 C S cw_take J jq_done end
jq_member: C S cw_take N A Z O S P N E 34 J cw_bad R E 3400 W 3423 E W 3424 Z
jq_key: C S cw_take N A Z O S P ife E 34 J jq_key_done end ifl E 97 J cw_bad end ifg E 122 J cw_bad end R E 3424 I E 1 ifg E 8 J cw_bad end W 3424 E J jq_key
jq_key_done: R E 3424 E E Z J cw_bad M K Z
jq_duplicate: R E 3420 ifge K E J jq_colon end M I 2960 A I K R E I ifn E L J jq_dup_next end M I 3000 A I K R E I R F 3424 ifn E F J jq_dup_next end M I 2980 A I K R I I R J 3423 M H F
jq_dup_chars: R E I R F J ifn E F J jq_dup_next end I I 1 I J 1 I H -1 N H Z J jq_dup_chars J cw_bad
jq_dup_next: I K 1 J jq_duplicate
jq_colon: C S jq_space C S cw_take N A Z O S P N E 58 J cw_bad W 3422 L U S L C S jq_value O S L N A Z O S P C S jq_space ife E 125 C S cw_take J jq_done end C S cw_take N A Z O S P N E 44 J cw_bad C S jq_space J jq_member
jq_array: C S jq_type M K Z C S jq_space ife E 93 C S cw_take J jq_done end
jq_element: ifge K 10 J cw_bad end W 3422 L W 3423 -1 W 3424 K U S L U S K C S jq_value O S K O S L N A Z O S P I K 1 C S jq_space ife E 93 C S cw_take J jq_done end C S cw_take N A Z O S P N E 44 J cw_bad J jq_element
jq_done: M I 2920 A I L R E 3400 W I E R E 3421 I E -1 W 3421 E M A Z O S P
jq_types: Z @jq_object_text @jq_array_text @jq_string_text @jq_number_text @jq_boolean_text @jq_null_text
${lit('jq_object_text','OBJECT')}${lit('jq_array_text','ARRAY')}${lit('jq_string_text','STRING (JSON spelling)')}${lit('jq_number_text','INTEGER')}${lit('jq_boolean_text','BOOLEAN')}${lit('jq_null_text','NULL')}${lit('jq_true','true')}${lit('jq_false','false')}${lit('jq_null','null')}${lit('jq_missing','PATH NOT FOUND')}${common}`;
apps.push({number:421,kind:'text',id:'structured-query',site:'archivist',title:'Structured Query',inputs:['path|JSON'],outputs:['Selected type and JSON'],description:'Query a bounded JSON tree: a.0|{"a":[7,8]} selects 7; an empty path selects the root. Path up to 12 characters: lowercase key segments or single-digit array indices. Keys contain 1..8 lowercase letters and cannot repeat in one object. Values: objects, arrays (at most ten items), strings, integers -99..99, true, false, null. Strings allow printable ASCII and only quote, backslash or slash escapes; integers forbid leading zeros. Spaces may separate JSON tokens. Maximum 16 values and four nesting levels including the root. The entire document is validated even outside the selected path. Output preserves the selected JSON spelling.',algorithm:query,examples:[{"input":"a.0|{\"a\":[7,8]}","output":"INTEGER                    7"}]});
const merge=`app_compute: W 3400 2552 R E 2610 A E 2552 W 3401 E W 3402 2552 W 3405 Z W 3406 Z W 3407 Z M L Z
mg_split: R I 3400 R E 3401 ifge I E ifn L 2 J cw_bad end J mg_start end R E I ife E 124 I L 1 ifg L 2 J cw_bad end I I 1 M J 3402 A J L W J I else M J 3405 A J L R E J I E 1 ifg E 12 J cw_bad end W J E I I 1 end W 3400 I J mg_split
mg_start: R E 3403 W 3410 E R E 3406 W 3411 E W 3412 3100 C S mg_diff R E 3417 W 3430 E R E 3404 W 3410 E R E 3407 W 3411 E W 3412 3200 C S mg_diff R E 3417 W 3431 E M A 3300 M B 13 K A B W 3440 Z
mg_left_pair: R E 3440 R F 3430 ifge E F J mg_merge end W 3441 Z
mg_right_pair: R E 3441 R F 3431 ifge E F J mg_lnext end R I 3440 P I 4 A I 3100 R E I W 3442 E M E I/1 W 3443 E R I 3441 P I 4 A I 3200 R E I W 3444 E M E I/1 W 3445 E R E 3442 R F 3444 ifn E F J mg_overlap end R E 3443 R F 3445 ifn E F J mg_overlap end C S mg_identical ifn A Z R I 3441 A I 3300 W I 1 J mg_rnext end
mg_overlap: R E 3442 R F 3443 ife E F R G 3444 R H 3445 ifge E G ifle E H J mg_conflict end end J mg_rnext end R G 3444 R H 3445 ife G H ifge G E ifle G F J mg_conflict end end J mg_rnext end ifl E H ifl G F J mg_conflict end end
mg_rnext: R E 3441 I E 1 W 3441 E J mg_right_pair
mg_lnext: R E 3440 I E 1 W 3440 E J mg_left_pair
mg_merge: W 3450 Z W 3451 Z W 3460 Z W 3461 Z
mg_choose: R E 3451 R F 3431 ifl E F M I 3300 A I E R E I ifn E Z R E 3451 I E 1 W 3451 E J mg_choose end end R E 3450 R F 3430 ifge E F R E 3451 R F 3431 ifge E F J mg_tail end J mg_choose_right end R E 3451 R F 3431 ifge E F J mg_choose_left end R I 3450 P I 4 A I 3100 R E I R J 3451 P J 4 A J 3200 R F J ifle E F J mg_choose_left end
mg_choose_right: R I 3451 P I 4 A I 3200 R E 3404 W 3462 E R E 3451 I E 1 W 3451 E J mg_apply
mg_choose_left: R I 3450 P I 4 A I 3100 R E 3403 W 3462 E R E 3450 I E 1 W 3450 E
mg_apply: R E I W 3463 E M E I/1 W 3464 E M E I/2 W 3465 E M E I/3 W 3466 E R A 3402 R E 3461 A A E R B 3463 S B E C S mg_append R A 3462 R E 3465 A A E R B 3466 S B E C S mg_append R E 3464 W 3461 E J mg_choose
mg_tail: R A 3402 R E 3461 A A E R B 3405 S B E C S mg_append ${text('mg_merged')}${pad(1)}M J 3500 R K 3460
mg_output: ife K Z J mg_output_end end R A J C S app_put I J 1 I K -1 J mg_output
mg_output_end: ${pad(3)}${text('mg_lcount')}${num(3430)}${text('mg_rcount')}${num(3431)}${pad(4)}${text('mg_legend')}M A Z O S P
mg_conflict: ${text('mg_conflict_text')}R F 3442 R E 3444 ifl E F M F E end C S stats_int M A 58 C S app_put R F 3443 R E 3445 ifg E F M F E end C S stats_int ${pad(1)}${text('mg_left_text')}R I 3440 P I 4 A I 3100 R J 3403 C S mg_replacement ${pad(2)}${text('mg_right_text')}R I 3441 P I 4 A I 3200 R J 3404 C S mg_replacement ${pad(3)}${text('mg_bounds')}M A Z O S P
mg_replacement: M E I/2 A J E M K I/3 S K E ife K Z M A 45 C S app_put O S P end
mg_replacement_loop: R A J C S app_put I J 1 I K -1 N K Z J mg_replacement_loop O S P
mg_append: M J A M K B R I 3460 A I 3500
mg_append_loop: ife K Z M A Z O S P end R E J W I E I I 1 I J 1 I K -1 R E 3460 I E 1 W 3460 E J mg_append_loop
mg_identical: R I 3440 P I 4 A I 3100 M E I/2 M F I/3 S F E R J 3403 A J E R I 3441 P I 4 A I 3200 M E I/2 M G I/3 S G E ifn F G M A Z O S P end R I 3404 A I E
mg_equal: ife F Z M A 1 O S P end R E I R G J ifn E G M A Z O S P end I I 1 I J 1 I F -1 J mg_equal
; LCS suffix table. Delete from base first on tied alternatives.
mg_diff: M A 2900 M B 169 K A B R L 3405 I L -1
mg_dp_i: ifl L Z J mg_trace_start end R K 3411 I K -1
mg_dp_j: ifl K Z I L -1 J mg_dp_i end R I 3402 A I L R E I R I 3410 A I K R F I M I L P I 13 A I K A I 2900 ife E F M F I/14 I F 1 else M F I/13 M G I/1 ifg G F M F G end end W I F I K -1 J mg_dp_j
mg_trace_start: W 3414 Z W 3415 Z W 3416 Z W 3417 Z
mg_trace: R E 3414 R F 3405 ifge E F R E 3415 R F 3411 ifge E F C S mg_flush M A Z O S P end J mg_insert end R E 3415 R F 3411 ifge E F J mg_delete end R I 3402 R E 3414 A I E R E I R I 3410 R F 3415 A I F R F I ife E F C S mg_flush R E 3414 I E 1 W 3414 E R E 3415 I E 1 W 3415 E J mg_trace end R I 3414 P I 13 R E 3415 A I E A I 2900 M E I/13 M F I/1 ifge E F J mg_delete end
mg_insert: C S mg_open R E 3415 I E 1 W 3415 E J mg_trace
mg_delete: C S mg_open R E 3414 I E 1 W 3414 E J mg_trace
mg_open: R E 3416 ifn E Z O S P end W 3416 1 R I 3417 P I 4 R E 3412 A I E R E 3414 W I E I I 2 R E 3415 W I E
 O S P
mg_flush: R E 3416 ife E Z O S P end W 3416 Z R I 3417 P I 4 R E 3412 A I E I I 1 R E 3414 W I E I I 2 R E 3415 W I E R E 3417 I E 1 W 3417 E O S P
${lit('mg_merged','MERGED')}${lit('mg_lcount','Edit hunks L=')}${lit('mg_rcount',' R=')}${lit('mg_legend','Identical edits appear once')}${lit('mg_conflict_text','CONFLICT base ')}${lit('mg_left_text','LEFT: ')}${lit('mg_right_text','RIGHT: ')}${lit('mg_bounds','0-based spans; end excluded')}${common}`;
apps.push({number:422,kind:'text',id:'three-way-merge',site:'letters',title:'Three-Way Merge',inputs:['base|left|right'],outputs:['Merged text or conflict'],description:'Merge two edited versions of a base, each 0..12 printable characters excluding |. Example abc|axbc|abcy gives axbcy. Native suffix-LCS alignments keep equal characters and prefer deleting a base character when alternatives tie; each uninterrupted change becomes one edit hunk. Identical hunks are applied once, disjoint hunks combine, overlapping replacements conflict. Insertions conflict with another edit at either endpoint as well as inside it; different insertions at the same gap conflict. Adjacent nonempty replacements may combine. The first conflicting hunk pair reports base span and both replacements (- means empty); no partial merge is returned.',algorithm:merge,examples:[{"input":"abc|axbc|abcy","output":"MERGED                     axbcy                                                 Edit hunks L=1 R=1         Identical edits appear once"}]});
apps.sort((a,b)=>a.number-b.number);
