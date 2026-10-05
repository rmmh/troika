import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const helpers=`gs_digit: E K Z J app_bad R E J ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 I J 1 I K -1 M A Z O S P
app_bad: M A -1 O S P
gs_pad: M B A
gs_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J gs_pad_next
${SAMPLE_OUTPUT}`;
const parse=(undirected:boolean)=>`gs_parse: R K 2610 M J 2552 C S gs_digit N A Z O S P M L E ifl L 1 J app_bad end ifg L 7 J app_bad end W 3200 L E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1 M I 3000 M D 49
gs_clear: W I Z I I 1 I D -1 N D Z J gs_clear W 3201 Z M D Z
gs_edge: E K Z M A Z E K Z O S P ifge D 26 J app_bad end C S gs_digit N A Z O S P M G E C S gs_digit N A Z O S P M H E ifge G L J app_bad end ifge H L J app_bad end M I D P I 2 A I 2900 W I G M I/1 H M I G P I 7 A I H A I 3000 R E I I E 1 W I E
${undirected?'M I H P I 7 A I G A I 3000 R E I I E 1 W I E':''}
I D 1 W 3201 D J gs_edge`;
export const GRAPH_STRUCTURE:TextSoftware[]=[
{number:245,kind:'text',id:'scc-groups',site:'relay',title:'Strong Components',description:'Group directed vertices that can all reach one another. Enter n| followed by up to 26 from/to digit pairs, with n=1..7 and vertices 0..n-1. No spaces. Self-links and repeated edges are allowed. Reports the number of strongly connected components and one label per vertex in numeric order. A label is the smallest vertex in its group; isolated vertices get their own label.',inputs:['n|uvuv...'],outputs:['Groups / labels'],algorithm:`app_compute: C S gs_parse N A Z O S P M J Z
scc_copy: M I 3000 A I J R E I M I 3100 A I J W I E I J 1 ifl J 49 J scc_copy end M J Z
scc_self: M I J P I 8 A I 3100 W I 1 I J 1 ifl J L J scc_self end M G Z
scc_k: M H Z
scc_i: M J Z
scc_j: M I H P I 7 A I G A I 3100 R E I ifn E Z M I G P I 7 A I J A I 3100 R E I ifn E Z M I H P I 7 A I J A I 3100 W I 1 end end I J 1 ifl J L J scc_j end I H 1 ifl H L J scc_i end I G 1 ifl G L J scc_k end M G Z M H Z
scc_vertex: M J Z
scc_label: M I G P I 7 A I J A I 3100 R E I ifn E Z M I J P I 7 A I G A I 3100 R E I ifn E Z J scc_save end end I J 1 J scc_label
scc_save: M I 3210 A I G W I J ife J G I H 1 end I G 1 ifl G L J scc_vertex end M A @scc_count C S stats_label M F H C S stats_int M A 27 C S gs_pad M A @scc_labels C S stats_label M J Z
scc_print: ifn J Z M A 32 C S app_put end M I 3210 A I J R F I C S stats_int I J 1 ifl J L J scc_print end M A Z O S P
scc_count: ${ascii('components=')}
scc_labels: ${ascii('labels: ')}
${parse(false)}
${helpers}`,examples:[{input:'5|0110122332',output:'components=3'.padEnd(27)+'labels: 0 0 2 2 4'},{input:'1|',output:'components=1'.padEnd(27)+'labels: 0'},{input:'2|02',error:true}]},
{number:246,kind:'text',id:'euler-route',site:'tram',title:'Euler Route',description:'Find a directed walk using every edge exactly once. Enter n| then up to 26 from/to digit pairs; n=1..7, vertices 0..n-1. Self-links and repeated edges each count. Ignores isolated vertices. Reports NO TRAIL for incompatible degrees or disconnected edge groups. Otherwise the second row is the trail, one vertex digit per step. Uses the required start of an open trail, or the smallest vertex with outgoing edges for a circuit; prints the lexicographically smallest trail for that start. An empty graph gives trail 0.',inputs:['n|uvuv...'],outputs:['Edges / trail'],algorithm:`app_compute: C S gs_parse N A Z O S P M G Z M H -1 M K Z M J Z
 eu_vertex: M D Z M F Z M E Z W 3202 Z
 eu_degree: M I G P I 7 A I J A I 3000 R E I A D E A F E M I J P I 7 A I G A I 3000 R E I S D E I J 1 ifl J L J eu_degree end ifn F Z ifl H Z M H G end end ifg D 1 J eu_bad_degree end ifl D -1 J eu_bad_degree end ife D 1 ifn K Z J eu_bad_degree end M K 1 W 3202 G end M I 3100 A I G W I D I G 1 M J Z ifl G L J eu_vertex end
; The positive-degree vertex is recovered after validating every degree.
M J Z M K Z
 eu_start: M I 3100 A I J R E I ife E 1 M H J end ife E -1 I K 1 end I J 1 ifl J L J eu_start end ifg K 1 J eu_bad_degree end ifl H Z M H Z end W 3300 H M G 1 M H Z
 eu_walk: E G Z J eu_done M I 3300 A I G I I -1 R J I M K Z
 eu_neighbor: M I J P I 7 A I K A I 3000 R E I ifg E Z I E -1 W I E M I 3300 A I G W I K I G 1 J eu_walk end I K 1 ifl K L J eu_neighbor end M I 3400 A I H W I J I H 1 I G -1 J eu_walk
 eu_done: R E 3201 I E 1 ifn H E M A @eu_dis J stats_label end M A @eu_edges C S stats_label R F 3201 C S stats_int M A 27 C S gs_pad
 eu_print: I H -1 M I 3400 A I H R A I A A 48 C S app_put N H Z J eu_print M A Z O S P
 eu_bad_degree: M A @eu_degree_bad J stats_label
 eu_edges: ${ascii('edges=')}
 eu_degree_bad: ${ascii('NO TRAIL: degrees')}
 eu_dis: ${ascii('NO TRAIL: disconnected')}
${parse(false)}
${helpers}`,examples:[{input:'3|01100220',output:'edges=4'.padEnd(27)+'01020'},{input:'3|0102',output:'NO TRAIL: degrees'},{input:'4|01102332',output:'NO TRAIL: disconnected'},{input:'1|',output:'edges=0'.padEnd(27)+'0'}]},
{number:247,kind:'text',id:'exact-coloring',site:'hexclub',title:'Exact Graph Coloring',description:'Find the fewest colors needed so linked vertices differ. Enter n| followed by up to 26 undirected endpoint pairs; n=1..7 and vertex digits 0..n-1. Repeated edges count once. A self-link reports NO COLORING. Results give the minimum color count and colors for vertices in order. Colors start at zero; equivalent renamings use the smallest available label first. Among minimum solutions, prints the lexicographically smallest sequence.',inputs:['n|uvuv...'],outputs:['Minimum / colors'],algorithm:`app_compute: C S gs_parse N A Z O S P M J Z
col_self: M I J P I 8 A I 3000 R E I ifn E Z M A @col_impossible J stats_label end I J 1 ifl J L J col_self end M H L I H 1 M J Z W 3100 -1
col_try: M I 3100 A I J R G I I G 1 W I G M K -1 ifg J Z M I 3140 A I J I I -1 R K I end M E K I E 1 M F H I F -2 ifg E F M E F end ifg G E J col_back end M D Z
col_check: ifge D J J col_accept end M I J P I 7 A I D A I 3000 R E I ifn E Z M I 3100 A I D R E I ife E G J col_try end end I D 1 J col_check
col_accept: ifg G K M K G end M I 3140 A I J W I K M E L I E -1 ife J E M E K I E 1 ifge E H J col_try end M H E M D Z
col_copy: M I 3100 A I D R E I M I 3120 A I D W I E I D 1 ifl D L J col_copy end ife H 1 J col_output end J col_try end I J 1 M I 3100 A I J W I -1 J col_try
col_back: I J -1 ifge J Z J col_try end
col_output: M A @col_count C S stats_label M F H C S stats_int M A 27 C S gs_pad M A @col_labels C S stats_label M J Z
col_print: ifn J Z M A 32 C S app_put end M I 3120 A I J R F I C S stats_int I J 1 ifl J L J col_print end M A Z O S P
col_count: ${ascii('colors=')}
col_labels: ${ascii('by vertex: ')}
col_impossible: ${ascii('NO COLORING: self-link')}
${parse(true)}
${helpers}`,examples:[{input:'3|011220',output:'colors=3'.padEnd(27)+'by vertex: 0 1 2'},{input:'4|01122330',output:'colors=2'.padEnd(27)+'by vertex: 0 1 0 1'},{input:'1|00',output:'NO COLORING: self-link'}]},
{number:248,kind:'text',id:'fragile-links',site:'footpath',title:'Fragile Links',description:'Find bridges and cut vertices in an undirected network. Enter n| then up to 26 endpoint digit pairs; n=1..7, vertices 0..n-1. A bridge is an individual edge whose loss adds a connected component; a cut vertex does the same when removed with all its edges. Parallel links protect one another and self-links are never bridges. Disconnected graphs and isolated vertices are supported. Bridge pairs and cut vertices appear in ascending order; NONE means no such weakness.',inputs:['n|uvuv...'],outputs:['Bridges / cuts'],algorithm:`app_compute: C S gs_parse N A Z O S P W 3204 -1 C S cut_count W 3202 A W 3205 Z W 3208 Z
cut_edge: R A 3205 M B 7 C S app_div W 3206 A W 3207 C ifge A L J cut_vertices end ifge A C J cut_edge_next end ifge C L J cut_edge_next end R I 3205 A I 3000 R E I ifn E 1 J cut_edge_next end W I Z R G 3206 R H 3207 M I H P I 7 A I G A I 3000 W I Z C S cut_count R E 3202 ifg A E R I 3208 P I 2 A I 3300 R G 3206 R H 3207 W I G M I/1 H R E 3208 I E 1 W 3208 E end R G 3206 R H 3207 M I G P I 7 A I H A I 3000 W I 1 M I H P I 7 A I G A I 3000 W I 1
cut_edge_next: R E 3205 I E 1 W 3205 E J cut_edge
cut_vertices: W 3205 Z
cut_vertex: R E 3205 W 3204 E C S cut_count R E 3202 M F Z ifg A E M F 1 end R I 3205 A I 3320 W I F R E 3205 I E 1 W 3205 E ifl E L J cut_vertex end M A @cut_bridge_label C S stats_label R K 3208 ife K Z M A @cut_none C S stats_label else M J Z
cut_bridge_print: ifn J Z M A 32 C S app_put end M I J P I 2 A I 3300 R A I A A 48 C S app_put M A I/1 A A 48 C S app_put I J 1 ifl J K J cut_bridge_print end end M A 27 C S gs_pad M A @cut_vertex_label C S stats_label M J Z M H Z
cut_vertex_print: M I 3320 A I J R E I ifn E Z ifn H Z M A 32 C S app_put end M A J A A 48 C S app_put M H 1 end I J 1 ifl J L J cut_vertex_print end ife H Z M A @cut_none J stats_label end M A Z O S P
; Count connected components after excluding vertex3204, including isolates.
cut_count: M I 3100 M E 7
cut_clear: W I Z I I 1 I E -1 N E Z J cut_clear M G Z M K Z
cut_seed: R E 3204 ife G E J cut_seed_next end M I 3100 A I G R E I ifn E Z J cut_seed_next end I K 1 W I 1 W 3120 G M H Z M J 1
cut_queue: ifge H J J cut_seed_next end M I 3120 A I H R D I I H 1 M F Z
cut_neighbor: R E 3204 ife F E J cut_neighbor_next end M I 3100 A I F R E I ifn E Z J cut_neighbor_next end M I D P I 7 A I F A I 3000 R E I ife E Z J cut_neighbor_next end M I 3100 A I F W I 1 M I 3120 A I J W I F I J 1
cut_neighbor_next: I F 1 ifl F L J cut_neighbor end J cut_queue
cut_seed_next: I G 1 ifl G L J cut_seed end M A K O S P
cut_bridge_label: ${ascii('bridges: ')}
cut_vertex_label: ${ascii('cut vertices: ')}
cut_none: ${ascii('NONE')}
${parse(true)}
${helpers}`,examples:[{input:'4|01011223',output:'bridges: 12 23'.padEnd(27)+'cut vertices: 1 2'},{input:'3|011220',output:'bridges: NONE'.padEnd(27)+'cut vertices: NONE'},{input:'1|00',output:'bridges: NONE'.padEnd(27)+'cut vertices: NONE'}]},
];
