import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const LOGIC_GAMES:BoardSoftware[] = [
  {
    number:148,kind:'board',id:'codebreaker',site:'riddles',title:'Four-Peg Codebreaker',columns:8,rows:8,stepKey:'n',counterLabel:'Tries',controls:'Enter:peg N:submit R:reset',
    description:'Crack a fixed four-peg practice code in eight guesses. Digits 1..6 are colors and repetitions are allowed. Enter cycles a peg in the first four cells of the active row. N submits it: B counts exact matches, W counts correct colors in wrong positions, with each secret peg counted at most once. A new row starts as 1111. Winning or exhausting eight rows ends play; R restarts the same code and F1 exits.',
    inputs:['Four peg colors','N: submit guess'],outputs:['B/W feedback','Tries','Win or loss'],
    algorithm:`game_reset: M I game_board M E 64
code_clear: W I 46 I I 1 I E -1 N E Z J code_clear W 3200 Z W game_message @code_prompt J code_new_row
code_new_row: R E 3200 W board_row E W board_col Z P E 8 M I game_board A I E M E 4
code_ones: W I 49 I I 1 I E -1 N E Z J code_ones O S P
game_move: R E game_status N E Z O S P M B 8 C S app_div R E 3200 N A E O S P ifge C 4 O S P end M I E P I 8 A I C A I game_board R E I I E 1 ifg E 54 M E 49 end W I E O S P
game_key: E A 1 J code_submit E A -26 J code_submit M A Z O S P
code_submit: R E game_status ifn E Z M A Z O S P end R G 3200 P G 8 A G game_board M J Z M K Z
code_exact: M I G A I J R E I M I @code_secret A I J R F I ife E F I K 1 end I J 1 ifl J 4 J code_exact end W 3201 K M H 49 M L Z
code_color: M J Z M K Z M D Z
code_tally: M I G A I J R E I ife E H I K 1 end M I @code_secret A I J R E I ife E H I D 1 end I J 1 ifl J 4 J code_tally end ifg K D M K D end A L K I H 1 ifle H 54 J code_color end R K 3201 S L K M I G M I/4 66 M E K A E 48 M I/5 E M I/6 87 M E L A E 48 M I/7 E C S game_count_move
 ife K 4 W game_status 1 W game_message @code_won else R E 3200 I E 1 W 3200 E ife E 8 W game_status 2 W game_message @code_lost else C S code_new_row end end M A 1 O S P
code_secret: 50 52 53 50
code_prompt: ${text('B exact / W misplaced')}
code_won: ${text('Code found! R restarts')}
code_lost: ${text('Code was 2452. R restarts')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:'1111B0W0'+'1111....'+'.'.repeat(48),status:0,movesMade:1},{moves:[0,1,1,1,2,2,2,2,3],steps:1,board:'2452B4W0'+'.'.repeat(56),status:1,movesMade:1},{moves:[],steps:8,board:'1111B0W0'.repeat(8),status:2,movesMade:8}],
  },
  {
    number:149,kind:'board',id:'frog-swap',site:'creek',title:'Frog Crossing Puzzle',columns:7,rows:3,counterLabel:'Moves',
    description:'Swap the three right-facing frogs (>) with the three left-facing frogs (<) on the middle row. Select a frog and press Enter or Space. A frog moves only forward into the empty pad, either one step or a jump over one opposite-facing frog. It cannot jump a teammate or move backwards. Aim for <<<.>>>. Illegal selections leave the board unchanged. R restarts and F1 exits.',
    inputs:['Selected frog'],outputs:['Frog positions','Moves','Solved'],
    algorithm:`game_reset: M I game_board M J @frog_initial M E 21
frog_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J frog_copy W 3200 10 W game_message @frog_prompt O S P
game_move: R E game_status N E Z O S P ifl A 7 O S P end ifg A 13 O S P end M G A M I game_board A I G R H I M J Z ife H 62 M J 1 else ife H 60 M J -1 else O S P end end R K 3200 M E G A E J E E K J frog_move M F E A F J N F K O S P M I game_board A I E R F I M E 122 S E H N F E O S P
frog_move: M I game_board A I K W I H M I game_board A I G W I 46 W 3200 G C S game_count_move M J Z
frog_check: M I game_board A I J R E I M I @frog_goal A I J R F I N E F O S P I J 1 ifl J 21 J frog_check end W game_status 1 W game_message @frog_won O S P
frog_initial: ${[...'#######>>>.<<<#######'].map(c=>c.charCodeAt(0)).join(' ')}
frog_goal: ${[...'#######<<<.>>>#######'].map(c=>c.charCodeAt(0)).join(' ')}
frog_prompt: ${text('Swap > and < across gap')}
frog_won: ${text('Frogs crossed! R restarts')}`,
    examples:[{moves:[9],board:'#######>>.><<<#######',status:0,movesMade:1},{moves:[0,7,8,10,14],board:'#######>>>.<<<#######',status:0,movesMade:0}],
  },
];
