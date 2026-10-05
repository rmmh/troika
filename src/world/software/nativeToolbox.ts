import type {TextSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
// Guest scratch: tables 3000..3035, DP/trace 3100..3154, choices 3200..3253,
// counters 3300..3306, decoded CSV characters 3400..3453. Input remains immutable.
const wordBreak=`app_compute: M J 2552 R K 2610 M G Z M H Z W 3000 J
wb_parse: E K Z J wb_bad R E J E E 124 J wb_text E E 44 J wb_comma ifl E 97 J wb_bad end ifg E 122 J wb_bad end I H 1 I J 1 I K -1 J wb_parse
wb_comma: E H Z J wb_bad M I 3010 A I G W I H I G 1 ifge G 6 J wb_bad end M H Z I J 1 I K -1 M I 3000 A I G W I J J wb_parse
wb_text: E H Z J wb_bad M I 3010 A I G W I H I G 1 W 3022 G I J 1 I K -1 W 3020 J W 3021 K M I J M H K
wb_check: E H Z J wb_begin R E I ifl E 97 J wb_bad end ifg E 122 J wb_bad end I I 1 I H -1 J wb_check
wb_begin: R E 3021 M I 3100 A I E W I Z I E -1 W 3300 E
wb_pos: R E 3300 ifl E Z J wb_output end M I 3100 A I E W I 99 W 3301 Z
wb_rule: R G 3301 R H 3022 ifge G H J wb_prev end M I 3010 A I G R K I W 3302 K R E 3300 A E K R F 3021 ifg E F J wb_next end M I 3000 A I G R J I R I 3020 R E 3300 A I E
wb_match: R E I R F J ifn E F J wb_next end I I 1 I J 1 I K -1 N K Z J wb_match
 R E 3300 R F 3302 A E F M I 3100 A I E R H I I H 1 R E 3300 M I 3100 A I E R F I ifl H F W I H M I 3200 A I E R G 3301 W I G end
wb_next: R E 3301 I E 1 W 3301 E J wb_rule
wb_prev: R E 3300 I E -1 W 3300 E J wb_pos
wb_output: R E 3100 ifge E 99 M A @wb_none M B 8 J app_emit end W 3300 Z
wb_emit: R E 3300 R F 3021 ifge E F M A Z O S P end ifn E Z M A 32 C S app_put N A Z O S P end M I 3200 A I E R G I M I 3000 A I G R J I M I 3010 A I G R K I A E K W 3300 E
wb_letters: R A J C S app_put N A Z O S P I J 1 I K -1 N K Z J wb_letters J wb_emit
wb_bad: M A -1 O S P
wb_none: ${ascii('NO SPLIT')}`;
const merge=`app_compute: M J 2552 R K 2610 M I 3000 M G Z M H Z M L Z W 3300 Z W 3301 Z W 3302 Z
mg_parse: E K Z J mg_end R E J E E 44 J mg_comma E E 124 J mg_bar ifl E 48 J mg_bad end ifg E 57 J mg_bad end ifge H 2 J mg_bad end P G 10 S E 48 A G E I H 1 I J 1 I K -1 J mg_parse
mg_comma: C S mg_store N A Z O S P I J 1 I K -1 E K Z J mg_bad W 3302 1 J mg_parse
mg_bar: R E 3300 N E Z J mg_bad ifn H Z C S mg_store N A Z O S P else R E 3302 N E Z J mg_bad end W 3301 L W 3300 1 M I 3020 M L Z W 3302 Z I J 1 I K -1 J mg_parse
mg_end: R E 3300 E E Z J mg_bad ifn H Z C S mg_store N A Z O S P else R E 3302 N E Z J mg_bad end W 3303 L W 3304 Z W 3305 Z W 3306 Z M A @mg_values M B 8 C S app_emit
mg_pick: R G 3304 R H 3305 R E 3301 R F 3303 ifge G E ifge H F J mg_trace end J mg_right end ifge H F J mg_left end M I 3000 A I G R E I M I 3020 A I H R F I ifle E F J mg_left end
mg_right: M I 3020 A I H R F I I H 1 W 3305 H M L 82 J mg_write
mg_left: M I 3000 A I G R F I I G 1 W 3304 G M L 76
mg_write: R E 3306 ifn E Z M A 44 C S app_put end C S app_decimal N A Z O S P R E 3306 M I 3100 A I E W I L I E 1 W 3306 E J mg_pick
mg_trace: R E 2620 ifge E 81 J mg_trace_start end M A 32 C S app_put J mg_trace
mg_trace_start: M A @mg_sources M B 9 C S app_emit M J 3100 R K 3306
mg_trace_loop: E K Z M A Z E K Z O S P R A J C S app_put N A Z O S P I J 1 I K -1 J mg_trace_loop
mg_store: E H Z J mg_bad ifge L 12 J mg_bad end ifn L Z M E I/-1 ifg E G J mg_bad end end W I G I I 1 I L 1 M G Z M H Z W 3302 Z M A Z O S P
mg_bad: M A -1 O S P
mg_values: ${ascii('Values: ')}
mg_sources: ${ascii('Sources: ')}`;
const rewrite=`app_compute: M J 2552 R K 2610 M G Z M H Z M L Z W 3000 J
rw_parse: E K Z J rw_bad R E J E E 62 J rw_arrow E E 44 J rw_comma E E 124 J rw_text ifl E 97 J rw_bad end ifg E 122 J rw_bad end I H 1 I J 1 I K -1 J rw_parse
rw_arrow: N L Z J rw_bad E H Z J rw_bad M I 3010 A I G W I H M H Z M L 1 I J 1 I K -1 M I 3020 A I G W I J J rw_parse
rw_comma: E L Z J rw_bad M I 3030 A I G W I H I G 1 ifge G 6 J rw_bad end M H Z M L Z I J 1 I K -1 M I 3000 A I G W I J J rw_parse
rw_text: E L Z J rw_bad M I 3030 A I G W I H I G 1 W 3300 G I J 1 I K -1 W 3301 J W 3302 K M I J M H K
rw_check: E H Z J rw_position R E I ifl E 97 J rw_bad end ifg E 122 J rw_bad end I I 1 I H -1 J rw_check
rw_position: R E 3302 E E Z M A Z E E Z O S P W 3303 Z W 3304 Z W 3305 -1
rw_rule: R G 3303 R H 3300 ifge G H J rw_choose end M I 3010 A I G R K I R E 3302 ifg K E J rw_next end R E 3304 ifle K E J rw_next end M I 3000 A I G R J I R I 3301
rw_match: R E I R F J ifn E F J rw_next end I I 1 I J 1 I K -1 N K Z J rw_match
 M I 3010 A I G R E I W 3304 E W 3305 G
rw_next: R E 3303 I E 1 W 3303 E J rw_rule
rw_choose: R G 3305 ifl G Z R I 3301 R A I C S app_put N A Z O S P W 3304 1 J rw_advance end M I 3020 A I G R J I M I 3030 A I G R K I
rw_emit: E K Z J rw_advance R A J C S app_put N A Z O S P I J 1 I K -1 J rw_emit
rw_advance: R E 3304 R F 3301 A F E W 3301 F R F 3302 S F E W 3302 F J rw_position
rw_bad: M A -1 O S P`;
const project=`app_compute: M J 2552 R K 2610 M G Z M H Z
fp_select: E K Z J fp_bad R E J ifl E 49 J fp_bad end ifg E 57 J fp_bad end ifge G 9 J fp_bad end S E 49 M I 3100 A I G W I E I G 1 I J 1 I K -1 E K Z J fp_bad R E J I J 1 I K -1 E E 124 J fp_record N E 44 J fp_bad J fp_select
fp_record: W 3300 G W 3301 Z M I 3400
fp_field: R G 3301 ifge G 9 J fp_bad end M H 3000 A H G W H I M L Z E K Z J fp_close R E J ife E 34 I J 1 I K -1 J fp_quoted end
fp_plain: E K Z J fp_close R E J E E 44 J fp_close E E 34 J fp_bad W I E I I 1 I L 1 I J 1 I K -1 J fp_plain
fp_quoted: E K Z J fp_bad R E J I J 1 I K -1 ife E 34 ife K Z J fp_close end R E J ifn E 34 N E 44 J fp_bad J fp_close end I J 1 I K -1 end W I E I I 1 I L 1 J fp_quoted
fp_close: R G 3301 M H 3010 A H G W H L I G 1 W 3301 G E K Z J fp_output I J 1 I K -1 J fp_field
fp_output: W 3302 Z
fp_emit_field: R G 3302 R H 3300 ifge G H M A Z O S P end M I 3100 A I G R L I R H 3301 ifge L H J fp_bad end ifn G Z M A 44 C S app_put N A Z O S P end M A 34 C S app_put N A Z O S P M I 3000 A I L R J I M I 3010 A I L R K I
fp_emit_char: E K Z J fp_emit_end R L J M A L C S app_put N A Z O S P ife L 34 M A 34 C S app_put N A Z O S P end I J 1 I K -1 J fp_emit_char
fp_emit_end: M A 34 C S app_put N A Z O S P R E 3302 I E 1 W 3302 E J fp_emit_field
fp_bad: M A -1 O S P`;
export const NATIVE_TOOLBOX:TextSoftware[]=[
 {number:298,kind:'text',id:'dictionary-split',site:'library',title:'Dictionary Word Break',inputs:['words|text'],outputs:['Minimum-word split'],description:'Enter 1..6 comma-separated dictionary words, then | and a text with no spaces. All letters must be lowercase a..z. Find a complete segmentation using the fewest dictionary words; words may be reused. Equal counts prefer the earliest dictionary entry at the first differing choice. NO SPLIT means no complete solution. Empty text gives empty output. Example a,ab,b|abab gives ab ab.',algorithm:wordBreak,examples:[{input:'a,ab,b|abab',output:'ab ab'},{input:'ab,bc|abc',output:'NO SPLIT'},{input:'a,,b|ab',error:true}]},
 {number:299,kind:'text',id:'sorted-merge',site:'typecase',title:'Stable Sorted Merge',inputs:['left|right'],outputs:['Values / source trace'],description:'Merge two already sorted comma-separated lists, separated by |. Each side allows 0..12 nonnegative integers 0..99, written with 1..2 digits. Empty sides are allowed. Decreasing input is an error, not silently sorted. Equal values from the left list come first. Values occupy the first three screen rows; Sources lists L or R for each output value in order. Example 1,3|2,3 gives 1,2,3,3 and LRLR.',algorithm:merge,examples:[{input:'1,3|2,3',output:'Values: 1,2,3,3'.padEnd(81)+'Sources: LRLR'},{input:'|',output:'Values: '.padEnd(81)+'Sources: '},{input:'2,1|3',error:true}]},
 {number:300,kind:'text',id:'parallel-rewrite',site:'zine',title:'Simultaneous Rewrite',inputs:['old>new,...|text'],outputs:['Rewritten text'],description:'Enter 1..6 comma-separated old>new rules, then | and the text. Use lowercase letters only. Old words must be nonempty; an empty new word deletes a match. At each original text position choose the longest matching old word; equal lengths prefer the earlier rule. Unmatched letters pass through. Replacement text is never rescanned, so a>b,b>a swaps letters in one pass. Empty text is allowed. Output beyond 162 characters is an error.',algorithm:rewrite,examples:[{input:'a>b,b>a|abba',output:'baab'},{input:'a>x,ab>q|abac',output:'qxc'},{input:'a>|banana',output:'bnn'},{input:'>a|b',error:true}]},
 {number:301,kind:'text',id:'csv-project',site:'gazette',title:'Quoted Field Projector',inputs:['cols|CSV record'],outputs:['Quoted CSV result'],description:'Choose 1..9 column numbers, each 1..9, separated by commas; then | and one CSV record of up to nine fields. Column numbers are one-based, may repeat, and set output order. Fields may be empty, unquoted, or quoted with doubled quotes inside. A closing quote must meet a comma or the end. Spaces are data; no newlines. Every output field is quoted, with internal quotes doubled. Missing columns, malformed quotes or output beyond 162 characters are errors. Example 2,1|tea,milk gives "milk","tea".',algorithm:project,examples:[{input:'2,1|tea,milk',output:'"milk","tea"'},{input:'2,1,2|"a,b","say ""hi"""',output:'"say ""hi""","a,b","say ""hi"""'},{input:'1|',output:'""'},{input:'2|one',error:true}]},
];
