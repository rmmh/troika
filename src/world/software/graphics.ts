import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const board=(pieces:Record<number,string>,empty='.')=>Array.from({length:64},(_,i)=>pieces[i]??empty).join('');
const key=(label:string)=>`game_key: E A 1 J ${label} E A -26 J ${label} M A Z O S P`;
const clear=`art_clear: M I game_board M E 64
clear_next: W I 46 I I 1 I E -1 N E Z J clear_next O S P`;
const flip=`art_flip: M I game_board A I A R F I M E 81 S E F W I E O S P`;
const copy=`art_copy: M I game_board M J 3000 M E 64
copy_next: R F J W I F I I 1 I J 1 I E -1 N E Z J copy_next O S P`;
/** Bounded queue. The caller marks a cell before enqueueing it, at most once. */
const flood=`art_enqueue: R E 3221 M I 3100 A I E W I A I E 1 W 3221 E O S P
art_flood: R E 3220 R F 3221 E E F O S P M I 3100 A I E R A I I E 1 W 3220 E C S art_neighbors J art_flood
art_neighbors: W 3240 A M B 8 C S app_div W 3241 A W 3242 C
 R E 3241 ifg E Z R A 3240 I A -8 C S art_visit end R E 3242 ifl E 7 R A 3240 I A 1 C S art_visit end
 R E 3241 ifl E 7 R A 3240 I A 8 C S art_visit end R E 3242 ifg E Z R A 3240 I A -1 C S art_visit end O S P`;
const paint=`art_visit: M I game_board A I A R E I R F 3230 N E F O S P R E 3231 W I E J art_enqueue`;

