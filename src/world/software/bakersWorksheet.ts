const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0));
const text=(s:string)=>[...ascii(s),0].join(' ');
import {POSITIVE_DIVISION} from './arithmetic';
/** Every parse, dependency pass and report cell executes on the guest CPU. */
export const BAKERS_WORKSHEET_ALGORITHM=`
; Twelve values/statuses and parser temporaries, outside document/report buffers.
$ws_values: 3808
$ws_status: 3832
$ws_cell: 3850
$ws_pass: 3851
$ws_first: 3852
$ws_second: 3853
$ws_operator: 3854
$ws_pending: 3855
$ws_graph_mode: 3856

doc_app_init: M I 3000 M K 660
ws_clear_records: W I Z I I 1 I K -1 N K Z J ws_clear_records
 M J @ws_seeds M G 3000 M L 12
ws_seed: R H J W G H I J 1 M I G I I 1
ws_seed_text: E H Z J ws_seed_next R E J W I E I I 1 I J 1 I H -1 J ws_seed_text
ws_seed_next: A G 55 I L -1 N L Z J ws_seed W doc_message @ws_help O S P
; Invalid formulas are valid document content, with visible cell diagnostics.
doc_app_validate: M A Z O S P
doc_app_command: M A Z O S P
doc_app_key: ife A 63 W doc_message @ws_help M A 1 else M A Z end O S P

doc_app_report: C S ws_recalculate M I 3700 M K 108
ws_report_clear: W I 32 I I 1 I K -1 N K Z J ws_report_clear M L Z
ws_report_cell: M E L P E 9 W doc_report_len E M A L M B 3 C S app_div M H A M A C A A 65 C S ws_put M A H A A 49 C S ws_put M A 61 C S ws_put
 M I ws_status A I L R E I ife E 1 M I ws_values A I L R F I C S ws_integer else I E -2 M I @ws_error_names A I E R J I
ws_error_text: R A J E A Z J ws_report_next C S ws_put I J 1 J ws_error_text end
ws_report_next: I L 1 ifl L 12 J ws_report_cell end W doc_report_len 108 O S P
ws_put: M I 3700 R E doc_report_len A I E W I A I E 1 W doc_report_len E O S P
ws_integer: ifl F Z M A 45 C S ws_put P F -1 end M D 1000 M G Z
ws_integer_digit: M A F M B D C S app_div M F C ifn A Z M G 1 end ife D 1 M G 1 end ifn G Z A A 48 C S ws_put end ife D 1 O S P end Q D 10 J ws_integer_digit

; Status 0 pending, 1 value, 2 syntax, 3 division by zero, 4 range, 5 cycle.
; At most twelve scans resolve any acyclic dependency chain, with no recursion.
ws_recalculate: M I ws_values M J ws_status M K 12
ws_zero: W I Z W J Z I I 1 I J 1 I K -1 N K Z J ws_zero C S ws_dependencies W ws_pass Z
ws_scan: W ws_cell Z
ws_scan_cell: R E ws_cell M I ws_status A I E R E I ifn E Z J ws_scan_next end C S ws_evaluate R E ws_cell M I ws_status A I E W I A ife A 1 M I ws_values A I E W I F end
ws_scan_next: R E ws_cell I E 1 W ws_cell E ifl E 12 J ws_scan_cell end R E ws_pass I E 1 W ws_pass E ifl E 12 J ws_scan end M I ws_status M K 12
ws_cycles: R E I ife E Z W I 5 end I I 1 I K -1 N K Z J ws_cycles O S P

ws_dependencies: M I 4700 M K 144
ws_graph_clear: W I Z I I 1 I K -1 N K Z J ws_graph_clear W ws_graph_mode 1 W ws_cell Z
ws_graph_parse: C S ws_evaluate ife A 2 R I ws_cell A I ws_status W I 2 R I ws_cell P I 12 A I 4700 M K 12
ws_graph_bad: W I Z I I 1 I K -1 N K Z J ws_graph_bad end R E ws_cell I E 1 W ws_cell E ifl E 12 J ws_graph_parse end W ws_graph_mode Z M L Z
; Floyd closure over twelve vertices; bounded at 1728 boolean visits.
ws_graph_via: M K L P K 12 A K 4700 M G Z
ws_graph_from: M J G P J 12 A J 4700 M I J A I L R E I E E Z J ws_graph_next_from M H Z
ws_graph_to: M I K A I H R E I ifn E Z M I J A I H W I 1 end I H 1 ifl H 12 J ws_graph_to end
ws_graph_next_from: I G 1 ifl G 12 J ws_graph_from end I L 1 ifl L 12 J ws_graph_via end M I 4700 M J ws_status M K 12
ws_graph_cycles: R E I ifn E Z W J 5 end A I 13 I J 1 I K -1 N K Z J ws_graph_cycles M G Z
ws_graph_dependent: M J G P J 12 A J 4700 M H Z
ws_graph_check_cycle: M I ws_status A I H R E I ife E 5 M I J A I H R E I ifn E Z M I ws_status A I G W I 5 J ws_graph_dependent_next end end I H 1 ifl H 12 J ws_graph_check_cycle end
ws_graph_dependent_next: I G 1 ifl G 12 J ws_graph_dependent end O S P

ws_evaluate: R J ws_cell P J 55 A J 3000 R K J I J 1 C S ws_space ife K Z M F Z M A 1 O S P end ife E 61 I J 1 I K -1 end W ws_pending Z C S ws_operand ifge A 2 O S P end ife A Z W ws_pending 1 end W ws_first F C S ws_space ife K Z R E ws_pending ifn E Z M A Z else M A 1 R F ws_first end O S P end
 W ws_operator E ife E 43 J ws_binary end ife E 45 J ws_binary end ife E 42 J ws_binary end ife E 47 J ws_binary end J ws_syntax
ws_binary: I J 1 I K -1 C S ws_operand ifge A 2 O S P end ife A Z W ws_pending 1 end W ws_second F C S ws_space N K Z J ws_syntax R E ws_pending ifn E Z M A Z O S P end R G ws_first R H ws_second R E ws_operator
 ife E 43 J ws_add end ife E 45 P H -1 J ws_add end ife E 42 J ws_multiply end
 ; Truncate signed division toward zero using positive magnitudes.
 E H Z J ws_divzero M D 1 ifl G Z P G -1 P D -1 end ifl H Z P H -1 P D -1 end M A G M B H C S app_div P A D M F A M A 1 O S P
ws_add: ifg H Z M E 9841 S E H ifg G E J ws_range end else M E -9841 S E H ifl G E J ws_range end end M F G A F H M A 1 O S P
ws_multiply: M D 1 ifl G Z P G -1 P D -1 end ifl H Z P H -1 P D -1 end ife H Z M F Z M A 1 O S P end M A 9841 M B H C S app_div ifg G A J ws_range end P G H P G D M F G M A 1 O S P

; J/K are cursor/remaining count and always advance within a 54-byte record.
ws_space: M E Z E K Z O S P R E J ife E 32 I J 1 I K -1 J ws_space end O S P
ws_operand: C S ws_space E K Z J ws_syntax M H 1 M G Z ife E 45 M H -1 M G 1 I J 1 I K -1 else ife E 43 M G 1 I J 1 I K -1 end end E K Z J ws_syntax R E J
 ifge E 97 ifle E 99 S E 32 end end ifge E 65 ifle E 67 ifn G Z J ws_syntax end M H E S H 65 I J 1 I K -1 E K Z J ws_syntax R E J ifl E 49 J ws_syntax end ifg E 52 J ws_syntax end S E 49 P E 3 A E H R D ws_graph_mode ifn D Z M D E R I ws_cell P I 12 A I 4700 A I D W I 1 M F 1 M A 1 I J 1 I K -1 O S P end M I ws_values A I E R F I M I ws_status A I E R A I I J 1 I K -1 O S P end end
 M G Z M D Z
ws_literal: E K Z J ws_literal_done R E J ifl E 48 J ws_literal_done end ifg E 57 J ws_literal_done end S E 48 ifg G 984 J ws_range end ife G 984 ifg E 1 J ws_range end end P G 10 A G E I D 1 I J 1 I K -1 J ws_literal
ws_literal_done: E D Z J ws_syntax P G H M F G M A 1 O S P
ws_syntax: M A 2 O S P
ws_divzero: M A 3 O S P
ws_range: M A 4 O S P
ws_error_names: @ws_syntax_name @ws_zero_name @ws_range_name @ws_cycle_name
ws_syntax_name: ${text('SYNTAX')}
ws_zero_name: ${text('DIV/0')}
ws_range_name: ${text('RANGE')}
ws_cycle_name: ${text('CYCLE')}
ws_help: ${text('A1..C4; =A1+2; / truncates')}
ws_seeds: ${['120','3','=A1*B1','24','=C1/A2','=B2+2','','','','','',''].flatMap(s=>[s.length,...ascii(s)]).join(' ')}
${POSITIVE_DIVISION}
`;

import type {DocumentSoftware} from './native';
export const BAKERS_WORKSHEET:DocumentSoftware={
 number:213,kind:'document',id:'bakers-worksheet',site:'rye',title:"Baker's Worksheet",dataPath:'/rye-sheet',
 inputs:['Cell formulas'],outputs:['Values grid','Cell diagnostics'],
 description:'Edit twelve integer cells A1..C4, stored as records 1..12 in row order. Blank cells mean zero. A formula is a signed integer, a cell reference, or two operands joined by + - * /; leading = is optional. References ignore case. Spaces may surround operands, but signs must touch literal digits. Parentheses, multiple operators and decimals are unsupported. Division truncates toward zero; literals and results must fit -9841..9841. The four-line grid recalculates dependencies after edits and loads. Errors SYNTAX, DIV/0, RANGE and CYCLE propagate to dependent cells; erroneous formulas stay editable and saveable. Circular references terminate with CYCLE. The starter sheet demonstrates a calculation chain. S saves formulas, L reloads; ? recalls syntax.',
 algorithm:BAKERS_WORKSHEET_ALGORITHM,examples:[{records:['120','3','=A1*B1','24','=C1/A2','=B2+2','','','','','','']}],
};
