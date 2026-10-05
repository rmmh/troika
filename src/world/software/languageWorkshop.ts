import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
const common=`lw_bad: M A -1 O S P
lw_pad: M B A
lw_padding: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J lw_padding
${SAMPLE_OUTPUT}`;

const infix=`app_compute: W 3400 2552 R E 2610 W 3401 E W 3402 1 W 3403 Z W 3404 Z
ix_next: R E 3401 ife E Z J ix_end end R I 3400 R E I
 ife E 32 J ix_advance end
 ifge E 48 ifle E 57 R F 3402 ife F Z J lw_bad end W 3405 Z W 3406 Z J ix_number end end
 ife E 40 R F 3402 ife F Z J lw_bad end J ix_push_open end
 R F 3402 ifn F Z J lw_bad end
 ife E 41 J ix_close end
 ife E 43 M F 1 J ix_operator end ife E 45 M F 1 J ix_operator end ife E 42 M F 2 J ix_operator end ife E 47 M F 2 J ix_operator end J lw_bad
ix_number: R I 3400 R E I S E 48 R F 3405 P F 10 A F E W 3405 F R E 3406 I E 1 W 3406 E ifg E 2 J lw_bad end R I 3400 I I 1 W 3400 I R E 3401 I E -1 W 3401 E ife E Z J ix_number_done end R E I ifge E 48 ifle E 57 J ix_number end end
ix_number_done: R I 3403 A I 3100 R E 3405 W I E R E 3403 I E 1 W 3403 E W 3402 Z J ix_next
ix_push_open: R I 3404 A I 3200 W I 40 R E 3404 I E 1 W 3404 E J ix_advance
ix_operator: W 3407 E W 3408 F
ix_precedence: R E 3404 ife E Z J ix_push_operator end M I 3200 A I E I I -1 R E I ife E 40 J ix_push_operator end M F 1 ife E 42 M F 2 end ife E 47 M F 2 end R E 3408 ifl F E J ix_push_operator end C S ix_reduce N A Z O S P J ix_precedence
ix_push_operator: R I 3404 A I 3200 R E 3407 W I E R E 3404 I E 1 W 3404 E W 3402 1 J ix_advance
ix_close: R E 3404 ife E Z J lw_bad end M I 3200 A I E I I -1 R E I ife E 40 R E 3404 I E -1 W 3404 E J ix_advance end C S ix_reduce N A Z O S P J ix_close
ix_advance: R E 3400 I E 1 W 3400 E R E 3401 I E -1 W 3401 E J ix_next
ix_end: R E 3402 ifn E Z J lw_bad end R E 3404 ife E Z J ix_result end M I 3200 A I E I I -1 R E I ife E 40 J lw_bad end C S ix_reduce N A Z O S P J ix_end
ix_result: R E 3403 ifn E 1 J lw_bad end M A @ix_result_label C S stats_label R F 3100 J stats_int
ix_reduce: R E 3403 ifl E 2 J lw_bad end I E -1 W 3403 E M I 3100 A I E R H I I I -1 R G I W 3410 I R E 3404 I E -1 W 3404 E M I 3200 A I E R J I
 ife J 45 P H -1 M J 43 end
 ife J 43 ifg H Z M E 9841 S E H ifg G E J lw_bad end else M E -9841 S E H ifl G E J lw_bad end end A G H J ix_store end
 M D 1 ifl G Z P D -1 end ifl H Z P D -1 end F G A F H A
 ife J 42 ife H Z M G Z J ix_store end M A 9841 M B H C S app_div ifg G A J lw_bad end P G H P G D J ix_store end
 ife H Z J lw_bad end M A G M B H C S app_div M G A P G D
ix_store: R I 3410 W I G M A Z O S P
ix_result_label: ${ascii('Result: ')}
${common}`;

