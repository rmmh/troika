import type { TextSoftware } from './native';
import { LINEAR_HELPERS } from './linearAlgebra';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
/** Signed AB cross AC. A/B/C point pointers; F result; preserve G/H/J/K/L. */
const cross=`geo_cross: M I A R D I M E I/1 M I B R A I S A D M B I/1 S B E M I C R F I S F D M C I/1 S C E P A C P B F M F A S F B O S P`;

export const GEOMETRY_SOFTWARE: TextSoftware[] = [
  {
    number:123,kind:'text',id:'polygon-area',site:'maps',title:'Signed polygon area',
    description:'Enter three or four x y vertex pairs in boundary order, coordinates -9..9. Computes signed area by the shoelace formula, as an exact integer or half-integer. Counterclockwise order is positive in ordinary x-right/y-up coordinates. Self-crossing polygons return algebraic area; no simplicity check is performed.',
    inputs:['Vertex pairs'],outputs:['Signed area'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R L 3000 ifn L 6 ifn L 8 J app_bad end end M J Z M H Z
area_next: M K J I K 2 ife K L M K Z end M I 2900 A I J R G I M E I/1 M I 2900 A I K R F I M D I/1 P G D P E F S G E A H G I J 2 ifl J L J area_next end M F H M D 2 J stats_fraction
${LINEAR_HELPERS}`,
    examples:[{input:'0 0 3 0 0 3',output:'9/2'},{input:'0 0 0 3 3 0',output:'-9/2'},{input:'0 0 3 0 3 2 0 2',output:'6'},{input:'0 0 2 2 0 2 2 0',output:'0'}],
  },
  {
    number:124,kind:'text',id:'line-intersect',site:'lenses',title:'Exact line intersection',
    description:'Enter x1 y1 x2 y2 x3 y3 x4 y4 in -9..9: two points on each infinite line. Returns the unique intersection as reduced fractions, even beyond the given points. Parallel/coincident lines and repeated-point definitions report an error. This is infinite-line intersection, not segment clipping.',
    inputs:['Four point pairs'],outputs:['Intersection'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 8 J app_bad end
 R G 2900 R E 2902 S G E R H 2901 R E 2903 S H E R J 2904 R E 2906 S J E R K 2905 R E 2907 S K E
 M L G P L K M F H P F J S L F E L Z J app_bad
 R A 2900 R E 2903 P A E R F 2901 R E 2902 P F E S A F W 3020 A
 R A 2904 R E 2907 P A E R F 2905 R E 2906 P F E S A F W 3021 A
 R F 3020 P F J R E 3021 P E G S F E W 3022 F
 R F 3020 P F K R E 3021 P E H S F E W 3023 F
 M A @line_x C S stats_label R F 3022 M D L C S linear_fraction M A @line_y C S stats_label R F 3023 M D L J linear_fraction
line_x: ${ascii('x=')}
line_y: ${ascii(' y=')}
${LINEAR_HELPERS}`,
    examples:[{input:'0 0 2 2 0 2 2 0',output:'x=1 y=1'},{input:'0 0 1 2 0 1 2 0',output:'x=2/5 y=4/5'},{input:'0 0 1 0 2 -1 2 1',output:'x=2 y=0'},{input:'0 0 1 1 2 2 3 3',error:true}],
  },
  {
    number:125,kind:'text',id:'triangle-point',site:'gallery',title:'Point in triangle',
    description:'Enter three triangle vertex pairs followed by one query x y pair, all in -9..9. Reports INSIDE, BOUNDARY or OUTSIDE, independent of vertex winding. Edges and vertices are boundary points. Degenerate triangles (collinear or repeated vertices) report an error.',
    inputs:['Triangle + point'],outputs:['Classification'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 8 J app_bad end M A 2900 M B 2902 M C 2904 C S geo_cross E F Z J app_bad M H F M K Z
 M A 2900 M B 2902 M C 2906 C S geo_cross C S triangle_side N A Z J triangle_outside
 M A 2902 M B 2904 M C 2906 C S geo_cross C S triangle_side N A Z J triangle_outside
 M A 2904 M B 2900 M C 2906 C S geo_cross C S triangle_side N A Z J triangle_outside
 ife K Z M A @inside else M A @boundary end J stats_label
triangle_outside: M A @outside J stats_label
triangle_side: ife F Z M K 1 end ifg H Z ifl F Z M A -1 O S P end else ifg F Z M A -1 O S P end end M A Z O S P
inside: ${ascii('INSIDE')}
boundary: ${ascii('BOUNDARY')}
outside: ${ascii('OUTSIDE')}
${cross}
${LINEAR_HELPERS}`,
    examples:[{input:'0 0 4 0 0 4 1 1',output:'INSIDE'},{input:'0 0 4 0 0 4 2 2',output:'BOUNDARY'},{input:'0 4 4 0 0 0 4 4',output:'OUTSIDE'},{input:'0 0 1 1 2 2 1 0',error:true}],
  },
  {
    number:126,kind:'text',id:'rect-overlap',site:'paper',title:'Rectangle overlap area',
    description:'Enter two opposite corners for each of two axis-aligned rectangles: eight coordinates in -9..9. Corner order may be reversed. Computes exact overlapping area; touching edges, touching corners, and zero-width/height rectangles have zero area.',
    inputs:['Rectangle pairs'],outputs:['Overlap area'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 8 J app_bad end M J 2900 M K 2
rect_normalize: R E J M F J/2 ifg E F W J F M J/2 E end M E J/1 M F J/3 ifg E F M J/1 F M J/3 E end I J 4 I K -1 N K Z J rect_normalize
 R G 2900 R E 2904 ifg E G M G E end R H 2902 R E 2906 ifl E H M H E end S H G ifle H Z M F Z J stats_int end
 R G 2901 R E 2905 ifg E G M G E end R L 2903 R E 2907 ifl E L M L E end S L G ifle L Z M F Z J stats_int end M F H P F L J stats_int
${LINEAR_HELPERS}`,
    examples:[{input:'0 0 4 4 2 1 5 3',output:'4'},{input:'4 4 0 0 3 3 1 1',output:'4'},{input:'0 0 1 1 1 0 2 1',output:'0'},{input:'-9 -9 9 9 -9 -9 9 9',output:'324'}],
  },
];
