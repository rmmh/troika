import type {DocumentSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const starter=(records:string[])=>`nb_seed: ${records.map((r,i)=>`M A ${3000+i*55} M B @nb_seed${i} M C ${r.length+1} C S doc_copy`).join(' ')} O S P\n${records.map((r,i)=>`nb_seed${i}: ${r.length} ${[...r].map(c=>c.charCodeAt(0)).join(' ')}`).join('\n')}`;
// Scratch3810..3999; collected columns4700..4771; algorithm tables4800..5199.
// Validation only parses; every mutation is explicit in a browse-key hook.
const common=`
nb_bad: M A -1 O S P
nb_record: P A 55 A A 3000 R B A I A 1 O S P
nb_fields: M J A M K B E K Z J nb_bad R E J E E 58 J nb_bad M G Z M H Z W 3810 J
nb_field_loop: E K Z J nb_field_end R E J ifl E 32 J nb_bad end ifg E 126 J nb_bad end ife E 124 E H Z J nb_bad M I 3820 A I G W I H I G 1 ifge G 4 J nb_bad end I J 1 I K -1 M I 3810 A I G W I J M H Z J nb_field_loop end I J 1 I K -1 I H 1 J nb_field_loop
nb_field_end: E H Z J nb_bad M I 3820 A I G W I H I G 1 W 3830 G M A Z O S P
nb_name: R J 3810 R K 3820 ifg K 16 J nb_bad end M H Z
nb_name_loop: R E J ifn E 32 M H 1 end I J 1 I K -1 N K Z J nb_name_loop E H Z J nb_bad M A Z O S P
nb_numfield: M I 3810 A I A R J I M I 3820 A I A R K I
nb_uint: E K Z J nb_bad ifg K 3 J nb_bad end M G Z
nb_uint_loop: R E J ifl E 48 J nb_bad end ifg E 57 J nb_bad end P G 10 S E 48 A G E I J 1 I K -1 N K Z J nb_uint_loop M A Z O S P
nb_collect: W 3860 Z W 3861 Z
nb_collect_loop: R A 3860 C S nb_record ife B Z M G Z else C S doc_app_validate N A Z J nb_bad M G 1 end R H 3860 M I 4700 A I H W I G ifn G Z R E 3861 I E 1 W 3861 E M I 4720 A I H R E 3840 W I E M I 4740 A I H R E 3841 W I E M I 4760 A I H R E 3842 W I E end I H 1 W 3860 H ifl H 12 J nb_collect_loop end M A Z O S P
nb_plain: E B Z M A Z E B Z O S P R E A E E 58 J nb_bad M A Z O S P
nb_help: W doc_message @nb_format M A 1 O S P
nb_pad: R E doc_report_len ifge E B O S P end M A 32 C S doc_report_put J nb_pad
nb_int: ifl F Z M A 45 C S doc_report_put F F A end M D 1000 M I Z
nb_int_loop: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S doc_report_put end E D 1 O S P Q D 10 J nb_int_loop
nb_two: ifl F 10 M A 48 C S doc_report_put end J nb_int
nb_three: ifl F 100 M A 48 C S doc_report_put end J nb_two
nb_span: E K Z O S P R A J C S doc_report_put I J 1 I K -1 J nb_span
nb_name_out: R A doc_selected C S nb_record E B Z O S P C S doc_app_validate R J 3810 R K 3820 J nb_span
nb_session: W doc_message @nb_session_hint M A 1 O S P
nb_session_hint: ${text('Session settings updated')}
nb_changed: W doc_dirty 1 W doc_message @nb_saved_hint M A 1 O S P
nb_saved_hint: ${text('Changed; S saves to disk')}
${POSITIVE_DIVISION}`;
const studyRecords=['NIC sends?|packets|0|001','Base of trytes?|three|1|002','Disk block cells?|243|0|001'];
const study=`
doc_app_init: W 3808 1 W 3809 Z J nb_seed
doc_app_validate: C S nb_fields N A Z O S P R E 3830 N E 4 J nb_bad R E 3820 ifg E 18 J nb_bad end R E 3821 ifg E 18 J nb_bad end R E 3822 N E 1 J nb_bad R E 3823 N E 3 J nb_bad M A 2 C S nb_numfield N A Z O S P ifg G 5 J nb_bad end W 3840 G M A 3 C S nb_numfield N A Z O S P W 3841 G M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end ifl B 6 J nb_bad end ifg B 8 J nb_bad end M E A/1 N E 100 J nb_bad M E A/2 N E 97 J nb_bad M E A/3 N E 121 J nb_bad M E A/4 N E 32 J nb_bad M J A A J 5 M K B S K 5 C S nb_uint N A Z O S P W 3808 G W 3809 Z J nb_session
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J nb_help E A 110 J st_next E A 112 J st_prev E A 114 J st_reveal E A 103 J st_good E A 97 J st_again E A 106 J st_jump M A Z O S P
st_next: R E 3808 ifl E 999 I E 1 W 3808 E end W 3809 Z M A 1 O S P
st_prev: R E 3808 ifg E Z I E -1 W 3808 E end W 3809 Z M A 1 O S P
st_reveal: R E doc_selected I E 1 W 3809 E M A 4900 R B doc_selected P B 55 A B 3000 M C 55 C S doc_copy M A 1 O S P
st_good: W 3880 1 J st_grade
st_again: W 3880 Z
st_grade: R E doc_selected I E 1 R F 3809 ifn E F W doc_message @st_show M A 1 O S P end R A doc_selected C S nb_record E B Z M A 1 E B Z O S P C S doc_app_validate N A Z M A 1 N A Z O S P R E 3840 R F 3880 ife F Z M E Z else ifl E 5 I E 1 end end M I @st_intervals A I E R F I R G 3808 A F G ifg F 999 M F 999 end W 3881 F R I 3812 A E 48 W I E
 R I 3813 W 3882 I M A F M B 100 C S app_div A A 48 R I 3882 W I A W 3881 C M A C M B 10 C S app_div A A 48 R I 3882 M I/1 A A C 48 M I/2 C W 3809 Z J nb_changed
st_jump: R E doc_selected W 3880 E M H 12
st_jump_loop: R E 3880 I E 1 ifge E 12 M E Z end W 3880 E U S H M A E C S nb_record E B Z J st_jump_skip C S doc_app_validate R E 3841 R F 3808 ifle E F R E 3880 W doc_selected E W 3809 Z O S H M A 1 O S P end
st_jump_skip: O S H I H -1 N H Z J st_jump_loop W doc_message @st_none M A 1 O S P
doc_app_report: R E 3809 ifn E Z R F doc_selected I F 1 ifn E F W 3809 Z else R J doc_selected P J 55 A J 3000 M I 4900 M K 55
st_reveal_check: R E J R F I ifn E F W 3809 Z J st_reveal_checked end I J 1 I I 1 I K -1 N K Z J st_reveal_check
st_reveal_checked: end end C S nb_collect W 3870 Z M H Z
st_due_loop: M I 4700 A I H R E I ifn E Z M I 4740 A I H R E I R F 3808 ifle E F R E 3870 I E 1 W 3870 E end end I H 1 ifl H 12 J st_due_loop end
 M A @st_day C S doc_report_text R F 3808 C S nb_int M A @st_due C S doc_report_text R F 3870 C S nb_int M B 27 C S nb_pad
 R A doc_selected C S nb_record E B Z J st_empty C S doc_app_validate M A @st_q C S doc_report_text R J 3810 R K 3820 C S nb_span M B 54 C S nb_pad R E doc_selected I E 1 R F 3809 ife E F M A @st_a C S doc_report_text R J 3811 R K 3821 C S nb_span else M A @st_hidden C S doc_report_text end M B 81 C S nb_pad M A @st_keys J doc_report_text
st_empty: M A @st_empty_text C S doc_report_text M B 81 C S nb_pad M A @st_keys J doc_report_text
st_intervals: 1 2 4 8 16 32
st_day: ${text('Day ')}
st_due: ${text(' Due cards:')}
st_q: ${text('Q: ')}
st_a: ${text('A: ')}
st_hidden: ${text('R reveals selected answer')}
st_keys: ${text('R:show G:good A:again J:due')}
st_show: ${text('Press R before grading')}
st_none: ${text('No cards due today')}
st_empty_text: ${text('Empty card; Enter adds one')}
nb_format: ${text('Q|ANSWER|BOX0-5|DUE000-999')}
${starter(studyRecords)}
${common}`;
const matrixRecords=['Cabin|8|6|3','Garden|6|8|7','Studio|9|4|5'];
const matrix=`
doc_app_init: W 3808 1 W 3809 1 W 4000 1 J nb_seed
doc_app_validate: C S nb_fields N A Z O S P R E 3830 N E 4 J nb_bad C S nb_name N A Z O S P M A 1 C S nb_numfield N A Z O S P ifg G 9 J nb_bad end W 3840 G M A 2 C S nb_numfield N A Z O S P ifg G 9 J nb_bad end W 3841 G M A 3 C S nb_numfield N A Z O S P ifg G 9 J nb_bad end W 3842 G M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end N B 12 J nb_bad M J A M K @mx_command M H 9
mx_prefix: R E J R F K N E F J nb_bad I J 1 I K 1 I H -1 N H Z J mx_prefix M H 3 M I 3890
mx_weights: R E J ifl E 49 J nb_bad end ifg E 57 J nb_bad end S E 48 W I E I I 1 I J 1 I H -1 N H Z J mx_weights R E 3890 W 3808 E R E 3891 W 3809 E R E 3892 W 4000 E J nb_session
doc_app_key: E A 104 J nb_help E A 72 J nb_help M A Z O S P
doc_app_report: C S nb_collect W 3870 Z W 3871 Z W 3872 Z M H Z
mx_scores: M I 4700 A I H R E I ifn E Z M I 4720 A I H R E I R F 3808 P E F M I 4740 A I H R G I R F 3809 P G F A E G M I 4760 A I H R G I R F 4000 P G F A E G M I 4800 A I H W I E end I H 1 ifl H 12 J mx_scores end
 R H doc_selected M I 4700 A I H R E I E E Z J mx_empty M I 4800 A I H R E I W 3870 E W 3871 1 W 3880 Z
mx_compare: R G 3880 M I 4700 A I G R E I E E Z J mx_next M I 4800 A I G R E I R F 3870 ifg E F R E 3871 I E 1 W 3871 E else ife E F R E doc_selected ifl G E R E 3871 I E 1 W 3871 E end end end
 R H doc_selected M I 4720 A I G R E I M I 4720 A I H R F I ifl E F J mx_next end M K Z ifg E F M K 1 end M I 4740 A I G R E I M I 4740 A I H R F I ifl E F J mx_next end ifg E F M K 1 end M I 4760 A I G R E I M I 4760 A I H R F I ifl E F J mx_next end ifg E F M K 1 end ifn K Z R E 3872 M I 4820 A I E W I G I E 1 W 3872 E end
mx_next: R E 3880 I E 1 W 3880 E ifl E 12 J mx_compare end J mx_output
mx_empty: W 3871 Z
mx_output: M A @mx_weights_text C S doc_report_text R F 3808 C S nb_int R F 3809 C S nb_int R F 4000 C S nb_int M A @mx_command_hint C S doc_report_text M B 27 C S nb_pad M A @mx_score C S doc_report_text R F 3870 C S nb_int M A @mx_rank C S doc_report_text R F 3871 C S nb_int M A 47 C S doc_report_put R F 3861 C S nb_int M B 54 C S nb_pad M A @mx_dom C S doc_report_text R E 3872 ife E Z M A @mx_none J doc_report_text end W 3880 Z
mx_list: R E 3880 R F 3872 ifge E F O S P end ife E 5 M B 81 C S nb_pad end M I 4820 A I E R F I I F 1 C S nb_two M A 32 C S doc_report_put R E 3880 I E 1 W 3880 E J mx_list
mx_command: ${text(':weights ')}
mx_weights_text: ${text('Weights ')}
mx_command_hint: ${text(' (:weights 321)')}
mx_score: ${text('Score ')}
mx_rank: ${text(' Rank ')}
mx_dom: ${text('Dominated by: ')}
mx_none: ${text('none')}
nb_format: ${text('NAME|A|B|C each0..9')}
${starter(matrixRecords)}
${common}`;
const setlistRecords=['Harbor|180|0','Lantern|210|6','Footpath|150|2','Window|120|1'];
const setlist=`
doc_app_init: J nb_seed
doc_app_validate: C S nb_fields N A Z O S P R E 3830 N E 3 J nb_bad C S nb_name N A Z O S P M A 1 C S nb_numfield N A Z O S P ifl G 1 J nb_bad end ifg G 600 J nb_bad end W 3840 G M A 2 C S nb_numfield N A Z O S P ifg G 11 J nb_bad end W 3841 G M A Z O S P
doc_app_command: J nb_plain
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J nb_help E A 111 J sl_optimize M A Z O S P
sl_order: C S nb_collect W 3870 Z W 3871 Z W 3872 Z W 3873 Z W 3874 -1 M H Z
sl_order_loop: M I 4700 A I H R E I ifn E Z R G 3873 M I 4800 A I G W I H R E doc_selected ife E H W 3874 G R E 3870 W 3872 E end M I 4720 A I H R E I R F 3870 A E F A E 30 W 3870 E I G 1 W 3873 G end I H 1 ifl H 12 J sl_order_loop end R E 3873 ifn E Z R E 3870 S E 30 W 3870 E end
 M H 1
sl_cost_loop: R E 3873 ifge H E O S P end M I 4800 A I H R E I M F I/-1 M I 4740 A I E R E I M I 4740 A I F R F I S E F F E A ifg E 6 M F 12 S F E M E F end R F 3871 A F E W 3871 F I H 1 J sl_cost_loop
sl_optimize: C S sl_order R E 3874 ifl E Z M A 1 O S P end R E 3873 ifl E 2 M A 1 O S P end W 3880 Z M H Z M G Z
sl_remove: R E 3873 ifge H E J sl_search end M I 4800 A I H R E I R F doc_selected ifn E F M I 4820 A I G W I E I G 1 end I H 1 J sl_remove
sl_search: W 3883 999 W 3884 Z W 3881 Z
sl_candidate: W 3882 Z W 3885 Z
sl_candidate_loop: R H 3882 R E 3873 ifge H E J sl_candidate_done end R G 3881 ife H G R E doc_selected else ifg H G I H -1 end M I 4820 A I H R E I end M I 4740 A I E R E I R H 3882 ifn H Z R F 3890 M G E S G F F G A ifg G 6 M F 12 S F G M G F end R F 3885 A F G W 3885 F end W 3890 E I H 1 W 3882 H J sl_candidate_loop
sl_candidate_done: R E 3885 R F 3883 ifl E F W 3883 E R E 3881 W 3884 E end R E 3881 I E 1 W 3881 E R F 3873 ifl E F J sl_candidate end
 R A doc_selected P A 55 A A 3000 M B A M A 5000 M C 55 C S doc_copy R E 3874 W 3893 E
sl_shift: R E 3893 R F 3884 E E F J sl_place M G E ifl E F I G 1 else I G -1 end M I 4800 A I E R A I P A 55 A A 3000 M I 4800 A I G R B I P B 55 A B 3000 W 3893 G M C 55 C S doc_copy J sl_shift
sl_place: R E 3884 M I 4800 A I E R A I W doc_selected A P A 55 A A 3000 M B 5000 M C 55 C S doc_copy J nb_changed
doc_app_report: C S sl_order M A @sl_total C S doc_report_text R F 3870 C S sl_time M A @sl_cost C S doc_report_text R F 3871 C S nb_int M B 27 C S nb_pad M A @sl_start C S doc_report_text R F 3872 C S sl_time M A @sl_gap C S doc_report_text M B 54 C S nb_pad M A @sl_scale C S doc_report_text M B 81 C S nb_pad M A @sl_keys J doc_report_text
sl_time: M A F M B 60 C S app_div U S C M F A C S nb_int M A 58 C S doc_report_put O S F J nb_two
sl_total: ${text('Total ')}
sl_cost: ${text(' Key cost ')}
sl_start: ${text('Selected starts ')}
sl_gap: ${text(' +30s')}
sl_scale: ${text('Keys0=C..11=B; short circle')}
sl_keys: ${text('O:best insertion H:format')}
nb_format: ${text('NAME|SECONDS1..600|KEY0..11')}
${starter(setlistRecords)}
${common}`;
const tabRecords=['Ari|90','Bo|30','Cy|0'];
const tab=`
doc_app_init: W 3808 Z J nb_seed
doc_app_validate: C S nb_fields N A Z O S P R E 3830 N E 2 J nb_bad C S nb_name N A Z O S P M A 1 C S nb_numfield N A Z O S P ifg G 729 J nb_bad end W 3840 G M A Z O S P
doc_app_command: J nb_plain
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J nb_help E A 110 J tb_next E A 112 J tb_prev M A Z O S P
tb_next: R E 3808 I E 1 R F 3874 ifge E F M E Z end W 3808 E M A 1 O S P
tb_prev: R E 3808 I E -1 ifl E Z R E 3874 I E -1 ifl E Z M E Z end end W 3808 E M A 1 O S P
doc_app_report: C S nb_collect W 3870 Z W 3874 Z W 3875 Z W 3876 Z M H Z
tb_total: M I 4700 A I H R E I ifn E Z M I 4720 A I H R E I R F 3870 A E F W 3870 E end I H 1 ifl H 12 J tb_total end R B 3861 E B Z J tb_output R A 3870 C S app_div W 3871 A W 3872 C W 3880 Z W 3881 Z
tb_balance: R H 3880 M I 4700 A I H R E I M G Z ifn E Z R G 3871 R E 3881 R F 3872 ifl E F I G 1 end I E 1 W 3881 E M I 4720 A I H R E I R F doc_selected ife H F W 3875 G W 3876 E end S E G M G E end M I 4800 A I H W I G M I 4820 A I H W I G I H 1 W 3880 H ifl H 12 J tb_balance end
; Greedy cancellation uses original slot order; at least one balance reaches0 each step.
tb_settle: M H Z M G -1 M K -1
tb_find: M I 4820 A I H R E I ifl E Z ifl G Z M G H end end ifg E Z ifl K Z M K H end end I H 1 ifl H 12 J tb_find end ifl G Z J tb_output end ifl K Z J tb_output end
 M I 4820 A I G R E I F E A M J 4820 A J K R F J ifg E F M E F end R F I A F E W I F R F J S F E W J F R H 3874 M I 4840 A I H W I G M I 4860 A I H W I K M I 4880 A I H W I E I H 1 W 3874 H J tb_settle
tb_output: M A @tb_total_text C S doc_report_text R F 3870 C S nb_int M A @tb_people C S doc_report_text R F 3861 C S nb_int M B 27 C S nb_pad M A @tb_paid C S doc_report_text R F 3876 C S nb_int M A @tb_share C S doc_report_text R F 3875 C S nb_int M B 54 C S nb_pad R E 3874 ife E Z W 3808 Z M A @tb_even C S doc_report_text M B 81 C S nb_pad M A @tb_keys J doc_report_text end R F 3808 ifge F E W 3808 Z end M A @tb_step C S doc_report_text R F 3808 I F 1 C S nb_int M A 47 C S doc_report_put R F 3874 C S nb_int M A @tb_colon C S doc_report_text R E 3808 M I 4840 A I E R F I I F 1 C S nb_two M A @tb_arrow C S doc_report_text R E 3808 M I 4860 A I E R F I I F 1 C S nb_two M B 81 C S nb_pad M A @tb_tokens C S doc_report_text R E 3808 M I 4880 A I E R F I C S nb_int M A @tb_keys J doc_report_text
tb_total_text: ${text('Total ')}
tb_people: ${text(' People ')}
tb_paid: ${text('Paid ')}
tb_share: ${text(' Share ')}
tb_even: ${text('No transfers needed')}
tb_step: ${text('Step ')}
tb_colon: ${text(': ')}
tb_arrow: ${text(' -> ')}
tb_tokens: ${text('Tokens ')}
tb_keys: ${text(' N/P:step H:fields')}
nb_format: ${text('NAME|PAID 0..729 tokens')}
${starter(tabRecords)}
${common}`;
const statementRecords=['Bread|10|-20|B','Tea|12|-15|B','Bread|11|-20|S','Gift|12|30|S'];
const statement=`
doc_app_init: W 3808 2 J nb_seed
doc_app_validate: C S nb_fields N A Z O S P R E 3830 N E 4 J nb_bad C S nb_name N A Z O S P M A 1 C S nb_numfield N A Z O S P W 3840 G R J 3812 R K 3822 W 3832 1 R E J ife E 45 W 3832 -1 I J 1 I K -1 end C S nb_uint N A Z O S P ifg G 729 J nb_bad end R E 3832 P G E W 3841 G R E 3823 N E 1 J nb_bad R I 3813 R E I M G Z E E 66 J sm_side N E 83 J nb_bad M G 1
sm_side: W 3842 G M A Z O S P
doc_app_command: J nb_plain
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J nb_help E A 110 J sm_next E A 112 J sm_prev M A Z O S P
sm_next: R E 3808 ifl E 30 I E 1 W 3808 E end M A 1 O S P
sm_prev: R E 3808 ifg E Z I E -1 W 3808 E end M A 1 O S P
doc_app_report: C S nb_collect W 3870 Z W 3871 Z W 3872 Z W 3873 Z W 3874 Z M I 4800 M H 12
sm_clear: W I -1 I I 1 I H -1 N H Z J sm_clear W 3880 Z
sm_book: R G 3880 M I 4700 A I G R E I E E Z J sm_book_next M I 4760 A I G R E I N E Z J sm_book_next W 3881 Z W 3882 -1 W 3883 1000
sm_candidates: R H 3881 M I 4700 A I H R E I E E Z J sm_candidate_next M I 4760 A I H R E I N E 1 J sm_candidate_next M I 4800 A I H R E I ifge E Z J sm_candidate_next end R G 3880 M I 4740 A I G R E I M I 4740 A I H R F I N E F J sm_candidate_next M I 4720 A I G R E I M I 4720 A I H R F I S E F F E A R F 3808 ifg E F J sm_candidate_next end R F 3883 ifl E F W 3883 E W 3882 H end
sm_candidate_next: R H 3881 I H 1 W 3881 H ifl H 12 J sm_candidates end R H 3882 ifge H Z R G 3880 M I 4800 A I G W I H M I 4800 A I H W I G R E 3870 I E 1 W 3870 E end
sm_book_next: R G 3880 I G 1 W 3880 G ifl G 12 J sm_book end M H Z
sm_unmatched: M I 4700 A I H R E I E E Z J sm_unmatched_next M I 4800 A I H R E I ifge E Z J sm_unmatched_next end M I 4760 A I H R E I M I 4740 A I H R F I ife E Z R E 3871 I E 1 W 3871 E R E 3873 A E F W 3873 E else R E 3872 I E 1 W 3872 E R E 3874 A E F W 3874 E end
sm_unmatched_next: I H 1 ifl H 12 J sm_unmatched end M A @sm_window C S doc_report_text R F 3808 C S nb_int M A @sm_pairs C S doc_report_text R F 3870 C S nb_int M B 27 C S nb_pad M A @sm_book_text C S doc_report_text R F 3871 C S nb_int M A @sm_sum C S doc_report_text R F 3873 C S nb_int M B 54 C S nb_pad M A @sm_statement_text C S doc_report_text R F 3872 C S nb_int M A @sm_sum C S doc_report_text R F 3874 C S nb_int M B 81 C S nb_pad R H doc_selected M I 4800 A I H R F I ifl F Z M A @sm_none J doc_report_text end I F 1 M A @sm_match C S doc_report_text C S nb_two M A @sm_keys J doc_report_text
sm_window: ${text('Window ')}
sm_pairs: ${text(' days; Pairs ')}
sm_book_text: ${text('Book unmatched ')}
sm_statement_text: ${text('Stmt unmatched ')}
sm_sum: ${text(' Sum ')}
sm_none: ${text('Unmatched N/P:window H:help')}
sm_match: ${text('Matches slot ')}
sm_keys: ${text(' N/P:window')}
nb_format: ${text('NAME|DAY|-TOKENS|B or S')}
${starter(statementRecords)}
${common}`;
const addressRecords=['Ari|Ari.work|A','Bo|bo.notes|B','Ari workshop|ari.WORK|B','Cy|cy.reads|A'];
const address=`
doc_app_init: W 3808 Z W 3809 -1 W 4000 Z J nb_seed
doc_app_validate: C S nb_fields N A Z O S P R E 3830 N E 3 J nb_bad C S nb_name N A Z O S P R K 3821 ifg K 16 J nb_bad end R J 3811
ac_handle: R E J ifge E 65 ifle E 90 J ac_valid_char end end ifge E 97 ifle E 122 J ac_valid_char end end ifge E 48 ifle E 57 J ac_valid_char end end E E 46 J ac_valid_char E E 95 J ac_valid_char N E 45 J nb_bad
ac_valid_char: I J 1 I K -1 N K Z J ac_handle R E 3822 N E 1 J nb_bad R I 3812 R E I ifl E 65 J nb_bad end ifg E 70 J nb_bad end S E 65 W 3842 E R E 3811 W 3840 E R E 3821 W 3841 E M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end ife B 4 M E A/1 N E 97 J nb_bad M E A/2 N E 108 J nb_bad M E A/3 N E 108 J nb_bad W 3808 Z W 3809 -1 W 4000 Z J nb_session end
 ife B 8 M E A/1 ife E 103 M E A/2 N E 114 J nb_bad M E A/3 N E 111 J nb_bad M E A/4 N E 117 J nb_bad M E A/5 N E 112 J nb_bad M E A/6 N E 32 J nb_bad M E A/7 ifl E 65 J nb_bad end ifg E 70 J nb_bad end S E 65 W 3809 E W 4000 Z J nb_session end end
 ifl B 6 J nb_bad end ifg B 22 J nb_bad end M J A M K @ac_find M H 6
ac_prefix: R E J R F K N E F J nb_bad I J 1 I K 1 I H -1 N H Z J ac_prefix S B 6 W 3888 B W 3889 J M H B M I 3920 E H Z J ac_query_done
ac_query: R E J ifge E 65 ifle E 90 A E 32 end end ifl E 33 J nb_bad end ifg E 126 J nb_bad end W I E I I 1 I J 1 I H -1 N H Z J ac_query
ac_query_done: R C 3888 M A 3900 M B 3920 C S doc_copy R E 3888 W 3808 E W 4000 Z J nb_session
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J nb_help E A 63 J ac_help E A 106 J ac_jump M A Z O S P
ac_help: W doc_message @ac_commands M A 1 O S P
ac_jump: R E 3870 E E Z M A 1 E E Z O S P M H Z R G doc_selected
ac_jump_loop: M I 4820 A I H R F I ifg F G W doc_selected F M A 1 O S P end I H 1 ifl H E J ac_jump_loop end R E 4820 W doc_selected E M A 1 O S P
; Compare handlesG,H using parsed pointer/length columns, case folded.
ac_equal: M I 4740 A I G R K I M I 4740 A I H R E I N E K M A Z N E K O S P M I 4720 A I G R J I M I 4720 A I H R I I
ac_equal_loop: R E J R F I ifge E 65 ifle E 90 A E 32 end end ifge F 65 ifle F 90 A F 32 end end N E F M A Z N E F O S P I J 1 I I 1 I K -1 N K Z J ac_equal_loop M A 1 O S P
doc_app_report: C S nb_collect W 3870 Z W 3871 Z W 3872 -1 W 3880 Z
ac_scan: R G 3880 M I 4700 A I G R E I E E Z J ac_scan_next R H doc_selected M I 4700 A I H R E I ifn E Z C S ac_equal ifn A Z R E 3871 I E 1 W 3871 E R E 3872 ifl E Z R E 3880 W 3872 E end end end
 R G 3880 R E 3809 ifge E Z M I 4760 A I G R F I N E F J ac_scan_next end R K 3808 M I 4740 A I G R E I ifl E K J ac_scan_next end M I 4720 A I G R J I M I 3900 E K Z J ac_match
ac_test_prefix: R E J ifge E 65 ifle E 90 A E 32 end end R F I N E F J ac_scan_next I I 1 I J 1 I K -1 N K Z J ac_test_prefix
ac_match: R E 3870 M I 4820 A I E R G 3880 W I G I E 1 W 3870 E
ac_scan_next: R E 3880 I E 1 W 3880 E ifl E 12 J ac_scan end
 M A @ac_matches C S doc_report_text R F 3870 C S nb_int M A 47 C S doc_report_put R F 3861 C S nb_int M A @ac_group C S doc_report_text R A 3809 ifl A Z M A 42 else A A 65 end C S doc_report_put M B 27 C S nb_pad M A @ac_canonical C S doc_report_text R H doc_selected M I 4700 A I H R E I E E Z J ac_after_handle M I 4720 A I H R J I M I 4740 A I H R K I
ac_print_handle: R A J ifge A 65 ifle A 90 A A 32 end end C S doc_report_put I J 1 I K -1 N K Z J ac_print_handle
ac_after_handle: M B 54 C S nb_pad M A @ac_same C S doc_report_text R F 3871 C S nb_int M A @ac_first C S doc_report_text R F 3872 I F 1 C S nb_two M B 81 C S nb_pad M A @ac_keys J doc_report_text
ac_find: ${text(':find ')}
ac_commands: ${text(':find PREFIX :group A :all')}
ac_matches: ${text('Matches ')}
ac_group: ${text(' Group ')}
ac_canonical: ${text('Handle: ')}
ac_same: ${text('Same handle ')}
ac_first: ${text(' First ')}
ac_keys: ${text('J:next match ?:query H:form')}
nb_format: ${text('NAME|HANDLE|GROUP A..F')}
${starter(addressRecords)}
${common}`;
function doc(number:number,id:string,site:string,title:string,dataPath:string,algorithm:string,records:string[],description:string):DocumentSoftware{return{number,id,site,title,dataPath,algorithm,kind:'document',inputs:['Saved records'],outputs:['Native report'],examples:[{records}],description:description+' The first field cannot begin with a colon; vertical bars separate fields. Authored starter records appear until a saved file is loaded. Enter edits; empty drafts delete records. S saves, L reloads, F1 cancels or asks before leaving unsaved changes.'};}
export const STUDY_DECK:DocumentSoftware={...doc(331,'study-deck','library','Leitner Study Deck','/study-deck',study,studyRecords,'Save QUESTION|ANSWER|BOX|DUE, question/answer1..18 printable characters without | or leading colon, box0..5 one digit and due000..999 exactly three digits. N/P moves the session day0..999, initially1; Enter draft command :day 120 jumps directly. R reveals an answer. G grades it good, raising its box up to5; A grades again, resetting box0. Grade intervals for boxes0..5 are1,2,4,8,16,32 days, clamped at day999. Reveal before grading; only grade after checking your own answer. J selects the next card due on or before today. Cards and schedules persist, session day does not. H shows fields.'),privateRecords:true};
export const DECISION_MATRIX=doc(332,'decision-matrix','kit','Decision Matrix','/decisions',matrix,matrixRecords,'Save NAME|A|B|C with name1..16 printable characters and three scores0..9; higher is better on every criterion. Enter draft command :weights 321 to set the three session weights1..9 (initially111). Native weighted sums rank alternatives, breaking equal-score ties by earlier slot. Dominated by lists every alternative at least as good in all three criteria and strictly better in one, independent of weights. Blank slots are skipped; an empty selected slot has rank0. Weights reset on launch. H shows fields.');
export const SETLIST_FLOW=doc(333,'setlist-flow','sol','Setlist Flow','/setlist',setlist,setlistRecords,'Save NAME|SECONDS|KEY, name1..16 printable characters, duration1..600 seconds, key0..11 with C=0. Slot order is play order, blanks skipped; runtime includes30seconds between pieces. Key transition cost is the shorter distance around the12-semitone circle, ignoring mode. O removes the selected piece and tries every insertion position, selecting the minimum total adjacent cost; ties choose the earliest position. Other pieces keep relative order, and blank slots stay blank. This optimizes one insertion, not every possible permutation. H shows fields.');
export const SHARED_TAB=doc(334,'shared-tab','lunchbox','Shared Tab','/shared-tab',tab,tabRecords,'Save NAME|PAID for up to12 participants, name1..16 printable characters and paid0..729 whole pretend tokens. Total spending is split equally in whole tokens; leftover tokens go to earlier nonempty slots. The native settlement cancels the earliest debtor against the earliest creditor repeatedly until all balances clear. Transfers use slot numbers and sum exactly to net debts; names may repeat. N/P browses transfer steps. This deterministic settlement need not minimize the number of transfers. H shows fields.');
export const STATEMENT_MATCHER=doc(335,'statement-match','enzo','Statement Matcher','/statements',statement,statementRecords,'Reconcile two pretend-token records as NAME|DAY|AMOUNT|SIDE: name1..16 printable characters, day0..999, amount-729..729 (minus optional, no plus), side B for book or S for statement. The session day window starts at2; N/P changes it0..30. In book-slot order, match an unused statement with exactly equal signed amount, choosing the nearest day within the inclusive window; ties choose earlier statement slot. Each row is used once. Report unmatched counts and signed sums and the selected partner. This documented greedy rule does not promise a global maximum matching. H shows fields.');
export const ADDRESS_CIRCLE=doc(336,'address-circle','postbox','Address Circle','/addresses',address,addressRecords,'Save NAME|HANDLE|GROUP: name1..16 printable characters, handle1..16 ASCII letters/digits/dot/underscore/hyphen, group A..F. The native index compares handles without ASCII case, reports the selected handle canonically, duplicate-cluster size and first slot. Enter :find PREFIX for a case-insensitive handle prefix, :group A for a group filter, or :all to clear both; filters combine and are session-only. J advances through matching slots; ? recalls commands, H fields. Names need not be unique.');
export const COMMUNITY_NOTEBOOKS=[STUDY_DECK,DECISION_MATRIX,SETLIST_FLOW,SHARED_TAB,STATEMENT_MATCHER,ADDRESS_CIRCLE];
