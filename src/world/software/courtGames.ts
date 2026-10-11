import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const palette=`W -3657 -8297 W -3656 8177 W -3655 -8297 W -3654 249 W -3653 -8297 W -3652 4440`;
const ortho=(w:number,h:number)=>Array.from({length:w*h},(_,i)=>[i%w<w-1?i+1:-1,i<w*(h-1)?i+w:-1,i%w?i-1:-1,i>=w?i-w:-1]);
const table=(label:string,a:number[])=>`${label}: ${a.join(' ')}\n`;
const neighbor=(w:number,h:number)=>`cg_neighbor: P A 4 A A B A A @cg_neighbors R A A O S P\n${table('cg_neighbors',ortho(w,h).flat())}`;
const style=`game_cell_style: M A B ife B 65 A A 1458 end ife B 68 A A 2187 end ife B 75 A A 729 end ifge B 97 ifle B 122 A A 729 end end O S P`;
// Explicit small tafl variant: armed weak king; throne/corners are hostile
// capture partners while empty. Only the king may stop on those five cells.
const tfStart=Array<number>(49).fill(0);for(const i of[3,10,21,22,26,27,38,45])tfStart[i]=1;for(const i of[17,23,25,31])tfStart[i]=2;tfStart[24]=3;
const tafl=`game_reset: ${palette} M I @tf_initial M J 3300 M K 49
tf_init: R E I W J E I I 1 I J 1 I K -1 N K Z J tf_init W 3200 1 W 3201 -1 W game_message @tf_a J tf_render
game_move: R E game_status N E Z O S P W 3203 A M I 3300 A I A R E I R F 3200 ife F 2 ife E 3 M E 2 end end ife E F R E 3201 ife E A W 3201 -1 else W 3201 A end J tf_render end R E 3201 ifl E Z W game_message @tf_select O S P end M I 3300 A I A R E I ifn E Z W game_message @tf_block O S P end C S tf_legal ife A Z W game_message @tf_block O S P end R I 3201 A I 3300 R E I W I Z R I 3203 A I 3300 W I E W 3201 -1 W 3210 Z
 tf_capture: R A 3203 R B 3210 C S cg_neighbor ifl A Z J tf_capture_next end W 3211 A M I 3300 A I A R E I ife E Z J tf_capture_next end ife E 3 M E 2 end R F 3200 ife E F J tf_capture_next end R B 3210 C S cg_neighbor ifl A Z J tf_capture_next end M I 3300 A I A R E I ife E 3 M E 2 end R F 3200 ife E F J tf_remove end ifn E Z J tf_capture_next end M I @tf_special A I A R E I E E Z J tf_capture_next
 tf_remove: R I 3211 A I 3300 R E I ife E 3 W game_status 2 W game_message @tf_attacker end W I Z
 tf_capture_next: R E 3210 I E 1 W 3210 E ifl E 4 J tf_capture end C S game_count_move R E game_status ifn E Z J tf_render end R I 3203 A I 3300 R E I ife E 3 R E 3203 ife E Z J tf_escape end ife E 6 J tf_escape end ife E 42 J tf_escape end ife E 48 J tf_escape end end R E 3200 M F 3 S F E W 3200 F C S tf_mobile ife A Z R E 3200 ife E 1 W game_status 1 W game_message @tf_a_stuck else W game_status 2 W game_message @tf_d_stuck end J tf_render end R F 3200 ife F 1 W game_message @tf_a else W game_message @tf_d end R E game_moves ifge E 100 W game_status 3 W game_message @tf_draw end J tf_render
 tf_escape: W game_status 1 W game_message @tf_defender J tf_render
; Straight unobstructed rook ray; the empty throne may be crossed.
 tf_legal: R I 3201 A I 3300 R E I ifn E 3 R I 3203 A I @tf_special R E I ifn E Z M A Z O S P end end W 3220 Z
 tf_ray: R A 3201
 tf_ray_step: R B 3220 C S cg_neighbor ifl A Z J tf_ray_next end R E 3203 ife A E M A 1 O S P end M I 3300 A I A R E I E E Z J tf_ray_step
 tf_ray_next: R E 3220 I E 1 W 3220 E ifl E 4 J tf_ray end M A Z O S P
game_key: M A Z O S P
 tf_mobile: M L Z
 tf_mobile_piece: M I 3300 A I L R E I W 3222 E ife E 3 M E 2 end R F 3200 ifn E F J tf_mobile_next end W 3220 Z
 tf_mobile_dir: M A L
 tf_mobile_ray: R B 3220 C S cg_neighbor ifl A Z J tf_mobile_dir_next end M I 3300 A I A R E I ifn E Z J tf_mobile_dir_next end R E 3222 ife E 3 M A 1 O S P end M I @tf_special A I A R E I ife E Z M A 1 O S P end J tf_mobile_ray
 tf_mobile_dir_next: R E 3220 I E 1 W 3220 E ifl E 4 J tf_mobile_dir end
 tf_mobile_next: I L 1 ifl L 49 J tf_mobile_piece end M A Z O S P
 tf_render: M L Z
 tf_cell: M I 3300 A I L R E I ife E Z M F 46 M I @tf_special A I L R E I ifn E Z M F 43 end else M I @tf_symbols A I E R F I R E 3201 ife E L A F 32 end end M I game_board A I L W I F I L 1 ifl L 49 J tf_cell end O S P
${style}
${table('tf_initial',tfStart)}${table('tf_special',Array.from({length:49},(_,i)=>[0,6,24,42,48].includes(i)?1:0))}
tf_symbols: 46 65 68 75
tf_a: ${text('A: surround the king')}
tf_d: ${text('D: escort K to a corner')}
tf_select: ${text('Select your piece first')}
tf_block: ${text('Use a clear rook move')}
tf_defender: ${text('King escaped: defenders win')}
tf_attacker: ${text('King captured: A wins!')}
tf_a_stuck: ${text('A cannot move: D wins!')}
tf_d_stuck: ${text('D cannot move: A wins!')}
tf_draw: ${text('100 turns: agreed draw')}
${neighbor(7,7)}`;
// Eight intersecting digit runs, with visible two-digit clues.
const sumSolutions=[[1,3,5,7,2,4,6,8,3,5,7,9,4,6,8,1],[9,1,4,2,2,7,1,3,3,2,8,4,1,4,2,9]];
// Cross-sum uses a 4x4 run grid with no row/column permutation requirement;
// sums may exceed nine; all clues are explicitly shown in two header cells.
const sumMap=Array.from({length:36},(_,i)=>i>=12&&i%6>=2?Math.floor(i/6-2)*4+i%6-2:-1);
const sums=(a:number[])=>[...Array.from({length:4},(_,r)=>a.slice(r*4,r*4+4).reduce((x,y)=>x+y,0)),...Array.from({length:4},(_,c)=>a[c]!+a[c+4]!+a[c+8]!+a[c+12]!)];
const crossSum=`game_reset: ${palette} W 3200 Z
 cs_new: M I 3300 M E 16 K I E W game_status Z W game_moves Z W game_message @cs_help J cs_render
game_move: R E game_status N E Z O S P M I @cs_map A I A R E I ifl E Z W game_message @cs_clues O S P end M I 3300 A I E R E I I E 1 ifg E 9 M E Z end W I E C S game_count_move W game_message @cs_help J cs_render
game_key: E A 3 J cs_next E A -24 J cs_next E A 1 J cs_key E A -26 J cs_key M A Z O S P
 cs_next: R E 3200 M F 1 S F E W 3200 F C S cs_new M A 1 O S P
 cs_key: R E game_status ife E Z C S cs_check end M A 1 O S P
 cs_check: W 3201 Z
 cs_run: W 3202 Z W 3203 Z M I 3340 M E 10 K I E
 cs_digit: R E 3201 P E 4 R F 3202 A E F A E @cs_runs R E E M I 3300 A I E R E I ife E Z W game_message @cs_empty O S P end M I 3340 A I E R F I ifn F Z W game_message @cs_repeat O S P end W I 1 R F 3203 A F E W 3203 F R E 3202 I E 1 W 3202 E ifl E 4 J cs_digit end R E 3200 P E 8 R F 3201 A E F A E @cs_totals R E E R F 3203 ifn E F W game_message @cs_bad O S P end R E 3201 I E 1 W 3201 E ifl E 8 J cs_run end W game_status 1 W game_message @cs_win O S P
 cs_render: M I game_board M E 36
cs_blank: W I 32 I I 1 I E -1 N E Z J cs_blank M L Z
 cs_value: M I 3300 A I L R E I ife E Z M E 46 else A E 48 end M I @cs_cells A I L R I I A I game_board W I E I L 1 ifl L 16 J cs_value end M L Z
 cs_clue: R E 3200 P E 8 A E L A E @cs_totals R A E M B 10 C S app_div A A 48 A C 48 M I @cs_cluepos A I L R I I A I game_board W I A ifl L 4 M I/1 C else M I/6 C end I L 1 ifl L 8 J cs_clue end O S P
game_cell_style: M E A M A B M I @cs_map A I E R E I ifl E Z A A 729 else ifn B 46 A A 1458 end end O S P
${table('cs_map',sumMap)}${table('cs_cells',Array.from({length:16},(_,i)=>12+Math.floor(i/4)*6+i%4+2))}${table('cs_runs',Array.from({length:8},(_,r)=>Array.from({length:4},(_,c)=>r<4?r*4+c:c*4+r-4)).flat())}${table('cs_totals',sumSolutions.flatMap(sums))}${table('cs_cluepos',[12,18,24,30,2,3,4,5])}
cs_help: ${text('Enter:0..9 N:check P:puzzle')}
cs_clues: ${text('Gold clues: rows / columns')}
cs_empty: ${text('Fill every white square')}
cs_repeat: ${text('A run repeats a digit')}
cs_bad: ${text('A run has the wrong sum')}
cs_win: ${text('All eight sums are correct!')}
${POSITIVE_DIVISION}`;
// Lamp puzzle: black numbered walls block rays; x is a player's empty note.
const lamps=[[-1,-1,0,-1,-1,-1,-1,2,-1,-1,0,2,0,2,0,-1,-1,2,-1,-1,-1,-1,0,-1,-1],[-1,0,-1,-1,-1,-1,2,-1,2,-1,-1,-1,-1,-1,-1,-1,1,-1,1,-1,-1,-1,-1,0,-1]];
const akari=`game_reset: ${palette} W 3200 Z
 ak_new: M I 3300 M E 25 K I E W game_status Z W game_moves Z W game_message @ak_help J ak_render
game_move: R E game_status N E Z O S P W 3201 A R E 3200 P E 25 A E A A E @ak_walls R E E ifn E -1 W game_message @ak_wall O S P end M I 3300 A I A R E I I E 1 ife E 3 M E Z end W I E C S game_count_move W game_message @ak_help J ak_render
game_key: E A 3 J ak_next E A -24 J ak_next E A 1 J ak_key E A -26 J ak_key M A Z O S P
 ak_next: R E 3200 M F 1 S F E W 3200 F C S ak_new M A 1 O S P
 ak_key: R E game_status ife E Z C S ak_check end M A 1 O S P
 ak_light: M I 3340 M E 25 K I E W 3210 Z W 3211 Z
 ak_lamp: R I 3210 A I 3300 R E I ifn E 1 J ak_lamp_next end R I 3210 A I 3340 W I 1 W 3212 Z
 ak_direction: R A 3210
 ak_ray: R B 3212 C S cg_neighbor ifl A Z J ak_direction_next end R E 3200 P E 25 A E A A E @ak_walls R E E ifn E -1 J ak_direction_next end M I 3340 A I A W I 1 M I 3300 A I A R E I ife E 1 W 3211 1 end J ak_ray
 ak_direction_next: R E 3212 I E 1 W 3212 E ifl E 4 J ak_direction end
 ak_lamp_next: R E 3210 I E 1 W 3210 E ifl E 25 J ak_lamp end O S P
 ak_check: C S ak_light R E 3211 ifn E Z W game_message @ak_see O S P end W 3210 Z
 ak_square: R E 3200 P E 25 R F 3210 A E F A E @ak_walls R E E ife E -1 R I 3210 A I 3340 R E I ife E Z W game_message @ak_dark O S P end else ifge E Z W 3213 E W 3214 Z W 3212 Z
 ak_count: R A 3210 R B 3212 C S cg_neighbor ifge A Z M I 3300 A I A R E I ife E 1 R E 3214 I E 1 W 3214 E end end R E 3212 I E 1 W 3212 E ifl E 4 J ak_count end R E 3213 R F 3214 ifn E F W game_message @ak_clue O S P end end end R E 3210 I E 1 W 3210 E ifl E 25 J ak_square end W game_status 1 W game_message @ak_win O S P
 ak_render: C S ak_light M L Z
 ak_cell: R E 3200 P E 25 A E L A E @ak_walls R E E ife E -1 M I 3300 A I L R E I ife E 1 M F 79 else ife E 2 M F 120 else M I 3340 A I L R E I ife E Z M F 46 else M F 43 end end end else ife E -2 M F 35 else M F E A F 48 end end M I game_board A I L W I F I L 1 ifl L 25 J ak_cell end O S P
game_cell_style: M A B ife B 79 A A 729 end ife B 43 A A 1458 end ife B 120 A A 2187 end O S P
${table('ak_walls',lamps.flat())}
ak_help: ${text('Enter:lamp/x N:test P:next')}
ak_wall: ${text('Walls block light; no lamps')}
ak_see: ${text('Lamps must not see lamps')}
ak_dark: ${text('Some white squares are dark')}
ak_clue: ${text('Wall number needs its lamps')}
ak_win: ${text('Every court square is lit!')}
${neighbor(5,5)}`;
export const COURT_GAMES:BoardSoftware[]=[];
const app=(number:number,id:string,site:string,title:string,columns:number,rows:number,controls:string,description:string,algorithm:string):BoardSoftware=>({kind:'board',stepKey:'n',number,id,site,title,columns,rows,controls,counterLabel:'Moves',inputs:['Keyboard moves'],outputs:['Game state'],description:description+' Arrows or Tab choose a square; Enter acts, R restarts and F1 returns to programs.',algorithm,cellStyle:true,examples:[]});
COURT_GAMES.push(app(427,'seven-court-tafl','chess','Seven-Court Tafl',7,7,'Enter:piece/dest R:restart','Local two-player 7x7 tafl: A attackers start, D defenders escort armed K to a corner. Move like a rook through empty cells. Only K may stop on the throne or corners (+); others may cross the empty throne. A moved piece captures adjacent enemies against a friendly piece or an empty +. K is captured by the same two-sided sandwich, even beside the throne. Moving into a sandwich is safe. A captured king ends play; K reaching a corner wins. A side with no legal move loses. No repetition adjudication: 100 turns is a draw. Select a piece again to cancel.',tafl));
COURT_GAMES.push(app(428,'cross-sum','ternary','Cross-Sum Notebook',6,6,'Enter:digit N:test P:puzzle','Fill the 4x4 white grid with digits 1..9. Gold two-digit targets sit left of each row and above each column. Read row targets left to right, column targets top to bottom. Every four-cell run must have distinct digits and its target sum; no diagonals or extra constraints. Enter cycles blank then 1..9. N tests all eight runs; P selects the other authored puzzle. This accepts any valid solution, not a stored answer.',crossSum));
COURT_GAMES.push(app(429,'lantern-court','lantern','Lantern Court',5,5,'Enter:lamp/x N:test P:next','Light every white square. O is a lamp, + is lit, . is dark and x is an optional no-lamp note. Lamps shine horizontally and vertically until a wall, but may not see another lamp. Each numbered wall needs exactly that many orthogonally adjacent lamps; # has no count. Enter cycles empty/lamp/x; N checks all rules and P changes the authored puzzle. Notes may remain on lit squares.',akari));
const hexValid=Array.from({length:30},(_,i)=>i%6<5&&Math.abs(i%6+Math.floor(i/6)-4)<=2);
const hexDirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const hexNear=Array.from({length:30},(_,i)=>hexDirs.map(([dx,dy])=>{const x=i%6+dx!,y=Math.floor(i/6)+dy!;return x>=0&&x<5&&y>=0&&y<5&&Math.abs(x+y-4)<=2?y*6+x:-1;}));
const marbleStart=Array<number>(30).fill(0);for(const i of[2,3,4,7,8,9])marbleStart[i]=1;for(const i of[19,20,21,24,25,26])marbleStart[i]=2;
const marble=`game_reset: ${palette} M I @mp_initial M J 3300 M K 30
mp_init: R E I W J E I I 1 I J 1 I K -1 N K Z J mp_init W 3200 1 W 3201 -1 W 3202 -1 W 3204 Z W 3205 Z W game_message @mp_a J mp_render
game_move: R E game_status N E Z O S P ifge A 36 O S P end ifge A 30 S A 30 W 3203 A J mp_move end M I @mp_valid A I A R E I E E Z O S P M I 3300 A I A R E I R F 3200 ifn E F W game_message @mp_select O S P end R E 3201 ife E A W 3201 -1 W 3202 -1 J mp_render end ifl E Z W 3201 A W 3202 A else W 3202 A end W game_message @mp_direction J mp_render
game_key: M A Z O S P
mp_neighbor: P A 6 A A B A A @mp_neighbors R A A O S P
mp_move: R E 3201 ifl E Z W game_message @mp_select O S P end W 3210 Z
mp_try_order: R E 3210 ife E Z R A 3201 R E 3202 else R A 3202 R E 3201 end W 3211 E W 3212 A W 3213 Z
mp_group: M I 3300 A I A R E I R F 3200 ifn E F J mp_try_next end R I 3213 A I 3340 W I A R E 3213 I E 1 W 3213 E R F 3211 ife A F J mp_group_ok end ifge E 3 J mp_try_next end R B 3203 C S mp_neighbor ifge A Z J mp_group end
mp_try_next: R E 3210 ifn E Z W game_message @mp_line O S P end W 3210 1 J mp_try_order
mp_group_ok: W 3214 Z R B 3203 C S mp_neighbor
mp_opponents: ifl A Z J mp_end end M I 3300 A I A R E I ife E Z J mp_end end R F 3200 ife E F W game_message @mp_block O S P end R E 3213 R F 3214 A E F M I 3340 A I E W I A I F 1 W 3214 F R E 3213 ifge F E W game_message @mp_strength O S P end R B 3203 C S mp_neighbor J mp_opponents
mp_end: W 3215 A R E 3214 ifl A Z ife E Z W game_message @mp_edge O S P end R I 3200 A I 3203 R E I I E 1 W I E end R E 3213 R F 3214 A E F I E -1 W 3216 E
mp_shift: R I 3216 A I 3340 R A I W 3217 A M I 3300 A I A R E I W 3218 E R B 3203 C S mp_neighbor ifge A Z M I 3300 A I A R E 3218 W I E end R E 3216 I E -1 W 3216 E ifge E Z J mp_shift end R I 3212 A I 3300 W I Z W 3201 -1 W 3202 -1 C S game_count_move R I 3200 A I 3203 R E I ifge E 2 R E 3200 W game_status E ife E 1 W game_message @mp_awin else W game_message @mp_bwin end else R E 3200 M F 3 S F E W 3200 F ife F 1 W game_message @mp_a else W game_message @mp_b end R E game_moves ifge E 100 W game_status 3 W game_message @mp_draw end end J mp_render
mp_render: M L Z
mp_cell: M I @mp_valid A I L R E I ife E Z M F 32 else M I 3300 A I L R E I ife E Z M F 46 else A E 64 M F E R E 3201 ife E L A F 32 else R E 3202 ife E L A F 32 end end end end M I game_board A I L W I F I L 1 ifl L 30 J mp_cell end M L Z
mp_buttons: M E L A E 48 M I 2930 A I L W I E I L 1 ifl L 6 J mp_buttons end W 2936 65 R E 3204 A E 48 W 2937 E W 2938 32 W 2939 66 R E 3205 A E 48 W 2940 E W 2941 32 O S P
game_cell_style: M A B ife B 65 A A 1458 end ife B 66 A A 2187 end ife B 97 A A 729 end ife B 98 A A 729 end ifge B 48 ifle B 53 A A 729 end end O S P
${table('mp_initial',marbleStart)}${table('mp_valid',hexValid.map(Number))}${table('mp_neighbors',hexNear.flat())}
mp_a: ${text('A turn; push two B off edge')}
mp_b: ${text('B turn; push two A off edge')}
mp_select: ${text('Select your line endpoints')}
mp_direction: ${text('Choose direction 0..5 below')}
mp_line: ${text('Use 1..3 in a straight line')}
mp_block: ${text('Your marble blocks the push')}
mp_strength: ${text('Push fewer enemy marbles')}
mp_edge: ${text('Own marbles cannot fall off')}
mp_awin: ${text('A pushed two off: A wins!')}
mp_bwin: ${text('B pushed two off: B wins!')}
mp_draw: ${text('100 moves: draw')}`;
COURT_GAMES.push(app(430,'marble-push','pebbles','Marble Push',6,7,'Enter:endpoints / direction','Local two-player inline pushing on a small hexagon; A starts. Select the rear and front endpoints of 1..3 contiguous friendly marbles, then a direction button below: 0 right, 1 down, 2 down-left, 3 left, 4 up, 5 up-right. A single marble may move any direction; groups move only along their line. Empty destination permits sliding; a shorter enemy line may be pushed into space or off the edge, never through another marble. Select the first endpoint again to cancel. The last row counts pushes off for A/B. First to push two enemy marbles off wins; 100 moves draws. This compact practice game omits broadside moves.',marble));
// Card id=suit*4+rank; suits A/B gold and C/D mint. Tableau top is bottom.
const freeDeal=[4,11,1,10,8,15,5,14,12,3,9,2,16,7,13,6];
const free=`game_reset: ${palette} M I @fc_initial M J 3300 M K 16
fc_init: R E I W J E I I 1 I J 1 I K -1 N K Z J fc_init M L Z
fc_heights: M I 3330 A I L W I 4 I L 1 ifl L 4 J fc_heights end M I 3340 M E 2 K I E M I 3350 M E 4 K I E W 3200 -1 W game_message @fc_help J fc_render
; Areas0..3 tableau,4..5 free cells,6..9 foundations. Each has two display cells.
game_move: R E game_status N E Z O S P ifge A 48 O S P end ifl A 32 M B 8 C S app_div M A C M B 2 C S app_div else ifl A 40 S A 32 M B 2 C S app_div ifge A 2 O S P end A A 4 else S A 40 M B 2 C S app_div A A 6 end end W 3201 A R E 3200 ife A E W 3200 -1 J fc_render end ifl E Z ifge A 6 W game_message @fc_found O S P end C S fc_top ife A Z W game_message @fc_empty O S P end R E 3201 W 3200 E W game_message @fc_target J fc_render end C S fc_transfer J fc_render
game_key: M A Z O S P
fc_top: ifl A 4 M I 3330 A I A R E I ife E Z M A Z O S P end P A 4 A A E A A 3299 R A A O S P end ifl A 6 A A 3336 R A A O S P end M A Z O S P
fc_card: I A -1 M B 4 C S app_div W 3210 A I C 1 W 3211 C O S P
fc_transfer: R A 3200 C S fc_top W 3202 A C S fc_card R E 3201 ifge E 6 S E 6 R F 3210 ifn E F J fc_illegal end M I 3350 A I E R E I I E 1 R F 3211 ifn E F J fc_illegal end W I E J fc_remove end ifge E 4 M I 3336 A I E R E I ifn E Z J fc_illegal end R E 3202 W I E J fc_remove end M I 3330 A I E R F I ifge F 4 J fc_illegal end ife F Z J fc_table end R A 3201 C S fc_top W 3212 A C S fc_card W 3213 Z R E 3210 ifge E 2 W 3213 1 end R A 3202 C S fc_card R E 3210 M F Z ifge E 2 M F 1 end R E 3213 ife E F J fc_illegal end R E 3211 I E 1 W 3214 E R A 3212 C S fc_card R E 3211 R F 3214 ifn E F J fc_illegal end
fc_table: R I 3201 A I 3330 R E I R F 3201 P F 4 A F E A F 3300 R G 3202 W F G I E 1 W I E
fc_remove: R E 3200 ifl E 4 M I 3330 A I E R F I I F -1 W I F P E 4 A E F A E 3300 W E Z else A E 3336 W E Z end W 3200 -1 C S game_count_move W game_message @fc_help M L Z M G Z
fc_count: M I 3350 A I L R E I A G E I L 1 ifl L 4 J fc_count end ife G 16 W game_status 1 W game_message @fc_win end O S P
fc_illegal: W game_message @fc_bad O S P
fc_render: M I game_board M E 48 K I E M L Z
fc_table_cell: M A L M B 4 C S app_div W 3220 A W 3221 C M I 3330 A I A R E I ifge C E M A Z else M I 3300 A I L R A I end R I 3221 P I 8 R E 3220 P E 2 A I E A I game_board R E 3200 R F 3220 M H Z ife E F M H 1 end C S fc_paint I L 1 ifl L 16 J fc_table_cell end M L Z
fc_free_cell: M I 3340 A I L R A I M I L P I 2 A I 2932 M H Z R E 3200 M F L A F 4 ife E F M H 1 end C S fc_paint I L 1 ifl L 2 J fc_free_cell end W 2936 70 W 2937 82 W 2938 69 W 2939 69 M L Z
fc_found_cell: M I 3350 A I L R E I A E 48 M I L P I 2 A I 2940 W I E M E L A E 65 M I/1 E I L 1 ifl L 4 J fc_found_cell end O S P
fc_paint: ife A Z W I 46 M I/1 46 O S P end U S I C S fc_card O S I R E 3211 A E 48 W I E R E 3210 A E 65 ifn H Z A E 32 end M I/1 E O S P
game_cell_style: M A B ifge B 65 ifle B 66 A A 729 end end ifge B 67 ifle B 68 A A 1458 end end ifge B 97 ifle B 100 A A 2187 end end O S P
${table('fc_initial',freeDeal)}
fc_help: ${text('Top card -> pile/free/home')}
fc_target: ${text('Choose destination column')}
fc_found: ${text('Foundations only receive')}
fc_empty: ${text('Choose a nonempty pile')}
fc_bad: ${text('Down/opposite; home by suit')}
fc_win: ${text('All sixteen cards are home!')}
${POSITIVE_DIVISION}`;
COURT_GAMES.push(app(431,'free-cells','cardtable','Free Cells',8,6,'Enter:source / destination','A compact 16-card solitaire deal: ranks 1..4, suits A/B gold and C/D mint. The lowest card shown in each of four tableau columns is exposed. Select a column to take its exposed bottom card, then another column, one of two FREE cells, or a suit foundation on the last row. Move one card at a time. Tableau builds down by one rank with opposite colors; empty columns accept any card. FREE holds one card each. Foundations receive their own suit from 1 up to 4 and cannot be removed. Selection turns the suit lowercase; select its source again to cancel. Get all sixteen cards home.',free));
const scopaDeck=[4,12,20,28,1,7,14,9,17,25,3,10,18,8,15,22,6,13,21,2,16,23,5,11,19,24,26,27];
const scopa=`game_reset: ${palette} M I 3300 M E 60 K I E M L Z
sc_table_init: M I @sc_deck A I L R E I M I 3300 A I L W I E I L 1 ifl L 4 J sc_table_init end W 3200 Z W 3201 -1 W 3202 4 W 3203 -1 C S sc_deal W game_message @sc_a J sc_render
sc_deal: M L Z
sc_deal_card: R I 3202 A I @sc_deck R E I M I 3320 A I L W I E R E 3202 I E 1 W 3202 E I L 1 ifl L 6 J sc_deal_card end O S P
; Hand at row3; table occupies rows0..1. Choosing a hand resets target marks.
game_move: R E game_status N E Z O S P ife A 30 J sc_play end ifl A 16 M B 2 C S app_div M I 3300 A I A R E I E E Z O S P M I 3340 A I A R E I M F 1 S F E W I F J sc_render end ifl A 24 O S P end ifge A 30 O S P end S A 24 M B 2 C S app_div R E 3200 P E 3 A A E M I 3320 A I A R E I E E Z O S P W 3201 A M I 3340 M E 8 K I E W game_message @sc_pick J sc_render
game_key: E A 1 J sc_key E A -26 J sc_key M A Z O S P
sc_key: R E game_status ife E Z C S sc_play end M A 1 O S P
sc_rank: I A -1 M B 7 C S app_div I C 1 M A C O S P
sc_play: R I 3201 ifl I Z W game_message @sc_choose O S P end A I 3320 R A I W 3210 A C S sc_rank W 3211 A W 3212 Z W 3213 Z W 3214 Z M L Z
sc_targets: M I 3300 A I L R A I ife A Z J sc_target_next end C S sc_rank R E 3211 ife A E W 3214 1 end M I 3340 A I L R E I ifn E Z R E 3212 A E A W 3212 E R E 3213 I E 1 W 3213 E end
sc_target_next: I L 1 ifl L 8 J sc_targets end R E 3213 ifn E Z R E 3212 R F 3211 ifn E F J sc_wrong end R E 3214 ifn E Z R E 3213 ifn E 1 W game_message @sc_equal O S P end end J sc_take end
; Before dropping, enumerate every nonempty table subset natively.
W 3215 1
sc_subset: R E 3215 W 3216 E W 3217 Z M L Z
sc_subset_bit: R A 3216 M B 2 C S app_div W 3216 A ifn C Z M I 3300 A I L R A I ife A Z J sc_subset_next end C S sc_rank R E 3217 A E A W 3217 E end I L 1 ifl L 8 J sc_subset_bit end R E 3217 R F 3211 ife E F W game_message @sc_must O S P end
sc_subset_next: R E 3215 I E 1 W 3215 E ifl E 256 J sc_subset end M L Z
sc_drop: M I 3300 A I L R E I ife E Z R E 3210 W I E J sc_finish_turn end I L 1 ifl L 8 J sc_drop end W game_message @sc_full O S P
sc_take: R E 3200 W 3203 E R A 3210 C S sc_award M L Z
sc_take_card: M I 3340 A I L R E I ifn E Z M I 3300 A I L R A I W I Z C S sc_award end I L 1 ifl L 8 J sc_take_card end M L Z M G Z
sc_remaining: M I 3300 A I L R E I ifn E Z I G 1 end I L 1 ifl L 8 J sc_remaining end ife G Z R E game_moves ifl E 23 R I 3200 A I 3336 R E I I E 1 W I E end end
sc_finish_turn: R I 3201 A I 3320 W I Z W 3201 -1 M I 3340 M E 8 K I E C S game_count_move R E game_moves ife E 24 J sc_end end R A game_moves M B 6 C S app_div ife C Z C S sc_deal end R E 3200 M F 1 S F E W 3200 F ife F Z W game_message @sc_a else W game_message @sc_b end J sc_render
sc_award: R I 3200 A I 3330 R E I I E 1 W I E ifle A 7 R I 3200 A I 3332 R E I I E 1 W I E end ife A 7 R I 3200 A I 3334 W I 1 end O S P
sc_end: R E 3203 ifge E Z W 3200 E M L Z
sc_leftovers: M I 3300 A I L R A I ifn A Z W I Z C S sc_award end I L 1 ifl L 8 J sc_leftovers end end M L Z
sc_score: M I 3336 A I L R E I M I 3334 A I L R F I A E F M I 3350 A I L W I E I L 1 ifl L 2 J sc_score end M L Z
sc_majority: M I L P I 2 A I 3330 R E I M F I/1 ifg E F R E 3350 I E 1 W 3350 E else ifg F E R E 3351 I E 1 W 3351 E end end I L 1 ifl L 2 J sc_majority end R E 3350 R F 3351 ifg E F W game_status 1 W game_message @sc_awin else ifg F E W game_status 2 W game_message @sc_bwin else W game_status 3 W game_message @sc_tie end end J sc_render
sc_wrong: W game_message @sc_bad O S P
sc_render: M I game_board M E 48 K I E M L Z
sc_table_cell: M I 3300 A I L R A I M I L P I 2 A I game_board M H Z M E 3340 A E L R E E ifn E Z M H 1 end C S sc_paint I L 1 ifl L 8 J sc_table_cell end M I @sc_label M J 2916 M K 8
sc_label_copy: R E I W J E I I 1 I J 1 I K -1 N K Z J sc_label_copy M L Z
sc_hand_cell: R E 3200 P E 3 A E L W 3220 E M I 3320 A I E R A I M I L P I 2 A I 2924 M H Z R E 3201 R F 3220 ife E F M H 1 end C S sc_paint I L 1 ifl L 3 J sc_hand_cell end W 2930 84 R E 3200 A E 65 W 2931 E W 2932 65 W 2936 66 R A 3330 M B 10 C S app_div A A 48 A C 48 W 2933 A W 2934 C R A 3331 M B 10 C S app_div A A 48 A C 48 W 2937 A W 2938 C W 2935 67 W 2939 67 W 2940 65 R A 3350 M B 10 C S app_div A A 48 A C 48 W 2941 A W 2942 C W 2943 80 W 2944 66 R A 3351 M B 10 C S app_div A A 48 A C 48 W 2945 A W 2946 C W 2947 80 O S P
sc_paint: ife A Z W I 46 M I/1 46 O S P end I A -1 U S I M B 7 C S app_div O S I A C 49 W I C A A 65 ifn H Z A A 32 end M I/1 A O S P
game_cell_style: M A B ife B 65 A A 729 end ifge B 66 ifle B 68 A A 1458 end end ifge B 97 ifle B 100 A A 2187 end end O S P
${table('sc_deck',scopaDeck)}
sc_label: ${[...'TABLE   '].map(c=>c.charCodeAt(0)).join(' ')}
sc_a: ${text('A: hand, targets, N:play')}
sc_b: ${text('B: hand, targets, N:play')}
sc_choose: ${text('Choose a hand card first')}
sc_pick: ${text('Mark table cards; N:commit')}
sc_equal: ${text('Equal rank must come first')}
sc_must: ${text('A capture exists: mark it')}
sc_bad: ${text('Targets must sum to hand')}
sc_full: ${text('No table space')}
sc_awin: ${text('A wins the capture table!')}
sc_bwin: ${text('B wins the capture table!')}
sc_tie: ${text('Equal points: shared table')}
${POSITIVE_DIVISION}`;
COURT_GAMES.push(app(432,'scopa-table','cardtable','Scopa Table',8,6,'Enter:hand/targets N:play','Local two-player capture practice with 28 cards: four suits A..D, ranks 1..7, A is coins. The active hand is below TABLE; T names its player; Enter on T also commits. Choose a hand card, mark table cards, then N commits. A table card of equal rank has priority; otherwise take any subset summing to your rank. If any capture exists you must take one; with no capture, mark nothing to drop. New hands are dealt every six plays. Last capturer gets leftovers. Score one per sweep (not on the final play), one for most cards, one for most coins, and one for coin7; ties in majorities score neither. This shortened deck omits primiera. C shows captured count; P shows final points.',scopa));

