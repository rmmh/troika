import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const amazons=`game_reset: M I 3300 M K 25
az_clear: W I Z I I 1 I K -1 N K Z J az_clear W 3300 2 W 3304 2 W 3320 1 W 3324 1 W 3200 1 W 3201 Z W 3202 -1 W 3203 -1 W game_message @az_a J az_render
game_move: R E game_status N E Z O S P W 3204 A R E 3201 ife E 2 J az_arrow end M I 3300 A I A R E I R F 3200 ife E F R E 3202 ife E A W 3201 Z W 3202 -1 J az_prompt end W 3202 A W 3201 1 W game_message @az_move J az_render end R E 3201 ife E Z W game_message @az_pick O S P end R A 3202 R B 3204 C S az_ray ife A Z W game_message @az_blocked O S P end R I 3202 A I 3300 W I Z R E 3200 R I 3204 W 3203 I A I 3300 W I E W 3201 2 W game_message @az_shoot J az_render
az_arrow: R A 3203 R B 3204 C S az_ray ife A Z W game_message @az_blocked O S P end R I 3204 A I 3300 W I 3 W 3201 Z W 3202 -1 W 3203 -1 C S game_count_move R E 3200 M F 3 S F E W 3200 F C S az_available ife A Z R E 3200 ife E 2 W game_status 1 W game_message @az_awin else W game_status 2 W game_message @az_bwin end J az_render end
az_prompt: R E 3200 ife E 1 W game_message @az_a else W game_message @az_b end J az_render
game_key: E A 1 J az_cancel E A -26 J az_cancel M A Z O S P
az_cancel: R E game_status ifn E Z M A Z O S P end R E 3201 ife E 2 R I 3203 A I 3300 W I Z R I 3202 A I 3300 R E 3200 W I E end W 3201 Z W 3202 -1 W 3203 -1 C S az_prompt M A 1 O S P
; Empty queen ray, preserving K/L so availability scans remain bounded.
az_ray: W 3210 A W 3211 B ife A B M A Z O S P end M I 3300 A I B R E I ifn E Z M A Z O S P end M B 5 C S app_div W 3212 A W 3213 C R A 3211 C S app_div R G 3212 S A G M G A R H 3213 S C H M H C M E G F E A M F H F F A ifn E Z ifn F Z ifn E F M A Z O S P end end end ifg G Z M G 1 else ifl G Z M G -1 end end ifg H Z M H 1 else ifl H Z M H -1 end end P G 5 A G H R J 3210
az_ray_cell: A J G M I 3300 A I J R E I ifn E Z M A Z O S P end R E 3211 ife J E M A 1 O S P end J az_ray_cell
az_available: M L Z
az_from: M I 3300 A I L R E I R F 3200 ifn E F J az_next_from end M K Z
az_to: M A L M B K C S az_ray ifn A Z O S P end I K 1 ifl K 25 J az_to end
az_next_from: I L 1 ifl L 25 J az_from end M A Z O S P
az_render: M L Z
az_cell: M I 3300 A I L R E I ife E Z M E 46 R F 3201 ifn F Z ife F 2 R A 3203 else R A 3202 end M B L C S az_ray ifn A Z M E 43 else M E 46 end end else ife E 3 M E 35 else A E 64 R F 3201 ife F 1 R F 3202 else R F 3203 end ife F L A E 32 end end end M I game_board A I L W I E I L 1 ifl L 25 J az_cell end O S P
az_a: ${text('A: pick queen; B waits')}
az_b: ${text('B: pick queen; A waits')}
az_pick: ${text('Select your A/B queen first')}
az_move: ${text('Queen to +; N cancels')}
az_shoot: ${text('Shoot a blocking # at +')}
az_blocked: ${text('Need a clear queen ray')}
az_awin: ${text('B cannot move; A wins!')}
az_bwin: ${text('A cannot move; B wins!')}
${POSITIVE_DIVISION}`;
const courtyard=`game_reset: W -3658 8177 M I 3300 M J @kl_start M K 6
kl_init: R E J W I E I I 1 I J 1 I K -1 N K Z J kl_init W 3200 -1 W game_message @kl_prompt J kl_render
game_move: R E game_status N E Z O S P M I 3320 A I A R E I ife E Z W game_message @kl_empty O S P end I E -1 R F 3200 ife E F W 3200 -1 W game_message @kl_prompt else W 3200 E W game_message @kl_move end J kl_render
game_key: E A 10 J kl_up E A -17 J kl_up E A -13 J kl_left E A -40 J kl_left E A 6 J kl_down E A -21 J kl_down E A -10 J kl_right E A -37 J kl_right E A 1 J kl_cancel E A -26 J kl_cancel M A Z O S P
kl_up: M G -1 M H Z J kl_try
kl_down: M G 1 M H Z J kl_try
kl_left: M G Z M H -1 J kl_try
kl_right: M G Z M H 1 J kl_try
kl_cancel: R E game_status ifn E Z M A Z O S P end W 3200 -1 W game_message @kl_prompt C S kl_render M A 1 O S P
kl_try: R E game_status ifn E Z M A Z O S P end R L 3200 ifl L Z W game_message @kl_empty M A 1 O S P end M I 3300 A I L R A I M B 4 C S app_div A A G A C H W 3201 A W 3202 C M I @kl_width A I L R E I W 3203 E M I @kl_height A I L R F I W 3204 F ifl A Z J kl_blocked end ifl C Z J kl_blocked end A E C ifg E 4 J kl_blocked end A F A ifg F 5 J kl_blocked end P A 4 A A C W 3205 A M K Z
kl_fit_row: M J Z
kl_fit_col: R I 3205 M E K P E 4 A I E A I J A I 3320 R E I ifn E Z M F L I F 1 ifn E F J kl_blocked end end I J 1 R E 3203 ifl J E J kl_fit_col end I K 1 R E 3204 ifl K E J kl_fit_row end M I 3300 A I L R E 3205 W I E C S game_count_move R E 3300 ife E 13 W game_status 1 W game_message @kl_win else W game_message @kl_move end C S kl_render M A 1 O S P
kl_blocked: W game_message @kl_wall M A 1 O S P
kl_render: M I 3320 M K 20
kl_clear: W I Z I I 1 I K -1 N K Z J kl_clear M L Z
kl_piece: M I 3300 A I L R E I W 3206 E M I @kl_width A I L R E I W 3207 E M I @kl_height A I L R E I W 3208 E M K Z
kl_row: M J Z
kl_col: R I 3206 M E K P E 4 A I E A I J A I 3320 M E L I E 1 W I E I J 1 R E 3207 ifl J E J kl_col end I K 1 R E 3208 ifl K E J kl_row end I L 1 ifl L 6 J kl_piece end M L Z
kl_cell: M I 3320 A I L R E I ife E Z M E 46 else I E -1 R F 3200 M I @kl_letters A I E R G I ife E F A G 32 end M E G end M I game_board A I L W I E I L 1 ifl L 20 J kl_cell end O S P
kl_start: 5 0 3 8 11 13
kl_width: 2 1 1 1 1 2
kl_height: 2 2 2 2 2 1
kl_letters: 88 65 66 67 68 69
kl_prompt: ${text('Move the 2x2 X to bottom')}
kl_empty: ${text('Enter selects a whole block')}
kl_move: ${text('W/A/S/D slide; N unselects')}
kl_wall: ${text('Blocked by a wall or block')}
kl_win: ${text('X reaches the bottom gate!')}
${POSITIVE_DIVISION}`;
const binaryClues=[-1,-1,-1,0,-1,1,-1,-1,1,-1,-1,1,-1,1,-1,0,-1,-1,-1,-1,0,-1,-1,-1,-1,-1,-1,-1,0,-1,-1,1,-1,-1,-1,-1];
const binary=`game_reset: M I 3300 M J @tk_clues M K 36
tk_init: R E J W I E I I 1 I J 1 I K -1 N K Z J tk_init W game_message @tk_prompt J tk_render
game_move: R E game_status N E Z O S P M I @tk_clues A I A R E I ifge E Z W game_message @tk_fixed O S P end M I 3300 A I A R E I I E 1 ifg E 1 M E -1 end W I E C S game_count_move W game_message @tk_prompt J tk_render
game_key: E A 1 J tk_check E A -26 J tk_check M A Z O S P
tk_check: R E game_status ifn E Z M A Z O S P end M I 3300 M K 36
tk_complete: R E I ifl E Z W game_message @tk_missing M A 1 O S P end I I 1 I K -1 N K Z J tk_complete M L Z
tk_line: M K Z M G Z M H Z
tk_sum: M I L P I 6 A I K A I 3300 R E I A G E M I K P I 6 A I L A I 3300 R E I A H E I K 1 ifl K 6 J tk_sum end ifn G 3 J tk_balance end ifn H 3 J tk_balance end M K Z
tk_triple: M I L P I 6 A I K A I 3300 R E I M F I/1 ife E F M F I/2 ife E F J tk_three end end M I K P I 6 A I L A I 3300 R E I M F I/6 ife E F M F I/12 ife E F J tk_three end end I K 1 ifl K 4 J tk_triple end I L 1 ifl L 6 J tk_line end M L Z
tk_unique_a: M K L I K 1
tk_unique_b: ifge K 6 J tk_unique_next end M J Z M G Z M H Z
tk_compare: M I L P I 6 A I J A I 3300 R E I M I K P I 6 A I J A I 3300 R F I ifn E F M G 1 end M I J P I 6 A I L A I 3300 R E I M I J P I 6 A I K A I 3300 R F I ifn E F M H 1 end I J 1 ifl J 6 J tk_compare end ife G Z J tk_same end ife H Z J tk_same end I K 1 J tk_unique_b
tk_unique_next: I L 1 ifl L 5 J tk_unique_a end W game_status 1 W game_message @tk_win M A 1 O S P
tk_balance: W game_message @tk_count M A 1 O S P
tk_three: W game_message @tk_run M A 1 O S P
tk_same: W game_message @tk_duplicate M A 1 O S P
tk_render: M L Z
tk_cell: M I @tk_clues A I L R E I ifge E Z ife E Z M E 79 else M E 73 end else M I 3300 A I L R E I ifl E Z M E 46 else A E 48 end end M I game_board A I L W I E I L 1 ifl L 36 J tk_cell end O S P
tk_clues: ${binaryClues.join(' ')}
tk_prompt: ${text('Clues O=0 I=1; N checks')}
tk_fixed: ${text('O/I clues cannot be changed')}
tk_missing: ${text('Fill every dot with 0 or 1')}
tk_count: ${text('Need three 0/1 in each line')}
tk_run: ${text('No three equal neighbors')}
tk_duplicate: ${text('Rows/columns must differ')}
tk_win: ${text('Balanced, distinct: solved!')}`;
const ribbonEnds=Array.from({length:25},(_,i)=>[0,7].includes(i)?1:[6,18].includes(i)?2:[17,24].includes(i)?3:0);
const ribbon=`game_reset: W -3658 249 M I 3300 M J @np_ends M K 25
np_init: R E J W I E I I 1 I J 1 I K -1 N K Z J np_init M I 3340 M K 25
np_prev_clear: W I -1 I I 1 I K -1 N K Z J np_prev_clear W 3400 Z W 3401 Z W 3402 Z W 3200 Z W 3201 -1 W 3202 -1 W game_message @np_pick J np_render
game_move: R E game_status N E Z O S P W 3203 A R E 3200 ifn E Z J np_extend end M I @np_ends A I A R E I ife E Z W game_message @np_endpoint O S P end W 3200 E W 3201 A W 3202 A M I 3399 A I E W I Z M L Z
np_erase: M I 3300 A I L R E I R F 3200 ife E F M I @np_ends A I L R E I ife E Z M I 3300 A I L W I Z M I 3340 A I L W I -1 end end I L 1 ifl L 25 J np_erase end C S game_count_move W game_message @np_route J np_render
np_extend: R A 3202 M B 5 C S app_div M G A M H C R A 3203 C S app_div S G A F G A S H C F H A A G H ifn G 1 W game_message @np_adjacent O S P end R A 3203 M I 3300 A I A R E I ifn E Z R F 3200 ifn E F W game_message @np_cross O S P end M I @np_ends A I A R E I ife E Z W game_message @np_cross O S P end R E 3201 ife E A W game_message @np_cross O S P end M I 3399 A I F W I 1 W 3200 Z C S game_count_move C S np_check J np_render end M I 3300 A I A R E 3200 W I E M I 3340 A I A R E 3202 W I E W 3202 A C S game_count_move W game_message @np_route J np_render
game_key: E A 1 J np_undo E A -26 J np_undo M A Z O S P
np_undo: R E game_status ifn E Z M A Z O S P end R E 3200 ife E Z W game_message @np_pick M A 1 O S P end R E 3202 R F 3201 ife E F W 3200 Z W game_message @np_pick else M I 3300 A I E W I Z M I 3340 A I E R F I W I -1 W 3202 F W game_message @np_route end C S game_count_move C S np_render M A 1 O S P
np_check: M I 3400 M K 3
np_complete: R E I ife E Z W game_message @np_pick O S P end I I 1 I K -1 N K Z J np_complete M I 3300 M K 25
np_full: R E I ife E Z W game_message @np_gaps O S P end I I 1 I K -1 N K Z J np_full W game_status 1 W game_message @np_win O S P
np_render: M L Z
np_cell: M I @np_ends A I L R E I ifn E Z A E 64 else M I 3300 A I L R E I ife E Z M E 46 else A E 96 end end R F 3200 ifn F Z R F 3202 ife F L M E 64 end end M I game_board A I L W I E I L 1 ifl L 25 J np_cell end O S P
np_ends: ${ribbonEnds.join(' ')}
np_pick: ${text('Join A-A B-B C-C; fill dots')}
np_endpoint: ${text('Start at an A/B/C endpoint')}
np_route: ${text('@ head: adjacent dot or end')}
np_adjacent: ${text('One orthogonal step at once')}
np_cross: ${text('No crossing or own loops')}
np_gaps: ${text('Pairs joined; dots remain')}
np_win: ${text('Three ribbons cover all!')}
${POSITIVE_DIVISION}`;
const floodInitial=[3,0,3,3,2,0,2,2,2,1,3,1,3,2,0,2,0,2,0,1,1,3,1,0,3];
const flood=`game_cell_style: M A B ifge A 97 ifle A 100 S A 32 end end ifl A 65 O S P end ifg A 68 O S P end S A 64 P A 729 A A B O S P
game_reset: W -3657 -8297 W -3656 8177 W -3655 -8297 W -3654 249 W -3653 -8297 W -3652 6475 W -3651 -8297 W -3650 4440 W -3658 8177 M I 3300 M J @fl_initial M K 25
fl_init: R E J W I E I I 1 I J 1 I K -1 N K Z J fl_init M I 3340 M K 25
fl_blank: W I Z I I 1 I K -1 N K Z J fl_blank W 3340 1 R E 3300 W 3200 E C S fl_spread W game_message @fl_prompt J fl_render
game_move: R E game_status N E Z O S P ifge A 25 ifge A 29 W game_message @fl_budget O S P end S A 25 else M I 3300 A I A R A I end R E 3200 ife A E W game_message @fl_same O S P end W 3200 A M L Z
fl_recolor: M I 3340 A I L R E I ifn E Z M I 3300 A I L R E 3200 W I E end I L 1 ifl L 25 J fl_recolor end C S fl_spread C S game_count_move R E 3202 ife E 25 W game_status 1 W game_message @fl_win else R E game_moves ifge E 8 W game_status 2 W game_message @fl_lose else W game_message @fl_prompt end end J fl_render
; Queue all territory cells, then add each newly reached tile once.
fl_spread: W 3201 Z W 3202 Z M L Z
fl_seed: M I 3340 A I L R E I ifn E Z R E 3202 M I 3380 A I E W I L I E 1 W 3202 E end I L 1 ifl L 25 J fl_seed end
fl_queue: R E 3201 R F 3202 ifge E F O S P end M I 3380 A I E R L I I E 1 W 3201 E M A L M B 5 C S app_div W 3203 A W 3204 C ifg A Z M G L S G 5 C S fl_add end R E 3203 ifl E 4 M G L A G 5 C S fl_add end R E 3204 ifg E Z M G L I G -1 C S fl_add end R E 3204 ifl E 4 M G L I G 1 C S fl_add end J fl_queue
fl_add: M I 3340 A I G R E I ifn E Z O S P end M I 3300 A I G R E I R F 3200 ifn E F O S P end M I 3340 A I G W I 1 R E 3202 M I 3380 A I E W I G I E 1 W 3202 E O S P
fl_render: M L Z
fl_cell: M I 3300 A I L R E I A E 65 M I 3340 A I L R F I ifn F Z A E 32 end M I game_board A I L W I E I L 1 ifl L 25 J fl_cell end W 2925 65 W 2926 66 W 2927 67 W 2928 68 R E game_moves M F 56 S F E W 2929 F O S P
fl_initial: ${floodInitial.join(' ')}
fl_prompt: ${text('Lowercase is yours; 8 turns')}
fl_budget: ${text('Last digit: turns remaining')}
fl_same: ${text('Pick a different color A-D')}
fl_win: ${text('Whole mosaic in one color!')}
fl_lose: ${text('Eight turns; mosaic remains')}
${POSITIVE_DIVISION}`;
export const MICRO_PUZZLES:BoardSoftware[]=[
{number:320,kind:'board',id:'pocket-amazons',site:'chess',title:'Pocket Amazons',columns:5,rows:5,stepKey:'n',counterLabel:'Turns',controls:'Enter:move/shoot N:undo',inputs:['Local players','Queen and arrow'],outputs:['Blocked squares','Last mobile side'],description:'Local players share the keyboard, A first. Select your queen, move along a clear horizontal, vertical or diagonal ray to +, then shoot an arrow along another clear queen ray. The arrow becomes a permanent # wall; the vacated source may be shot. A turn counts only after the shot. N cancels selection or returns an uncommitted queen move. You win when the other side has no legal queen move. Selected queens are lowercase. R restores the board; F1 exits.',algorithm:amazons,examples:[{"moves":[24,14,22,0,2,10,14,24,0,4,16,4,24,19,1,2,6,7,19,18,19,6,12,13,20,21,20,16,17,11,18,24,23,12,6,18,21,16,12,6,2,3,16,21,16,2,6,2,21,15,21,6,5,6],"steps":0,"board":"#####B##..####.A#B######A","status":2,"movesMade":18}]},
{number:321,kind:'board',id:'courtyard-blocks',site:'miniature',title:'Courtyard Klotski',columns:4,rows:5,stepKey:'n',counterLabel:'Moves',controls:'Enter:pick WASD:slide N:off',inputs:['Whole block','Slide direction'],outputs:['Gate passage','Collision check'],description:'Move the 2 by 2 X block to the bottom two rows, centered in the middle two columns: the courtyard gate. Enter selects a whole rectangle, shown lowercase. W/A/S/D slide it one square up/left/down/right; every block can move along either axis. Blocks cannot rotate, overlap or cross a wall. A-D are vertical two-cell blocks, E is horizontal, and dots are empty floor. Enter the same block or N to unselect. R restores the authored puzzle; F1 exits.',algorithm:courtyard,examples:[{"moves":[13],"steps":0,"board":"A..BAXXBCXXDCeeD....","status":0,"movesMade":0}]},
{number:322,kind:'board',id:'binary-balance',site:'masks',title:'Binary Balance',columns:6,rows:6,stepKey:'n',counterLabel:'Edits',controls:'Enter:./0/1 N:check',inputs:['Binary marks'],outputs:['Balance and runs','Distinct lines'],description:'Complete a 6 by 6 binary grid. Every row and column must contain three zeros and three ones, never three equal consecutive digits. No two rows may match; no two columns may match. O is a locked zero and I a locked one; ordinary 0/1 are your editable marks. Enter cycles dot, zero, one. N checks all rules and explains the first conflict. The authored clues have one solution. R clears your marks; F1 exits.',algorithm:binary,examples:[{"moves":[0,1,2,2,4,4,6,7,9,9,10,12,12,14,16,16,17,18,19,19,21,22,22,23,23,24,24,25,26,26,27,27,29,30,30,32,33,33,34,35],"steps":1,"board":"001O1I00I10I1I0O1001O0111011O01I0100","status":1,"movesMade":40}]},
{number:323,kind:'board',id:'ribbon-pairs',site:'stitch',title:'Ribbon Pairs',columns:5,rows:5,stepKey:'n',counterLabel:'Edits',controls:'Enter:start/extend N:back',inputs:['Endpoint pair','Adjacent steps'],outputs:['Three paths','Full coverage'],description:'Join A to A, B to B and C to C with three paths that cover every square. Enter an endpoint to start; @ is your current head. Enter an adjacent dot to extend orthogonally, then the matching other endpoint to finish. Paths cannot cross or revisit cells. N backs up one step, or cancels at the start. To revise a completed path, enter either endpoint to clear that path and start again. Uppercase letters are endpoints; lowercase letters trace completed portions. R resets; F1 exits.',algorithm:ribbon,examples:[{"moves":[0,1,2,3,4,9,8,7,6,5,10,11,12,13,14,19,18,17,16,15,20,21,22,23,24],"steps":0,"board":"AaaaabBAaabbbbbccCBbccccC","status":1,"movesMade":25}]},
{number:324,kind:'board',id:'flood-mosaic',cellStyle:true,site:'pottery',title:'Flood Mosaic',columns:5,rows:6,counterLabel:'Turns',controls:'Enter:choose color R:reset',inputs:['Color A/B/C/D'],outputs:['Flooded region','Turn budget'],description:'Grow the territory connected to the upper-left tile until it covers the 5 by 5 mosaic, in at most eight turns. Lowercase tiles belong to you. Enter a color in the bottom A/B/C/D palette, or choose any field tile of that color. Your whole territory changes to that color and absorbs every connected matching neighbor through shared edges. Diagonal contact does not connect. Choosing the current color spends no turn. The bottom-right digit shows remaining turns. R replays the same solvable mosaic; F1 exits.',algorithm:flood,examples:[{"moves":[25,27,26,25,27,26,28],"steps":0,"board":"dddddddddddddddddddddddddABCD1","status":1,"movesMade":7}]},
];
