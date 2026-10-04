import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const t=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const copy=`v_copy: M I game_board M J @v_initial M K game_cells
v_copy_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J v_copy_loop O S P`;
export const VILLAGE_SIMULATIONS:BoardSoftware[]=[
{number:190,kind:'board',id:'tram-dispatch',site:'tram',title:'Junction Dispatcher',columns:8,rows:5,stepKey:'n',counterLabel:'Ticks',controls:'Enter:switch N:tick R:reset',inputs:['Signal or fork','N: advance'],outputs:['Trains','Arrival result'],description:'Guide eastbound A and westbound B past each other within twelve ticks. Enter on the top or bottom row toggles that train between GO and STOP. Enter on FORK toggles MAIN/SIDE: A at the left junction takes the upper siding when SIDE is set; B always uses the main track. N moves both trains simultaneously one track cell. Meeting in a cell or swapping across one edge is a collision. Trains disappear after leaving their destination end. R resets, F1 exits.',
algorithm:`game_reset: W 3200 16 W 3201 23 W 3202 1 W 3203 1 W 3204 Z W game_message @tram_goal J tram_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ife A Z M I 3202 else ife A 4 M I 3203 else ife A 3 M I 3204 else O S P end end end R E I M F 1 S F E W I F J tram_render
game_key: E A 1 J tram_tick E A -26 J tram_tick M A Z O S P
tram_tick: R E game_status ifn E Z M A Z O S P end R G 3200 R H 3201 M J G M K H R E 3202 ifn E Z ifge G Z ife G 23 M J -1 else ife G 18 R E 3204 ifn E Z M J 10 else I J 1 end else ife G 13 M J 21 else I J 1 end end end end end R E 3203 ifn E Z ifge H Z ife H 16 M K -1 else I K -1 end end end
 W 3200 J W 3201 K C S game_count_move ifge J Z ife J K J tram_crash end ife J H ife K G J tram_crash end end end ifl J Z ifl K Z W game_status 1 W game_message @tram_won J tram_done end end R E game_moves ifge E 12 W game_status 2 W game_message @tram_late end J tram_done
tram_crash: W game_status 2 W game_message @tram_hit
tram_done: C S tram_render M A 1 O S P
tram_render: C S v_copy R E 3202 ife E Z W 2902 83 W 2903 84 W 2904 79 W 2905 80 end R E 3203 ife E Z W 2934 83 W 2935 84 W 2936 79 W 2937 80 end R E 3204 ifn E Z W 2928 83 W 2929 73 W 2930 68 W 2931 69 end R E 3200 ifge E Z M I game_board A I E W I 65 end R E 3201 ifge E Z M I game_board A I E W I 66 end O S P
v_initial: ${t('A GO    ..----..--------FORKMAINB GO    ')}
tram_goal: ${t('Both trains home: 12 ticks')}
tram_hit: ${t('Collision! Stop or divert')}
tram_late: ${t('Twelve ticks: service late')}
tram_won: ${t('Both trains arrived safely')}
${copy}
${POSITIVE_DIVISION}`,
examples:[{moves:[24],steps:10,board:'A GO    ..----..--------FORKSIDEB GO    ',status:1,movesMade:10},{moves:[],steps:4,board:'A GO    ..----..---BA---FORKMAINB GO    ',status:2,movesMade:4}]},
{number:191,kind:'board',id:'pipe-workshop',site:'depot',title:'Pipe Workshop',columns:8,rows:4,stepKey:'n',counterLabel:'Turns',controls:'Enter:rotate N:test R:reset',inputs:['Pipe tile','N: test flow'],outputs:['Port pairs','Leaks or flow'],description:'Each pair of letters is one pipe tile on a four-by-four grid; N/E/S/W are its two open ports. Enter either letter rotates that tile clockwise. N tests water from the north edge of the upper-left tile to the west edge of the lower-left tile. The route must visit all sixteen tiles, with every joined port matching its neighbor. Straight pipes alternate NS/EW; elbows rotate NE, ES, SW, WN. A failed test identifies a bad joint, edge leak, or short route. R resets, F1 exits.',
algorithm:`game_reset: M I 3200 M J @pipe_start M K 16
pipe_init: R E J W I E I I 1 I J 1 I K -1 N K Z J pipe_init W game_message @pipe_goal J pipe_render
game_move: R E game_status N E Z O S P M B 2 C S app_div M I 3200 A I A R E I ifl E 4 I E 1 ife E 4 M E Z end else M F 9 S F E M E F end W I E C S game_count_move J pipe_render
game_key: E A 1 J pipe_test E A -26 J pipe_test M A Z O S P
pipe_test: R E game_status ifn E Z M A Z O S P end M G Z M H Z M L Z
pipe_walk: I L 1 ifg L 16 W game_message @pipe_loop J pipe_done end M I 3200 A I G R E I P E 2 M I @pipe_ports A I E R J I M K I/1
 ife H J M H K else ife H K M H J else W game_message @pipe_joint J pipe_done end end
 M A G M B 4 C S app_div M J A M K C
 ife H Z ife J Z J pipe_edge end S G 4 M H 2 else ife H 1 ife K 3 J pipe_edge end I G 1 M H 3 else ife H 2 ife J 3 J pipe_edge end I G 4 M H Z else ife K Z ife G 12 ife L 16 W game_status 1 W game_message @pipe_won else W game_message @pipe_short end J pipe_done end J pipe_edge end I G -1 M H 1 end end end J pipe_walk
pipe_edge: W game_message @pipe_leak
pipe_done: M A 1 O S P
pipe_render: M L Z
pipe_draw: M I 3200 A I L R E I P E 2 M J @pipe_letters A J E R E J M F J/1 M I game_board M K L P K 2 A I K W I E M I/1 F I L 1 ifl L 16 J pipe_draw end O S P
pipe_start: 1 4 4 3 2 4 4 0 1 4 4 3 4 4 4 0
pipe_ports: 0 1 1 2 2 3 3 0 0 2 1 3
pipe_letters: ${t('NEESSWWNNSEW').split(' ').slice(0,-1).join(' ')}
pipe_goal: ${t('In NW north; out SW west')}
pipe_joint: ${t('A joint has unmatched ports')}
pipe_leak: ${t('Water leaks off an edge')}
pipe_short: ${t('Outlet before all 16 pipes')}
pipe_loop: ${t('Water entered a closed loop')}
pipe_won: ${t('All sixteen pipes flow!')}
${POSITIVE_DIVISION}`,
examples:[{moves:[],steps:1,board:'ESNSNSWNSWNSNSNEESNSNSWNNSNSNSNE',status:0,movesMade:0}]},
{number:192,kind:'board',id:'parcel-round',site:'postbox',title:'Parcel Round',columns:6,rows:6,stepKey:'n',counterLabel:'Moves',controls:'Enter:walk N:help R:reset',inputs:['Adjacent street'],outputs:['Parcels/homes','Delivery result'],description:'Deliver a, b and c to matching homes A, B and C within twenty-four street moves. @ is your courier. Select an orthogonally adjacent cell and Enter to walk. Visiting a parcel picks it up automatically if the two-parcel bag has room; otherwise it remains for later. Entering its matching home delivers it. Delivered homes become +. Plan pickup order and routes around the carrying limit. The status line always lists carried letters after Bag: (a dash is absent). N recalls the goal, R restarts, F1 exits.',
algorithm:`game_reset: W 3200 Z W 3201 Z W 3202 Z M I 3210 M E 9
parcel_clear: W I Z I I 1 I E -1 N E Z J parcel_clear W game_message @parcel_goal J parcel_render
game_move: R E game_status N E Z O S P W 3203 A M B 6 C S app_div M G A M H C R A 3200 C S app_div S G A F G A S H C F H A A G H ifn G 1 W game_message @parcel_adj J parcel_message end R G 3203 W 3200 G C S game_count_move W game_message @parcel_goal M L Z
parcel_find: M I @parcel_pick A I L R E I ife E G M I 3210 A I L R E I ife E Z R E 3201 ifl E 2 I E 1 W 3201 E W I 1 M I 3213 A I L W I 1 W game_message @parcel_got else W game_message @parcel_full end end end
 M I @parcel_home A I L R E I ife E G M I 3213 A I L R E I ifn E Z W I Z R E 3201 I E -1 W 3201 E M I 3216 A I L W I 1 R E 3202 I E 1 W 3202 E W game_message @parcel_drop end end I L 1 ifl L 3 J parcel_find end R E 3202 ife E 3 W game_status 1 W game_message @parcel_won else R E game_moves ife E 24 W game_status 2 W game_message @parcel_late end end J parcel_render
parcel_render: C S v_copy M L Z
parcel_draw: M I 3210 A I L R E I ifn E Z M I @parcel_pick A I L R E I M I game_board A I E W I 46 end M I 3216 A I L R E I ifn E Z M I @parcel_home A I L R E I M I game_board A I E W I 43 end I L 1 ifl L 3 J parcel_draw end R E 3200 M I game_board A I E W I 64 J parcel_message
game_key: E A 1 J parcel_help E A -26 J parcel_help M A Z O S P
parcel_help: R E game_status ifn E Z M A Z O S P end W game_message @parcel_goal C S parcel_message M A 1 O S P
parcel_message: R J game_message M I 3300
parcel_msg_copy: R E J ife E Z J parcel_msg_bag end W I E I I 1 I J 1 J parcel_msg_copy
parcel_msg_bag: W I 32 M I/1 66 M I/2 97 M I/3 103 M I/4 58 I I 5 M L Z
parcel_msg_letter: M J 3213 A J L R E J M F 45 ifn E Z M F 97 A F L end W I F I I 1 I L 1 ifl L 3 J parcel_msg_letter end W I Z W game_message 3300 O S P
v_initial: ${t('.....A..a.......b.........c...B....C')}
parcel_pick: 8 16 26
parcel_home: 5 30 35
parcel_goal: ${t('24 moves; hold 2')}
parcel_adj: ${t('Adjacent streets')}
parcel_got: ${t('Parcel picked up')}
parcel_full: ${t('Full; parcel stays')}
parcel_drop: ${t('Parcel delivered')}
parcel_won: ${t('All delivered!')}
parcel_late: ${t('Time up; try R')}
${copy}
${POSITIVE_DIVISION}`,
examples:[{moves:[1,2,8],board:'.....A..@.......b.........c...B....C',status:0,movesMade:3}]},
{number:193,kind:'board',id:'star-alignment',site:'observatory',title:'Constellation Finder',columns:6,rows:6,stepKey:'n',counterLabel:'Moves',controls:'Enter:aim N:rotate R:reset',inputs:['Frame origin','N: rotate'],outputs:['Target/overlay','Alignment'],description:'Align the four-star telescope overlay with the fixed target. Stars * are targets, + are overlay stars and O marks overlap. Enter chooses the upper-left corner of a three-by-three telescope frame; it must fit within the six-by-six sky (only its upper-left four-by-four origins fit). N rotates the asymmetric pattern clockwise inside that frame. Match all four stars to win. R resets and F1 exits.',
algorithm:`game_reset: W 3200 Z W 3201 Z W game_message @star_goal J star_render
game_move: R E game_status N E Z O S P M G A M B 6 C S app_div ifg A 3 W game_message @star_edge O S P end ifg C 3 W game_message @star_edge O S P end R E 3200 E E G O S P W 3200 G C S game_count_move J star_render
game_key: E A 1 J star_turn E A -26 J star_turn M A Z O S P
star_turn: R E game_status ifn E Z M A Z O S P end R E 3201 I E 1 ife E 4 M E Z end W 3201 E C S game_count_move C S star_render M A 1 O S P
star_render: M I game_board M E 36
star_clear: W I 46 I I 1 I E -1 N E Z J star_clear W 2926 42 W 2920 42 W 2921 42 W 2922 42 R E 3201 P E 4 M J @star_shapes A J E M L 4 M H Z
star_draw: R E J R G 3200 A E G M I game_board A I E R E I ife E 42 W I 79 I H 1 else W I 43 end I J 1 I L -1 N L Z J star_draw W game_message @star_goal ife H 4 W game_status 1 W game_message @star_won end O S P
star_shapes: 0 1 7 13 2 8 7 6 14 13 7 1 12 6 7 8
star_goal: ${t('Aim + onto *; four O wins')}
star_edge: ${t('Three-by-three must fit sky')}
star_won: ${t('Constellation aligned!')}
${POSITIVE_DIVISION}`,
examples:[{moves:[14],steps:3,board:'....................OOO...O.........',status:1,movesMade:4}]},
];
