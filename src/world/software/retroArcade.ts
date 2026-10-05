import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const robots=`game_reset: W 3200 27 W 3201 1 M I 3300 M K 64
rb_clear: W I Z I I 1 I K -1 N K Z J rb_clear M I 3400 M J @rb_initial M K 6
rb_init: R E J W I E I I 1 I J 1 I K -1 N K Z J rb_init W game_message @rb_prompt J rb_render
game_key: E A 1 J rb_wait E A -26 J rb_wait E A 7 J rb_teleport E A -20 J rb_teleport M A Z O S P
rb_wait: R E game_status ifn E Z M A Z O S P end C S rb_chase M A 1 O S P
rb_teleport: R E game_status ifn E Z M A Z O S P end R E 3201 ife E Z W game_message @rb_empty M A 1 O S P end W 3202 Z
rb_safe_square: R E 3202 M I 3300 A I E R E I ifn E Z J rb_safe_next end R A 3202 M B 8 C S app_div W 3203 A W 3204 C M L Z
rb_safe_robot: M I 3400 A I L R A I ifl A Z J rb_safe_robot_next end M B 8 C S app_div R E 3203 S A E F A A R E 3204 S C E F C A ifle A 1 ifle C 1 J rb_safe_next end end
rb_safe_robot_next: I L 1 ifl L 6 J rb_safe_robot end R E 3202 W 3200 E W 3201 Z C S rb_chase M A 1 O S P
rb_safe_next: R E 3202 I E 1 W 3202 E ifl E 64 J rb_safe_square end W game_message @rb_no_safe M A 1 O S P
game_move: R E game_status N E Z O S P W 3202 A M B 8 C S app_div M G A M H C R A 3200 C S app_div S G A F G A S H C F H A ifg G 1 W game_message @rb_adjacent O S P end ifg H 1 W game_message @rb_adjacent O S P end R E 3202 W 3200 E M I 3300 A I E R F I ifn F Z J rb_dead end M L Z
rb_step_check: M I 3400 A I L R F I ife F E J rb_dead end I L 1 ifl L 6 J rb_step_check end J rb_chase
rb_chase: C S game_count_move M I 3500 M K 64
rb_counts_clear: W I Z I I 1 I K -1 N K Z J rb_counts_clear R A 3200 M B 8 C S app_div W 3203 A W 3204 C M L Z
rb_advance: M I 3400 A I L R A I ifl A Z J rb_advance_next end M B 8 C S app_div R E 3203 ifl A E I A 1 else ifg A E I A -1 end end R E 3204 ifl C E I C 1 else ifg C E I C -1 end end P A 8 A A C M I 3400 A I L W I A M I 3500 A I A R E I I E 1 W I E
rb_advance_next: I L 1 ifl L 6 J rb_advance end M L Z W 3205 Z
rb_resolve: M I 3400 A I L R G I ifl G Z J rb_resolve_next end R E 3200 ife G E W game_status 2 end M J 3300 A J G R E J ifn E Z W I -1 J rb_resolve_next end M J 3500 A J G R E J ifg E 1 M J 3300 A J G W J 1 W I -1 else R E 3205 I E 1 W 3205 E end
rb_resolve_next: I L 1 ifl L 6 J rb_resolve end R E game_status ifn E Z J rb_dead end R E 3205 ife E Z W game_status 1 W game_message @rb_win else R E 3201 ife E Z W game_message @rb_used else W game_message @rb_prompt end end J rb_render
rb_dead: W game_status 2 W game_message @rb_lose J rb_render
rb_render: M L Z
rb_ground: M I 3300 A I L R E I ife E Z M E 46 else M E 35 end M I game_board A I L W I E I L 1 ifl L 64 J rb_ground end M L Z
rb_draw_robot: M I 3400 A I L R E I ifge E Z M I game_board A I E W I 82 end I L 1 ifl L 6 J rb_draw_robot end R E 3200 M I game_board A I E W I 64 O S P
rb_initial: 0 1 6 7 56 63
rb_prompt: ${txt('N waits; T safe teleport x1')}
rb_used: ${txt('N waits; teleport used')}
rb_adjacent: ${txt('Choose an adjacent square')}
rb_empty: ${txt('Teleport already used')}
rb_no_safe: ${txt('Nowhere safe; charge kept')}
rb_win: ${txt('All robots became scrap!')}
rb_lose: ${txt('Caught! R to try again')}
${POSITIVE_DIVISION}`;
const snake=`game_reset: W 3200 3 W 3201 1 W 3202 1 W 3203 Z W 3300 27 W 3301 26 W 3302 25 W 3204 29 W game_message @sn_prompt J sn_render
game_move: W game_message @sn_keys O S P
game_key: E A 1 J sn_tick_key E A -26 J sn_tick_key E A 10 J sn_up E A -17 J sn_up E A -13 J sn_left E A -40 J sn_left E A 6 J sn_down E A -21 J sn_down E A -10 J sn_right E A -37 J sn_right M A Z O S P
sn_up: M G Z J sn_direction
sn_right: M G 1 J sn_direction
sn_down: M G 2 J sn_direction
sn_left: M G 3
sn_direction: R E game_status ifn E Z M A Z O S P end R E 3201 S E G F E A ife E 2 W game_message @sn_reverse M A 1 O S P end W 3202 G W game_message @sn_ready C S sn_render M A 1 O S P
sn_tick_key: R E game_status ifn E Z M A Z O S P end C S sn_tick M A 1 O S P
sn_tick: R G 3202 W 3201 G R A 3300 M B 8 C S app_div M H A M L C ife G Z I H -1 end ife G 1 I L 1 end ife G 2 I H 1 end ife G 3 I L -1 end C S game_count_move ifl H Z J sn_dead end ifge H 8 J sn_dead end ifl L Z J sn_dead end ifge L 8 J sn_dead end P H 8 A H L W 3205 H R E 3204 M L Z ife H E M L 1 end W 3206 L R K 3200 ife L Z I K -1 end M J Z
sn_collision: ifge J K J sn_move end M I 3300 A I J R E I ife E H J sn_dead end I J 1 J sn_collision
sn_move: R K 3200 ifn L Z I K 1 W 3200 K R E 3203 I E 1 W 3203 E end I K -1
sn_shift: ife K Z J sn_head end M I 3300 A I K M E I/-1 W I E I K -1 J sn_shift
sn_head: R E 3205 W 3300 E R E 3200 ife E 64 W game_status 1 W game_message @sn_win J sn_render end R E 3206 ifn E Z C S sn_fruit end W game_message @sn_prompt J sn_render
sn_fruit: R G 3204 A G 17 ifge G 64 S G 64 end
sn_fruit_try: M J Z R K 3200
sn_fruit_scan: M I 3300 A I J R E I ife E G I G 1 ife G 64 M G Z end J sn_fruit_try end I J 1 ifl J K J sn_fruit_scan end W 3204 G O S P
sn_dead: W game_status 2 W game_message @sn_lose J sn_render
sn_render: M I game_board M K 64
sn_clear: W I 46 I I 1 I K -1 N K Z J sn_clear R E 3200 ifl E 64 R E 3204 M I game_board A I E W I 42 end M L Z
sn_body: M I 3300 A I L R E I M I game_board A I E W I 111 I L 1 R E 3200 ifl L E J sn_body end R E 3300 M I game_board A I E R E 3202 M J @sn_heads A J E R E J W I E O S P
sn_heads: 94 62 118 60
sn_prompt: ${txt('WASD heading; N advances')}
sn_keys: ${txt('Use WASD, then N to move')}
sn_reverse: ${txt('Cannot reverse into body')}
sn_ready: ${txt('Heading set; N advances')}
sn_win: ${txt('All 64 squares filled!')}
sn_lose: ${txt('Crash! R starts a new snake')}
${POSITIVE_DIVISION}`;
const morrisCells=[0,3,6,8,10,12,16,17,18,21,22,23,25,26,27,30,31,32,36,38,40,42,45,48];
const morrisMills=[[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const morrisNeighbors=Array.from({length:24},(_,i)=>morrisMills.flatMap(line=>line.flatMap((p,j)=>p===i?[line[j-1],line[j+1]].filter((n):n is number=>n!==undefined):[])));
const morris=`game_reset: M I 3300 M K 24
mr_clear: W I Z I I 1 I K -1 N K Z J mr_clear W 3200 1 W 3201 Z W 3202 Z W 3203 Z W 3204 Z W 3205 -1 W 3206 Z W 3207 Z C S mr_prompt J mr_render
game_move: R E game_status N E Z O S P M G A M L Z
mr_find: M I @mr_cells A I L R E I ife E G J mr_point end I L 1 ifl L 24 J mr_find end W game_message @mr_dot O S P
mr_point: W 3210 L R E 3206 ifn E Z J mr_remove end M I 3300 A I L R E I R F 3200 ife E F W 3205 L W game_message @mr_destination J mr_render end ifn E Z W game_message @mr_occupied O S P end M I 3200 A I F R E I ifl E 9 I E 1 W I E M I 3202 A I F R E I I E 1 W I E J mr_place end R E 3205 ifl E Z W game_message @mr_select O S P end W 3211 E M I 3202 A I F R E I ife E 3 J mr_move_ok end R E 3211 P E 4 M I @mr_neighbors A I E M K 4
mr_adjacent: R E I R F 3210 ife E F J mr_move_ok end I I 1 I K -1 N K Z J mr_adjacent W game_message @mr_adj O S P
mr_move_ok: R E 3211 M I 3300 A I E W I Z R E 3207 I E 1 W 3207 E
mr_place: R E 3210 M I 3300 A I E R F 3200 W I F C S game_count_move W 3205 -1 R A 3210 R B 3200 C S mr_mill ifn A Z W 3206 1 C S mr_prompt J mr_render end J mr_finish
mr_remove: R E 3210 M I 3300 A I E R B I R F 3200 M G 3 S G F ifn B G W game_message @mr_enemy O S P end R A 3210 C S mr_mill ife A Z J mr_take end W 3212 Z
mr_outside: R E 3212 M I 3300 A I E R B I R F 3200 M G 3 S G F ife B G M A E C S mr_mill ife A Z W game_message @mr_protected O S P end end R E 3212 I E 1 W 3212 E ifl E 24 J mr_outside end
mr_take: R E 3210 M I 3300 A I E W I Z R E 3200 M F 3 S F E M I 3202 A I F R E I I E -1 W I E W 3206 Z W 3207 Z
mr_finish: W 3205 -1 R E 3200 M F 3 S F E W 3200 F R E 3201 R G 3202 A E G ifl E 18 J mr_continue end M I 3202 A I F R E I ifl E 3 J mr_won end ife E 3 J mr_draw_check end M L Z
mr_can_piece: M I 3300 A I L R E I R F 3200 ifn E F J mr_can_next end M E L P E 4 M J @mr_neighbors A J E M K 4
mr_can_edge: R E J ifge E Z M I 3300 A I E R E I ife E Z J mr_draw_check end end I J 1 I K -1 N K Z J mr_can_edge
mr_can_next: I L 1 ifl L 24 J mr_can_piece end J mr_won
mr_draw_check: R E 3207 ifge E 50 W game_status 3 W game_message @mr_draw J mr_render end
mr_continue: C S mr_prompt J mr_render
mr_won: R E 3200 M F 3 S F E W game_status F M I 3500 M J @mr_win M K 21
mr_win_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J mr_win_copy R E game_status A E 64 W 3500 E W game_message 3500 J mr_render
; Test whether a given point A is part of a complete mill for side B.
mr_mill: W 3220 A W 3221 B M G Z
mr_line: M I @mr_mills M E G P E 3 A I E M H 1 M L Z M K 3
mr_member: R E I R F 3220 ife E F M L 1 end M J 3300 A J E R E J R F 3221 ifn E F M H Z end I I 1 I K -1 N K Z J mr_member ifn H Z ifn L Z M A 1 O S P end end I G 1 ifl G 16 J mr_line end M A Z O S P
mr_prompt: M I 3500 M J @mr_placing R E 3206 ifn E Z M J @mr_removing else R E 3200 M I 3200 A I E R E I ifge E 9 M J @mr_moving end end M I 3500 M K 21
mr_prompt_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J mr_prompt_copy R E 3200 A E 64 W 3500 E W game_message 3500 O S P
mr_render: M I game_board M J @mr_board M K 49
mr_board_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J mr_board_copy M L Z
mr_draw_piece: M I 3300 A I L R E I ifn E Z A E 64 else M E 46 end R F 3205 ife F L M E 64 end M J @mr_cells A J L R F J M I game_board A I F W I E I L 1 ifl L 24 J mr_draw_piece end O S P
mr_cells: ${morrisCells.join(' ')}
mr_mills: ${morrisMills.flat().join(' ')}
mr_neighbors: ${morrisNeighbors.flatMap(ns=>ns.concat(Array<number>(4-ns.length).fill(-1))).join(' ')}
mr_board: ${txt('.--.--.'+'|.-.-.|'+'||...||'+'... ...'+'||...||'+'|.-.-.|'+'.--.--.')}
mr_placing: ${txt('A: place a man'.padEnd(20))}
mr_moving: ${txt('A: move a man'.padEnd(20))}
mr_removing: ${txt('A: remove enemy man ')}
mr_win: ${txt('A wins the mill game')}
mr_dot: ${txt('Choose one of the 24 points')}
mr_destination: ${txt('Choose an empty destination')}
mr_occupied: ${txt('That point is occupied')}
mr_select: ${txt('Select your man first')}
mr_adj: ${txt('Move along one board edge')}
mr_enemy: ${txt('Remove an opposing man')}
mr_protected: ${txt('Remove outside a mill first')}
mr_draw: ${txt('Draw: 50 moves without take')}`;
// All pinfall and scoring below execute in the guest, including secondary hits.
const pinCells=[24,16,18,8,10,12,0,2,4,6];
const bowling=`game_reset: W 3200 1 W 3201 Z W 3202 3 W 3203 Z W 3204 Z W 3205 Z J bw_rack
bw_rack: M I 3300 M K 10
bw_stand: W I 1 I I 1 I K -1 N K Z J bw_stand C S bw_message J bw_render
game_move: R E game_status N E Z O S P ifge A 42 S A 42 W 3202 A C S bw_message J bw_render end ifge A 35 S A 35 M E Z ifl A 3 M E -1 end ifg A 3 M E 1 end W 3203 E C S bw_message J bw_render end W game_message @bw_choose O S P
game_key: E A 1 J bw_roll E A -26 J bw_roll M A Z O S P
bw_roll: R E game_status ifn E Z M A Z O S P end C S game_count_move R E 3200 I E -1 M I @bw_drift A I E R E I R F 3202 A E F W 3206 E W 3207 3 W 3208 Z
bw_row: R E 3207 ife E 1 R E 3206 R F 3203 A E F W 3206 E end R H 3206 ifl H Z J bw_done end ifg H 6 J bw_done end R G 3207 P G 7 A G H M L Z
bw_find_pin: M I @bw_cells A I L R E I ife E G J bw_hit end I L 1 ifl L 10 J bw_find_pin end J bw_next_row
bw_hit: M I 3300 A I L R E I ife E Z J bw_next_row end W I Z R E 3208 I E 1 W 3208 E R E 3207 ife E Z J bw_next_row end R E 3203 ifle E Z M H G I H -8 C S bw_secondary end R E 3203 ifge E Z M H G I H -6 C S bw_secondary end
bw_next_row: R E 3207 I E -1 W 3207 E ifge E Z J bw_row end
bw_done: R E 3204 R F 3208 A E F W 3204 E R E 3205 A E F W 3205 E R E 3201 I E 1 W 3201 E ife E 2 J bw_frame_done end R E 3205 ife E 10 J bw_frame_done end C S bw_message C S bw_render M A 1 O S P
bw_frame_done: R E 3200 ife E 5 R E 3204 ifge E 35 W game_status 1 else W game_status 2 end W game_message @bw_over C S bw_message C S bw_render M A 1 O S P end I E 1 W 3200 E W 3201 Z W 3205 Z C S bw_rack M A 1 O S P
bw_secondary: M K Z
bw_secondary_find: M I @bw_cells A I K R E I ife E H M I 3300 A I K R E I ifn E Z W I Z R E 3208 I E 1 W 3208 E end O S P end I K 1 ifl K 10 J bw_secondary_find end O S P
bw_message: M I 3500 M J @bw_template M K 27
bw_message_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bw_message_copy R E 3200 A E 48 W 3501 E R E 3201 I E 1 A E 48 W 3504 E R A 3204 M B 10 C S app_div A A 48 W 3513 A A C 48 W 3514 C R E 3200 I E -1 M I @bw_drift A I E R E I M F 48 ifl E Z M F 45 end ifg E Z M F 43 end W 3523 F R E game_status ifn E Z M I 3500 M J @bw_over ife E 1 M J @bw_good end M K 13
bw_over_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bw_over_copy W 3515 Z end W game_message 3500 O S P
bw_render: M I game_board M J @bw_board M K 49
bw_board_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bw_board_copy M L Z
bw_draw_pin: M I 3300 A I L R E I M F 46 ifn E Z M F 88 end M I @bw_cells A I L R E I M I game_board A I E W I F I L 1 ifl L 10 J bw_draw_pin end R E 3202 M I 2942 A I E W I 94 R E 3203 M I 2938 ifl E Z M I 2935 end ifg E Z M I 2941 end R E I A E 32 W I E O S P
bw_cells: ${pinCells.join(' ')}
bw_drift: -1 0 1 0 -1
bw_board: ${txt('.......'+'.......'+'.......'+'.......'+'.......'+'L..S..R'+'0123456')}
bw_template: ${txt('F1 B1 score: 00 drift: 0  ')}
bw_over: ${txt('End: score:  ')}
bw_good: ${txt('Win! score:  ')}
bw_choose: ${txt('Bottom:aim Above:spin N:go')}
${POSITIVE_DIVISION}`;
export const RETRO_ARCADE:BoardSoftware[]=[
{number:241,kind:'board',id:'robots',site:'salvage',title:'Scrap Robots',columns:8,rows:8,stepKey:'n',counterLabel:'Turns',controls:'Enter:step N:wait T:warp',inputs:['Adjacent square','Wait/teleport'],outputs:['Robots/scrap','Escape outcome'],description:'Escape six robots on an eight-by-eight yard. @ is you; R are robots and # is permanent scrap. Enter on any neighboring square moves one step, diagonals included; N waits. Then every robot steps toward you at once. Robots that collide make scrap; entering scrap destroys later robots. You lose by touching a robot or scrap, even when robots collide on your square. T spends one teleport charge on the first empty square outside all robots\' immediate reach, then robots move; if no safe square exists the charge is kept. Lure every robot into destruction to win. R resets the same yard; F1 exits.',algorithm:robots,examples:[{moves:[],steps:1,board:Array.from({length:64},(_,i)=>i===27?'@':[9,10,13,14,49,54].includes(i)?'R':'.').join(''),status:0,movesMade:1}]},
{number:242,kind:'board',id:'snake',site:'orchard',title:'Orchard Snake',columns:8,rows:8,stepKey:'n',counterLabel:'Ticks',controls:'WASD:heading N:tick R:reset',inputs:['Heading','Next tick'],outputs:['Snake/fruit','Growth/crash'],description:'Guide the arrow-headed snake to fruit *. W/A/S/D selects up/left/down/right, and N advances one tick. Arrow keys only move the board cursor. Reversing against the last executed heading is rejected; choose your direction before each tick. Eating fruit grows one square, and the next fruit appears deterministically on a free square. Moving into the tail is allowed when that tail moves away. Walls and the rest of your body crash; filling all 64 squares wins. Enter explains the controls without advancing. R restarts; F1 exits.',algorithm:snake,examples:[{moves:[],steps:1,board:Array.from({length:64},(_,i)=>i===28?'>':i===29?'*':[26,27].includes(i)?'o':'.').join(''),status:0,movesMade:1}]},
{number:243,kind:'board',id:'nine-morris',site:'chess',title:'Nine Mens Morris',columns:7,rows:7,counterLabel:'Moves',controls:'Enter:point R:reset',inputs:['Point/man','Move/removal'],outputs:['Mills','Turn/winner'],description:'Two players each place nine A/B men on the 24 dotted points, then move along drawn edges. Select a man then an empty neighboring point; @ marks selection. With only three men left, fly to any empty point. Making a line of three along a board side or spoke forms a mill: remove an enemy man before play continues. Men in mills are protected unless every enemy man is in a mill. Reaching fewer than three men or having no move loses, after placement finishes. Fifty movement turns without a removal draw. R restarts; F1 exits.',algorithm:morris,examples:[{moves:[0],board:'A--.--.'+'|.-.-.|'+'||...||'+'... ...'+'||...||'+'|.-.-.|'+'.--.--.',status:0,movesMade:1}]},
{number:244,kind:'board',id:'pin-bowling',site:'scorebook',title:'Pocket Pin Bowling',columns:7,rows:7,stepKey:'n',counterLabel:'Rolls',controls:'Enter:aim/spin N:roll',inputs:['Aim 0..6','Spin L/S/R'],outputs:['Pinfall','Five-frame score'],description:'A five-frame house bowling game: up to two balls per rack, one point per fallen pin, no strike or spare bonuses. Aim with Enter on the bottom row; ^ marks your lane. The row above selects L/S/R spin, shown lowercase. N rolls. Drift -/0/+ moves the ball one lane at entry; spin bends it one lane before the last two pin rows. Direct hits knock a pin and its immediately rear diagonal neighbors; straight spin spreads both ways, left or right only that way. Secondary hits do not cascade. Fallen pins stay down for the second ball; the next rack appears automatically. Score 35 out of 50 to win. R resets; F1 exits.',algorithm:bowling,examples:[{moves:[],board:'X.X.X.X'+'.X.X.X.'+'..X.X..'+'...X...'+'.......'+'L..s..R'+'012^456',status:0,movesMade:0}]},
];
