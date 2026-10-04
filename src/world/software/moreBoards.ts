import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const text = (s:string) => [...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const knightTour = [0,7,4,13,24,17,20,11,2,5,16,23,14,3,6,15,22,19,8,1,10,21,12,9,18];
const pegSolution = [10,0,12,10,0,12,15,5,18,6,21,11,22,12,5,17,6,18,24,12,12,22,23,21,20,22];

export const MORE_BOARD_SOFTWARE: BoardSoftware[] = [
  {
    number:51,kind:'board',id:'four-in-row',site:'scorebook',title:'Four in a Row',columns:7,rows:6,
    description:'Two players drop X and O into a selected column; X starts. The selected row does not matter. Four connected marks horizontally, vertically or diagonally win. Full columns are ignored. A full board without a line is a draw. R restarts.',
    inputs:['Selected column'],outputs:['Board','Turn or winner','Drops'],
    algorithm:`game_reset: M I game_board M E 42
four_clear: W I 46 I I 1 I E -1 N E Z J four_clear W 3000 88 W game_message @four_x O S P
game_move: R E game_status N E Z O S P M B 7 C S app_div M K C M J 5
four_drop: M I J P I 7 A I K A I game_board R E I ife E 46 J four_place end I J -1 ifge J Z J four_drop end O S P
four_place: R L 3000 W I L C S game_count_move M J Z
four_row: M K Z
four_col: M A J M B K M C Z M D 1 C S four_line E E 1 J four_won
 M A J M B K M C 1 M D Z C S four_line E E 1 J four_won
 M A J M B K M C 1 M D 1 C S four_line E E 1 J four_won
 M A J M B K M C 1 M D -1 C S four_line E E 1 J four_won
 I K 1 ifl K 7 J four_col end I J 1 ifl J 6 J four_row end
 R E game_moves ife E 42 W game_status 3 W game_message @four_draw O S P end
 M E 167 S E L W 3000 E ife E 88 W game_message @four_x else W game_message @four_o end O S P
four_won: ife L 88 W game_status 1 W game_message @four_xwin else W game_status 2 W game_message @four_owin end O S P
four_line: M H 4
four_check: ifl A Z J four_no end ifg A 5 J four_no end ifl B Z J four_no end ifg B 6 J four_no end
 M I A P I 7 A I B A I game_board R F I N F L J four_no A A C A B D I H -1 N H Z J four_check M E 1 O S P
four_no: M E Z O S P
four_x: ${text('X: choose a column')}
four_o: ${text('O: choose a column')}
four_xwin: ${text('X connects four!')}
four_owin: ${text('O connects four!')}
four_draw: ${text('Draw - R starts again')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,1,0,1,0,1,0],board:'.......'+'.......'+'X......'+'XO.....'.repeat(3),status:1,movesMade:7}, {moves:[0,0,0,0,0,0,0],board:'O......'+'X......'+'O......'+'X......'+'O......'+'X......',status:0,movesMade:6}],
  },
  {
    number:52,kind:'board',id:'knight-tour',site:'chess',title:'Knight Tour',columns:5,rows:5,
    description:'Visit every square once with a chess knight: two cells in one direction and one across. Choose any start. K marks the current square and o marks visited squares. Revisits and illegal jumps are ignored. A dead end ends the attempt; R restarts.',
    inputs:['Next square'],outputs:['Tour','Visited squares','Outcome'],
    algorithm:`game_reset: M I game_board M E 25
knight_clear: W I 46 I I 1 I E -1 N E Z J knight_clear W 3000 -1 W game_message @knight_prompt O S P
game_move: R E game_status N E Z O S P W 3001 A M I game_board A I A R E I N E 46 O S P
 M B 5 C S app_div M G A M H C R A 3000
 ifge A Z C S app_div S A G F A A S C H F C A P A C N A 2 O S P end
 R E 3000 ifge E Z M I game_board A I E W I 111 end R E 3001 W 3000 E M I game_board A I E W I 75 C S game_count_move
 R E game_moves ife E 25 W game_status 1 W game_message @knight_won O S P end M K Z
knight_scan: M I game_board A I K R E I
 ife E 46 M A K C S app_div S A G F A A S C H F C A P A C ife A 2 W game_message @knight_prompt O S P end end
 I K 1 ifl K 25 J knight_scan end W game_status 2 W game_message @knight_stuck O S P
knight_prompt: ${text('Visit all 25 squares')}
knight_won: ${text('Complete knight tour!')}
knight_stuck: ${text('No legal jumps - R resets')}
${POSITIVE_DIVISION}`,
    examples:[{moves:knightTour,board:Array.from({length:25},(_,i)=>i===18?'K':'o').join(''),status:1,movesMade:25}, {moves:[0,1,5,6,7,0],board:'o......K.................',status:0,movesMade:2}],
  },
  {
    number:53,kind:'board',id:'triangle-pegs',site:'mancala',title:'Triangle Peg Solitaire',columns:5,rows:5,
    description:'Jump one peg over another into an empty hole, removing the middle peg. Leave one peg. Select a peg (marked *), then a destination two holes away horizontally, vertically or along the down-right diagonal. Select it again to cancel. Blank spaces are outside the board. R restarts.',
    inputs:['Peg then hole'],outputs:['Remaining pegs','Jumps','Solved'],
    algorithm:`game_reset: M G Z M I game_board
pegs_row: M H Z
pegs_col: M E 32 ifle H G M E 111 end W I E I I 1 I H 1 ifl H 5 J pegs_col end I G 1 ifl G 5 J pegs_row end
 W game_board 46 W 3000 -1 W 3002 14 W game_message @pegs_prompt O S P
game_move: R E game_status N E Z O S P W 3001 A R G 3000 M I game_board A I A R E I
 ifl G Z N E 111 O S P W I 42 W 3000 A W game_message @pegs_target O S P end
 ife A G W I 111 W 3000 -1 W game_message @pegs_prompt O S P end N E 46 O S P
 M B 5 C S app_div M H A M J C M A G C S app_div S H A S J C M E H F E A M F J F F A
 ife H Z E F 2 J pegs_middle end ife J Z E E 2 J pegs_middle end ife H J E E 2 J pegs_middle end O S P
pegs_middle: R A 3001 A A G Q A 2 M I game_board A I A R E I N E 111 O S P W I 46 M I game_board A I G W I 46 M I game_board R E 3001 A I E W I 111
 W 3000 -1 C S game_count_move R E 3002 I E -1 W 3002 E W game_message @pegs_prompt ife E 1 W game_status 1 W game_message @pegs_won end O S P
pegs_prompt: ${text('Select a peg to jump')}
pegs_target: ${text('Select hole; same cancels')}
pegs_won: ${text('One peg left - solved!')}
${POSITIVE_DIVISION}`,
    examples:[{moves:pegSolution,board:Array.from({length:25},(_,i)=>i%5>Math.floor(i/5)?' ':i===22?'o':'.').join(''),status:1,movesMade:13}],
  },
  {
    number:54,kind:'board',id:'warehouse',site:'toolshed',title:'Warehouse Box Puzzle',columns:5,rows:5,
    description:'Move @ by selecting a neighboring square. Push the $ box onto the o goal; a box on its goal becomes *. Walls are #. You cannot pull boxes or push through a wall. This compact fixed warehouse has one box. R resets a stuck position.',
    inputs:['Neighbor square'],outputs:['Warehouse','Steps','Solved'],
    algorithm:`game_reset: W 3000 11 W 3001 12 W game_message @soko_prompt J soko_render
game_move: R E game_status N E Z O S P W 3002 A M B 5 C S app_div M G A M H C R A 3000 C S app_div S G A F G A S H C F H A A G H N G 1 O S P
 R A 3002 M I @soko_map A I A R E I E E 35 O S P R G 3001
 ife A G M H A R E 3000 S H E A H A ifl H Z O S P end ifg H 24 O S P end M I @soko_map A I H R E I E E 35 O S P W 3001 H end
 W 3000 A C S game_count_move R E 3001 ife E 8 W game_status 1 W game_message @soko_won end J soko_render
soko_render: M I game_board M J @soko_map M E 25
soko_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J soko_copy
 R E 3001 M I game_board A I E M F 36 E E 8 M F 42 W I F
 R E 3000 M I game_board A I E M F 64 E E 8 M F 43 W I F O S P
soko_map: ${[...'######..o##...##...######'].map(c=>c.charCodeAt(0)).join(' ')}
soko_prompt: ${text('Push $ onto o; @ is you')}
soko_won: ${text('Box delivered!')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[12,17,18,13],board:'#####'+'#..*#'+'#..@#'+'#...#'+'#####',status:1,movesMade:4}, {moves:[0,10,12,13],board:'#####'+'#..o#'+'#.@$#'+'#...#'+'#####',status:0,movesMade:1}],
  },
  {
    number:55,kind:'board',id:'chomp',site:'pepper',title:'Poisoned Chocolate',columns:5,rows:4,
    description:'Two players take turns eating a cookie and every remaining cookie below and to its right. X starts. The top-left ! is poisoned: whoever eats it loses. Dots have already been eaten and cannot be selected. R starts a new bar.',
    inputs:['Cookie square'],outputs:['Chocolate','Turn or winner','Bites'],
    algorithm:`game_reset: M I game_board M E 20
chomp_clear: W I 111 I I 1 I E -1 N E Z J chomp_clear W game_board 33 W 3000 88 W game_message @chomp_x O S P
game_move: R E game_status N E Z O S P M I game_board A I A R E I E E 46 O S P M G A M B 5 C S app_div M H A M J C
chomp_row: M K J
chomp_col: M I H P I 5 A I K A I game_board W I 46 I K 1 ifl K 5 J chomp_col end I H 1 ifl H 4 J chomp_row end C S game_count_move
 R E 3000 M F 167 S F E W 3000 F
 ife G Z ife F 88 W game_status 1 W game_message @chomp_xwin else W game_status 2 W game_message @chomp_owin end O S P end
 ife F 88 W game_message @chomp_x else W game_message @chomp_o end O S P
chomp_x: ${text('X: take a bite, avoid !')}
chomp_o: ${text('O: take a bite, avoid !')}
chomp_xwin: ${text('O ate poison - X wins')}
chomp_owin: ${text('X ate poison - O wins')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[19,0],board:'.'.repeat(20),status:1,movesMade:2}, {moves:[0,19],board:'.'.repeat(20),status:2,movesMade:1}],
  },
  {
    number:56,kind:'board',id:'domineering',site:'hexclub',title:'Domineering',columns:6,rows:6,
    description:'Two players place dominoes on empty squares. X uses horizontal pairs, O vertical pairs. Select the first square (*), then its neighbor; select the first again to cancel. A player with no legal pair loses. R clears the board.',
    inputs:['Domino endpoints'],outputs:['Board','Turn or winner','Dominoes'],
    algorithm:`game_reset: M I game_board M E 36
dom_clear: W I 46 I I 1 I E -1 N E Z J dom_clear W 3000 -1 W 3001 88 W game_message @dom_x O S P
game_move: R E game_status N E Z O S P W 3002 A M I game_board A I A R E I R G 3000
 ife A G W I 46 W 3000 -1 O S P end N E 46 O S P ifl G Z W I 42 W 3000 A O S P end
 R L 3001 M B 6 C S app_div M H A M J C M A G C S app_div S H A F H A S J C F J A
 ife L 88 N H Z O S P N J 1 O S P else N H 1 O S P N J Z O S P end
 M I game_board A I G W I L M I game_board R E 3002 A I E W I L W 3000 -1 C S game_count_move M E 167 S E L W 3001 E M L E M K Z
 ife L 88 W game_message @dom_x else W game_message @dom_o end
dom_scan: M I game_board A I K R E I ife E 46
 M A K C S app_div
 ife L 88 ifl C 5 I I 1 R E I E E 46 O S P end else ifl A 5 A I 6 R E I E E 46 O S P end end
 end I K 1 ifl K 36 J dom_scan end
 ife L 88 W game_status 2 W game_message @dom_owin else W game_status 1 W game_message @dom_xwin end O S P
dom_x: ${text('X: choose horizontal pair')}
dom_o: ${text('O: choose vertical pair')}
dom_xwin: ${text('O has no pair - X wins')}
dom_owin: ${text('X has no pair - O wins')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,1,2,8,3,4],board:'XXOXX.'+'..O...' + '.'.repeat(24),status:0,movesMade:3}, {moves:[0,0],board:'.'.repeat(36),status:0,movesMade:0}],
  },
];