// Authored replay transcripts; all transition rules execute in guest assembly.
const courtExamples=[{"moves":[26,19,25,46,22,8,46,47,38,36,47,40,21,28,31,38,27,13,24,31,19,5,40,47,28,21,17,20,3,2,23,30,2,16,30,29,10,17,38,41,16,30,47,19,21,28,20,27,36,22,27,23,28,29,31,38,5,4,19,47,29,43,38,24,4,46,41,34,45,44,34,41,43,36,41,40,30,28,24,45,44,43,23,27,28,21,40,33,22,25,33,12,36,15,12,33,8,9,33,31,17,18,31,28,46,32,45,48],"steps":0,"board":"+.....+..A.....A..A..A..+A.DD...A.........+A....K","status":1,"movesMade":54},{"moves":[14,15,15,15,16,16,16,16,16,17,17,17,17,17,17,17,20,20,21,21,21,21,22,22,22,22,22,22,23,23,23,23,23,23,23,23,26,26,26,27,27,27,27,27,28,28,28,28,28,28,28,29,29,29,29,29,29,29,29,29,32,32,32,32,33,33,33,33,33,33,34,34,34,34,34,34,34,34,35],"steps":1,"board":"  1122  0865161357202468243579194681","status":1,"movesMade":79},{"moves":[0,4,6,8,16,18,20,24],"steps":1,"board":"O+0+O+O2O+02020+O2O+O+0+O","status":1,"movesMade":8},{"moves":[2,8,31,21,35,7,31,16,33,8,34,19,20,33,13,14,30,18,24,34,4,14,32,26,35,14,34,24,25,30,19,32,16,34,15,32,21,26,35,20,31,18,30,26,34,10,32,3,8,32,16,34,13,34,19,35,7,31,14,32,8,33,21,32,13,32,10,34,9,33,15,30,2,7,32,4,33,12,30,19,35,8,13,35],"steps":0,"board":"  .A.  AA.. ..B.B A.A.  ABB   012345A2 B0 ","status":1,"movesMade":37},{"moves":[0,34,0,40,0,32,4,40,4,44,2,4,2,42,2,0,6,42,0,2,6,46,2,0,4,46,0,46,4,40,0,40,2,0,4,2,0,4,2,0,4,2,6,42,0,4,2,42,4,2,2,0,6,46,0,6,6,4,4,2,32,6,2,32,6,4,4,2,2,0,32,6,0,4,4,2,6,4,2,6,4,0,6,4,0,2,4,0,2,4,34,44,0,44,4,44],"steps":0,"board":"....................................FREE4A4B4C4D","status":1,"movesMade":48},{"moves":[24,30,28,0,30,28,6,30,24,30,26,4,8,30,26,30,28,30,28,30,26,4,30,26,8,30,24,30,24,30,26,2,8,30,24,0,30,28,4,6,30,28,30,24,30,26,0,30,26,30,28,2,30,28,30,24,30,24,2,30,26,30],"steps":0,"board":"................TABLE   ......TAA18CB10CA04PB00P","status":1,"movesMade":24}];
COURT_GAMES.forEach((game,i)=>game.examples=[courtExamples[i]!]);