const nfa=`app_compute: M I 3000 M E 108 K I E M I 3120 M E 42 K I E W 3400 2552 R E 2610 W 3401 E
nf_rule: R E 3401 ifl E 4 J lw_bad end R I 3400 R G I S G 48 ifl G Z J lw_bad end ifg G 5 J lw_bad end M H I/1 ife H 97 M H Z else ife H 98 M H 1 else ife H 101 M H 2 else J lw_bad end end end M J I/2 S J 48 ifl J Z J lw_bad end ifg J 5 J lw_bad end P H 36 P G 6 A G H A G J A G 3000 W G 1 I I 3 R E I I I 1 W 3400 I R F 3401 I F -4 W 3401 F ife E 124 J nf_word end ifn E 44 J lw_bad end J nf_rule
nf_word: R I 3400 W 3402 I W 3403 Z
nf_word_loop: R E 3401 ife E Z J lw_bad end R I 3400 R E I I I 1 W 3400 I R F 3401 I F -1 W 3401 F ife E 124 J nf_finals end ifl E 97 J lw_bad end ifg E 98 J lw_bad end R E 3403 I E 1 W 3403 E ifg E 8 J lw_bad end J nf_word_loop
nf_finals: R K 3401 ife K Z J lw_bad end R I 3400
nf_final: R E I S E 48 ifl E Z J lw_bad end ifg E 5 J lw_bad end M J 3120 A J E R F J ifn F Z J lw_bad end W J 1 I I 1 I K -1 N K Z J nf_final
 ; Complete epsilon reachability with reflexive transitive closure.
 M G Z
nf_self: M I G P I 7 A I 3072 W I 1 I G 1 ifl G 6 J nf_self end
 M G Z
nf_k: M H Z
nf_i: M J Z
nf_j: M I H P I 6 A I G A I 3072 R E I ifn E Z M I G P I 6 A I J A I 3072 R E I ifn E Z M I H P I 6 A I J A I 3072 W I 1 end end I J 1 ifl J 6 J nf_j end I H 1 ifl H 6 J nf_i end I G 1 ifl G 6 J nf_k end
 M G Z
nf_start: M I 3072 A I G R E I M I 3140 A I G W I E I G 1 ifl G 6 J nf_start end W 3404 Z C S nf_size
nf_next: R E 3404 R F 3403 ifge E F J nf_finish end R I 3402 A I E R E I S E 97 P E 36 A E 3000 W 3405 E M I 3150 M E 6 K I E M G Z
nf_from: M I 3140 A I G R E I ife E Z J nf_from_next end M H Z
nf_edge: R I 3405 M E G P E 6 A I E A I H R E I ife E Z J nf_edge_next end M J Z
nf_closure: M I H P I 6 A I J A I 3072 R E I ifn E Z M I 3150 A I J W I 1 end I J 1 ifl J 6 J nf_closure end
nf_edge_next: I H 1 ifl H 6 J nf_edge end
nf_from_next: I G 1 ifl G 6 J nf_from end M G Z
nf_copy: M I 3150 A I G R E I M I 3140 A I G W I E I G 1 ifl G 6 J nf_copy end R E 3404 I E 1 W 3404 E C S nf_size J nf_next
nf_size: M G Z M F Z
nf_size_loop: M I 3140 A I G R E I A F E I G 1 ifl G 6 J nf_size_loop end R I 3404 A I 3160 W I F M A Z O S P
nf_finish: M G Z M H Z
nf_accept: M I 3140 A I G R E I ifn E Z M I 3120 A I G R E I ifn E Z M H 1 end end I G 1 ifl G 6 J nf_accept end M A @nf_no ifn H Z M A @nf_yes end C S stats_label M A 27 C S lw_pad M A @nf_set C S stats_label M J Z M H Z
nf_print: M I 3140 A I J R E I ifn E Z M A J A A 48 C S app_put M H 1 end I J 1 ifl J 6 J nf_print end ife H Z M A @nf_empty C S stats_label end M A 54 C S lw_pad M A @nf_sizes C S stats_label M J Z
nf_trace: ifn J Z M A 32 C S app_put end M I 3160 A I J R A I A A 48 C S app_put I J 1 R E 3403 ifle J E J nf_trace end M A Z O S P
nf_yes: ${ascii('ACCEPT')}
nf_no: ${ascii('REJECT')}
nf_set: ${ascii('Final set: ')}
nf_empty: ${ascii('EMPTY')}
nf_sizes: ${ascii('Sizes: ')}
${common}`;

