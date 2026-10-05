import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
export const ROUTE_INSPECTOR:TextSoftware={
 number:340,kind:'text',id:'route-inspector',site:'tram',title:'Route Inspector',inputs:['n|uvuv...'],outputs:['Cheapest closed inspection'],
 description:'Find the fewest repeated edges needed for a closed walk inspecting every edge. Enter n| followed by up to 26 undirected endpoint pairs; n=1..6, vertices 0..n-1. Each edge costs 1; loops and parallel edges count separately. Example 4|011223 repeats path 0-1-2-3, adding 3 traversals. Isolated vertices are ignored; disconnected edge-bearing components are impossible. Native shortest paths and exhaustive odd-vertex pairings find the optimum. Ties use the lexicographically first sorted pairing, then the lexicographically first shortest path for each pair. Add the printed repeat paths to make an Euler circuit possible; total includes original edges.',
 examples:[{input:'4|011223',output:row('extra=3 total=6')+row('repeat 0-1-2-3')+'Closed tour is now possible'},{input:'2|0101',output:row('extra=0 total=2')+row('No repeated paths needed')+'Closed tour is now possible'},{input:'4|0123',output:'IMPOSSIBLE: separate edges'},{input:'1|',output:row('extra=0 total=0')+row('No repeated paths needed')+'Closed tour is now possible'}],
 algorithm:`app_compute: M I 3500 M K 36
ri_distance_clear: W I 99 I I 1 I K -1 N K Z J ri_distance_clear M I 3040 M K 46 K I K M I 3200 M K 6 K I K
 R K 2610 ifl K 2 J ri_bad end R L 2552 S L 48 ifl L 1 J ri_bad end ifg L 6 J ri_bad end W 3400 L R E 2553 ifn E 124 J ri_bad end M I 2554 I K -2 W 3401 Z M G Z
ri_diagonal: M J G P J 7 A J 3500 W J Z I G 1 ifl G L J ri_diagonal end
ri_edge: ife K Z J ri_floyd end ifl K 2 J ri_bad end R G I S G 48 M H I/1 S H 48 ifl G Z J ri_bad end ifge G L J ri_bad end ifl H Z J ri_bad end ifge H L J ri_bad end
 M J 3080 A J G R E J I E 1 W J E M J 3080 A J H R E J I E 1 W J E
 M J G P J 6 A J H A J 3040 W J 1 M J H P J 6 A J G A J 3040 W J 1
 ifn G H M J G P J 6 A J H A J 3500 W J 1 M J H P J 6 A J G A J 3500 W J 1 end
 R E 3401 I E 1 W 3401 E I I 2 I K -2 J ri_edge
ri_floyd: M G Z
ri_k: M H Z
ri_i: M J Z
ri_j: M I H P I 6 A I G A I 3500 R E I M I G P I 6 A I J A I 3500 R F I A E F M I H P I 6 A I J A I 3500 R F I ifl E F W I E end I J 1 ifl J L J ri_j end I H 1 ifl H L J ri_i end I G 1 ifl G L J ri_k end
 W 3402 Z M G Z
ri_connect_i: M I 3080 A I G R E I ife E Z J ri_connect_next end M H Z
ri_connect_j: M I 3080 A I H R E I ifn E Z M I G P I 6 A I H A I 3500 R E I ife E 99 M A @ri_impossible J stats_label end end I H 1 ifl H L J ri_connect_j end
 M I 3080 A I G R A I M B 2 C S app_div ifn C Z R J 3402 M I 3100 A I J W I G I J 1 W 3402 J end
ri_connect_next: I G 1 ifl G L J ri_connect_i end W 3403 99 W 3404 Z W 3405 Z C S ri_search
 M A @ri_extra C S stats_label R F 3403 C S stats_int M A @ri_total C S stats_label R F 3403 R E 3401 A F E C S stats_int M A 27 C S ri_pad R E 3402 ife E Z M A @ri_none C S stats_label M A 54 C S ri_pad J ri_footer end W 3410 Z
ri_plan: R E 3410 R F 3402 ifge E F J ri_footer end M I 3360 A I E R F I W 3411 F M F I/1 W 3412 F M A @ri_repeat C S stats_label R A 3411 A A 48 C S app_put
ri_path: R G 3411 R H 3412 ife G H J ri_path_done end M J Z
ri_neighbor: M I G P I 6 A I J A I 3040 R E I ifn E Z M I J P I 6 A I H A I 3500 R E I I E 1 M I G P I 6 A I H A I 3500 R F I ife E F J ri_path_step end end I J 1 R E 3400 ifl J E J ri_neighbor end J ri_bad
ri_path_step: W 3411 J M A 45 C S app_put M A J A A 48 C S app_put J ri_path
ri_path_done: R E 3410 I E 2 W 3410 E M A E Q A 2 I A 1 P A 27 C S ri_pad J ri_plan
ri_footer: M A @ri_footer_text J stats_label
; Depth<=3 recursion. Each level selects the first unpaired odd vertex and
; tries partners in ascending order; ties retain the first complete pairing.
ri_search: R E 3405 P E 2 R F 3402 ife E F R E 3404 R F 3403 ifge E F M A Z O S P end W 3403 E M I 3340 M J 3360 R K 3402
ri_best_copy: E K Z M A Z E K Z O S P R E I W J E I I 1 I J 1 I K -1 J ri_best_copy end
 M G Z
ri_first: M I 3200 A I G R E I ifn E Z I G 1 J ri_first end W I 1 R E 3405 M I 3300 A I E W I G M I 3310 A I E I G 1 W I G
ri_partner: R E 3405 M I 3310 A I E R H I R F 3402 ifge H F J ri_level_done end M I 3200 A I H R F I ifn F Z J ri_partner_next end W I 1 M I 3300 A I E R G I M I 3100 A I G R G I M I 3100 A I H R H I M I E P I 2 A I 3340 W I G M I/1 H M I G P I 6 A I H A I 3500 R F I R G 3404 A G F W 3404 G M I 3320 A I E W I F I E 1 W 3405 E C S ri_search
 R E 3405 I E -1 W 3405 E M I 3320 A I E R F I R G 3404 S G F W 3404 G M I 3310 A I E R H I M I 3200 A I H W I Z
ri_partner_next: R E 3405 M I 3310 A I E R F I I F 1 W I F J ri_partner
ri_level_done: R E 3405 M I 3300 A I E R G I M I 3200 A I G W I Z M A Z O S P
ri_pad: M B A
ri_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J ri_pad_next
ri_bad: M A -1 O S P
ri_extra: ${ascii('extra=')}
ri_total: ${ascii(' total=')}
ri_repeat: ${ascii('repeat ')}
ri_none: ${ascii('No repeated paths needed')}
ri_footer_text: ${ascii('Closed tour is now possible')}
ri_impossible: ${ascii('IMPOSSIBLE: separate edges')}
${SAMPLE_OUTPUT}`,
};
