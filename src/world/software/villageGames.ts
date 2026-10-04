import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const VILLAGE_GAMES:BoardSoftware[]=[
{number:186,kind:'board',id:'pancake-stack',site:'noodle',title:'Pancake Stack',columns:7,rows:6,counterLabel:'Flips',inputs:['Flip through row'],outputs:['Pancake order','Flip count'],controls:'Enter:flip top rows R:reset',description:'Sort six pancakes from smallest at the top to largest at the bottom. Each row is one pancake, drawn with its size digit repeated across its width. Select a row and Enter to reverse the entire stack from the top through that row. Selecting the top row alone does nothing. There is no move limit: compare strategies by flip count. The initial stack is 3,6,1,5,2,4. R repeats it; F1 exits. Inspired by early computer pancake-sorting puzzles.',
algorithm:`game_reset: M I 3200 M J @pancake_start M E 6
pancake_init: R F J W I F I I 1 I J 1 I E -1 N E Z J pancake_init W game_message @pancake_prompt J pancake_render
game_move: R E game_status N E Z O S P M B 7 C S app_div E A Z O S P M H A M G Z
pancake_flip: M I 3200 A I G R E I M J 3200 A J H R F J W I F W J E I G 1 I H -1 ifl G H J pancake_flip end C S game_count_move M G Z
pancake_check: M I 3200 A I G R E I M F G I F 1 ifn E F J pancake_render end I G 1 ifl G 6 J pancake_check end W game_status 1 W game_message @pancake_win
pancake_render: M I game_board M E 42
pancake_clear: W I 46 I I 1 I E -1 N E Z J pancake_clear M L Z
pancake_row: M I 3200 A I L R H I M A 7 S A H M B 2 C S app_div M J game_board M E L P E 7 A J E A J A M K H A H 48
pancake_fill: W J H I J 1 I K -1 N K Z J pancake_fill I L 1 ifl L 6 J pancake_row end O S P
pancake_start: 3 6 1 5 2 4
pancake_prompt: ${text('Smallest top; choose a row')}
pancake_win: ${text('Stack sorted! R to retry')}
${POSITIVE_DIVISION}`,
examples:[{moves:[7],board:'666666.'+'..333..'+'...1...'+'.55555.'+'..22...'+'.4444..',status:0,movesMade:1}]},
{number:187,kind:'board',id:'three-jugs',site:'bottles',title:'Three-Jug Puzzle',columns:8,rows:4,counterLabel:'Pours',inputs:['Source jug','Destination jug'],outputs:['Jug contents','Pour count'],controls:'Enter:source/dest R:reset',description:'Divide eight measures into two equal shares using jugs A (capacity 8), B (5), and C (3). Start at A=8,B=0,C=0; finish A=4,B=4,C=0. Select any cell in a jug row and Enter to choose a source, then another jug row to pour. A pour stops only when the source empties or the destination fills. No tap or drain: total water stays eight. Lowercase marks the source; reselect it to cancel. Empty sources and full destinations do nothing. R restarts, F1 exits.',
algorithm:`game_reset: W 3200 8 W 3201 Z W 3202 Z W 3203 -1 W game_message @jug_prompt M I game_board M J @jug_initial M E 32
jug_init: R F J W I F I I 1 I J 1 I E -1 N E Z J jug_init O S P
game_move: R E game_status N E Z O S P M B 8 C S app_div ifge A 3 O S P end M H A R G 3203 ifl G Z M I 3200 A I H R E I ife E Z W game_message @jug_empty O S P end W 3203 H W game_message @jug_dest J jug_render end ife G H J jug_cancel end M I 3200 A I G R K I M J 3200 A J H R L J M I @jug_caps A I H R E I S E L ife E Z W game_message @jug_full O S P end ifg K E M K E end A L K W J L M I 3200 A I G R E I S E K W I E C S game_count_move C S jug_cancel R E 3200 N E 4 O S P R E 3201 N E 4 O S P W game_status 1 W game_message @jug_win O S P
jug_cancel: W 3203 -1 W game_message @jug_prompt
jug_render: M G Z
jug_row: M I game_board M E G P E 8 A I E M E 65 A E G R F 3203 ife F G A E 32 end W I E M J 3200 A J G R E J A E 48 M I/3 E I G 1 ifl G 3 J jug_row end O S P
jug_caps: 8 5 3
jug_initial: ${text('A8:8....B5:0....C3:0....GOAL4+4.')}
jug_prompt: ${text('Make A=4 B=4; select source')}
jug_dest: ${text('Choose destination jug')}
jug_empty: ${text('That source jug is empty')}
jug_full: ${text('Destination full; try again')}
jug_win: ${text('Two equal shares! R retry')}
${POSITIVE_DIVISION}`,
examples:[{moves:[0,8],board:'A8:3....B5:5....C3:0....GOAL4+4.',status:0,movesMade:1},{moves:[0,8,8,16,16,0,8,16,0,8,8,16,16,0],board:'A8:4....B5:4....C3:0....GOAL4+4.',status:1,movesMade:7}]},
{number:188,kind:'board',id:'shut-the-box',site:'dice',title:'Shut the Box',columns:3,rows:5,stepKey:'n',counterLabel:'Turns',controls:'Enter:tile N:close R:reset',inputs:['Selected tiles','N: commit sum'],outputs:['Open tiles','Dice and sum','Win or blocked'],description:'Close all nine numbered tiles. The D row shows two dice, and S your selected sum. Enter toggles a numbered tile; lowercase a..i marks selected 1..9. N closes the selection only when its sum equals the dice total, then rolls again. Closed tiles become dots. If no subset of open tiles can meet the new roll, the game ends. The reproducible dice sequence permits comparing choices. R restarts; F1 exits. Based on the traditional dice-box game popular in small computer collections.',
algorithm:`game_reset: M I game_board M J @box_initial M E 15
box_init: R F J W I F I I 1 I J 1 I E -1 N E Z J box_init W 3210 Z W 3213 17 W game_message @box_prompt C S box_roll J box_render
game_move: R E game_status N E Z O S P ifge A 9 O S P end M I game_board A I A R E I E E 46 O S P M G A I G 1 R H 3210 ifge E 97 S E 48 S H G else A E 48 A H G end W I E W 3210 H J box_render
game_key: E A 1 J box_commit E A -26 J box_commit M A Z O S P
box_commit: R E game_status ifn E Z M A Z O S P end R G 3211 R H 3212 A G H R E 3210 ifn E G W game_message @box_sum M A 1 O S P end M I game_board M G 9 M H Z
box_close: R E I ifge E 97 W I 46 else ifn E 46 I H 1 end end I I 1 I G -1 N G Z J box_close C S game_count_move W 3210 Z ife H Z W game_status 1 W game_message @box_win else C S box_roll C S box_possible end C S box_render M A 1 O S P
box_die: R A 3213 P A 5 I A 1 M B 97 C S app_div W 3213 C M A C M B 6 C S app_div I C 1 M A C O S P
box_roll: C S box_die W 3211 A C S box_die W 3212 A W game_message @box_prompt O S P
box_possible: M I 3300 M E 13
box_clear: W I Z I I 1 I E -1 N E Z J box_clear W 3300 1 M L Z
box_tile: M I game_board A I L R E I ife E 46 J box_next end M G L I G 1 M H 12
box_reachable: M J 3300 A J H S J G R E J ifn E Z M J 3300 A J H W J 1 end I H -1 ifge H G J box_reachable end
box_next: I L 1 ifl L 9 J box_tile end R G 3211 R H 3212 A G H M I 3300 A I G R E I ife E Z W game_status 2 W game_message @box_lose end O S P
box_render: R E 3211 A E 48 W 2910 E R E 3212 A E 48 W 2911 E R A 3210 M B 10 C S app_div A A 48 W 2913 A A C 48 W 2914 C O S P
box_initial: ${text('123456789D00S00')}
box_prompt: ${text('Select sum of the two dice')}
box_sum: ${text('Selected sum must match dice')}
box_win: ${text('Box shut! R to play again')}
box_lose: ${text('No legal sum. R retries')}
${POSITIVE_DIVISION}`,
examples:[{moves:[4],steps:1,board:'1234.6789D53S00',status:0,movesMade:1}]},
{number:189,kind:'board',id:'badge-pairs',site:'badges',title:'Badge Pairs',columns:4,rows:4,counterLabel:'Tries',inputs:['Badge to reveal'],outputs:['Visible badges','Matched pairs'],controls:'Enter:turn badge R:restart',description:'Find eight matching pairs in a four-by-four badge drawer. Enter reveals a hidden badge. Two equal letters stay face up. A mismatch stays visible for study until you select another hidden badge, which hides the mismatch and starts a new pair. Already visible badges do nothing. Each pair attempt counts once; there is no timer or guess limit. R repeats the same drawer for memory practice; F1 exits.',
algorithm:`game_reset: M I game_board M E 16
pair_clear: W I 63 I I 1 I E -1 N E Z J pair_clear W 3200 -1 W 3201 -1 W 3202 Z W game_message @pair_prompt O S P
game_move: R E game_status N E Z O S P M L A M I game_board A I L R E I N E 63 O S P R G 3201 ifge G Z M I game_board A I G W I 63 R G 3200 M I game_board A I G W I 63 W 3200 -1 W 3201 -1 end M J @pair_layout A J L R H J M I game_board A I L W I H R G 3200 ifl G Z W 3200 L W game_message @pair_second O S P end C S game_count_move M I game_board A I G R E I ife E H W 3200 -1 W 3201 -1 R E 3202 I E 1 W 3202 E W game_message @pair_match ife E 8 W game_status 1 W game_message @pair_win end else W 3201 L W game_message @pair_miss end O S P
pair_layout: ${text('ACBDEFGHBADCEHGF')}
pair_prompt: ${text('Find eight matching pairs')}
pair_second: ${text('Choose a second hidden badge')}
pair_match: ${text('Pair found! Pick another')}
pair_miss: ${text('Remember both; turn another')}
pair_win: ${text('All eight pairs found!')}`,
examples:[{moves:[0,9],board:'A????????A??????',status:0,movesMade:1},{moves:[0,1,2],board:'??B?????????????',status:0,movesMade:1}]},
];
