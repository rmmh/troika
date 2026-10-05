import type {DocumentSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
/** Scratch: field pointers3810..3813, lengths3820..3823, count3830.
 * Decimal parser J/K -> G. Neither parser writes live document records. */
const common=`wb_bad: M A -1 O S P
wb_fields: M J A M K B M L Z M H Z E K Z J wb_bad R E J E E 58 J wb_bad W 3810 J
wb_fields_next: E K Z J wb_fields_end R E J ifl E 32 J wb_bad end ifg E 126 J wb_bad end ife E 124 E H Z J wb_bad M I 3820 A I L W I H I L 1 ifge L 4 J wb_bad end I J 1 I K -1 M I 3810 A I L W I J M H Z J wb_fields_next end I H 1 I J 1 I K -1 J wb_fields_next
wb_fields_end: E H Z J wb_bad M I 3820 A I L W I H I L 1 W 3830 L M A Z O S P
wb_num: M G Z M H Z
wb_num_next: E K Z J wb_num_end R E J ifl E 48 J wb_bad end ifg E 57 J wb_bad end I H 1 ifg H 3 J wb_bad end P G 10 S E 48 A G E I J 1 I K -1 J wb_num_next
wb_num_end: E H Z J wb_bad M A Z O S P
wb_name: R K 3820 ifg K 12 J wb_bad end R J 3810 M G Z
wb_name_next: R E J ifn E 32 M G 1 end I J 1 I K -1 N K Z J wb_name_next E G Z J wb_bad M A Z O S P
wb_record: P A 55 A A 3000 R B A I A 1 O S P
wb_pad: R E doc_report_len ifge E B O S P end M A 32 C S doc_report_put J wb_pad
wb_int: M D 1000 M I Z
wb_int_next: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S doc_report_put end E D 1 O S P Q D 10 J wb_int_next
wb_two: ifl F 10 M A 48 C S doc_report_put end J wb_int
wb_literal: M J A
wb_literal_next: E B Z O S P R A J C S doc_report_put I J 1 I B -1 J wb_literal_next
${POSITIVE_DIVISION}`;
const help=(format:string,commands:string)=>`wb_help: W doc_message @wb_format M A 1 O S P
wb_commands: W doc_message @wb_command_help M A 1 O S P
wb_format: ${txt(format)}
wb_command_help: ${txt(commands)}`;
const expense=`doc_app_init: W 3808 Z W 3809 999 O S P
doc_app_validate: C S wb_fields N A Z O S P R E 3830 N E 3 J wb_bad R J 3810 R K 3820 C S wb_num N A Z O S P W 3840 G R E 3821 N E 1 J wb_bad R I 3811 R E I ifl E 65 J wb_bad end ifg E 70 J wb_bad end S E 65 W 3841 E R J 3812 R K 3822 C S wb_num N A Z O S P ifg G 729 J wb_bad end W 3842 G M A Z O S P
doc_app_key: E A 72 J wb_help E A 104 J wb_help E A 63 J wb_commands M A Z O S P
doc_app_command: E B Z M A Z E B Z O S P R E A ifn E 58 M A Z O S P end ifl B 9 J wb_bad end M I A M E I/1 N E 115 J wb_bad M E I/2 N E 112 J wb_bad M E I/3 N E 97 J wb_bad M E I/4 N E 110 J wb_bad M E I/5 N E 32 J wb_bad M J A A J 6 M K B S K 6 W 3843 J W 3844 K M H Z
ex_span_split: E K Z J wb_bad R E J E E 32 J ex_span_first I J 1 I K -1 I H 1 J ex_span_split
ex_span_first: I J 1 I K -1 W 3845 J W 3846 K R J 3843 M K H C S wb_num N A Z O S P W 3847 G R J 3845 R K 3846 C S wb_num N A Z O S P R E 3847 ifg E G J wb_bad end W 3808 E W 3809 G W doc_message @ex_set M A 1 O S P
doc_app_report: M I 4700 M K 6
ex_zero: W I Z I I 1 I K -1 N K Z J ex_zero W 3850 Z W 3851 Z W 3852 Z
ex_record: R A 3850 C S wb_record E B Z J ex_next C S doc_app_validate N A Z J ex_next R E 3840 R F 3808 ifl E F J ex_next end R F 3809 ifg E F J ex_next end R E 3841 M I 4700 A I E R E I R F 3842 A E F W I E R E 3851 A E F W 3851 E R E 3852 I E 1 W 3852 E
ex_next: R E 3850 I E 1 W 3850 E ifl E 12 J ex_record end M A @ex_total C S doc_report_text R F 3851 C S wb_int M A @ex_entries C S doc_report_text R F 3852 C S wb_int M B 27 C S wb_pad W 3850 Z
ex_categories: R G 3850 M A G A A 65 C S doc_report_put M A 61 C S doc_report_put M I 4700 A I G R F I C S wb_int R G 3850 I G 1 W 3850 G ife G 3 M B 54 C S wb_pad else ifl G 6 M A 32 C S doc_report_put end end ifl G 6 J ex_categories end M B 81 C S wb_pad M A @ex_span C S doc_report_text R F 3808 C S wb_int M A 45 C S doc_report_put R F 3809 C S wb_int M A @ex_hint J doc_report_text
ex_total: ${txt('Tokens:')}
ex_entries: ${txt(' Entries:')}
ex_span: ${txt('Span ')}
ex_hint: ${txt(' H:help ?:span')}
ex_set: ${txt('Date span set; not saved')}
${help('DAY|CATEGORY|TOKENS',':span LOW HIGH; H:format')}
${common}`;
const tickets=`doc_app_init: O S P
doc_app_validate: C S wb_fields N A Z O S P R E 3830 N E 4 J wb_bad C S wb_name N A Z O S P R J 3811 R K 3821 C S wb_num N A Z O S P ifl G 1 J wb_bad end ifg G 9 J wb_bad end W 3840 G R J 3812 R K 3822 C S wb_num N A Z O S P ifl G 1 J wb_bad end ifg G 99 J wb_bad end W 3841 G R E 3823 N E 1 J wb_bad R I 3813 R E I ifn E 79 ifn E 72 ifn E 68 J wb_bad end end end W 3842 E M A Z O S P
doc_app_command: E B Z M A Z E B Z O S P R E A E E 58 J wb_bad M A Z O S P
doc_app_key: E A 72 J wb_help E A 104 J wb_help E A 63 J wb_commands E A 84 J tq_toggle E A 116 J tq_toggle E A 74 J tq_jump E A 106 J tq_jump M A Z O S P
tq_jump: R E 3851 ife E Z W doc_message @tq_none M A 1 O S P end R E 4760 W doc_selected E W doc_message @tq_jumped M A 1 O S P
tq_toggle: R A doc_selected C S wb_record E B Z M A 1 E B Z O S P A A B I A -1 R E A ife E 79 M E 72 else ife E 72 M E 68 else M E 79 end end W A E W doc_dirty 1 W doc_message @tq_changed M A 1 O S P
doc_app_report: W 3850 Z W 3851 Z W 3852 Z W 3853 Z W 3854 Z
 tq_scan: R A 3850 C S wb_record E B Z J tq_scan_next C S doc_app_validate N A Z J tq_scan_next R G 3850 M I 4700 A I G R E 3840 W I E M I 4720 A I G R E 3841 W I E R E 3842 ife E 79 R E 3851 M I 4760 A I E W I G I E 1 W 3851 E R E 3852 R F 3841 A E F W 3852 E else ife E 72 R E 3853 I E 1 W 3853 E R E 3854 R F 3841 A E F W 3854 E end end
 tq_scan_next: R E 3850 I E 1 W 3850 E ifl E 12 J tq_scan end W 3855 1
 tq_sort: R E 3855 R F 3851 ifge E F J tq_output end W 3856 E
 tq_pair: R E 3856 E E Z J tq_sorted_next M I 4760 A I E R G I M H I/-1 M J 4700 A J G R E J M J 4700 A J H R F J ifg E F J tq_sorted_next end ife E F M J 4720 A J G R E J M J 4720 A J H R F J ifge E F J tq_sorted_next end end W I H M I/-1 G R E 3856 I E -1 W 3856 E J tq_pair
 tq_sorted_next: R E 3855 I E 1 W 3855 E J tq_sort
 tq_output: M A @tq_open C S doc_report_text R F 3851 C S wb_int M A 47 C S doc_report_put R F 3852 C S wb_int M A @tq_held C S doc_report_text R F 3853 C S wb_int M A 47 C S doc_report_put R F 3854 C S wb_int M B 27 C S wb_pad R E 3851 ife E Z M A @tq_none C S doc_report_text J tq_report_end end M A @tq_next C S doc_report_text R F 4760 I F 1 C S wb_two M A 32 C S doc_report_put R A 4760 C S wb_record C S doc_app_validate R A 3810 R B 3820 C S wb_literal M B 54 C S wb_pad M A @tq_queue C S doc_report_text W 3850 Z
 tq_order: R G 3850 R H 3851 ifge G H J tq_report_end end M I 4760 A I G R F I I F 1 C S wb_two M A 32 C S doc_report_put R G 3850 I G 1 W 3850 G ife G 6 M B 81 C S wb_pad M A @tq_queue C S doc_report_text end J tq_order
 tq_report_end: O S P
 tq_open: ${txt('Open:')}
 tq_held: ${txt(' Held:')}
 tq_next: ${txt('Next ')}
 tq_queue: ${txt('Queue: ')}
 tq_none: ${txt('No open tickets')}
 tq_changed: ${txt('State changed; S saves')}
 tq_jumped: ${txt('Selected next open ticket')}
${help('NAME|PRI|MIN|O/H/D','T:state J:next H:format')}
${common}`;
const route=`doc_app_init: W 3808 Z W 3809 7 O S P
doc_app_validate: C S wb_fields N A Z O S P R E 3830 N E 3 J wb_bad R E 3820 N E 1 J wb_bad R E 3821 N E 1 J wb_bad R I 3810 R E I ifl E 65 J wb_bad end ifg E 72 J wb_bad end S E 65 W 3840 E R I 3811 R E I ifl E 65 J wb_bad end ifg E 72 J wb_bad end S E 65 W 3841 E R J 3812 R K 3822 C S wb_num N A Z O S P ifl G 1 J wb_bad end ifg G 99 J wb_bad end W 3842 G M A Z O S P
doc_app_key: E A 72 J wb_help E A 104 J wb_help E A 63 J wb_commands M A Z O S P
doc_app_command: E B Z M A Z E B Z O S P R E A ifn E 58 M A Z O S P end N B 10 J wb_bad M I A M E I/1 N E 114 J wb_bad M E I/2 N E 111 J wb_bad M E I/3 N E 117 J wb_bad M E I/4 N E 116 J wb_bad M E I/5 N E 101 J wb_bad M E I/6 N E 32 J wb_bad M E I/8 N E 32 J wb_bad M G I/7 M H I/9 ifl G 65 J wb_bad end ifg G 72 J wb_bad end ifl H 65 J wb_bad end ifg H 72 J wb_bad end S G 65 S H 65 W 3808 G W 3809 H W doc_message @rt_set M A 1 O S P
doc_app_report: M I 4800 M K 64
rt_clear_edges: W I 9841 I I 1 I K -1 N K Z J rt_clear_edges W 3850 Z W 3851 Z
rt_edges: R A 3850 C S wb_record E B Z J rt_edge_next C S doc_app_validate N A Z J rt_edge_next R E 3840 P E 8 R F 3841 A E F M I 4800 A I E R E I R F 3842 ifl F E W I F end R E 3851 I E 1 W 3851 E
rt_edge_next: R E 3850 I E 1 W 3850 E ifl E 12 J rt_edges end M G Z
rt_clear: M I 4700 A I G W I 9841 M I 4720 A I G W I -1 M I 4740 A I G W I Z I G 1 ifl G 8 J rt_clear end M I 4700 R E 3808 A I E W I Z
rt_pick: M G -1 M H 9841 M J Z
rt_pick_scan: M I 4740 A I J R E I ife E Z M I 4700 A I J R E I ifl E H M G J M H E end end I J 1 ifl J 8 J rt_pick_scan end ifl G Z J rt_output end W 3852 G W 3853 H M I 4740 A I G W I 1 M J Z
rt_relax: M I 4740 A I J R E I ifn E Z J rt_relax_next end R G 3852 M I G P I 8 A I 4800 A I J R E I ife E 9841 J rt_relax_next end R H 3853 A E H M I 4700 A I J R F I ifg E F J rt_relax_next end ife E F M I 4720 A I J R F I ifge G F J rt_relax_next end end M I 4700 A I J W I E M I 4720 A I J W I G
rt_relax_next: I J 1 ifl J 8 J rt_relax end J rt_pick
rt_output: R A 3808 A A 65 C S doc_report_put M A 45 C S doc_report_put M A 62 C S doc_report_put R A 3809 A A 65 C S doc_report_put M I 4700 R E 3809 A I E R F I ife F 9841 M A @rt_unreachable C S doc_report_text M B 54 C S wb_pad J rt_footer end W 3854 F M A @rt_cost C S doc_report_text R F 3854 C S wb_int M B 27 C S wb_pad R G 3809 M H Z
rt_backtrack: M I 4880 A I H W I G I H 1 R E 3808 E G E J rt_path M I 4720 A I G R G I ifl G Z J rt_footer end ifl H 8 J rt_backtrack end
rt_path: I H -1 M I 4880 A I H R A I A A 65 C S doc_report_put ifg H Z M A 45 C S doc_report_put M A 62 C S doc_report_put J rt_path end M B 54 C S wb_pad
rt_footer: M A @rt_edges_label C S doc_report_text R F 3851 C S wb_int M A @rt_help C S doc_report_text M B 81 C S wb_pad M A @wb_command_help J doc_report_text
rt_unreachable: ${txt(' UNREACHABLE')}
rt_cost: ${txt(' cost=')}
rt_edges_label: ${txt('Edges:')}
rt_help: ${txt(' H:format')}
rt_set: ${txt('Endpoints set; not saved')}
${help('FROM|TO|COST A..H 1..99',':route A H sets endpoints')}
${common}`;
const ballots=`doc_app_init: W 3808 Z O S P
doc_app_validate: C S wb_fields N A Z O S P R E 3830 N E 2 J wb_bad C S wb_name N A Z O S P R K 3821 ifg K 6 J wb_bad end R J 3811 M G Z
bv_validate: R E J ifl E 65 J wb_bad end ifg E 70 J wb_bad end R I 3811 M H G
bv_unique: E H Z J bv_unique_done R F I E E F J wb_bad I I 1 I H -1 J bv_unique
bv_unique_done: I J 1 I G 1 I K -1 N K Z J bv_validate M A Z O S P
doc_app_command: E B Z M A Z E B Z O S P R E A E E 58 J wb_bad M A Z O S P
doc_app_key: E A 72 J wb_help E A 104 J wb_help E A 63 J wb_commands E A 78 J bv_next E A 110 J bv_next E A 80 J bv_prev E A 112 J bv_prev M A Z O S P
bv_next: R E 3808 R F 3809 ifl E F I E 1 W 3808 E end M A 1 O S P
bv_prev: R E 3808 ifg E Z I E -1 W 3808 E end M A 1 O S P
doc_app_report: M I 4700 M K 6
bv_alive_clear: W I Z I I 1 I K -1 N K Z J bv_alive_clear W 3850 Z W 3851 Z
bv_union: R A 3850 C S wb_record E B Z J bv_union_next C S doc_app_validate N A Z J bv_union_next R J 3811 R K 3821
bv_nominate: R E J S E 65 M I 4700 A I E W I 1 I J 1 I K -1 N K Z J bv_nominate R E 3851 I E 1 W 3851 E
bv_union_next: R E 3850 I E 1 W 3850 E ifl E 12 J bv_union end W 3852 Z
bv_round: R E 3852 P E 16 A E 4800 W 3853 E M I E M K 16
bv_round_clear: W I Z I I 1 I K -1 N K Z J bv_round_clear W 3854 Z W 3855 Z W 3850 Z
bv_vote: R A 3850 C S wb_record E B Z J bv_vote_next C S doc_app_validate N A Z J bv_vote_next R J 3811 R K 3821
bv_preference: E K Z J bv_vote_next R E J S E 65 M I 4700 A I E R F I ifn F Z R I 3853 A I E R F I I F 1 W I F R E 3854 I E 1 W 3854 E J bv_vote_next end I J 1 I K -1 J bv_preference
bv_vote_next: R E 3850 I E 1 W 3850 E ifl E 12 J bv_vote end M G Z M H Z M K 99 M L -1 W 3856 -1 W 3857 -1
bv_tally: M I 4700 A I G R E I ife E Z J bv_tally_next end I H 1 R I 3853 A I G R E I ifle E K M K E W 3856 G end ifg E L M L E W 3857 G end
bv_tally_next: I G 1 ifl G 6 J bv_tally end R I 3853 R E 3854 M I/6 E R E 3851 R F 3854 S E F M I/7 E M I/8 -1 M I/9 -1 M I/10 Z M I/11 H
 ife H Z M I/10 3 J bv_finished end M E L P E 2 R F 3854 ifg E F R E 3857 M I/9 E M I/10 1 J bv_finished end ife K L M I/10 2 J bv_finished end
 R E 3856 M I/8 E M I 4700 A I E W I Z R E 3852 I E 1 W 3852 E ifl E 6 J bv_round end
bv_finished: R E 3852 W 3809 E R F 3808 ifg F E W 3808 E end R E 3808 P E 16 A E 4800 W 3853 E
 M A @bv_round_label C S doc_report_text R F 3808 I F 1 C S wb_int M A @bv_live C S doc_report_text R I 3853 M F I/6 C S wb_int M A @bv_drop C S doc_report_text R I 3853 M F I/7 C S wb_int M B 27 C S wb_pad W 3850 Z
bv_result_counts: R G 3850 M A G A A 65 C S doc_report_put M A 61 C S doc_report_put R I 3853 A I G R F I C S wb_int R G 3850 I G 1 W 3850 G ife G 3 M B 54 C S wb_pad else ifl G 6 M A 32 C S doc_report_put end end ifl G 6 J bv_result_counts end M B 81 C S wb_pad R I 3853 M E I/10 ife E 3 M A @bv_empty J doc_report_text end ife E 2 M A @bv_tied J doc_report_text end ife E 1 M A @bv_winner C S doc_report_text R I 3853 M A I/9 else M A @bv_eliminate C S doc_report_text R I 3853 M A I/8 end A A 65 C S doc_report_put M A @bv_nav J doc_report_text
bv_round_label: ${txt('Round ')}
bv_live: ${txt(' Live:')}
bv_drop: ${txt(' Drop:')}
bv_empty: ${txt('NO BALLOTS; H shows format')}
bv_tied: ${txt('TIE: all remaining equal')}
bv_winner: ${txt('Winner ')}
bv_eliminate: ${txt('Eliminate ')}
bv_nav: ${txt(' N/P:round')}
${help('VOTER|RANKS A..F unique','Ties:last out; all=tie')}
${common}`;
export const EXPENSE_JOURNAL:DocumentSoftware={number:283,kind:'document',id:'expense-journal',site:'enzo',title:'Expense Journal',dataPath:'/expenses',inputs:['Day/category/tok'],outputs:['Category totals'],algorithm:expense,description:'Keep twelve pretend-world expense records as DAY|CATEGORY|TOKENS. Days are 0..999, category is one uppercase A..F, and tokens are whole amounts 0..729. Category labels are yours to assign. Enter :span LOW HIGH to total only the inclusive day range; H shows fields and ? recalls the command. Totals count entries, including zero-token entries. The filter is session-only and starts at 0..999 on every launch; S saves records, L reloads them. Empty edits delete entries. F1 cancels a draft or asks before leaving unsaved changes.',examples:[{records:['1|A|25','2|B|40','3|A|15'],commands:[':span 1 2']}]};
export const TICKET_QUEUE:DocumentSoftware={number:284,kind:'document',id:'ticket-queue',site:'toolshed',title:'Ticket Queue',dataPath:'/tickets',inputs:['Name/pri/min/OHD'],outputs:['Workload / next'],algorithm:tickets,description:'Keep twelve named tickets as NAME|PRIORITY|MINUTES|STATE. Names contain 1..12 printable characters, without | or a leading colon; priority is 1..9 (1 first), minutes 1..99, state O open, H held or D done. Open tickets sort by ascending priority, then shorter duration, then slot number. Report Open and Held as count/total minutes; both Queue rows together list all open slot numbers. J selects the next open ticket. T cycles selected state O to H to D to O; held and done tickets never dispatch. H recalls fields, ? controls. No work runs automatically. Empty edits delete tickets; S saves, L reloads.',examples:[{records:['Paint|2|30|O','Repair|1|20|O','Wait parts|1|45|H']}]};
export const ROUTE_NOTEBOOK:DocumentSoftware={number:285,kind:'document',id:'route-notebook',site:'tram',title:'Route Notebook',dataPath:'/routes',inputs:['From/to/cost'],outputs:['Weighted route'],algorithm:route,description:'Save twelve directed edges as FROM|TO|COST. Vertices are uppercase A..H and costs are positive integers 1..99. Duplicate edges use the cheapest cost; self-links are allowed. Enter :route A H to set source and target. Native Dijkstra finds minimum total cost and the complete path, or UNREACHABLE. Pending equal distances choose the lower vertex; equal routes to a vertex prefer its lower immediate predecessor. This does not promise the globally alphabetic path. A route from a vertex to itself costs zero even without edges. Endpoints are session-only, starting at A and H after launch; the graph persists with S/L. H shows fields; ? recalls the route command.',examples:[{records:['A|B|8','A|C|2','C|B|1','B|H|4'],commands:[':route A H']}]};
export const RANKED_BALLOT_BOX:DocumentSoftware={number:286,kind:'document',id:'ranked-ballots',site:'gazette',title:'Ranked Ballot Box',dataPath:'/ballots',inputs:['Voter/ranks'],outputs:['Runoff rounds'],algorithm:ballots,description:'Keep twelve ranked ballots as VOTER|RANKS. Voter labels use 1..12 printable characters, without | or a leading colon; labels need not be unique. Ranks contain 1..6 distinct uppercase letters A..F in preference order. Only candidates appearing on a ballot participate. Each round counts every ballot for its first remaining candidate; ballots with no remaining choice are exhausted (Drop). A strict majority of continuing ballots (Live) wins. Otherwise eliminate the fewest-vote candidate; partial ties eliminate the alphabetically last tied candidate. If all remaining candidates tie, report TIE without choosing a winner. An empty box reports NO BALLOTS. N/P browse computed rounds; eliminated/absent candidates show zero. S saves ballots, L reloads; round view resets on launch. H shows fields.',examples:[{records:['Ari|AB','Bo|BA','Cy|CB','Dee|BC']}]};
export const PERSONAL_WORKBENCH:DocumentSoftware[]=[EXPENSE_JOURNAL,TICKET_QUEUE,ROUTE_NOTEBOOK,RANKED_BALLOT_BOX];
