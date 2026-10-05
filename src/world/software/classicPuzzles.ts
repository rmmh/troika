import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const golf=`game_reset: M I 3300 M J @gf_deal M K 15
gf_init: R E J W I E I I 1 I J 1 I K -1 N K Z J gf_init W 3200 2 W 3201 Z W 3202 15 W game_message @gf_prompt J gf_render
game_move: R E game_status N E Z O S P ifge A 15 W game_message @gf_only O S P end M L A M I 3300 A I A R G I ife G Z W game_message @gf_empty O S P end M E L A E 5
gf_below: ifge E 15 J gf_exposed end M I 3300 A I E R F I ifn F Z W game_message @gf_covered O S P end A E 5 J gf_below
gf_exposed: R E 3200 M F G S F E F F A ifn F 1 W game_message @gf_rank O S P end M I 3300 A I L W I Z W 3200 G R E 3202 I E -1 W 3202 E C S game_count_move C S gf_check J gf_render
game_key: E A 1 J gf_draw E A -26 J gf_draw M A Z O S P
gf_draw: R E game_status ifn E Z M A Z O S P end R E 3201 ifge E 3 W game_message @gf_no_stock M A 1 O S P end M I @gf_stock A I E R F I W 3200 F I E 1 W 3201 E C S game_count_move C S gf_check C S gf_render M A 1 O S P
gf_check: W game_message @gf_prompt R E 3202 ife E Z W game_status 1 W game_message @gf_win O S P end R E 3201 ifl E 3 O S P end M L Z
gf_column: M K 10 A K L
gf_scan: M I 3300 A I K R E I ifn E Z R F 3200 S E F F E A ife E 1 O S P end J gf_next end S K 5 ifge K Z J gf_scan end
gf_next: I L 1 ifl L 5 J gf_column end W game_status 2 W game_message @gf_lose O S P
gf_render: M I game_board M J 3300 M K 15
gf_card: R E J ife E Z M E 46 else A E 48 end W I E I I 1 I J 1 I K -1 N K Z J gf_card M J @gf_footer M K 15
gf_foot: R E J W I E I I 1 I J 1 I K -1 N K Z J gf_foot R E 3200 A E 48 W 2916 E R E 3201 M F 3 S F E A F 48 W 2919 F O S P
gf_deal: 3 6 9 6 3 2 5 8 7 4 1 4 7 8 5
gf_stock: 7 1 9
gf_footer: ${txt('W2 S3'+'     '+'Ndraw')}
gf_prompt: ${txt('Exposed card: one rank away')}
gf_only: ${txt('Choose a tableau card')}
gf_empty: ${txt('That card was removed')}
gf_covered: ${txt('Remove cards below it first')}
gf_rank: ${txt('Need one rank above/below')}
gf_no_stock: ${txt('Stock empty; play a card')}
gf_win: ${txt('All fifteen cards cleared!')}
gf_lose: ${txt('No stock or legal card left')}`;
const knights=`game_reset: M I 3300 M K 12
ke_clear: W I Z I I 1 I K -1 N K Z J ke_clear W 3300 1 W 3303 1 W 3308 2 W 3311 2 W 3200 -1 W game_message @ke_prompt J ke_render
game_move: R E game_status N E Z O S P M L A M I 3300 A I L R E I ifn E Z R F 3200 ife F L W 3200 -1 W game_message @ke_prompt else W 3200 L W game_message @ke_dest end J ke_render end R G 3200 ifl G Z W game_message @ke_pick O S P end M A G M B L C S ke_legal ife A Z W game_message @ke_bad O S P end R G 3200 M I 3300 A I G R E I W I Z M I 3300 A I L W I E W 3200 -1 C S game_count_move W game_message @ke_prompt R E 3300 R F 3303 ife E 2 ife F 2 R E 3308 R F 3311 ife E 1 ife F 1 W game_status 1 W game_message @ke_win end end end end J ke_render
ke_legal: W 3201 B M B 4 C S app_div M G A M H C R A 3201 M B 4 C S app_div S G A F G A S H C F H A ife G 1 ife H 2 M A 1 O S P end end ife G 2 ife H 1 M A 1 O S P end end M A Z O S P
ke_render: M L Z
ke_cell: M I 3300 A I L R E I ife E Z R A 3200 ifge A Z M B L C S ke_legal ifn A Z M E 43 else M E 46 end else M E 46 end else ife E 1 M E 87 else M E 66 end R F 3200 ife F L A E 32 end end M I game_board A I L W I E I L 1 ifl L 12 J ke_cell end O S P
ke_prompt: ${txt('Swap W top with B bottom')}
ke_pick: ${txt('Select any knight first')}
ke_dest: ${txt('Choose +; same man cancels')}
ke_bad: ${txt('Knight move: two then one')}
ke_win: ${txt('Both knight camps swapped!')}
${POSITIVE_DIVISION}`;
const solution=['01110','11011','11111','01010','01110'].join('');
const runs=(values:number[])=>{const out:number[]=[];let n=0;for(const v of [...values,0]){if(v)n++;else if(n){out.push(n);n=0;}}return out;};
const nonogramBoard=Array<string>(64).fill(' ');for(let row=0;row<5;row++){const r=runs([...solution.slice(row*5,row*5+5)].map(Number));r.forEach((n,i)=>nonogramBoard[(row+3)*8+3-r.length+i]=String(n));for(let col=0;col<5;col++)nonogramBoard[(row+3)*8+col+3]='.';}for(let col=0;col<5;col++){const r=runs(Array.from({length:5},(_,row)=>Number(solution[row*5+col])));r.forEach((n,i)=>nonogramBoard[(3-r.length+i)*8+col+3]=String(n));}
const nonogram=`game_reset: M I game_board M J @ng_board M K 64
ng_init: R E J W I E I I 1 I J 1 I K -1 N K Z J ng_init W game_message @ng_prompt O S P
game_move: R E game_status N E Z O S P M L A M B 8 C S app_div ifl A 3 W game_message @ng_clue O S P end ifl C 3 W game_message @ng_clue O S P end M I game_board A I L R E I ife E 46 M E 35 else ife E 35 M E 120 else M E 46 end end W I E W game_message @ng_prompt J game_count_move
game_key: E A 1 J ng_check E A -26 J ng_check M A Z O S P
ng_check: R E game_status ifn E Z M A Z O S P end M L Z
ng_verify: M A L M B 5 C S app_div A A 3 P A 8 A A C A A 2903 R E A M I @ng_solution A I L R F I ife F 1 ifn E 35 W game_message @ng_wrong M A 1 O S P end else ife E 35 W game_message @ng_wrong M A 1 O S P end end I L 1 ifl L 25 J ng_verify end W game_status 1 W game_message @ng_win M A 1 O S P
ng_board: ${txt(nonogramBoard.join(''))}
ng_solution: ${[...solution].join(' ')}
ng_prompt: ${txt('Runs in order, with gaps')}
ng_clue: ${txt('Clues are fixed; grid below')}
ng_wrong: ${txt('Marks do not match all runs')}
ng_win: ${txt('Every row and column fits!')}
${POSITIVE_DIVISION}`;
const atoms=[14,22,27]; // Interior coordinates (2,2), (3,4), (4,3).
const blackbox=`game_reset: M I 3300 M K 76
bx_init: W I Z I I 1 I K -1 N K Z J bx_init W 3208 Z W game_message @bx_prompt J bx_render
game_move: R E game_status N E Z O S P W 3209 A M B 6 C S app_div M G A M H C ifge G 1 ifle G 4 ifge H 1 ifle H 4 R I 3209 A I 3300 R E I I E 1 ifg E 2 M E Z end W I E W game_message @bx_prompt J bx_render end end end end ife G Z ifge H 1 ifle H 4 W 3203 2 J bx_start end end end ife G 5 ifge H 1 ifle H 4 W 3203 Z J bx_start end end end ife H Z ifge G 1 ifle G 4 W 3203 1 J bx_start end end end ife H 5 ifge G 1 ifle G 4 W 3203 3 J bx_start end end end W game_message @bx_corner O S P
bx_start: W 3201 G W 3202 H R E 3209 W 3200 E M I 3400 M K 144
bx_clear_seen: W I Z I I 1 I K -1 N K Z J bx_clear_seen C S game_count_move
bx_trace: R G 3201 R H 3202 M I G P I 6 A I H P I 4 R E 3203 A I E A I 3400 R E I ifn E Z W 3210 76 W game_message @bx_loop J bx_single end W I 1 C S bx_front R A 3204 R B 3205 C S bx_atom ifn A Z W 3210 72 W game_message @bx_hit J bx_single end
 R A 3204 S A H R B 3205 A B G C S bx_atom W 3206 A R A 3204 A A H R B 3205 S B G C S bx_atom W 3207 A R E 3206 R F 3207 A E F ifn E Z R G 3201 R H 3202 M I G P I 6 A I H R J 3200 ife I J W 3210 82 W game_message @bx_reflect J bx_single end R J 3203 ife E 2 A J 2 else R E 3206 ifn E Z I J 1 else A J 3 end end ifge J 4 S J 4 end W 3203 J C S bx_front end
 R G 3204 R H 3205 W 3201 G W 3202 H ifl G 1 J bx_exit end ifg G 4 J bx_exit end ifl H 1 J bx_exit end ifg H 4 J bx_exit end J bx_trace
bx_exit: M I G P I 6 A I H R E 3200 ife I E W 3210 82 W game_message @bx_reflect J bx_single end M K I ifg K E M K E end M J @bx_letters A J K R E J A I 3340 W I E R I 3200 A I 3340 W I E W game_message @bx_pair J bx_render
bx_single: R I 3200 A I 3340 R E 3210 W I E J bx_render
; Direction vector G/H is preserved by bx_atom.
bx_front: R E 3203 P E 2 M I @bx_vectors A I E R G I M H I/1 R E 3201 A E G W 3204 E R E 3202 A E H W 3205 E O S P
bx_atom: ifl A 1 M A Z O S P end ifg A 4 M A Z O S P end ifl B 1 M A Z O S P end ifg B 4 M A Z O S P end P A 6 A A B M I @bx_atoms A I A R A I O S P
game_key: E A 1 J bx_check E A -26 J bx_check M A Z O S P
bx_check: R E game_status ifn E Z M A Z O S P end M L Z M K Z
bx_count: M I 3300 A I L R E I ife E 1 I K 1 end I L 1 ifl L 36 J bx_count end ifn K 3 W game_message @bx_three M A 1 O S P end M L Z
bx_verify: M I @bx_atoms A I L R E I ife E 1 M I 3300 A I L R E I ifn E 1 W game_message @bx_wrong M A 1 O S P end end I L 1 ifl L 36 J bx_verify end W game_status 1 W game_message @bx_win C S bx_render M A 1 O S P
bx_render: M L Z
bx_cell: M A L M B 6 C S app_div ifge A 1 ifle A 4 ifge C 1 ifle C 4 M I 3300 A I L R E I ife E Z M E 46 else ife E 1 R F game_status ife F 1 M E 42 else M E 79 end else M E 120 end end J bx_put end end end end M I 3340 A I L R E I ife E Z M E 43 ife L Z M E 32 end ife L 5 M E 32 end ife L 30 M E 32 end ife L 35 M E 32 end end
bx_put: M I game_board A I L W I E I L 1 ifl L 36 J bx_cell end O S P
bx_letters: ${Array.from({length:36},(_,i)=>{const p=[1,2,3,4,6,11,12,17,18,23,24,29,31,32,33,34].indexOf(i);return p<0?0:"ABCDEFGIJKMNOPQS".charCodeAt(p);}).join(" ")}
bx_vectors: -1 0 0 1 1 0 0 -1
bx_atoms: ${Array.from({length:36},(_,i)=>atoms.includes(i)?1:0).join(' ')}
bx_prompt: ${txt('Edge:ray Inside:mark N:test')}
bx_corner: ${txt('Enter at +, not a corner')}
bx_hit: ${txt('H: ray struck an atom')}
bx_reflect: ${txt('R: ray reflected to entry')}
bx_pair: ${txt('Matching letters link holes')}
bx_loop: ${txt('L: ray loop; change entry')}
bx_three: ${txt('Mark exactly three atoms')}
bx_wrong: ${txt('Atom guess is not correct')}
bx_win: ${txt('All three atoms located!')}
${POSITIVE_DIVISION}`;
export const CLASSIC_PUZZLES:BoardSoftware[]=[
{number:273,kind:'board',id:'golf-solitaire',site:'cardtable',title:'Golf Solitaire',columns:5,rows:6,stepKey:'n',counterLabel:'Plays',controls:'Enter:card N:draw R:reset',inputs:['Exposed card','Stock draw'],outputs:['Waste rank','Cards/stock left'],description:'Clear all fifteen tableau cards. Enter removes a card only when no card remains below it in its column and its rank is exactly one above or below waste W. Ranks are 1..9 without wraparound. N draws the next stock card to waste; S shows the three-card stock remaining. You may draw even with a playable card. When stock is empty and no exposed card fits, the deal is lost. Cleared cards become dots. R replays the authored deal; F1 exits.',algorithm:golf,examples:[{"moves":[10,5,0,11,6,1,12,7,2,13,8,3,14,9,4],"steps":0,"board":"...............W3 S3     Ndraw","status":1,"movesMade":15}]},
{number:274,kind:'board',id:'knight-exchange',site:'chess',title:'Knight Exchange',columns:4,rows:3,counterLabel:'Moves',controls:'Enter:knight/dest R:reset',inputs:['Any knight','Destination'],outputs:['Legal + squares','Camp exchange'],description:'Swap the two W knights in the top corners with the two B knights in the bottom corners. You control all four pieces; there are no turns or captures. Select a knight with Enter; lowercase marks it and + marks legal empty destinations. Enter on a destination moves two squares along one axis and one along the other. Knights jump over occupied squares but cannot share a square. Selecting the same knight cancels. R restores the camps; F1 exits.',algorithm:knights,examples:[{"moves":[0,6,3,5,8,1,1,10,6,8,10,3,11,2,2,9,5,11,9,0],"steps":0,"board":"B..B....W..W","status":1,"movesMade":10}]},
{number:275,kind:'board',id:'black-box',site:'lenses',title:'Black Box',columns:6,rows:6,stepKey:'n',counterLabel:'Rays',controls:'Enter:ray/mark N:check',inputs:['Edge entry','Atom hypothesis'],outputs:['Hit/reflect/exit','Hypothesis check'],description:'Locate three hidden atoms in the 4x4 interior. Enter at an edge + fires a ray; matching letters pair entry/exit holes, H means a hit, R a return to entry, L a repeated ray state. Before each step, an atom directly ahead absorbs the ray. Otherwise an atom diagonally ahead turns it away by 90 degrees; two diagonal atoms reverse it. Any such deflection at entry reflects immediately. Enter inside cycles blank, O atom guess, x exclusion. N checks exactly three guesses. R resets; F1 exits.',algorithm:blackbox,examples:[{"moves":[1,2,17,14,22,27],"steps":1,"board":" AH++ A....++.*..R+...*++..*.+ ++++ ","status":1,"movesMade":3}]},
{number:276,kind:'board',id:'nonogram',site:'gallery',title:'Lantern Nonogram',columns:8,rows:8,stepKey:'n',counterLabel:'Edits',controls:'Enter:mark N:check R:reset',inputs:['Grid mark','Run clues'],outputs:['Filled picture','Run check'],description:'Fill the lower-right 5x5 picture to match the run clues above and left. Each clue gives consecutive filled squares in order; separate runs by at least one empty square. Enter cycles a grid square through dot (unknown), # (filled), x (excluded). Clues are fixed. N checks every row and column; dots and x both count empty. The authored clues have one solution. R clears all marks; F1 exits.',algorithm:nonogram,examples:[{"moves":[28,29,30,35,36,38,39,43,44,45,46,47,52,54,60,61,62],"steps":1,"board":"     1       1     25152  3.###. 22##.##  5##### 11.#.#.  3.###.","status":1,"movesMade":17}]},
];
