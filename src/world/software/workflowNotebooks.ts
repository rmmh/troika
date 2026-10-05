import type {DocumentSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const starter=(records:string[])=>`wf_seed: ${records.map((r,i)=>`M A ${3000+i*55} M B @wf_seed${i} M C ${r.length+1} C S doc_copy`).join(' ')} O S P\n${records.map((r,i)=>`wf_seed${i}: ${r.length} ${[...r].map(c=>c.charCodeAt(0)).join(' ')}`).join('\n')}`;
// Scratch3808..4000; collected columns4700..4771; algorithm tables4790..5099.
// Validation only parses; every mutation is explicit in a browse-key hook.
const common=`
wf_bad: M A -1 O S P
wf_record: P A 55 A A 3000 R B A I A 1 O S P
wf_fields: M J A M K B E K Z J wf_bad R E J E E 58 J wf_bad M G Z M H Z W 3810 J
wf_field_loop: E K Z J wf_field_end R E J ifl E 32 J wf_bad end ifg E 126 J wf_bad end ife E 124 E H Z J wf_bad M I 3820 A I G W I H I G 1 ifge G 4 J wf_bad end I J 1 I K -1 M I 3810 A I G W I J M H Z J wf_field_loop end I J 1 I K -1 I H 1 J wf_field_loop
wf_field_end: E H Z J wf_bad M I 3820 A I G W I H I G 1 W 3830 G M A Z O S P
wf_name: R J 3810 R K 3820 ifg K 16 J wf_bad end M H Z
wf_name_loop: R E J ifn E 32 M H 1 end I J 1 I K -1 N K Z J wf_name_loop E H Z J wf_bad M A Z O S P
wf_numfield: M I 3810 A I A R J I M I 3820 A I A R K I
wf_uint: E K Z J wf_bad ifg K 3 J wf_bad end M G Z
wf_uint_loop: R E J ifl E 48 J wf_bad end ifg E 57 J wf_bad end P G 10 S E 48 A G E I J 1 I K -1 N K Z J wf_uint_loop M A Z O S P
wf_collect: W 3860 Z W 3861 Z
wf_collect_loop: R A 3860 C S wf_record ife B Z M G Z else C S doc_app_validate N A Z J wf_bad M G 1 end R H 3860 M I 4700 A I H W I G ifn G Z R E 3861 I E 1 W 3861 E M I 4720 A I H R E 3840 W I E M I 4740 A I H R E 3841 W I E M I 4760 A I H R E 3842 W I E end I H 1 W 3860 H ifl H 12 J wf_collect_loop end M A Z O S P
wf_plain: E B Z M A Z E B Z O S P R E A E E 58 J wf_bad M A Z O S P
wf_help: W doc_message @wf_format M A 1 O S P
wf_pad: R E doc_report_len ifge E B O S P end M A 32 C S doc_report_put J wf_pad
wf_int: ifl F Z M A 45 C S doc_report_put F F A end M D 1000 M I Z
wf_int_loop: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S doc_report_put end E D 1 O S P Q D 10 J wf_int_loop
wf_two: ifl F 10 M A 48 C S doc_report_put end J wf_int
wf_three: ifl F 100 M A 48 C S doc_report_put end J wf_two
wf_span: E K Z O S P R A J C S doc_report_put I J 1 I K -1 J wf_span
wf_name_out: R A doc_selected C S wf_record E B Z O S P C S doc_app_validate R J 3810 R K 3820 J wf_span
wf_session: W doc_message @wf_session_hint M A 1 O S P
wf_session_hint: ${text('Session settings updated')}
wf_changed: W doc_dirty 1 W doc_message @wf_saved_hint M A 1 O S P
wf_saved_hint: ${text('Changed; S saves to disk')}
${POSITIVE_DIVISION}`;
// All tables stay in application RAM4700..5224. The persisted document is untouched.
const lit=(label:string,s:string)=>`${label}: ${text(s)}\n`;
const emit=(label:string)=>`M A @${label} C S doc_report_text `;
const num=(address:number)=>`R F ${address} C S wf_int `;
const row=(n:number)=>`M B ${27*n} C S wf_pad `;
const field=(i:number,dst:number,min:number,max:number)=>`M A ${i} C S wf_numfield N A Z O S P ifl G ${min} J wf_bad end ifg G ${max} J wf_bad end W ${dst} G `;
const letter=(i:number,dst:number,last='F')=>`R E ${3820+i} N E 1 J wf_bad R J ${3810+i} R G J ifl G 65 J wf_bad end ifg G ${last.charCodeAt(0)} J wf_bad end S G 65 W ${dst} G `;
const keyHelp=`E A 104 J wf_help E A 72 J wf_help `;
const finish=(records:string[],format:string)=>`${lit('wf_format',format)}${starter(records).replaceAll('nb_','wf_')}\n${common}`;
const commandNumber=(prefix:string,address:number,min:number,max:number)=>`doc_app_command: R E A ifn E 58 M A Z O S P end ifle B ${prefix.length} J wf_bad end M J A M K @wf_cmd M H ${prefix.length}
wf_cmd_loop: R E J R F K N E F J wf_bad I J 1 I K 1 I H -1 N H Z J wf_cmd_loop M K B S K ${prefix.length} C S wf_uint N A Z O S P ifl G ${min} J wf_bad end ifg G ${max} J wf_bad end W ${address} G J wf_session
${lit('wf_cmd',prefix)}`;
const hoursRecords=['A|18|24','A|24|30','B|20|28','C|22|32'];
const hours=`
doc_app_init: W 3808 2 J wf_seed
doc_app_validate: C S wf_fields N A Z O S P R E 3830 N E 3 J wf_bad ${letter(0,3840)}${field(1,3841,0,47)}${field(2,3842,1,48)}R E 3841 R F 3842 ifge E F J wf_bad end M A Z O S P
${commandNumber(':need ',3808,1,48)}
doc_app_key: ${keyHelp} M A Z O S P
doc_app_report: C S wf_collect M I 4790 M H 310
wh_clear: W I Z I I 1 I H -1 N H Z J wh_clear M H Z
wh_records: M I 4700 A I H R E I ifn E Z M I 4720 A I H R G I M I 4790 A I G W I 1 P G 48 A G 4800 M I 4740 A I H R J I M I 4760 A I H R K I
wh_window: M I G A I J W I 1 I J 1 ifl J K J wh_window end end I H 1 ifl H 12 J wh_records end
 W 3870 Z W 3871 Z W 3872 -1 W 3873 -1 W 3874 Z M H Z
wh_people: M I 4790 A I H R E I R F 3870 A F E W 3870 F I H 1 ifl H 6 J wh_people end M H Z
wh_slots: M G Z R F 3870 ife F Z M K Z else M K 1 end
wh_person: M I 4790 A I G R E I ifn E Z M I G P I 48 A I 4800 A I H R E I ife E Z M K Z end end I G 1 ifl G 6 J wh_person end
 ifn K Z R E 3871 I E 1 W 3871 E R E 3874 I E 1 W 3874 E R F 3808 ifge E F R F 3872 ifl F Z M F H S F E I F 1 W 3872 F end end else W 3874 Z end I H 1 ifl H 48 J wh_slots end
 R E 3872 ifge E Z R F 3808 A E F W 3873 E end
 ${emit('wh_people_text')}${num(3870)}${emit('wh_need')}${num(3808)}${row(1)}${emit('wh_total')}${num(3871)}${row(2)}R E 3872 ifl E Z ${emit('wh_none')} else ${emit('wh_first')}${num(3872)}M A 45 C S doc_report_put ${num(3873)}end ${row(3)}${emit('wh_hint')}O S P
${lit('wh_people_text','People ')}${lit('wh_need',' Need ')}${lit('wh_total','Common half-hours ')}${lit('wh_none','No fitting shared window')}${lit('wh_first','First slots ')}${lit('wh_hint',':need 2  H:record format')}
${finish(hoursRecords,'A-F|START0-47|END1-48')}`;
const arrivalRecords=['Lamp|0|8','Book|2|2','Cup|3|1'];
const arrival=`
doc_app_init: W 3808 Z J wf_seed
doc_app_validate: C S wf_fields N A Z O S P R E 3830 N E 3 J wf_bad C S wf_name N A Z O S P ${field(1,3840,0,99)}${field(2,3841,1,99)}M A Z O S P
doc_app_command: J wf_plain
doc_app_key: ${keyHelp} ife A 102 W 3808 Z J wf_session end ife A 106 W 3808 1 J wf_session end M A Z O S P
doc_app_report: C S wf_collect M I 4800 M H 72
wq_clear: W I -1 I I 1 I H -1 N H Z J wq_clear W 3870 Z W 3871 Z W 3880 Z
wq_job: R E 3880 R F 3861 ifge E F J wq_output end W 3881 -1 W 3882 9841 M H Z
wq_find: M I 4700 A I H R E I E E Z J wq_find_next M I 4800 A I H R E I ifge E Z J wq_find_next end M I 4720 A I H R E I R F 3808 ifn F Z R F 3870 ifg E F J wq_find_next end M I 4740 A I H R E I end R F 3882 ifl E F W 3882 E W 3881 H end
wq_find_next: I H 1 ifl H 12 J wq_find end R E 3881 ifl E Z M H Z W 3882 9841
wq_advance: M I 4700 A I H R E I E E Z J wq_advance_next M I 4800 A I H R E I ifge E Z J wq_advance_next end M I 4720 A I H R E I R F 3882 ifl E F W 3882 E end
wq_advance_next: I H 1 ifl H 12 J wq_advance end R E 3882 W 3870 E J wq_job end
 R H 3881 M I 4720 A I H R E I R F 3870 ifg E F M F E end M I 4800 A I H W I F S F E M I 4820 A I H W I F R E 3871 A E F W 3871 E M I 4740 A I H R E I A F E M I 4840 A I H W I F R E 3870 M I 4800 A I H R E I M I 4740 A I H R F I A E F W 3870 E R E 3880 I E 1 W 3880 E J wq_job
wq_output: R E 3808 ife E Z ${emit('wq_fcfs')}else ${emit('wq_sjf')}end ${num(3861)}${row(1)}${emit('wq_wait')}${num(3871)}${emit('wq_mean')}R E 3861 ife E Z ${emit('wq_na')}else ${num(3871)}M A 47 C S doc_report_put ${num(3861)}end ${row(2)}R H doc_selected M I 4700 A I H R E I ife E Z ${emit('wq_empty')}else ${emit('wq_start')}M I 4800 A I H R F I C S wf_int ${emit('wq_delay')}R H doc_selected M I 4820 A I H R F I C S wf_int ${row(3)}${emit('wq_turn')}R H doc_selected M I 4840 A I H R F I C S wf_int end O S P
${lit('wq_fcfs','F:FCFS J:shortest Jobs ')}${lit('wq_sjf','F:FCFS J:SHORTEST Jobs ')}${lit('wq_wait','Wait ')}${lit('wq_mean',' Mean ')}${lit('wq_start','Start ')}${lit('wq_delay',' Wait ')}${lit('wq_turn','Turnaround ')}${lit('wq_empty','Select a nonempty job')}${lit('wq_na','n/a')}
${finish(arrivalRecords,'NAME|ARRIVE0-99|WORK1-99')}`;
const surveyRecords=['Window|A|Y|5','Door|A|N|3','Garden|B|Y|2','Lane|B|N|6'];
const survey=`
doc_app_init: J wf_seed
doc_app_validate: C S wf_fields N A Z O S P R E 3830 N E 4 J wf_bad C S wf_name N A Z O S P ${letter(1,3840,'B')}R E 3822 N E 1 J wf_bad R J 3812 R E J ife E 89 W 3841 Z else N E 78 J wf_bad W 3841 1 end ${field(3,3842,1,7)}M A Z O S P
doc_app_command: J wf_plain
doc_app_key: ${keyHelp} M A Z O S P
doc_app_report: C S wf_collect W 4800 Z W 4801 Z W 4802 Z W 4803 Z M H Z
ws_sum: M I 4700 A I H R E I ifn E Z M I 4720 A I H R E I P E 2 M I 4740 A I H R F I A E F M I 4800 A I E R E I M J 4760 A J H R F J A E F W I E end I H 1 ifl H 12 J ws_sum end
 R E 4800 R F 4801 A E F W 3870 E R E 4802 R F 4803 A E F W 3871 E R E 4800 R F 4803 P E F W 3872 E R E 4801 R F 4802 P E F W 3873 E
 ${emit('ws_a')}${num(4800)}M A 47 C S doc_report_put ${num(3870)}${emit('ws_no')}${num(4801)}${row(1)}${emit('ws_b')}${num(4802)}M A 47 C S doc_report_put ${num(3871)}${emit('ws_no')}${num(4803)}${row(2)}${emit('ws_odds')}R E 3873 ife E Z ${emit('ws_undef')}else ${num(3872)}M A 47 C S doc_report_put ${num(3873)}end ${row(3)}R E 3870 R F 3871 ife E Z ${emit('ws_missing')}else ife F Z ${emit('ws_missing')}else R E 4800 P E F R F 4802 R G 3870 P F G S E F ifg E Z ${emit('ws_above')}else ifl E Z ${emit('ws_babove')}else ${emit('ws_equal')}end end end end O S P
${lit('ws_a','A yes ')}${lit('ws_b','B yes ')}${lit('ws_no',' No ')}${lit('ws_odds','Odds A/B ')}${lit('ws_undef','undefined')}${lit('ws_missing','Rate missing: empty group')}${lit('ws_above','A has the higher yes rate')}${lit('ws_babove','B has the higher yes rate')}${lit('ws_equal','Equal yes rates')}
${finish(surveyRecords,'NAME|A/B|Y/N|WEIGHT1-7')}`;
const assemblyRecords=['A|B|2','A|C|3','B|D|4','C|D|1'];
// DAG propagation checks multiplication against floor(9841/factor), then addition.
// Any cycle is reported globally, even in a component not used by the session order.
const assembly=`
doc_app_init: W 3808 Z W 3809 1 W 4000 3 J wf_seed
doc_app_validate: C S wf_fields N A Z O S P R E 3830 N E 3 J wf_bad ${letter(0,3840,'H')}${letter(1,3841,'H')}${field(2,3842,1,9)}M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end N B 9 J wf_bad M J A M K @wa_cmd M H 6
wa_cmd_loop: R E J R F K N E F J wf_bad I J 1 I K 1 I H -1 N H Z J wa_cmd_loop R E J ifl E 65 J wf_bad end ifg E 72 J wf_bad end S E 65 M F J/1 N F 32 J wf_bad M F J/2 ifl F 49 J wf_bad end ifg F 57 J wf_bad end S F 48 W 3808 E W 3809 F J wf_session
doc_app_key: ${keyHelp} ife A 110 R E 4000 I E 1 ifge E 8 M E Z end W 4000 E M A 1 O S P end ife A 112 R E 4000 I E -1 ifl E Z M E 7 end W 4000 E M A 1 O S P end M A Z O S P
doc_app_report: C S wf_collect M I 4800 M H 88
wa_clear: W I Z I I 1 I H -1 N H Z J wa_clear W 3870 Z W 3871 Z W 3872 Z M H Z
wa_edges: M I 4700 A I H R E I E E Z J wa_edges_next M I 4720 A I H R E I M I 4740 A I H R F I M I E P I 8 A I F A I 4800 R G I ifn G Z W 3870 1 J wa_output end M J 4760 A J H R G J W I G M I 4864 A I F R E I I E 1 W I E
wa_edges_next: I H 1 ifl H 12 J wa_edges end M I 4872 R E 3808 A I E R F 3809 W I F W 3880 Z
wa_topo: R E 3880 ifge E 8 J wa_output end M H Z
wa_zero: M I 4864 A I H R E I E E Z J wa_take I H 1 ifl H 8 J wa_zero end W 3870 2 J wa_output
wa_take: W I -1 W 3881 H R E 3880 I E 1 W 3880 E M G Z
wa_outgoing: R H 3881 M I H P I 8 A I G A I 4800 R B I ife B Z J wa_out_next end M I 4864 A I G R E I I E -1 W I E M I 4872 A I H R F I E F Z J wa_out_next U S G U S F M A 9841 C S app_div O S F O S G ifg F A W 3870 3 J wa_output end P F B M I 4872 A I G R E I M J 9841 S J F ifg E J W 3870 3 J wa_output end A E F W I E
wa_out_next: I G 1 ifl G 8 J wa_outgoing end J wa_topo
wa_output: ${emit('wa_make')}R A 3808 A A 65 C S doc_report_put M A 42 C S doc_report_put ${num(3809)}${row(1)}R E 3870 ife E 1 ${emit('wa_duplicate')}J wa_footer end ife E 2 ${emit('wa_cycle')}J wa_footer end ife E 3 ${emit('wa_overflow')}J wa_footer end ${emit('wa_part')}R A 4000 A A 65 C S doc_report_put ${emit('wa_quantity')}R E 4000 M I 4872 A I E R F I C S wf_int ${row(2)}${emit('wa_keys')}
wa_footer: ${row(3)}${emit('wa_hint')}O S P
${lit('wa_cmd',':make ')}${lit('wa_make','Make ')}${lit('wa_part','Part ')}${lit('wa_quantity',' quantity ')}${lit('wa_keys','N/P:part  H:edge fields')}${lit('wa_hint',':make A 2 (session order)')}${lit('wa_duplicate','Duplicate directed link')}${lit('wa_cycle','Cycle: assembly undefined')}${lit('wa_overflow','Quantity exceeds 9841')}
${finish(assemblyRecords,'PARENT A-H|CHILD A-H|QTY1-9')}`;
const calibrationRecords=['First|-2|-1','Second|0|1','Third|2|3','Outlier|1|-3'];
// Exact bounds: slope numerator -6..6, denominator1..6; comparison products <=36.
// Intercept numerator <=36 and prediction numerator <=54, with shared denominator.
// Lower medians select existing fractions rather than introducing larger denominators.
const calibration=`
doc_app_init: W 3808 1 J wf_seed
doc_app_validate: C S wf_fields N A Z O S P R E 3830 N E 3 J wf_bad C S wf_name N A Z O S P M A 1 C S wc_signed N A Z O S P W 3840 G M A 2 C S wc_signed N A Z O S P W 3841 G M A Z O S P
wc_signed: M I 3810 A I A R J I M I 3820 A I A R K I E K Z J wf_bad M H 1 R E J ife E 45 M H -1 I J 1 I K -1 end N K 1 J wf_bad R E J ifl E 48 J wf_bad end ifg E 51 J wf_bad end S E 48 P E H M G E M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end ifl B 4 J wf_bad end ifg B 5 J wf_bad end M E A/1 N E 120 J wf_bad M E A/2 N E 32 J wf_bad A A 3 S B 3 W 3810 A W 3820 B M A Z C S wc_signed N A Z O S P W 3808 G J wf_session
doc_app_key: ${keyHelp} M A Z O S P
doc_app_report: C S wf_collect W 3870 Z W 3880 Z
wc_i: R H 3880 ifge H 12 J wc_median end M I 4700 A I H R E I E E Z J wc_i_next I H 1 W 3881 H
wc_j: R G 3881 ifge G 12 J wc_i_next end M I 4700 A I G R E I E E Z J wc_j_next M I 4720 A I G R E I R H 3880 M I 4720 A I H R F I S E F E E Z J wc_j_next W 3891 E M I 4740 A I G R E I M I 4740 A I H R F I S E F R F 3891 ifl F Z P E -1 P F -1 end W 3890 E W 3891 F C S wc_insert
wc_j_next: R E 3881 I E 1 W 3881 E J wc_j
wc_i_next: R E 3880 I E 1 W 3880 E J wc_i
wc_insert: R H 3870
wc_insert_loop: E H Z J wc_insert_at M I 4800 A I H M E I/-1 R F 3891 P E F M I 4900 A I H M F I/-1 R G 3890 P F G ifle E F J wc_insert_at end M I 4800 A I H M E I/-1 W I E M I 4900 A I H M E I/-1 W I E I H -1 J wc_insert_loop
wc_insert_at: M I 4800 A I H R E 3890 W I E M I 4900 A I H R E 3891 W I E R E 3870 I E 1 W 3870 E O S P
wc_median: R E 3870 E E Z J wc_degenerate M A E I A -1 M B 2 C S app_div M I 4800 A I A R E I W 3871 E M I 4900 A I A R E I W 3872 E W 3880 Z W 3881 Z
wc_intercepts: R H 3880 ifge H 12 J wc_intercept_median end M I 4700 A I H R E I E E Z J wc_intercept_next M I 4740 A I H R E I R F 3872 P E F M I 4720 A I H R F I R G 3871 P F G S E F W 3890 E R G 3881
wc_intercept_insert: E G Z J wc_intercept_place M I 5000 A I G M F I/-1 ifle F E J wc_intercept_place end W I F I G -1 J wc_intercept_insert
wc_intercept_place: M I 5000 A I G W I E R E 3881 I E 1 W 3881 E
wc_intercept_next: R E 3880 I E 1 W 3880 E J wc_intercepts
wc_intercept_median: R A 3881 I A -1 M B 2 C S app_div M I 5000 A I A R E I W 3873 E R F 3808 R G 3871 P F G A F E W 3874 F
 ${emit('wc_slope')}${num(3871)}M A 47 C S doc_report_put ${num(3872)}${row(1)}${emit('wc_intercept')}${num(3873)}M A 47 C S doc_report_put ${num(3872)}${row(2)}${emit('wc_predict')}${num(3808)}M A 32 C S doc_report_put M A 121 C S doc_report_put M A 61 C S doc_report_put ${num(3874)}M A 47 C S doc_report_put ${num(3872)}J wc_footer
wc_degenerate: ${emit('wc_none')}
wc_footer: ${row(3)}${emit('wc_hint')}O S P
${lit('wc_slope','Slope ')}${lit('wc_intercept','Intercept ')}${lit('wc_predict','At x=')}${lit('wc_none','Need two distinct x values')}${lit('wc_hint',':x -3..3  Lower medians')}
${finish(calibrationRecords,'NAME|X -3..3|Y -3..3')}`;
const coverageRecords=['Lamp|4|AB','Rope|3|BC','Kit|8|ACF','Flask|2|F'];
// 64-state descending 0/1 DP; positive weights prevent self-transition reuse.
// Cost <=12*99=1188; selected-slot masks <=4095. Lowest mask breaks equal costs.
const coverage=`
doc_app_init: W 3808 39 J wf_seed
doc_app_validate: C S wf_fields N A Z O S P R E 3830 N E 3 J wf_bad C S wf_name N A Z O S P ${field(1,3840,1,99)}R J 3812 R K 3822 C S wp_features N A Z O S P W 3841 G M A Z O S P
wp_features: E K Z J wf_bad ifg K 6 J wf_bad end M G Z M H 64
wp_feature_loop: R E J ifl E 65 J wf_bad end ifg E 70 J wf_bad end ifle E H J wf_bad end M H E M I @wp_powers S E 65 A I E R E I A G E I J 1 I K -1 N K Z J wp_feature_loop M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end ifl B 7 J wf_bad end M J A M K @wp_cmd M H 6
wp_cmd_loop: R E J R F K N E F J wf_bad I J 1 I K 1 I H -1 N H Z J wp_cmd_loop M K B S K 6 C S wp_features N A Z O S P W 3808 G J wf_session
doc_app_key: ${keyHelp} E A 106 J wp_jump M A Z O S P
wp_jump: R E doc_selected W 3880 E W 3881 12
wp_jump_loop: R E 3880 I E 1 ifge E 12 M E Z end W 3880 E M I @wp_powers A I E R B I R A 3871 C S app_div M B 2 C S app_div ifn C Z R E 3880 W doc_selected E M A 1 O S P end R E 3881 I E -1 W 3881 E N E Z J wp_jump_loop M A 1 O S P
doc_app_report: C S wf_collect M H Z
wp_clear: M I 4800 A I H W I -1 M I 4900 A I H W I Z I H 1 ifl H 64 J wp_clear end W 4800 Z W 3880 Z
wp_item: R H 3880 ifge H 12 J wp_choose end M I 4700 A I H R E I E E Z J wp_next_item W 3881 63
wp_state: R G 3881 ifl G Z J wp_next_item end M I 4800 A I G R E I ifl E Z J wp_next_state end W 3890 E M I 4900 A I G R E I W 3891 E M I 4740 R H 3880 A I H R E I W 3892 E W 3893 G W 3894 Z W 3895 1 W 3896 Z
wp_union: R A 3892 M B 2 C S app_div W 3892 A W 3897 C R A 3893 M B 2 C S app_div W 3893 A R E 3897 A E C ifn E Z R E 3894 R F 3895 A E F W 3894 E end R E 3895 P E 2 W 3895 E R E 3896 I E 1 W 3896 E ifl E 6 J wp_union end
 R H 3880 M I 4720 A I H R E I R F 3890 A F E W 3890 F M I @wp_powers A I H R E I R F 3891 A F E W 3891 F R E 3894 M I 4800 A I E R E I R F 3890 ifge E Z ifl E F J wp_next_state end ife E F R E 3894 M J 4900 A J E R E J R F 3891 ifle E F J wp_next_state end end end R E 3890 W I E R E 3894 M I 4900 A I E R E 3891 W I E
wp_next_state: R E 3881 I E -1 W 3881 E J wp_state
wp_next_item: R E 3880 I E 1 W 3880 E J wp_item
wp_choose: W 3870 -1 W 3871 Z W 3872 Z W 3881 Z
wp_choice: R G 3881 ifge G 64 J wp_output end M I 4800 A I G R E I ifl E Z J wp_choice_next end W 3890 E M I 4900 A I G R E I W 3891 E R E 3808 W 3892 E W 3893 G W 3896 Z
wp_contains: R A 3892 M B 2 C S app_div W 3892 A W 3897 C R A 3893 M B 2 C S app_div W 3893 A R E 3897 ifn E Z E C Z J wp_choice_next end R E 3896 I E 1 W 3896 E ifl E 6 J wp_contains end R E 3870 R F 3890 ifge E Z ifl E F J wp_choice_next end ife E F R E 3871 R F 3891 ifle E F J wp_choice_next end end end R E 3890 W 3870 E R E 3891 W 3871 E
wp_choice_next: R E 3881 I E 1 W 3881 E J wp_choice
wp_output: R E 3870 ifl E Z ${emit('wp_none')}J wp_footer end ${emit('wp_weight')}${num(3870)}${row(1)}${emit('wp_slots')}W 3880 Z R E 3871 W 3881 E
wp_list: R H 3880 ifge H 12 J wp_footer end R A 3881 M B 2 C S app_div W 3881 A ifn C Z R E 3872 ife E 6 ${row(2)}end R F 3880 I F 1 C S wf_two M A 32 C S doc_report_put R E 3872 I E 1 W 3872 E end R E 3880 I E 1 W 3880 E J wp_list
wp_footer: ${row(3)}${emit('wp_hint')}O S P
wp_powers: 1 2 4 8 16 32 64 128 256 512 1024 2048
${lit('wp_cmd',':need ')}${lit('wp_weight','Minimum weight ')}${lit('wp_slots','Slots ')}${lit('wp_none','Required features uncovered')}${lit('wp_hint',':need ABC J:item H:fields')}
${finish(coverageRecords,'NAME|WEIGHT1-99|SORTED A-F')}`;
function doc(number:number,id:string,site:string,title:string,algorithm:string,records:string[],description:string):DocumentSoftware{return{number,id,site,title,dataPath:`/work-${number}`,algorithm,kind:'document',inputs:['Saved records'],outputs:['Native report'],examples:[{records}],description:description+' Where NAME is used, names have 1..16 printable characters, without a vertical bar or initial colon. H shows record fields. Enter edits; empty drafts delete. S saves, L reloads, F1 cancels or confirms leaving unsaved edits. Starter records appear until a saved document is loaded.'};}
export const COMMON_HOURS=doc(377,'common-hours','rainroom','Common Hours',hours,hoursRecords,'Save PERSON|START|END: person A..F, half-hour slot start 0..47, exclusive end 1..48, start below end. Slots 0/18/24 mean midnight/09:00/noon in one abstract day. Multiple windows for each present person are unioned, including duplicates and touching boundaries. Find the earliest interval shared by every represented person. Enter :need 2 for duration 1..48 half-hours; this session setting resets to 2 on launch. No records means no available meeting.');
export const ASSEMBLY_NOTEBOOK=doc(378,'assembly-notes','toolshed','Assembly Notebook',assembly,assemblyRecords,'Save PARENT|CHILD|QTY: part letters A..H, quantity 1..9. Directed links form a bill of materials; duplicate links and any cycle (including self-links) are reported without partial totals. Multiple roots and shared subassemblies are allowed. Enter :make A 2 for a session order of 1..9 units, initially A 1. Native topological expansion counts every required part, including the ordered assembly itself. N/P browses A..H, initially D. Quantities above 9841 produce an explicit overflow report.');
export const ARRIVAL_QUEUE=doc(379,'arrival-queue','relay','Arrival Queue',arrival,arrivalRecords,'Save NAME|ARRIVAL|SERVICE: arrival 0..99, service 1..99 abstract time units. One nonpreemptive worker runs available jobs to completion. F selects first-arrival order; J selects shortest service among jobs already arrived. Ties use earlier document slot. Idle time advances to the next arrival. Report the selected job start/wait/turnaround, total wait and exact unreduced average wait. Mode resets to F on launch; jobs persist.');
export const SURVEY_CROSSTAB=doc(380,'survey-crosstab','gazette','Survey Crosstab',survey,surveyRecords,'Save NAME|GROUP|ANSWER|WEIGHT: group A/B, answer Y/N, weight 1..7. Add all weighted rows into a 2x2 contingency table. Report yes/total rates, no counts, exact unreduced odds ratio A/B=(Ayes*Bno)/(Ano*Byes), and compare the two yes rates by exact cross-products. A zero odds divisor is undefined, including 0/0; an empty group has no rate. Names label independent observations, so repeated names remain separate rows.');
export const ROBUST_CALIBRATION=doc(381,'robust-calibrate','lenses','Robust Calibration',calibration,calibrationRecords,'Save NAME|X|Y with signed integer coordinates -3..3. Compute the lower median of all pair slopes with distinct x, then the lower median of y-slope*x as intercept. For an even count, lower median means the smaller central value, deliberately not their mean. Repeated x values contribute intercepts but no vertical slopes. At least two distinct x values are needed. Enter :x -2 for a session prediction at integer x -3..3, initially 1. All fractions are exact, possibly unreduced; no floating-point rounding or extrapolation outside this explicit domain.');
export const PACKING_COVERAGE=doc(382,'packing-coverage','bicycle','Packing Coverage',coverage,coverageRecords,'Save NAME|WEIGHT|FEATURES: weight 1..99, features a nonempty strictly alphabetical subset of A..F, for example ACF. Enter :need ABC for required features, initially ABCF. Native subset dynamic programming finds the minimum total weight covering every required feature; overlap and extra features are allowed. Ties choose the numerically smaller selected-slot bitmask (slot 1 is the lowest bit). J cycles chosen items. Requirements reset on launch; item records persist.');
export const WORKFLOW_NOTEBOOKS=[COMMON_HOURS,ASSEMBLY_NOTEBOOK,ARRIVAL_QUEUE,SURVEY_CROSSTAB,ROBUST_CALIBRATION,PACKING_COVERAGE];
