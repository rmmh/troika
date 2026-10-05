import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const brick=`game_reset: W 3200 3 W 3201 6 W 3202 1 W 3203 -1 W 3204 3 W 3205 3 W 3206 12 M I 3300 M K 16
bb_init: M A K M B 8 C S app_div M E 1 ife C Z M E Z end ife C 1 M E Z end W I E I I 1 I K -1 N K Z J bb_init W 3300 Z W 3307 Z W 3308 Z W 3315 Z C S bb_message J bb_render
game_move: R E game_status N E Z O S P ifl A 56 W game_message @bb_bottom O S P end S A 56 ifl A 1 M A 1 end ifg A 6 M A 6 end W 3204 A C S bb_message J bb_render
game_key: E A 1 J bb_tick_key E A -26 J bb_tick_key E A -13 J bb_left E A -40 J bb_left E A -10 J bb_right E A -37 J bb_right M A Z O S P
bb_left: R E 3204 I E -1 J bb_paddle
bb_right: R E 3204 I E 1
bb_paddle: R F game_status ifn F Z M A Z O S P end ifl E 1 M E 1 end ifg E 6 M E 6 end W 3204 E C S bb_message C S bb_render M A 1 O S P
bb_tick_key: R E game_status ifn E Z M A Z O S P end C S game_count_move R G 3200 R E 3202 A G E ifl G Z M G 1 W 3202 1 end ifg G 7 M G 6 W 3202 -1 end R H 3201 R E 3203 A H E ifl H Z M H 1 W 3203 1 end ife H 7 R E 3204 M F G S F E F F A ifg F 1 J bb_miss end M H 6 W 3203 -1 M F G S F E W 3202 F end W 3200 G W 3201 H ifl H 2 M I H P I 8 A I G A I 3300 R E I ifn E Z W I Z R E 3206 I E -1 W 3206 E R E 3203 P E -1 W 3203 E R E 3206 ife E Z W game_status 1 W game_message @bb_win J bb_done end end end C S bb_message J bb_done
bb_miss: R E 3205 I E -1 W 3205 E ife E Z W game_status 2 W game_message @bb_lose else W 3200 3 W 3201 6 W 3202 1 W 3203 -1 C S bb_message end
bb_done: C S bb_render M A 1 O S P
bb_message: M I 3500 M J @bb_template M K 17
bb_msg_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bb_msg_copy R E 3205 A E 48 W 3505 E R A 3206 M B 10 C S app_div A A 48 W 3514 A A C 48 W 3515 C W game_message 3500 O S P
bb_render: M I game_board M K 64
bb_clear: W I 46 I I 1 I K -1 N K Z J bb_clear M L Z
bb_bricks: M I 3300 A I L R E I ifn E Z M I game_board A I L W I 35 end I L 1 ifl L 16 J bb_bricks end R E 3204 M I 2955 A I E W I 61 M I/1 61 M I/2 61 R E 3201 P E 8 R F 3200 A E F M I game_board A I E W I 111 O S P
bb_template: ${txt('Life 3 Bricks 12')}
bb_bottom: ${txt('Bottom row sets the paddle')}
bb_win: ${txt('Every brick cleared!')}
bb_lose: ${txt('No lives left. R restarts')}
${POSITIVE_DIVISION}`;
const mirrorCells=[0,3,18,21,11,35];
const laser=`game_reset: M I 3600 M J @lm_initial M K 6
lm_init: R E J W I E I I 1 I J 1 I K -1 N K Z J lm_init W game_message @lm_prompt J lm_clear_path
lm_clear_path: M I 3300 M K 36
lm_clear: W I Z I I 1 I K -1 N K Z J lm_clear W 3202 Z W 3203 Z J lm_render
game_move: R E game_status N E Z O S P M L Z
lm_find: M I @lm_cells A I L R E I ife E A M I 3600 A I L R E I M F 139 S F E W I F C S game_count_move W game_message @lm_prompt J lm_clear_path end I L 1 ifl L 6 J lm_find end W game_message @lm_only O S P
game_key: E A 1 J lm_trace E A -26 J lm_trace M A Z O S P
lm_trace: R E game_status ifn E Z M A Z O S P end C S lm_clear_path M I 3400 M K 144
lm_seen_clear: W I Z I I 1 I K -1 N K Z J lm_seen_clear W 3200 19 W 3201 1
lm_step: R G 3200 R H 3201 M I G P I 4 A I H A I 3400 R E I ifn E Z W game_message @lm_loop J lm_done end W I 1 M I 3300 A I G W I 1 ife G 2 W 3202 1 end ife G 12 W 3203 1 end M L Z
lm_mirror: M I @lm_cells A I L R E I ife E G M I 3600 A I L R E I ife E 92 M E 3 S E H W 3201 E else M A H M B 2 C S app_div ife C Z I H 1 else I H -1 end W 3201 H end J lm_advance end I L 1 ifl L 6 J lm_mirror end
lm_advance: R A 3200 M B 6 C S app_div M G A M H C R E 3201 ife E Z I G -1 end ife E 1 I H 1 end ife E 2 I G 1 end ife E 3 I H -1 end ifl G Z J lm_exit end ifge G 6 J lm_exit end ifl H Z J lm_exit end ifge H 6 J lm_exit end P G 6 A G H W 3200 G J lm_step
lm_exit: R E 3202 R F 3203 A E F ife E 2 W game_status 1 W game_message @lm_win else W game_message @lm_missed end
lm_done: C S lm_render M A 1 O S P
lm_render: M L Z
lm_ground: M I 3300 A I L R E I ife E Z M E 46 else M E 58 end M I game_board A I L W I E I L 1 ifl L 36 J lm_ground end W 2919 83 W 2902 84 W 2912 84 R E 3202 ifn E Z W 2902 42 end R E 3203 ifn E Z W 2912 42 end M L Z
lm_draw: M I 3600 A I L R E I M J @lm_cells A J L R F J M I game_board A I F W I E I L 1 ifl L 6 J lm_draw end O S P
lm_cells: ${mirrorCells.join(' ')}
lm_initial: 92 47 92 92 47 92
lm_prompt: ${txt('Turn mirrors; N traces beam')}
lm_only: ${txt('Only / and backslash turn')}
lm_loop: ${txt('Beam loop: change a mirror')}
lm_missed: ${txt('Exited, but missed a target')}
lm_win: ${txt('Both targets lit; safe exit')}
${POSITIVE_DIVISION}`;
const rail=`game_reset: W 3200 Z W 3201 Z W 3202 Z W 3203 Z W 3204 -1 W game_message @rs_prompt J rs_render
game_move: R E game_status N E Z O S P M B 8 C S app_div M B 2 C S app_div ifn C Z O S P end M G A W 3205 G R H 3204 ifl H Z ife G 3 W game_message @rs_readonly O S P end M I 3200 A I G R E I ife G Z ifge E 5 W game_message @rs_empty O S P end else ife E Z W game_message @rs_empty O S P end end W 3204 G W game_message @rs_dest J rs_render end ife G H W 3204 -1 W game_message @rs_prompt J rs_render end ife G Z W game_message @rs_oneway O S P end ifl G 3 M I 3200 A I G R E I ifge E 2 W game_message @rs_full O S P end end
 ife H Z R E 3200 M I @rs_arrival A I E R L I I E 1 W 3200 E else M I 3200 A I H R E I I E -1 W I E M J 3290 M F H P F 10 A J F A J E R L J end R G 3205 ife G 3 R E 3203 M I 3320 A I E W I L I E 1 W 3203 E ifn L E W game_status 2 W game_message @rs_wrong else ife E 5 W game_status 1 W game_message @rs_win else W game_message @rs_prompt end end else M I 3200 A I G R E I M J 3290 M F G P F 10 A J F A J E W J L I E 1 W I E W game_message @rs_prompt end W 3204 -1 C S game_count_move J rs_render
rs_render: M I game_board M J @rs_board M K 56
rs_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J rs_copy R L 3200 M K Z
rs_in: ifge L 5 J rs_sidings end M I @rs_arrival A I L R E I A E 64 M I 2903 A I K W I E I K 1 I L 1 J rs_in
rs_sidings: M G 1
rs_siding: M I 3200 A I G R K I M L Z
rs_wagon: ifge L K J rs_next_siding end M I 3290 M E G P E 10 A I E A I L R E I A E 64 M J G P J 16 A J 2903 A J L W J E I L 1 J rs_wagon
rs_next_siding: I G 1 ifl G 3 J rs_siding end M L Z R K 3203
rs_out: ifge L K J rs_selection end M I 3320 A I L R E I A E 64 M I 2951 A I L W I E I L 1 J rs_out
rs_selection: R E 3204 ifge E Z P E 16 A E game_board W E 62 end O S P
rs_arrival: 4 2 5 1 3
rs_board: ${txt('IN .....'+'        '+'S1 ..   '+'        '+'S2 ..   '+'        '+'OUT.....')}
rs_prompt: ${txt('Depart A B C D E in order')}
rs_dest: ${txt('Choose siding or departure')}
rs_empty: ${txt('That track has no wagon')}
rs_full: ${txt('Siding holds only two')}
rs_oneway: ${txt('Arrival is one-way only')}
rs_readonly: ${txt('Departure cannot return')}
rs_wrong: ${txt('Wrong train order. R resets')}
rs_win: ${txt('A B C D E train assembled!')}
${POSITIVE_DIVISION}`;
const sumCells=[0,2,4,7,9,11,14,16,18];
const sums=`game_reset: M I 3300 M J @fif_initial M K 9
fif_init: R E J W I E I I 1 I J 1 I K -1 N K Z J fif_init W 3200 Z W game_message @fif_prompt J fif_render
game_move: R E game_status N E Z O S P ifge A 28 ifg A 36 O S P end S A 27 W 3201 A M L Z
fif_bank_scan: M I 3300 A I L R E I R F 3201 ife E F W game_message @fif_used O S P end I L 1 ifl L 9 J fif_bank_scan end R E 3201 W 3200 E W game_message @fif_place J fif_render end M L Z
fif_find: M I @fif_cells A I L R E I ife E A J fif_cell end I L 1 ifl L 9 J fif_find end W game_message @fif_only O S P
fif_cell: ife L Z J fif_fixed end ife L 4 J fif_fixed end ife L 8 J fif_fixed end M I 3300 A I L R E I R F 3200 ife F Z ife E Z W game_message @fif_select O S P end W I Z else W I F W 3200 Z end C S game_count_move W game_message @fif_prompt J fif_render
fif_fixed: W game_message @fif_clue O S P
game_key: E A 1 J fif_check E A -26 J fif_check M A Z O S P
fif_check: R E game_status ifn E Z M A Z O S P end M I 3300 M K 9
fif_blank: R E I ife E Z W game_message @fif_incomplete M A 1 O S P end I I 1 I K -1 N K Z J fif_blank M G Z
fif_row: M I 3300 M E G P E 3 A I E R E I M F I/1 A E F M F I/2 A E F ifn E 15 W game_message @fif_rows M A 1 O S P end I G 1 ifl G 3 J fif_row end M G Z
fif_col: M I 3300 A I G R E I M F I/3 A E F M F I/6 A E F ifn E 15 W game_message @fif_cols M A 1 O S P end I G 1 ifl G 3 J fif_col end R E 3300 R F 3304 A E F R F 3308 A E F ifn E 15 J fif_diag_bad end R E 3302 R F 3304 A E F R F 3306 A E F ifn E 15 J fif_diag_bad end W game_status 1 W game_message @fif_win M A 1 O S P
fif_diag_bad: W game_message @fif_diags M A 1 O S P
fif_render: M I game_board M J @fif_board M K 49
fif_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J fif_copy M L Z
fif_digit: M I 3300 A I L R E I ifn E Z M J 2927 A J E W J 46 M F E A F 48 else M F 46 end M J @fif_cells A J L R E J M I game_board A I E W I F I L 1 ifl L 9 J fif_digit end R E 3200 ifn E Z M I 2927 A I E W I 64 end O S P
fif_cells: ${sumCells.join(' ')}
fif_initial: 8 0 0 0 5 0 0 0 2
fif_board: ${txt('8 . .15'+'. 5 .15'+'. . 215'+'151515 '+'1234567'+'89     '+'N CHECK')}
fif_prompt: ${txt('Pick bank digit, then cell')}
fif_place: ${txt('Choose a grid cell')}
fif_used: ${txt('That digit is already used')}
fif_only: ${txt('Grid or bottom digit bank')}
fif_select: ${txt('Select an unused digit')}
fif_clue: ${txt('8, 5 and 2 are fixed clues')}
fif_incomplete: ${txt('Fill all nine grid cells')}
fif_rows: ${txt('A row does not total 15')}
fif_cols: ${txt('A column does not total 15')}
fif_diags: ${txt('A diagonal is not 15')}
fif_win: ${txt('Every line totals fifteen!')}`;
const patrolTiles=Array.from({length:25},(_,i)=>[6,11,18].includes(i)?1:[2,9,13].includes(i)?2:[0,23].includes(i)?3:i===20?4:0);
const patrol=`game_reset: M I 3300 M J @sp_initial M K 25
sp_init: R E J W I E I I 1 I J 1 I K -1 N K Z J sp_init W 3200 20 W 3201 15 W 3202 3 W 3203 3 W game_message @sp_goal J sp_render
game_move: R E game_status N E Z O S P ifge A 25 O S P end W 3204 A M B 5 C S app_div M G A M H C R A 3200 C S app_div S G A F G A S H C F H A A G H ifn G 1 W game_message @sp_adjacent O S P end R E 3204 M I 3300 A I E R F I ife F 1 W game_message @sp_wall O S P end ife F 2 W game_message @sp_enemy O S P end W 3200 E R E 3201 I E -1 W 3201 E ife F 3 W I Z R E 3201 I E 4 ifg E 15 M E 15 end W 3201 E R E 3202 I E 1 ifg E 3 M E 3 end W 3202 E end J sp_turn
game_key: E A 1 J sp_scan E A -26 J sp_scan E A -8 J sp_fire E A -35 J sp_fire M A Z O S P
sp_scan: R E game_status ifn E Z M A Z O S P end W game_message @sp_goal M A 1 O S P
sp_fire: R E game_status ifn E Z M A Z O S P end R E 3202 ife E Z W game_message @sp_ammo M A 1 O S P end R G game_cursor ifge G 25 W game_message @sp_target M A 1 O S P end W 3204 G M A G M B 5 C S app_div M G A M H C R A 3200 C S app_div S G A S H C ife G Z ife H Z J sp_bad_line end M L 1 ifl H Z M L -1 end F H A ifg H 3 J sp_bad_line end M K H else ifn H Z J sp_bad_line end M L 5 ifl G Z M L -5 end F G A ifg G 3 J sp_bad_line end M K G end R J 3200 I K -1
sp_ray: ife K Z J sp_shot end A J L M I 3300 A I J R E I ife E 1 J sp_bad_line end ife E 2 J sp_bad_line end I K -1 J sp_ray
sp_shot: R E 3202 I E -1 W 3202 E R E 3201 I E -1 W 3201 E R E 3204 M I 3300 A I E R E I ife E 2 W I Z R E 3203 I E -1 W 3203 E end C S sp_turn M A 1 O S P
sp_bad_line: W game_message @sp_line M A 1 O S P
sp_turn: C S game_count_move R E 3200 ife E 20 W 3201 15 W 3202 3 W game_message @sp_dock R E 3203 ife E Z W game_status 1 W game_message @sp_win J sp_render end J sp_deadline end M L Z W 3205 Z
sp_enemy_fire: M I 3300 A I L R E I ifn E 2 J sp_enemy_next end M A L M B 5 C S app_div M G A M H C R A 3200 C S app_div S G A F G A S H C F H A A G H ifle G 2 R E 3205 I E 1 W 3205 E end
sp_enemy_next: I L 1 ifl L 25 J sp_enemy_fire end R E 3201 R F 3205 S E F W 3201 E ifle E Z W game_status 2 W game_message @sp_lose J sp_render end W game_message @sp_goal
sp_deadline: R E game_moves ifge E 30 W game_status 2 W game_message @sp_late end
sp_render: M L Z
sp_cell: M I 3300 A I L R E I M J @sp_symbols A J E R E J M I game_board A I L W I E I L 1 ifl L 25 J sp_cell end R E 3200 M I game_board A I E W I 64 W 2925 69 R A 3201 ifl A Z M A Z end M B 10 C S app_div A A 48 W 2926 A A C 48 W 2927 C W 2928 65 R E 3202 A E 48 W 2929 E W 2930 84 M A 30 R E game_moves S A E ifl A Z M A Z end M B 10 C S app_div A A 48 W 2931 A A C 48 W 2932 C W 2933 75 R E 3203 A E 48 W 2934 E O S P
sp_initial: ${patrolTiles.join(' ')}
sp_symbols: 46 35 88 67 68
sp_goal: ${txt('Clear raiders, return to D')}
sp_adjacent: ${txt('Move one orthogonal square')}
sp_wall: ${txt('Asteroid blocks that square')}
sp_enemy: ${txt('Raider there: aim and F')}
sp_ammo: ${txt('No ammo: cache or dock')}
sp_target: ${txt('Aim at a map square')}
sp_line: ${txt('Need clear line, range 3')}
sp_dock: ${txt('Docked: energy/ammo full')}
sp_win: ${txt('Raiders cleared; home safe!')}
sp_lose: ${txt('Energy gone; mission lost')}
sp_late: ${txt('Time limit: mission lost')}
${POSITIVE_DIVISION}`;
const domino=`game_reset: M I 3300 M J @dc_player M K 5
dc_init_player: R E J W I E I I 1 I J 1 I K -1 N K Z J dc_init_player M I 3310 M J @dc_foe M K 5
dc_init_foe: R E J W I E I I 1 I J 1 I K -1 N K Z J dc_init_foe W 3200 1 W 3201 1 W 3202 -1 W 3203 Z W 3204 1 W 3205 Z W 3206 4 W 3207 4 W game_message @dc_prompt J dc_render
game_move: R E game_status N E Z O S P M B 6 C S app_div ifl A 5 M I 3300 A I A R E I ifl E Z W game_message @dc_empty O S P end W 3202 A W 3203 Z W game_message @dc_pick_end J dc_render end ifn A 5 O S P end R E 3202 ifl E Z W game_message @dc_select O S P end W 3211 E M I 3300 A I E R A I C S dc_tile R E 3203 ifn E Z M E G M G H M H E end ifl C 3 R E 3200 ifn H E W game_message @dc_mismatch O S P end W 3200 G else R E 3201 ifn G E W game_message @dc_mismatch O S P end W 3201 H end R E 3211 M I 3300 A I E W I -1 W 3202 -1 W 3203 Z W 3205 Z R E 3206 I E -1 W 3206 E C S game_count_move R E 3206 ife E Z W game_status 1 W game_message @dc_win J dc_render end C S dc_opponent J dc_render
game_key: E A -8 J dc_flip E A -35 J dc_flip E A 1 J dc_n E A -26 J dc_n M A Z O S P
dc_flip: R E game_status ifn E Z M A Z O S P end R E 3202 ifl E Z W game_message @dc_select M A 1 O S P end R E 3203 M F 1 S F E W 3203 F C S dc_render M A 1 O S P
dc_n: R E game_status ifn E Z M A Z O S P end C S dc_player_n C S dc_render M A 1 O S P
dc_player_n: M L Z
dc_available: M I 3300 A I L R A I ifge A Z C S dc_tile C S dc_match ifn A Z W game_message @dc_can_play O S P end end I L 1 ifl L 5 J dc_available end R E 3204 ifn E Z W 3204 Z W 3304 8 R E 3206 I E 1 W 3206 E W 3202 4 W 3203 Z W game_message @dc_drew O S P end R E 3205 I E 1 W 3205 E ifge E 2 J dc_blocked end J dc_opponent
dc_opponent: W 3214 -1 M L Z
dc_opp_scan: M I 3310 A I L R A I ifl A Z J dc_opp_next end W 3210 A C S dc_tile C S dc_match ife A Z J dc_opp_next end M E G A E H R F 3214 ifg E F W 3214 E W 3216 L W 3217 A W 3218 B end
dc_opp_next: I L 1 ifl L 5 J dc_opp_scan end R E 3214 ifge E Z J dc_opp_play end R E 3204 ifn E Z W 3204 Z W 3314 8 R E 3207 I E 1 W 3207 E J dc_opponent end R E 3205 I E 1 W 3205 E ifge E 2 J dc_blocked end W game_message @dc_opp_pass O S P
dc_opp_play: R E 3216 M I 3310 A I E W I -1 R E 3217 M I 3199 A I E R E 3218 W I E W 3205 Z R E 3207 I E -1 W 3207 E C S game_count_move R E 3207 ife E Z W game_status 2 W game_message @dc_lose else W game_message @dc_prompt end O S P
dc_blocked: W 3219 Z W 3220 Z M L Z
dc_pips: M I 3300 A I L R A I ifge A Z C S dc_tile A G H R E 3219 A E G W 3219 E end M I 3310 A I L R A I ifge A Z C S dc_tile A G H R E 3220 A E G W 3220 E end I L 1 ifl L 5 J dc_pips end R E 3219 R F 3220 ifl E F W game_status 1 W game_message @dc_block_win else ifg E F W game_status 2 W game_message @dc_block_lose else W game_status 3 W game_message @dc_tie end end O S P
dc_tile: M I @dc_values P A 2 A I A R G I M H I/1 O S P
dc_match: R E 3200 R F 3201 ife H E M A 1 M B G O S P end ife G E M A 1 M B H O S P end ife G F M A 2 M B H O S P end ife H F M A 2 M B G O S P end M A Z O S P
dc_render: M I game_board M K 48
dc_clear: W I 32 I I 1 I K -1 N K Z J dc_clear M L Z
dc_hand: M I game_board M E L P E 6 A I E M E L A E 49 W I E M I/1 58 M I/2 46 M I/3 124 M I/4 46 M J 3300 A J L R A J ifge A Z C S dc_tile R E 3202 ife E L R E 3203 ifn E Z M E G M G H M H E end end M I game_board M E L P E 6 A I E A G 48 A H 48 M I/2 G M I/4 H R E 3202 ife E L M I/1 42 end end I L 1 ifl L 5 J dc_hand end W 2930 76 R E 3200 A E 48 W 2931 E R E 3201 A E 48 W 2933 E W 2934 82 M I 2936 M J @dc_foe_label M K 6
dc_label_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J dc_label_copy R E 3207 A E 48 W 2940 E M I 2942 M J @dc_draw_label R E 3204 ife E Z M J @dc_pass_label end M K 6
dc_action_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J dc_action_copy O S P
dc_player: 0 2 5 9 -1
dc_foe: 1 3 6 7 -1
dc_values: 0 0 0 1 0 2 0 3 1 1 1 2 1 3 2 2 2 3 3 3
dc_foe_label: ${txt('FOE04 ')}
dc_draw_label: ${txt('N:DRAW')}
dc_pass_label: ${txt('N:PASS')}
dc_prompt: ${txt('Choose tile, then chain end')}
dc_pick_end: ${txt('Enter L/R end; F flips tile')}
dc_empty: ${txt('That hand slot is empty')}
dc_select: ${txt('Select a hand tile first')}
dc_mismatch: ${txt('No match; F flips the tile')}
dc_can_play: ${txt('Playable tile: join an end')}
dc_drew: ${txt('Drew 2|3; play or N:pass')}
dc_opp_pass: ${txt('Opponent passes; your turn')}
dc_win: ${txt('You cleared your hand!')}
dc_lose: ${txt('Opponent cleared its hand')}
dc_block_win: ${txt('Blocked: you win on pips')}
dc_block_lose: ${txt('Blocked: foe wins on pips')}
dc_tie: ${txt('Blocked: equal pips, draw')}
${POSITIVE_DIVISION}`;
export const TERMINAL_ARCADE:BoardSoftware[]=[
{number:257,kind:'board',id:'brick-breaker',site:'basalt',title:'Brick Breaker',columns:8,rows:8,stepKey:'n',counterLabel:'Ticks',controls:'Enter:paddle N:tick A/D:aim',inputs:['Paddle column','Next tick'],outputs:['Ball/bricks','Lives'],description:'Clear twelve bricks # with ball o and a three-cell paddle =. N advances one tick. Enter on the bottom row sets the paddle center, clamped to columns 1..6; A/D shifts it. Wall and brick impacts bounce. Hitting the paddle center sends the ball straight up; its left or right end sends it diagonally that way. Missing the paddle costs one of three lives and serves a fresh ball. Paddle choices cost no time. R restores the bricks; F1 exits.',algorithm:brick,examples:[{"moves":[],"steps":1,"board":".######..######.............................o.............===...","status":0,"movesMade":1}]},
{number:258,kind:'board',id:'star-patrol',site:'comet',title:'Star Patrol',columns:5,rows:7,stepKey:'n',counterLabel:'Turns',controls:'Enter:move F:fire N:scan',inputs:['Adjacent square','Aimed shot'],outputs:['Energy/ammo','Mission clock'],description:'Clear three raiders X and return to dock D within 30 turns. @ is your ship. Enter moves one orthogonal step; # asteroids block travel. Aim the cursor and F fires along a clear row or column within three squares. Each move or shot costs one energy; each remaining raider within two Manhattan steps then fires for one energy. Shots also use ammo, including misses. C caches add four energy and one ammo, capped at 15/3. Dock restores energy/ammo and shields enemy fire. E/A show supplies; T is time left, K raiders left. N recalls the mission without a turn. R resets; F1 exits.',algorithm:patrol,examples:[{"moves":[15],"steps":0,"board":"C.X...#..X.#.X.@..#.D..C.E14A3T29K3","status":0,"movesMade":1}]},
{number:259,kind:'board',id:'laser-mirrors',site:'lenses',title:'Laser Mirrors',columns:6,rows:6,stepKey:'n',counterLabel:'Edits',controls:'Enter:flip N:trace R:reset',inputs:['Mirror angle','Trace beam'],outputs:['Beam path','Targets/loop'],description:'Light both T targets and let the beam leave the board. S starts the beam pointing right. Enter flips a / or backslash mirror; other cells are fixed. N traces the native beam: colons show its path, stars mark lit targets. A closed loop is detected by repeated position and direction, even if both targets were lit. A successful beam must hit both targets and exit. Some mirrors are distractions. Editing clears the old trace. R restores the puzzle; F1 exits.',algorithm:laser,examples:[{"moves":[0,3,18,21],"steps":1,"board":"/:*\\..:..:./*..:../S:/.............\\","status":1,"movesMade":4}]},
{number:260,kind:'board',id:'rail-shunting',site:'station',title:'Siding Shunter',columns:8,rows:7,counterLabel:'Moves',controls:'Enter:from/to R:reset',inputs:['Source track','Destination'],outputs:['Wagon order','Siding capacity'],description:'Assemble departure A B C D E from arrival D B E A C. Select a track row, then a destination row. Arrival releases its leftmost wagon and never accepts returns. Each siding holds two wagons; its rightmost wagon is nearest the coupler and leaves first. Sidings may exchange wagons. Departure is permanent: sending the wrong next letter loses. Selecting a source again cancels. Odd blank rows do nothing. R restores the yard; F1 exits.',algorithm:rail,examples:[{"moves":[0,16,0,32,0,16,0,48,32,48,0,48,16,32,16,48,32,48],"steps":0,"board":"IN .....        S1 ..           S2 ..           OUTABCDE","status":1,"movesMade":9}]},
{number:261,kind:'board',id:'fifteen-sum',site:'ternary',title:'Fifteen Sum',columns:7,rows:7,stepKey:'n',counterLabel:'Edits',controls:'Enter:digit/cell N:check',inputs:['Unused digit','Grid cell'],outputs:['Sum targets','Constraint check'],description:'Place digits 1..9 once each so every row, column and both diagonals totals 15. The 8,5,2 clues are fixed. The top three rows are the grid, with target sums of 15 at right and below. The bottom digit bank shows unused tiles. Enter selects a bank digit (@), then Enter on an editable grid cell places it; an old tile returns to the bank. With no tile selected, Enter on a filled editable cell removes it. N checks blanks, row sums, columns and diagonals. R resets; F1 exits.',algorithm:sums,examples:[{"moves":[28,2,33,4,30,7,34,11,31,14,36,16],"steps":1,"board":"8 1 6153 5 7154 9 215151515 .........     N CHECK","status":1,"movesMade":6}]},
{number:262,kind:'board',id:'domino-chain',site:'cardtable',title:'Domino Chain',columns:6,rows:8,stepKey:'n',counterLabel:'Plays',controls:'Enter:pick F:flip N:draw',inputs:['Tile/orientation','Chain end'],outputs:['Open ends','Hand/opponent'],description:'Play a double-three domino hand against a native opponent. The chain starts 1|1. Select a hand row, F flips the selected tile, then Enter on the L or R half of the end row. Left joins your tile right pip to the left chain end; right joins its left pip. Empty your hand to win. The opponent chooses its highest-pip legal tile, preferring the left end and earliest slot. N draws the one spare 2|3 tile only when your hand cannot play; a draw keeps your turn. With no spare it passes. Two consecutive passes compare remaining pip totals; fewer wins. FOE shows the opposing hand count. R replays the deal; F1 exits.',algorithm:domino,examples:[{"moves":[12,33],"steps":0,"board":"1:0|0 2:0|2 3:.|. 4:3|3 5:.|. L3 2R FOE03 N:DRAW","status":0,"movesMade":2}]},
];
