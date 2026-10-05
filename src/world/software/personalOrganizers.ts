import type {DocumentSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
// Framework owns live/staged records and report. App scratch:3808..3889,
// tables4700..4799. Parsing never writes records; mutations occur only on keys.
const common=`og_bad: M A -1 O S P
og_record: P A 55 A A 3000 R B A I A 1 O S P
og_fields: M J A M K B M G Z M H Z E K Z J og_bad R E J E E 58 J og_bad W 3810 J
og_field_loop: E K Z J og_field_end R E J ifl E 32 J og_bad end ifg E 126 J og_bad end ife E 124 E H Z J og_bad M I 3820 A I G W I H I G 1 ifge G 3 J og_bad end I J 1 I K -1 M I 3810 A I G W I J M H Z J og_field_loop end I J 1 I K -1 I H 1 J og_field_loop
og_field_end: E H Z J og_bad M I 3820 A I G W I H I G 1 W 3830 G M A Z O S P
og_number: M G Z M H Z
og_number_loop: E K Z J og_number_end R E J ifl E 48 J og_bad end ifg E 57 J og_bad end ifge H 4 J og_bad end ifg G 144 J og_bad end P G 10 S E 48 A G E I H 1 I J 1 I K -1 J og_number_loop
og_number_end: E H Z J og_bad ifg G 1440 J og_bad end M A Z O S P
og_name: E K Z J og_bad M H Z
og_name_loop: R E J ifl E 32 J og_bad end ifg E 126 J og_bad end ifn E 32 M H 1 end I J 1 I K -1 N K Z J og_name_loop E H Z J og_bad M A Z O S P
og_pad: R E doc_report_len ifge E B O S P end M A 32 C S doc_report_put J og_pad
og_int: M D 1000 M I Z
og_int_loop: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S doc_report_put end E D 1 O S P Q D 10 J og_int_loop
og_two: ifl F 10 M A 48 C S doc_report_put end J og_int
og_plain_command: E B Z M A Z E B Z O S P R E A E E 58 J og_bad M A Z O S P
og_help: W doc_message @og_format M A 1 O S P
${POSITIVE_DIVISION}`;
const habit=`doc_app_init: W 3808 21 O S P
doc_app_validate: C S og_fields N A Z O S P R E 3830 N E 2 J og_bad R K 3820 ifg K 16 J og_bad end R J 3810 C S og_name N A Z O S P R K 3821 N K 21 J og_bad R J 3811
hb_validate: R E J ifn E 120 N E 46 J og_bad end I J 1 I K -1 N K Z J hb_validate M A Z O S P
doc_app_command: J og_plain_command
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J og_help E A 110 J hb_next E A 112 J hb_prev E A 116 J hb_toggle M A Z O S P
hb_next: R E 3808 I E 1 ifg E 21 M E 1 end W 3808 E M A 1 O S P
hb_prev: R E 3808 I E -1 ifl E 1 M E 21 end W 3808 E M A 1 O S P
hb_toggle: R A doc_selected C S og_record E B Z M A 1 E B Z O S P C S doc_app_validate N A Z M A 1 N A Z O S P R I 3811 R E 3808 A I E I I -1 R E I ife E 120 M E 46 else M E 120 end W I E W doc_dirty 1 W doc_message @hb_changed M A 1 O S P
doc_app_report: W 3840 Z W 3841 Z W 3842 Z R A doc_selected C S og_record E B Z J hb_empty C S doc_app_validate N A Z J hb_empty R J 3811 R K 3808 M G Z M H Z M L Z
hb_count: R E J ife E 120 I G 1 I H 1 ifg H L M L H end else M H Z end I J 1 I K -1 N K Z J hb_count W 3840 G W 3841 H W 3842 L M A @hb_day C S doc_report_text R F 3808 C S og_int M A @hb_done C S doc_report_text R F 3840 C S og_int M A 47 C S doc_report_put R F 3808 C S og_int M B 27 C S og_pad M A @hb_current C S doc_report_text R F 3841 C S og_int M A @hb_best C S doc_report_text R F 3842 C S og_int M B 54 C S og_pad R J 3811 M K 21
hb_marks: R A J C S doc_report_put I J 1 I K -1 N K Z J hb_marks M B 81 C S og_pad M A @hb_keys J doc_report_text
hb_empty: M A @hb_empty_text C S doc_report_text M B 81 C S og_pad M A @hb_keys J doc_report_text
hb_day: ${txt('Day ')}
hb_done: ${txt(' Done:')}
hb_current: ${txt('Current:')}
hb_best: ${txt(' Best:')}
hb_keys: ${txt('N/P:day T:toggle H:format')}
hb_changed: ${txt('Mark changed; S saves')}
hb_empty_text: ${txt('Empty habit; Enter to write')}
og_format: ${txt('NAME|21 marks: x done . no')}
${common}`;
const agenda=`doc_app_init: O S P
doc_app_validate: C S og_fields N A Z O S P R E 3830 N E 3 J og_bad R K 3820 ifg K 16 J og_bad end R J 3810 C S og_name N A Z O S P R J 3811 R K 3821 C S og_number N A Z O S P W 3840 G R J 3812 R K 3822 C S og_number N A Z O S P R E 3840 ifge E G J og_bad end W 3841 G M A Z O S P
doc_app_command: J og_plain_command
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J og_help M A Z O S P
doc_app_report: W 3850 Z W 3851 Z W 3852 Z W 3853 Z W 3854 Z W 3855 Z
ag_collect: R A 3850 C S og_record E B Z J ag_empty C S doc_app_validate N A Z J ag_empty R G 3850 M I 4700 A I G R E 3840 W I E M I 4720 A I G R E 3841 W I E R E 3851 M I 4740 A I E W I G I E 1 W 3851 E J ag_collect_next
ag_empty: R G 3850 M I 4700 A I G W I -1 M I 4720 A I G W I -1
ag_collect_next: R E 3850 I E 1 W 3850 E ifl E 12 J ag_collect end W 3850 1
ag_sort: R E 3850 R F 3851 ifge E F J ag_union_init end W 3856 E
ag_sort_pair: R E 3856 E E Z J ag_sort_next M I 4740 A I E R G I M H I/-1 M J 4700 A J G R E J M J 4700 A J H R F J ifge E F J ag_sort_next end W I H M I/-1 G R E 3856 I E -1 W 3856 E J ag_sort_pair
ag_sort_next: R E 3850 I E 1 W 3850 E J ag_sort
ag_union_init: W 3850 Z W 3856 Z
ag_union: R E 3850 R F 3851 ifge E F J ag_conflicts_init end M I 4740 A I E R G I M I 4700 A I G R H I M I 4720 A I G R K I R E 3856 ifg K E ifl H E M H E end M F K S F H R E 3852 A E F W 3852 E W 3856 K end R E 3850 I E 1 W 3850 E J ag_union
ag_conflicts_init: R G doc_selected M I 4700 A I G R E I W 3860 E M I 4720 A I G R E I W 3861 E W 3850 Z
ag_conflicts: R G 3850 R H doc_selected ife G H J ag_conflict_next end R E 3860 ifl E Z J ag_output end M I 4700 A I G R E I ifl E Z J ag_conflict_next end R F 3861 ifge E F J ag_conflict_next end M I 4720 A I G R E I R F 3860 ifle E F J ag_conflict_next end R E 3853 M I 4760 A I E W I G I E 1 W 3853 E
ag_conflict_next: R E 3850 I E 1 W 3850 E ifl E 12 J ag_conflicts end
ag_output: M A @ag_busy C S doc_report_text R F 3852 C S og_int M A @ag_free C S doc_report_text M F 1440 R E 3852 S F E C S og_int M B 27 C S og_pad M A @ag_selected C S doc_report_text R F doc_selected I F 1 C S og_two R E 3860 ifl E Z M A @ag_empty_text C S doc_report_text else M A @ag_minutes C S doc_report_text R F 3861 R E 3860 S F E C S og_int end M B 54 C S og_pad M A @ag_overlap C S doc_report_text W 3850 Z R E 3853 ife E Z M A @ag_none J doc_report_text end
ag_slots: R E 3850 R F 3853 ifge E F O S P end ife E 5 M B 81 C S og_pad M A @ag_more C S doc_report_text end M I 4760 A I E R F I I F 1 C S og_two M A 32 C S doc_report_put R E 3850 I E 1 W 3850 E J ag_slots
ag_busy: ${txt('Busy:')}
ag_free: ${txt(' Free:')}
ag_selected: ${txt('Slot ')}
ag_minutes: ${txt(' minutes:')}
ag_empty_text: ${txt(' empty')}
ag_overlap: ${txt('Overlap: ')}
ag_more: ${txt('         ')}
ag_none: ${txt('none; H shows format')}
og_format: ${txt('NAME|START|END minutes')}
${common}`;
const outline=`doc_app_init: O S P
doc_app_validate: C S og_fields N A Z O S P R E 3830 N E 2 J og_bad R E 3820 N E 1 J og_bad R I 3810 R E I ifl E 48 J og_bad end ifg E 53 J og_bad end S E 48 W 3840 E R K 3821 ifg K 24 J og_bad end R J 3811 J og_name
doc_app_command: J og_plain_command
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J og_help E A 117 J ol_out E A 100 J ol_in M A Z O S P
ol_out: M L -1 J ol_change
ol_in: M L 1
ol_change: R E 3853 ifn E Z W doc_message @ol_fix M A 1 O S P end R G doc_selected M I 4700 A I G R E I ifl E Z M A 1 O S P end ifl L Z ife E Z J ol_denied end else R F 3862 ifl F E J ol_denied end R F 3863 ifge F 5 J ol_denied end end W 3864 L W 3850 G
ol_change_loop: R G 3850 R H 3860 ifg G H J ol_changed end M I 4700 A I G R E I ifge E Z M I G P I 55 A I 3001 R E I R F 3864 A E F W I E end I G 1 W 3850 G J ol_change_loop
ol_changed: W doc_dirty 1 W doc_message @ol_changed_text M A 1 O S P
ol_denied: W doc_message @ol_boundary M A 1 O S P
doc_app_report: W 3850 Z W 3851 Z W 3852 -1 W 3853 Z W 3862 -1
ol_scan: R A 3850 C S og_record E B Z J ol_empty C S doc_app_validate N A Z J ol_empty R G 3850 M I 4700 A I G R E 3840 W I E R H 3852 I H 1 ifg E H R H 3853 ife H Z I G 1 W 3853 G end end W 3852 E R H 3851 I H 1 W 3851 H R G 3850 R H doc_selected ifl G H W 3862 E end J ol_next
ol_empty: R G 3850 M I 4700 A I G W I -1
ol_next: R E 3850 I E 1 W 3850 E ifl E 12 J ol_scan end R G doc_selected W 3860 G W 3861 Z M I 4700 A I G R H I W 3863 H ifl H Z J ol_output end W 3861 1 W 3854 H I G 1 W 3850 G
ol_subtree: R G 3850 ifge G 12 J ol_output end M I 4700 A I G R E I ifl E Z J ol_subnext end R H 3854 ifle E H J ol_output end W 3860 G R H 3861 I H 1 W 3861 H R H 3863 ifg E H W 3863 E end
ol_subnext: I G 1 W 3850 G J ol_subtree
ol_output: R E 3853 ife E Z M A @ol_ok C S doc_report_text else M A @ol_gap C S doc_report_text R F 3853 C S og_two end M B 27 C S og_pad M A @ol_heading C S doc_report_text R F doc_selected I F 1 C S og_two M A @ol_level C S doc_report_text R G doc_selected M I 4700 A I G R F I ifl F Z M A @ol_empty_text C S doc_report_text else C S og_int end M B 54 C S og_pad M A @ol_sub C S doc_report_text R F doc_selected I F 1 C S og_two M A 45 C S doc_report_put R F 3860 I F 1 C S og_two M A @ol_count C S doc_report_text R F 3861 C S og_int M B 81 C S og_pad M A @ol_keys J doc_report_text
ol_ok: ${txt('Hierarchy OK')}
ol_gap: ${txt('Depth gap at slot ')}
ol_heading: ${txt('Heading ')}
ol_level: ${txt(' depth:')}
ol_empty_text: ${txt('empty')}
ol_sub: ${txt('Subtree ')}
ol_count: ${txt(' count:')}
ol_keys: ${txt('U:outdent D:indent H:format')}
ol_fix: ${txt('Fix depth gaps before U/D')}
ol_boundary: ${txt('Cannot shift this subtree')}
ol_changed_text: ${txt('Subtree shifted; S saves')}
og_format: ${txt('DEPTH 0..5|HEADING')}
${common}`;
const roster=`doc_app_init: W 3808 Z O S P
doc_app_validate: ifg B 12 J og_bad end M J A M K B E K Z J og_bad R E J E E 58 J og_bad
rr_validate: R E J E E 124 J og_bad I J 1 I K -1 N K Z J rr_validate M J A M K B J og_name
doc_app_command: J og_plain_command
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 104 J og_help E A 110 J rr_next E A 112 J rr_prev M A Z O S P
rr_next: R E 3808 I E 1 R F 3852 ifge E F M E Z end W 3808 E M A 1 O S P
rr_prev: R E 3808 I E -1 ifl E Z R E 3852 I E -1 ifl E Z M E Z end end W 3808 E M A 1 O S P
doc_app_report: W 3850 Z W 3851 Z
rr_collect: R A 3850 C S og_record ifn B Z R E 3851 M I 4700 A I E R G 3850 W I G I E 1 W 3851 E end R E 3850 I E 1 W 3850 E ifl E 12 J rr_collect end R E 3851 ifl E 2 W 3852 Z W 3808 Z M A @rr_need C S doc_report_text M B 81 C S og_pad M A @rr_help J doc_report_text end M A E M B 2 C S app_div ifn C Z R E 3851 M I 4700 A I E W I -1 I E 1 W 3851 E end R E 3851 I E -1 W 3852 E R F 3808 ifge F E W 3808 Z end W 3850 Z
rr_rotate: R E 3850 R F 3808 ifge E F J rr_output end R G 3851 I G -1 M I 4700 A I G R H I
rr_shift: ifle G 1 M I 4701 W I H R E 3850 I E 1 W 3850 E J rr_rotate end M I 4700 A I G M E I/-1 W I E I G -1 J rr_shift
rr_output: M A @rr_round C S doc_report_text R F 3808 I F 1 C S og_two M A 47 C S doc_report_put R F 3852 C S og_two M A @rr_keys C S doc_report_text M B 27 C S og_pad W 3850 Z
rr_pair: R G 3850 M E G P E 2 R F 3851 ifge E F O S P end M I 4700 A I G R E I W 3860 E M H F I H -1 S H G M I 4700 A I H R E I W 3861 E M I 4720 M E G P E 2 A I E R E 3860 W I E R E 3861 M I/1 E R E 3860 ifl E Z R E 3861 W 3860 E W 3861 -1 end R F 3860 I F 1 C S og_two R E 3861 ifl E Z M A @rr_bye C S doc_report_text else M A @rr_vs C S doc_report_text R F 3861 I F 1 C S og_two end R G 3850 I G 1 W 3850 G M A G M B 2 C S app_div ife C Z M B A P B 27 A B 27 else M B A P B 27 A B 40 end C S og_pad J rr_pair
rr_round: ${txt('Round ')}
rr_keys: ${txt(' N/P:round')}
rr_vs: ${txt(' vs ')}
rr_bye: ${txt(':BYE')}
rr_need: ${txt('Add at least two names')}
rr_help: ${txt('Enter:name H:pairing guide')}
og_format: ${txt('Pairs use slot numbers; N/P')}
${common}`;
export const HABIT_CALENDAR:DocumentSoftware={number:313,kind:'document',id:'habit-calendar',site:'jun',title:'Habit Calendar',dataPath:'/habits',inputs:['Name and marks'],outputs:['Streaks','Saved marks'],description:'Track a repeating 21-day practice, not calendar dates. Records are NAME|MARKS: name 1..16 printable characters, no | or leading colon; marks are exactly 21 lowercase x or dots, where x means done. N/P wraps the session day through 1..21. T toggles that day in the selected habit. Done counts marks through the selected day; Current is the streak ending there and Best is the longest streak up to it. Future marks do not count. H recalls syntax; Enter edits, empty drafts delete, S saves marks and L reloads. Day starts at 21 each launch.',algorithm:habit,examples:[{records:['Walk|xx.xxx...............','Read|xxxx.................']}]};
export const APPOINTMENT_DIARY:DocumentSoftware={number:314,kind:'document',id:'day-appointments',site:'clockwork',title:'Appointment Diary',dataPath:'/appointments',inputs:['Named intervals'],outputs:['Busy/free','Overlaps'],description:'Keep twelve appointments for one abstract day as NAME|START|END. Names are 1..16 printable characters, no | or leading colon. Times are whole minutes 0..1440 after midnight with START<END; no overnight wrap. Busy is the union of all intervals; Free=1440-Busy. The selected slot reports its duration and all overlapping slot numbers. Intervals are half-open: one ending exactly when another starts does not conflict. Names need not be unique. H recalls fields; Enter edits, empty drafts delete, S saves and L reloads.',algorithm:agenda,examples:[{records:['Breakfast|480|510','Meeting|500|560','Walk|560|590']}]};
export const OUTLINE_WORKSHOP:DocumentSoftware={number:315,kind:'document',id:'outline-workshop',site:'zine',title:'Outline Workshop',dataPath:'/outline',inputs:['Depth and title'],outputs:['Hierarchy','Subtree'],description:'Write twelve headings in slot order as DEPTH|HEADING. Depth is one digit 0..5; heading is 1..24 printable characters without |. Blank slots are ignored. A valid hierarchy starts at 0 and never increases more than one level between headings; deeper jumps are saved but diagnosed. Report shows the selected subtree through its last descendant and its heading count. On a valid outline U outdents the whole subtree, D indents it one level into the preceding branch. Boundaries and depth 5 are enforced atomically. H recalls fields; Enter edits, empty drafts delete, S saves and L reloads.',algorithm:outline,examples:[{records:['0|Garden','1|Seeds','2|Beans','1|Harvest','0|Kitchen']}]};
export const ROUND_ROBIN_ROSTER:DocumentSoftware={number:316,kind:'document',id:'round-robin',site:'cardtable',title:'Round Robin Roster',dataPath:'/round-robin',inputs:['Player names'],outputs:['Rounds','Saved roster'],description:'Save 2..12 participant names, one per slot, each 1..12 printable characters without | or a leading colon. Blank slots are ignored; slot numbers identify players even when names repeat. Native circle rotation pairs every unordered pair exactly once across the full schedule, with at most one match per player per round. Odd rosters give one BYE per round and one per player overall. Pairings refer to original slot numbers. N/P wraps rounds; edits recompute them, and launch starts at round 1. Pair order does not assign home advantage. H recalls the guide; S saves names, L reloads.',algorithm:roster,examples:[{records:['Ari','Bo','Cy','Dee','Eli']}]};
export const PERSONAL_ORGANIZERS=[HABIT_CALENDAR,APPOINTMENT_DIARY,OUTLINE_WORKSHOP,ROUND_ROBIN_ROSTER];
