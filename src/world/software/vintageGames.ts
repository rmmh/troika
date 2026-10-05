import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const palette=`W -3657 -8297 W -3656 8177 W -3655 -8297 W -3654 249 W -3653 -8297 W -3652 6475 W -3651 -8297 W -3650 4440`;
// Capture/liberty and immediate-ko rules: https://www.britgo.org/intro/intro2.html
// This compact practice uses literal area scoring, no komi/dead-stone adjudication/superko.
const go=`game_reset: ${palette} M I 3300 M K 25 K I K M I 3340 M K 25 K I K W 3200 1 W 3201 Z W game_message @go_a J go_render
game_move: R E game_status N E Z O S P ifge A 25 O S P end M I 3300 A I A R E I ifn E Z W game_message @go_occupied O S P end W 3206 A M I 3300 M J 3380 C S go_copy R I 3206 A I 3300 R E 3200 W I E W 3215 Z W 3207 Z
go_capture_dir: R A 3206 R B 3215 C S go_neighbor ifl A Z J go_capture_next end M I 3300 A I A R E I R F 3200 ife E Z J go_capture_next end ife E F J go_capture_next end C S go_group R E 3209 ifn E Z J go_capture_next end M L Z
go_remove: M I 3460 A I L R E I M I 3300 A I E W I Z I L 1 R E 3208 ifl L E J go_remove end R E 3207 A E L W 3207 E
go_capture_next: R E 3215 I E 1 W 3215 E ifl E 4 J go_capture_dir end R A 3206 C S go_group R E 3209 ife E Z W game_message @go_suicide J go_rollback end M L Z
go_ko_compare: M I 3300 A I L R E I M I 3340 A I L R F I ifn E F J go_commit end I L 1 ifl L 25 J go_ko_compare end W game_message @go_ko J go_rollback
go_commit: M I 3380 M J 3340 C S go_copy W 3201 Z C S game_count_move J go_next
go_rollback: M I 3380 M J 3300 C S go_copy J go_render
game_key: E A 1 J go_pass E A -26 J go_pass M A Z O S P
go_pass: R E game_status ifn E Z M A Z O S P end M I 3300 M J 3340 C S go_copy R E 3201 I E 1 W 3201 E C S game_count_move C S go_next M A 1 O S P
go_next: R E 3201 ifge E 2 J go_finish end R E game_moves ifge E 120 J go_finish end R E 3200 M F 3 S F E W 3200 F ife F 1 W game_message @go_a else W game_message @go_b end J go_render
go_finish: C S go_score R E 3202 R F 3203 ifg E F W game_status 1 W game_message @go_awin else ifl E F W game_status 2 W game_message @go_bwin else W game_status 3 W game_message @go_draw end end J go_render
go_copy: M K 25
go_copy_cell: R E I W J E I I 1 I J 1 I K -1 N K Z J go_copy_cell O S P
; Neighbor(A=0..24,B=up/right/down/left)->A=node or -1.
go_neighbor: W 3230 A W 3231 B M B 5 C S app_div R E 3231 ife E Z ife A Z J go_out end R A 3230 S A 5 O S P end ife E 1 ife C 4 J go_out end R A 3230 I A 1 O S P end ife E 2 ife A 4 J go_out end R A 3230 A A 5 O S P end ife C Z J go_out end R A 3230 I A -1 O S P
go_out: M A -1 O S P
; Return connected group in3460, count3208, any liberty3209, bordering sides3210/3211.
go_group: W 3223 A M I 3300 A I A R E I W 3222 E M I 3420 M K 25 K I K R E 3223 M I 3420 A I E W I 1 W 3460 E W 3220 Z W 3221 1 W 3209 Z W 3210 Z W 3211 Z
go_group_queue: R E 3220 R F 3221 ifge E F W 3208 F O S P end M I 3460 A I E R E I W 3223 E W 3224 Z
go_group_dir: R A 3223 R B 3224 C S go_neighbor ifl A Z J go_group_next end M I 3300 A I A R E I ife E Z W 3209 1 end ife E 1 W 3210 1 end ife E 2 W 3211 1 end R F 3222 ifn E F J go_group_next end M I 3420 A I A R E I ifn E Z J go_group_next end W I 1 R E 3221 M I 3460 A I E W I A I E 1 W 3221 E
go_group_next: R E 3224 I E 1 W 3224 E ifl E 4 J go_group_dir end R E 3220 I E 1 W 3220 E J go_group_queue
go_score: W 3202 Z W 3203 Z M I 3500 M K 25 K I K W 3216 Z
go_score_cell: R L 3216 M I 3300 A I L R E I ifn E Z A E 3201 M I E R F I I F 1 W I F J go_score_next end M I 3500 A I L R E I ifn E Z J go_score_next end M A L C S go_group M L Z
go_score_mark: M I 3460 A I L R E I M I 3500 A I E W I 1 I L 1 R E 3208 ifl L E J go_score_mark end R E 3210 R F 3211 ife E F J go_score_next end ifn E Z M I 3202 else M I 3203 end R E I R F 3208 A E F W I E
go_score_next: R E 3216 I E 1 W 3216 E ifl E 25 J go_score_cell end O S P
go_render: C S go_score M L Z
go_paint: M I 3300 A I L R E I ife E Z M E 46 else A E 64 end M I game_board A I L W I E I L 1 ifl L 25 J go_paint end W 2925 65 R A 3202 M I 2926 C S go_two W 2928 32 W 2929 32 W 2930 66 R A 3203 M I 2931 C S go_two W 2933 32 W 2934 32 O S P
go_two: U S I M B 10 C S app_div O S I A A 48 W I A A C 48 M I/1 C O S P
game_cell_style: M A B ife B 65 A A 1458 end ife B 66 A A 2187 end O S P
go_a: ${text('A places; N passes')}
go_b: ${text('B places; N passes')}
go_occupied: ${text('That intersection is filled')}
go_suicide: ${text('Suicide has no liberties')}
go_ko: ${text('Ko: play elsewhere first')}
go_awin: ${text('Area counted: A wins')}
go_bwin: ${text('Area counted: B wins')}
go_draw: ${text('Equal area: game drawn')}
${POSITIVE_DIVISION}`;
// Compact trick-taking adaptation; follow-suit and sweep inspiration: https://bicyclecards.com/how-to-play/hearts
const moon=`game_reset: ${palette} M I 3200 M K 12 K I K M I 3300 M J @mt_deal M K 20
mt_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J mt_copy M I 3320 M K 4 K I K M I 3340 M K 4
mt_table_blank: W I -1 I I 1 I K -1 N K Z J mt_table_blank W game_message @mt_start J mt_render
game_move: R E game_status N E Z O S P ifge A 5 O S P end W 3208 A M I 3300 A I A R A I ifl A Z W game_message @mt_used O S P end M B Z C S mt_legal ife A Z W game_message @mt_illegal O S P end W 3200 Z J mt_take
game_key: R E game_status ifn E Z M A Z O S P end ife A 1 W game_message @mt_help M A 1 O S P end ife A -26 W game_message @mt_help M A 1 O S P end M A Z O S P
mt_take: R E 3200 P E 5 A E 3300 R F 3208 A E F M I E R A I W 3209 A W I -1 M B 5 C S app_div W 3210 A I C 1 W 3211 C R E 3201 ife E Z M I 3340 M K 4
mt_clear_trick: W I -1 I I 1 I K -1 N K Z J mt_clear_trick R E 3210 W 3204 E R E 3200 W 3205 E R E 3211 W 3206 E W 3207 Z end R I 3200 A I 3340 R E 3209 W I E R E 3210 ife E 3 R E 3207 I E 1 W 3207 E W 3203 1 end R E 3209 ife E 14 R E 3207 A E 5 W 3207 E W 3203 1 end R E 3210 R F 3204 ife E F R E 3211 R F 3206 ifg E F W 3206 E R E 3200 W 3205 E end end R E 3201 I E 1 W 3201 E C S game_count_move R E 3201 ife E 4 J mt_end_trick end R E 3200 I E 1 ifge E 4 M E Z end W 3200 E J mt_drive
mt_end_trick: R I 3205 A I 3320 R E I R F 3207 A E F W I E R E 3202 I E 1 W 3202 E W 3201 Z R E 3205 W 3200 E R E 3202 ife E 5 J mt_finish end
mt_drive: R E 3200 ife E Z W game_message @mt_prompt J mt_render end W 3440 -1 W 3441 -999 M L Z
mt_ai: R E 3200 P E 5 A E 3300 A E L R A E ifl A Z J mt_ai_next end W 3442 A R B 3200 C S mt_legal ife A Z J mt_ai_next end R A 3442 M B 5 C S app_div M G A M H C I H 1 R E 3201 ife E Z M E 100 M F H P F 5 S E F S E G else R E 3204 ife G E R E 3206 ifl H E M E 100 A E H else M E 50 S E H end else M E 200 ife G 3 A E 10 end R F 3442 ife F 14 A E 50 end A E H end end R F 3441 ifg E F W 3441 E W 3440 L end
mt_ai_next: I L 1 ifl L 5 J mt_ai end R E 3440 W 3208 E J mt_take
mt_legal: W 3450 A W 3451 B R E game_moves ife E Z ife A Z M A 1 else M A Z end O S P end M B 5 C S app_div W 3453 A R E 3201 ifn E Z R E 3204 ife A E M A 1 O S P end W 3454 E W 3455 Z else R E 3203 ifn E Z M A 1 O S P end ifn A 3 M A 1 O S P end W 3454 3 W 3455 1 end R E 3451 P E 5 A E 3300 W 3452 E M J Z
mt_suit_scan: R I 3452 A I J R A I ifl A Z J mt_suit_next end M B 5 C S app_div R E 3454 R F 3455 ife F Z ife A E M A Z O S P end else ifn A E M A Z O S P end end
mt_suit_next: I J 1 ifl J 5 J mt_suit_scan end M A 1 O S P
mt_finish: M L Z
mt_sweep: M I 3320 A I L R E I ife E 10 M J Z
mt_sweep_set: M I 3320 A I J ife J L W I Z else W I 10 end I J 1 ifl J 4 J mt_sweep_set end J mt_winner end I L 1 ifl L 4 J mt_sweep end
mt_winner: R G 3320 M H Z M L 1
mt_compare: M I 3320 A I L R E I ifl E G W game_status 2 W game_message @mt_lose J mt_render end ife E G M H 1 end I L 1 ifl L 4 J mt_compare end ife H Z W game_status 1 W game_message @mt_win else W game_status 3 W game_message @mt_draw end J mt_render
mt_render: M I game_board M K 40
mt_blank: W I 32 I I 1 I K -1 N K Z J mt_blank M L Z
mt_hand_paint: M I 3300 A I L R A I ifl A Z M G 46 M H 46 else M B 5 C S app_div M I @mt_suits A I A R H I M G C A G 49 end M I game_board A I L W I G M I game_board A I 5 A I L W I H I L 1 ifl L 5 J mt_hand_paint end M L Z
mt_trick_paint: M I 3340 A I L R A I ifl A Z M G 46 M H 46 else M B 5 C S app_div M I @mt_suits A I A R H I M G C A G 49 end M I game_board A I 10 A I L W I H M I game_board A I 15 A I L W I G I L 1 ifl L 4 J mt_trick_paint end M L Z
mt_score_paint: M I L P I 5 A I game_board A I 20 M E L A E 65 W I E I I 1 U S I M I 3320 A I L R A I M B 10 C S app_div O S I A A 48 W I A A C 48 M I/1 C I L 1 ifl L 4 J mt_score_paint end O S P
game_cell_style: M A B ife B 72 A A 2187 end ife B 83 A A 2916 end ife B 67 A A 1458 end ife B 68 A A 729 end O S P
mt_deal: 0 3 6 14 17 1 5 9 12 18 2 7 10 13 15 4 8 11 16 19
mt_suits: 67 68 83 72
mt_start: ${text('Start with C1 in top row')}
mt_prompt: ${text('Your card; follow suit')}
mt_used: ${text('That card was spent')}
mt_illegal: ${text('Follow suit / no heart lead')}
mt_help: ${text('H=1 S5=5; low penalty wins')}
mt_win: ${text('Lowest penalties: you win!')}
mt_lose: ${text('A rival has fewer penalties')}
mt_draw: ${text('You share the lowest score')}
${POSITIVE_DIVISION}`;
const mineMap=['#######','# : *E#','#::O::#','#:#*#:#','#:::O*#','#:::::#','#######'].join('');
const mineCodes=[...mineMap].map(c=>' #:O*E'.indexOf(c));
const mine=`game_reset: ${palette} M I 3300 M J @bm_map M K 49
bm_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bm_copy W 3200 8 W 3201 Z W game_message @bm_prompt J bm_render
game_move: R E game_status N E Z O S P ifge A 49 O S P end W 3202 A M B 7 C S app_div W 3210 A W 3211 C R A 3200 C S app_div R E 3210 S A E F A A R E 3211 S C E F C A A A C ifn A 1 W game_message @bm_near O S P end R I 3202 A I 3300 R E I ife E 1 W game_message @bm_wall O S P end ife E 3 R E 3202 R F 3200 S E F ifn E 1 ifn E -1 W game_message @bm_push O S P end end R F 3202 A F E M J 3300 A J F R G J ifn G Z W game_message @bm_push O S P end W J 3 W I Z end R E I ife E 5 R E 3201 ifn E 3 W game_message @bm_locked O S P end R E 3202 W 3200 E C S game_count_move W game_status 1 W game_message @bm_win J bm_render end ife E 4 R E 3201 I E 1 W 3201 E W I Z end R E I ife E 2 W I Z end R E 3202 W 3200 E J bm_tick
game_key: E A 1 J bm_wait E A -26 J bm_wait M A Z O S P
bm_wait: R E game_status ifn E Z M A Z O S P end C S bm_tick M A 1 O S P
bm_tick: C S game_count_move W game_message @bm_prompt M L 41
bm_stone: M I 3300 A I L R E I ifn E 3 J bm_next end M G L A G 7 R E 3200 ife G E J bm_dead end M J 3300 A J G R E J ife E Z W I Z W J 3 J bm_next end ifn E 1 ifn E 3 J bm_next end end M H -1
bm_roll: M E L A E H R F 3200 ife E F J bm_roll_next end M I 3300 A I E R E I ifn E Z J bm_roll_next end M E G A E H M J 3300 A J E R F J ifn F Z J bm_roll_next end R F 3200 ife E F J bm_dead end M I 3300 A I L W I Z W J 3 J bm_next
bm_roll_next: ife H -1 M H 1 J bm_roll end
bm_next: I L -1 ifge L 7 J bm_stone end R E game_moves ifge E 60 W game_status 2 W game_message @bm_time end J bm_render
bm_dead: W game_status 2 W game_message @bm_crushed J bm_render
bm_render: M L Z
bm_paint: M I 3300 A I L R E I M J @bm_symbols A J E R E J R F 3200 ife L F M E 64 end M I game_board A I L W I E I L 1 ifl L 49 J bm_paint end W 2949 71 R E 3201 A E 48 W 2950 E W 2951 32 W 2952 84 M A 60 R E game_moves S A E M B 10 C S app_div A A 48 W 2953 A A C 48 W 2954 C W 2955 32 O S P
game_cell_style: M A B ife B 64 A A 1458 end ife B 42 A A 729 end ife B 79 A A 2187 end ife B 69 A A 2916 end O S P
bm_map: ${mineCodes.join(' ')}
bm_symbols: 46 35 58 79 42 69
bm_prompt: ${text('Dig gems; avoid falling O')}
bm_near: ${text('Choose an adjacent square')}
bm_wall: ${text('Stone wall blocks the way')}
bm_push: ${text('Push sideways onto bare .')}
bm_locked: ${text('Find all three gems first')}
bm_win: ${text('Three gems safely outside!')}
bm_time: ${text('Mine shift ended: time up')}
bm_crushed: ${text('A falling stone crushed you')}
${POSITIVE_DIVISION}`;
const race=`game_reset: ${palette} M I 3300 M K 6
hr_clear: W I -1 I I 1 I K -1 N K Z J hr_clear W 3200 Z W 3202 Z W 3204 Z W game_message @hr_roll_prompt J hr_render
game_move: R E game_status N E Z O S P ife A 24 J hr_roll end ifl A 49 O S P end ifge A 56 O S P end ife A 52 O S P end ifl A 52 S A 49 else S A 50 end W 3205 A R E 3200 ife E Z ifge A 3 W game_message @hr_other O S P end else ifl A 3 W game_message @hr_other O S P end end R E 3202 ife E Z W game_message @hr_roll_prompt O S P end C S hr_legal ifl A Z W game_message @hr_illegal O S P end R I 3205 A I 3300 W I A ifge B Z M I 3300 A I B W I -1 end J hr_finish_turn
game_key: E A 1 J hr_roll E A -26 J hr_roll M A Z O S P
hr_roll: R E game_status ifn E Z M A Z O S P end R E 3202 ifn E Z W game_message @hr_pick M A 1 O S P end R I 3204 A I @hr_dice R E I W 3202 E R E 3204 I E 1 ifge E 12 M E Z end W 3204 E R K 3200 P K 3 M E K A E 3 W 3421 E
hr_find_move: M A K C S hr_legal ifge A Z W game_message @hr_pick C S hr_render M A 1 O S P end I K 1 R E 3421 ifl K E J hr_find_move end C S hr_finish_turn R E game_status ife E Z W game_message @hr_skip end M A 1 O S P
hr_finish_turn: C S game_count_move R E 3200 P E 3 M I 3300 A I E M K 3
hr_finished: R E I ifn E 15 J hr_continue end I I 1 I K -1 N K Z J hr_finished R E 3200 I E 1 W game_status E ife E 1 W game_message @hr_awin else W game_message @hr_bwin end W 3202 Z J hr_render
hr_continue: R E game_moves ifge E 120 W game_status 3 W game_message @hr_draw W 3202 Z J hr_render end R E 3202 ifn E 6 R E 3200 M F 1 S F E W 3200 F end W 3202 Z W game_message @hr_roll_prompt J hr_render
; Trial one token, returns A=progress or-2 and B=captured index or-1.
hr_legal: W 3430 A M I 3300 A I A R E I ifge E 15 J hr_no end R F 3202 ife F Z J hr_no end ifl E Z ifn F 6 J hr_no end M E Z else A E F ifg E 15 J hr_no end end W 3431 E W 3433 -1 ife E 15 J hr_yes end M B E R A 3430 C S hr_location W 3432 A M L Z
hr_collision: R E 3430 ife L E J hr_next_collision end M I 3300 A I L R B I M A L C S hr_location ifl A Z J hr_next_collision end R E 3432 ifn A E J hr_next_collision end R E 3200 ife E Z ifl L 3 J hr_no end else ifge L 3 J hr_no end end ife A Z J hr_no end ife A 48 J hr_no end W 3433 L
hr_next_collision: I L 1 ifl L 6 J hr_collision end
hr_yes: R A 3431 R B 3433 O S P
hr_no: M A -2 O S P
hr_location: ifl B Z M A -1 O S P end ifge B 15 M A -1 O S P end M E A M A B ifl B 12 ifge E 3 A A 6 end ifge A 12 S A 12 end M I @hr_track A I A R A I O S P end S A 12 ifl E 3 A A 16 else M F 32 S F A M A F end O S P
hr_render: M I game_board M K 56
hr_blank: W I 32 I I 1 I K -1 N K Z J hr_blank M L Z
hr_track_cell: M I @hr_track A I L R E I M I game_board A I E W I 46 I L 1 ifl L 12 J hr_track_cell end W 2916 46 W 2917 46 W 2918 46 W 2930 46 W 2931 46 W 2932 46 M L Z
hr_token: M I 3300 A I L R B I M A L C S hr_location ifge A Z M I game_board A I A M J @hr_letters A J L R E J W I E end M I 3300 A I L R E I M J @hr_letters A J L R F J ife E 15 A F 32 end M I game_board A I 49 A I L ifge L 3 I I 1 end W I F I L 1 ifl L 6 J hr_token end R E 3200 A E 65 W 2921 E W 2922 32 R E 3202 ife E Z W 2923 114 W 2924 111 W 2925 108 W 2926 108 else W 2923 100 W 2924 105 W 2925 101 A E 48 W 2926 E end W 2927 32 O S P
game_cell_style: ife A 21 R E 3200 A E 2 P E 729 M A B A A E O S P end M A B ifge B 65 ifle B 67 A A 1458 O S P end end ifge B 88 ifle B 90 A A 2187 O S P end end ifge B 97 ifle B 99 A A 1458 O S P end end ifge B 120 ifle B 122 A A 2187 end end O S P
hr_track: 0 2 4 6 20 34 48 46 44 42 28 14
hr_letters: 65 66 67 88 89 90
hr_dice: 6 3 2 6 1 4 5 2 6 3 1 5
hr_roll_prompt: ${text('N rolls; then choose token')}
hr_pick: ${text('Use the pending die first')}
hr_other: ${text('Choose your bottom token')}
hr_illegal: ${text('Need exact roll, clear spot')}
hr_skip: ${text('No legal token; turn passes')}
hr_awin: ${text('A brought all three home!')}
hr_bwin: ${text('B brought all three home!')}
hr_draw: ${text('120 turns: unfinished draw')}
`;
const couriers=`game_reset: ${palette} W 3300 Z W 3301 5 W 3302 30 W 3303 35 W 3200 -1 W 3201 Z W game_message @rc_prompt J rc_render
game_move: R E game_status N E Z O S P ifge A 36 O S P end W 3202 A M L Z
rc_pick: M I 3300 A I L R E I ife E A R E 3200 ife E L W 3200 -1 else W 3200 L end W game_message @rc_prompt J rc_render end I L 1 ifl L 4 J rc_pick end R E 3200 ifl E Z W game_message @rc_choose O S P end R A 3202 M B 6 C S app_div W 3210 A W 3211 C R I 3200 A I 3300 R A I C S app_div R E 3210 ife A E R E 3211 ifl C E M A 1 else M A -1 end J rc_slide end R E 3211 ifn C E W game_message @rc_aligned O S P end R E 3210 ifl A E M A 6 else M A -6 end J rc_slide
game_key: E A 10 J rc_up E A -17 J rc_up E A -13 J rc_left E A -40 J rc_left E A 6 J rc_down E A -21 J rc_down E A -10 J rc_right E A -37 J rc_right M A Z O S P
rc_up: M A -6 J rc_key_slide
rc_left: M A -1 J rc_key_slide
rc_down: M A 6 J rc_key_slide
rc_right: M A 1
rc_key_slide: C S rc_slide M A 1 O S P
rc_slide: R E game_status N E Z O S P R E 3200 ifl E Z W game_message @rc_choose O S P end M D A M I 3300 A I E R G I W 3212 G
rc_ray: M A G M B 6 C S app_div ife D 1 ife C 5 J rc_stop end end ife D -1 ife C Z J rc_stop end end M H G A H D ifl H Z J rc_stop end ifge H 36 J rc_stop end M J @rc_walls M K 4
rc_wall: R E J ife E H J rc_stop end I J 1 I K -1 N K Z J rc_wall M J 3300 M K 4
rc_other: R E J ife E H J rc_stop end I J 1 I K -1 N K Z J rc_other M G H J rc_ray
rc_stop: R E 3212 ife G E W game_message @rc_blocked O S P end R I 3200 A I 3300 W I G C S game_count_move
rc_goals: R E 3201 ifge E 3 W game_status 1 W game_message @rc_win J rc_render end M I 3300 A I E R F I M J @rc_targets A J E R G J ifn F G W game_message @rc_prompt J rc_render end I E 1 W 3201 E J rc_goals
rc_render: M I game_board M K 36
rc_empty: W I 46 I I 1 I K -1 N K Z J rc_empty M J @rc_walls M K 4
rc_walls_paint: R E J M I game_board A I E W I 35 I J 1 I K -1 N K Z J rc_walls_paint R E 3201 ifl E 3 M J @rc_targets A J E R F J M I game_board A I F A E 97 W I E end M L Z
rc_tokens: M I 3300 A I L R E I M I game_board A I E R E 3200 ife E L M E 64 else M E L A E 65 end W I E I L 1 ifl L 4 J rc_tokens end R E 3201 ife E 3 W 2936 65 W 2937 76 W 2938 76 W 2939 32 W 2940 51 W 2941 33 O S P end M F E A F 65 W 2936 F W 2937 114 W 2939 99 W 2941 32 M I @rc_targets A I E R A I M B 6 C S app_div A A 49 W 2938 A A C 49 W 2940 C O S P
game_cell_style: ife B 64 R E 3200 I E 1 P E 729 M A B A A E O S P end M A B ifge B 65 ifle B 68 M E B S E 64 P E 729 A A E O S P end end ifge B 97 ifle B 99 M E B S E 96 P E 729 A A E end end O S P
rc_walls: 7 10 25 28
rc_targets: 14 21 9
rc_prompt: ${text('Pick courier; aim or WASD')}
rc_choose: ${text('Select a courier A-D first')}
rc_aligned: ${text('Aim in the same row/column')}
rc_blocked: ${text('Blocked; choose another way')}
rc_win: ${text('All three deliveries made!')}
${POSITIVE_DIVISION}`;
export const VINTAGE_GAMES:BoardSoftware[]=[
{number:364,id:'pocket-go',kind:'board',site:'hexclub',title:'Pocket Go',columns:5,rows:7,stepKey:'n',cellStyle:true,counterLabel:'Turns',controls:'Enter:stone N:pass R:reset',inputs:['Local players'],outputs:['Captures / area'],algorithm:go,description:'Local 5x5 Go practice, A first. Enter an empty intersection. Orthogonally joined stones share liberties; an opposing group with no empty neighbor is captured. Suicide is rejected after captures. Immediate ko forbids recreating the board before the previous turn; older repetitions are allowed, so this is not superko. N passes. Two consecutive passes, or 120 turns, score literal area: each stone plus empty regions bordering only that side. Mixed or borderless regions score neither; no komi, prisoner bonus or automatic dead-stone removal. Capture disputed dead stones before passing. The bottom A/B numbers show current area. R resets; F1 exits.',examples:[{"moves":[6,7,21,2,1,24,10,20,4,19,17,15,14,13,11,9,3,0,5,23,12,22,8,16,0,18,21,15,14,20],"steps":2,"board":"AA.AAAA.A.AAA.AB.A..BA...A22  B02  ","status":1,"movesMade":32}]},
{number:365,id:'moon-tricks',kind:'board',site:'cardtable',title:'Moon Tricks',columns:5,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Cards',controls:'Enter:top card N:rules',inputs:['Five-card hand'],outputs:['Tricks / penalty'],algorithm:moon,description:'Compact Hearts-style practice: four players, five cards each, suits C/D/S/H and ranks 1..5. You are A; B/C/D are native rivals. C1 must open. Follow the led suit if possible; highest led-suit rank wins and leads next. Hearts cannot lead until H or S5 was played, unless your hand contains only hearts. No passing or first-trick penalty restriction. Each H costs 1, S5 costs 5; taking all 10 penalty points instead gives each rival 10 and yourself 0. Lowest score after five tricks wins; a shared minimum ties. Top rows show your ranks/suits; next rows show the current or last trick in A/B/C/D order; bottom rows are scores. Rivals shed losing high cards or dump penalties when void. R replays; F1 exits.',examples:[{"moves":[0,3,1,2,4],"steps":0,"board":"..........HDSH 3512 A00  B10  C10  D10  ","status":1,"movesMade":20}]},
{number:366,id:'boulder-mine',kind:'board',site:'basalt',title:'Boulder Mine',columns:7,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Ticks',controls:'Enter:walk/dig N:wait',inputs:['Dig / push'],outputs:['Gems / gravity'],algorithm:mine,description:'Dig all three * gems and reach E within 60 ticks. @ walks to an adjacent square; : earth disappears as you dig, # walls are fixed and dots are bare floor. Push O stones horizontally only onto bare floor. Every accepted move or N wait advances gravity once, scanning stones from bottom to top. Stones fall into bare space; when supported by a wall or stone they roll down-left first, then down-right, if both side and diagonal cells are bare. Falling onto you is fatal, and stones cannot roll through your side square. Digging directly beneath a stone is dangerous: shift it first. Entering the open exit completes before gravity. Bottom G/T show gems and time left. R restarts; F1 exits.',examples:[{"moves":[15,16,9,10,11,18,17,16,17,24,17,18,19,26,33,26,19,12],"steps":0,"board":"########....@##O....##:#.#.##:::O.##:::::########G3 T42 ","status":1,"movesMade":18}]},
{number:367,id:'homeward-race',kind:'board',site:'scorebook',title:'Homeward Race',columns:7,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Turns',controls:'N:roll Enter:bottom token',inputs:['Local players'],outputs:['Capture / finish'],algorithm:race,description:'Two local players race three tokens home. A uses A/B/C, B uses X/Y/Z. N or Enter on the central roll label produces a deterministic repeating die: 6,3,2,6,1,4,5,2,6,3,1,5. Choose your bottom token to spend it. A roll of 6 enters a waiting token at its start or moves an active token six steps; every 6 gives another turn. Tokens go clockwise around twelve outer stops, then their private three-cell home lane and need an exact roll to finish. Own occupied destinations are blocked. Landing on an enemy sends it to its yard, except the two safe start corners, where occupied landings are blocked. No legal move skips automatically; 120 turns draws. Lowercase bank tokens have finished. R restarts; F1 exits.',examples:[{"moves":[24,50,24,50,24,24,49,24,50,24,24,50,24,24,50,24,49,24,24,49,24,55,24,55,24,49,24,55,24,55,24,49,24,55,24,24,54,24,54,24,49,24,54,24,51,24,51,24,54,24,51,24,51,24,54,24,51],"steps":0,"board":". . . .       . ... .A roll . Y.. .       . . . .abc XYz","status":1,"movesMade":31}]},
{number:368,id:'ricochet-courier',kind:'board',site:'station',title:'Ricochet Couriers',columns:6,rows:7,stepKey:'n',cellStyle:true,counterLabel:'Moves',controls:'Enter:pick/aim WASD:slide',inputs:['Four couriers'],outputs:['Three deliveries'],algorithm:couriers,description:'Deliver A, then B, then C to their lowercase target squares. Enter a courier to select @, then an aligned empty square to aim, or use W/A/S/D. It slides until the next square is a wall, board edge or another courier; it cannot stop early. Move helper couriers to create stopping barriers. D has no parcel but is useful as a blocker. The bottom label gives the active courier and target row/column, counted from 1. A courier already waiting at a newly activated target counts immediately. Enter a selected courier again to cancel; empty diagonal aiming is rejected. R restores the full three-delivery puzzle; F1 exits.',examples:[{"moves":[5,29,0,5,29,11,35,17,30,35,23,17,12,11,17,13,5,17,14,17,13,19,12,16,22,19,21,3,22,16,23,18,16,22,18,21,9],"steps":0,"board":"...B...#.@#......A....D..#..#.......ALL 3!","status":1,"movesMade":22}]},
];
