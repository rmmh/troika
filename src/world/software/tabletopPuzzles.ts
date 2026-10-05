import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const quiltShapes=[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[0,1],[0,2],[1,2]],[[1,0],[2,0],[0,1],[1,1]]];
const quiltRotations=quiltShapes.map(shape=>{let p=shape;return Array.from({length:4},()=>{const x=Math.min(...p.map(c=>c[0]!)),y=Math.min(...p.map(c=>c[1]!));p=p.map(c=>[c[0]!-x,c[1]!-y]);const result=p.flat();p=p.map(c=>[-c[1]!,c[0]!]);return result;});});
const quilt=`game_reset: M I 3300 M K 24
qu_clear: W I Z I I 1 I K -1 N K Z J qu_clear M I 3340 M K 6
qu_unused: W I Z I I 1 I K -1 N K Z J qu_unused W 3200 -1 W 3201 Z W game_message @qu_prompt J qu_render
game_move: R E game_status N E Z O S P ifge A 24 ifge A 30 O S P end S A 24 W 3200 A W 3201 Z M I 3340 A I A R E I ifn E Z C S qu_lift end W game_message @qu_place J qu_render end W 3202 A R E 3200 ifl E Z M I 3300 A I A R E I ifn E Z I E -1 W 3200 E W 3201 Z C S qu_lift W game_message @qu_place J qu_render end end R E 3200 ifl E Z W game_message @qu_pick O S P end C S qu_shape R A 3202 M B 6 C S app_div W 3203 A W 3204 C M K 4 M L Z
qu_fit: R E J R F 3204 A E F ifge E 6 W game_message @qu_out O S P end M F J/1 R G 3203 A F G ifge F 4 W game_message @qu_out O S P end P F 6 A F E M I 3300 A I F R E I ifn E Z W game_message @qu_overlap O S P end M I 3360 A I L W I F A J 2 I L 1 I K -1 N K Z J qu_fit M L Z R E 3200 I E 1
qu_place_cells: M I 3360 A I L R F I M I 3300 A I F W I E I L 1 ifl L 4 J qu_place_cells end R E 3200 M I 3340 A I E W I 1 W 3200 -1 C S game_count_move W game_message @qu_prompt J qu_render
qu_lift: R G 3200 M I 3340 A I G W I Z I G 1 M I 3300 M K 24
qu_remove: R E I ife E G W I Z end I I 1 I K -1 N K Z J qu_remove J game_count_move
qu_shape: R E 3200 P E 32 R F 3201 P F 8 A E F M J @qu_shapes A J E O S P
game_key: E A -8 J qu_rotate E A -35 J qu_rotate E A 1 J qu_check E A -26 J qu_check M A Z O S P
qu_rotate: R E game_status ifn E Z M A Z O S P end R E 3200 ifl E Z W game_message @qu_pick M A 1 O S P end R E 3201 I E 1 ifge E 4 M E Z end W 3201 E W game_message @qu_place C S qu_render M A 1 O S P
qu_check: R E game_status ifn E Z M A Z O S P end M I 3340 M K 6
qu_complete: R E I ife E Z W game_message @qu_more M A 1 O S P end I I 1 I K -1 N K Z J qu_complete W game_status 1 W game_message @qu_win M A 1 O S P
qu_render: M L Z
qu_cell: M I 3300 A I L R E I ife E Z M E 46 else A E 64 end M I game_board A I L W I E I L 1 ifl L 24 J qu_cell end M L Z
qu_menu: M E L A E 65 M I 3340 A I L R F I ifn F Z A E 32 end R F 3200 ife F L M E 64 end M I 2924 A I L W I E I L 1 ifl L 6 J qu_menu end M I 2930 M J @qu_preview_labels M K 12
qu_preview_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J qu_preview_copy R E 3200 ifl E Z O S P end M I @qu_kinds A I E R E I W 2935 E R E 3201 A E 48 W 2941 E O S P
qu_preview_labels: ${txt('TYPE -TURN -')}
qu_kinds: 73 79 84 84 76 83
qu_shapes: ${quiltRotations.flat(2).join(' ')}
qu_prompt: ${txt('Pick A-F, cover every dot')}
qu_place: ${txt('Enter anchor; F rotates')}
qu_pick: ${txt('Select a patch from A-F')}
qu_out: ${txt('Patch extends past the edge')}
qu_overlap: ${txt('Patch overlaps another')}
qu_more: ${txt('Use all six patches first')}
qu_win: ${txt('Six patches, no gaps!')}
${POSITIVE_DIVISION}`;
const trees=[1,9,15,23],rowTargets=[2,0,0,1,1],colTargets=[1,1,0,0,2];
const tents=`game_reset: M I 3300 M K 25
tn_clear: W I Z I I 1 I K -1 N K Z J tn_clear W game_message @tn_prompt J tn_render
game_move: R E game_status N E Z O S P M B 6 C S app_div ifge A 5 W game_message @tn_clue O S P end ifge C 5 W game_message @tn_clue O S P end P A 5 A A C M L A M J @tn_trees M K 4
tn_tree_check: R E J ife E L W game_message @tn_tree O S P end I J 1 I K -1 N K Z J tn_tree_check M I 3300 A I L R E I I E 1 ifge E 3 M E Z end W I E C S game_count_move W game_message @tn_prompt J tn_render
game_key: E A 1 J tn_check E A -26 J tn_check M A Z O S P
tn_check: R E game_status ifn E Z M A Z O S P end M L Z M K Z
tn_collect: M I 3300 A I L R E I ife E 1 ifge K 4 W game_message @tn_four M A 1 O S P end M I 3340 A I K W I L I K 1 end I L 1 ifl L 25 J tn_collect end ifn K 4 W game_message @tn_four M A 1 O S P end M L Z
tn_totals: M K Z M G Z M H Z
tn_sum: M I L P I 5 A I K A I 3300 R E I ife E 1 I G 1 end M I K P I 5 A I L A I 3300 R E I ife E 1 I H 1 end I K 1 ifl K 5 J tn_sum end M I @tn_rows A I L R E I ifn E G W game_message @tn_counts M A 1 O S P end M I @tn_cols A I L R E I ifn E H W game_message @tn_counts M A 1 O S P end I L 1 ifl L 5 J tn_totals end M L Z
tn_pair_a: M K L I K 1
tn_pair_b: ifge K 4 J tn_pair_next end M I 3340 A I L R A I M I 3340 A I K R B I C S tn_distance ifle G 1 ifle H 1 W game_message @tn_touch M A 1 O S P end end I K 1 J tn_pair_b
tn_pair_next: I L 1 ifl L 3 J tn_pair_a end W 3200 Z
; Enumerate all four-tree assignments (4^4), rejecting reused tents.
tn_assignment: R E 3200 W 3201 E M I 3360 M K 4
tn_used_clear: W I Z I I 1 I K -1 N K Z J tn_used_clear M L Z
tn_assign_tree: R A 3201 M B 4 C S app_div W 3201 A M I 3360 A I C R E I ifn E Z J tn_assignment_next end W I 1 M I 3340 A I C R B I M I @tn_trees A I L R A I C S tn_distance ifn A 1 J tn_assignment_next end I L 1 ifl L 4 J tn_assign_tree end W game_status 1 W game_message @tn_win M A 1 O S P
tn_assignment_next: R E 3200 I E 1 W 3200 E ifl E 256 J tn_assignment end W game_message @tn_matching M A 1 O S P
tn_distance: W 3210 B M B 5 C S app_div M G A M H C R A 3210 M B 5 C S app_div S G A F G A S H C F H A M A G A A H O S P
tn_render: M L Z
tn_cell: M A L M B 5 C S app_div P A 6 A A C A A game_board M I 3300 A I L R E I ife E Z M E 46 else ife E 1 M E 94 else M E 120 end end W A E I L 1 ifl L 25 J tn_cell end M L Z
tn_render_tree: M I @tn_trees A I L R A I M B 5 C S app_div P A 6 A A C A A game_board W A 84 I L 1 ifl L 4 J tn_render_tree end M L Z
tn_labels: M I @tn_rows A I L R E I A E 48 M I L P I 6 A I 2905 W I E M I @tn_cols A I L R E I A E 48 M I 2930 A I L W I E I L 1 ifl L 5 J tn_labels end W 2935 78 O S P
tn_trees: ${trees.join(' ')}
tn_rows: ${rowTargets.join(' ')}
tn_cols: ${colTargets.join(' ')}
tn_prompt: ${txt('One tent per tree; N checks')}
tn_clue: ${txt('Counts at right and bottom')}
tn_tree: ${txt('Trees cannot be moved')}
tn_four: ${txt('Place exactly four tents')}
tn_counts: ${txt('Row or column count differs')}
tn_touch: ${txt('Tents touch (diagonals too)')}
tn_matching: ${txt('Need a distinct tent/tree')}
tn_win: ${txt('Four trees safely camped!')}
${POSITIVE_DIVISION}`;
const ataxx=`game_reset: M I 3300 M K 49
ax_clear: W I Z I I 1 I K -1 N K Z J ax_clear W 3300 1 W 3348 1 W 3306 2 W 3342 2 W 3316 -1 W 3324 -1 W 3332 -1 W 3200 1 W 3201 -1 C S ax_count C S ax_message J ax_render
game_move: R E game_status N E Z O S P M K A M I 3300 A I K R E I R F 3200 ife E F R E 3201 ife E K W 3201 -1 else W 3201 K end C S ax_message J ax_render end R A 3201 ifl A Z W game_message @ax_select O S P end M B K C S ax_legal ife A Z W game_message @ax_bad O S P end ife A 2 R I 3201 A I 3300 W I Z end R E 3200 M I 3300 A I K W I E W 3204 K M L Z
ax_convert: M I 3300 A I L R E I R F 3200 M G 3 S G F ifn E G J ax_convert_next end R A 3204 M B L C S ax_distance ifle G 1 ifle H 1 M I 3300 A I L R E 3200 W I E end end
ax_convert_next: I L 1 ifl L 49 J ax_convert end W 3201 -1 C S game_count_move C S ax_count R E 3202 ife E Z J ax_finish end R E 3203 ife E Z J ax_finish end R E game_moves ifge E 100 J ax_finish end R E 3200 M F 3 S F E W 3200 F C S ax_has_move ifn A Z C S ax_message J ax_render end R E 3200 M F 3 S F E W 3200 F C S ax_has_move ife A Z J ax_finish end C S ax_message J ax_render
ax_finish: R E 3202 R F 3203 ifg E F W game_status 1 W game_message @ax_a_win else ifl E F W game_status 2 W game_message @ax_b_win else W game_status 3 W game_message @ax_draw end end J ax_render
ax_distance: W 3210 B M B 7 C S app_div M G A M H C R A 3210 M B 7 C S app_div S G A F G A S H C F H A M A G ifg H A M A H end O S P
ax_legal: M I 3300 A I A R E I R F 3200 ifn E F M A Z O S P end M I 3300 A I B R E I ifn E Z M A Z O S P end C S ax_distance ifg A 2 M A Z end O S P
ax_has_move: M L Z
ax_from: M K Z
ax_to: M A L M B K C S ax_legal ifn A Z O S P end I K 1 ifl K 49 J ax_to end I L 1 ifl L 49 J ax_from end M A Z O S P
ax_count: W 3202 Z W 3203 Z M I 3300 M K 49
ax_census: R E I ife E 1 R F 3202 I F 1 W 3202 F end ife E 2 R F 3203 I F 1 W 3203 F end I I 1 I K -1 N K Z J ax_census O S P
ax_message: M I 3500 M J @ax_template M K 24
ax_msg_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J ax_msg_copy R A 3202 M B 10 C S app_div A A 48 A C 48 W 3501 A W 3502 C R A 3203 M B 10 C S app_div A A 48 A C 48 W 3505 A W 3506 C R E 3200 A E 64 W 3509 E W game_message 3500 O S P
ax_render: M L Z
ax_cell: M I 3300 A I L R E I ife E -1 M E 35 else ife E Z R A 3201 ifge A Z M B L C S ax_legal ife A 1 M E 43 else ife A 2 M E 42 else M E 46 end end else M E 46 end else A E 64 R F 3201 ife F L A E 32 end end end M I game_board A I L W I E I L 1 ifl L 49 J ax_cell end O S P
ax_template: ${txt('A02 B02; A moves        ')}
ax_select: ${txt('Select your side first')}
ax_bad: ${txt('Empty square, 1 or 2 away')}
ax_a_win: ${txt('A has more pieces: A wins!')}
ax_b_win: ${txt('B has more pieces: B wins!')}
ax_draw: ${txt('Equal pieces: draw')}
${POSITIVE_DIVISION}`;
const accordionDeck=[[5,2],[1,2],[3,0],[5,0],[5,1],[1,1],[1,3],[4,0],[2,0],[2,3],[4,3],[1,0]];
const accordion=`game_reset: W 3200 Z W 3201 Z W 3202 -1 W game_message @ac_prompt C S ac_draw_one J ac_render
game_move: R E game_status N E Z O S P M B 6 C S app_div M G A M H C ife G 1 M G Z end ife G 3 M G 2 end P G 3 A G H R E 3201 ifge G E W game_message @ac_empty O S P end R L 3202 ifl L Z W 3202 G W game_message @ac_destination J ac_render end ife L G W 3202 -1 W game_message @ac_prompt J ac_render end M E L S E G ifn E 1 ifn E 3 W game_message @ac_distance O S P end end M I 3300 A I L R E I M I 3300 A I G R F I ife E F J ac_join end M I 3320 A I L R E I M I 3320 A I G R F I ifn E F W game_message @ac_match O S P end
ac_join: M I 3300 A I L R E I M I 3300 A I G W I E M I 3320 A I L R E I M I 3320 A I G W I E M I 3340 A I L R E I M I 3340 A I G R F I A F E W I F R E 3201 I E -1 W 3201 E M K L
ac_compact: R E 3201 ifge K E J ac_moved end M I 3300 A I K M E I/1 W I E M I 3320 A I K M E I/1 W I E M I 3340 A I K M E I/1 W I E I K 1 J ac_compact
ac_moved: W 3202 -1 C S game_count_move C S ac_check J ac_render
game_key: E A 1 J ac_draw E A -26 J ac_draw M A Z O S P
ac_draw: R E game_status ifn E Z M A Z O S P end R E 3200 ifge E 12 W game_message @ac_no_stock M A 1 O S P end C S ac_draw_one W 3202 -1 C S game_count_move C S ac_check C S ac_render M A 1 O S P
ac_draw_one: R E 3200 P E 2 M J @ac_deck A J E R G 3201 M I 3300 A I G R E J W I E M I 3320 A I G M E J/1 W I E M I 3340 A I G W I 1 I G 1 W 3201 G R E 3200 I E 1 W 3200 E O S P
ac_check: W game_message @ac_prompt R E 3200 ifl E 12 O S P end R E 3201 ife E 1 W game_status 1 W game_message @ac_win O S P end M L 1
ac_source: M K 1
ac_gap: M G L S G K ifl G Z J ac_next_gap end M I 3300 A I L R E I M I 3300 A I G R F I ife E F O S P end M I 3320 A I L R E I M I 3320 A I G R F I ife E F O S P end
ac_next_gap: ife K 1 M K 3 J ac_gap end I L 1 R E 3201 ifl L E J ac_source end W game_status 2 W game_message @ac_lose O S P
ac_render: M I game_board M K 30
ac_clear: W I 46 I I 1 I K -1 N K Z J ac_clear M L Z
ac_card: R E 3201 ifge L E J ac_footer end M A L M B 6 C S app_div P A 12 A A C A A game_board W 3203 A M I 3300 A I L R E I M J @ac_ranks A J E R E J W A E M I 3320 A I L R E I M J @ac_suits A J E R E J R I 3203 A I 6 R F 3202 ife F L A E 32 end W I E I L 1 J ac_card
ac_footer: W 2924 78 W 2925 58 R A 3200 M E 12 S E A M A E M B 10 C S app_div A A 48 A C 48 W 2926 A W 2927 C W 2928 32 W 2929 32 O S P
ac_deck: ${accordionDeck.flat().join(' ')}
ac_ranks: ${[...'.A23456789TJQK'].map(c=>c.charCodeAt(0)).join(' ')}
ac_suits: 67 68 72 83
ac_prompt: ${txt('Pick pile; move 1 or 3 left')}
ac_destination: ${txt('Choose matching pile left')}
ac_empty: ${txt('No pile in that column')}
ac_distance: ${txt('Move exactly 1 or 3 left')}
ac_match: ${txt('Top rank or suit must match')}
ac_no_stock: ${txt('No stock; compress piles')}
ac_win: ${txt('All twelve cards: one pile!')}
ac_lose: ${txt('No stock or matching move')}
${POSITIVE_DIVISION}`;

