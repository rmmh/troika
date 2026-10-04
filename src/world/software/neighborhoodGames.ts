import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const two=`hood_two: M B 10 C S app_div A A 48 W J A A C 48 M J/1 C O S P
${POSITIVE_DIVISION}`;
export const NEIGHBORHOOD_GAMES:BoardSoftware[]=[
{number:198,kind:'board',id:'scrap-slider',site:'salvage',title:'Scrap Slider',columns:6,rows:6,counterLabel:'Moves',controls:'Enter:crate/end R:reset',inputs:['Crate','Empty end square'],outputs:['Crate positions','Exit reached'],description:'Slide crate A to the right-hand end of its row in a six-by-six salvage yard. Enter on a crate selects it (lowercase marks selection). Then Enter on the empty square immediately before or after either end to slide it one cell along its own axis. A and C move horizontally, B vertically; crates cannot turn, overlap, or leave the yard. Select another crate to switch. Move C right to clear room below B, then move B down to release A. R restarts; F1 exits.',
algorithm:`game_reset: W 3200 12 W 3201 8 W 3202 25 W 3203 -1 W game_message @scrap_prompt J scrap_render
game_move: R E game_status N E Z O S P M L A M I game_board A I A R E I ifge E 97 S E 32 end ifge E 65 ifle E 67 S E 65 W 3203 E W game_message @scrap_end J scrap_render end end R G 3203 ifl G Z W game_message @scrap_pick O S P end M I 3200 A I G R H I M I @scrap_lengths A I G R K I M I @scrap_steps A I G R J I M E H S E J ife L E M D -1 else M E K P E J A E H ifn L E W game_message @scrap_end O S P end M D 1 end M I game_board A I L R E I ifn E 46 O S P end ife J 1 M A H M B 6 C S app_div ifl D Z ife C Z O S P end else A C K ifge C 6 O S P end end end M E J P E D A H E M I 3200 A I G W I H C S game_count_move R E 3200 ife E 16 W game_status 1 W game_message @scrap_win end J scrap_render
scrap_render: M I game_board M E 36
scrap_clear: W I 46 I I 1 I E -1 N E Z J scrap_clear M L Z
scrap_crate: M I 3200 A I L R G I M I @scrap_lengths A I L R H I M I @scrap_steps A I L R K I M E 65 A E L R F 3203 ife F L A E 32 end M I game_board A I G
scrap_draw: W I E A I K I H -1 N H Z J scrap_draw I L 1 ifl L 3 J scrap_crate end O S P
scrap_lengths: 2 3 3
scrap_steps: 1 6 1
scrap_prompt: ${text('Slide A to the right edge')}
scrap_pick: ${text('Select a crate first')}
scrap_end: ${text('Choose empty square at end')}
scrap_win: ${text('Exit clear! Crate A is out')}
${POSITIVE_DIVISION}`,
examples:[{moves:[25,28],board:'......'+'..B...'+'AAB...'+'..B...'+'..ccc.'+'......',status:0,movesMade:1}]},
{number:199,kind:'board',id:'mask-logic',site:'masks',title:'Mask Logic',columns:4,rows:4,stepKey:'n',counterLabel:'Edits',controls:'Enter:mask N:check R:reset',inputs:['Act/actor square','N: check'],outputs:['Mask assignments','Rule feedback'],description:'Cast four actors across four acts. Rows are acts, columns are actors, and masks A/B/C/D must each appear exactly once in every row and column. Lowercase letters are five fixed casting clues. Enter cycles an editable cell through A,B,C,D,blank. N checks completeness and duplicate masks, explaining the first failed rule. There are no box regions: this is an actor/act assignment puzzle, with one solution given the clues. R clears your choices; F1 exits.',
algorithm:`game_reset: M I game_board M J @mask_initial M E 16
mask_init: R F J W I F I I 1 I J 1 I E -1 N E Z J mask_init W game_message @mask_prompt O S P
game_move: R E game_status N E Z O S P M I game_board A I A R E I ifge E 97 W game_message @mask_fixed O S P end ife E 46 M E 65 else I E 1 ifg E 68 M E 46 end end W I E W game_message @mask_prompt J game_count_move
game_key: E A 1 J mask_check E A -26 J mask_check M A Z O S P
mask_check: R E game_status ifn E Z M A Z O S P end M G Z
mask_cell: M I game_board A I G R H I ife H 46 W game_message @mask_blank J mask_done end ifge H 97 S H 32 end M K G I K 1
mask_other: ifge K 16 J mask_next end M A G M B 4 C S app_div M J A M L C M A K C S app_div ife J A M D 1 else ife L C M D 2 else J mask_skip end end M I game_board A I K R E I ifge E 97 S E 32 end ife E H ife D 1 W game_message @mask_row else W game_message @mask_col end J mask_done end
mask_skip: I K 1 J mask_other
mask_next: I G 1 ifl G 16 J mask_cell end W game_status 1 W game_message @mask_win
mask_done: M A 1 O S P
mask_initial: ${text('a..d.c....a.d...')}
mask_prompt: ${text('One of A/B/C/D per row/col')}
mask_fixed: ${text('Lowercase clues are fixed')}
mask_blank: ${text('An act still has a blank')}
mask_row: ${text('An act repeats a mask')}
mask_col: ${text('An actor repeats a mask')}
mask_win: ${text('All actors correctly cast!')}
${POSITIVE_DIVISION}`,
examples:[{moves:[0,1],board:'aA.d.c....a.d...',status:0,movesMade:1}]},
{number:200,kind:'board',id:'pebble-mancala',site:'pebbles',title:'Pebble Mancala',columns:8,rows:4,counterLabel:'Sows',controls:'Enter:your pit R:restart',inputs:['Current side pit'],outputs:['Pits/stores','Turn','Winner'],description:'Two players share three pits each, initially three pebbles per pit. A uses the lower row, B the upper row; each pit is a two-digit count. Select either digit in your pit and Enter. Sow around the ring, skipping the opponent store. The right store belongs to A and left to B. Ending in your store gives another turn. Ending in your own empty pit captures that pebble and a nonempty opposite pit. When either side empties, sweep the other side into its store; higher store wins. TURN shows whose move it is. R restarts; F1 exits.',
algorithm:`game_reset: M I 3300 M E 8
manc_init: W I 3 I I 1 I E -1 N E Z J manc_init W 3303 Z W 3307 Z W 3200 Z W game_message @manc_prompt J manc_render
game_move: R E game_status N E Z O S P M B 8 C S app_div M H A ifl C 1 O S P end ifg C 6 O S P end R L 3200 ife L Z ifn H 2 W game_message @manc_side O S P end else ifn H Z W game_message @manc_side O S P end end M A C I A -1 M B 2 C S app_div M G A ifn L Z M G 6 S G A end M I 3300 A I G R H I ife H Z W game_message @manc_empty O S P end W I Z
manc_sow: I G 1 ife G 8 M G Z end ife L Z E G 7 J manc_sow else E G 3 J manc_sow end M I 3300 A I G R E I I E 1 W I E I H -1 N H Z J manc_sow
 ife L Z ifge G 3 J manc_capture_done end else ifl G 4 J manc_capture_done end ifge G 7 J manc_capture_done end end R E I ifn E 1 J manc_capture_done end M J 3306 S J G R K J ife K Z J manc_capture_done end W J Z W I Z I K 1 M I 3303 ifn L Z M I 3307 end R E I A E K W I E
manc_capture_done: C S game_count_move M H 3 ifn L Z M H 7 end ifn G H M E 1 S E L W 3200 E end W game_message @manc_prompt M G Z M H Z M K Z
manc_totals: M I 3300 A I K R E I A G E M I 3304 A I K R E I A H E I K 1 ifl K 3 J manc_totals end ife G Z J manc_finish end ife H Z J manc_finish end J manc_render
manc_finish: R E 3303 A E G W 3303 E R E 3307 A E H W 3307 E M K Z
manc_sweep: M I 3300 A I K W I Z M I 3304 A I K W I Z I K 1 ifl K 3 J manc_sweep end R G 3303 R H 3307 ifg G H W game_status 1 W game_message @manc_a else ifl G H W game_status 2 W game_message @manc_b else W game_status 3 W game_message @manc_draw end end
manc_render: M I game_board M J @manc_initial M E 32
manc_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J manc_copy M L Z
manc_row: M I 3300 A I L R A I M J 2917 M E L P E 2 A J E C S hood_two M I 3306 S I L R A I M J 2901 M E L P E 2 A J E C S hood_two I L 1 ifl L 3 J manc_row end R A 3307 M J 2909 C S hood_two R A 3303 M J 2914 C S hood_two R E 3200 A E 65 W 2928 E O S P
manc_initial: ${text('B030303.S00..S00A030303.TURNA...')}
manc_prompt: ${text('Sow a pit on your side')}
manc_side: ${text('Choose the current side pit')}
manc_empty: ${text('That pit is empty')}
manc_a: ${text('A wins! R for a new game')}
manc_b: ${text('B wins! R for a new game')}
manc_draw: ${text('Equal stores: a draw!')}
${two}`,
examples:[{moves:[17],board:'B030303.S00..S01A000404.TURNA...',status:0,movesMade:1}]},
{number:201,kind:'board',id:'hotel-elevator',site:'hotel',title:'Hotel Elevator',columns:8,rows:6,counterLabel:'Steps',controls:'Enter:guest/up/down R:reset',inputs:['Guest/direction'],outputs:['Lift/floors','Cab passengers','Delivered'],description:'Deliver five guests within ten floor steps. @ marks the lift; each lowercase guest has a destination digit. Select either character of a waiting guest and Enter to board them when the lift is on that floor. The cab holds two. Select UP or DOWN and Enter to move one floor; guests automatically leave at their destination. CAB shows carried guests and destinations. Boarding costs no steps; full-cab and wrong-floor selections do nothing. Guests: a1>4, b1>3, c2>4, d4>1, e4>2. Plan pickups around the two-person limit. R restarts; F1 exits.',
algorithm:`game_reset: W 3200 1 W 3201 Z W 3202 Z M I 3300 M E 5
hotel_init: W I Z I I 1 I E -1 N E Z J hotel_init W game_message @hotel_prompt J hotel_render
game_move: R E game_status N E Z O S P ifge A 32 ifge A 40 O S P end R G 3200 ifl A 36 ife G 4 O S P end I G 1 else ife G 1 O S P end I G -1 end W 3200 G C S game_count_move M L Z
hotel_arrive: M I 3300 A I L R E I ife E 1 M I @hotel_dest A I L R E I ife E G M I 3300 A I L W I 2 R E 3201 I E -1 W 3201 E R E 3202 I E 1 W 3202 E end end I L 1 ifl L 5 J hotel_arrive end W game_message @hotel_prompt R E 3202 ife E 5 W game_status 1 W game_message @hotel_win else R E game_moves ife E 10 W game_status 2 W game_message @hotel_lose end end J hotel_render end
 M G A M L Z
hotel_find: M I @hotel_cells A I L R E I ife G E J hotel_board end I E 1 ife G E J hotel_board end I L 1 ifl L 5 J hotel_find end O S P
hotel_board: M I 3300 A I L R E I N E Z O S P M I @hotel_origin A I L R E I R F 3200 ifn E F W game_message @hotel_far O S P end R E 3201 ife E 2 W game_message @hotel_full O S P end I E 1 W 3201 E M I 3300 A I L W I 1 W game_message @hotel_got J hotel_render
hotel_render: M I game_board M J @hotel_initial M E 48
hotel_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J hotel_copy R E 3200 M F 4 S F E P F 8 A F 2902 W F 64 M L Z M K Z
hotel_guest: M I 3300 A I L R G I ifn G Z M I @hotel_cells A I L R E I M I game_board A I E W I 46 M I/1 46 ife G 1 M I 2943 M E K P E 2 A I E M E 97 A E L W I E M J @hotel_dest A J L R E J A E 48 M I/1 E I K 1 end end I L 1 ifl L 5 J hotel_guest end O S P
hotel_initial: ${text('4...d1e23.......2...c4..1...a4b3UP  DOWNCAB.....')}
hotel_origin: 1 1 2 4 4
hotel_dest: 4 3 4 1 2
hotel_cells: 28 30 20 4 6
hotel_prompt: ${text('Deliver all five in 10 steps')}
hotel_far: ${text('Lift is on another floor')}
hotel_full: ${text('Cab full: deliver a guest')}
hotel_got: ${text('Guest boarded; choose stop')}
hotel_win: ${text('All guests delivered!')}
hotel_lose: ${text('Ten steps; guests still wait')}`,
examples:[{moves:[28],board:'4...d1e23.......2...c4..1.@...b3UP  DOWNCABa4...',status:0,movesMade:0}]},
];
