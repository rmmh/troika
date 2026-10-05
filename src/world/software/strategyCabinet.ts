import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const palette=`W -3657 -8297 W -3656 8177 W -3655 -8297 W -3654 249 W -3653 -8297 W -3652 6475 W -3651 -8297 W -3650 4440`;
const hitoriNumbers=[1,1,3,4,5,2,3,4,2,1,3,4,5,1,2,4,5,4,2,3,5,1,2,3,5];
const hitori=`game_reset: ${palette} M I 3300 M K 25 K I K W game_message @hi_prompt J hi_render
game_move: R E game_status N E Z O S P M I 3300 A I A R E I M F 1 S F E W I F C S game_count_move W game_message @hi_prompt J hi_render
game_key: E A 1 J hi_check E A -26 J hi_check M A Z O S P
hi_check: R E game_status ifn E Z M A Z O S P end M L Z W 3200 Z W 3201 -1
hi_cell: M I 3300 A I L R E I ife E Z R E 3200 I E 1 W 3200 E W 3201 L M K Z
hi_duplicate: ife K L J hi_dup_next end M I 3300 A I K R E I ifn E Z J hi_dup_next end M I @hi_numbers A I L R E I M I @hi_numbers A I K R F I ifn E F J hi_dup_next end M A L M B 5 C S app_div W 3202 A W 3203 C M A K C S app_div R E 3202 ife A E J hi_bad_duplicate end R E 3203 ife C E J hi_bad_duplicate end
hi_dup_next: I K 1 ifl K 25 J hi_duplicate end else M A L M B 5 C S app_div ifl C 4 M I 3301 A I L R E I ifn E Z J hi_bad_touch end end ifl A 4 M I 3305 A I L R E I ifn E Z J hi_bad_touch end end end I L 1 ifl L 25 J hi_cell end
 R E 3200 ife E Z J hi_bad_link end M I 3340 M K 25 K I K R E 3201 W 3380 E M I 3340 A I E W I 1 W 3202 Z W 3203 1
hi_queue: R E 3202 R F 3203 ifge E F J hi_done end M I 3380 A I E R A I W 3204 A M B 5 C S app_div W 3205 A W 3206 C ifg A Z R A 3204 S A 5 C S hi_visit end R E 3205 ifl E 4 R A 3204 A A 5 C S hi_visit end R E 3206 ifg E Z R A 3204 I A -1 C S hi_visit end R E 3206 ifl E 4 R A 3204 I A 1 C S hi_visit end R E 3202 I E 1 W 3202 E J hi_queue
hi_visit: M I 3300 A I A R E I N E Z O S P M I 3340 A I A R E I N E Z O S P W I 1 R E 3203 M I 3380 A I E W I A I E 1 W 3203 E O S P
hi_done: R E 3203 R F 3200 ifn E F J hi_bad_link end W game_status 1 W game_message @hi_win M A 1 O S P
hi_bad_duplicate: W game_message @hi_duplicate_text M A 1 O S P
hi_bad_touch: W game_message @hi_touch M A 1 O S P
hi_bad_link: W game_message @hi_link M A 1 O S P
hi_render: M L Z
hi_paint: M I 3300 A I L R E I ifn E Z M E 35 else M I @hi_numbers A I L R E I A E 48 end M I game_board A I L W I E I L 1 ifl L 25 J hi_paint end O S P
game_cell_style: M A B ife B 35 A A 2187 else A A 1458 end O S P
hi_numbers: ${hitoriNumbers.join(' ')}
hi_prompt: ${text('Shade repeats; N checks all')}
hi_duplicate_text: ${text('Unshaded digits repeat')}
hi_touch: ${text('Shaded neighbors touch')}
hi_link: ${text('White cells must connect')}
hi_win: ${text('No repeats; one white area!')}
${POSITIVE_DIVISION}`;
const auctionKinds=[0,1,2,0,1,2],auctionValues=[5,6,4,7,5,8];
const auction=`game_reset: ${palette} W 3200 Z W 3201 Z W 3202 18 W 3203 18 M I 3300 M K 6 K I K M I 3320 M K 6 K I K W game_message @au_prompt J au_render
game_move: R E game_status N E Z O S P ifl A 30 O S P end ifge A 40 O S P end S A 30 W 3201 A W game_message @au_prompt J au_render
game_key: E A 1 J au_bid E A -26 J au_bid M A Z O S P
au_bid: R E game_status ifn E Z M A Z O S P end R E 3201 R F 3202 ifg E F W game_message @au_broke M A 1 O S P end R I 3200 A I @au_values R E I I E -1 W 3210 E R I 3200 A I @au_kinds R E I W 3211 E M I 3323 A I E R E I ifn E Z R E 3210 A E 3 W 3210 E end R E 3210 R F 3203 ifg E F M E F W 3210 E end R F 3201 ifg F E J au_you end ife F E R E 3200 M A E M B 2 C S app_div ife C Z J au_you end end
au_bot: W 3212 2 R E 3203 R F 3210 S E F W 3203 E M I 3323 R E 3211 A I E R E I I E 1 W I E W game_message @au_bot_won J au_sold
au_you: W 3212 1 R E 3202 R F 3201 S E F W 3202 E M I 3320 R E 3211 A I E R E I I E 1 W I E W game_message @au_you_won
au_sold: R I 3200 A I 3300 R E 3212 W I E C S game_count_move R E 3200 I E 1 W 3200 E C S au_scores ife E 6 J au_finish end J au_bid_done
au_finish: R E 3204 R F 3205 ifg E F W game_status 1 W game_message @au_win else ifl E F W game_status 2 W game_message @au_lose else W game_status 3 W game_message @au_draw end end
au_bid_done: C S au_render M A 1 O S P
au_scores: R E 3202 W 3204 E R E 3203 W 3205 E M L Z
au_value: M I 3300 A I L R E I ifn E Z A E 3203 M I E R F I M J @au_values A J L R G J A F G W I F end I L 1 ifl L 6 J au_value end M L Z
au_bonus_side: M E L P E 3 A E 3320 M J E M G Z M H Z M K Z
au_bonus: R E J ifg E Z I H 1 end ifge E 2 A G 6 end I J 1 I K 1 ifl K 3 J au_bonus end ife H 3 A G 4 end M I 3204 A I L R E I A E G W I E I L 1 ifl L 2 J au_bonus_side end R E 3200 O S P
au_render: C S au_scores M I game_board M K 48
au_blank: W I 32 I I 1 I K -1 N K Z J au_blank M L Z
au_lot: M J @au_kinds A J L R E J A E 65 M I game_board A I L W I E M J @au_values A J L R E J A E 48 M I game_board A I 6 A I L W I E M J 3300 A J L R E J ife E Z M E 46 else ife E 1 M E 89 else M E 66 end end M I game_board A I 12 A I L W I E I L 1 ifl L 6 J au_lot end W 2918 89 R A 3202 M I 2919 C S au_two W 2921 66 R A 3203 M I 2922 C S au_two W 2924 89 R A 3204 M I 2925 C S au_two W 2927 66 R A 3205 M I 2928 C S au_two M L Z
au_digits: M E L A E 48 M I game_board A I 30 A I L W I E I L 1 ifl L 10 J au_digits end W 2942 66 W 2943 105 W 2944 100 R A 3201 M I 2946 C S au_two O S P
au_two: U S I M B 10 C S app_div O S I A A 48 W I A A C 48 M I/1 C O S P
game_cell_style: M A B ife B 89 A A 1458 O S P end ife B 66 A A 2187 O S P end ifge B 65 ifle B 67 A A 729 end end O S P
au_kinds: ${auctionKinds.join(' ')}
au_values: ${auctionValues.join(' ')}
au_prompt: ${text('Choose bid 0-9; N seals it')}
au_broke: ${text('Bid exceeds your purse')}
au_you_won: ${text('You bought this lot')}
au_bot_won: ${text('Rival bought this lot')}
au_win: ${text('Your collection wins!')}
au_lose: ${text('Rival collection wins')}
au_draw: ${text('Collections finish tied')}
${POSITIVE_DIVISION}`;
const sectorTypes=[1,0,0,3,0,2,4,0,0,4,0,2,3,0,4,3];
const survey=`game_reset: ${palette} M I 3300 M K 16 K I K M I 3340 M K 16 K I K W 3300 1 W 3200 Z W 3201 18 W 3202 Z W 3203 1 W game_message @ss_prompt J ss_render
game_move: R E game_status N E Z O S P ifge A 16 O S P end W 3204 A R E 3200 ife A E W game_message @ss_here O S P end C S ss_distance ifn A 1 W game_message @ss_near O S P end W 3205 1 J ss_travel
game_key: E A 1 J ss_scan E A -26 J ss_scan E A -8 J ss_warp E A -35 J ss_warp M A Z O S P
ss_warp: R E game_status ifn E Z M A Z O S P end R A game_cursor ifge A 16 M A Z O S P end W 3204 A M I 3300 A I A R E I ife E Z W game_message @ss_unknown M A 1 O S P end R E 3200 ife A E W game_message @ss_here M A 1 O S P end C S ss_distance P A 2 W 3205 A C S ss_travel M A 1 O S P
ss_travel: R I 3204 A I @ss_types R E I ife E 4 R E 3205 A E 2 W 3205 E end R E 3205 R F 3201 ifg E F W game_message @ss_energy O S P end S F E W 3201 F R E 3204 W 3200 E M I 3300 A I E W I 1 M I @ss_types A I E R F I M I 3340 A I E R G I W game_message @ss_moved ife F 3 ife G Z W I 1 R E 3202 I E 1 W 3202 E W game_message @ss_rescue end end ife F 2 ife G Z W I 1 R E 3201 A E 8 ifg E 18 M E 18 end W 3201 E W game_message @ss_supply end end C S game_count_move J ss_check
ss_scan: R E game_status ifn E Z M A Z O S P end R A game_cursor ifge A 16 M A Z O S P end R E 3201 ifl E 2 W game_message @ss_energy M A 1 O S P end S E 2 W 3201 E M B 4 C S app_div W 3210 A W 3211 C M L Z
ss_scan_cell: M A L M B 4 C S app_div R E 3210 S A E F A A R E 3211 S C E F C A ifle A 1 ifle C 1 M I 3300 A I L W I 1 end end I L 1 ifl L 16 J ss_scan_cell end C S game_count_move W game_message @ss_scanned C S ss_check M A 1 O S P
ss_distance: R A 3200 M B 4 C S app_div W 3210 A W 3211 C R A 3204 C S app_div R E 3210 S A E F A A R E 3211 S C E F C A A A C O S P
ss_check: W 3203 Z M L Z
ss_known: M I 3300 A I L R E I ifn E Z R E 3203 I E 1 W 3203 E end I L 1 ifl L 16 J ss_known end R E 3200 ife E Z R E 3202 ife E 3 R E 3203 ifge E 12 W game_status 1 W game_message @ss_win J ss_render end end end R E 3201 ife E Z W game_status 2 W game_message @ss_empty end R E game_moves ifge E 24 W game_status 2 W game_message @ss_late end J ss_render
ss_render: M L Z
ss_sector: M I 3300 A I L R E I ife E Z M E 63 else M I @ss_types A I L R E I M J @ss_symbols A J E R E J M I 3340 A I L R F I ifn F Z M E 46 end end R F 3200 ife L F M E 64 end M I game_board A I L W I E I L 1 ifl L 16 J ss_sector end W 2916 69 R A 3201 M I 2917 C S ss_two W 2919 32 W 2920 75 R A 3203 M I 2921 C S ss_two W 2923 32 W 2924 82 R E 3202 A E 48 W 2925 E W 2926 47 W 2927 51 W 2928 84 M A 24 R E game_moves S A E M I 2929 C S ss_two W 2931 32 O S P
ss_two: U S I M B 10 C S app_div O S I A A 48 W I A A C 48 M I/1 C O S P
game_cell_style: M A B ife B 64 A A 1458 end ife B 42 A A 2187 end ife B 82 A A 729 end ife B 68 A A 2916 end O S P
ss_types: ${sectorTypes.join(' ')}
ss_symbols: 46 72 68 82 42
ss_prompt: ${text('Scan N; walk Enter; warp F')}
ss_here: ${text('Already in this sector')}
ss_near: ${text('Walk to an adjacent sector')}
ss_unknown: ${text('Scan before distant warp')}
ss_energy: ${text('Insufficient energy')}
ss_moved: ${text('Sector reached')}
ss_rescue: ${text('Rescue safely aboard')}
ss_supply: ${text('Supply station used: +8 E')}
ss_scanned: ${text('Nearby sectors scanned')}
ss_win: ${text('Three rescued; survey home!')}
ss_empty: ${text('No energy: mission lost')}
ss_late: ${text('Time up: mission lost')}
${POSITIVE_DIVISION}`;
// Pegging rules: ACC 2020 rulebook §7.2, https://www.cribbage.org/NewSite/rules/rulebook_2020.pdf
const cribbage=`game_reset: ${palette} M I 3200 M K 12 K I K M I 3300 M J @cp_your M K 6
cp_copy_y: R E J W I E I I 1 I J 1 I K -1 N K Z J cp_copy_y M I 3310 M J @cp_bot M K 6
cp_copy_b: R E J W I E I I 1 I J 1 I K -1 N K Z J cp_copy_b W game_message @cp_prompt J cp_render
game_move: R E game_status N E Z O S P ifge A 6 O S P end M I 3300 A I A R E I ife E Z W game_message @cp_used O S P end M F E ifg F 10 M F 10 end R G 3200 A G F ifg G 31 W game_message @cp_over O S P end W 3208 A W 3203 Z J cp_take
game_key: E A 1 J cp_go E A -26 J cp_go M A Z O S P
cp_go: R E game_status ifn E Z M A Z O S P end M A Z C S cp_find ifge A Z W game_message @cp_must M A 1 O S P end W 3203 1 C S cp_drive M A 1 O S P
cp_take: R E 3203 P E 10 A E 3300 R F 3208 A E F M I E R A I W I Z W 3209 A C S cp_points R I 3203 A I 3204 R E I A E A W I E R E 3201 I E 1 W 3201 E R E 3209 ifg E 10 M E 10 end R F 3200 A E F W 3200 E R E 3203 W 3202 E M F 1 S F E W 3203 F R E 3206 I E 1 W 3206 E C S game_count_move R E 3200 ife E 31 W 3200 Z W 3201 Z end J cp_drive
cp_drive: R E 3206 ife E 12 J cp_finish end M A Z C S cp_find W 3210 A M A 1 C S cp_find W 3211 A R E 3210 ifl E Z ifl A Z R I 3202 A I 3204 R E I I E 1 W I E W 3200 Z W 3201 Z R E 3202 M F 1 S F E W 3203 F J cp_drive end end R E 3203 ife E Z R E 3210 ifl E Z W game_message @cp_go_text else W game_message @cp_prompt end J cp_render end R E 3211 ifge E Z W 3208 E J cp_take end W 3203 Z J cp_drive
cp_finish: R E 3200 ifn E Z R I 3202 A I 3204 R E I I E 1 W I E end R E 3204 R F 3205 ifg E F W game_status 1 W game_message @cp_win else ifl E F W game_status 2 W game_message @cp_lose else W game_status 3 W game_message @cp_draw end end J cp_render
; Find best immediate pegging score; lower rank then earlier slot breaks ties.
cp_find: P A 10 A A 3300 W 3424 A W 3420 -1 W 3421 -1 W 3422 14 M L Z
cp_candidate: R I 3424 A I L R E I ife E Z J cp_candidate_next end W 3423 E M F E ifg F 10 M F 10 end R G 3200 A G F ifg G 31 J cp_candidate_next end M A E C S cp_points R E 3421 ifl A E J cp_candidate_next end ife A E R E 3423 R F 3422 ifge E F J cp_candidate_next end end W 3420 L W 3421 A R E 3423 W 3422 E
cp_candidate_next: I L 1 ifl L 6 J cp_candidate end R A 3420 O S P
; Score a candidate without consuming it. Rank suffixes, not sorted hand combinations.
cp_points: W 3400 A R E 3201 M I 3320 A I E W I A I E 1 W 3401 E W 3402 Z M E A ifg E 10 M E 10 end R F 3200 A E F ife E 15 W 3402 2 end ife E 31 W 3402 2 end R J 3201 W 3403 Z
cp_pair: ifl J Z J cp_pair_done end M I 3320 A I J R E I R F 3400 ifn E F J cp_pair_done end R E 3403 I E 1 W 3403 E I J -1 J cp_pair
cp_pair_done: R I 3403 A I @cp_pairs R E I R F 3402 A E F W 3402 E W 3407 E M K 3
cp_run_size: R E 3401 ifg K E R A 3402 O S P end S E K W 3404 E M J E M G 14 M H Z M D Z
cp_run_digit: M I 3320 A I J R B I ifl B G M G B end ifg B H M H B end R E 3404
cp_run_duplicate: ifge E J J cp_run_next end M I 3320 A I E R F I ife B F M D 1 end I E 1 J cp_run_duplicate
cp_run_next: I J 1 R E 3401 ifl J E J cp_run_digit end ife D Z M E H S E G M F K I F -1 ife E F R E 3407 A E K W 3402 E end end I K 1 J cp_run_size
cp_render: M I game_board M K 42
cp_blank: W I 32 I I 1 I K -1 N K Z J cp_blank M L Z
cp_hand: M I 3300 A I L R E I M J @cp_ranks A J E R E J M I game_board A I L W I E M I 3310 A I L R E I ife E Z M E 46 else M E 63 end M I game_board A I 6 A I L W I E I L 1 ifl L 6 J cp_hand end M L Z
cp_sequence: R E 3201 ifge L E J cp_stats end M I 3320 A I L R E I M J @cp_ranks A J E R E J M I game_board A I 12 A I L W I E I L 1 J cp_sequence
cp_stats: W 2924 78 R A 3200 M I 2925 C S cp_two W 2930 89 R A 3204 M I 2931 C S cp_two W 2933 66 R A 3205 M I 2934 C S cp_two W 2936 76 R A 3206 M I 2937 C S cp_two W 2939 47 W 2940 49 W 2941 50 O S P
cp_two: U S I M B 10 C S app_div O S I A A 48 W I A A C 48 M I/1 C O S P
game_cell_style: ifl A 6 M A B A A 1458 else M A B ife B 89 A A 1458 end ife B 66 A A 2187 end end O S P
cp_your: 5 6 7 8 9 10
cp_bot: 5 5 6 7 11 13
cp_pairs: 0 0 2 6 12
cp_ranks: 46 65 50 51 52 53 54 55 56 57 84 74 81 75
cp_prompt: ${text('Play your top-row card')}
cp_used: ${text('Card already played')}
cp_over: ${text('Card would exceed 31')}
cp_must: ${text('A card still fits; play it')}
cp_go_text: ${text('No card fits: N says GO')}
cp_win: ${text('Pegging complete: you win!')}
cp_lose: ${text('Rival wins pegging')}
cp_draw: ${text('Pegging complete: tied')}
${POSITIVE_DIVISION}`;
// Compact adaptation of Gigamic's published pawn/fence rules:
// https://export.gigamic.com/wp-content/uploads/2021/01/INS-RULES-QUORIDOR_10-2016.pdf
const quoridor=`game_reset: ${palette} M I 3300 M K 49 K I K W 3200 13 W 3201 1 W 3202 Z W 3203 3 W 3204 3 W 3205 Z W game_message @qr_a J qr_render
game_key: E A -8 J qr_rotate E A -35 J qr_rotate M A Z O S P
qr_rotate: R E game_status ifn E Z M A Z O S P end R E 3205 M F 1 S F E W 3205 F C S qr_render M A 1 O S P
game_move: R E game_status N E Z O S P ifge A 49 O S P end W 3208 A M B 7 C S app_div W 3209 A W 3210 C M B 2 C S app_div W 3213 A W 3214 C R A 3210 C S app_div W 3215 A R E 3214 ife E Z ifn C Z O S P end R E 3213 P E 4 A E A W 3216 E M I 3380 A I E R F I ife F Z W game_message @qr_illegal O S P end R I 3202 A I 3200 W I E J qr_turn end ife C Z O S P end J qr_wall
qr_wall: R I 3202 A I 3203 R E I ife E Z W game_message @qr_empty O S P end R I 3208 A I 3300 R E I ifn E Z W game_message @qr_overlap O S P end R E 3205 ife E Z M F 1 else M F 7 end R E 3208 M G E S E F A G F W 3211 E W 3212 G M I 3300 A I E R E I ifn E Z W game_message @qr_overlap O S P end M J 3300 A J G R E J ifn E Z W game_message @qr_overlap O S P end W I 1 W J 1 R I 3208 A I 3300 R E 3205 I E 1 W I E R A 3200 M B Z C S qr_path ife A Z J qr_rollback end R A 3201 M B 3 C S qr_path ife A Z J qr_rollback end R I 3202 A I 3203 R E I I E -1 W I E J qr_turn
qr_rollback: R I 3211 A I 3300 W I Z R I 3212 A I 3300 W I Z R I 3208 A I 3300 W I Z W game_message @qr_trapped O S P
qr_turn: C S game_count_move R E 3200 ifl E 4 W game_status 1 W game_message @qr_awin J qr_render end R E 3201 ifge E 12 W game_status 2 W game_message @qr_bwin J qr_render end R E game_moves ifge E 80 W game_status 3 W game_message @qr_draw J qr_render end R E 3202 M F 1 S F E W 3202 F ife F Z W game_message @qr_a else W game_message @qr_b end J qr_render
; Neighbor(A=node0..15,B=up/right/down/left0..3), A=-1 off board.
qr_neighbor: W 3600 A W 3601 B M B 4 C S app_div R E 3601 ife E Z ife A Z J qr_out end R A 3600 S A 4 O S P end ife E 1 ife C 3 J qr_out end R A 3600 I A 1 O S P end ife E 2 ife A 3 J qr_out end R A 3600 A A 4 O S P end ife C Z J qr_out end R A 3600 I A -1 O S P
qr_out: M A -1 O S P
; Edge(A=adjacent node,B=adjacent node)->A=1 if fence-free.
qr_edge: W 3620 B M B 4 C S app_div P A 14 P C 2 A A C W 3621 A R A 3620 C S app_div P A 14 P C 2 A A C R E 3621 A A E M B 2 C S app_div A A 3300 R E A ife E Z M A 1 else M A Z end O S P
qr_options: M I 3380 M K 16 K I K R I 3202 A I 3200 R E I W 3610 E R E 3202 M F 1 S F E M I 3200 A I F R E I W 3611 E W 3612 Z
qr_option_dir: R A 3610 R B 3612 C S qr_neighbor ifl A Z J qr_option_next end W 3613 A M B A R A 3610 C S qr_edge ife A Z J qr_option_next end R E 3613 R F 3611 ifn E F M I 3380 A I E W I 1 J qr_option_next end R A 3613 R B 3612 C S qr_neighbor ifl A Z J qr_diagonal end W 3614 A M B A R A 3613 C S qr_edge ife A Z J qr_diagonal end R I 3614 A I 3380 W I 1 J qr_option_next
qr_diagonal: R E 3612 I E 1 ifge E 4 S E 4 end W 3615 E W 3616 Z
qr_side: R A 3613 R B 3615 C S qr_neighbor ifl A Z J qr_side_next end W 3614 A M B A R A 3613 C S qr_edge ifn A Z R I 3614 A I 3380 W I 1 end
qr_side_next: R E 3616 I E 1 W 3616 E ifl E 2 R E 3615 A E 2 ifge E 4 S E 4 end W 3615 E J qr_side end
qr_option_next: R E 3612 I E 1 W 3612 E ifl E 4 J qr_option_dir end O S P
; BFS ignores pawn occupancy: every placed fence must preserve both goal routes.
qr_path: W 3630 A W 3631 B M I 3400 M K 16 K I K R E 3630 M I 3400 A I E W I 1 W 3420 E W 3632 Z W 3633 1
qr_bfs: R E 3632 R F 3633 ifge E F M A Z O S P end M I 3420 A I E R A I W 3634 A M B 4 C S app_div R E 3631 ife A E M A 1 O S P end W 3635 Z
qr_bfs_dir: R A 3634 R B 3635 C S qr_neighbor ifl A Z J qr_bfs_next end W 3636 A M I 3400 A I A R E I ifn E Z J qr_bfs_next end M B A R A 3634 C S qr_edge ife A Z J qr_bfs_next end R E 3636 M I 3400 A I E W I 1 R F 3633 M I 3420 A I F W I E I F 1 W 3633 F
qr_bfs_next: R E 3635 I E 1 W 3635 E ifl E 4 J qr_bfs_dir end R E 3632 I E 1 W 3632 E J qr_bfs
qr_render: C S qr_options M L Z
qr_cell: M A L M B 7 C S app_div W 3640 A W 3641 C M B 2 C S app_div W 3642 A W 3643 C R A 3641 C S app_div R E 3643 ife E Z ife C Z R E 3642 P E 4 A E A R F 3200 ife E F M E 65 else R F 3201 ife E F M E 66 else M I 3380 A I E R E I ife E Z M E 46 else M E 43 end end end else M I 3300 A I L R E I ife E Z M E 32 else M E 124 end end else ife C Z M I 3300 A I L R E I ife E Z M E 32 else M E 45 end else M I 3300 A I L R E I ife E Z M E 58 else ife E 1 M E 45 else M E 124 end end end end M I game_board A I L W I E I L 1 ifl L 49 J qr_cell end W 2949 65 R E 3203 A E 48 W 2950 E W 2951 32 W 2952 66 R E 3204 A E 48 W 2953 E W 2954 32 R E 3205 ife E Z W 2955 72 else W 2955 86 end O S P
game_cell_style: M A B ife B 65 A A 1458 end ife B 66 A A 2187 end ife B 43 A A 2916 end ife B 45 A A 729 end ife B 124 A A 729 end O S P
qr_a: ${text('A to top; F turns new wall')}
qr_b: ${text('B to bottom; F turns wall')}
qr_illegal: ${text('Choose a + pawn destination')}
qr_empty: ${text('This side has no fences')}
qr_overlap: ${text('Fences cannot overlap/cross')}
qr_trapped: ${text('Fence would block a route')}
qr_awin: ${text('A crossed the board: A wins')}
qr_bwin: ${text('B crossed the board: B wins')}
qr_draw: ${text('80-turn limit: drawn race')}
${POSITIVE_DIVISION}`;
export const STRATEGY_CABINET:BoardSoftware[]=[
{number:341,id:'sector-survey',kind:'board',site:'comet',title:'Sector Survey',columns:4,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Turns',controls:'Enter:walk N:scan F:warp',inputs:['Route and scans'],outputs:['Survey / rescue'],algorithm:survey,description:'Rescue all three R crews, reveal at least 12 of 16 sectors, then return to H home within 24 turns. You are @; ? is unknown, * a storm, D a supply station. Enter walks one orthogonal sector for 1 energy, plus 2 when entering a storm. N scans the cursor sector and its eight neighbors for 2 energy and 1 turn, anywhere on the map. F warps to a known sector for twice its Manhattan distance, plus storm cost, in 1 turn. Walking reveals only the entered sector. Each D supplies 8 energy once, capped at 18; each R is rescued on entry. Bottom rows show E energy, K known, R rescues and T turns left. Empty energy or deadline loses unless you complete the return on that last turn. R restarts; F1 exits.',examples:[{"moves":[1,2,3,7,11,15,14,13,12,8,4,5,1,0],"steps":0,"board":"@.....?..??...*.E15 K13 R3/3T10 ","status":1,"movesMade":14}]},
{number:342,id:'cribbage-pegging',kind:'board',site:'cardtable',title:'Cribbage Pegging',columns:6,rows:7,stepKey:'n',cellStyle:true,counterLabel:'Cards',controls:'Enter:play top card N:go',inputs:['Six-card hands'],outputs:['Count and pegs'],algorithm:cribbage,description:'A focused six-card pegging variant; standard cribbage pegs four cards after discarding. Here each side has six authored cards, with no crib or hand scoring. Play a top-row card; the native rival chooses the highest immediate score, then lower rank. A=1, T/J/Q/K count 10. Running count N cannot exceed 31. Consecutive equal ranks score 2/6/12 for 2/3/4 cards; the longest distinct consecutive-rank suffix scores its length, in any order. Counts 15 and 31 score 2. N says go only when no card fits. When neither can play, last player scores 1 and the other leads a fresh count; 31 resets without an extra last point. Final non-31 card scores 1. Y/B show scores; dots are spent cards, question marks hidden rival cards. Higher score after 12 cards wins. R replays; F1 exits.',examples:[{"moves":[0,1,3,4,2,5],"steps":0,"board":"............JTK         N30   Y07B06L12/12","status":1,"movesMade":12}]},
{number:343,id:'pocket-quoridor',kind:'board',site:'maze',title:'Pocket Quoridor',columns:7,rows:8,cellStyle:true,stepKey:'n',counterLabel:'Turns',controls:'Enter:move/wall F:turn wall',inputs:['Local players'],outputs:['Pawn race','Open routes'],algorithm:quoridor,description:'A compact 4x4 adaptation for two local players: A races to the top, B to the bottom. Enter a + destination to move; an adjacent opponent is jumped straight if possible, otherwise sideways around it when the rear edge or fence blocks the jump. Each side has three fences. Enter a : intersection to place a two-edge fence; F switches H horizontal/V vertical, shown with remaining fences below. Overlap, crossing and any fence eliminating either goal route are rejected. Fences ignore pawn occupancy when checking routes. A starts; an 80-turn limit draws. R restarts; F1 exits.',examples:[{"moves":[12,16,30,14,16,28,2],"steps":0,"board":"+ A + . : :---. + . . : : : B . . . : : : . . . .A2 B3 H","status":1,"movesMade":7}]},
{number:344,id:'auction-rooms',kind:'board',site:'market',title:'Auction Rooms',columns:6,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Lots',controls:'Enter:choose bid N:seal',inputs:['Budgeted bids'],outputs:['Final wealth'],algorithm:auction,description:'Bid against a native rival for six lots, shown left to right with category A/B/C and value. Both start with 18 tokens. Select 0..9 in the bottom bid bank, then N seals the bid; a bid above your purse is rejected. Higher offer wins and pays its own offer; tied offers favor you on lots 1/3/5, rival on 2/4/6. Zero bids are allowed. Rival offers value minus 1, plus 3 if it owns that category, capped by remaining purse. Y/B under each lot records its owner. Next rows show purses and wealth: cash plus lot values, plus 6 per category pair and 4 for owning all three categories. Highest final wealth wins; saved cash matters. R replays; F1 exits.',examples:[{"moves":[33],"steps":6,"board":"ABCABC564758BBYBYYY09B00Y32B240123456789  Bid 03","status":1,"movesMade":6}]},
{number:345,id:'hitori',kind:'board',site:'gallery',title:'Hitori',columns:5,rows:5,stepKey:'n',cellStyle:true,counterLabel:'Marks',controls:'Enter:shade/unshade N:check',inputs:['Shaded cells'],outputs:['Three-rule check'],algorithm:hitori,description:'Shade digits until no unshaded digit repeats in any row or column. Shaded # cells must not touch orthogonally, and all unshaded cells must form one orthogonally connected region. Enter toggles shading; N checks the three actual rules and explains a conflict. Any valid solution is accepted, not only an authored bitmap. R restores all digits; F1 exits.',examples:[{"moves":[1,8,10,17,24],"steps":1,"board":"1#345234#1#451245#235123#","status":1,"movesMade":5}]},
];
