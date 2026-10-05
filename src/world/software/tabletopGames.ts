import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const checkersInitial=Array.from({length:36},(_,i)=>((Math.floor(i/6)+i%6)%2===0||Math.floor(i/6)===2||Math.floor(i/6)===3)?0:Math.floor(i/6)<2?2:1);
const draughts=`game_reset: M I 3300 M J @dr_initial M K 36
dr_init: R E J W I E I I 1 I J 1 I K -1 N K Z J dr_init W 3200 1 W 3201 -1 W 3202 Z W 3203 Z W game_message @dr_a J dr_render
game_move: R E game_status N E Z O S P W 3209 A R E 3201 ifge E Z W 3208 E C S dr_legal ifn A Z J dr_move end end R E 3202 ifn E Z W game_message @dr_chain O S P end R G 3209 M I 3300 A I G R E I ifg E 2 I E -2 end R F 3200 ifn E F W game_message @dr_pick O S P end W 3201 G W game_message @dr_dest J dr_render
dr_move: W 3215 A ife A 1 M A 1 C S dr_scan ifn A Z W game_message @dr_mandatory O S P end end R G 3208 R H 3209 M I 3300 A I G R K I W I Z M I 3300 A I H W I K C S game_count_move R E 3215 ife E 2 R E 3212 M I 3300 A I E W I Z W 3203 Z else R E 3203 I E 1 W 3203 E end
 M L Z ife K 1 ifl H 6 M K 3 M L 1 end end ife K 2 ifge H 30 M K 4 M L 1 end end M I 3300 A I H W I K
 R E 3215 ife E 2 ife L Z W 3208 H M K Z
dr_more: M I @dr_jumps A I K R E I R H 3208 A H E W 3209 H C S dr_legal ife A 2 R E 3208 W 3201 E W 3202 1 W game_message @dr_chain J dr_render end I K 1 ifl K 4 J dr_more end end end
 W 3201 -1 W 3202 Z R E 3200 M F 3 S F E W 3200 F M A Z C S dr_scan ife A Z R E 3200 M F 3 S F E W game_status F ife F 1 W game_message @dr_awin else W game_message @dr_bwin end J dr_render end R E 3203 ifge E 80 W game_status 3 W game_message @dr_draw J dr_render end R E 3200 ife E 1 W game_message @dr_a else W game_message @dr_b end J dr_render
; Legal move uses stored from/to, returns 0/1/2 and midpoint 3212.
dr_legal: R G 3208 R H 3209 ifl H Z M A Z O S P end ifge H 36 M A Z O S P end M I 3300 A I G R L I M E L ifg E 2 I E -2 end R F 3200 ifn E F M A Z O S P end M I 3300 A I H R E I ifn E Z M A Z O S P end M A G M B 6 C S app_div W 3216 A W 3217 C M A H C S app_div R E 3216 S A E R E 3217 S C E F C A M D A F D A ifn C D M A Z O S P end ifl D 1 M A Z O S P end ifg D 2 M A Z O S P end ife L 1 ifge A Z M A Z O S P end end ife L 2 ifle A Z M A Z O S P end end ife D 1 M A 1 O S P end M E G A E H Q E 2 W 3212 E M I 3300 A I E R E I ife E Z M A Z O S P end ifg E 2 I E -2 end R F 3200 ife E F M A Z O S P end M A 2 O S P
; Scan preserves requested from/to, so mandatory-capture checks are atomic.
dr_scan: W 3218 A R E 3208 W 3219 E R E 3209 W 3220 E W 3221 Z
dr_scan_from: W 3222 Z
dr_scan_to: R E 3221 W 3208 E R F 3222 M I @dr_offsets A I F R F I A E F W 3209 E C S dr_legal R E 3218 ife E 1 ife A 2 J dr_found end else ifn A Z J dr_found end end R E 3222 I E 1 W 3222 E ifl E 8 J dr_scan_to end R E 3221 I E 1 W 3221 E ifl E 36 J dr_scan_from end M A Z J dr_scan_restore
dr_found: M A 1
dr_scan_restore: R E 3219 W 3208 E R E 3220 W 3209 E O S P
dr_render: M G Z
dr_cell: M I 3300 A I G R E I M J @dr_symbols A J E R E J ife E 46 M A G M B 6 C S app_div A A C M B 2 C S app_div ife C Z M E 32 else M E 46 end end R F 3201 ife F G M E 64 end M I game_board A I G W I E I G 1 ifl G 36 J dr_cell end O S P
dr_initial: ${checkersInitial.join(' ')}
dr_symbols: 46 97 98 65 66
dr_offsets: -14 -10 10 14 -7 -5 5 7
dr_jumps: -14 -10 10 14
dr_a: ${txt('A turn: a moves upward')}
dr_b: ${txt('B turn: b moves downward')}
dr_pick: ${txt('Choose your own piece')}
dr_dest: ${txt('Choose diagonal destination')}
dr_mandatory: ${txt('A capture is mandatory')}
dr_chain: ${txt('Continue selected piece')}
dr_awin: ${txt('A wins: B has no legal move')}
dr_bwin: ${txt('B wins: A has no legal move')}
dr_draw: ${txt('Draw: 80 moves without take')}
${POSITIVE_DIVISION}`;
const hex=`game_reset: W 3200 88 M I game_board M E 25
hx_init: W I 46 I I 1 I E -1 N E Z J hx_init W game_message @hx_x O S P
game_move: R E game_status N E Z O S P M I game_board A I A R E I ifn E 46 W game_message @hx_taken O S P end R E 3200 W I E C S game_count_move C S hx_search ifn A Z R E 3200 ife E 88 W game_status 1 W game_message @hx_xwin else W game_status 2 W game_message @hx_owin end O S P end R E 3200 ife E 88 W 3200 79 W game_message @hx_o else W 3200 88 W game_message @hx_x end O S P
hx_search: M I 3400 M E 25
hx_clear: W I Z I I 1 I E -1 N E Z J hx_clear W 3201 Z W 3202 Z M L Z
hx_seed: M G L R E 3200 ife E 79 P G 5 end C S hx_enqueue I L 1 ifl L 5 J hx_seed end
hx_next: R E 3201 R F 3202 ifge E F M A Z O S P end M I 3300 A I E R G I I E 1 W 3201 E M A G M B 5 C S app_div W 3203 A W 3204 C R E 3200 ife E 88 ife A 4 M A 1 O S P end else ife C 4 M A 1 O S P end end
${[[-1,0],[1,0],[0,-1],[0,1],[-1,1],[1,-1]].map(([dr,dc],i)=>`R G 3203 A G ${dr} ifl G Z J hx_neighbor${i} end ifge G 5 J hx_neighbor${i} end R H 3204 A H ${dc} ifl H Z J hx_neighbor${i} end ifge H 5 J hx_neighbor${i} end P G 5 A G H C S hx_enqueue
hx_neighbor${i}:`).join('\n')}
 J hx_next
hx_enqueue: M I 3400 A I G R E I N E Z O S P M J game_board A J G R E J R F 3200 N E F O S P W I 1 R E 3202 M I 3300 A I E W I G I E 1 W 3202 E O S P
hx_x: ${txt('X connects top to bottom')}
hx_o: ${txt('O connects left to right')}
hx_taken: ${txt('Occupied: choose a dot')}
hx_xwin: ${txt('X joins top and bottom!')}
hx_owin: ${txt('O joins left and right!')}
${POSITIVE_DIVISION}`;
const dots=`game_reset: W 3200 65 W 3201 Z W 3202 Z M L Z
db_init: M A L M B 7 C S app_div M G A M A C M B 2 C S app_div M H C M A G C S app_div M E 46 ife C Z ife H Z M E 43 end else ifn H Z M E 32 end end M I game_board A I L W I E I L 1 ifl L 49 J db_init end J db_message
game_move: R E game_status N E Z O S P M G A M I game_board A I G R E I ifn E 46 W game_message @db_invalid O S P end M A G M B 7 C S app_div M B 2 C S app_div M E 45 ifn C Z M E 124 end M I game_board A I G W I E C S game_count_move M L Z W 3203 Z
db_box: M I @db_centers A I L R G I M I game_board A I G R E I ifn E 32 J db_box_next end M E I/-7 E E 46 J db_box_next M E I/7 E E 46 J db_box_next M E I/-1 E E 46 J db_box_next M E I/1 E E 46 J db_box_next R E 3200 W I E ife E 65 M J 3201 else M J 3202 end R E J I E 1 W J E W 3203 1
db_box_next: I L 1 ifl L 9 J db_box end R E 3203 ife E Z R E 3200 M F 131 S F E W 3200 F end R E game_moves ife E 24 R E 3201 R F 3202 ifg E F W game_status 1 else W game_status 2 end end J db_message
db_message: M I 3400 M J @db_template M K 17
db_message_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J db_message_copy R E 3201 A E 48 W 3402 E R E 3202 A E 48 W 3406 E R E 3200 W 3414 E R E game_status ifn E Z A E 64 W 3409 E M I 3410 M J @db_win M K 6
db_win_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J db_win_copy end W game_message 3400 O S P
db_centers: 8 10 12 22 24 26 36 38 40
db_template: ${txt('A:0 B:0; turn A ')}
db_win: ${txt(' wins!')}
db_invalid: ${txt('Choose an unused edge dot')}
${POSITIVE_DIVISION}`;
const sea=`game_reset: M I 3300 M E 25
sb_clear_enemy: W I Z I I 1 I E -1 N E Z J sb_clear_enemy M I 3400 M E 25
sb_clear_own: W I Z I I 1 I E -1 N E Z J sb_clear_own W 3200 Z W game_message @sb_start J sb_render
game_key: E A 1 J sb_view E A -26 J sb_view M A Z O S P
sb_view: R E 3200 M F 1 S F E W 3200 F C S sb_render M A 1 O S P
game_move: R E game_status N E Z O S P R E 3200 ifn E Z W game_message @sb_wrong O S P end ifge A 25 O S P end M I 3300 A I A R E I ifn E Z W game_message @sb_repeat O S P end W 3201 A M G 3300 M H @sb_enemy C S sb_shoot W 3205 A C S game_count_move M G 3300 M H @sb_enemy C S sb_remaining ife A Z W game_status 1 W game_message @sb_win J sb_render end
 C S sb_choose W 3201 A M G 3400 M H @sb_own C S sb_shoot W 3206 A M G 3400 M H @sb_own C S sb_remaining ife A Z W game_status 2 W game_message @sb_lose J sb_render end C S sb_message J sb_render
; Marks: 0 unknown, 1 miss, 2 hit, 3 sunk. Returns outcome0..3.
sb_shoot: R E 3201 M I H A I E R K I M I G A I E ife K Z W I 1 M A Z O S P end W I 2 M L Z
sb_ship_check: M I H A I L R E I ife E K M I G A I L R E I ife E Z M A 1 O S P end end I L 1 ifl L 25 J sb_ship_check end M L Z
sb_sink: M I H A I L R E I ife E K M I G A I L W I 3 end I L 1 ifl L 25 J sb_sink end M A K I A 1 O S P
sb_remaining: M L Z M A Z
sb_count: M I H A I L R E I ifn E Z M I G A I L R E I ife E Z I A 1 end end I L 1 ifl L 25 J sb_count end O S P
; Target unshot neighbors of unsunk hits, otherwise parity hunt then scan.
sb_choose: M L Z
sb_target: M I 3400 A I L R E I ife E 2 M A L M B 5 C S app_div W 3202 A W 3203 C
${[[-1,0],[0,1],[1,0],[0,-1]].map(([dr,dc],i)=>`R G 3202 A G ${dr} ifl G Z J sb_adj${i} end ifge G 5 J sb_adj${i} end R H 3203 A H ${dc} ifl H Z J sb_adj${i} end ifge H 5 J sb_adj${i} end P G 5 A G H M I 3400 A I G R E I ife E Z M A G O S P end
sb_adj${i}:`).join('\n')}
 end I L 1 ifl L 25 J sb_target end M L Z
sb_hunt: M I 3400 A I L R E I ifn E Z J sb_hunt_next end M A L M B 5 C S app_div A A C M B 2 C S app_div ife C Z M A L O S P end
sb_hunt_next: I L 1 ifl L 25 J sb_hunt end M L Z
sb_fallback: M I 3400 A I L R E I ife E Z M A L O S P end I L 1 ifl L 25 J sb_fallback end M A Z O S P
sb_message: M I 3500 M J @sb_template M K 21
sb_message_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J sb_message_copy R E 3205 P E 6 M J @sb_words A J E M I 3504 M K 5
sb_you_word: R E J W I E I I 1 I J 1 I K -1 N K Z J sb_you_word R E 3206 P E 6 M J @sb_words A J E M I 3514 M K 5
sb_foe_word: R E J W I E I I 1 I J 1 I K -1 N K Z J sb_foe_word W game_message 3500 O S P
sb_render: M L Z R E 3200 ife E Z M G 3300 else M G 3400 end
sb_cell: M I G A I L R E I M J @sb_marks A J E R F J R E 3200 ifn E Z ife F 46 M I @sb_own A I L R E I ifn E Z M F E A F 64 end end end M I game_board A I L W I F I L 1 ifl L 25 J sb_cell end M I 2925 R E 3200 ife E Z M J @sb_enemy_label else M J @sb_own_label end M K 5
sb_label: R E J W I E I I 1 I J 1 I K -1 N K Z J sb_label O S P
sb_enemy: 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2 0 0 0 0 2 0
sb_own: 0 0 0 2 0 0 0 0 2 0 0 0 0 0 0 0 0 0 0 0 1 1 1 0 0
sb_marks: 46 111 88 35
sb_words: ${['miss ','hit  ','sunkA','sunkB'].map(txt).join(' ')}
sb_template: ${txt('YOU       FOE       ')}
sb_enemy_label: ${txt('ENEMY')}
sb_own_label: ${txt('YOURS')}
sb_start: ${txt('Hunt enemy fleet; N:view')}
sb_wrong: ${txt('N switches to enemy targets')}
sb_repeat: ${txt('Already fired there')}
sb_win: ${txt('Enemy fleet sunk: you win!')}
sb_lose: ${txt('Your fleet lost! N:view')}
${POSITIVE_DIVISION}`;
export const TABLETOP_GAMES:BoardSoftware[]=[
{number:229,kind:'board',id:'draughts',site:'cardtable',title:'Pocket Draughts',columns:6,rows:6,counterLabel:'Moves',controls:'Enter:piece/dest R:reset',inputs:['Piece','Destination'],outputs:['Turn','Captures/kings'],description:'Two players share a six-by-six draughts board. A starts at the bottom: a men move diagonally upward, b men downward. Select your piece then its destination; @ marks selection. Any available capture is mandatory. Jump an adjacent enemy into the empty square beyond, continuing all available jumps with the same piece. Men capture only forward; kings A/B move and capture either way. Reaching the far row crowns a king and ends that turn. A side with no legal move loses. Eighty moves without a capture draw. R resets; F1 exits.',algorithm:draughts,examples:[{moves:[],board:checkersInitial.map((p,i)=>p?'.abAB'[p]!:((Math.floor(i/6)+i%6)%2?'.':' ')).join(''),status:0,movesMade:0}]},
{number:230,kind:'board',id:'hex-connection',site:'hexclub',title:'Lunch Hex',columns:5,rows:5,counterLabel:'Moves',controls:'Enter:place R:reset',inputs:['Empty cell'],outputs:['Connections','Turn/winner'],description:'Two players connect opposite edges. X starts and joins top to bottom; O joins left to right. Enter places your stone on a dot. Each cell has six neighbors: up, down, left, right, up-right and down-left. The square display represents a slanted hexagonal grid; opposite diagonal cells do not touch. A continuous chain wins immediately. Occupied cells cost no turn. R clears the board; F1 exits.',algorithm:hex,examples:[{moves:[0],board:'X'+'.'.repeat(24),status:0,movesMade:1}]},
{number:231,kind:'board',id:'dots-boxes',site:'puzzlebox',title:'Dots and Boxes',columns:7,rows:7,counterLabel:'Edges',controls:'Enter:edge R:reset',inputs:['Unused edge'],outputs:['Claimed boxes','Score/turn'],description:'Two players surround nine boxes. Plus signs are junctions; edge dots lie between them. Enter on a dot draws that edge. Completing a box writes your A/B inside it, scores one, and gives another turn; a shared edge can finish two boxes at once. Otherwise the turn changes. Centers, junctions and existing edges do nothing. Most boxes wins when all 24 edges are drawn. The message shows both scores and the current turn. R restarts; F1 exits.',algorithm:dots,examples:[{moves:[1],board:Array.from({length:49},(_,i)=>i===1?'-':Math.floor(i/7)%2?(i%7%2?' ':'.'):(i%7%2?'.':'+')).join(''),status:0,movesMade:1}]},
{number:232,kind:'board',id:'sea-battle',site:'creek',title:'Sea Battle',columns:5,rows:6,stepKey:'n',counterLabel:'Shots',controls:'Enter:fire N:view R:reset',inputs:['Enemy target','Fleet view'],outputs:['Hits/sunk ships','Opponent fire'],description:'Hunt a hidden fleet before the native opponent sinks yours. Each side has a straight ship A of three cells and B of two, placed for a repeatable practice match. Enter fires at an unknown dot in ENEMY view; o is a miss, X a hit and # a sunk ship. N switches to YOURS, showing your A/B ships and incoming shots. Return to ENEMY to fire. The opponent hunts alternating squares, then targets neighbors of unsunk hits; each valid shot gets one reply unless you win. Feedback reports both shots and sunk ship letters. Repeated targets cost nothing. R replays; F1 exits.',algorithm:sea,examples:[{moves:[0],board:'X'+'.'.repeat(24)+'ENEMY',status:0,movesMade:1}]},
];
