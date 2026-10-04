import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const mines=[2,9,16,24,29,34];
export const MINESWEEPER_SOFTWARE: BoardSoftware = {
  number:128,kind:'board',id:'minesweeper',site:'puzzlebox',title:'Minesweeper Practice',columns:6,rows:6,stepKey:'n',counterLabel:'Opens',controls:'Enter:open N:flag R:reset',
  description:'Reveal every safe square on a fixed 6x6 practice board with six mines. Digits count adjacent mines in all eight directions; empty regions flood open. N toggles a flag on the selected hidden square; flagged squares cannot be opened by a click or flood. Enter/Space opens, arrows/Tab select. Hitting a mine ends the game and exposes all mines. R restores the same puzzle, F1 exits. Opens counts accepted reveal attempts; flags are not counted.',
  inputs:['Selected square'],outputs:['Board','Opens','Win or loss'],
  algorithm:`game_reset: M I game_board M E 36
mines_clear: W I 46 I I 1 I E -1 N E Z J mines_clear W 3200 Z W 3201 Z W 3202 Z W game_message @mines_prompt O S P
game_key: E A 1 J mines_flag E A -26 J mines_flag M A Z O S P
mines_flag: R E game_status ifn E Z M A Z O S P end R E game_cursor M I game_board A I E R F I ife F 46 W I 70 else ife F 70 W I 46 else M A Z O S P end end M A 1 O S P
game_move: R E game_status N E Z O S P M I game_board A I A R E I N E 46 O S P
 C S game_count_move M I @mines_map A I A R E I N E Z J mines_lost W 3201 Z W 3202 Z C S mines_open
mines_flood: R E 3201 R F 3202 ifge E F J mines_check_win end M I 3100 A I E R A I W 3210 A I E 1 W 3201 E W 3211 Z
mines_neighbor: R A 3210 R B 3211 C S mines_adjacent ifn E Z R A 3211 C S mines_open end
 R E 3211 I E 1 W 3211 E ifl E 36 J mines_neighbor end J mines_flood
mines_check_win: R E 3200 ife E 30 W game_status 1 W game_message @mines_won end O S P
mines_lost: M J Z
mines_expose: M I @mines_map A I J R E I ifn E Z M I game_board A I J W I 42 end I J 1 ifl J 36 J mines_expose end W game_status 2 W game_message @mines_boom O S P
; Reveal once, enqueuing only previously hidden safe zeroes. Flags remain closed.
mines_open: M I game_board A I A R E I N E 46 O S P M I @mines_map A I A R E I N E Z O S P W 3212 A C S mines_count
 R E 3212 M I game_board A I E ife F Z W I 32 M I 3100 R D 3202 A I D W I E I D 1 W 3202 D else A F 48 W I F end R E 3200 I E 1 W 3200 E O S P
mines_count: M J A M K Z M L Z
mines_count_next: M I @mines_map A I K R E I ifn E Z M A J M B K C S mines_adjacent ifn E Z I L 1 end end I K 1 ifl K 36 J mines_count_next end M F L O S P
; A/B square indices -> E adjacency (excluding self). Preserve J/K/L.
mines_adjacent: M D B ife A D M E Z O S P end M B 6 C S app_div M G A M H C M A D C S app_div S A G F A A S C H F C A M E Z ifle A 1 ifle C 1 M E 1 end end O S P
mines_map: ${Array.from({length:36},(_,i)=>mines.includes(i)?1:0).join(' ')}
mines_prompt: ${text('N: flag  Six mines')}
mines_won: ${text('All 30 safe squares open!')}
mines_boom: ${text('Mine! R starts again')}
${POSITIVE_DIVISION}`,
  examples:[{moves:[0],board:' 1.... 12...  12..11 1...1 1...1 1..',status:0,movesMade:1},{moves:[2,0],board:Array.from({length:36},(_,i)=>mines.includes(i)?'*':'.').join(''),status:2,movesMade:1}],
};
