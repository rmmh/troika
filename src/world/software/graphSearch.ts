import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';

const ascii = (s: string) => [...s].map(c => c.charCodeAt(0)).concat(0).join(' ');
// Boolean adjacency at 3000..3048; vertices in L. Duplicate edges collapse.
const parse = (undirected: boolean) => `search_parse: M J 2552 R K 2610 C S search_digit N A Z O S P M L E
 ifl L 1 J app_bad end ifg L 7 J app_bad end
 E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1
 M I 3000 M D 49
search_clear: W I Z I I 1 I D -1 N D Z J search_clear
search_edge: E K Z M A Z E K Z O S P
 C S search_digit N A Z O S P M G E C S search_digit N A Z O S P M H E
 ifge G L J app_bad end ifge H L J app_bad end
 M I G P I 7 A I H A I 3000 W I 1
 ${undirected ? 'M I H P I 7 A I G A I 3000 W I 1' : ''}
 J search_edge
search_digit: E K Z J app_bad R E J ifl E 48 J app_bad end ifg E 57 J app_bad end
 S E 48 I J 1 I K -1 M A Z O S P
app_bad: M A -1 O S P`;
const output = `search_pad: R E 2620 ifge E 27 M A Z O S P end M A 32 C S app_put J search_pad
${SAMPLE_OUTPUT}`;