export const LANGUAGE_WORKSHOP: TextSoftware[] = [
 {number:325,kind:'text',id:'infix-bench',site:'toolshed',title:'Infix Bench',inputs:['Binary operators'],outputs:['Use 0-3 for negative 3'],description:'Calculate ordinary infix expressions with parentheses and + - * /. Operands are unsigned decimal integers 0..99 (one or two digits); spaces may separate tokens. Multiplication and division precede addition and subtraction; equal precedence is left associative. Operators are binary: write 0-3 for negative three. Division truncates toward zero. Division by zero, malformed expressions or any intermediate outside -9841..9841 are rejected. Example: 2*(3+4) gives 14.',algorithm:infix,examples:[{input:'2*(3+4)',output:'Result: 14'},{input:'(0-7)/2',output:'Result: -3'},{input:'99*99+41',error:true}]},
 {number:328,kind:'text',id:'epsilon-nfa',site:'signals',title:'Epsilon NFA Lab',inputs:['rules|word|final'],outputs:['Decision / sets / sizes'],description:'Simulate all branches of a nondeterministic machine, including epsilon moves. Enter comma-separated rules such as 0e1,1a2|a|2. Each rule is source, label, destination; states are 0..5, labels a/b consume a letter and e consumes nothing. Start state is 0. Word is at most eight a/b letters and may be empty. Final states are distinct digits after the second bar. Duplicate rules are harmless. Output shows the epsilon-closed final set and its size after each prefix, starting before input. Acceptance needs any final state after the entire word.',algorithm:nfa,examples:[{input:'0e1,1a2|a|2',output:row('ACCEPT')+row('Final set: 2')+'Sizes: 2 1'},{input:'0e1,1e0||1',output:row('ACCEPT')+row('Final set: 01')+'Sizes: 2'},{input:'0a1|aa|1',output:row('REJECT')+row('Final set: EMPTY')+'Sizes: 1 1 0'}]},
];

