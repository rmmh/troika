import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
// Up to nine vertices, four directed edges. Matrix at 3100..3180.
const parse=`graph_parse: C S stats_parse N A Z O S P R E 3000 ifn E 1 ifn E 3 ifn E 5 ifn E 7 ifn E 9 J app_bad end end end end end
 R L 2900 ifl L 1 J app_bad end ifg L 9 J app_bad end M I 3100 M E 81
graph_clear: W I Z I I 1 I E -1 N E Z J graph_clear M J 1
graph_edge: R E 3000 ifge J E M A Z O S P end M I 2900 A I J R G I M H I/1 ifl G Z J app_bad end ifge G L J app_bad end ifl H Z J app_bad end ifge H L J app_bad end M I G P I 9 A I H A I 3100 W I 1 I J 2 J graph_edge`;
const helpers=`${parse}\n${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
export const GRAPH_SOFTWARE:TextSoftware[] = [
  {
    number:136,kind:'text',id:'graph-hops',site:'relay',title:'Directed network hop counts',
    description:'Enter a vertex count (1..9), then up to four directed from/to edge pairs. Vertices are numbered from zero. Reports shortest hop counts from vertex zero in vertex order; -1 means unreachable. Duplicate edges and self-links are allowed. All edges have unit cost. Native relaxation computes routes without accessing the world network.',
    inputs:['n from to ...'],outputs:['Hops from zero'],
    algorithm:`app_compute: C S graph_parse N A Z O S P M J Z
hops_init: M I 3200 A I J W I -1 I J 1 ifl J L J hops_init end W 3200 Z M K L
hops_pass: M G Z
hops_from: M I 3200 A I G R H I ifl H Z J hops_next end I H 1 M J Z
hops_to: M I G P I 9 A I J A I 3100 R E I ifn E Z M I 3200 A I J R E I ifl E Z W I H else ifg E H W I H end end end I J 1 ifl J L J hops_to end
hops_next: I G 1 ifl G L J hops_from end I K -1 N K Z J hops_pass M J Z
hops_print: ifn J Z M A 32 C S app_put end M I 3200 A I J R F I C S stats_int I J 1 ifl J L J hops_print end M A Z O S P
${helpers}`,
    examples:[{input:'5 0 2 2 1 1 3',output:'0 2 1 3 -1'},{input:'3 0 1 1 0 1 2',output:'0 1 2'},{input:'1',output:'0'},{input:'3 0 3',error:true}],
  },
  {
    number:137,kind:'text',id:'dependency-order',site:'toolshed',title:'Dependency order planner',
    description:'Enter a task count (1..9), then up to four prerequisite/dependent pairs using zero-based task numbers. Prints a valid execution order, choosing the smallest available task at each step. Duplicate dependencies count once. Self-dependencies or other cycles print CYCLE instead of a partial order. Tasks without dependencies are included.',
    inputs:['n before after'],outputs:['Task order'],
    algorithm:`app_compute: C S graph_parse N A Z O S P M J Z
topo_init: M I 3200 A I J W I Z M G Z M H Z
topo_degree: M I G P I 9 A I J A I 3100 R E I A H E I G 1 ifl G L J topo_degree end M I 3210 A I J W I H I J 1 ifl J L J topo_init end M K Z
topo_step: M J Z
topo_find: ifge J L W 2620 Z M A 67 C S app_put M A 89 C S app_put M A 67 C S app_put M A 76 C S app_put M A 69 J app_put end M I 3200 A I J R E I ifn E Z J topo_skip end M I 3210 A I J R E I E E Z J topo_choose
topo_skip: I J 1 J topo_find
topo_choose: M I 3200 A I J W I 1 ifn K Z M A 32 C S app_put end M F J C S stats_int M G Z
topo_remove: M I J P I 9 A I G A I 3100 R E I ifn E Z M I 3210 A I G R E I I E -1 W I E end I G 1 ifl G L J topo_remove end I K 1 ifl K L J topo_step end M A Z O S P
${helpers}`,
    examples:[{input:'5 3 0 0 2 1 2',output:'1 3 0 2 4'},{input:'3 0 1 1 0',output:'CYCLE'},{input:'3 0 1 0 1',output:'0 1 2'},{input:'1',output:'0'},{input:'0',error:true}],
  },
];
