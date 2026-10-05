import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const t=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const board=(pieces:Record<number,string>)=>Array.from({length:49},(_,i)=>pieces[i]??'.').join('');
export const FIELD_SIMULATIONS:BoardSoftware[]=[
{number:217,kind:'board',id:'orbit-bench',site:'smallmoon',title:'Orbit Bench',columns:7,rows:7,stepKey:'n',counterLabel:'Ticks',controls:'Enter:launch N:tick R:reset',inputs:['Launch direction','N: advance'],outputs:['Trajectory','Pos/velocity','Orbit outcome'],description:'Explore two-dimensional motion around a small moon O. @ is the craft and * its trail; each display cell spans ten position units. Default launch starts at (18,0) with velocity (0,7). Enter anywhere starts a new trial from that same position: velocity is three times the selected cell offset from the center, with up meaning positive Y. N advances one tick. This bench uses softened central attraction: acceleration components truncate -54*x/(x*x+y*y+9) and the analogous Y expression; velocity updates before position. It is a discrete model, not inverse-square gravity. Radius below three collides; leaving the square -30..30 escapes the view. Sixty-four ticks inside the view completes a trial. The status line shows signed X/Y and velocity. Enter tries another launch; R restores the default, F1 exits.',
algorithm:`game_reset: W 3204 Z W 3205 7 J orbit_reset
game_move: M B 7 C S app_div M E C I E -3 P E 3 W 3204 E M E 3 S E A P E 3 W 3205 E
orbit_reset: W game_status Z W game_moves Z W 3200 18 W 3201 Z R E 3204 W 3202 E R E 3205 W 3203 E M I 3000 M E 49
orbit_clear: W I 46 I I 1 I E -1 N E Z J orbit_clear C S orbit_mark C S orbit_message J orbit_render
game_key: E A 1 J orbit_tick E A -26 J orbit_tick M A Z O S P
orbit_tick: R E game_status ifn E Z M A Z O S P end R G 3200 R H 3201 M L G P L G M E H P E H A L E I L 9
 M A G F A A P A 54 M B L C S app_div ifg G Z P A -1 end R E 3202 A E A W 3202 E
 M A H F A A P A 54 M B L C S app_div ifg H Z P A -1 end R E 3203 A E A W 3203 E R E 3202 A G E R E 3203 A H E W 3200 G W 3201 H C S game_count_move
 M E G F E A ifg E 30 J orbit_escape end M E H F E A ifg E 30 J orbit_escape end M E G P E G M F H P F H A E F ifl E 9 J orbit_collision end C S orbit_mark C S orbit_message R E game_moves ife E 64 W game_status 1 W game_message @orbit_bound end J orbit_done
orbit_escape: W 3206 -1 W game_status 2 W game_message @orbit_out J orbit_done
orbit_collision: W game_status 2 W game_message @orbit_hit C S orbit_mark
orbit_done: C S orbit_render M A 1 O S P
orbit_mark: R E 3200 Q E 10 I E 3 R F 3201 Q F 10 M I 3 S I F P I 7 A I E W 3206 I A I 3000 W I 42 O S P
orbit_render: M I game_board M J 3000 M K 49
orbit_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J orbit_copy W 2924 79 R E 3206 ifge E Z M I game_board A I E W I 64 end O S P
orbit_message: M I 3300 M J @orbit_template M K 22
orbit_message_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J orbit_message_copy R A 3200 M J 3301 C S orbit_signed R A 3201 M J 3306 C S orbit_signed R A 3202 M J 3311 C S orbit_signed R A 3203 M J 3315 C S orbit_signed W game_message 3300 O S P
orbit_signed: M E 43 ifl A Z M E 45 P A -1 end W J E I J 1 M B 10 C S app_div A A 48 W J A A C 48 M J/1 C O S P
orbit_template: ${t('X+18 Y+00 V+00,+07   ')}
orbit_bound: ${t('64 ticks inside the view')}
orbit_out: ${t('Escaped view; Enter retries')}
orbit_hit: ${t('Moon collision; Enter retry')}
${POSITIVE_DIVISION}`,
examples:[{moves:[],steps:1,board:board({19:'@',24:'O',26:'*'}),status:0,movesMade:1},{moves:[24],steps:3,board:board({24:'@',25:'*',26:'*'}),status:2,movesMade:3}]},
{number:218,kind:'board',id:'contour-notebook',site:'footpath',title:'Contour Notebook',columns:8,rows:8,stepKey:'n',counterLabel:'Edits',controls:'Enter:edit N:view R:reset',inputs:['Terrain height','Contour level','Profile row'],outputs:['Height field','Contours','Row profile'],description:'Edit a six-by-six terrain field with heights 0..9. In height or contour view, Enter on a terrain cell raises it, wrapping nine to zero. N cycles heights, contours and row profile. In contours, + marks the high side of an edge crossing the chosen level, # is higher ground and . lower ground; comparisons use four adjacent cells, with no assumed outside terrain. +/- changes level 1..9, or Enter the LEVEL row to cycle it. Profile view plots six scaled bars for one terrain row, with exact height digits below; Enter any of the top six screen rows selects that source row. N returns to heights. Contour/profile views preserve edits. R restores the hill, F1 exits.',
algorithm:`game_reset: M I 3000 M J @contour_initial M K 36
contour_init: R E J W I E I I 1 I J 1 I K -1 N K Z J contour_init W 3200 Z W 3201 3 W 3202 Z J contour_render
game_move: M B 8 C S app_div M G A M H C R E 3200 ife E 2 ifl G 6 W 3202 G end J contour_render end ife G 6 R E 3201 I E 1 ifg E 9 M E 1 end W 3201 E J contour_render end ifge G 6 O S P end ifge H 6 O S P end P G 6 A G H M I 3000 A I G R E I I E 1 ife E 10 M E Z end W I E C S game_count_move J contour_render
game_key: E A 1 J contour_view E A -26 J contour_view E A 21 J contour_up E A 20 J contour_down M A Z O S P
contour_up: R E 3201 ifl E 9 I E 1 W 3201 E end J contour_key_done
contour_down: R E 3201 ifg E 1 I E -1 W 3201 E end J contour_key_done
contour_view: R E 3200 I E 1 ife E 3 M E Z end W 3200 E ife E 2 R E board_row ifl E 6 W 3202 E end end
contour_key_done: C S contour_render M A 1 O S P
contour_render: M I game_board M E 64
contour_clear: W I 32 I I 1 I E -1 N E Z J contour_clear R E 3200 ife E 2 J contour_profile end M L Z
contour_cell: M A L M B 6 C S app_div M G A M H C M I G P I 8 A I H A I game_board W 3203 I M J 3000 A J L R K J R E 3200 ife E Z M E K A E 48 J contour_store end R E 3201 ifl K E M E 46 J contour_store end M K 35
 ifg G Z M J 3000 A J L S J 6 R E J R F 3201 ifl E F M K 43 end end ifl G 5 M J 3000 A J L A J 6 R E J R F 3201 ifl E F M K 43 end end ifg H Z M J 3000 A J L I J -1 R E J R F 3201 ifl E F M K 43 end end ifl H 5 M J 3000 A J L I J 1 R E J R F 3201 ifl E F M K 43 end end M E K
contour_store: R I 3203 W I E I L 1 ifl L 36 J contour_cell end M I 2948 M J @contour_level C S contour_text R E 3201 A E 48 W 2954 E M I 2956 R E 3200 ife E Z M J @contour_heights W game_message @contour_edit_help else M J @contour_contours W game_message @contour_level_help end J contour_text
contour_profile: R E 3202 P E 6 M G 3000 A G E M L Z
contour_profile_column: M I G A I L R H I M E H A E 48 M I 2948 A I L W I E M A H P A 6 I A 8 M B 9 C S app_div M K 6 S K A M H Z
contour_profile_row: M I H P I 8 A I L A I game_board ifge H K W I 35 end I H 1 ifl H 6 J contour_profile_row end I L 1 ifl L 6 J contour_profile_column end M I 2956 M J @contour_row C S contour_text R E 3202 A E 49 W 2960 E W game_message @contour_profile_help O S P
contour_text: R E J E E Z O S P W I E I I 1 I J 1 J contour_text
contour_initial: 0 1 2 2 1 0 1 3 4 4 3 1 2 4 7 7 4 2 2 4 7 9 5 2 1 3 4 5 3 1 0 1 2 2 1 0
contour_level: ${t('LEVEL 3 ')}
contour_heights: ${t('HEIGHTS ')}
contour_contours: ${t('CONTOUR ')}
contour_row: ${t('ROW 1   ')}
contour_edit_help: ${t('Enter raises 0..9; N:view')}
contour_level_help: ${t('Contours; +/- changes level')}
contour_profile_help: ${t('Enter picks row; N:heights')}
${POSITIVE_DIVISION}`,
examples:[{moves:[0],board:'112210  134431  247742  247952  134531  012210  LEVEL 3 HEIGHTS ',status:0,movesMade:1}]},
];