const minimize=`app_compute: R K 2610 ifl K 5 J lw_bad end R L 2552 S L 48 ifl L 1 J lw_bad end ifg L 6 J lw_bad end R E 2553 ifn E 124 J lw_bad end M I 3070 M E 120 K I E M I 2554 M J 3050 M G L P G 2 I K -2
mn_parse: ife K Z J lw_bad end R E I S E 48 ifl E Z J lw_bad end ifge E L J lw_bad end W J E I I 1 I J 1 I K -1 I G -1 N G Z J mn_parse
 ife K Z J lw_bad end R E I ifn E 124 J lw_bad end I I 1 I K -1
mn_final: ife K Z J mn_reach_start end R E I S E 48 ifl E Z J lw_bad end ifge E L J lw_bad end M J 3070 A J E R F J ifn F Z J lw_bad end W J 1 I I 1 I K -1 J mn_final
mn_reach_start: W 3080 1
mn_reach_round: M D Z M G Z
mn_reach_vertex: M I 3080 A I G R E I ife E Z J mn_reach_next end M H Z
mn_reach_edge: M I G P I 2 A I H A I 3050 R E I M I 3080 A I E R E I ife E Z W I 1 M D 1 end I H 1 ifl H 2 J mn_reach_edge end
mn_reach_next: I G 1 ifl G L J mn_reach_vertex end N D Z J mn_reach_round
 M G Z
mn_seed_i: M H Z
mn_seed_j: M I 3070 A I G R E I M I 3070 A I H R F I ifn E F M I G P I 6 A I H A I 3100 W I 1 end I H 1 ifl H L J mn_seed_j end I G 1 ifl G L J mn_seed_i end
mn_refine: M D Z M G Z
mn_pair_i: M H Z
mn_pair_j: M I G P I 6 A I H A I 3100 R E I ifn E Z J mn_pair_next end M J Z
mn_letter: M I G P I 2 A I J A I 3050 R E I M I H P I 2 A I J A I 3050 R F I P E 6 A E F A E 3100 R E E ifn E Z M I G P I 6 A I H A I 3100 W I 1 M D 1 J mn_pair_next end I J 1 ifl J 2 J mn_letter end
mn_pair_next: I H 1 ifl H L J mn_pair_j end I G 1 ifl G L J mn_pair_i end N D Z J mn_refine
 W 3400 Z W 3401 Z M G Z
mn_class: M I 3080 A I G R E I ife E Z M I 3150 A I G W I -1 J mn_class_next end R E 3400 I E 1 W 3400 E M H Z
mn_find: M I 3080 A I H R E I ifn E Z M I G P I 6 A I H A I 3100 R E I ife E Z J mn_found end end I H 1 J mn_find
mn_found: M I 3150 A I G W I H ife G H R E 3401 M I 3170 A I E W I G I E 1 W 3401 E end
mn_class_next: I G 1 ifl G L J mn_class end W 3402 L
 M A @mn_counts C S stats_label R F 3400 C S stats_int M A @mn_slash C S stats_label R F 3401 C S stats_int M A 27 C S lw_pad M A @mn_classes C S stats_label M J Z
mn_labels: ifn J Z M A 32 C S app_put end M I 3150 A I J R A I ifl A Z M A 45 else A A 48 end C S app_put I J 1 R E 3402 ifl J E J mn_labels end
 M A 54 C S lw_pad M A @mn_reps C S stats_label W 3403 -1 C S mn_row M A 81 C S lw_pad M A @mn_a C S stats_label W 3403 Z C S mn_row M A 108 C S lw_pad M A @mn_b C S stats_label W 3403 1 C S mn_row M A 135 C S lw_pad M A @mn_finals C S stats_label M J Z M H Z
mn_final_print: M I 3170 A I J R E I M I 3070 A I E R F I ifn F Z ifn H Z M A 32 C S app_put end M A E A A 48 C S app_put M H 1 end I J 1 R E 3401 ifl J E J mn_final_print end ife H Z M A @mn_none C S stats_label end M A Z O S P
mn_row: M J Z
mn_row_next: ifn J Z M A 32 C S app_put end M I 3170 A I J R E I R F 3403 ifge F Z M I E P I 2 A I F A I 3050 R E I M I 3150 A I E R E I end M A E A A 48 C S app_put I J 1 R E 3401 ifl J E J mn_row_next end M A Z O S P
mn_counts: ${ascii('reachable/minimal: ')}
mn_slash: ${ascii('/')}
mn_classes: ${ascii('classes: ')}
mn_reps: ${ascii('reps: ')}
mn_a: ${ascii('a: ')}
mn_b: ${ascii('b: ')}
mn_finals: ${ascii('final: ')}
mn_none: ${ascii('NONE')}
${common}`;

