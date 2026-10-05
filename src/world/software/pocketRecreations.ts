import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const palette=`W -3657 -8297 W -3656 8177 W -3655 -8297 W -3654 249 W -3653 -8297 W -3652 6475 W -3651 -8297 W -3650 4440`;
const neighbors=(w:number,h:number)=>`neighbor: M E A P E 4 A E B A E @neighbor_table R A E O S P\nneighbor_table: `+Array.from({length:w*h},(_,i)=>[i%w<w-1?i+1:-1,i<w*(h-1)?i+w:-1,i%w?i-1:-1,i>=w?i-w:-1].join(' ')).join(' ');
const yacht=`game_reset: ${palette} W 3200 17 W 3201 Z W 3202 Z W 3203 Z M I 3300 M E 5 K I E M I 3310 M E 5 K I E M L Z
y_init: M I 3320 A I L W I -1 I L 1 ifl L 6 J y_init end W game_message @y_start J y_render
game_move: R E game_status N E Z O S P ife A 5 J y_roll end ifl A 5 R E 3201 ife E Z W game_message @y_start O S P end M I 3310 A I A R E I M F 1 S F E W I F J y_render end ifl A 16 O S P end M B 8 C S app_div A A -2 W 3210 A R E 3201 ife E Z W game_message @y_start O S P end M I 3320 A I A R E I ifge E Z W game_message @y_used O S P end C S y_scores R I 3210 A I 3340 R E I R I 3210 A I 3320 W I E R F 3203 A F E W 3203 F R E 3202 I E 1 W 3202 E C S game_count_move W 3201 Z M I 3300 M E 5 K I E M I 3310 M E 5 K I E R E 3202 ife E 6 R E 3203 ifge E 90 W game_status 1 W game_message @y_win else W game_status 2 W game_message @y_loss end else W game_message @y_start end J y_render
game_key: E A 1 J y_key E A -26 J y_key M A Z O S P
y_key: C S y_roll M A 1 O S P
y_roll: R E game_status N E Z O S P R E 3201 ifge E 3 W game_message @y_limit O S P end M L Z
y_die: M I 3310 A I L R E I ifn E Z J y_die_next end R A 3200 P A 17 A A 43 M B 97 C S app_div W 3200 C M A C M B 6 C S app_div I C 1 M I 3300 A I L W I C
y_die_next: I L 1 ifl L 5 J y_die end R E 3201 I E 1 W 3201 E W game_message @y_choose J y_render
y_scores: M I 3330 M E 16 K I E M L Z
y_count: M I 3300 A I L R E I M I 3330 A I E R F I I F 1 W I F R F 3340 A F E W 3340 F I L 1 ifl L 5 J y_count end M L 1 W 3211 Z W 3212 Z W 3213 Z W 3214 Z
y_rank: M I 3330 A I L R E I ifge E 2 M F L P F 2 W 3341 F end ifge E 3 M F L P F 3 W 3342 F end ife E 2 W 3211 1 end ife E 3 W 3212 1 end ife E 5 W 3345 50 end ifn E Z R F 3213 I F 1 W 3213 F ife L 1 W 3214 1 end ife L 6 W 3214 1 end end I L 1 ifle L 6 J y_rank end R E 3211 R F 3212 ifn E Z ifn F Z W 3343 25 end end R E 3213 ife E 5 R E 3331 R F 3336 ife E Z W 3344 30 end ife F Z W 3344 30 end end O S P
y_render: C S y_scores M I game_board M E 64 K I E M L Z
y_top: M I 3300 A I L R E I ife E Z M E 45 else A E 48 end M I game_board A I L W I E M I 3310 A I L R E I ife E Z M E 46 else M E 72 end M I 2908 A I L W I E I L 1 ifl L 5 J y_top end W 2905 82 R E 3201 A E 48 W 2906 E W 2907 51 R A 3203 M B 100 C S app_div A A 48 W 2913 A M A C M B 10 C S app_div A A 48 A C 48 W 2914 A W 2915 C M L Z
y_row: M I L P I 4 A I @y_labels M J L P J 8 A J 2916 M K 4
y_label: R E I W J E I I 1 I J 1 I K -1 N K Z J y_label W J 32 I J 1 M I 3320 A I L R A I M K 33 ifl A Z M I 3340 A I L R A I M K 63 end U S J M B 10 C S app_div O S J A A 48 A C 48 W J A M J/1 C M J/2 K I L 1 ifl L 6 J y_row end O S P
game_cell_style: M E A M A B ife B 72 A A 729 end ife B 33 A A 1458 end ife B 63 A A 2187 end O S P
y_labels: ${text('SUM PAIRTRIPFULLRUN YCHT')}
y_start: ${text('N:roll before scoring')}
y_choose: ${text('Hold dice or choose a row')}
y_limit: ${text('Three rolls: choose a row')}
y_used: ${text('That category is used')}
y_win: ${text('90 reached: yacht winner!')}
y_loss: ${text('Under 90; R:try new holds')}
${POSITIVE_DIVISION}`;
const trio=`game_reset: ${palette} M L Z
tr_init: M I 3300 A I L W I 1 M I 3310 A I L W I Z I L 1 ifl L 9 J tr_init end W 3200 Z W game_message @tr_help J tr_render
game_move: R E game_status N E Z O S P M B 6 C S app_div M L C M B 2 C S app_div P A 3 W 3201 A M A L M B 2 C S app_div R E 3201 A A E W 3201 A M I 3300 A I A R E I ife E Z O S P end M I 3310 A I A R E I ifn E Z W I Z R E 3200 I E -1 W 3200 E J tr_render end W I 1 R E 3200 I E 1 W 3200 E ifl E 3 J tr_render end M L Z M K Z
tr_collect: M I 3310 A I L R E I ifn E Z M I 3320 A I K W I L I K 1 end I L 1 ifl L 9 J tr_collect end C S tr_valid ife A Z W game_message @tr_bad J tr_clear end M L Z
tr_remove: M I 3320 A I L R E I M I 3300 A I E W I Z I L 1 ifl L 3 J tr_remove end C S game_count_move R E game_moves ife E 3 W game_status 1 W game_message @tr_win else W game_message @tr_help end
tr_clear: W 3200 Z M I 3310 M E 9 K I E J tr_render
game_key: M A Z O S P
tr_valid: M L Z
tr_attribute: M G Z M K Z
tr_card: M I 3320 A I K R E I P E 3 A E L A E @tr_features R E E A G E I K 1 ifl K 3 J tr_card end
tr_mod: ifge G 3 I G -3 J tr_mod end ifn G Z M A Z O S P end I L 1 ifl L 3 J tr_attribute end M A 1 O S P
tr_render: M L Z
tr_draw: M A L M B 3 C S app_div P A 12 P C 2 A A C A A game_board M J A M I 3300 A I L R E I ife E Z W J 46 M J/1 46 M J/6 46 M J/7 46 else M I L P I 3 A I @tr_features R E I A E 65 W J E M E I/1 A E 49 M J/1 E M E I/2 A E @tr_shapes R E E M J/6 E M I 3310 A I L R E I ife E Z M J/7 46 else M J/7 42 end end I L 1 ifl L 9 J tr_draw end O S P
game_cell_style: M A B ife B 65 A A 1458 end ife B 66 A A 2187 end ife B 67 A A 2916 end ife B 42 A A 729 end O S P
tr_features: 0 0 0 1 1 2 2 2 1 1 1 1 2 2 0 0 0 2 2 2 2 0 0 1 1 1 0
tr_shapes: 79 94 35
tr_help: ${text('Pick three; each trait fits')}
tr_bad: ${text('Traits: all same/different')}
tr_win: ${text('All three trios found!')}
${POSITIVE_DIVISION}`;
const link=`game_reset: ${palette} M I @cl_initial M J 3300 M K 36
cl_init: R E I W J E I I 1 I J 1 I K -1 N K Z J cl_init W 3200 -1 W game_message @cl_help J cl_render
game_move: R E game_status N E Z O S P M I 3300 A I A R E I ife E Z O S P end R F 3200 ife A F W 3200 -1 J cl_render end ifl F Z W 3200 A J cl_render end W 3202 A W 3201 F M I 3300 A I F R F I ifn E F W game_message @cl_match O S P end C S cl_route ife A Z W game_message @cl_block O S P end R I 3201 A I 3300 W I Z R I 3202 A I 3300 W I Z W 3200 -1 C S game_count_move R E game_moves ife E 8 W game_status 1 W game_message @cl_win else W game_message @cl_help end J cl_render
game_key: M A Z O S P
cl_route: R A 3201 M B 6 C S app_div W 3210 A W 3211 C R A 3202 M B 6 C S app_div W 3212 A W 3213 C W 3214 Z W 3215 Z
cl_trial: R E 3214 ife E Z R E 3215 P E 6 R F 3211 A F E W 3216 F R F 3213 A F E W 3217 F else R E 3210 P E 6 R F 3215 A E F W 3216 E R E 3212 P E 6 A E F W 3217 E end R A 3201 R B 3216 C S cl_segment ife A Z J cl_next end R A 3216 R B 3217 C S cl_segment ife A Z J cl_next end R A 3217 R B 3202 C S cl_segment ifn A Z O S P end
cl_next: R E 3215 I E 1 W 3215 E ifl E 6 J cl_trial end R E 3214 ifn E Z M A Z O S P end W 3214 1 W 3215 Z J cl_trial
; Segment may cross empty cells plus the two matching endpoints only.
cl_segment: W 3240 A W 3241 B M B 6 C S app_div W 3242 A W 3243 C R A 3241 M B 6 C S app_div R E 3242 ife A E M F 1 R E 3240 R G 3241 ifg E G M F -1 end else R E 3243 ifn E C M A Z O S P end M F 6 R E 3240 R G 3241 ifg E G M F -6 end end R G 3240
cl_segment_cell: R E 3201 ife G E J cl_segment_next end R E 3202 ife G E J cl_segment_next end M I 3300 A I G R E I ifn E Z M A Z O S P end
cl_segment_next: R E 3241 ife G E M A 1 O S P end A G F J cl_segment_cell
cl_render: M L Z
cl_cell: M I 3300 A I L R E I ife E Z M E 46 else A E 64 R F 3200 ife F L A E 32 end end M I game_board A I L W I E I L 1 ifl L 36 J cl_cell end O S P
game_cell_style: M A B ifge B 65 ifle B 72 A A 1458 end end ifge B 97 ifle B 104 A A 729 end end O S P
cl_initial: 0 0 0 0 0 0 0 2 6 6 8 0 0 2 8 1 5 0 0 7 4 5 3 0 0 7 1 4 3 0 0 0 0 0 0 0
cl_help: ${text('Equal tiles; up to 2 bends')}
cl_match: ${text('Choose the same letter')}
cl_block: ${text('No clear route in 2 bends')}
cl_win: ${text('All eight pairs linked!')}
${POSITIVE_DIVISION}`;
const edgeCells=Array.from({length:49},(_,i)=>i).filter(i=>(Math.floor(i/7)+i%7)%2===1);
const endpoints=edgeCells.map(i=>{const r=Math.floor(i/7),c=i%7;return r%2?[Math.floor(r/2)*4+c/2,(Math.floor(r/2)+1)*4+c/2]:[r/2*4+Math.floor(c/2),r/2*4+Math.floor(c/2)+1];});
const loop=`game_reset: ${palette} M I 3300 M E 24 K I E W game_message @lp_help J lp_render
game_move: R E game_status N E Z O S P M I @lp_map A I A R E I ifl E Z O S P end M I 3300 A I E R E I I E 1 ife E 3 M E Z end W I E C S game_count_move W game_message @lp_help J lp_render
game_key: E A 1 J lp_key E A -26 J lp_key M A Z O S P
lp_key: R E game_status ifn E Z M A Z O S P end C S lp_check M A 1 O S P
lp_check: M L Z
lp_clue: M K Z M G Z
lp_side: M I L P I 4 A I K A I @lp_clue_edges R E I M I 3300 A I E R E I ife E 1 I G 1 end I K 1 ifl K 4 J lp_side end M I @lp_clues A I L R E I ifn E G W game_message @lp_bad_clue O S P end I L 1 ifl L 9 J lp_clue end M I 3340 M E 16 K I E M L Z
lp_degrees: M I 3300 A I L R E I ife E 1 M I L P I 2 A I @lp_ends R E I M F I/1 M I 3340 A I E R E I I E 1 W I E M I 3340 A I F R E I I E 1 W I E end I L 1 ifl L 24 J lp_degrees end W 3200 Z W 3201 -1 M L Z
lp_vertices: M I 3340 A I L R E I ifn E Z ifn E 2 W game_message @lp_branch O S P end W 3201 L R E 3200 I E 1 W 3200 E end I L 1 ifl L 16 J lp_vertices end R A 3201 ifl A Z W game_message @lp_empty O S P end M I 3420 M E 16 K I E M I 3420 A I A W I 1 W 3400 A W 3202 1 W 3203 Z
lp_bfs: R I 3203 A I 3400 R E I W 3204 E W 3205 Z
lp_bfs_edge: R E 3204 P E 4 R F 3205 A E F A E @lp_vertex_edges R E E ifl E Z J lp_bfs_next end M I 3300 A I E R F I ifn F 1 J lp_bfs_next end P E 2 A E @lp_ends R F E M G E/1 R E 3204 ife F E M F G end M I 3420 A I F R E I ifn E Z J lp_bfs_next end W I 1 R I 3202 A I 3400 W I F R E 3202 I E 1 W 3202 E
lp_bfs_next: R E 3205 I E 1 W 3205 E ifl E 4 J lp_bfs_edge end R E 3203 I E 1 W 3203 E R F 3202 ifl E F J lp_bfs end R E 3200 R F 3202 ifn E F W game_message @lp_separate O S P end W game_status 1 W game_message @lp_win J lp_render
lp_render: M L Z
lp_cell: M I @lp_map A I L R E I ifge E Z M I 3300 A I E R E I ife E Z M F 46 else ife E 2 M F 120 else M A L M B 7 C S app_div M B 2 C S app_div ife C Z M F 45 else M F 124 end end end else M I @lp_face A I L R F I end M I game_board A I L W I F I L 1 ifl L 49 J lp_cell end O S P
game_cell_style: M A B ife B 45 A A 1458 end ife B 124 A A 1458 end ife B 120 A A 2187 end ifge B 48 ifle B 51 A A 729 end end O S P
lp_map: ${Array.from({length:49},(_,i)=>edgeCells.indexOf(i)).join(' ')}
lp_ends: ${endpoints.flat().join(' ')}
lp_clue_edges: ${Array.from({length:9},(_,i)=>{const p=(Math.floor(i/3)*2+1)*7+(i%3*2+1);return[p-7,p+1,p+7,p-1].map(n=>edgeCells.indexOf(n)).join(' ');}).join(' ')}
lp_vertex_edges: ${Array.from({length:16},(_,i)=>{const e=endpoints.flatMap((p,j)=>p.includes(i)?[j]:[]);return[...e,...Array(4-e.length).fill(-1)].join(' ');}).join(' ')}
lp_clues: 2 1 2 1 0 1 2 1 2
lp_face: ${Array.from({length:49},(_,i)=>{const r=Math.floor(i/7),c=i%7;return r%2&&c%2?48+[2,1,2,1,0,1,2,1,2][Math.floor(r/2)*3+Math.floor(c/2)]!:43;}).join(' ')}
lp_help: ${text('Enter:edge / x; N:check')}
lp_bad_clue: ${text('Edges must match each clue')}
lp_branch: ${text('Each used vertex needs two')}
lp_empty: ${text('Draw a loop before checking')}
lp_separate: ${text('Join into one closed loop')}
lp_win: ${text('One loop; every clue fits!')}
${POSITIVE_DIVISION}`;
// Movement, promotion, drops and safe try: https://lishogi.org/variant/dobutsu
const animal=`game_reset: ${palette} M I @as_initial M J 3300 M K 12
as_init: R E I W J E I I 1 I J 1 I K -1 N K Z J as_init M I 3320 M E 6 K I E W 3200 1 W 3201 -1 W game_message @as_a J as_render
game_move: R E game_status N E Z O S P ifge A 12 R E 3200 ifl A 18 ifn E 1 W game_message @as_other O S P end else ifn E -1 W game_message @as_other O S P end S A 6 end ifge A 15 S A 3 end R E 3201 ife A E W 3201 -1 else W 3201 A end J as_render end W 3211 A M I 3300 A I A R E I R F 3200 P E F ifg E Z R E 3201 ife E A W 3201 -1 else W 3201 A end J as_render end R E 3201 ifl E Z W game_message @as_pick O S P end W 3210 E C S as_legal ife A Z W game_message @as_bad O S P end R E 3210 ifl E 12 M I 3300 A I E W I Z else A E -12 R F 3200 ife F -1 A E 3 end A E 3320 R F E I F -1 W E F end R E 3213 F E A ife E 1 R I 3211 A I 3300 R E 3212 W I E C S game_count_move R E 3200 J as_win end ifn E Z ife E 5 M E 4 end A E -2 R F 3200 ife F -1 A E 3 end A E 3320 R F E I F 1 W E F end R K 3210 R E 3212 F E A ifl K 12 ife E 4 R F 3211 R G 3200 ife G 1 ifl F 3 W 3212 5 end else ifge F 9 W 3212 -5 end end end end R I 3211 A I 3300 R E 3212 W I E W 3201 -1 C S game_count_move R E 3212 F E A ife E 1 R E 3200 R F 3211 ife E 1 ifl F 3 J as_win end else ifge F 9 J as_win end end end R E game_moves ifge E 100 W game_status 3 W game_message @as_draw J as_render end R E 3200 P E -1 W 3200 E C S as_available ife A Z R E 3200 P E -1 J as_win end R E 3200 ife E 1 W game_message @as_a else W game_message @as_b end J as_render
as_win: ife E 1 W game_status 1 W game_message @as_awin else W game_status 2 W game_message @as_bwin end W 3201 -1 J as_render
game_key: M A Z O S P
; Legality applies a temporary board move and rejects exposing the mover's lion.
as_legal: R E 3210 R F 3211 ife E F J as_no end R I 3211 A I 3300 R E I W 3213 E R F 3200 P E F ifg E Z J as_no end R E 3210 ifge E 12 R E 3213 ifn E Z J as_no end R E 3210 A E -12 R F 3200 ife F -1 A E 3 end A E 3320 R E E ife E Z J as_no end R E 3210 A E -10 P E F W 3212 E else M I 3300 A I E R E I W 3212 E R F 3200 P E F ifle E Z J as_no end R E 3210 W 3240 E R E 3211 W 3241 E R E 3212 W 3242 E C S as_motion ife A Z J as_no end end R E 3210 ifl E 12 M I 3300 A I E W I Z end R I 3211 A I 3300 R E 3212 W I E C S as_safe W 3214 A R I 3211 A I 3300 R E 3213 W I E R E 3210 ifl E 12 M I 3300 A I E R E 3212 W I E end R A 3214 O S P
as_no: M A Z O S P
as_safe: W 3250 -1 M L Z
as_find_lion: M I 3300 A I L R E I R F 3200 ife E F W 3250 L end I L 1 ifl L 12 J as_find_lion end R E 3250 ifl E Z J as_no end W 3251 Z
as_attacker: R I 3251 A I 3300 R E I R F 3200 P F E ifge F Z J as_attack_next end W 3242 E R E 3251 W 3240 E R E 3250 W 3241 E C S as_motion ifn A Z J as_no end
as_attack_next: R E 3251 I E 1 W 3251 E ifl E 12 J as_attacker end M A 1 O S P
as_motion: R A 3240 M B 3 C S app_div W 3243 A W 3244 C R A 3241 M B 3 C S app_div R E 3243 S A E W 3243 A R E 3244 S C E W 3244 C M E A F E A ifg E 1 J as_no end M E C F E A ifg E 1 J as_no end ife A Z ife C Z J as_no end end R E 3242 M F 1 ifl E Z M F -1 end F E A ife E 1 M A 1 O S P end ife E 2 ife A Z M A 1 O S P end ife C Z M A 1 O S P end J as_no end ife E 3 ife A Z J as_no end ife C Z J as_no end M A 1 O S P end ife E 4 P F -1 ifn A F J as_no end ifn C Z J as_no end M A 1 O S P end ife A F ifn C Z J as_no end end M A 1 O S P
as_available: W 3260 Z
as_av_from: W 3261 Z
as_av_to: R E 3260 W 3210 E R E 3261 W 3211 E C S as_legal ifn A Z O S P end R E 3261 I E 1 W 3261 E ifl E 12 J as_av_to end R E 3260 I E 1 W 3260 E ifl E 15 J as_av_from end M A Z O S P
as_render: M L Z
as_paint: M I 3300 A I L R E I M F E F E A A E @as_symbols R E E ifl F Z A E 32 end R F 3201 ife F L M E 64 end M I game_board A I L W I E I L 1 ifl L 12 J as_paint end M L Z
as_hand: M I @as_hand_labels A I L R E I M I 2912 A I L W I E M I @as_hand_labels A I L R E I A E 32 M I 2918 A I L W I E M I 3320 A I L R E I A E 48 M I 2915 A I L W I E M I 3323 A I L R E I A E 48 M I 2921 A I L W I E R E 3201 M F L A F 12 ife E F R E 3200 ife E 1 M I 2912 A I L W I 64 else M I 2918 A I L W I 64 end end I L 1 ifl L 3 J as_hand end O S P
game_cell_style: M E A M A B ife B 64 A A 729 O S P end ifge E 12 ifl E 18 A A 1458 else A A 2187 end O S P end ifge B 65 ifle B 90 A A 1458 end end ifge B 97 ifle B 122 A A 2187 end end O S P
as_initial: -3 -1 -2 0 -4 0 0 4 0 2 1 3
as_symbols: ${text('.LGECH')}
as_hand_labels: 71 69 67
as_a: ${text('A uppercase moves upward')}
as_b: ${text('B lowercase moves downward')}
as_pick: ${text('Select a piece or hand type')}
as_other: ${text('That hand belongs to rival')}
as_bad: ${text('Illegal move or lion unsafe')}
as_awin: ${text('A wins: lion safe or caught')}
as_bwin: ${text('B wins: lion safe or caught')}
as_draw: ${text('100 turns: courtyard draw')}
${POSITIVE_DIVISION}`;
export const POCKET_RECREATIONS:BoardSoftware[]=[
{number:404,id:'dice-yacht',kind:'board',site:'dice',title:'Dice Yacht',columns:8,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Round',controls:'Enter:hold/score N:roll',inputs:['Five dice'],outputs:['Score card'],algorithm:yacht,description:'A shortened six-round Yacht challenge: reach 90 points. N or Enter on R rolls unheld dice, at most three times per round. Enter a top die to toggle H hold. The top-right R13 means roll 1 of 3; the three digits below show total points. Enter a category row to use it once, even for zero. SUM scores all dice; PAIR/TRIP score the highest matching two/three dice; FULL gives 25 for exactly a pair and triple; RUN gives 30 for five consecutive faces; YCHT gives 50 for five alike. Row ? numbers preview the current score, ! locks it. Dice use a deterministic native sequence, reset by R, so changed hold decisions can improve a replay. No bonuses or other categories. F1 exits.',examples:[{"moves":[5,2,4,5,0,2,3,4,5,40,5,2,4,5,1,3,5,56,5,1,3,5,5,16,5,2,3,5,4,5,48,5,0,3,5,1,5,32,5,0,2,4,5,0,4,5,24],"steps":0,"board":"-----R03.....103SUM  13!PAIR 00!TRIP 15!FULL 25!RUN  00!YCHT 50!","status":1,"movesMade":6}]},
{number:405,id:'attribute-trios',kind:'board',site:'gallery',title:'Attribute Trios',columns:6,rows:6,stepKey:'n',cellStyle:true,counterLabel:'Trios',controls:'Enter:select three R:reset',inputs:['Three attributes'],outputs:['Trio validation'],algorithm:trio,description:'Nine cards occupy 2x2 blocks. Read each as letter/color A/B/C, count 1/2/3, and shape O/^/#; the fourth position shows * when selected. Arrows and Enter on any part of a card toggle it. For each of the three attributes separately, a valid trio must be all the same or all different. Two alike plus one different is invalid. The third selection checks and removes a valid trio; an invalid trio clears selections with feedback. Clear all nine cards to win. All attributes have text labels, so color is optional. R restores the authored table if you want a new grouping; F1 exits.',examples:[{"moves":[0,12,24,26,2,14,16,28,4],"steps":0,"board":"....................................","status":1,"movesMade":3}]},
{number:406,id:'corner-link',kind:'board',site:'badges',title:'Corner Link',columns:6,rows:6,stepKey:'n',cellStyle:true,counterLabel:'Pairs',controls:'Enter:matching endpoints',inputs:['Equal tile pairs'],outputs:['Two-bend routes'],algorithm:link,description:'Remove all eight pairs of equal letters. Enter a tile, then its matching partner; the selected tile is lowercase, and selecting it again cancels. They link only if some orthogonal path between them crosses empty cells with at most two right-angle bends. The visible empty border is part of the playfield and often provides a route around the outside. Paths cannot cross another tile; endpoints themselves are allowed. Removing pairs opens routes for later choices. Dots are empty. R restores the board; F1 exits.',examples:[{"moves":[7,13,8,9,10,14,19,25,15,26,16,21,20,27,22,28],"steps":0,"board":"....................................","status":1,"movesMade":8}]},
{number:407,id:'animal-court',kind:'board',site:'chess',title:'Animal Courtyard',columns:3,rows:8,stepKey:'n',cellStyle:true,counterLabel:'Turns',controls:'Enter:piece/drop R:reset',inputs:['Local A and B'],outputs:['Moves / captures'],algorithm:animal,description:'Local 3x4 animal shogi. A is uppercase/aqua and moves up; B lowercase/coral moves down. L lion steps any direction; G giraffe orthogonally; E elephant diagonally; C chick straight forward. Moving a chick to the last rank promotes to H hen, which steps any direction except backward diagonals. Capture changes ownership; H becomes C in hand. Under the board, G/E/C and their counts show A hand, then lowercase letters and B counts. Enter a piece or hand type, then a destination; drops need an empty cell, never promote, and have no file or last-rank restriction. Moves exposing your lion are rejected. Capture or immobilize the enemy lion, or move your safe lion to the far rank, to win. After 100 turns draw. R resets; F1 exits.',examples:[{"moves":[9,6,4,7,11,7,20,8,14,9,2,5,6,3,5,4,3,0,1,2,13,1,4,7,10,7,19,10,1,5,10,6,12,11,8,11,9,6,18,1,0,1],"steps":0,"board":".Gl..ECL...hGEC110gec000","status":1,"movesMade":21}]},
{number:408,id:'loop-clues',kind:'board',site:'gallery',title:'Loop Clues',columns:7,rows:7,stepKey:'n',cellStyle:true,counterLabel:'Marks',controls:'Enter:edge/x N:check',inputs:['Loop edges'],outputs:['Clue / loop test'],algorithm:loop,description:'Draw one closed loop along the edges around nine numbered cells. Enter an edge cycles unused dot, drawn line, excluded x. Vertices + and gold clues are fixed. Each clue gives exactly how many of its four surrounding edges are drawn. N checks all clue counts, then requires every used vertex to have exactly two incident edges and all drawn edges to belong to one connected loop. Branches and separate small loops are rejected; unused or excluded edges both count as absent. Aqua lines and coral exclusions retain ASCII shapes. R clears the map; F1 exits.',examples:[{"moves":[1,3,5,7,13,21,27,35,41,43,45,47],"steps":1,"board":"+-+-+-+|2.1.2|+.+.+.+|1.0.1|+.+.+.+|2.1.2|+-+-+-+","status":1,"movesMade":12}]},
];
