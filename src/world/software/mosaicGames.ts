import type {BoardSoftware} from './native';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const palette=`W -3657 -8297 W -3656 8177 W -3655 -8297 W -3654 249 W -3653 -8297 W -3652 6475 W -3651 -8297 W -3650 4440`;
// Static adjacency data; all movement and searches execute in guest firmware.
const grid=(width:number,diagonal=false)=>`nb: M E A P E ${diagonal?8:4} A E B A E @neighbors R A E O S P
neighbors: `+Array.from({length:width*width},(_,i)=>(diagonal?[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]]:[[0,1],[1,0],[0,-1],[-1,0]]).map(([dr,dc])=>{const r=Math.floor(i/width)+dr!,c=i%width+dc!;return r<0||r>=width||c<0||c>=width?-1:r*width+c;}).join(' ')).join(' ');
// Orthogonal/eight-neighbor same-value component. Board3300; visited3400;
// queue3500. A=start, returns count3220; preserves no registers.
const component=(size:number,degree:number)=>`component: W 3221 A M I 3300 A I A R E I W 3222 E M I 3400 M E ${size} K I E M I 3400 A I A W I 1 W 3500 A W 3220 1 W 3223 Z
cg_next: W 3224 Z R I 3223 A I 3500 R E I W 3225 E
cg_neighbor: R A 3225 R B 3224 C S nb ifl A Z J cg_skip end M I 3400 A I A R E I ifn E Z J cg_skip end M I 3300 A I A R E I R F 3222 ifn E F J cg_skip end M I 3400 A I A W I 1 R I 3220 A I 3500 W I A R E 3220 I E 1 W 3220 E
cg_skip: R E 3224 I E 1 W 3224 E ifl E ${degree} J cg_neighbor end R E 3223 I E 1 W 3223 E R F 3220 ifl E F J cg_next end O S P`;
const style=`game_cell_style: M A B ife B 65 A A 1458 end ife B 97 A A 1458 end ife B 66 A A 2187 end ife B 98 A A 2187 end ife B 67 A A 2916 end ife B 64 A A 729 end O S P`;
const same=`game_reset: ${palette} M I @sg_initial M J 3300 M K 25
sg_init: R E I W J E I I 1 I J 1 I K -1 N K Z J sg_init W game_message @sg_help J sg_render
game_move: R E game_status N E Z O S P ifge A 25 O S P end M I 3300 A I A R E I ife E Z W game_message @sg_empty O S P end C S component R E 3220 ifl E 2 W game_message @sg_single O S P end M F E I F -1 P E F R F game_moves A F E W game_moves F M L Z
sg_erase: M I 3500 A I L R E I M I 3300 A I E W I Z I L 1 R E 3220 ifl L E J sg_erase end W 3200 Z
sg_column: R E 3200 A E 20 W 3201 E W 3202 E
sg_fall: R I 3201 A I 3300 R E I ifn E Z W I Z R I 3202 A I 3300 W I E R E 3202 S E 5 W 3202 E end R E 3201 S E 5 W 3201 E ifge E Z J sg_fall end R E 3200 I E 1 W 3200 E ifl E 5 J sg_column end W 3200 Z W 3202 Z
sg_pack: R I 3200 A I 3320 R E I ife E Z J sg_pack_next end R E 3200 R F 3202 ife E F J sg_pack_used end M L Z
sg_shift: M I 3300 A I L A I E R K I W I Z M J 3300 A J L A J F W J K A L 5 ifl L 25 J sg_shift end
sg_pack_used: R E 3202 I E 1 W 3202 E
sg_pack_next: R E 3200 I E 1 W 3200 E ifl E 5 J sg_pack end W 3203 Z W 3200 Z
sg_check: R I 3200 A I 3300 R E I ife E Z J sg_check_next end W 3203 1 R A 3200 C S component R E 3220 ifge E 2 W game_message @sg_help J sg_render end
sg_check_next: R E 3200 I E 1 W 3200 E ifl E 25 J sg_check end R E 3203 ife E Z W game_status 1 W game_message @sg_win else W game_status 2 W game_message @sg_stuck end J sg_render
game_key: M A Z O S P
sg_render: M L Z
sg_draw: M I 3300 A I L R E I ife E Z M E 46 else A E 64 end M I game_board A I L W I E I L 1 ifl L 25 J sg_draw end O S P
sg_initial: 2 1 3 2 2 1 3 1 3 1 3 3 2 3 1 2 3 1 2 2 2 2 3 3 3
sg_help: ${text('Remove a matching cluster')}
sg_single: ${text('Need at least two neighbors')}
sg_empty: ${text('That space is already clear')}
sg_win: ${text('Orchard cleared! R:replay')}
sg_stuck: ${text('No pairs left; R:try again')}
${component(25,4)}
${grid(5)}
${style}`;
// Movement/counting rules: https://icga.org/icga/games/Loa/ . Six-square board,
// simultaneous connection favors the mover; 120 moves is a local draw limit.
const loa=`game_reset: ${palette} M I @la_initial M J 3300 M K 36
la_init: R E I W J E I I 1 I J 1 I K -1 N K Z J la_init W 3200 1 W 3201 -1 W game_message @la_a J la_render
game_move: R E game_status N E Z O S P ifge A 36 O S P end W 3211 A M I 3300 A I A R E I R F 3200 ife E F R E 3201 ife E A W 3201 -1 else W 3201 A end J la_render end R E 3201 ifl E Z W game_message @la_pick O S P end W 3210 E C S la_legal ife A Z W game_message @la_bad O S P end R I 3210 A I 3300 W I Z R I 3211 A I 3300 R E 3200 W I E W 3201 -1 C S game_count_move R E 3200 W 3203 E C S la_connected ifn A Z R E 3200 J la_win end R E 3200 M F 3 S F E W 3203 F C S la_connected ifn A Z R E 3203 J la_win end R E game_moves ifge E 120 W game_status 3 W game_message @la_draw J la_render end R E 3200 M F 3 S F E W 3200 F C S la_available ife A Z R E 3200 M F 3 S F E M E F J la_win end R F 3200 ife F 1 W game_message @la_a else W game_message @la_b end J la_render
la_win: W game_status E ife E 1 W game_message @la_awin else W game_message @la_bwin end J la_render
game_key: M A Z O S P
la_legal: R A 3210 R E 3211 ife A E J la_no end M I 3300 A I E R E I R F 3200 ife E F J la_no end W 3240 Z
la_dir: R E 3210 W 3241 E W 3242 Z
la_ray: R A 3241 R B 3240 C S nb ifl A Z J la_next_dir end W 3241 A R E 3242 I E 1 W 3242 E R E 3211 ife A E J la_found end J la_ray
la_next_dir: R E 3240 I E 1 W 3240 E ifl E 8 J la_dir end J la_no
la_found: W 3243 1 W 3244 Z R E 3240 W 3245 E
la_count_side: R E 3210 W 3241 E
la_count: R A 3241 R B 3245 C S nb ifl A Z J la_count_end end W 3241 A M I 3300 A I A R E I ifn E Z R E 3243 I E 1 W 3243 E end J la_count
la_count_end: R E 3244 ifn E Z J la_distance end W 3244 1 R E 3240 A E 4 ifge E 8 S E 8 end W 3245 E J la_count_side
la_distance: R E 3242 R F 3243 ifn E F J la_no end R E 3210 W 3241 E W 3244 Z
la_cross: R E 3244 I E 1 W 3244 E R F 3242 ifge E F M A 1 O S P end R A 3241 R B 3240 C S nb W 3241 A M I 3300 A I A R E I R F 3200 ifn E Z ifn E F J la_no end end J la_cross
la_no: M A Z O S P
la_available: W 3250 Z
la_av_from: R I 3250 A I 3300 R E I R F 3200 ifn E F J la_av_next end W 3251 Z
la_av_to: R E 3250 W 3210 E R E 3251 W 3211 E C S la_legal ifn A Z O S P end R E 3251 I E 1 W 3251 E ifl E 36 J la_av_to end
la_av_next: R E 3250 I E 1 W 3250 E ifl E 36 J la_av_from end M A Z O S P
la_connected: M L Z W 3204 Z W 3205 -1
la_total: M I 3300 A I L R E I R F 3203 ife E F W 3205 L R E 3204 I E 1 W 3204 E end I L 1 ifl L 36 J la_total end R A 3205 ifl A Z M A Z O S P end C S component R E 3220 R F 3204 M A Z ife E F M A 1 end O S P
la_render: M L Z
la_draw_cell: M I 3300 A I L R E I ife E Z M E 46 else A E 64 R F 3201 ife F L A E 32 end end M I game_board A I L W I E I L 1 ifl L 36 J la_draw_cell end O S P
la_initial: 0 1 1 1 1 0 2 0 0 0 0 2 2 0 0 0 0 2 2 0 0 0 0 2 2 0 0 0 0 2 0 1 1 1 1 0
la_a: ${text('A: unite remaining pieces')}
la_b: ${text('B: unite remaining pieces')}
la_pick: ${text('Select your piece first')}
la_bad: ${text('Line count or blocked path')}
la_awin: ${text('A connected every piece!')}
la_bwin: ${text('B connected every piece!')}
la_draw: ${text('120 moves: local draw')}
${component(36,8)}
${grid(6,true)}
${style}`;
// Approach/withdrawal: https://www.nestorgames.com/rulebooks/FANORONA_EN.pdf
// Explicit training variant: 5x5, compulsory capture, one capture per turn.
const fan=`game_reset: ${palette} M I @fa_initial M J 3300 M K 25
fa_init: R E I W J E I I 1 I J 1 I K -1 N K Z J fa_init W 3200 1 W 3201 -1 W 3202 Z J fa_prompt
game_move: R E game_status N E Z O S P ife A 25 C S fa_toggle O S P end ifge A 25 O S P end W 3204 A M I 3300 A I A R E I R F 3200 ife E F R E 3201 ife E A W 3201 -1 else W 3201 A end J fa_render end R E 3201 ifl E Z W game_message @fa_pick O S P end C S fa_scan R E 3201 W 3210 E R E 3204 W 3211 E R E 3202 W 3212 E C S fa_probe ife A Z W game_message @fa_bad O S P end ife A 1 R E 3230 ifn E Z W game_message @fa_forced O S P end else W 3205 1 end W 3205 A R I 3210 A I 3300 W I Z R I 3211 A I 3300 R E 3200 W I E R E 3205 ife E 2 J fa_capture end J fa_end
fa_capture: R A 3246 M I 3300 A I A R E I R F 3200 M K 3 S K F ifn E K J fa_end end W I Z R B 3247 C S nb W 3246 A ifge A Z J fa_capture end
fa_end: W 3201 -1 C S game_count_move R E 3200 M F 3 S F E W 3200 F C S fa_scan R E 3231 ife E Z R E 3200 M F 3 S F E W game_status F ife F 1 W game_message @fa_awin else W game_message @fa_bwin end J fa_render end R E game_moves ifge E 100 W game_status 3 W game_message @fa_draw J fa_render end J fa_prompt
game_key: E A 1 J fa_toggle E A -26 J fa_toggle M A Z O S P
fa_toggle: R E game_status ifn E Z M A Z O S P end R E 3202 M F 1 S F E W 3202 F C S fa_prompt M A 1 O S P
fa_prompt: R E 3200 R F 3202 ife E 1 ife F Z W game_message @fa_aa else W game_message @fa_aw end else ife F Z W game_message @fa_ba else W game_message @fa_bw end end J fa_render
; Probe chosen mode: 0 invalid,1 quiet,2 captures. Diagonals only even points.
fa_probe: R A 3210 M I 3300 A I A R E I R F 3200 ifn E F J fa_no end R I 3211 A I 3300 R E I ifn E Z J fa_no end W 3240 Z
fa_dir: R A 3210 R B 3240 C S nb R E 3211 ife A E J fa_direction end R E 3240 I E 1 W 3240 E ifl E 8 J fa_dir end J fa_no
fa_direction: R E 3240 M F E
fa_even_dir: ifge F 2 I F -2 J fa_even_dir end ifn F Z R F 3210
fa_even_cell: ifge F 2 I F -2 J fa_even_cell end ifn F Z J fa_no end end R E 3212 ife E Z R A 3211 R B 3240 else R A 3210 R B 3240 A B 4 ifge B 8 S B 8 end end W 3247 B C S nb W 3246 A ifl A Z M A 1 O S P end M I 3300 A I A R E I R F 3200 M K 3 S K F M A 1 ife E K M A 2 end O S P
fa_no: M A Z O S P
fa_scan: W 3230 Z W 3231 Z W 3232 Z
fa_scan_cell: R I 3232 A I 3300 R E I R F 3200 ifn E F J fa_scan_next end W 3233 Z
fa_scan_dir: R A 3232 R B 3233 C S nb ifl A Z J fa_scan_dir_next end W 3211 A R E 3232 W 3210 E W 3212 Z C S fa_probe ifn A Z W 3231 1 end ife A 2 W 3230 1 O S P end W 3212 1 C S fa_probe ife A 2 W 3230 1 O S P end
fa_scan_dir_next: R E 3233 I E 1 W 3233 E ifl E 8 J fa_scan_dir end
fa_scan_next: R E 3232 I E 1 W 3232 E ifl E 25 J fa_scan_cell end O S P
fa_render: M L Z
fa_cell: M I 3300 A I L R E I ife E Z M E 46 else A E 64 R F 3201 ife F L A E 32 end end M I game_board A I L W I E I L 1 ifl L 25 J fa_cell end W 2925 77 W 2926 79 W 2927 68 W 2928 69 R E 3202 ife E Z W 2929 65 else W 2929 87 end O S P
fa_initial: 2 2 2 2 2 2 2 2 2 2 2 1 0 2 1 1 1 1 1 1 1 1 1 1 1
fa_aa: ${text('A approach; N:withdraw')}
fa_aw: ${text('A withdraw; N:approach')}
fa_ba: ${text('B approach; N:withdraw')}
fa_bw: ${text('B withdraw; N:approach')}
fa_pick: ${text('Select your piece first')}
fa_bad: ${text('Need empty adjacent point')}
fa_forced: ${text('Capture required; try N')}
fa_awin: ${text('A wins: B has no move')}
fa_bwin: ${text('B wins: A has no move')}
fa_draw: ${text('100 turns: local draw')}
${grid(5,true)}
${style}`;
const pyramid=`game_reset: ${palette} M I @py_deal M J 3300 M K 10
py_init: R E I W J E I I 1 I J 1 I K -1 N K Z J py_init W 3200 -1 W 3201 Z W 3202 Z W game_message @py_help J py_render
game_move: R E game_status N E Z O S P ife A 35 J py_draw end M I @py_map A I A R A I ifl A Z O S P end W 3210 A C S py_rank ife A Z W game_message @py_covered O S P end ife A 13 R A 3210 C S py_remove W 3200 -1 C S game_count_move J py_check end R E 3200 R F 3210 ife E F W 3200 -1 J py_render end ifl E Z W 3200 F W game_message @py_partner J py_render end W 3211 A M A E C S py_rank R E 3211 A A E ifn A 13 W game_message @py_bad O S P end R A 3200 C S py_remove R A 3210 C S py_remove W 3200 -1 C S game_count_move J py_check
game_key: E A 1 J py_key E A -26 J py_key M A Z O S P
py_key: C S py_draw M A 1 O S P
py_draw: R E game_status N E Z O S P R E 3201 ifge E 6 W game_message @py_no_stock O S P end M I @py_stock A I E R F I R I 3202 A I 3340 W I F R E 3202 I E 1 W 3202 E R E 3201 I E 1 W 3201 E W 3200 -1 C S game_count_move J py_check
; Rank0 means covered, removed or no waste. Preserves3210/3211.
py_rank: ife A 10 R E 3202 ife E Z M A Z O S P end M I 3339 A I E R A I O S P end M I 3300 A I A R E I ife E Z M A Z O S P end ifge A 6 M A E O S P end M I @py_child A I A R I I A I 3300 R F I ifn F Z M A Z O S P end I I 1 R F I ifn F Z M A Z O S P end M A E O S P
py_remove: ife A 10 R E 3202 I E -1 W 3202 E else M I 3300 A I A W I Z end O S P
py_check: M L Z M K Z
py_remaining: M I 3300 A I L R E I A K E I L 1 ifl L 10 J py_remaining end ife K Z W game_status 1 W game_message @py_win J py_render end R E 3201 ifl E 6 W game_message @py_help J py_render end W 3212 Z
py_pairs: R A 3212 C S py_rank ife A 13 J py_live end ife A Z J py_pair_next end W 3213 A R E 3212 I E 1 W 3214 E
py_other: R E 3214 ifge E 11 J py_pair_next end M A E C S py_rank R E 3213 A A E ife A 13 J py_live end R E 3214 I E 1 W 3214 E J py_other
py_pair_next: R E 3212 I E 1 W 3212 E ifl E 11 J py_pairs end W game_status 2 W game_message @py_loss J py_render
py_live: W game_message @py_help
py_render: M I game_board M E 42 K I E M L Z
py_paint: M I @py_map A I L R E I M F 32 ifge E Z ife E 11 M F 83 else M A E C S py_rank ife A Z M I @py_map A I L R E I ifl E 10 M I 3300 A I E R E I ifn E Z M F 35 else M F 46 end else M F 46 end else M I @py_ranks A I A R F I M I @py_map A I L R E I R K 3200 ife E K M F 64 end end end end M I game_board A I L W I F I L 1 ifl L 42 J py_paint end R E 3201 M F 6 S F E A F 48 W 2936 F O S P
py_deal: 13 5 8 4 6 9 3 10 7 6
py_stock: 2 11 7 1 12 13
py_child: 1 3 4 6 7 8
py_map: -1 -1 -1 0 -1 -1 -1 -1 -1 1 -1 2 -1 -1 -1 3 -1 4 -1 5 -1 6 -1 7 -1 8 -1 9 -1 -1 -1 -1 -1 -1 -1 11 -1 -1 10 -1 -1 -1
py_ranks: ${text(' A23456789TJQK')}
py_help: ${text('Pair exposed ranks to 13')}
py_partner: ${text('Choose its partner to 13')}
py_covered: ${text('Remove both covering cards')}
py_bad: ${text('That pair does not sum 13')}
py_no_stock: ${text('Stock empty; use the waste')}
py_win: ${text('Pyramid cleared! R:replay')}
py_loss: ${text('No pair or stock remains')}
game_cell_style: M E A M A B ife B 35 A A 2916 else ife E 38 A A 1458 else ifn B 32 ifn B 46 A A 729 end end end end O S P`;
const island=`game_reset: ${palette} M L Z
il_init: M I @il_clues A I L R E I ifn E Z M E 1 end M I 3300 A I L W I E I L 1 ifl L 25 J il_init end W game_message @il_help J il_render
game_move: R E game_status N E Z O S P ifge A 25 O S P end M I @il_clues A I A R E I ifn E Z W game_message @il_fixed O S P end M I 3300 A I A R E I I E 1 ife E 3 M E Z end W I E C S game_count_move W game_message @il_help J il_render
game_key: E A 1 J il_check_key E A -26 J il_check_key M A Z O S P
il_check_key: R E game_status ifn E Z M A Z O S P end C S il_check M A 1 O S P
il_check: M L Z W 3200 Z W 3201 -1
il_complete: M I 3300 A I L R E I ife E Z W game_message @il_unknown O S P end ife E 2 W 3201 L R E 3200 I E 1 W 3200 E end I L 1 ifl L 25 J il_complete end R A 3201 ifl A Z W game_message @il_sea O S P end C S component R E 3220 R F 3200 ifn E F W game_message @il_sea O S P end M L Z
il_squares: M I @il_topleft A I L R I I A I 3300 R E I ifn E 2 J il_square_next end I I 1 R E I ifn E 2 J il_square_next end A I 4 R E I ifn E 2 J il_square_next end I I 1 R E I ife E 2 W game_message @il_pool O S P end
il_square_next: I L 1 ifl L 16 J il_squares end M I 3600 M E 25 K I E W 3202 Z
il_region: R I 3202 A I 3300 R E I ifn E 1 J il_next end R I 3202 A I 3600 R E I ifn E Z J il_next end R A 3202 C S component M L Z W 3203 Z W 3204 Z
il_clue_count: M I 3500 A I L R E I M I 3600 A I E W I 1 M I @il_clues A I E R E I ifn E Z W 3204 E R E 3203 I E 1 W 3203 E end I L 1 R E 3220 ifl L E J il_clue_count end R E 3203 ifn E 1 W game_message @il_number O S P end R E 3204 R F 3220 ifn E F W game_message @il_size O S P end
il_next: R E 3202 I E 1 W 3202 E ifl E 25 J il_region end W game_status 1 W game_message @il_win J il_render
il_render: M L Z
il_paint: M I @il_clues A I L R E I ifn E Z A E 48 else M I 3300 A I L R E I M I @il_symbols A I E R E I end M I game_board A I L W I E I L 1 ifl L 25 J il_paint end O S P
game_cell_style: M A B ife B 126 A A 2916 else ife B 43 A A 1458 else ifge B 49 ifle B 57 A A 729 end end end end O S P
il_clues: 2 0 0 0 0 0 0 1 0 4 0 0 0 0 0 3 0 0 0 0 0 0 0 0 0
il_symbols: 63 43 126
il_topleft: 0 1 2 3 5 6 7 8 10 11 12 13 15 16 17 18
il_help: ${text('Enter:? land sea; N:check')}
il_fixed: ${text('Numbered land is fixed')}
il_unknown: ${text('Mark every unknown square')}
il_sea: ${text('Sea must be one region')}
il_pool: ${text('A 2x2 sea pool is forbidden')}
il_number: ${text('Each island needs one clue')}
il_size: ${text('Island size must match clue')}
il_win: ${text('All islands and sea agree!')}
${component(25,4)}
${grid(5)}`;
export const MOSAIC_GAMES:BoardSoftware[]=[
{number:391,id:'samegame-orchard',kind:'board',site:'orchard',title:'SameGame Orchard',columns:5,rows:5,stepKey:'n',cellStyle:true,counterLabel:'Score',controls:'Enter:cluster R:reset',inputs:['Color clusters'],outputs:['Collapse / score'],algorithm:same,description:'Clear this colored orchard. Arrows choose a cell; Enter removes its entire orthogonally connected A/B/C cluster, if it contains at least two cells. Removing n cells earns n times (n-1) points. Remaining cells fall downward, then empty columns close to the left. Plan the changing adjacencies: isolated leftovers end the game. A full clear wins; the Points counter records your score either way. Symbols remain visible alongside colors. R replays the same authored board; F1 exits.',examples:[{"moves":[3,6,9,16,7,15,15,21,20],"steps":0,"board":".........................","status":1,"movesMade":50}]},
{number:392,id:'lines-of-action',kind:'board',site:'chess',title:'Lines of Action',columns:6,rows:6,stepKey:'n',cellStyle:true,counterLabel:'Moves',controls:'Enter:piece/destination',inputs:['Local A and B'],outputs:['Connected armies'],algorithm:loa,description:'Two local players, A first, on a compact 6x6 board. Enter your piece, then a destination; enter it again to cancel. Move horizontally, vertically or diagonally exactly as many squares as the total number of both colors anywhere on that complete line. You may jump over your own pieces but never over an enemy; landing on an enemy captures it. Unite all your remaining pieces into one group, including diagonal contact. A single remaining piece is connected. If both armies become connected, the mover wins. A side with no legal move loses; after 120 moves the game draws. Selected pieces are lowercase. R restarts; F1 exits.',examples:[{"moves":[1,15,11,21,3,0,6,20,33,19,24,26,4,14,17,10,31,24,10,22,32,18,20,30,2,12,21,31,18,25,23,11,14,2,11,10,0,7,31,34,24,14],"steps":0,"board":"..A....A..B.A.AA...A..B..AB..BB...B.","status":1,"movesMade":21}]},
{number:393,id:'fanorona-cross',kind:'board',site:'pebbles',title:'Fanorona Crossing',columns:5,rows:6,stepKey:'n',cellStyle:true,counterLabel:'Turns',controls:'Enter:move N:capture mode',inputs:['Local A and B'],outputs:['Capture modes'],algorithm:fan,description:'A compact Fanorona training variant for two local players. A starts. Enter a piece and an empty adjacent point; diagonals connect only even checkerboard points. In approach mode, remove the uninterrupted enemy line beyond your destination. N or Enter on the bottom M switches to withdrawal: remove the enemy line behind your starting point instead. Choose one mode, never both. If any capture is available, a quiet move is forbidden. This training variant ends the turn after one move, without capture chains. Capturing all enemies or leaving them no legal move wins; 100 turns draws. The status names the active player and capture mode. R resets; F1 exits.',examples:[{"moves":[17,12,25,8,2,25,12,8,13,12,16,11,12,17,19,14,25,17,16,11,12,16,11,25,12,7,5,10,25,8,13,25,11,12,24,18,0,5,7,6,25,10,11,6,1],"steps":0,"board":".A................A....A.MODEW","status":1,"movesMade":19}]},
{number:394,id:'pyramid-thirteen',kind:'board',site:'cardtable',title:'Pyramid Thirteen',columns:7,rows:6,stepKey:'n',cellStyle:true,counterLabel:'Plays',controls:'Enter:pair N:draw R:reset',inputs:['Exposed cards'],outputs:['Pyramid / waste'],algorithm:pyramid,description:'Clear the ten-card pyramid. A=1, T=10, J=11, Q=12, K=13. Enter two exposed ranks summing 13; K removes alone. A pyramid card is exposed only after both overlapping cards below it are gone. Covered cards show #, removed cards dots, your selected card @. N or Enter on S draws the next stock card onto the waste at its right; removing that waste reveals its previous card. There are six stock cards and no redeal. Drawing cancels selection. You may pair two pyramid cards or one with the waste. Clear the pyramid to win; with empty stock and no legal pair you lose. R replays the deal; F1 exits.',examples:[{"moves":[21,23,25,27,15,19,35,35,35,17,38,9,11,3],"steps":0,"board":"   .     . .   . . . . . . .       S3 J   ","status":1,"movesMade":9}]},
{number:395,id:'island-logic',kind:'board',site:'gallery',title:'Island Logic',columns:5,rows:5,stepKey:'n',cellStyle:true,counterLabel:'Marks',controls:'Enter:mark N:check R:reset',inputs:['Land and sea'],outputs:['Island rules'],algorithm:island,description:'Solve a Nurikabe island map. Enter cycles unknown ?, land +, sea ~; numbered land is fixed. N checks your whole proposal. Every orthogonally connected land island must contain exactly one number and have precisely that many cells. Different islands cannot touch orthogonally; diagonal contact is fine. All sea cells must form one orthogonal region, and no 2x2 square may be entirely sea. Mark every cell first. The native checker tests these actual constraints, accepting any valid solution. Gold numbers, aqua land and lavender sea keep the map readable. R clears marks; F1 exits.',examples:[{"moves":[1,1,2,2,3,3,4,4,5,6,6,8,8,10,10,11,11,12,12,13,13,14,16,17,18,18,19,20,20,21,21,22,22,23,23,24],"steps":1,"board":"2~~~~+~1~4~~~~+3++~+~~~~+","status":1,"movesMade":36}]},
];