const turing=`app_compute: M I 3000 M K 36
tm_clear: W I -1 I I 1 I K -1 N K Z J tm_clear M I 3100 M K 27
tm_blank: W I 2 I I 1 I K -1 N K Z J tm_blank M I 2552 R K 2610
tm_rule: ifl K 6 J lw_bad end R G I S G 48 ifl G Z J lw_bad end ifg G 3 J lw_bad end M E I/1 C S tm_symbol N A Z O S P P G 3 A G E P G 3 A G 3000 R E G ifn E -1 J lw_bad end M E I/2 C S tm_symbol N A Z O S P W G E M E I/3 ife E 76 M E -1 else ife E 82 M E 1 else J lw_bad end end M G/1 E M E I/4 ife E 72 M E 4 else S E 48 ifl E Z J lw_bad end ifg E 3 J lw_bad end end M G/2 E I I 5 R E I I I 1 I K -6 ife E 124 J tm_tape end ifn E 44 J lw_bad end J tm_rule
tm_tape: M G Z
tm_tape_next: ife K Z J lw_bad end R E I I I 1 I K -1 ife E 124 J tm_limit end C S tm_symbol N A Z O S P ifge G 12 J lw_bad end M J 3108 A J G W J E I G 1 J tm_tape_next
tm_limit: ifl K 1 J lw_bad end ifg K 2 J lw_bad end M G Z
tm_limit_digit: R E I S E 48 ifl E Z J lw_bad end ifg E 9 J lw_bad end P G 10 A G E I I 1 I K -1 N K Z J tm_limit_digit ife G Z J lw_bad end W 3403 G W 3400 Z W 3401 8 W 3402 Z
tm_step: R G 3402 R E 3403 ifge G E M H 3 J tm_done end R H 3401 M I 3100 A I H R E I R F 3400 P F 3 A F E P F 3 A F 3000 R E F ife E -1 M H 1 J tm_done end M J F/1 A J H ifl J Z M H 2 J tm_done end ifge J 27 M H 2 J tm_done end W I E W 3401 J M E F/2 W 3400 E I G 1 W 3402 G ife E 4 M H Z J tm_done end J tm_step
tm_done: M I @tm_reasons A I H R A I C S stats_label M A @tm_steps C S stats_label R F 3402 C S stats_int M A 27 C S lw_pad M A @tm_state C S stats_label R A 3400 ife A 4 M A 72 else A A 48 end C S app_put M A @tm_head C S stats_label R F 3401 C S stats_int M A 54 C S lw_pad M J Z
tm_print: M I 3100 A I J R A I ife A 2 M A 95 else A A 48 end C S app_put I J 1 ifl J 27 J tm_print end R K 3401
tm_pointer: E K Z J tm_caret M A 32 C S app_put I K -1 J tm_pointer
tm_caret: M A 94 J app_put
tm_symbol: ife E 95 M E 2 M A Z O S P end S E 48 ifl E Z J lw_bad end ifg E 1 J lw_bad end M A Z O S P
tm_reasons: @tm_halt @tm_missing @tm_edge @tm_bounded
tm_halt: ${ascii('HALT')}
tm_missing: ${ascii('NO RULE')}
tm_edge: ${ascii('TAPE EDGE')}
tm_bounded: ${ascii('STEP LIMIT')}
tm_steps: ${ascii('; steps=')}
tm_state: ${ascii('state=')}
tm_head: ${ascii(' head=')}
${common}`;
LANGUAGE_WORKSHOP.push(
 {number:329,kind:'text',id:'dfa-minimize',site:'relay',title:'DFA Minimizer',inputs:['n|transitions|F'],outputs:['Minimal quotient machine'],description:'Minimize a complete a/b automaton with 1..6 states numbered from 0; start is 0. Enter n| followed by two destination digits for each state (a then b), then | and distinct final-state digits. Empty finals are allowed. Example 4|12333333|3 merges states 1 and 2. Unreachable states are removed and marked - in classes. Each class uses its smallest original state as representative. Rows a and b list destinations in the displayed representative order. Final lists accepting representatives. Partition refinement runs to stability; this is language equivalence, not just identical outgoing rows.',algorithm:minimize,examples:[{input:'4|12333333|3',output:row('reachable/minimal: 4/3')+row('classes: 0 1 1 3')+row('reps: 0 1 3')+row('a: 1 3 3')+row('b: 1 3 3')+'final: 3'},{input:'2|0011|1',output:row('reachable/minimal: 1/1')+row('classes: 0 -')+row('reps: 0')+row('a: 0')+row('b: 0')+'final: NONE'}]},
 {number:330,kind:'text',id:'turing-tape',site:'ada',title:'Turing Tape Lab',inputs:['rules|tape|steps'],outputs:['Stop reason / tape / head'],description:'Run a bounded Turing machine. Rules are comma-separated qrwDn: current state, read symbol, write symbol, direction L/R, next state. States are 0..3; next H halts. Symbols are 0, 1, _ (blank). Example 011R0,0_1RH|111|8 appends a 1. Start in state 0 at cell 8 of a 27-cell tape; up to 12 initial symbols extend right, all other cells are blank. Empty initial tape is allowed. Each rule writes, moves, then changes state. Duplicate state/read rules are errors. Stops on H, absent rule, 1..99-step limit, or a move off tape; an off-tape move stops before writing. Caret marks the final head.',algorithm:turing,examples:[{input:'011R0,0_1RH|111|8',output:row('HALT; steps=4')+row('state=H head=12')+'________1111_______________'+'            ^'},{input:'0_0R0||2',output:row('STEP LIMIT; steps=2')+row('state=0 head=10')+'________00_________________'+'          ^'}]},
);

