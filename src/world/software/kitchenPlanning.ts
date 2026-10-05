import type {DocumentSoftware} from './native';
const a=(s:string)=>[...s].map(c=>c.charCodeAt(0));const t=(s:string)=>[...a(s),0].join(' ');
const seeds=(records:string[])=>`doc_app_init: M I 3000 M K 660
kp_clear: W I Z I I 1 I K -1 N K Z J kp_clear M J @kp_seeds M G 3000 M L 12
kp_seed: R H J W G H I J 1 M I G I I 1
kp_seed_text: E H Z J kp_seed_next R E J W I E I I 1 I J 1 I H -1 J kp_seed_text
kp_seed_next: A G 55 I L -1 N L Z J kp_seed O S P
kp_seeds: ${Array.from({length:12},(_,i)=>records[i]??'').flatMap(s=>[s.length,...a(s)]).join(' ')}`;
const helpers=`
; Decimal parser J/K cursor/count -> G, stops at first non-digit, max9841.
kp_digits: M G Z M H Z
kp_digit_read: E K Z J kp_digits_done R E J ifl E 48 J kp_digits_done end ifg E 57 J kp_digits_done end S E 48 ifg G 984 J kp_bad end ife G 984 ifg E 1 J kp_bad end end P G 10 A G E I H 1 I J 1 I K -1 J kp_digit_read
kp_digits_done: E H Z J kp_bad M A Z O S P
kp_bad: M A -1 O S P
; Output to report or staged record through explicit pointer3990.
kp_put: U S I R I 3990 W I A I I 1 W 3990 I O S I O S P
kp_text: M J A
kp_text_loop: R A J E A Z O S P C S kp_put I J 1 J kp_text_loop
kp_pad: R E 3990 ifge E B O S P end M A 32 C S kp_put J kp_pad
kp_number: M H 1000 M L Z
kp_number_digit: M G F Q G H M E G P E H ifg E F I G -1 S E H end S F E ifn G Z M L 1 end ife H 1 M L 1 end ifn L Z M A G A A 48 C S kp_put end Q H 10 N H Z J kp_number_digit O S P
kp_finish: R E 3990 S E 3700 W doc_report_len E O S P
kp_stage: M I 4950 M K 55
kp_stage_clear: W I Z I I 1 I K -1 N K Z J kp_stage_clear W 3990 4951 O S P
kp_publish: R E 3990 S E 4951 W 4950 E R A 3985 M B 4950 M C 55 C S doc_copy O S P
`;
const supper=`
${seeds(['Soak|30|','Rinse|5|','Cook|20|1,2','Serve|2|3'])}
doc_app_validate: J supper_parse
doc_app_command: M A Z O S P
doc_app_key: E A 72 J supper_help E A 104 J supper_help E A 63 J supper_help M A Z O S P
supper_help: W doc_message @supper_format M A 1 O S P
; Structural parsing allows missing/circular refs so users can repair the graph.
supper_parse: M J A M K B M D Z M F Z
supper_name: E K Z J kp_bad R E J E E 124 J supper_name_done ifl E 32 J kp_bad end ifg E 126 J kp_bad end ifn E 32 M F 1 end I D 1 ifg D 16 J kp_bad end I J 1 I K -1 J supper_name
supper_name_done: E D Z J kp_bad E F Z J kp_bad I J 1 I K -1 C S kp_digits N A Z O S P ifg G 99 J kp_bad end W 3942 G E K Z J kp_bad R E J N E 124 J kp_bad I J 1 I K -1 W 3945 Z E K Z M A Z E K Z O S P
supper_dep: C S kp_digits N A Z O S P ifl G 1 J kp_bad end ifg G 12 J kp_bad end R E 3945 ifge E 12 J kp_bad end M I 4900 A I E I G -1 W I G I E 1 W 3945 E E K Z M A Z E K Z O S P R E J N E 44 J kp_bad I J 1 I K -1 J supper_dep

doc_app_report: C S supper_compute W 3990 3700 R E 3986 ifn E Z M A @supper_project_error C S kp_text M B 3727 C S kp_pad R E doc_selected M I 3844 A I E R E I ife E 2 M A @supper_missing else ife E 3 M A @supper_cycle else ife E -1 M A @supper_empty else M A @supper_ready end end end C S kp_text J kp_finish end
 M A @supper_finish C S kp_text R F 3987 C S kp_number M A @supper_minutes C S kp_text M B 3727 C S kp_pad R E doc_selected M I 3844 A I E R E I ife E -1 M A @supper_empty C S kp_text J kp_finish end
 M A @supper_start C S kp_text R E doc_selected M I 3820 A I E R F I C S kp_number M A @supper_end C S kp_text R E doc_selected M I 3832 A I E R F I C S kp_number M B 3754 C S kp_pad M A @supper_slack C S kp_text R E doc_selected M I 3856 A I E R F I M I 3820 A I E R E I S F E W 3988 F C S kp_number M A @supper_minutes C S kp_text M B 3781 C S kp_pad R E 3988 ife E Z M A @supper_critical else M A @supper_flexible end C S kp_text J kp_finish
supper_compute: M I 3808 M K 60
supper_zero: W I Z I I 1 I K -1 N K Z J supper_zero M I 4700 M K 144
supper_graph_zero: W I Z I I 1 I K -1 N K Z J supper_graph_zero W 3980 Z W 3986 Z W 3987 Z
supper_records: R E 3980 P E 55 A E 3000 R B E ife B Z R I 3980 A I 3844 W I -1 J supper_record_next end M A E I A 1 C S supper_parse ifn A Z R I 3980 A I 3844 W I 2 J supper_record_next end R I 3980 A I 3808 R E 3942 W I E R D 3980 P D 12 A D 4700 R H 3945 M J 4900
supper_edges: E H Z J supper_record_next R E J M I D A I E W I 1 I J 1 I H -1 J supper_edges
supper_record_next: R E 3980 I E 1 W 3980 E ifl E 12 J supper_records end W 3981 Z
supper_pass: M L Z
supper_task: M I 3844 A I L R E I N E Z J supper_task_next M G Z M H 1 M K Z M J L P J 12 A J 4700
supper_dependency: M I J A I K R E I E E Z J supper_dep_next M I 3844 A I K R E I ife E -1 J supper_missing_task end ife E 2 J supper_missing_task end ife E Z M H Z else M I 3832 A I K R E I ifg E G M G E end end
supper_dep_next: I K 1 ifl K 12 J supper_dependency end E H Z J supper_task_next M I 3820 A I L W I G M I 3808 A I L R E I A G E M I 3832 A I L W I G M I 3844 A I L W I 1 R E 3987 ifg G E W 3987 G end J supper_task_next
supper_missing_task: M I 3844 A I L W I 2
supper_task_next: I L 1 ifl L 12 J supper_task end R E 3981 I E 1 W 3981 E ifl E 12 J supper_pass end M L Z
supper_check: M I 3844 A I L R E I ife E Z W I 3 M E 3 end ifge E 2 W 3986 1 end M I 3808 A I L R E I R F 3987 S F E M I 3856 A I L W I F I L 1 ifl L 12 J supper_check end R E 3986 N E Z O S P W 3981 Z
; Latest starts relax backwards along dependency edges.
supper_latest_pass: M L Z
supper_latest_task: M I 3844 A I L R E I ifn E 1 J supper_latest_next end M K Z
supper_successor: M J K P J 12 A J 4700 A J L R E J ifn E Z M I 3856 A I K R G I M I 3808 A I L R E I S G E M I 3856 A I L R E I ifl G E W I G end end I K 1 ifl K 12 J supper_successor end
supper_latest_next: I L 1 ifl L 12 J supper_latest_task end R E 3981 I E 1 W 3981 E ifl E 12 J supper_latest_pass end O S P
supper_format: ${t('NAME|MINUTES|DEPS (1,2,...)')}
supper_project_error: ${t('Fix dependency errors')}
supper_missing: ${t('MISSING dependency record')}
supper_cycle: ${t('CYCLE blocks selected task')}
supper_empty: ${t('Empty task; H: format')}
supper_ready: ${t('Selected task can start')}
supper_finish: ${t('Finish all: ')}
supper_minutes: ${t(' min')}
supper_start: ${t('Start ')}
supper_end: ${t('; finish ')}
supper_slack: ${t('Slack ')}
supper_critical: ${t('CRITICAL: no spare time')}
supper_flexible: ${t('Can shift within slack')}
${helpers}`;
const inventory=`
${seeds(['lentil|6|4','lentil|9|8','pickle|12|12','','','','','','','','','DAY|0'])}
doc_app_validate: ife C 11 J stock_parse_day end J stock_parse
stock_parse_day: ifl B 5 J kp_bad end M J A R E J N E 68 J kp_bad M E J/1 N E 65 J kp_bad M E J/2 N E 89 J kp_bad M E J/3 N E 124 J kp_bad A J 4 M K B I K -4 C S kp_digits N A Z O S P N K Z J kp_bad ifg G 999 J kp_bad end M A Z O S P
; Parsed name pointer3940,length3941, quantity3942, expiry3943.
stock_parse: W 3940 A M J A M K B M D Z
stock_name: E K Z J kp_bad R E J E E 124 J stock_name_end ifl E 97 J kp_bad end ifg E 122 J kp_bad end I D 1 ifg D 12 J kp_bad end I J 1 I K -1 J stock_name
stock_name_end: E D Z J kp_bad W 3941 D I J 1 I K -1 C S kp_digits N A Z O S P ifg G 729 J kp_bad end W 3942 G E K Z J kp_bad R E J N E 124 J kp_bad I J 1 I K -1 C S kp_digits N A Z O S P N K Z J kp_bad ifg G 999 J kp_bad end W 3943 G M A Z O S P
stock_today: W 3960 Z R B 3605 E B Z O S P M A 3606 C S stock_parse_day N A Z O S P W 3960 G O S P
stock_record: R E 3980 P E 55 A E 3000 W 3985 E R B E ife B Z M A -1 O S P end M A E I A 1 J stock_parse
stock_match: R E 3941 R F 3982 ifn E F M A Z O S P end R J 3940 R K 3981 M H E
stock_match_letter: R E J R F K ifn E F M A Z O S P end I J 1 I K 1 I H -1 N H Z J stock_match_letter M A 1 O S P

doc_app_command: E B Z M A Z E B Z O S P M I A R E I ifn E 58 M A Z O S P end W 3970 A W 3971 B
 ifge B 6 M E I/1 ife E 100 M E I/2 ife E 97 M E I/3 ife E 121 M E I/4 ife E 32 J stock_day_command end end end end end
 ifl B 8 J stock_bad_command end M E I/1 N E 117 J stock_bad_command M E I/2 N E 115 J stock_bad_command M E I/3 N E 101 J stock_bad_command M E I/4 N E 32 J stock_bad_command M J A A J 5 M K B I K -5 W 3981 J M D Z
stock_command_name: E K Z J stock_bad_command R E J E E 32 J stock_command_amount ifl E 97 J stock_bad_command end ifg E 122 J stock_bad_command end I D 1 ifg D 12 J stock_bad_command end I J 1 I K -1 J stock_command_name
stock_command_amount: E D Z J stock_bad_command W 3982 D I J 1 I K -1 C S kp_digits N A Z J stock_bad_command N K Z J stock_bad_command ifl G 1 J stock_bad_command end ifg G 8019 J stock_bad_command end W 3984 G C S stock_today W 3980 Z W 3983 Z
stock_preflight: C S stock_record ifn A Z J stock_preflight_next end C S stock_match E A Z J stock_preflight_next R E 3943 R F 3960 ifl E F J stock_preflight_next end R E 3983 R F 3942 A E F W 3983 E
stock_preflight_next: R E 3980 I E 1 W 3980 E ifl E 11 J stock_preflight end R E 3983 R F 3984 ifl E F W doc_message @stock_short M A -1 O S P end W 3980 Z
stock_consume: R E 3984 E E Z J stock_used C S stock_record ifn A Z J stock_consume_next end C S stock_match E A Z J stock_consume_next R E 3943 R F 3960 ifl E F J stock_consume_next end R G 3942 R H 3984 M E G ifg E H M E H end S G E S H E W 3942 G W 3984 H C S stock_write_lot
stock_consume_next: R E 3980 I E 1 W 3980 E ifl E 11 J stock_consume end
stock_used: W doc_dirty 1 W doc_message @stock_used_text M A 1 O S P
stock_write_lot: C S kp_stage R B 3940 R C 3941 M A 4951 C S doc_copy R E 3941 A E 4951 W 3990 E M A 124 C S kp_put R F 3942 C S kp_number M A 124 C S kp_put R F 3943 C S kp_number J kp_publish
stock_day_command: M J A A J 5 M K B I K -5 C S kp_digits N A Z J stock_bad_command N K Z J stock_bad_command ifg G 999 J stock_bad_command end W 3972 G C S kp_stage M A @stock_day_prefix C S kp_text R F 3972 C S kp_number W 3985 3605 C S kp_publish W doc_dirty 1 W doc_message @stock_day_set M A 1 O S P
stock_bad_command: W doc_message @stock_commands M A -1 O S P
doc_app_key: E A 72 J stock_help E A 104 J stock_help E A 63 J stock_command_help M A Z O S P
stock_help: W doc_message @stock_format M A 1 O S P
stock_command_help: W doc_message @stock_commands M A 1 O S P

doc_app_report: C S stock_today W 3961 Z W 3962 Z W 3963 Z W 3964 Z W 3980 Z
stock_count: C S stock_record ifn A Z J stock_count_next end R E 3942 E E Z J stock_count_next R E 3943 R F 3960 ifl E F R E 3962 I E 1 W 3962 E else R E 3961 R F 3942 A E F W 3961 E R E 3960 I E 2 R F 3943 ifle F E R E 3963 I E 1 W 3963 E end R E 3980 R F doc_selected ife E F R E 3942 W 3964 E end end
stock_count_next: R E 3980 I E 1 W 3980 E ifl E 11 J stock_count end W 3990 3700 M A @stock_day_text C S kp_text R F 3960 C S kp_number M A @stock_total C S kp_text R F 3961 C S kp_number M B 3727 C S kp_pad M A @stock_expired C S kp_text R F 3962 C S kp_number M A @stock_soon C S kp_text R F 3963 C S kp_number M B 3754 C S kp_pad M A @stock_selected C S kp_text R F 3964 C S kp_number M B 3781 C S kp_pad M A @stock_commands C S kp_text J kp_finish
stock_format: ${t('ITEM|QTY|EXPIRY; H format')}
stock_commands: ${t(':use ITEM Q / :day N')}
stock_short: ${t('Insufficient usable stock')}
stock_used_text: ${t('FIFO lots used; S saves')}
stock_day_set: ${t('Day updated; S saves')}
stock_day_prefix: ${t('DAY|')}
stock_day_text: ${t('Day ')}
stock_total: ${t('; usable ')}
stock_expired: ${t('Expired lots ')}
stock_soon: ${t('; soon ')}
stock_selected: ${t('Selected lot usable ')}
${helpers}`;
export const KITCHEN_PLANNING:DocumentSoftware[]=[
 {number:224,kind:'document',id:'supper-scheduler',site:'lentil',title:'Supper Scheduler',dataPath:'/supper-plan',inputs:['Name/min/deps'],outputs:['Task timings','Critical work'],algorithm:supper,description:'Plan twelve tasks as NAME|MINUTES|DEPS. Names contain 1..16 printable characters, minutes 0..99, and dependencies are comma-separated record numbers 1..12; leave the final field empty for a task with no prerequisites. Tasks can run in parallel with unlimited workers. The report computes earliest starts/finishes, the whole meal finish time, and slack against that finish; zero slack marks critical work. Missing task references and cycles, including blocked dependents, are diagnosed. Duplicate dependencies count once. Slot numbers are stable references: deleting a prerequisite leaves a missing-reference warning. H recalls the format. S saves the plan; L reloads.',examples:[{records:['Soak|30|','Rinse|5|','Cook|20|1,2','Serve|2|3']}]},
 {number:225,kind:'document',id:'batch-inventory',site:'pickle',title:'Batch Inventory',dataPath:'/batch-stock',visibleRecords:11,inputs:['Item/qty/expiry'],outputs:['Usable stock','Expiry counts'],algorithm:inventory,description:'Track eleven stock lots as ITEM|QTY|EXPIRY, with lowercase item names 1..12 letters, whole quantities 0..729 and expiry days 0..999. Slot order is FIFO arrival order. Enter :day N to set the saved current day, or :use ITEM Q to consume 1..8019 units across matching unexpired lots in slot order. Insufficient stock rejects the entire command without changing any lot. Expiry before today excludes a lot; expiry today remains usable. Soon counts nonempty usable lots expiring within two days. The report also shows selected-lot usable quantity. H recalls fields; ? commands. The current day saves with the lots. Empty edits delete lots. S saves; L reloads.',examples:[{records:['lentil|6|4','lentil|9|8','pickle|12|12'],commands:[':use lentil 10',':day 5']}]},
];