export const GRAPH_SEARCH: TextSoftware[] = [
  {
    number: 337, kind: 'text', id: 'hamilton-paths', site: 'footpath', title: 'Every Vertex Once',
    description: 'Count directed paths visiting every vertex exactly once, and show the lexicographically first path. Enter n| followed by from/to digit pairs: n=1..7, vertices 0..n-1, at most 26 pairs. Example 3|011220 gives three paths. A path may start anywhere; reverse paths count separately when their directed links exist. Repeated links count once, self-links do not help, and an isolated one-vertex graph has one path. Exhaustive native search; this is about visiting vertices, unlike Euler Route, which visits edges.',
    inputs: ['n|uvuv...'], outputs: ['Count / first path'],
    algorithm: `app_compute: C S search_parse N A Z O S P
 M I 3140 M E 7
hp_clear: W I Z I I 1 I E -1 N E Z J hp_clear
 M H Z M K Z W 3100 -1
; Each depth owns its next candidate; accepted ancestors alone are marked used.
hp_try: M I 3100 A I H R G I I G 1 W I G ifge G L J hp_back end
 M I 3140 A I G R E I ifn E Z J hp_try end
 ifg H Z M I 3100 A I H I I -1 R E I P E 7 A E G A E 3000 R E E ife E Z J hp_try end end
 M E L I E -1 ife H E I K 1 ife K 1 M J Z
hp_copy: M I 3100 A I J R E I M I 3120 A I J W I E I J 1 ifl J L J hp_copy end
 end J hp_try end
 M I 3140 A I G W I 1 I H 1 M I 3100 A I H W I -1 J hp_try
hp_back: I H -1 ifl H Z J hp_output end
 M I 3100 A I H R G I M I 3140 A I G W I Z J hp_try
hp_output: M A @hp_count C S stats_label M F K C S stats_int C S search_pad
 ife K Z M A @hp_none J stats_label end M A @hp_first C S stats_label M J Z
hp_print: M I 3120 A I J R A I A A 48 C S app_put I J 1 ifl J L J hp_print end M A Z O S P
hp_count: ${ascii('paths=')}
hp_first: ${ascii('first: ')}
hp_none: ${ascii('first: NONE')}
${parse(false)}
${output}`,
    examples: [
      { input: '3|011220', output: 'paths=3'.padEnd(27) + 'first: 012' },
      { input: '4|011223', output: 'paths=1'.padEnd(27) + 'first: 0123' },
      { input: '3|0110', output: 'paths=0'.padEnd(27) + 'first: NONE' },
      { input: '1|', output: 'paths=1'.padEnd(27) + 'first: 0' },
      { input: '3|03', error: true },
    ],
  },
  {
    number: 338, kind: 'text', id: 'vertex-cover', site: 'relay', title: 'Minimum Watch Posts',
    description: 'Place the fewest watch posts so every undirected link touches a watched vertex. Enter n| then endpoint digit pairs, with n=1..7, vertices 0..n-1 and at most 26 pairs. Example 4|011223 chooses vertices 0 and 2. Native exhaustive subset search proves the minimum; ties choose the lexicographically smallest sorted vertex list. Repeated links count once. A self-link forces its own vertex into the cover. Isolated vertices need no post. An empty graph reports size zero and NONE.',
    inputs: ['n|uvuv...'], outputs: ['Minimum / vertices'],
    algorithm: `app_compute: C S search_parse N A Z O S P M I 3100 M E 7
vc_clear: W I Z I I 1 I E -1 N E Z J vc_clear
 M K L I K 1
vc_subset: M H Z M J Z
vc_size: M I 3100 A I J R E I A H E I J 1 ifl J L J vc_size end
 ifg H K J vc_next end
 M G Z
vc_row: M I 3100 A I G R E I ifn E Z J vc_row_next end M J Z
vc_edge: M I G P I 7 A I J A I 3000 R E I ifn E Z M I 3100 A I J R E I ife E Z J vc_next end end
 I J 1 ifl J L J vc_edge end
vc_row_next: I G 1 ifl G L J vc_row end
 ifl H K J vc_save end
; For equal cardinalities, including the first differing vertex is lexicographically earlier.
 M J Z
vc_tie: M I 3100 A I J R E I M I 3120 A I J R F I ifg E F J vc_save end ifl E F J vc_next end I J 1 ifl J L J vc_tie end J vc_next
vc_save: M K H M J Z
vc_copy: M I 3100 A I J R E I M I 3120 A I J W I E I J 1 ifl J L J vc_copy end
vc_next: M J Z
vc_carry: M I 3100 A I J R E I ife E Z W I 1 J vc_subset end W I Z I J 1 ifl J L J vc_carry end
 M A @vc_size_label C S stats_label M F K C S stats_int C S search_pad M A @vc_vertices C S stats_label
 ife K Z M A @vc_none J stats_label end M J Z M H Z
vc_print: M I 3120 A I J R E I ifn E Z ifn H Z M A 32 C S app_put end M A J A A 48 C S app_put M H 1 end I J 1 ifl J L J vc_print end M A Z O S P
vc_size_label: ${ascii('minimum=')}
vc_vertices: ${ascii('vertices: ')}
vc_none: ${ascii('NONE')}
${parse(true)}
${output}`,
    examples: [
      { input: '4|011223', output: 'minimum=2'.padEnd(27) + 'vertices: 0 2' },
      { input: '3|011220', output: 'minimum=2'.padEnd(27) + 'vertices: 0 1' },
      { input: '2|11', output: 'minimum=1'.padEnd(27) + 'vertices: 1' },
      { input: '7|', output: 'minimum=0'.padEnd(27) + 'vertices: NONE' },
      { input: '2|02', error: true },
    ],
  },
  {
    number: 339, kind: 'text', id: 'graph-twins', site: 'masks', title: 'Graph Twins',
    description: 'Determine whether two undirected graphs are the same after relabeling vertices. Enter n|edgesA|edgesB, n=1..6, each edge a pair of vertex digits 0..n-1. Example 3|0112|0212 maps 0>0 1>2 2>1. Isolated vertices and self-links are included; repeated links collapse. Reports the lexicographically first mapping from graph A to graph B, or NO ISOMORPHISM. Checks adjacency exactly, rather than relying on matching degree counts. The whole input must fit 54 characters.',
    inputs: ['n|edgesA|edgesB'], outputs: ['Verdict / mapping'],
    algorithm: `app_compute: M J 2552 R K 2610 C S twins_digit N A Z O S P M L E
 ifl L 1 J app_bad end ifg L 6 J app_bad end
 E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1
 M I 3000 M D 49
 tw_clear_a: W I Z I I 1 I D -1 N D Z J tw_clear_a
 M I 3050 M D 49
 tw_clear_b: W I Z I I 1 I D -1 N D Z J tw_clear_b
 M B 3000
 tw_parse: ife K Z ife B 3000 J app_bad end J tw_start end
 R E J ife E 124 ifn B 3000 J app_bad end M B 3050 I J 1 I K -1 J tw_parse end
 C S twins_digit N A Z O S P M G E C S twins_digit N A Z O S P M H E
 ifge G L J app_bad end ifge H L J app_bad end
 M I G P I 7 A I H A I B W I 1 M I H P I 7 A I G A I B W I 1 J tw_parse
 tw_start: M I 3140 M E 6
 tw_clear_used: W I Z I I 1 I E -1 N E Z J tw_clear_used
 M H Z W 3100 -1
 tw_try: M I 3100 A I H R G I I G 1 W I G ifge G L J tw_back end
 M I 3140 A I G R E I ifn E Z J tw_try end
 ; Check the self-link and all already-mapped neighbors.
 M J Z
 tw_check: M I H P I 7 A I J A I 3000 R E I
 M I 3100 A I J R F I M I G P I 7 A I F A I 3050 R F I ifn E F J tw_try end
 I J 1 ifle J H J tw_check end
 M E L I E -1 ife H E J tw_output end
 M I 3140 A I G W I 1 I H 1 M I 3100 A I H W I -1 J tw_try
 tw_back: I H -1 ifl H Z M A @tw_no J stats_label end
 M I 3100 A I H R G I M I 3140 A I G W I Z J tw_try
 tw_output: M A @tw_yes C S stats_label C S search_pad M J Z
 tw_print: ifn J Z M A 32 C S app_put end M A J A A 48 C S app_put M A 62 C S app_put M I 3100 A I J R A I A A 48 C S app_put I J 1 ifl J L J tw_print end M A Z O S P
 twins_digit: E K Z J app_bad R E J ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 I J 1 I K -1 M A Z O S P
 app_bad: M A -1 O S P
 tw_yes: ${ascii('ISOMORPHIC')}
 tw_no: ${ascii('NO ISOMORPHISM')}
 ${output}`,
    examples: [
      {input:'3|0112|0212', output:'ISOMORPHIC'.padEnd(27)+'0>0 1>2 2>1'},
      {input:'4|01122330|011223', output:'NO ISOMORPHISM'},
      {input:'2|00|11', output:'ISOMORPHIC'.padEnd(27)+'0>1 1>0'},
      {input:'1||', output:'ISOMORPHIC'.padEnd(27)+'0>0'},
      {input:'7||', error:true},
    ],
  },
];