const cyk=`app_compute: M I 3000 M E 8 K I E M I 3400 M E 256 K I E W 3800 Z W 3803 Z W 3815 Z M I 2552 R K 2610
cy_rule: ifl K 3 J lw_bad end R E I C S cy_nonterminal N A Z O S P M G E M E I/1
 ifge E 97 ifle E 98 S E 97 M J G P J 2 A J E A J 3000 W J 1 I I 2 I K -2 J cy_separator end end
 ife E 126 ifn G Z J lw_bad end W 3803 1 I I 2 I K -2 J cy_separator end
 ifl K 4 J lw_bad end C S cy_nonterminal N A Z O S P M H E M E I/2 C S cy_nonterminal N A Z O S P M F E ife H Z W 3815 1 end ife F Z W 3815 1 end R J 3800 ifge J 13 J lw_bad end P J 3 A J 2900 W J G M J/1 H M J/2 F R E 3800 I E 1 W 3800 E I I 3 I K -3
cy_separator: ife K Z J lw_bad end R E I I I 1 I K -1 ife E 124 J cy_word end ifn E 44 J lw_bad end J cy_rule
cy_word: W 3801 I W 3802 K ifg K 8 J lw_bad end R E 3803 R F 3815 ifn E Z ifn F Z J lw_bad end end
cy_validate: ife K Z J cy_base end R E I ifl E 97 J lw_bad end ifg E 98 J lw_bad end I I 1 I K -1 J cy_validate
cy_base: M G Z
cy_base_start: R E 3802 ifge G E J cy_lengths end R I 3801 A I G R H I S H 97 M J Z
cy_base_nt: M I J P I 2 A I H A I 3000 R E I ifn E Z M I G P I 32 A I J A I 3400 W I 1 end I J 1 ifl J 4 J cy_base_nt end I G 1 J cy_base_start
cy_lengths: W 3804 2
cy_length: R E 3804 R F 3802 ifg E F J cy_done end W 3805 Z
cy_start: R E 3802 R F 3804 S E F R F 3805 ifg F E J cy_next_length end W 3806 1
cy_split: R E 3806 R F 3804 ifge E F J cy_next_start end W 3807 Z
cy_each_rule: R E 3807 R F 3800 ifge E F J cy_next_split end M I E P I 3 A I 2900 R G I M H I/1 M J I/2 R I 3805 P I 32 R E 3806 I E -1 P E 4 A I E A I H A I 3400 R E I ife E Z J cy_next_rule end
 R I 3805 R E 3806 A I E P I 32 R F 3804 S F E I F -1 P F 4 A I F A I J A I 3400 R E I ife E Z J cy_next_rule end
 R I 3805 P I 32 R E 3804 I E -1 P E 4 A I E A I G A I 3400 W I 1
cy_next_rule: R E 3807 I E 1 W 3807 E J cy_each_rule
cy_next_split: R E 3806 I E 1 W 3806 E J cy_split
cy_next_start: R E 3805 I E 1 W 3805 E J cy_start
cy_next_length: R E 3804 I E 1 W 3804 E J cy_length
cy_done: M G Z M I 3400 M K 256
cy_count: R E I A G E I I 1 I K -1 N K Z J cy_count W 3808 G M G Z R H 3802
cy_top: ife H Z M E Z ife G Z R E 3803 end else M I H I I -1 P I 4 A I G A I 3400 R E I end M I 3700 A I G W I E I G 1 ifl G 4 J cy_top end R E 3700 M A @cy_no ifn E Z M A @cy_yes end C S stats_label M A 27 C S lw_pad M A @cy_span C S stats_label M J Z M H Z
cy_top_print: M I 3700 A I J R E I ifn E Z ifn H Z M A 32 C S app_put end M I @cy_names A I J R A I C S app_put M H 1 end I J 1 ifl J 4 J cy_top_print end ife H Z M A @cy_none C S stats_label end M A 54 C S lw_pad M A @cy_entries C S stats_label R F 3808 J stats_int
cy_nonterminal: ife E 83 M E Z M A Z O S P end S E 64 ifl E 1 J lw_bad end ifg E 3 J lw_bad end M A Z O S P
cy_names: 83 65 66 67
cy_yes: ${ascii('ACCEPT')}
cy_no: ${ascii('REJECT')}
cy_span: ${ascii('Whole span: ')}
cy_entries: ${ascii('Chart entries: ')}
cy_none: ${ascii('NONE')}
${common}`;

