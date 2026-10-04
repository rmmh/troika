import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const copy=`hood_copy: M I game_board M J @hood_initial M K game_cells
hood_copy_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J hood_copy_loop O S P`;
export const NEIGHBORHOOD_CREATIVE:BoardSoftware[]=[
{number:206,kind:'board',id:'three-ink-print',site:'matchbox',title:'Three-Ink Print',columns:8,rows:8,stepKey:'n',counterLabel:'Edits',controls:'Enter:ink N:layer/proof',inputs:['Ink square','N: next view'],outputs:['Three layers','Overprint proof'],description:'Print with separate yellow Y, magenta M and cyan C ink plates. Enter adds or removes ink on the active plate; N cycles Y, M, C, then the combined proof. Editing is disabled while viewing the proof. The proof uses letters for subtractive mixtures: Y+M=R red, Y+C=G green, M+C=B blue, and all three=K black. A dot is bare paper. Plate views tint the display with their ink color. R clears all three plates; F1 exits.',
algorithm:`game_reset: W 3200 Z M I 3000 M K 192
ink_clear: W I Z I I 1 I K -1 N K Z J ink_clear J ink_render
game_key: E A 1 J ink_next E A -26 J ink_next M A Z O S P
ink_next: R E 3200 I E 1 ife E 4 M E Z end W 3200 E C S ink_render M A 1 O S P
game_move: R E 3200 E E 3 O S P P E 64 A E 3000 A E A R F E M G 1 S G F W E G C S game_count_move
ink_render: R E 3200 M I @ink_messages A I E R F I W game_message F M I @ink_colors A I E R F I W -3658 F M G Z
ink_cell: R H 3200 ife H 3 M I 3000 A I G R E I M F I/64 P F 2 A E F M F I/128 P F 4 A E F M I @ink_mix A I E R E I else M I 3000 P H 64 A I H A I G R E I ife E Z M E 46 else R H 3200 M I @ink_letters A I H R E I end end M I game_board A I G W I E I G 1 ifl G 64 J ink_cell end O S P
ink_letters: ${ascii('YMC')}
ink_mix: ${ascii('.YMRCGBK')}
ink_colors: 9815 9139 -9113 9841
ink_messages: @ink_y @ink_m @ink_c @ink_proof
ink_y: ${ascii('Yellow plate. N: next view')}
ink_m: ${ascii('Magenta plate. N: next view')}
ink_c: ${ascii('Cyan plate. N: proof')}
ink_proof: ${ascii('Proof: R G B K are mixtures')}`,
examples:[{moves:[0],board:'Y'+'.'.repeat(63),status:0,movesMade:1},{moves:[0],steps:3,board:'Y'+'.'.repeat(63),status:0,movesMade:1}]},
{number:207,kind:'board',id:'one-stroke-walk',site:'jun',title:'One-Stroke Walk',columns:5,rows:5,counterLabel:'Edges',controls:'Enter:walk R:restart',inputs:['Next junction'],outputs:['Unused streets','Current junction'],description:'Walk every street exactly once. Enter on any letter A..I to start, then enter on a connected junction to walk there. Streets are the horizontal, vertical and two diagonal marks between letters. Used streets become dots; visited junctions become lowercase and @ marks where you stand. Junctions may be revisited, but a street may not. If you run out of unused exits before all fourteen streets are walked, the attempt ends. R restarts and F1 exits.',
algorithm:`game_reset: C S hood_copy W 3200 -1 M I 3000 M K 14
walk_clear: W I Z I I 1 I K -1 N K Z J walk_clear W game_message @walk_start O S P
game_move: R E game_status N E Z O S P M I @walk_vertices A I A R H I ifl H Z O S P end R G 3200 ifl G Z W 3200 H M I game_board A I A W I 64 W game_message @walk_prompt O S P end M L Z M J @walk_edges
walk_find: M I 3000 A I L R E I ifn E Z J walk_next end R E J M F J/1 ife E G ife F H J walk_accept end end ife F G ife E H J walk_accept end end
walk_next: I L 1 I J 3 ifl L 14 J walk_find end W game_message @walk_invalid O S P
walk_accept: W I 1 M E J/2 M I game_board A I E W I 46 M I @walk_squares A I G R E I M I game_board A I E M E G A E 97 W I E M I @walk_squares A I H R E I M I game_board A I E W I 64 W 3200 H C S game_count_move R E game_moves ife E 14 W game_status 1 W game_message @walk_win O S P end M J @walk_edges M L Z
walk_exits: M I 3000 A I L R E I ife E Z R E J M F J/1 ife E H W game_message @walk_prompt O S P end ife F H W game_message @walk_prompt O S P end end I J 3 I L 1 ifl L 14 J walk_exits end W game_status 2 W game_message @walk_stuck O S P
hood_initial: ${ascii('A-B-C|/| |D-E-F| |/|G-H-I')}
walk_vertices: 0 -1 1 -1 2 -1 -1 -1 -1 -1 3 -1 4 -1 5 -1 -1 -1 -1 -1 6 -1 7 -1 8
walk_squares: 0 2 4 10 12 14 20 22 24
walk_edges: 0 1 1 1 2 3 3 4 11 4 5 13 6 7 21 7 8 23 0 3 5 1 4 7 2 5 9 3 6 15 4 7 17 5 8 19 1 3 6 5 7 18
walk_start: ${ascii('Choose a starting junction')}
walk_prompt: ${ascii('Follow an unused street')}
walk_invalid: ${ascii('No unused street joins them')}
walk_win: ${ascii('All fourteen streets walked')}
walk_stuck: ${ascii('No exits left. R restarts')}
${copy}`,
examples:[{moves:[0,2],board:'a.@-C|/| |D-E-F| |/|G-H-I',status:0,movesMade:1}]},
{number:208,kind:'board',id:'cardboard-sky',site:'vera',title:'Cardboard Skyline',columns:6,rows:6,stepKey:'n',counterLabel:'Edits',controls:'Enter:height N:check',inputs:['Building height','N: check city'],outputs:['Skyline clues','Solved city'],description:'Build a four-by-four cardboard city inside its clue border. Each row and column must contain heights 1, 2, 3 and 4 once each. A border clue counts buildings visible while looking inward: taller buildings hide shorter ones behind them. Enter on an interior square cycles blank, 1, 2, 3, 4, blank. N checks the entire city, including all sixteen sight lines. Border cells cannot be edited. A correct city locks in place; R clears it and F1 exits.',
algorithm:`game_reset: C S hood_copy W game_message @sky_prompt O S P
game_move: R E game_status N E Z O S P M G A M B 6 C S app_div ifl A 1 O S P end ifg A 4 O S P end ifl C 1 O S P end ifg C 4 O S P end M I game_board A I G R E I ife E 46 M E 49 else I E 1 ife E 53 M E 46 end end W I E C S game_count_move W game_message @sky_prompt O S P
game_key: E A 1 J sky_check E A -26 J sky_check M A Z O S P
sky_check: R E game_status ifn E Z M A Z O S P end W 3200 Z
sky_row: R E 3200 P E 6 M I 2906 A I E R L I S L 48 M H I/5 S H 48 M J I I J 1 M K 1 C S sky_line N A Z J sky_result R E 3200 I E 1 W 3200 E ifl E 4 J sky_row end W 3200 Z
sky_col: R E 3200 M I 2901 A I E R L I S L 48 M H I/30 S H 48 M J 2907 A J E M K 6 C S sky_line N A Z J sky_result R E 3200 I E 1 W 3200 E ifl E 4 J sky_col end W game_status 1 W game_message @sky_win M A 1 O S P
sky_result: ife A -1 W game_message @sky_empty else ife A -2 W game_message @sky_duplicate else W game_message @sky_view end end M A 1 O S P
sky_line: M I 3000 M E 4
sky_clear_seen: W I Z I I 1 I E -1 N E Z J sky_clear_seen M G Z M D Z M C 4
sky_forward: R E J ifl E 49 M A -1 O S P end ifg E 52 M A -1 O S P end M I E S I 49 A I 3000 R F I ifn F Z M A -2 O S P end W I 1 ifg E G M G E I D 1 end A J K I C -1 N C Z J sky_forward ifn D L M A -3 O S P end S J K M G Z M D Z M C 4
sky_backward: R E J ifg E G M G E I D 1 end S J K I C -1 N C Z J sky_backward ifn D H M A -3 O S P end M A Z O S P
hood_initial: ${ascii('#3212#2....22....21....33....1#2231#')}
sky_prompt: ${ascii('Heights 1..4. N checks city')}
sky_empty: ${ascii('Fill all sixteen heights')}
sky_duplicate: ${ascii('A row or column repeats')}
sky_view: ${ascii('A skyline clue disagrees')}
sky_win: ${ascii('Every skyline agrees!')}
${copy}
${POSITIVE_DIVISION}`,
examples:[{moves:[7],board:'#3212#21...22....21....33....1#2231#',status:0,movesMade:1}]},
{number:209,kind:'board',id:'spiro-notebook',site:'kit',title:'Spirograph Notebook',columns:8,rows:8,stepKey:'n',counterLabel:'Plots',controls:'Enter:parameter N:draw',inputs:['Top: step 1..7','Bottom: radius'],outputs:['Closed ink curve'],description:'Explore closed looping curves made by combining two rotating arms. Enter anywhere on the top row cycles the inner arm\'s step from 1 to 7; Enter on the bottom row cycles its radius from 1 to 3. The message shows both settings. Parameter changes clear the old preview; N draws a fresh closed curve. Integer sine/cosine samples and native line drawing join sixteen points. Radius 3 uses only the inner arm; step controls how its points connect. Smaller radii mix both arms. R restores step 3 and radius 1; F1 exits.',
algorithm:`game_reset: W 3300 3 W 3301 1 M I 3200 M J @spiro_caption M K 25
spiro_copy_caption: R E J W I E I I 1 I J 1 I K -1 N K Z J spiro_copy_caption W game_message 3200 J spiro_clear
game_move: ifl A 8 R E 3300 I E 1 ife E 8 M E 1 end W 3300 E J spiro_clear end ifge A 56 R E 3301 I E 1 ife E 4 M E 1 end W 3301 E J spiro_clear end O S P
spiro_clear: M I game_board M K 64
spiro_clear_loop: W I 46 I I 1 I K -1 N K Z J spiro_clear_loop R E 3300 A E 48 W 3205 E R E 3301 A E 48 W 3215 E O S P
game_key: E A 1 J spiro_draw E A -26 J spiro_draw M A Z O S P
spiro_draw: C S spiro_clear W 3302 Z
spiro_point: R J 3302 ife J 16 M J Z end M A J R B 3300 P A B M B 16 C S app_div M H C R L 3301 M G 3 S G L
 M I @spiro_cos A I J R E I P E G M I @spiro_cos A I H R F I P F L A E F Q E 3 I E 3 W 3310 E
 M I @spiro_sin A I J R E I P E G M I @spiro_sin A I H R F I P F L S E F Q E 3 I E 3 W 3311 E
 R E 3302 ife E Z R E 3310 W 3303 E R E 3311 W 3304 E else C S spiro_line end
 R E 3302 I E 1 W 3302 E ifle E 16 J spiro_point end C S game_count_move M A 1 O S P
spiro_line: R G 3303 R H 3304 R J 3310 S J G M L 1 ifl J Z M L -1 end F J A R K 3311 S K H M D 1 ifl K Z M D -1 end F K A M F J S F K
spiro_line_pixel: M I H P I 8 A I G A I game_board W I 42 R A 3310 R B 3311 ife G A ife H B W 3303 G W 3304 H O S P end end M E F P E 2 M B Z S B K ifg E B S F K A G L end ifl E J A F J A H D end J spiro_line_pixel
spiro_caption: ${ascii('Step 3  Radius 1  N:draw')}
spiro_cos: 3 3 2 1 0 -1 -2 -3 -3 -3 -2 -1 0 1 2 3
spiro_sin: 0 1 2 3 3 3 2 1 0 -1 -2 -3 -3 -3 -2 -1
${POSITIVE_DIVISION}`,
examples:[{moves:[],board:'.'.repeat(64),status:0,movesMade:0}]},
];
