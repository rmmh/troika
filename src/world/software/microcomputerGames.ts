import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const recipes=[['AB','CD','EF','ACE','BDF','AF','BCD','BE'],['ABC','DE','F','AD','BE','CF','AE','BCD'],['A','BC','DEF','AB','CE','DF','ACF','BDE']];
export const MICROCOMPUTER_GAMES:BoardSoftware[]=[
{number:222,kind:'board',id:'bus-pilot',site:'nightbus',title:'Bus Pilot',columns:6,rows:8,stepKey:'n',counterLabel:'Ticks',controls:'Enter:edit N:step G:run',inputs:['Instructions','Step/run'],outputs:['Bus route','Visited stops','Run feedback'],description:'Program a bus to visit A, B and C, then return to garage G. The arrow is the bus; visited stops become lowercase. The bottom two rows hold twelve instructions. Enter cycles a slot through blank, F forward, L left, R right, J jump to first slot, S stop. A lowercase instruction marks the next slot. N executes one instruction; G runs until success or a fault. Walls collide, blanks stop, and execution stops after 64 ticks to expose loops. B rewinds while keeping your program; editing also rewinds. R clears the program. Start facing right. Hint: each side of this block is three forward steps; a repeated right turn can tour it. F1 exits.',
algorithm:`game_reset: M I 3300 M E 12
bus_clear: W I Z I I 1 I E -1 N E Z J bus_clear
bus_rewind: W 3200 7 W 3201 1 W 3202 Z W 3203 Z W 3204 Z W 3205 Z W game_moves Z W game_status Z W game_message @bus_prompt J bus_render
game_move: ifl A 36 W game_message @bus_bottom O S P end S A 36 M I 3300 A I A R E I I E 1 ife E 6 M E Z end W I E J bus_rewind
game_key: E A 1 J bus_step_key E A -26 J bus_step_key E A -7 J bus_run_key E A -34 J bus_run_key E A -12 J bus_rewind_key E A -39 J bus_rewind_key M A Z O S P
bus_rewind_key: C S bus_rewind M A 1 O S P
bus_step_key: C S bus_tick M A 1 O S P
bus_run_key: R E game_status ifn E Z M A Z O S P end
bus_run_loop: C S bus_tick R E game_status E E Z J bus_run_loop M A 1 O S P
bus_tick: R E game_status N E Z O S P R G 3202 ifge G 12 J bus_stopped end M I 3300 A I G R H I C S game_count_move I G 1 W 3202 G ife H Z J bus_stopped end ife H 5 J bus_stopped end ife H 4 W 3202 Z J bus_tick_done end R G 3201 ife H 2 I G -1 ifl G Z M G 3 end W 3201 G J bus_tick_done end ife H 3 I G 1 ife G 4 M G Z end W 3201 G J bus_tick_done end M I @bus_delta A I G R E I R G 3200 A G E M I @bus_map A I G R E I ife E 35 W game_status 2 W game_message @bus_crash J bus_render end W 3200 G ife G 10 W 3203 1 end ife G 28 W 3204 1 end ife G 25 W 3205 1 end ife G 7 R E 3203 R F 3204 A E F R F 3205 A E F ife E 3 W game_status 1 W game_message @bus_win J bus_render end end
bus_tick_done: R E game_moves ifge E 64 W game_status 2 W game_message @bus_loop J bus_render end C S bus_message J bus_render
bus_stopped: W game_status 2 W game_message @bus_stop J bus_render
bus_message: M I 3400 M J @bus_next M K 22
bus_message_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bus_message_copy R A 3202 I A 1 M B 10 C S app_div A A 48 W 3405 A A C 48 W 3406 C R E 3203 R F 3204 A E F R F 3205 A E F A E 48 W 3415 E W game_message 3400 O S P
bus_render: M I game_board M J @bus_map M K 36
bus_map_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J bus_map_copy R E 3203 ifn E Z W 2910 97 end R E 3204 ifn E Z W 2928 98 end R E 3205 ifn E Z W 2925 99 end R E 3200 M I game_board A I E R E 3201 M J @bus_arrows A J E R E J W I E M L Z
bus_slot: M I 3300 A I L R E I M J @bus_symbols A J E R E J R F 3202 ife F L ifge E 65 A E 32 end end M I 2936 A I L W I E I L 1 ifl L 12 J bus_slot end O S P
bus_map: ${text('######'+'#G..A#'+'#.##.#'+'#.##.#'+'#C..B#'+'######')}
bus_symbols: 46 70 76 82 74 83
bus_arrows: 94 62 118 60
bus_delta: -6 1 6 -1
bus_next: ${text('Next 01; stops 0/3    ')}
bus_prompt: ${text('Edit bottom 12 cells; G:run')}
bus_bottom: ${text('Edit the two bottom rows')}
bus_crash: ${text('Wall collision; B rewinds')}
bus_stop: ${text('Stopped short; B rewinds')}
bus_loop: ${text('64 ticks: loop? B rewinds')}
bus_win: ${text('All stops served; home!')}
${POSITIVE_DIVISION}`,
examples:[{moves:[36],steps:1,board:'######'+'#G>.A#'+'#.##.#'+'#.##.#'+'#C..B#'+'######'+'F...........',status:0,movesMade:1}]},
{number:223,kind:'board',id:'pantry-cover',site:'mushroom',title:'Pantry Cover',columns:8,rows:8,stepKey:'n',counterLabel:'Edits',controls:'Enter:recipe N:check P:next',inputs:['Recipes','Puzzle choice'],outputs:['Ingredient use','Complete meal'],description:'Choose recipes that use every pantry ingredient exactly once. Ingredients A mushrooms, B rice, C beans, D greens, E onion, F broth each have one portion. Rows 1..8 are recipes: letters show their ingredients, dots ingredients they do not use. Enter anywhere on a row toggles it; a star marks a chosen recipe. The message lists overlapping ingredients first, otherwise missing ones. N checks the meal and freezes a complete solution. P starts the next of three authored pantries; R returns to pantry one. Different recipe combinations may work. F1 exits.',
algorithm:`game_reset: W 3200 Z J pantry_clear
pantry_clear: M I 3201 M E 8
pantry_clear_loop: W I Z I I 1 I E -1 N E Z J pantry_clear_loop W game_status Z W game_moves Z J pantry_render
game_move: R E game_status N E Z O S P M B 8 C S app_div M I 3201 A I A R E I M F 1 S F E W I F C S game_count_move J pantry_render
game_key: E A 1 J pantry_check E A -26 J pantry_check E A 3 J pantry_next E A -24 J pantry_next M A Z O S P
pantry_next: R E 3200 I E 1 ife E 3 M E Z end W 3200 E C S pantry_clear M A 1 O S P
pantry_check: R E game_status ifn E Z M A Z O S P end C S pantry_render M I 3300 M K 6
pantry_verify: R E I ifn E 1 M A 1 O S P end I I 1 I K -1 N K Z J pantry_verify W game_status 1 M I 3400 M J @pantry_win M K 18
pantry_win_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J pantry_win_copy R E 3200 A E 49 W 3407 E W game_message 3400 M A 1 O S P
pantry_render: M I 3300 M E 6
pantry_zero: W I Z I I 1 I E -1 N E Z J pantry_zero R G 3200 P G 48 A G @pantry_data M L Z
pantry_row: M I game_board M E L P E 8 A I E M E L A E 49 W I E M I/1 46 M J 3201 A J L R H J ifn H Z M I/1 42 end I I 2 M K Z
pantry_ingredient: R E G I G 1 M F 46 ifn E Z M F 65 A F K ifn H Z M J 3300 A J K R E J I E 1 W J E end end W I F I I 1 I K 1 ifl K 6 J pantry_ingredient end I L 1 ifl L 8 J pantry_row end
 M I 3400 M J @pantry_missing M K 13
pantry_message_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J pantry_message_copy R E 3200 A E 49 W 3401 E M L Z
pantry_has_overlap: M I 3300 A I L R E I ifg E 1 J pantry_overlap end I L 1 ifl L 6 J pantry_has_overlap end M H Z J pantry_list
pantry_overlap: M I 3403 M J @pantry_overlap_word M K 9
pantry_overlap_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J pantry_overlap_copy M H 1
pantry_list: M L Z M J 3412
pantry_list_loop: M I 3300 A I L R E I ife H Z ifn E Z J pantry_list_skip end else ifle E 1 J pantry_list_skip end end M E 65 A E L W J E I J 1
pantry_list_skip: I L 1 ifl L 6 J pantry_list_loop end ife J 3412 M E 45 W J E I J 1 end W J Z W game_message 3400 O S P
pantry_data: ${recipes.flatMap(rows=>rows.flatMap(row=>[...'ABCDEF'].map(c=>+row.includes(c)))).join(' ')}
pantry_missing: ${text('P1 missing: ')}
pantry_overlap_word: ${text('overlap: ')}
pantry_win: ${text('Pantry 1 covered!')}
${POSITIVE_DIVISION}`,
examples:[{moves:[0],board:'1*AB....'+'2...CD..'+'3.....EF'+'4.A.C.E.'+'5..B.D.F'+'6.A....F'+'7..BCD..'+'8..B..E.',status:0,movesMade:1}]},
];
