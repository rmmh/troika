import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const text = (s:string) => [...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const board = (pieces:Record<number,string>, empty='.') => Array.from({length:64},(_,i)=>pieces[i]??empty).join('');
const key = (target:string) => `game_key: E A 1 J ${target} E A -26 J ${target} M A Z O S P`;
const copy = `sim_copy: M I game_board M J 3000 M E 64
sim_copy_cell: R F J W I F I I 1 I J 1 I E -1 N E Z J sim_copy_cell C S game_count_move M A 1 O S P`;
/** A=cell, B=ASCII state; count eight finite-grid neighbors. Preserves G. */
const neighbors = `sim_neighbors: W 3071 B M B 8 C S app_div M H A M J C M D Z M K -1
sim_neighbor_row: M L -1
sim_neighbor_col: ife K Z E L Z J sim_neighbor_next end M E H A E K M F J A F L
 ifl E Z J sim_neighbor_next end ifg E 7 J sim_neighbor_next end ifl F Z J sim_neighbor_next end ifg F 7 J sim_neighbor_next end
 M I E P I 8 A I F A I game_board R A I R E 3071 E A E I D 1
sim_neighbor_next: I L 1 ifle L 1 J sim_neighbor_col end I K 1 ifle K 1 J sim_neighbor_row end M A D O S P`;

export const SIMULATION_SOFTWARE: BoardSoftware[] = [
  {
    number:65,kind:'board',id:'life-lab',site:'ecology',title:'Life Laboratory',columns:8,rows:8,stepKey:'n',
    description:'Edit live (*) and dead (.) cells with Enter or Space. N advances Conway Life one synchronous generation: birth at three neighbors, survival at two or three. The finite 8x8 boundary is dead, with no wrapping. R restores a blinker. Steps count generations.',
    inputs:['Cell edits','N: next step'],outputs:['Population grid','Generations'],
    algorithm:`game_reset: M I game_board M E 64
life_clear: W I 46 I I 1 I E -1 N E Z J life_clear W 2927 42 W 2928 42 W 2929 42 W game_message @life_info O S P
game_move: M I game_board A I A R F I M E 88 S E F W I E O S P
${key('life_step')}
life_step: M G Z
life_cell: M A G M B 42 C S sim_neighbors M I game_board A I G R F I M E 46 E A 3 M E 42 ife A 2 ife F 42 M E 42 end end M I 3000 A I G W I E I G 1 ifl G 64 J life_cell end J sim_copy
life_info: ${text('Finite edges; Life B3/S23')}
${neighbors}
${copy}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:board({20:'*',28:'*',36:'*'}),status:0,movesMade:1},{moves:[],steps:2,board:board({27:'*',28:'*',29:'*'}),status:0,movesMade:2},{moves:[27],steps:1,board:'.'.repeat(64),status:0,movesMade:1}],
  },
  {
    number:66,kind:'board',id:'wireworld',site:'radios',title:'Wireworld Circuit Lab',columns:8,rows:8,stepKey:'n',
    description:'Enter cycles empty (.), conductor (#), electron head (H), and tail (t). N advances simultaneously: heads become tails, tails conductors, and a conductor with one or two neighboring heads becomes a head. Eight neighbors, finite edges. R restores a pulse on a wire.',
    inputs:['Cell edits','N: next step'],outputs:['Circuit grid','Generations'],
    algorithm:`game_reset: M I game_board M E 64
wire_clear: W I 46 I I 1 I E -1 N E Z J wire_clear W 2925 116 W 2926 72 M I 2927 M E 4
wire_seed: W I 35 I I 1 I E -1 N E Z J wire_seed W game_message @wire_info O S P
game_move: M I game_board A I A R E I ife E 46 M E 35 else ife E 35 M E 72 else ife E 72 M E 116 else M E 46 end end end W I E O S P
${key('wire_step')}
wire_step: M G Z
wire_cell: M I game_board A I G R E I ife E 72 M E 116 J wire_store end ife E 116 M E 35 J wire_store end
 ife E 35 M A G M B 72 C S sim_neighbors M E 35 E A 1 M E 72 E A 2 M E 72 end
wire_store: M I 3000 A I G W I E I G 1 ifl G 64 J wire_cell end J sim_copy
wire_info: ${text('Cycle . # H t; N evolves')}
${neighbors}
${copy}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:board({25:'#',26:'t',27:'H',28:'#',29:'#',30:'#'}),status:0,movesMade:1},{moves:[],steps:2,board:board({25:'#',26:'#',27:'t',28:'H',29:'#',30:'#'}),status:0,movesMade:2}],
  },
  {
    number:67,kind:'board',id:'langton-ant',site:'moss',title:'Langton Ant',columns:8,rows:8,stepKey:'n',
    description:'N turns the ant right on a white dot or left on a black #, flips that cell, then moves forward. The arrow shows its direction and hides the cell beneath it. Edges wrap around this 8x8 world. Enter flips any selected cell. R resets a north-facing ant on a white grid.',
    inputs:['Cell edits','N: next step'],outputs:['Ant and cells','Steps'],
    algorithm:`game_reset: M I 3000 M E 64
ant_clear: W I Z I I 1 I E -1 N E Z J ant_clear W 3070 36 W 3071 Z W game_message @ant_info J ant_render
game_move: M I 3000 A I A R F I M E 1 S E F W I E J ant_render
${key('ant_step')}
ant_step: R G 3070 M I 3000 A I G R E I M F 1 S F E W I F R H 3071 ife E Z I H 1 else I H 3 end ifge H 4 I H -4 end W 3071 H
 M A G M B 8 C S app_div ife H Z I A -1 ifl A Z M A 7 end end
 ife H 1 I C 1 ifg C 7 M C Z end end ife H 2 I A 1 ifg A 7 M A Z end end ife H 3 I C -1 ifl C Z M C 7 end end
 P A 8 A A C W 3070 A C S game_count_move C S ant_render M A 1 O S P
ant_render: M I game_board M J 3000 M E 64
ant_pixel: R F J M G 46 ifn F Z M G 35 end W I G I I 1 I J 1 I E -1 N E Z J ant_pixel
 M I game_board R E 3070 A I E M J @ant_arrows R E 3071 A J E R F J W I F O S P
ant_arrows: 94 62 118 60
ant_info: ${text('Wraparound ant; edits flip')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:board({36:'#',37:'>'}),status:0,movesMade:1},{moves:[],steps:4,board:board({36:'^',37:'#',44:'#',45:'#'}),status:0,movesMade:4}],
  },
  {
    number:68,kind:'board',id:'sandpile',site:'basalt',title:'Sandpile Avalanche Lab',columns:8,rows:8,stepKey:'n',
    description:'Enter adds one grain, capped at nine. N topples each cell that started with at least four grains exactly once: it loses four and sends one to each orthogonal neighbor. Edge grains fall away. Updates are simultaneous; press N repeatedly to stabilize. R restores four central grains.',
    inputs:['Add grains','N: topple step'],outputs:['Grains per cell','Steps'],
    algorithm:`game_reset: M I game_board M E 64
sand_clear: W I 48 I I 1 I E -1 N E Z J sand_clear W 2927 52 W game_message @sand_info O S P
game_move: M I game_board A I A R E I ifl E 57 I E 1 W I E end O S P
${key('sand_step')}
sand_step: M I game_board M J 3000 M E 64
sand_buffer: R F I W J F I I 1 I J 1 I E -1 N E Z J sand_buffer M G Z
sand_cell: M I game_board A I G R E I ifl E 52 J sand_next end M I 3000 A I G R E I I E -4 W I E
 M A G M B 8 C S app_div M H A M J C
 ifg H Z M A G I A -8 C S sand_add end ifl H 7 M A G I A 8 C S sand_add end
 ifg J Z M A G I A -1 C S sand_add end ifl J 7 M A G I A 1 C S sand_add end
sand_next: I G 1 ifl G 64 J sand_cell end J sim_copy
sand_add: M I 3000 A I A R E I I E 1 W I E O S P
sand_info: ${text('Enter adds; N topples once')}
${copy}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:board({19:'1',26:'1',28:'1',35:'1'},'0'),status:0,movesMade:1},{moves:[0,0,0,0],steps:1,board:board({1:'1',8:'1',19:'1',26:'1',28:'1',35:'1'},'0'),status:0,movesMade:1}],
  },
  {
    number:69,kind:'board',id:'heat-grid',site:'weather',title:'Integer Heat Diffusion',columns:8,rows:8,stepKey:'n',
    description:'Enter adds three to a cell, wrapping values above nine to zero. N replaces each cell with the floor of the average of itself and its existing orthogonal neighbors, simultaneously. This is a small integer averaging model, not a physical solver. R restores a central hot square.',
    inputs:['Heat edits','N: average step'],outputs:['Heat grid','Steps'],
    algorithm:`game_reset: M I game_board M E 64
heat_clear: W I 48 I I 1 I E -1 N E Z J heat_clear W 2927 57 W 2928 57 W 2935 57 W 2936 57 W game_message @heat_info O S P
game_move: M I game_board A I A R E I I E 3 ifg E 57 M E 48 end W I E O S P
${key('heat_step')}
heat_step: M G Z
heat_cell: M A G M B 8 C S app_div M H A M J C M I game_board A I G R D I S D 48 M L 1
 ifg H Z M A G I A -8 C S heat_add end ifl H 7 M A G I A 8 C S heat_add end ifg J Z M A G I A -1 C S heat_add end ifl J 7 M A G I A 1 C S heat_add end
 M A D M B L C S app_div A A 48 M I 3000 A I G W I A I G 1 ifl G 64 J heat_cell end J sim_copy
heat_add: M I game_board A I A R E I S E 48 A D E I L 1 O S P
heat_info: ${text('Integer neighbor averaging')}
${copy}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:board({19:'1',20:'1',26:'1',27:'5',28:'5',29:'1',34:'1',35:'5',36:'5',37:'1',43:'1',44:'1'},'0'),status:0,movesMade:1}],
  },
  {
    number:70,kind:'board',id:'maze-route',site:'maze',title:'Shortest Route Explorer',columns:8,rows:8,stepKey:'n',counterLabel:'Runs',
    description:'Enter toggles walls (#); S and G cannot be changed. N uses breadth-first search to mark one shortest orthogonal route with *. Edits clear the previous route. Empty cells are dots. Neighbors are visited up, right, down, left; R clears all walls.',
    inputs:['Wall edits','N: find route'],outputs:['Shortest route','Runs','Reachability'],
    algorithm:`game_reset: M I game_board M E 64
maze_clear: W I 46 I I 1 I E -1 N E Z J maze_clear W game_board 83 W 2963 71 W game_message @maze_info O S P
game_move: E A Z O S P E A 63 O S P U S A C S maze_erase O S A M I game_board A I A R E I ife E 35 M E 46 else M E 35 end W I E W game_status Z W game_message @maze_info O S P
maze_erase: M I game_board M E 64
maze_erase_cell: R F I E F 42 W I 46 I I 1 I E -1 N E Z J maze_erase_cell O S P
${key('maze_search')}
maze_search: C S maze_erase C S game_count_move M I 3000 M E 64
maze_init: W I -2 I I 1 I E -1 N E Z J maze_init W 3000 -1 W 3100 Z W 3070 Z W 3071 1
maze_pop: R E 3070 R F 3071 E E F J maze_missing M I 3100 A I E R G I I E 1 W 3070 E E G 63 J maze_found
 M A G M B 8 C S app_div M H A M J C
 ifg H Z M A G I A -8 C S maze_visit end ifl J 7 M A G I A 1 C S maze_visit end ifl H 7 M A G I A 8 C S maze_visit end ifg J Z M A G I A -1 C S maze_visit end J maze_pop
maze_visit: M I game_board A I A R E I E E 35 O S P M I 3000 A I A R E I N E -2 O S P W I G M I 3100 R E 3071 A I E W I A I E 1 W 3071 E O S P
maze_found: W game_status 1 W game_message @maze_yes M G 63
maze_trace: M I 3000 A I G R G I E G Z J maze_done M I game_board A I G W I 42 J maze_trace
maze_done: M A 1 O S P
maze_missing: W game_status -1 W game_message @maze_no M A 1 O S P
maze_info: ${text('N finds a shortest route')}
maze_yes: ${text('Route found; * marks path')}
maze_no: ${text('No route; edit and retry')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:board(Object.fromEntries([[0,'S'],[63,'G'],...[1,2,3,4,5,6,7,15,23,31,39,47,55].map(i=>[i,'*'])])),status:1,movesMade:1},{moves:[1,8],steps:1,board:board({0:'S',1:'#',8:'#',63:'G'}),status:-1,movesMade:1}],
  },
];
