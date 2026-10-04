import { BASIC_SIMULATIONS } from './basicSimulations';
import { BASIC_GAMES } from './basicGames';
import { LOGIC_GAMES } from './logicGames';
import { IMAGE_TOOLS } from './imageTools';
import { MINESWEEPER_SOFTWARE } from './minesweeper';
import { REVERSI_SOFTWARE } from './reversi';
import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
import { MORE_BOARD_SOFTWARE } from './moreBoards';
import { GRAPHICS_SOFTWARE } from './graphics';
import { SIMULATION_SOFTWARE } from './simulations';

const literal = (s:string) => [...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const board = (size:number, pieces:Record<number,string>) => Array.from({length:size},(_,i)=>pieces[i]??'.').join('');

export const BOARD_SOFTWARE: BoardSoftware[] = [
  {
    number:47,kind:'board',id:'lights-out',site:'lantern',title:'Lights Out',columns:5,rows:5,
    description:'Turn every light (*) off. Playing a square flips it and its orthogonal neighbors; dots are dark. A fixed solvable five-switch scramble restarts with R. Arrows or Tab select, Enter or Space plays, and F1 returns to programs.',
    inputs:['Selected square'],outputs:['Lights','Moves','Solved'],
    algorithm:`game_reset: M I game_board M E 25
lights_clear: W I 46 I I 1 I E -1 N E Z J lights_clear
 M A Z C S lights_cross M A 6 C S lights_cross M A 12 C S lights_cross M A 18 C S lights_cross M A 24 C S lights_cross
 W game_message @lights_prompt O S P
game_move: R E game_status N E Z O S P C S lights_cross C S game_count_move
 M I game_board M E 25
lights_check: R F I E F 42 O S P I I 1 I E -1 N E Z J lights_check
 W game_status 1 W game_message @lights_won O S P
lights_cross: M G A M B 5 C S app_div M H C M J A M A G C S lights_flip
 ifg H Z M A G I A -1 C S lights_flip end ifl H 4 M A G I A 1 C S lights_flip end
 ifg J Z M A G I A -5 C S lights_flip end ifl J 4 M A G I A 5 C S lights_flip end O S P
lights_flip: M I game_board A I A R F I M E 88 S E F W I E O S P
lights_prompt: ${literal('Turn every light off')}
lights_won: ${literal('All lights out!')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,6,12,18,24],board:'.'.repeat(25),status:1,movesMade:5}, {moves:[0,6,12,18,24,12],board:'.'.repeat(25),status:1,movesMade:5}],
  },
  {
    number:48,kind:'board',id:'noughts-crosses',site:'hexclub',title:'Noughts and Crosses',columns:3,rows:3,
    description:'Two people share the keyboard: X starts, then O. Make a row, column or diagonal of three. Occupied squares are ignored; a win or full-board draw ends play until R resets. Arrows or Tab select, Enter or Space places a mark, F1 exits.',
    inputs:['Selected square'],outputs:['Board','Turn or winner','Moves'],
    algorithm:`game_reset: M I game_board M E 9
noughts_clear: W I 46 I I 1 I E -1 N E Z J noughts_clear W 3000 88 W game_message @noughts_x O S P
game_move: R E game_status N E Z O S P M I game_board A I A R E I N E 46 O S P R G 3000 W I G C S game_count_move
 M J @noughts_lines M K 8
noughts_line: R E J M I game_board A I E R E I N E G J noughts_next
 M E J/1 M I game_board A I E R E I N E G J noughts_next
 M E J/2 M I game_board A I E R E I N E G J noughts_next
 ife G 88 W game_status 1 W game_message @noughts_xwin else W game_status 2 W game_message @noughts_owin end O S P
noughts_next: I J 3 I K -1 N K Z J noughts_line
 R E game_moves ife E 9 W game_status 3 W game_message @noughts_draw O S P end
 M E 167 S E G W 3000 E ife E 88 W game_message @noughts_x else W game_message @noughts_o end O S P
noughts_lines: 0 1 2 3 4 5 6 7 8 0 3 6 1 4 7 2 5 8 0 4 8 2 4 6
noughts_x: ${literal('X to play')}
noughts_o: ${literal('O to play')}
noughts_xwin: ${literal('X wins!')}
noughts_owin: ${literal('O wins!')}
noughts_draw: ${literal('Draw - R starts again')}`,
    examples:[{moves:[0,3,1,4,2,8],board:'XXXOO....',status:1,movesMade:5}, {moves:[0,1,3,4,8,7],board:'XO.XO..OX',status:2,movesMade:6}, {moves:[0,1,2,4,3,5,7,6,8],board:'XOXXOOOXX',status:3,movesMade:9}, {moves:[0,0,4],board:'X...O....',status:0,movesMade:2}],
  },
  {
    number:49,kind:'board',id:'eight-puzzle',site:'puzzlebox',title:'Eight Tile Puzzle',columns:3,rows:3,
    description:'Slide a numbered tile into the adjacent dot until the board reads 123/456/78. The fixed scramble is six legal moves from solved. Diagonal and nonadjacent tiles are ignored. Arrows or Tab select, Enter or Space slides, R restarts, F1 exits.',
    inputs:['Selected tile'],outputs:['Board','Moves','Solved'],
    algorithm:`game_reset: M I game_board M J @tiles_initial M E 9
tiles_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J tiles_copy W 3000 4 W game_message @tiles_prompt O S P
game_move: R E game_status N E Z O S P M G A M B 3 C S app_div M H A M J C
 R A 3000 C S app_div S A H F A A S C J F C A A A C N A 1 O S P
 M I game_board A I G R E I M J game_board R F 3000 A J F W J E W I 46 W 3000 G C S game_count_move
 M I game_board M E 49 M H 8
tiles_check: R F I N F E O S P I I 1 I E 1 I H -1 N H Z J tiles_check
 W game_status 1 W game_message @tiles_won O S P
tiles_initial: 49 50 51 52 46 56 55 54 53
tiles_prompt: ${literal('Goal: 123 / 456 / 78.')}
tiles_won: ${literal('Puzzle solved!')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[5,8,7,4,5,8],board:'12345678.',status:1,movesMade:6}, {moves:[0,8,4],board:'1234.8765',status:0,movesMade:0}, {moves:[5,4],board:'1234.8765',status:0,movesMade:2}],
  },
  {
    number:50,kind:'board',id:'eight-queens',site:'chess',title:'Eight Queens',columns:8,rows:8,
    description:'Place eight queens with no shared row, column or diagonal. Attacking placements are refused. Play an existing Q to remove it, including after solving. Arrows or Tab select, Enter or Space toggles a queen, R clears, F1 exits.',
    inputs:['Selected square'],outputs:['Queens','Moves','Solved'],
    algorithm:`game_reset: M I game_board M E 64
queens_clear: W I 46 I I 1 I E -1 N E Z J queens_clear W 3000 Z W game_message @queens_prompt O S P
game_move: W 3001 A M I game_board A I A R E I
 ife E 81 W I 46 R E 3000 I E -1 W 3000 E W game_status Z W game_message @queens_prompt J game_count_move end
 M B 8 C S app_div M G A M H C M K Z
queens_scan: M I game_board A I K R E I
 ife E 81 M A K C S app_div E A G J queens_bad E C H J queens_bad S A G F A A S C H F C A E A C J queens_bad end
 I K 1 ifl K 64 J queens_scan end
 M I game_board R E 3001 A I E W I 81 R E 3000 I E 1 W 3000 E W game_message @queens_prompt
 ife E 8 W game_status 1 W game_message @queens_won end J game_count_move
queens_bad: W game_message @queens_attack O S P
queens_prompt: ${literal('Place eight safe queens')}
queens_attack: ${literal('That square is attacked')}
queens_won: ${literal('Eight queens: solved')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,12,23,29,34,46,49,59],board:board(64,{0:'Q',12:'Q',23:'Q',29:'Q',34:'Q',46:'Q',49:'Q',59:'Q'}),status:1,movesMade:8}, {moves:[0,1,8,9,12],board:board(64,{0:'Q',12:'Q'}),status:0,movesMade:2}, {moves:[0,0],board:'.'.repeat(64),status:0,movesMade:2}],
  },
  ...MORE_BOARD_SOFTWARE,
  ...SIMULATION_SOFTWARE,
  ...GRAPHICS_SOFTWARE,
  REVERSI_SOFTWARE,
  MINESWEEPER_SOFTWARE,
  ...IMAGE_TOOLS,
  ...LOGIC_GAMES,
  ...BASIC_GAMES,
  ...BASIC_SIMULATIONS,
];
