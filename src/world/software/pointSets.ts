import type { TextSoftware } from './native';
import { LINEAR_HELPERS } from './linearAlgebra';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const helpers=`point_parse: C S linear_parse N A Z O S P R E 3000 ifn E 2 ifn E 4 ifn E 6 ifn E 8 J app_bad end end end end M A Z O S P
; Squared distance between point pointers A/B, F result, preserving G..L.
point_distance: M I A R D I M E I/1 M I B R F I S F D M D I/1 S D E P F F P D D A F D O S P
; AB cross AC, preserving G..L.
point_cross: M I A R D I M E I/1 M I B R A I S A D M B I/1 S B E M I C R F I S F D M C I/1 S C E P A C P B F M F A S F B O S P
${LINEAR_HELPERS}`;
export const POINT_SET_SOFTWARE:TextSoftware[] = [
  {
    number:168,kind:'text',id:'closest-points',site:'maps',title:'Closest Point Pair',
    description:'Enter two to four x y point pairs with integer coordinates -9..9. Prints the exact squared Euclidean distance d2 and the one-based indices of the closest pair. Equal-distance ties use the earliest first index, then earliest second index. Duplicate points are allowed and have distance zero. The distance is squared to avoid an approximate square root; comparisons and pair selection run natively.',
    inputs:['Point pairs'],outputs:['Distance / pair'],
    algorithm:`app_compute: C S point_parse N A Z O S P R E 3000 ifl E 4 J app_bad end A E 2900 W 3100 E M G 2900 M L 999
near_row: M H G I H 2
near_pair: M A G M B H C S point_distance ifl F L M L F M J G M K H end I H 2 R E 3100 ifl H E J near_pair end I G 2 I E -2 ifl G E J near_row end
 M A @near_distance C S stats_label M F L C S stats_int M A @near_indices C S stats_label M F J S F 2900 Q F 2 I F 1 C S stats_int M A 44 C S app_put M F K S F 2900 Q F 2 I F 1 J stats_int
near_distance: ${ascii('d2=')}
near_indices: ${ascii(' pair=')}
${helpers}`,
    examples:[{input:'0 0 3 4',output:'d2=25 pair=1,2'},{input:'0 0 9 9 1 0',output:'d2=1 pair=1,3'},{input:'0 0 1 0 0 1 1 1',output:'d2=1 pair=1,2'},{input:'2 3 2 3',output:'d2=0 pair=1,2'},{input:'0 0',error:true}],
  },
  {
    number:169,kind:'text',id:'convex-hull',site:'gallery',title:'Convex Hull Builder',
    description:'Enter one to four x y point pairs with integer coordinates -9..9. Native gift wrapping returns the convex hull as x,y vertices, counterclockwise in x-right/y-up coordinates, starting at the lexicographically smallest point. Duplicate points and collinear interior points are omitted. A collinear set returns its two endpoints; a set of identical points returns one vertex. The first vertex is not repeated at the end.',
    inputs:['Point pairs'],outputs:['Hull vertices'],
    algorithm:`app_compute: C S point_parse N A Z O S P R K 3000 A K 2900 M L 2900 M J 2902
hull_start_scan: ifge J K J hull_start_done end R E J R F L ifl E F M L J else ife E F M E J/1 M F L/1 ifl E F M L J end end end I J 2 J hull_start_scan
hull_start_done: M G L W 3100 Z
hull_vertex: R E 3100 ifn E Z M A 32 C S app_put end W 3100 1 R F G C S stats_int M A 44 C S app_put M F G/1 C S stats_int M H Z M J 2900
hull_candidate: ifge J K J hull_advance end R E J R F G ife E F M E J/1 M F G/1 ife E F J hull_skip end end ife H Z M H J J hull_skip end
 M A G M B H M C J C S point_cross ifl F Z M H J else ife F Z M A G M B H C S point_distance W 3101 F M A G M B J C S point_distance R E 3101 ifg F E M H J end end end
hull_skip: I J 2 J hull_candidate
hull_advance: ife H Z M A Z O S P end M G H ife G L M A Z O S P end J hull_vertex
${helpers}`,
    examples:[{input:'0 0 2 0 2 2 0 2',output:'0,0 2,0 2,2 0,2'},{input:'0 0 3 0 0 3 1 1',output:'0,0 3,0 0,3'},{input:'2 2 0 0 1 1 2 2',output:'0,0 2,2'},{input:'-1 2 -1 2',output:'-1,2'},{input:'3 -4',output:'3,-4'}],
  },
];