export const GRAPHICS_SOFTWARE: BoardSoftware[] = [
  {
    number:92,kind:'board',id:'line-sketch',site:'mae',title:'Pixel Line Sketchbook',columns:8,rows:8,counterLabel:'Lines',
    description:'Enter selects an endpoint (+); a second Enter draws an inclusive integer Bresenham line of stars between the two cells. Strokes accumulate. Selecting the same cell twice draws one pixel. R clears the sketch; F1 exits. Arrows and Tab position the cursor.',
    inputs:['Two endpoints'],outputs:['Pixel sketch','Lines'],
    algorithm:`game_reset: C S art_clear W 3210 -1 W game_message @line_first O S P
game_move: M G A R E 3210 ifl E Z W 3210 G M I game_board A I G R E I W 3211 E W I 43 W game_message @line_second O S P end
 M I game_board A I E R F 3211 W I F M A E M B 8 C S app_div W 3000 C W 3001 A M A G C S app_div W 3002 C W 3003 A
 R E 3002 R F 3000 S E F M H 1 ifl E Z M H -1 end F E A W 3004 E W 3006 H R F 3003 R H 3001 S F H M H 1 ifl F Z M H -1 end F F A W 3005 F W 3007 H S E F W 3008 E
line_pixel: R I 3001 P I 8 R E 3000 A I E A I game_board W I 42 R F 3002 ife E F R E 3001 R F 3003 E E F J line_done end
 R E 3008 P E 2 W 3009 E R F 3005 P F -1 ifge E F R E 3008 A E F W 3008 E R E 3000 R F 3006 A E F W 3000 E end
 R E 3009 R F 3004 ifle E F R E 3008 A E F W 3008 E R E 3001 R F 3007 A E F W 3001 E end J line_pixel
line_done: W 3210 -1 W game_message @line_first J game_count_move
line_first: ${text('Choose first endpoint')}
line_second: ${text('Choose second endpoint')}
${clear}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,63],board:board(Object.fromEntries(Array.from({length:8},(_,i)=>[i*9,'*']))),status:0,movesMade:1},{moves:[0,7],board:'*'.repeat(8)+'.'.repeat(56),status:0,movesMade:1},{moves:[27,27],board:board({27:'*'}),status:0,movesMade:1}],
  },
  {
    number:93,kind:'board',id:'bucket-fill',site:'pottery',title:'Glaze Region Bucket',columns:8,rows:8,stepKey:'n',counterLabel:'Fills',
    description:'Enter toggles a barrier (#); other cells are empty (.) or glazed (*). N fills the cursor region through orthogonal connections, swapping empty and glazed cells. Barriers block the fill and cannot be filled. R clears everything. The native work queue holds at most 64 cells.',
    inputs:['Barrier edits','N: fill region'],outputs:['Connected fill','Fills'],
    algorithm:`game_reset: C S art_clear W game_message @bucket_info O S P
game_move: M I game_board A I A R E I M F 35 E E 35 M F 46 W I F O S P
${key('bucket_fill')}
bucket_fill: R A game_cursor M I game_board A I A R E I ife E 35 M A Z O S P end W 3230 E M F 88 S F E W 3231 F W 3220 Z W 3221 Z C S art_visit C S art_flood C S game_count_move M A 1 O S P
bucket_info: ${text('N fills ./*; # blocks')}
${clear}
${flood}
${paint}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],steps:1,board:'*'.repeat(64),status:0,movesMade:1},{moves:[],steps:2,board:'.'.repeat(64),status:0,movesMade:2},{moves:[0],steps:1,board:board({0:'#'}),status:0,movesMade:0}],
  },
  {
    number:94,kind:'board',id:'mirror-tile',site:'stamps',title:'Fourfold Mirror Tile',columns:8,rows:8,stepKey:'n',counterLabel:'Ops',
    description:'Enter flips a pixel and its horizontal, vertical and double reflections together, creating a fourfold symmetric stamp tile. N rotates the complete tile clockwise by a quarter turn. Dots are paper and # is ink. R clears the tile. Operations count edits and rotations.',
    inputs:['Symmetric edits','N: rotate'],outputs:['Stamp pattern','Operations'],
    algorithm:`game_reset: C S art_clear W game_message @mirror_info O S P
game_move: M B 8 C S app_div M G A M H C M A G P A 8 A A H C S art_flip M A G P A 8 M E 7 S E H A A E C S art_flip M A 7 S A G P A 8 A A H C S art_flip M A 7 S A G P A 8 M E 7 S E H A A E C S art_flip J game_count_move
${key('mirror_rotate')}
mirror_rotate: M G Z
mirror_cell: M A G M B 8 C S app_div M I C P I 8 M E 7 S E A A I E A I 3000 M J game_board A J G R E J W I E I G 1 ifl G 64 J mirror_cell end C S art_copy C S game_count_move M A 1 O S P
mirror_info: ${text('Four mirrors; N rotates')}
${clear}
${flip}
${copy}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0],board:board({0:'#',7:'#',56:'#',63:'#'}),status:0,movesMade:1},{moves:[1],steps:1,board:board({8:'#',15:'#',48:'#',55:'#'}),status:0,movesMade:2},{moves:[0,63],board:'.'.repeat(64),status:0,movesMade:2}],
  },
  {
    number:95,kind:'board',id:'weave-draft',site:'loom',title:'Two-Color Weave Draft',columns:8,rows:8,counterLabel:'Edits',
    description:'The top row sets seven warp colors (0/1), and the left column sets seven weft colors. Enter flips a header color or the over/under choice at an interior crossing. The interior shows the color of the strand on top. The + corner is inert. R restores a plain weave with warp 1 and weft 0.',
    inputs:['Colors and lifts'],outputs:['Woven cloth','Edits'],
    algorithm:`game_reset: M G Z
weave_init: M A G M B 8 C S app_div M E A A E C M A E M B 2 C S app_div M I 3000 A I G W I C I G 1 ifl G 64 J weave_init end M I 3200 M E 7
weave_headers: W I 1 M I/8 Z I I 1 I E -1 N E Z J weave_headers W game_message @weave_info J weave_render
game_move: E A Z O S P M G A M B 8 C S app_div ife A Z M I 3199 A I C else ife C Z M I 3207 A I A else M I 3000 A I G end end R F I M E 1 S E F W I E C S weave_render J game_count_move
weave_render: W game_board 43 M G 1
weave_pixel: M A G M B 8 C S app_div ife A Z M I 3199 A I C R E I else ife C Z M I 3207 A I A R E I else M I 3000 A I G R E I ife E Z M I 3199 A I C else M I 3207 A I A end R E I end end A E 48 M I game_board A I G W I E I G 1 ifl G 64 J weave_pixel end O S P
weave_info: ${text('Headers: color; cells: lift')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[],board:Array.from({length:64},(_,i)=>i===0?'+':i<8?'1':i%8===0?'0':(Math.floor(i/8)+i%8)%2?'0':'1').join(''),status:0,movesMade:0}],
  },
  {
    number:96,kind:'board',id:'pixel-flipbook',site:'cinema',title:'Three-Frame Pixel Flipbook',columns:8,rows:8,stepKey:'n',counterLabel:'Edits',
    description:'Enter toggles an ink pixel in the current frame. N advances through three independently stored frames and wraps to the first. Flip through manually to inspect motion; there is no automatic timer. R clears all frames and returns to frame one. Edits count across all frames.',
    inputs:['Pixel edits','N: next frame'],outputs:['Three frames','Edits'],
    algorithm:`game_reset: M I 3000 M E 192
book_clear: W I 46 I I 1 I E -1 N E Z J book_clear W 3200 Z J book_render
game_move: M G A C S art_flip R E 3200 P E 64 A E G M I 3000 A I E M J game_board A J G R E J W I E J game_count_move
${key('book_next')}
book_next: R E 3200 I E 1 ife E 3 M E Z end W 3200 E C S book_render M A 1 O S P
book_render: R E 3200 M J @book_messages A J E R F J W game_message F P E 64 M J 3000 A J E M I game_board M E 64
book_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J book_copy O S P
book_messages: @book_one @book_two @book_three
book_one: ${text('Frame 1/3; N advances')}
book_two: ${text('Frame 2/3; N advances')}
book_three: ${text('Frame 3/3; N advances')}
${flip}`,
    examples:[{moves:[0,9],board:board({0:'#',9:'#'}),status:0,movesMade:2},{moves:[0,9],steps:1,board:'.'.repeat(64),status:0,movesMade:2},{moves:[0,9],steps:3,board:board({0:'#',9:'#'}),status:0,movesMade:2}],
  },
  {
    number:97,kind:'board',id:'ink-components',site:'gallery',title:'Connected Ink Labels',columns:8,rows:8,stepKey:'n',counterLabel:'Runs',
    description:'Enter toggles ink (#) at a cell. N labels every orthogonally connected ink component in scan order: A..Z then a..f. Diagonal contact does not connect. Editing labeled ink erases that cell; N recomputes labels from scratch. R clears the image.',
    inputs:['Ink edits','N: label regions'],outputs:['Components','Runs'],
    algorithm:`game_reset: C S art_clear W game_message @component_info O S P
game_move: M I game_board A I A R E I M F 46 E E 46 M F 35 W I F O S P
${key('component_run')}
component_run: M I game_board M E 64
component_normalize: R F I ifn F 46 W I 35 end I I 1 I E -1 N E Z J component_normalize M G Z M H 65 W 3230 35
component_next: M I game_board A I G R E I ife E 35 W 3231 H W 3220 Z W 3221 Z M A G C S art_visit C S art_flood I H 1 ife H 91 M H 97 end end I G 1 ifl G 64 J component_next end C S game_count_move M A 1 O S P
component_info: ${text('N labels connected ink')}
${clear}
${flood}
${paint}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,1,9,63],steps:1,board:board({0:'A',1:'A',9:'A',63:'B'}),status:0,movesMade:1},{moves:[0,9],steps:1,board:board({0:'A',9:'B'}),status:0,movesMade:1}],
  },
  {
    number:98,kind:'board',id:'distance-field',site:'lenses',title:'Nearest-Seed Distance Field',columns:8,rows:8,stepKey:'n',counterLabel:'Runs',
    description:'Enter toggles source cells (S), clearing the old result. N computes the shortest orthogonal distance to any source using a native multi-source queue. Distances 1..9 are digits and 10..14 are A..E. There are no obstacles or wraparound. No sources leaves dots. R clears all sources.',
    inputs:['Source edits','N: distance map'],outputs:['Distance field','Runs'],
    algorithm:`game_reset: M I 3000 M E 64
field_clear: W I Z I I 1 I E -1 N E Z J field_clear W game_message @field_info J field_render
game_move: M I 3000 A I A R F I M E 1 S E F W I E J field_render
field_render: M I game_board M J 3000 M E 64
field_pixel: R F J M A 46 ifn F Z M A 83 end W I A I I 1 I J 1 I E -1 N E Z J field_pixel O S P
${key('field_run')}
field_run: C S field_render W 3220 Z W 3221 Z M G Z
field_seed: M I 3300 A I G W I -1 M I 3000 A I G R E I ifn E Z M I 3300 A I G W I Z M A G C S art_enqueue end I G 1 ifl G 64 J field_seed end C S art_flood C S game_count_move M A 1 O S P
art_visit: M I 3300 A I A R E I N E -1 O S P R E 3240 M J 3300 A J E R F J I F 1 W I F M E F ifg E 9 A E 55 else A E 48 end M I game_board A I A W I E J art_enqueue
field_info: ${text('N maps distance from S')}
${flood}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0],steps:1,board:Array.from({length:64},(_,i)=>i===0?'S':'0123456789ABCDE'[Math.floor(i/8)+i%8]!).join(''),status:0,movesMade:1},{moves:[],steps:1,board:'.'.repeat(64),status:0,movesMade:1}],
  },
  {
    number:99,kind:'board',id:'ink-outline',site:'darkroom',title:'Ink Boundary Extractor',columns:8,rows:8,stepKey:'n',counterLabel:'Runs',
    description:'Enter flips ink (#). N keeps only ink cells touching empty space in an orthogonal direction, including outside the finite grid. Interior ink disappears simultaneously. Applying N again works on the new image. R clears the image. This extracts a one-cell inner boundary.',
    inputs:['Ink edits','N: extract edge'],outputs:['Inner boundary','Runs'],
    algorithm:`game_reset: C S art_clear W game_message @outline_info O S P
game_move: J art_flip
${key('outline_run')}
outline_run: M G Z
outline_cell: W 3233 Z M I game_board A I G R E I ife E 35 M A G M B 8 C S app_div E A Z W 3233 1 E A 7 W 3233 1 E C Z W 3233 1 E C 7 W 3233 1 M A G C S art_neighbors end
 R E 3233 M F 46 ifn E Z M F 35 end M I 3000 A I G W I F I G 1 ifl G 64 J outline_cell end C S art_copy C S game_count_move M A 1 O S P
art_visit: M I game_board A I A R E I ife E 46 W 3233 1 end O S P
outline_info: ${text('N keeps inner boundary')}
${clear}
${flip}
${copy}
${flood}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,1,2,8,9,10,16,17,18],steps:1,board:board({0:'#',1:'#',2:'#',8:'#',10:'#',16:'#',17:'#',18:'#'}),status:0,movesMade:1}],
  },
  {
    number:100,kind:'board',id:'triangle-paint',site:'paper',title:'Filled Triangle Stencil',columns:8,rows:8,counterLabel:'Faces',
    description:'Enter chooses three grid vertices. The first two appear as + markers; the third paints all cell centers inside or on the triangle with #. Shapes accumulate. Collinear vertices are rejected and the original pixels restored. R clears the stencil; F1 exits.',
    inputs:['Three vertices'],outputs:['Filled stencil','Faces'],
    algorithm:`game_reset: C S art_clear W 3200 Z W game_message @triangle_first O S P
game_move: M G A M B 8 C S app_div R E 3200 M I 3000 P E 2 A I E W I C M I/1 A R E 3200
 ifl E 2 M I 3201 A I E W I G M I game_board A I G R F I W I 43 M I 3204 A I E W I F I E 1 W 3200 E W game_message @triangle_more O S P end
 R I 3202 A I game_board R E 3205 W I E R I 3201 A I game_board R E 3204 W I E W 3200 Z
 R E 3000 W 3006 E R E 3001 W 3007 E R J 3004 R H 3005 M I 3000 C S triangle_cross M L F ife L Z W game_message @triangle_bad O S P end M G Z
triangle_cell: M A G M B 8 C S app_div M H A M J C M K Z
triangle_edge: M I 3000 A I K C S triangle_cross ifg L Z ifl F Z J triangle_next end else ifg F Z J triangle_next end end I K 2 ifl K 6 J triangle_edge end M I game_board A I G W I 35
triangle_next: I G 1 ifl G 64 J triangle_cell end W game_message @triangle_first J game_count_move
triangle_cross: R B I M C I/1 M D I/2 M E I/3 S D B S E C M F H S F C P F D M A J S A B P A E S F A O S P
triangle_first: ${text('Choose three vertices')}
triangle_more: ${text('Choose another vertex')}
triangle_bad: ${text('Collinear; choose anew')}
${clear}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,7,56],board:Array.from({length:64},(_,i)=>Math.floor(i/8)+i%8<=7?'#':'.').join(''),status:0,movesMade:1},{moves:[0,7,3],board:'.'.repeat(64),status:0,movesMade:0}],
  },
];
