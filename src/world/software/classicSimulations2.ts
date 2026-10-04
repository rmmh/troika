import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const common=`sim_copy: M I game_board M J @sim_initial M K game_cells
sim_copy_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J sim_copy_loop O S P
sim_number: M B 1000 C S app_div A A 48 W J A M A C M B 100 C S app_div A A 48 M J/1 A M A C M B 10 C S app_div A A 48 M J/2 A A C 48 M J/3 C O S P
${POSITIVE_DIVISION}`;
export const CLASSIC_SIMULATIONS_2:BoardSoftware[]=[
 {number:182,kind:'board',id:'ferry-crossing',site:'creek',title:'Ferry Crossing',columns:8,rows:5,stepKey:'n',counterLabel:'Trips',controls:'Enter:cross N:help R:reset',inputs:['Passenger row'],outputs:['River banks','Crossings','Safe or lost'],
 description:'Ferry a wolf W, goat G and grain C from WEST to EAST. F is the ferryman. Select any cell in a passenger row and Enter to cross with that passenger, provided it is on your bank. Select the F row to cross alone. Without the ferryman, the wolf eats the goat and the goat eats the grain. Leave neither pair unattended. N explains the selected row; R restarts, F1 exits. Seven crossings suffice.',
 algorithm:`game_reset: C S sim_copy W 3200 Z W 3201 Z W 3202 Z W 3203 Z W game_message @ferry_prompt O S P
game_move: R E game_status N E Z O S P M B 8 C S app_div E A Z O S P I A -1 M L A R G 3203
 ifl L 3 M I 3200 A I L R E I ifn E G W game_message @ferry_far O S P end M E 1 S E G W I E end M E 1 S E G W 3203 E C S game_count_move W game_message @ferry_prompt
 R G 3200 R H 3201 R K 3202 R L 3203 ifn H L ife G H W game_status 2 W game_message @ferry_wolf else ife H K W game_status 2 W game_message @ferry_goat end end end
 A G H A G K A G L ife G 4 W game_status 1 W game_message @ferry_won end J ferry_render
ferry_render: C S sim_copy M L Z
ferry_actor: M I 3200 A I L R E I ifn E Z M J L I J 1 P J 8 A J game_board R E J W J 46 M J/7 E end I L 1 ifl L 4 J ferry_actor end O S P
game_key: E A 1 J ferry_help E A -26 J ferry_help M A Z O S P
ferry_help: R E game_status ifn E Z M A Z O S P end R E board_row M I @ferry_helps A I E R E I W game_message E M A 1 O S P
sim_initial: ${text('WESTEASTW..~~...G..~~...C..~~...F..~~...')}
ferry_helps: @ferry_prompt @ferry_hw @ferry_hg @ferry_hc @ferry_hf
ferry_prompt: ${text('All east; guard W/G and G/C')}
ferry_hw: ${text('W: wolf, cannot stay with G')}
ferry_hg: ${text('G: goat, cannot stay with C')}
ferry_hc: ${text('C: grain; goat eats it')}
ferry_hf: ${text('F: cross without passenger')}
ferry_far: ${text('Passenger is on other bank')}
ferry_wolf: ${text('Wolf ate goat. R retries')}
ferry_goat: ${text('Goat ate grain. R retries')}
ferry_won: ${text('All safe on the east bank!')}
${common}`,
 examples:[{moves:[16,32,8,16,24,32,16],board:'WESTEAST...~~..W...~~..G...~~..C...~~..F',status:1,movesMade:7},{moves:[8],board:'WESTEAST...~~..WG..~~...C..~~......~~..F',status:2,movesMade:1}]},
 {number:183,kind:'board',id:'forest-firebreak',site:'ecology',title:'Forest Firebreak',columns:6,rows:6,stepKey:'n',counterLabel:'Ticks',controls:'Enter:cut N:wait R:reset',inputs:['Tree to cut','N: wait'],outputs:['Fire map','Village safety'],
 description:'Protect the village H and leave at least ten trees T standing. Enter cuts one selected tree into a firebreak #, then advances fire one tick; N waits one tick without cutting. Fire * spreads simultaneously to orthogonally adjacent trees and the village, while old flames become ash dots. Existing # river cells block fire. Invalid cuts cost no time. Win when the fire dies out, H is safe, and ten trees remain. R restores the same fire, F1 exits.',
 algorithm:`game_reset: C S sim_copy W game_message @fire_prompt O S P
game_move: R E game_status N E Z O S P M I game_board A I A R E I ifn E 84 W game_message @fire_tree O S P end W I 35 J fire_step
game_key: E A 1 J fire_wait E A -26 J fire_wait M A Z O S P
fire_wait: R E game_status ifn E Z M A Z O S P end C S fire_step M A 1 O S P
fire_step: M L Z
fire_cell: M I game_board A I L R G I M H G ife G 42 M H 46 J fire_store end ife G 84 J fire_neighbors end ife G 72 J fire_neighbors end J fire_store
fire_neighbors: M A L M B 6 C S app_div W 3200 A W 3201 C
 R E 3200 ifg E Z M I game_board A I L S I 6 R E I E E 42 J fire_burn end R E 3200 ifl E 5 M I game_board A I L A I 6 R E I E E 42 J fire_burn end
 R E 3201 ifg E Z M I game_board A I L I I -1 R E I E E 42 J fire_burn end R E 3201 ifl E 5 M I game_board A I L I I 1 R E I E E 42 J fire_burn end J fire_store
fire_burn: M H 42 ife G 72 W game_status 2 W game_message @fire_lost end
fire_store: M I 3000 A I L W I H I L 1 ifl L 36 J fire_cell end
 M L Z M G Z M H Z
fire_commit: M I 3000 A I L R E I M I game_board A I L W I E ife E 42 I G 1 end ife E 84 I H 1 end I L 1 ifl L 36 J fire_commit end C S game_count_move R E game_status N E Z O S P W game_message @fire_prompt ife G Z ifge H 10 W game_status 1 W game_message @fire_won else W game_status 2 W game_message @fire_bare end end O S P
sim_initial: ${text('*TT#TTTTT#TTTTTTTTTTT#TTTTT#TTTTT#TH')}
fire_prompt: ${text('Save H and at least 10 T')}
fire_tree: ${text('Choose a T tree to cut')}
fire_lost: ${text('The village burned. Retry R')}
fire_won: ${text('Fire out; forest protected!')}
fire_bare: ${text('Fire out; too few trees')}
${common}`,
 examples:[{moves:[15],steps:8,board:'...#TT...#TT...#TT...#TT...#TT...#TH',status:1,movesMade:8}]},
 {number:184,kind:'board',id:'fishing-season',site:'roofbirds',title:'Fishing Season',columns:8,rows:8,stepKey:'n',counterLabel:'Days',controls:'Enter:choose N:help R:reset',inputs:['Net or sail'],outputs:['Catch','Three shoals','Season result'],
 description:'Catch forty fish in twelve days while leaving at least four in each of three shoals. FISH is your total, PORT the active shoal, SEA1..SEA3 the current stocks. NET 3 or NET 6 catches up to that many fish from your current shoal; the other shoals each regenerate two fish, capped at sixteen. SAIL visits the next shoal (3 wraps to 1), catches nothing, and all shoals regenerate two. Both actions cost one day. N explains the selected row; R restarts, F1 exits.',
 algorithm:`game_reset: C S sim_copy W 3200 Z W 3201 1 W 3210 12 W 3211 8 W 3212 4 W game_message @fish_prompt J fish_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifl A 5 O S P end M L A R G 3201 I G -1
 ife L 7 I G 1 ife G 3 M G Z end M E G I E 1 W 3201 E else M I 3210 A I G R H I M E 3 ife L 6 M E 6 end ifl H E M E H end S H E W I H R H 3200 A H E W 3200 H end
 M K Z
fish_grow: ifn L 7 E K G J fish_next end M I 3210 A I K R E I I E 2 ifg E 16 M E 16 end W I E
fish_next: I K 1 ifl K 3 J fish_grow end C S game_count_move W game_message @fish_prompt R E game_moves
 ife E 12 W game_status 1 W game_message @fish_won R E 3200 ifl E 40 W game_status 2 end M K Z
fish_check: M I 3210 A I K R E I ifl E 4 W game_status 2 end I K 1 ifl K 3 J fish_check end R E game_status ife E 2 W game_message @fish_lost end end J fish_render
fish_render: R A 3200 M J 2904 C S sim_number R A 3201 M J 2912 C S sim_number R A 3210 M J 2920 C S sim_number R A 3211 M J 2928 C S sim_number R A 3212 M J 2936 C S sim_number O S P
game_key: E A 1 J fish_help E A -26 J fish_help M A Z O S P
fish_help: R E game_status ifn E Z M A Z O S P end R E board_row M I @fish_helps A I E R E I W game_message E M A 1 O S P
sim_initial: ${text('FISH0000PORT0001SEA10012SEA20008SEA30004NET 3   NET 6   SAIL    ')}
fish_helps: @fish_h0 @fish_h1 @fish_h2 @fish_h2 @fish_h2 @fish_h5 @fish_h6 @fish_h7
fish_h0: ${text('Goal: 40 fish in 12 days')}
fish_h1: ${text('Nets fish your current port')}
fish_h2: ${text('Finish with 4+ in each sea')}
fish_h5: ${text('Catch 3; other seas grow 2')}
fish_h6: ${text('Catch 6; other seas grow 2')}
fish_h7: ${text('Next port; all seas grow 2')}
fish_prompt: ${text('40 catch; leave 4 each sea')}
fish_won: ${text('Full nets; healthy shoals!')}
fish_lost: ${text('Need 40 fish; leave 4 each')}
${common}`,
 examples:[{moves:[48],board:'FISH0006PORT0001SEA10006SEA20010SEA30006NET 3   NET 6   SAIL    ',status:0,movesMade:1},{moves:[56],board:'FISH0000PORT0002SEA10014SEA20010SEA30006NET 3   NET 6   SAIL    ',status:0,movesMade:1}]},
 {number:185,kind:'board',id:'crop-rotation',site:'orchard',title:'Crop Rotation',columns:8,rows:3,stepKey:'n',counterLabel:'Years',controls:'Enter:crop N:year R:reset',inputs:['Plot crop','N: harvest'],outputs:['Crops and soil','Harvest total'],
 description:'Eight plots occupy the top two rows, each shown as a crop letter and soil digit (0..5). Enter on either character cycles G grain, B beans, R rest. N harvests one year; plan four years to gather sixty food. Grain yields twice the starting soil, halved if any orthogonally adjacent plot also grows grain, and removes two soil (minimum zero). Beans yield one food and add one soil; rest yields none and adds two soil (maximum five). All plots harvest simultaneously. Neighbors are the four-by-two plot grid, not individual text cells. Editing a crop shows its rule; selecting FOOD recalls the goal. R restarts, F1 exits.',
 algorithm:`game_reset: C S sim_copy M I 3200 M E 8
crop_soil_init: W I 3 I I 1 I E -1 N E Z J crop_soil_init W 3210 Z W game_message @crop_prompt O S P
game_move: R E game_status N E Z O S P ifge A 16 W game_message @crop_prompt O S P end M B 2 C S app_div M G A P G 2 A G game_board R E G ife E 71 M E 66 W game_message @crop_beans else ife E 66 M E 82 W game_message @crop_rest else M E 71 W game_message @crop_grain end end W G E O S P
game_key: E A 1 J crop_tick E A -26 J crop_tick M A Z O S P
crop_tick: R E game_status ifn E Z M A Z O S P end W game_message @crop_prompt M L Z
crop_plot: M I game_board M E L P E 2 A I E R G I M I 3200 A I L R H I M K Z
 ife G 66 M K 1 I H 1 J crop_store end ife G 82 I H 2 J crop_store end M K H P K 2 M A L M B 4 C S app_div M J C
 ifg J Z M I L I I -1 C S crop_neighbor E E 71 J crop_crowded end ifl J 3 M I L I I 1 C S crop_neighbor E E 71 J crop_crowded end M I L ifl L 4 I I 4 else I I -4 end C S crop_neighbor E E 71 J crop_crowded J crop_drain
crop_crowded: M K H
crop_drain: I H -2 ifl H Z M H Z end
crop_store: ifg H 5 M H 5 end M I 3200 A I L W I H M I L P I 2 A I 2901 M E H A E 48 W I E R E 3210 A E K W 3210 E I L 1 ifl L 8 J crop_plot end C S game_count_move R A 3210 M J 2920 C S sim_number R E game_moves ife E 4 R E 3210 ifge E 60 W game_status 1 W game_message @crop_won else W game_status 2 W game_message @crop_lost end end M A 1 O S P
crop_neighbor: P I 2 A I game_board R E I O S P
sim_initial: ${text('G3G3G3G3G3G3G3G3FOOD0000')}
crop_prompt: ${text('G/B/R crops; 60 food, 4 yrs')}
crop_grain: ${text('G: soil x2(/2 crowd),soil-2')}
crop_beans: ${text('B: food +1, soil +1')}
crop_rest: ${text('R: no food, soil +2')}
crop_won: ${text('A rich rotating harvest!')}
crop_lost: ${text('Four years; need 60 food')}
${common}`,
 examples:[{moves:[],steps:1,board:'G1G1G1G1G1G1G1G1FOOD0024',status:0,movesMade:1},{moves:[],steps:4,board:'G0G0G0G0G0G0G0G0FOOD0032',status:2,movesMade:4}]},
];
