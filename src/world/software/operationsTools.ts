import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const common=`op_digit: E K Z J app_bad R E J ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 I J 1 I K -1 M A Z O S P
app_bad: M A -1 O S P
${SAMPLE_OUTPUT}`;
const graph=(mst:boolean)=>`op_graph: R K 2610 M J 2552 C S op_digit N A Z O S P M L E ifl L 2 J app_bad end ifg L 8 J app_bad end E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1 M I 3000 M D 64
op_clear: W I ${mst?'-1':'Z'} I I 1 I D -1 N D Z J op_clear M D Z
op_edges: E K Z M A Z E K Z O S P ifge D 16 J app_bad end C S op_digit N A Z O S P M G E C S op_digit N A Z O S P M H E C S op_digit N A Z O S P ifge G L J app_bad end ifge H L J app_bad end ife G H J app_bad end M I G P I 8 A I H A I 3000
${mst?`R F I ifl F Z W I E else ifl E F W I E end end M I H P I 8 A I G A I 3000 R F I ifl F Z W I E else ifl E F W I E end end`:`R F I A F E W I F`}
I D 1 J op_edges`;
export const OPERATIONS_TOOLS:TextSoftware[]=[
{number:233,kind:'text',id:'residual-flow',site:'relay',title:'Residual Flow',description:'Find maximum directed flow from vertex 0 to vertex n-1, and the source side of a minimum cut. Enter n| followed by up to 16 uvc triples: from, to, capacity. Use 2..8 vertices numbered from zero and capacities 0..9. No spaces or self-links. Parallel capacities add; reverse links are allowed. Example 4|013023123133233 has flow 6.',inputs:['n|uvcuvc...'],outputs:['Flow / cut'],algorithm:`app_compute: C S op_graph N A Z O S P W 3200 Z
flow_search: M J Z
flow_init: M I 3100 A I J W I -1 I J 1 ifl J L J flow_init end W 3100 -2 W 3120 Z M G Z M H 1
flow_queue: ifge G H J flow_cut end M I 3120 A I G R J I I G 1 M K Z
flow_neighbor: M I 3100 A I K R E I ifge E Z J flow_next end ife K Z J flow_next end M I J P I 8 A I K A I 3000 R E I ifle E Z J flow_next end M I 3100 A I K W I J M I 3120 A I H W I K I H 1 M E L I E -1 ife K E J flow_augment end
flow_next: I K 1 ifl K L J flow_neighbor end J flow_queue
flow_augment: M J L I J -1 M H 999
flow_trace: M I 3100 A I J R K I M I K P I 8 A I J A I 3000 R E I ifl E H M H E end M J K N J Z J flow_trace R E 3200 A E H W 3200 E M J L I J -1
flow_update: M I 3100 A I J R K I M I K P I 8 A I J A I 3000 R E I S E H W I E M I J P I 8 A I K A I 3000 R E I A E H W I E M J K N J Z J flow_update J flow_search
flow_cut: M A @flow_label C S stats_label R F 3200 C S stats_int M A @cut_label C S stats_label M J Z M H Z
flow_print: M I 3100 A I J R E I ifn E -1 ifn H Z M A 44 C S app_put end M F J C S stats_int M H 1 end I J 1 ifl J L J flow_print end M A Z O S P
flow_label: ${ascii('flow=')}
cut_label: ${ascii(' cut=')}
${graph(false)}
${common}`,examples:[{input:'4|013023123133233',output:'flow=6 cut=0'},{input:'2|',output:'flow=0 cut=0'},{input:'2|019019',output:'flow=18 cut=0'},{input:'2|001',error:true}]},
{number:234,kind:'text',id:'spanning-tree',site:'toolshed',title:'Spanning Tree Planner',description:'Connect every vertex at minimum total cost. Enter n| then up to 16 uvc triples: two endpoints and cost. Vertices 0..n-1, n=2..8, costs 0..9; no spaces or self-links. Links are undirected; duplicate links retain the cheapest cost. Prints cost and parent-child tree edges rooted at 0, or DISCONNECTED. Ties prefer smaller vertices and parents.',inputs:['n|uvcuvc...'],outputs:['Cost / tree'],algorithm:`app_compute: C S op_graph N A Z O S P M J Z
mst_init: M I 3100 A I J W I 100 M I 3120 A I J W I Z M I 3140 A I J W I -1 I J 1 ifl J L J mst_init end W 3100 Z W 3200 Z M K Z
mst_step: M G -1 M H 100 M J Z
mst_find: M I 3120 A I J R E I ife E Z M I 3100 A I J R E I ifl E H M H E M G J end end I J 1 ifl J L J mst_find end ifl G Z M A @mst_dis J stats_label end M I 3120 A I G W I 1 R E 3200 A E H W 3200 E M J Z
mst_relax: M I 3120 A I J R E I ifn E Z J mst_next end M I G P I 8 A I J A I 3000 R E I ifl E Z J mst_next end M I 3100 A I J R F I ifg E F J mst_next end ife E F M I 3140 A I J R F I ifge G F J mst_next end end M I 3100 A I J W I E M I 3140 A I J W I G
mst_next: I J 1 ifl J L J mst_relax end I K 1 ifl K L J mst_step end M A @mst_cost C S stats_label R F 3200 C S stats_int M A @mst_edges C S stats_label M J 1
mst_print: ifg J 1 M A 44 C S app_put end M I 3140 A I J R F I C S stats_int M A 45 C S app_put M F J C S stats_int I J 1 ifl J L J mst_print end M A Z O S P
mst_dis: ${ascii('DISCONNECTED')}
mst_cost: ${ascii('cost=')}
mst_edges: ${ascii(' edges=')}
${graph(true)}
${common}`,examples:[{input:'3|019025125',output:'cost=10 edges=2-1,0-2'},{input:'3|010120',output:'cost=0 edges=0-1,1-2'},{input:'2|',output:'DISCONNECTED'}]},
{number:235,kind:'text',id:'cargo-knapsack',site:'depot',title:'Cargo Knapsack',description:'Choose whole items for maximum value within a weight limit. Enter CC| followed by 1..8 WWVV blocks: two-digit capacity 00..99, item weight 01..99, and value 00..99. No spaces. Each item is available once. Prints value, weight and 1-based chosen items; ties prefer the smallest binary item mask. Example 10|060905080508 chooses items 2,3, beating greedy value selection.',inputs:['CC|WWVV...'],outputs:['Value / items'],algorithm:`app_compute: R K 2610 M J 2552 C S op_pair N A Z O S P W 3200 E E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1 M L Z
bag_parse: E K Z J bag_parsed ifge L 8 J app_bad end C S op_pair N A Z O S P ife E Z J app_bad end M I 2900 A I L W I E C S op_pair N A Z O S P M I 2920 A I L W I E I L 1 J bag_parse
bag_parsed: E L Z J app_bad W 3201 L M J Z
bag_clear: M I 3000 A I J W I Z M I 3100 A I J W I Z I J 1 ifl J 100 J bag_clear end M J Z M H 1
bag_item: M I 2900 A I J R G I M I 2920 A I J R K I R L 3200
bag_capacity: ifl L G J bag_next end M I 3000 A I L S I G R E I A E K M I 3100 A I L S I G R F I A F H M I 3000 A I L R D I ifl E D J bag_skip end ife E D M I 3100 A I L R D I ifge F D J bag_skip end end M I 3000 A I L W I E M I 3100 A I L W I F
bag_skip: I L -1 J bag_capacity
bag_next: I J 1 P H 2 R E 3201 ifl J E J bag_item end M A @bag_value C S stats_label R I 3200 A I 3000 R F I C S stats_int M A 27 C S bag_pad R I 3200 A I 3100 R H I W 3202 H M J Z M G Z
bag_weight: M A H M B 2 C S app_div M H A ifn C Z M I 2900 A I J R E I A G E end I J 1 R E 3201 ifl J E J bag_weight end M A @bag_weight_label C S stats_label M F G C S stats_int M A 54 C S bag_pad M A @bag_items C S stats_label R H 3202 ife H Z M A @bag_none J stats_label end M J 1 M G Z
bag_print: M A H M B 2 C S app_div M H A ifn C Z ifn G Z M A 44 C S app_put end M F J C S stats_int M G 1 end I J 1 N H Z J bag_print M A Z O S P
bag_pad: M B A
bag_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J bag_pad_next
op_pair: C S op_digit N A Z O S P M F E P F 10 C S op_digit N A Z O S P A E F O S P
bag_value: ${ascii('value=')}
bag_weight_label: ${ascii('weight=')}
bag_items: ${ascii('items=')}
bag_none: ${ascii('NONE')}
${common}`,examples:[{input:'10|060905080508',output:'value=16'.padEnd(27)+'weight=10'.padEnd(27)+'items=2,3'},{input:'00|0109',output:'value=0'.padEnd(27)+'weight=0'.padEnd(27)+'items=NONE'},{input:'10|0001',error:true}]},
{number:236,kind:'text',id:'stable-pairing',site:'cardtable',title:'Stable Pairing',description:'Find a proposer-optimal stable pairing of two equally sized groups. Enter n| then 2*n preference rows joined without spaces, each a permutation of digits 0..n-1; n=1..5. First come all proposer rows, then receiver rows. First digits are most preferred. Results pair proposer-receiver. For two people per group, 2|01100110 gives 0-0,1-1.',inputs:['n|rank rows'],outputs:['Stable pairs'],algorithm:`app_compute: R K 2610 M J 2552 C S op_digit N A Z O S P M L E ifl L 1 J app_bad end ifg L 5 J app_bad end E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1 M G Z
pair_row: M I 3160 M D 5
pair_clear: W I Z I I 1 I D -1 N D Z J pair_clear M H Z
pair_read: C S op_digit N A Z O S P ifge E L J app_bad end M I 3160 A I E R D I ifn D Z J app_bad end W I 1 ifl G L M I G P I L A I H A I 2900 W I E else M I G S I L P I L A I E A I 3000 W I H end I H 1 ifl H L J pair_read end I G 1 M E L P E 2 ifl G E J pair_row end N K Z J app_bad M J Z
pair_init: M I 3100 A I J W I -1 M I 3120 A I J W I -1 M I 3140 A I J W I Z I J 1 ifl J L J pair_init end W 3200 Z
pair_search: M G Z
pair_free: M I 3100 A I G R E I ifl E Z J pair_propose end I G 1 ifl G L J pair_free end J pair_output
pair_propose: R E 3200 I E 1 W 3200 E M I 3140 A I G R H I ifge H L J app_bad end I H 1 W I H I H -1 M I G P I L A I H A I 2900 R H I M I 3120 A I H R K I ifl K Z J pair_accept end M I H P I L A I G A I 3000 R E I M I H P I L A I K A I 3000 R F I ifge E F J pair_search end M I 3100 A I K W I -1
pair_accept: M I 3100 A I G W I H M I 3120 A I H W I G J pair_search
pair_output: M A @pair_label C S stats_label M J Z
pair_print: ifn J Z M A 44 C S app_put end M F J C S stats_int M A 45 C S app_put M I 3100 A I J R F I C S stats_int I J 1 ifl J L J pair_print end M A Z O S P
pair_label: ${ascii('pairs=')}
${common}`,examples:[{input:'2|01100110',output:'pairs=0-0,1-1'},{input:'1|00',output:'pairs=0-0'},{input:'2|00100110',error:true}]},
];
