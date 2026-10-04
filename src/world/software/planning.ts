import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const pairs=`plan_parse: C S stats_parse N A Z O S P R E 3000 ifn E 2 ifn E 4 ifn E 6 ifn E 8 J app_bad end end end end Q E 2 W 3001 E M A Z O S P`;
const helpers=`${pairs}\n${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
export const PLANNING_SOFTWARE: TextSoftware[] = [
  {
    number:131,kind:'text',id:'interval-union',site:'clockwork',title:'Time range union',
    description:'Enter one to four start/end pairs, integer values in -99..99. Each start must be at most its end. Sorts and merges overlapping or touching closed ranges, then reports their total length without double-counting. A point range is retained but has zero length. Values are abstract time units; no dates or time zones are inferred.',
    inputs:['start end ...'],outputs:['Union and length'],
    algorithm:`app_compute: C S plan_parse N A Z O S P M J Z R L 3001
union_validate: M I J P I 2 A I 2900 R E I M F I/1 ifg E F J app_bad end I J 1 ifl J L J union_validate end M J 1
union_sort: ifge J L J union_sorted end M I J P I 2 A I 2900 R G I M H I/1 M K J I K -1
union_shift: ifl K Z J union_place end M I K P I 2 A I 2900 R E I ifle E G J union_place end M F I/1 M I/2 E M I/3 F I K -1 J union_shift
union_place: M I K P I 2 A I 2902 W I G M I/1 H I J 1 J union_sort
union_sorted: R H 2900 R G 2901 M J 1 M K Z
union_next: ifge J L J union_done end M I J P I 2 A I 2900 R E I M F I/1 ifle E G ifg F G M G F end else C S union_emit M I J P I 2 A I 2900 R H I M G I/1 end I J 1 J union_next
union_done: C S union_emit M A @union_length C S stats_label M F K J stats_int
union_emit: M E G S E H A K E R E 2620 ifn E Z M A 32 C S app_put end M A 91 C S app_put M F H C S stats_int M A 44 C S app_put M F G C S stats_int M A 93 C S app_put M A Z O S P
union_length: ${ascii(' length=')}
${helpers}`,
    examples:[{input:'5 9 -3 0 -1 2',output:'[-3,2] [5,9] length=9'},{input:'0 2 2 4',output:'[0,4] length=4'},{input:'1 1 3 3',output:'[1,1] [3,3] length=0'},{input:'2 1',error:true}],
  },
  {
    number:132,kind:'text',id:'interval-plan',site:'station',title:'Non-overlapping job planner',
    description:'Enter one to four start/end pairs in -99..99, each with start strictly below end. Chooses a maximum-size set of non-overlapping half-open jobs using earliest-finish scheduling. Jobs may touch at endpoints. Outputs original zero-based indices in execution order and count. Equal finishing times prefer the earlier input index; durations and priorities do not change the objective.',
    inputs:['start end ...'],outputs:['Selected jobs'],
    algorithm:`app_compute: C S plan_parse N A Z O S P M J Z R L 3001
plan_copy: M I J P I 2 A I 2900 R G I M H I/1 ifge G H J app_bad end M I J P I 3 A I 3100 W I G M I/1 H M I/2 J I J 1 ifl J L J plan_copy end M J 1
plan_sort: ifge J L J plan_sorted end M I J P I 3 A I 3100 R H I M G I/1 M E I/2 W 3020 E M K J I K -1
plan_shift: ifl K Z J plan_place end M I K P I 3 A I 3100 M E I/1 ifle E G J plan_place end R F I M I/3 F M I/4 E M E I/2 M I/5 E I K -1 J plan_shift
plan_place: M I K P I 3 A I 3103 W I H M I/1 G R E 3020 M I/2 E I J 1 J plan_sort
plan_sorted: M A @plan_jobs C S stats_label M J Z M H -100 M K Z
plan_next: ifge J L J plan_done end M I J P I 3 A I 3100 R E I ifge E H M H I/1 M G I/2 ifn K Z M A 32 C S app_put end M F G C S stats_int I K 1 end I J 1 J plan_next
plan_done: M A @plan_count C S stats_label M F K J stats_int
plan_jobs: ${ascii('jobs=')}
plan_count: ${ascii(' count=')}
${helpers}`,
    examples:[{input:'0 9 0 2 2 4 4 6',output:'jobs=1 2 3 count=3'},{input:'3 5 0 2 2 3',output:'jobs=1 2 0 count=3'},{input:'0 2 1 2 2 3',output:'jobs=0 2 count=2'},{input:'1 1',error:true}],
  },
];
