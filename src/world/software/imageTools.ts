import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const key=(label:string)=>`game_key: E A 1 J ${label} E A -26 J ${label} M A Z O S P`;
const clear=`image_clear: M I 3000 M E 64
image_zero: W I Z I I 1 I E -1 N E Z J image_zero O S P`;
export const IMAGE_TOOLS:BoardSoftware[] = [
  {
    number:145,kind:'board',id:'voronoi-mosaic',site:'pottery',title:'Three-Color Voronoi Mosaic',columns:8,rows:8,stepKey:'n',counterLabel:'Runs',
    description:'Enter cycles a seed through empty, A, B and C. Editing restores the seed-only view. N fills each cell from its nearest seed by Manhattan distance: territories are lowercase a/b/c, seeds uppercase, and equal-distance ties between different colors are +. Same-color ties retain that color. With no seeds the board stays empty. R clears seeds and F1 exits.',
    inputs:['Color seeds','N: fill mosaic'],outputs:['Territories','Runs'],
    algorithm:`game_reset: C S image_clear W game_message @mosaic_info J mosaic_seeds
game_move: M I 3000 A I A R E I I E 1 ife E 4 M E Z end W I E
mosaic_seeds: M J Z
mosaic_seed_cell: M I 3000 A I J R E I M F 46 ifn E Z M F E A F 64 end M I game_board A I J W I F I J 1 ifl J 64 J mosaic_seed_cell end O S P
${key('mosaic_run')}
mosaic_run: M K Z
mosaic_cell: M A K M B 8 C S app_div W 3200 A W 3201 C W 3202 99 W 3203 Z M J Z
mosaic_search: M I 3000 A I J R H I ife H Z J mosaic_next end M A J M B 8 C S app_div R E 3200 S A E F A A R E 3201 S C E F C A A A C R E 3202 ifl A E W 3202 A W 3203 H else ife A E R E 3203 ifn E H W 3203 -1 end end end
mosaic_next: I J 1 ifl J 64 J mosaic_search end M I 3000 A I K R E I M F 46 ifn E Z M F E A F 64 else R E 3203 ifl E Z M F 43 else ifg E Z M F E A F 96 end end end M I game_board A I K W I F I K 1 ifl K 64 J mosaic_cell end C S game_count_move M A 1 O S P
mosaic_info: ${text('Enter:seed color N:fill')}
${clear}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0],steps:1,board:'A'+'a'.repeat(63),status:0,movesMade:1},{moves:[],steps:1,board:'.'.repeat(64),status:0,movesMade:1}],
  },
  {
    number:146,kind:'board',id:'ordered-dither',site:'darkroom',title:'Ordered Dither Proof',columns:8,rows:8,stepKey:'n',counterLabel:'Views',
    description:'Enter cycles a pixel through five gray levels 0..4, from paper to full ink. N toggles between editable gray digits and a monochrome proof using a repeating 2x2 Bayer threshold matrix. # is ink and . is paper. Editing returns to gray view without losing levels. R clears all levels; arrows and Tab select cells and F1 exits.',
    inputs:['Gray levels','N: toggle proof'],outputs:['Dither proof','Views'],
    algorithm:`game_reset: C S image_clear W 3200 Z W game_message @dither_info J dither_render
game_move: M I 3000 A I A R E I I E 1 ife E 5 M E Z end W I E W 3200 Z J dither_render
${key('dither_toggle')}
dither_toggle: R E 3200 M F 1 S F E W 3200 F C S dither_render C S game_count_move M A 1 O S P
dither_render: M J Z
dither_cell: M I 3000 A I J R H I M F H A F 48 R E 3200 ifn E Z M A J M B 8 C S app_div M G C M B 2 C S app_div M K C M A G C S app_div P K 2 A K C M I @dither_matrix A I K R E I M F 46 ifg H E M F 35 end end M I game_board A I J W I F I J 1 ifl J 64 J dither_cell end O S P
dither_matrix: 0 2 3 1
dither_info: ${text('Enter:gray N:proof/gray')}
${clear}
${POSITIVE_DIVISION}`,
    examples:[{moves:[0,0,0,0,1,1],steps:1,board:'#'+'.'.repeat(63),status:0,movesMade:1},{moves:[0],steps:2,board:'1'+'0'.repeat(63),status:0,movesMade:2}],
  },
  {
    number:147,kind:'board',id:'ink-gap-close',site:'typecase',title:'Ink Gap Closer',columns:8,rows:8,stepKey:'n',counterLabel:'Runs',
    description:'Enter toggles ink pixels. N applies binary morphological closing: a 3x3 square dilation followed by erosion, bridging narrow gaps and filling small holes in a glyph. Each pass reads a separate native buffer. Outside the 8x8 canvas is empty in both passes, so the final outer border is cleared. Repeated N runs process the current result. R clears and F1 exits.',
    inputs:['Ink pixels','N: close gaps'],outputs:['Closed glyph','Runs'],
    algorithm:`game_reset: M I game_board M E 64
close_clear: W I 46 I I 1 I E -1 N E Z J close_clear W game_message @close_info O S P
game_move: M I game_board A I A R E I M F 81 S F E W I F O S P
${key('close_run')}
close_run: M K Z M L game_board
close_dilate: C S close_count M F 46 ifg D Z M F 35 end M I 3000 A I K W I F I K 1 ifl K 64 J close_dilate end M K Z M L 3000
close_erode: C S close_count M F 46 ife D 9 M F 35 end M I 3100 A I K W I F I K 1 ifl K 64 J close_erode end M J Z
close_copy: M I 3100 A I J R E I M I game_board A I J W I E I J 1 ifl J 64 J close_copy end C S game_count_move M A 1 O S P
close_count: M A K M B 8 C S app_div M G A I G -1 ifl G Z M G Z end I A 1 ifg A 7 M A 7 end W 3201 A M H C I H -1 ifl H Z M H Z end W 3202 H I C 1 ifg C 7 M C 7 end W 3203 C M D Z
close_row: R H 3202
close_column: M I G P I 8 A I H A I L R E I ife E 35 I D 1 end I H 1 R E 3203 ifle H E J close_column end I G 1 R E 3201 ifle G E J close_row end O S P
close_info: ${text('Enter:ink N:close gaps')}
${POSITIVE_DIVISION}`,
    examples:[{moves:[18,19,20,26,28,34,35,36],steps:1,board:Array.from({length:64},(_,i)=>[18,19,20,26,27,28,34,35,36].includes(i)?'#':'.').join(''),status:0,movesMade:1},{moves:[],steps:1,board:'.'.repeat(64),status:0,movesMade:1}],
  },
];