export const TABLETOP_PUZZLES:BoardSoftware[]=[
{number:303,kind:'board',id:'tile-quilt',site:'loom',title:'Tile Quilt',columns:6,rows:7,stepKey:'n',counterLabel:'Moves',controls:'Enter:patch F:turn N:check',inputs:['Patch and anchor','Quarter turns'],outputs:['Packed quilt','Fit feedback'],description:'Pack six tetromino patches into the top 6 by 4 rectangle. Choose A-F in the fifth row, then choose an anchor square. F turns clockwise; placement uses the upper-left corner of the rotated bounding box. A is a horizontal I, B a square O, C/D a T pointing up, E an L with its foot right, and F an S with its top shifted right. TYPE and TURN show the selection. Lowercase patches are placed; selecting one lifts it for revision. Pieces cannot overlap or cross the edge. N checks complete coverage. R restarts; F1 exits.',algorithm:quilt,examples:[{"moves":[24,0,25,16],"steps":0,"board":"AAAA............BB....BBabCDEFTYPE -TURN -","status":0,"movesMade":2}]},
{number:304,kind:'board',id:'tents-trees',site:'garden',title:'Tents and Trees',columns:6,rows:6,stepKey:'n',counterLabel:'Marks',controls:'Enter:./^/x N:check',inputs:['Tent marks','Tree pairing'],outputs:['Row/column clues','Camp check'],description:'Place four tents ^ among the trees T on the top-left 5 by 5 field. Enter cycles empty, tent and excluded x. Right and bottom numbers are required tent counts. Tents may not touch, even diagonally. Each tree must pair with one different tent immediately above, below, left or right; no tent may serve two trees. N checks every rule and the one-to-one pairing. Unknown and excluded cells both count as empty. Trees and clues stay fixed. R clears marks; F1 exits.',algorithm:tents,examples:[{"moves":[0,4,19,28],"steps":1,"board":"^T..^2....T0.....0T^...1...T^111002N","status":1,"movesMade":4}]},
{number:305,kind:'board',id:'ataxx',site:'hexclub',title:'Ataxx',columns:7,rows:7,counterLabel:'Turns',controls:'Enter:piece/dest R:reset',inputs:['Two players','Clone or jump'],outputs:['Converted pieces','Majority winner'],description:'Two local players share the keyboard, A first. Select your piece, then an empty destination. A + is a one-square clone: keep the source and add a piece. A * is a two-square jump: vacate the source. Distance includes diagonals. Every adjacent enemy becomes yours after either move. # holes cannot be occupied. Select the same piece to cancel. A side with no legal move passes automatically. If both sides are blocked, a side vanishes, or 100 turns elapse, the larger population wins; equal counts draw. The message shows populations and whose turn it is. R resets; F1 exits.',algorithm:ataxx,examples:[{"moves":[0,8,6,12],"steps":0,"board":"A.....B.A...B...#.......#.......#.........B.....A","status":0,"movesMade":2}]},
{number:306,kind:'board',id:'accordion',site:'cardtable',title:'Accordion Patience',columns:6,rows:5,stepKey:'n',counterLabel:'Moves',controls:'Enter:pile/left N:draw',inputs:['Pile pair','Draw stock'],outputs:['Compressed piles','Win or blockade'],description:'Compress twelve authored cards into one pile. Each column shows a top rank and its suit C/D/H/S; A is ace. The first six piles occupy the upper pair of rows, the next six the lower pair. Select any pile, then a pile exactly one or three places left, counting piles across the row break. Their top ranks or suits must match. Move the whole source pile onto the destination and close the gap; only the new top card matters. The selected suit becomes lowercase. N draws the next card; the footer shows stock remaining. With no stock and no legal move, you lose unless one pile remains. R replays; F1 exits.',algorithm:accordion,examples:[{"moves":[1,0],"steps":1,"board":"5A....HH................N:10  ","status":0,"movesMade":1}]},
];
