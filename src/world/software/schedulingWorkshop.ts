import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const shared=`sw_digit: E K Z J app_bad R E J ifl E 48 J app_bad end ifg E 57 J app_bad end S E 48 I J 1 I K -1 M A Z O S P
sw_pad: M B A
sw_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J sw_pad_next
app_bad: M A -1 O S P
${SAMPLE_OUTPUT}`;
export const SCHEDULING_WORKSHOP:TextSoftware[]=[
{number:269,kind:'text',id:'weighted-slots',site:'station',title:'Weighted Slots',description:'Choose nonoverlapping bookings for maximum profit, rather than the largest booking count. Enter 1..8 SEV triples without spaces: start S, end E and value V are digits 0..9, with S<E. Touching endpoints are compatible. Jobs are numbered from 1 in input order. Reports profit, busy time and selected job numbers. Equal-profit solutions prefer the smallest binary selection mask; zero-profit jobs may be omitted.',inputs:['SEV triples'],outputs:['Profit / choices'],algorithm:`app_compute: M J 2552 R K 2610 M L Z
ws_parse: E K Z J ws_parsed ifge L 8 J app_bad end C S sw_digit N A Z O S P M G E C S sw_digit N A Z O S P ifle E G J app_bad end M I 2900 A I L W I G M I 2920 A I L W I E C S sw_digit N A Z O S P M I 2940 A I L W I E M I 2980 A I L W I Z I L 1 J ws_parse
ws_parsed: E L Z J app_bad M G Z
ws_sort: M H -1 M K 99 M J Z
ws_find: M I 2980 A I J R E I ife E Z M I 2920 A I J R E I ifl E K M K E M H J end end I J 1 ifl J L J ws_find end M I 2960 A I G W I H M I 2980 A I H W I 1 I G 1 ifl G L J ws_sort end W 3000 Z W 3020 Z M G 1
ws_dp: M I 2960 A I G I I -1 R H I M I 2900 A I H R K I M D G I D -1
ws_predecessor: E D Z J ws_candidate M I 2960 A I D I I -1 R E I M I 2920 A I E R E I ifle E K J ws_candidate end I D -1 J ws_predecessor
ws_candidate: M I 3000 A I D R E I M I 2940 A I H R F I A E F M I 3020 A I D R F I M I @ws_bits A I H R J I A F J M I 3000 A I G I I -1 R J I ifl E J J ws_keep end ife E J M I 3020 A I G I I -1 R J I ifge F J J ws_keep end end J ws_store
ws_keep: M I 3000 A I G I I -1 R E I M I 3020 A I G I I -1 R F I
ws_store: M I 3000 A I G W I E M I 3020 A I G W I F I G 1 ifle G L J ws_dp end M I 3020 A I L R H I W 3200 H M G Z M J Z
ws_busy: M A H M B 2 C S app_div M H A ifn C Z M I 2920 A I J R E I M I 2900 A I J R F I S E F A G E end I J 1 ifl J L J ws_busy end M A @ws_profit C S stats_label M I 3000 A I L R F I C S stats_int M A @ws_time C S stats_label M F G C S stats_int M A 27 C S sw_pad M A @ws_jobs C S stats_label R H 3200 ife H Z M A @ws_none J stats_label end M J 1 M G Z
ws_print: M A H M B 2 C S app_div M H A ifn C Z ifn G Z M A 32 C S app_put end M F J C S stats_int M G 1 end I J 1 N H Z J ws_print M A Z O S P
ws_bits: 1 2 4 8 16 32 64 128
ws_profit: ${ascii('profit=')}
ws_time: ${ascii(' busy=')}
ws_jobs: ${ascii('jobs: ')}
ws_none: ${ascii('NONE')}
${shared}`,examples:[{input:'095031361691',output:'profit=5 busy=9'.padEnd(27)+'jobs: 1'},{input:'015125',output:'profit=10 busy=2'.padEnd(27)+'jobs: 1 2'},{input:'010',output:'profit=0 busy=0'.padEnd(27)+'jobs: NONE'},{input:'110',error:true}]},
{number:270,kind:'text',id:'two-machine-flow',site:'toolshed',title:'Two-Machine Flow',description:'Schedule jobs through machine A then machine B. Enter 1..7 AB pairs of processing-time digits 0..9, without spaces. Each machine handles one job at a time; jobs cannot overtake. Johnson selection minimizes finishing time: smallest remaining operation first, ties by job number then A before B; A choices go at the front and B choices at the back. Reports 1-based order, finish time, and each machine\'s total idle time from time 0 through final completion.',inputs:['AB time pairs'],outputs:['Order / timing'],algorithm:`app_compute: M J 2552 R K 2610 M L Z
jf_parse: E K Z J jf_parsed ifge L 7 J app_bad end C S sw_digit N A Z O S P M I 2900 A I L W I E C S sw_digit N A Z O S P M I 2920 A I L W I E M I 2940 A I L W I Z I L 1 J jf_parse
jf_parsed: E L Z J app_bad W 3200 Z M E L I E -1 W 3201 E M K Z
jf_pick: M G Z M H 99 W 3202 -1
jf_scan: M I 2940 A I G R E I ifn E Z J jf_next end M I 2900 A I G R E I ifl E H M H E W 3202 G W 3203 Z end M I 2920 A I G R E I ifl E H M H E W 3202 G W 3203 1 end
jf_next: I G 1 ifl G L J jf_scan end R G 3202 M I 2940 A I G W I 1 R E 3203 ife E Z R I 3200 M F I I F 1 W 3200 F else R I 3201 M F I I F -1 W 3201 F end A I 2960 W I G I K 1 ifl K L J jf_pick end M G Z M H Z M K Z M J Z M D Z
jf_simulate: M I 2960 A I D R E I M I 2900 A I E R F I A G F A K F M I 2920 A I E R F I ifl H G M H G end A H F A J F I D 1 ifl D L J jf_simulate end W 3204 H M E H S E K W 3205 E M E H S E J W 3206 E M A @jf_order C S stats_label M J Z
jf_print: ifn J Z M A 32 C S app_put end M I 2960 A I J R F I I F 1 C S stats_int I J 1 ifl J L J jf_print end M A 27 C S sw_pad M A @jf_finish C S stats_label R F 3204 C S stats_int M A 54 C S sw_pad M A @jf_idle C S stats_label R F 3205 C S stats_int M A @jf_b C S stats_label R F 3206 J stats_int
jf_order: ${ascii('order: ')}
jf_finish: ${ascii('finish=')}
jf_idle: ${ascii('idle A=')}
jf_b: ${ascii(' B=')}
${shared}`,examples:[{input:'329123',output:'order: 3 1 2'.padEnd(27)+'finish=15'.padEnd(27)+'idle A=1 B=9'},{input:'00',output:'order: 1'.padEnd(27)+'finish=0'.padEnd(27)+'idle A=0 B=0'},{input:'123',error:true}]},
{number:271,kind:'text',id:'cpu-scheduler',site:'clockwork',title:'CPU Scheduler',description:'Compare policies for 1..6 jobs that all arrive at time 0. Enter f|bursts for FCFS, s|bursts for shortest-job-first, or rQ|bursts for round robin with quantum Q=1..9. Each burst is one digit 1..9; job IDs follow input order. SJF ties use lower IDs; round robin cycles IDs and skips finished jobs. Reports finish time, per-job waiting and turnaround in ID order, then a timeline: each digit is the job running for one time unit. No switching cost or idle gaps.',inputs:['f| / s| / rQ|'],outputs:['Finish / metrics'],algorithm:`app_compute: M J 2552 R K 2610 E K Z J app_bad R E J I J 1 I K -1 W 3201 Z W 3202 1 ife E 102 J cp_separator end ife E 115 W 3201 1 J cp_separator end ifn E 114 J app_bad end W 3201 2 C S sw_digit N A Z O S P ife E Z J app_bad end W 3202 E
cp_separator: E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1 M L Z
cp_parse: E K Z J cp_parsed ifge L 6 J app_bad end C S sw_digit N A Z O S P ife E Z J app_bad end M I 2900 A I L W I E M I 2920 A I L W I E M I 2940 A I L W I Z I L 1 J cp_parse
cp_parsed: E L Z J app_bad W 3200 L W 3203 Z W 3204 Z W 3205 Z
cp_choose: R E 3201 ife E 2 J cp_round end M G -1 M H 99 M J Z
cp_find: M I 2920 A I J R E I ifg E Z R F 3201 ife F Z M G J J cp_whole end ifl E H M H E M G J end end I J 1 ifl J L J cp_find end
cp_whole: M I 2920 A I G R H I J cp_run
cp_round: R G 3204 M E G I E 1 ifge E L M E Z end W 3204 E M I 2920 A I G R H I ife H Z J cp_round end R E 3202 ifg H E M H E end
cp_run: R J 3203 M E G A E 49
cp_tick: M I 3000 A I J W I E I J 1 M I 2920 A I G R F I I F -1 W I F I H -1 N H Z J cp_tick W 3203 J ife F Z M I 2940 A I G W I J R E 3205 I E 1 W 3205 E end R E 3205 ifl E L J cp_choose end R E 3201 M A @cp_fcfs ife E 1 M A @cp_sjf end ife E 2 M A @cp_rr end C S stats_label R F 3203 C S stats_int M A 27 C S sw_pad M A @cp_wait C S stats_label M J Z
cp_wait_print: ifn J Z M A 32 C S app_put end M I 2940 A I J R F I M I 2900 A I J R E I S F E C S stats_int I J 1 ifl J L J cp_wait_print end M A 54 C S sw_pad M A @cp_turn C S stats_label M J Z
cp_turn_print: ifn J Z M A 32 C S app_put end M I 2940 A I J R F I C S stats_int I J 1 ifl J L J cp_turn_print end M A 81 C S sw_pad M A @cp_timeline C S stats_label M A 108 C S sw_pad M J Z R K 3203
cp_trace: M I 3000 A I J R A I C S app_put I J 1 ifl J K J cp_trace end M A Z O S P
cp_fcfs: ${ascii('FCFS finish=')}
cp_sjf: ${ascii('SJF finish=')}
cp_rr: ${ascii('RR finish=')}
cp_wait: ${ascii('wait: ')}
cp_turn: ${ascii('turn: ')}
cp_timeline: ${ascii('timeline:')}
${shared}`,examples:[{input:'r1|31',output:'RR finish=4'.padEnd(27)+'wait: 1 1'.padEnd(27)+'turn: 4 2'.padEnd(27)+'timeline:'.padEnd(27)+'1211'},{input:'s|31',output:'SJF finish=4'.padEnd(27)+'wait: 1 0'.padEnd(27)+'turn: 4 1'.padEnd(27)+'timeline:'.padEnd(27)+'2111'},{input:'r0|12',error:true}]},
{number:272,kind:'text',id:'cache-lab',site:'keys',title:'Cache Lab',description:'Compare FIFO and least-recently-used replacement on the same references. Enter C|digits, where capacity C=1..4 and 1..40 page-reference digits follow. Caches start empty. FIFO hits leave arrival order unchanged; LRU hits make that page newest. Misses evict the oldest page only when full. Reports each policy\'s hit/miss count and final cache from oldest to newest. Example 2|01020 gives FIFO 1 hit but LRU 2 hits.',inputs:['C|page digits'],outputs:['FIFO / LRU'],algorithm:`app_compute: M J 2552 R K 2610 C S sw_digit N A Z O S P M L E ifl L 1 J app_bad end ifg L 4 J app_bad end E K Z J app_bad R E J ifn E 124 J app_bad end I J 1 I K -1 M G Z
ca_parse: E K Z J ca_parsed ifge G 40 J app_bad end C S sw_digit N A Z O S P M I 2900 A I G W I E I G 1 J ca_parse
ca_parsed: E G Z J app_bad W 3200 G W 3201 Z W 3202 Z W 3203 Z W 3204 Z M G Z
ca_reference: M I 2900 A I G R J I M H Z
ca_policy: M K H P K 20 A K 3000 M I 3201 A I H R F I M D Z
ca_find: ifge D F J ca_miss end M I K A I D R E I ife E J J ca_hit end I D 1 J ca_find
ca_hit: M I 3203 A I H R E I I E 1 W I E ife H Z J ca_next end J ca_shift
ca_miss: ifl F L M I K A I F W I J I F 1 M I 3201 A I H W I F J ca_next end M D Z
ca_shift: M E F I E -1 ifge D E M I K A I D W I J J ca_next end M I K A I D M E I/1 W I E I D 1 J ca_shift
ca_next: I H 1 ifl H 2 J ca_policy end I G 1 R E 3200 ifl G E J ca_reference end M H Z
ca_result: M A @ca_fifo ifn H Z M A @ca_lru end C S stats_label M I 3203 A I H R F I C S stats_int M A @ca_miss_label C S stats_label M I 3203 A I H R E I R F 3200 S F E C S stats_int M A 27 ifn H Z M A 81 end C S sw_pad M A @ca_order C S stats_label M J Z M I 3201 A I H R G I M K H P K 20 A K 3000
ca_print: ifn J Z M A 32 C S app_put end M I K A I J R F I C S stats_int I J 1 ifl J G J ca_print end ife H Z M A 54 C S sw_pad M H 1 J ca_result end M A Z O S P
ca_fifo: ${ascii('FIFO hit=')}
ca_lru: ${ascii('LRU hit=')}
ca_miss_label: ${ascii(' miss=')}
ca_order: ${ascii('old>new: ')}
${shared}`,examples:[{input:'2|01020',output:'FIFO hit=1 miss=4'.padEnd(27)+'old>new: 2 0'.padEnd(27)+'LRU hit=2 miss=3'.padEnd(27)+'old>new: 2 0'},{input:'0|1',error:true}]},
];