const regex=`app_compute: W 3800 Z M I 2552 R K 2610
rx_scan: ife K Z J lw_bad end R E I I I 1 I K -1 ife E 59 J rx_text end R E 3800 I E 1 W 3800 E ifg E 18 J lw_bad end J rx_scan
rx_text: R E 3800 ife E Z J lw_bad end ifg K 8 J lw_bad end W 3801 I W 3802 K
rx_text_check: E K Z J rx_init R E I ifl E 97 J lw_bad end ifg E 98 J lw_bad end I I 1 I K -1 J rx_text_check
rx_init: W 3818 Z W 3803 Z W 3804 1 W 3805 Z W 3806 Z W 3809 Z
rx_next: R E 3803 R F 3800 ifge E F J rx_end end M I 2552 A I E R E I
 ife E 97 J rx_atom_begin end ife E 98 J rx_atom_begin end ife E 40 J rx_atom_begin end
 R F 3804 ifn F Z J lw_bad end
 ife E 42 R F 3809 ife F 42 J lw_bad end C S rx_star N A Z O S P J rx_advance end
 ife E 41 J rx_close end ife E 124 M F 1 J rx_operator end J lw_bad
rx_atom_begin: R F 3804 ife F Z M E 46 M F 2 W 3818 1 J rx_operator end
 ife E 40 R I 3805 A I 3750 W I E R E 3805 I E 1 W 3805 E J rx_advance end
 W 3817 E R E 3806 ifge E 9 J lw_bad end M I E P I 81 A I 3000 W 3810 I M K 81 K I K M G Z
rx_literal: R E 3802 ifge G E J rx_literal_done end R I 3801 A I G R E I R F 3817 ife E F M I G P I 10 I I 1 R E 3810 A I E W I 1 end I G 1 J rx_literal
rx_literal_done: R E 3806 I E 1 W 3806 E W 3804 Z J rx_advance
rx_operator: W 3807 E W 3808 F
rx_precedence: R E 3805 ife E Z J rx_push end M I 3750 A I E I I -1 R E I ife E 40 J rx_push end M F 1 ife E 46 M F 2 end R E 3808 ifl F E J rx_push end C S rx_reduce N A Z O S P J rx_precedence
rx_push: R I 3805 A I 3750 R E 3807 W I E R E 3805 I E 1 W 3805 E W 3804 1 R E 3818 ifn E Z W 3818 Z J rx_next end J rx_advance
rx_close: R E 3805 ife E Z J lw_bad end M I 3750 A I E I I -1 R E I ife E 40 R E 3805 I E -1 W 3805 E J rx_advance end C S rx_reduce N A Z O S P J rx_close
rx_advance: R E 3803 M I 2552 A I E R F I W 3809 F I E 1 W 3803 E J rx_next
rx_end: R E 3804 ifn E Z J lw_bad end R E 3805 ife E Z J rx_result end M I 3750 A I E I I -1 R E I ife E 40 J lw_bad end C S rx_reduce N A Z O S P J rx_end
rx_result: R E 3806 ifn E 1 J lw_bad end R I 3802 A I 3000 R E I M A @rx_no ifn E Z M A @rx_yes end C S stats_label M A 27 C S lw_pad M A @rx_prefixes C S stats_label M J Z M H Z
rx_prefix: M I 3000 A I J R E I ifn E Z ifn H Z M A 32 C S app_put end M A J A A 48 C S app_put M H 1 end I J 1 R E 3802 ifle J E J rx_prefix end ife H Z M A @rx_none C S stats_label end M A Z O S P
rx_reduce: R E 3806 ifl E 2 J lw_bad end I E -1 W 3806 E M I E P I 81 A I 3000 W 3811 I S I 81 W 3810 I R E 3805 I E -1 W 3805 E M I 3750 A I E R E I ife E 46 J rx_concat end
 R I 3810 R J 3811 M K 81
rx_union: R E I R F J ifn F Z W I 1 end I I 1 I J 1 I K -1 N K Z J rx_union M A Z O S P
rx_concat: M I 3900 M K 81 K I K W 3813 Z
rx_concat_i: W 3814 Z
rx_concat_j: W 3815 Z
rx_concat_k: R I 3813 P I 9 R E 3815 A I E R F 3810 A I F R E I ife E Z J rx_concat_next end R I 3815 P I 9 R E 3814 A I E R F 3811 A I F R E I ifn E Z R I 3813 P I 9 R E 3814 A I E A I 3900 W I 1 J rx_concat_done_k end
rx_concat_next: R E 3815 I E 1 W 3815 E R F 3802 ifle E F J rx_concat_k end
rx_concat_done_k: R E 3814 I E 1 W 3814 E R F 3802 ifle E F J rx_concat_j end R E 3813 I E 1 W 3813 E R F 3802 ifle E F J rx_concat_i end M I 3900 R J 3810 M K 81
rx_concat_copy: R E I W J E I I 1 I J 1 I K -1 N K Z J rx_concat_copy M A Z O S P
rx_star: R E 3806 ife E Z J lw_bad end I E -1 P E 81 A E 3000 W 3810 E M G Z
rx_star_self: M I G P I 10 R E 3810 A I E W I 1 I G 1 R E 3802 ifle G E J rx_star_self end M G Z
rx_star_k: M H Z
rx_star_i: M J Z
rx_star_j: M I H P I 9 A I G R E 3810 A I E R E I ifn E Z M I G P I 9 A I J R E 3810 A I E R E I ifn E Z M I H P I 9 A I J R E 3810 A I E W I 1 end end I J 1 R E 3802 ifle J E J rx_star_j end I H 1 R E 3802 ifle H E J rx_star_i end I G 1 R E 3802 ifle G E J rx_star_k end M A Z O S P
rx_yes: ${ascii('MATCH')}
rx_no: ${ascii('NO MATCH')}
rx_prefixes: ${ascii('prefixes: ')}
rx_none: ${ascii('NONE')}
${common}`;
LANGUAGE_WORKSHOP.push(
 {number:326,kind:'text',id:'regex-lab',site:'typecase',title:'Regular Expression Lab',inputs:['pattern;text'],outputs:['Full match / prefixes'],description:'Match an entire a/b text against a regular expression. Syntax: letters a/b, parentheses, alternation | and postfix *. Concatenation is implicit; * binds before concatenation, which binds before |. No spaces, wildcards, escapes or empty alternatives. Pattern is 1..18 characters, text 0..8. Separate them with a semicolon: (a|b)*abb;abb matches. The example a*; matches empty text. Repeated consecutive stars are rejected. Native relation composition and closure also report accepted prefix lengths, including zero when the pattern accepts empty text.',algorithm:regex,examples:[{input:'(a|b)*abb;abb',output:row('MATCH')+'prefixes: 3'},{input:'a*;',output:row('MATCH')+'prefixes: 0'},{input:'a|ab;ab',output:row('MATCH')+'prefixes: 1 2'},{input:'a**;a',error:true}]},
 {number:327,kind:'text',id:'cyk-grammar',site:'library',title:'CYK Grammar Lab',inputs:['rules|word'],outputs:['Decision / chart summary'],description:'Recognize a context-free grammar in Chomsky normal form. Nonterminals are S,A,B,C; start S. Rules are comma-separated: SAB means S -> A B; Aa means A -> a. Terminals are a/b. Example SAB,Aa,Bb|ab accepts. Word is at most eight letters and may be empty. S~ allows the empty word, but then S cannot occur on a right-hand side. Other epsilon/unit rules are not supported; repeated rules are harmless. Native CYK fills the triangular chart, reports all nonterminals deriving the whole word, and counts nonempty span/nonterminal entries.',algorithm:cyk,examples:[{input:'SAB,Aa,Bb|ab',output:row('ACCEPT')+row('Whole span: S')+'Chart entries: 3'},{input:'S~,Aa|',output:row('ACCEPT')+row('Whole span: S')+'Chart entries: 0'},{input:'SSS,Sa|aaa',output:row('ACCEPT')+row('Whole span: S')+'Chart entries: 6'}]},
);
LANGUAGE_WORKSHOP.sort((a,b)=>a.number-b.number);
