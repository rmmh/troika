import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
const common=`cw_bad: M A -1 O S P
cw_pad: M B A
cw_pad_loop: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J cw_pad_loop
${SAMPLE_OUTPUT}`;
// Grammar records at3100: [lhs,length,rhs0,rhs1,rhs2], symbols S/A/B=0/1/2,a/b=3/4.
// Nullable3150, FIRST3160(3x2), FOLLOW3170(3x3), rule FIRST3180(10x3).
const grammar=`cg_parse: M I 3100 M K 130 K I K W 3400 2552 R E 2610 A E 2552 W 3401 E W 3402 Z
cg_rule: R I 3400 R E 3401 M F I I F 3 ifg F E J cw_bad end R A I C S cg_symbol ifl A Z J cw_bad end ifg A 2 J cw_bad end R J 3402 ifge J 10 J cw_bad end P J 5 A J 3100 W J A M E I/1 ifn E 62 J cw_bad end I I 2 M H Z R E I ife E 126 I I 1 J cg_rule_done end
cg_rhs: R E 3401 ifge I E J cg_rule_done end R A I ife A 44 J cg_rule_done end ife A 124 J cg_rule_done end ifge H 3 J cw_bad end C S cg_symbol ifl A Z J cw_bad end M K J A K H I K 2 W K A I H 1 I I 1 J cg_rhs
cg_rule_done: ife H Z M E I/-1 ifn E 126 J cw_bad end end M J/1 H R E 3402 I E 1 W 3402 E R E 3401 ife I E W 3400 I M A Z O S P end R E I I I 1 W 3400 I ife E 124 M A 1 O S P end ifn E 44 J cw_bad end J cg_rule
cg_symbol: ife A 83 M A Z O S P end ife A 65 M A 1 O S P end ife A 66 M A 2 O S P end ife A 97 M A 3 O S P end ife A 98 M A 4 O S P end M A -1 O S P
cg_sets: W 3172 1
cg_pass: W 3403 Z W 3404 Z
cg_each: R E 3404 R F 3402 ifge E F J cg_pass_done end P E 5 A E 3100 W 3405 E R G E W 3406 G M H E/1 W 3407 H W 3408 Z W 3409 1
cg_first_symbol: R H 3408 R E 3407 ifge H E J cg_nullable end R I 3405 A I H I I 2 R G I ifge G 3 R I 3406 P I 2 A I 3160 M E G I E -3 A I E C S cg_mark W 3409 Z J cg_follow_start end
 M H Z
cg_copy_first: M I G P I 2 A I H A I 3160 R E I ifn E Z R I 3406 P I 2 A I H A I 3160 C S cg_mark end I H 1 ifl H 2 J cg_copy_first end M I 3150 A I G R E I ife E Z W 3409 Z J cg_follow_start end R E 3408 I E 1 W 3408 E J cg_first_symbol
cg_nullable: R I 3406 A I 3150 C S cg_mark
cg_follow_start: W 3408 Z
cg_follow_pos: R H 3408 R E 3407 ifge H E J cg_next_rule end R I 3405 A I H I I 2 R G I ifge G 3 J cg_next_pos end W 3410 G I H 1 W 3411 H
cg_suffix: R H 3411 R E 3407 ifge H E J cg_copy_follow end R I 3405 A I H I I 2 R G I ifge G 3 R I 3410 P I 3 A I 3170 I G -3 A I G C S cg_mark J cg_next_pos end M H Z
cg_suffix_first: M I G P I 2 A I H A I 3160 R E I ifn E Z R I 3410 P I 3 A I H A I 3170 C S cg_mark end I H 1 ifl H 2 J cg_suffix_first end M I 3150 A I G R E I ife E Z J cg_next_pos end R E 3411 I E 1 W 3411 E J cg_suffix
cg_copy_follow: M H Z
cg_follow_bit: R I 3406 P I 3 A I H A I 3170 R E I ifn E Z R I 3410 P I 3 A I H A I 3170 C S cg_mark end I H 1 ifl H 3 J cg_follow_bit end
cg_next_pos: R E 3408 I E 1 W 3408 E J cg_follow_pos
cg_next_rule: R E 3404 I E 1 W 3404 E J cg_each
cg_pass_done: R E 3403 ifn E Z J cg_pass end M A Z O S P
cg_mark: R E I ife E Z W I 1 W 3403 1 end O S P
cg_letter: M I @cg_names A I A R A I J app_put
cg_names: 83 65 66
`;
const first=`app_compute: C S cg_parse N A Z J cw_bad C S cg_sets M A @cg_heading C S stats_label M A 27 C S cw_pad M L Z
cg_print_row: M A L C S cg_letter M A @cg_f C S stats_label M J Z M K Z
cg_print_first: M I L P I 2 A I J A I 3160 R E I ifn E Z M A J A A 97 C S app_put M K 1 end I J 1 ifl J 2 J cg_print_first end ife K Z M A 45 C S app_put end M A @cg_l C S stats_label M J Z M K Z
cg_print_follow: M I L P I 3 A I J A I 3170 R E I ifn E Z M A J A A 97 ife J 2 M A 36 end C S app_put M K 1 end I J 1 ifl J 3 J cg_print_follow end ife K Z M A 45 C S app_put end M A @cg_n C S stats_label M I 3150 A I L R A I A A 48 C S app_put I L 1 M A L I A 1 P A 27 C S cw_pad ifl L 3 J cg_print_row end M A @cg_legend J stats_label
cg_heading: ${ascii('FIRST / FOLLOW / nullable')}
cg_f: ${ascii(' F:')}
cg_l: ${ascii(' L:')}
cg_n: ${ascii(' N:')}
cg_legend: ${ascii('$ end; - empty; N:1 nullable')}
${grammar}${common}`;
export const COMPILER_WORKSHOP:TextSoftware[]=[{
 number:346,kind:'text',id:'grammar-sets',site:'library',title:'Grammar Sets',inputs:['S>AB,A>a,B>b'],outputs:['Nullable FIRST and FOLLOW'],description:'Analyze up to ten comma-separated productions. Nonterminals S,A,B; start S; terminals a,b. Write > then one to three symbols, or ~ for epsilon. Example S>AB,A>aA,A>~,B>b gives FIRST(S)=ab and FOLLOW(A)=b. Cycles and undefined nonterminals are allowed; sets grow to a fixed point. F is FIRST without epsilon, L is FOLLOW, $ is end of input, - is an empty set, N:1 means nullable. Every named nonterminal is shown.',algorithm:first,examples:[{input:"S>AB,A>aA,A>~,B>b",output:row("FIRST / FOLLOW / nullable")+row("S F:ab L:$ N:0")+row("A F:a L:b N:1")+row("B F:b L:$ N:0")+"$ end; - empty; N:1 nullable"}]}];
const predictive=`app_compute: C S cg_parse ifn A 1 J cw_bad end R I 3400 W 3420 I R E 3401 S E I ifg E 12 J cw_bad end W 3421 E M K E
ll_word: E K Z J ll_analyze R E I ifl E 97 J cw_bad end ifg E 98 J cw_bad end I I 1 I K -1 J ll_word
ll_analyze: C S cg_sets M I 3240 M K 9 K I K W 3404 Z
ll_rule: R E 3404 R F 3402 ifge E F J ll_parse_start end P E 5 A E 3100 W 3405 E R G E W 3406 G M H E/1 W 3407 H W 3408 Z
ll_first: R H 3408 R E 3407 ifge H E J ll_nullable end R I 3405 A I H I I 2 R G I ifge G 3 M H G I H -3 C S ll_install N A Z J ll_conflict J ll_rule_next end M H Z
ll_copy_first: M I G P I 2 A I H A I 3160 R E I ifn E Z C S ll_install N A Z J ll_conflict end I H 1 ifl H 2 J ll_copy_first end M I 3150 A I G R E I ife E Z J ll_rule_next end R E 3408 I E 1 W 3408 E J ll_first
ll_nullable: M H Z
ll_copy_follow: R I 3406 P I 3 A I H A I 3170 R E I ifn E Z C S ll_install N A Z J ll_conflict end I H 1 ifl H 3 J ll_copy_follow end
ll_rule_next: R E 3404 I E 1 W 3404 E J ll_rule
ll_install: R I 3406 P I 3 A I H A I 3240 R E I R F 3404 I F 1 ifn E Z ifn E F M A 1 O S P end end W I F M A Z O S P
ll_conflict: M A @ll_conflict_label C S stats_label R A 3406 C S cg_letter M A 47 C S app_put M A H A A 97 ife H 2 M A 36 end C S app_put M A 27 C S cw_pad M A @ll_conflict_hint J stats_label
ll_parse_start: W 3300 5 W 3301 Z W 3422 2 W 3423 Z W 3424 Z
ll_parse: R E 3422 ife E Z M A @ll_accept J ll_result end I E -1 W 3422 E M I 3300 A I E R G I R E 3423 R F 3421 M H 2 ifl E F R I 3420 A I E R H I S H 97 end
 ife G 5 R E 3422 ife E Z ife H 2 M A @ll_accept J ll_result end M A @ll_reject J ll_result end end
 ifge G 3 M E H I E 3 ifn E G M A @ll_reject J ll_result end R E 3423 I E 1 W 3423 E J ll_parse end
 M I G P I 3 A I H A I 3240 R E I ife E Z M A @ll_reject J ll_result end I E -1 R F 3424 ifge F 20 M A @ll_limit J ll_result end M I 3360 A I F W I E I F 1 W 3424 F P E 5 A E 3100 M H E/1 R F 3422 A F H ifg F 54 M A @ll_size J ll_result end M J E I J 2 A J H I J -1
ll_push: ife H Z J ll_parse end R E J R I 3422 A I 3300 W I E R E 3422 I E 1 W 3422 E I J -1 I H -1 J ll_push
ll_result: C S stats_label M A 27 C S cw_pad M A @ll_consumed C S stats_label R F 3423 C S stats_int M A 47 C S app_put R F 3421 C S stats_int M A 54 C S cw_pad M A @ll_rules C S stats_label M J Z R K 3424
ll_trace: ifge J K M A Z O S P end M I 3360 A I J R A I A A 48 C S app_put I J 1 J ll_trace
ll_conflict_label: ${ascii('TABLE CONFLICT: ')}
ll_conflict_hint: ${ascii('Two rules share this cell')}
ll_accept: ${ascii('ACCEPT')}
ll_reject: ${ascii('REJECT')}
ll_limit: ${ascii('EXPANSION LIMIT (20)')}
ll_size: ${ascii('STACK LIMIT (54)')}
ll_consumed: ${ascii('consumed: ')}
ll_rules: ${ascii('rules: ')}
${grammar}${common}`;
COMPILER_WORKSHOP.push({number:347,kind:'text',id:'predictive-parse',site:'typecase',title:'Predictive Parser',inputs:['grammar|word'],outputs:['LL(1) table and parse'],description:'Build an LL(1) table, then parse an a/b word of at most twelve letters. Grammar: up to ten comma-separated rules, S/A/B nonterminals, a/b terminals, RHS one to three symbols or ~ for epsilon. Start S. Example S>aS,S>~|aaa accepts. Rule numbers start at 0. A TABLE CONFLICT names the nonterminal/lookahead with competing rules; $ means end. Otherwise show acceptance, consumed letters and applied rule numbers. Execution stops explicitly at twenty expansions or a 54-symbol stack; these limits are not rejection.',algorithm:predictive,examples:[{input:"S>aS,S>~|aaa",output:row("ACCEPT")+row("consumed: 3/3")+"rules: 0001"}]});
const cubes=Array.from({length:27},(_,id)=>{const digits=[Math.floor(id/9),Math.floor(id/3)%3,id%3];return {mask:Array.from({length:8},(_,m)=>digits.every((d,i)=>d===0||((m>>(2-i))&1)===d-1)?2**m:0).reduce((a,b)=>a+b,0),literals:digits.filter(Boolean).length};});
const logic=`app_compute: M I 3000 M K 90 K I K W 3000 Z W 3001 Z W 3002 Z M I 2552 R K 2610
lc_input: ife K Z R E 3002 ifn E 1 J cw_bad end J lc_prepare end R E I ife E 124 R E 3002 ifn E Z J cw_bad end W 3002 1 J lc_advance end S E 48 ifl E Z J cw_bad end ifg E 7 J cw_bad end M J 3020 A J E R F J ifn F Z J cw_bad end W J 1 M J @lc_powers A J E R F J R E 3002 ife E Z R E 3000 A E F W 3000 E else R E 3001 A E F W 3001 E end
lc_advance: I I 1 I K -1 J lc_input
lc_prepare: R E 3000 R F 3001 A E F W 3003 E M L Z
lc_cube: M I @lc_masks A I L R E I W 3004 E W 3005 Z W 3006 1 M G Z
lc_cube_bit: R A 3004 M B 2 C S app_div W 3004 A ifn C Z M I @lc_powers A I G R H I R A 3003 M B H C S app_div M B 2 C S app_div ife C Z W 3006 Z end R A 3000 M B H C S app_div M B 2 C S app_div ifn C Z R E 3005 A E H W 3005 E end end I G 1 ifl G 8 J lc_cube_bit end M I 3030 A I L R E 3006 R F 3005 ife F Z M E Z end W I E M I 3060 A I L W I F I L 1 ifl L 27 J lc_cube end M I 3100 M K 256
lc_dp_clear: W I 999 I I 1 I K -1 N K Z J lc_dp_clear W 3100 Z W 3007 Z
lc_state: R G 3007 ifge G 256 J lc_finish end M I 3100 A I G R E I ife E 999 J lc_state_next end R I 3000 A I 3100 R F I ifge E F J lc_state_next end W 3008 Z
lc_candidate: R L 3008 ifge L 27 J lc_state_next end M I 3030 A I L R E I ife E Z J lc_candidate_next end M I 3100 R G 3007 A I G R E I A E 25 M I @lc_literals A I L R F I A E F R I 3000 A I 3100 R F I ifge E F J lc_candidate_next end M I 3060 A I L R H I R G 3007 W 3009 G W 3013 H W 3014 Z M J 1 M K 8
lc_union: R A 3009 M B 2 C S app_div W 3009 A W 3015 C R A 3013 C S app_div W 3013 A R E 3015 A E C ifn E Z R E 3014 A E J W 3014 E end P J 2 I K -1 N K Z J lc_union R H 3014 R G 3007 ife H G J lc_candidate_next end M I 3100 A I G R E I A E 25 M I @lc_literals A I L R F I A E F M I 3100 A I H R F I ifl E F W I E M I 3400 A I H W I G M I 3700 A I H W I L end
lc_candidate_next: R E 3008 I E 1 W 3008 E J lc_candidate
lc_state_next: R E 3007 I E 1 W 3007 E J lc_state
lc_finish: R I 3000 A I 3100 R A I M B 25 C S app_div W 3016 A W 3017 C M A @lc_terms C S stats_label R F 3016 C S stats_int M A @lc_lit C S stats_label R F 3017 C S stats_int M A 27 C S cw_pad M A @lc_sop C S stats_label M I 3030 M K 27 K I K R G 3000
lc_reconstruct: ife G Z J lc_show end M I 3700 A I G R E I M I 3030 A I E W I 1 M I 3400 A I G R G I J lc_reconstruct
lc_show: R E 3000 ife E Z M A 48 J app_put end M L Z W 3018 Z
lc_show_cube: M I 3030 A I L R E I ife E Z J lc_show_next end R E 3018 ifn E Z M A 43 C S app_put end W 3018 1 ife L Z M A 49 C S app_put J lc_show_next end M A L M B 9 C S app_div M G C M H A M J Z
lc_show_variable: ifn H Z ife H 1 M A 33 C S app_put end M A J A A 97 C S app_put end ife J 2 J lc_show_next end ife J 1 M H G else M A G M B 3 C S app_div M H A M G C end I J 1 J lc_show_variable
lc_show_next: I L 1 ifl L 27 J lc_show_cube end M A Z O S P
lc_powers: 1 2 4 8 16 32 64 128
lc_masks: ${cubes.map(c=>c.mask).join(' ')}
lc_literals: ${cubes.map(c=>c.literals).join(' ')}
lc_terms: ${ascii('terms=')}
lc_lit: ${ascii(' literals=')}
lc_sop: ${ascii('SOP: ')}
${common}`;
COMPILER_WORKSHOP.push({number:348,kind:'text',id:'logic-cover',site:'masks',title:'Logic Cover',inputs:['on|dont-care'],outputs:['Exact three-variable SOP'],description:'Minimize a Boolean function of a,b,c, with a the high bit of minterm digits 0..7. Enter distinct on-set digits, |, then optional distinct dont-care digits; the two sets must not overlap. Example 1357| gives c. Empty on-set gives 0. Enumerates all 27 product cubes and finds an exact cover minimizing number of terms, then literals. ! negates, juxtaposition means AND, + means OR. Ties retain the first cover reached in ascending covered-mask and cube order; printed terms are ordered by cube number.',algorithm:logic,examples:[{input:"1357|",output:row("terms=1 literals=1")+"SOP: c"}]});
const counter=`app_compute: W 3400 2552 R E 2610 A E 2552 W 3401 E W 3402 Z
cm_parse_rule: R I 3400 R E 3401 ifge I E J cw_bad end R E 3402 ifge E 8 J cw_bad end P E 4 A E 3100 M J E R E I I I 1 ife E 72 W J Z J cm_rule_done end ife E 73 W J 1 M K 2 else ife E 68 W J 2 M K 3 else J cw_bad end end M H 1
cm_rule_digit: R E 3401 ifge I E J cw_bad end R E I S E 48 ifl E Z J cw_bad end ifg E 7 J cw_bad end ife H 1 ifg E 2 J cw_bad end end M G J A G H W G E I H 1 I I 1 I K -1 N K Z J cm_rule_digit
cm_rule_done: R E 3402 I E 1 W 3402 E R E 3401 ifge I E J cw_bad end R E I I I 1 W 3400 I ife E 124 J cm_values end ifn E 44 J cw_bad end J cm_parse_rule
cm_values: M L Z
cm_value: C S cm_number ifl A Z J cw_bad end M I 3200 A I L W I A R I 3400 R E I I I 1 W 3400 I ifl L 2 ifn E 44 J cw_bad end else ifn E 124 J cw_bad end end I L 1 ifl L 3 J cm_value end C S cm_number ifl A 1 J cw_bad end W 3420 A R E 3400 R F 3401 ifn E F J cw_bad end M L Z
cm_check: M I L P I 4 A I 3100 R E I ifn E Z M F I/2 R G 3402 ifge F G J cw_bad end ife E 2 M F I/3 ifge F G J cw_bad end end end I L 1 R E 3402 ifl L E J cm_check end W 3421 Z W 3422 Z
cm_execute: R I 3421 P I 4 A I 3100 R E I ife E Z M A @cm_halt J cm_result end R F 3422 R G 3420 ifge F G M A @cm_limit J cm_result end I F 1 W 3422 F M J I/1 A J 3200 R F J ife E 1 I F 1 W J F M E I/2 else ife F Z M E I/3 else I F -1 W J F M E I/2 end end W 3421 E J cm_execute
cm_result: C S stats_label M A @cm_steps C S stats_label R F 3422 C S stats_int M A 27 C S cw_pad M A @cm_pc C S stats_label R F 3421 C S stats_int M A 54 C S cw_pad M L Z
cm_regs: M A 114 C S app_put M A L A A 48 C S app_put M A 61 C S app_put M I 3200 A I L R F I C S stats_int I L 1 ifl L 3 M A 32 C S app_put J cm_regs end M A Z O S P
cm_number: R I 3400 M A Z M H Z
cm_digits: R E 3401 ifge I E J cm_number_done end R E I ifl E 48 J cm_number_done end ifg E 57 J cm_number_done end S E 48 P A 10 A A E I H 1 ifg H 2 J cw_bad end I I 1 J cm_digits
cm_number_done: ife H Z J cw_bad end W 3400 I O S P
cm_halt: ${ascii('HALT')}
cm_limit: ${ascii('STEP LIMIT')}
cm_steps: ${ascii('; steps=')}
cm_pc: ${ascii('next instruction=')}
${common}`;
COMPILER_WORKSHOP.push({number:350,kind:'text',id:'counter-machine',site:'toolshed',title:'Counter Machine',inputs:['rules|r0,r1,r2|N'],outputs:['Registers and stop reason'],description:'Run up to eight comma-separated counter instructions, numbered from 0. Iri increments register r and jumps to i. Drij decrements a nonzero register and jumps to i, or jumps to j if zero. H halts without spending a step. Registers r=0..2; every target must name an existing instruction. Initial registers are 0..99; limit N=1..99 executed instructions. Example D012,I10,H|3,0,0|20 transfers three units from r0 to r1. STEP LIMIT is a bounded stop, not a claim of nontermination.',algorithm:counter,examples:[{input:"D012,I10,H|3,0,0|20",output:row("HALT; steps=7")+row("next instruction=2")+"r0=0 r1=3 r2=0"}]});
const combinator=`app_compute: W 3400 Z W 3402 Z M I 2552 R K 2610
sk_input: ife K Z J cw_bad end R E I I I 1 I K -1 ife E 124 J sk_budget end R F 3400 ifge F 32 J cw_bad end M J 3100 A J F W J E I F 1 W 3400 F J sk_input
sk_budget: ifl K 1 J cw_bad end ifg K 2 J cw_bad end M G Z
sk_budget_digit: R E I S E 48 ifl E Z J cw_bad end ifg E 9 J cw_bad end P G 10 A G E I I 1 I K -1 N K Z J sk_budget_digit ifl G 1 J cw_bad end ifg G 20 J cw_bad end W 3401 G R E 3400 ife E Z J cw_bad end
sk_rebuild: R L 3400 I L -1 M K Z
sk_node: M I 3100 A I L R E I ife E 64 ifl K 2 J cw_bad end I K -2 M I 3500 A I K R F I W I F I K 1 else ifn E 83 ifn E 75 ifn E 73 ifl E 97 J cw_bad end ifg E 99 J cw_bad end end end end M F L I F 1 M I 3500 A I K W I F I K 1 end M I 3200 A I L W I F I L -1 ifge L Z J sk_node end ifn K 1 J cw_bad end W 3403 Z
sk_find: R G 3403 R E 3400 ifge G E M A @sk_normal J sk_result end M I 3100 A I G R E I ifn E 64 J sk_find_next end M H G I H 1 M I 3100 A I H R E I ife E 73 M F 1 J sk_redex end ifn E 64 J sk_find_next end I H 1 M I 3100 A I H R E I ife E 75 M F 2 J sk_redex end ifn E 64 J sk_find_next end I H 1 M I 3100 A I H R E I ife E 83 M F 3 J sk_redex end
sk_find_next: R E 3403 I E 1 W 3403 E J sk_find
sk_redex: W 3406 F W 3404 G M I 3200 A I G R E I W 3405 E I H 1 W 3410 H M I 3200 A I H R E I W 3411 E W 3412 E M I 3200 A I E R E I W 3413 E W 3414 E M I 3200 A I E R E I W 3415 E R E 3402 R F 3401 ifge E F M A @sk_limit J sk_result end W 3408 Z W 3409 Z M A Z R B 3404 C S sk_copy R E 3406 ife E 3 M A 64 C S sk_put M A 64 C S sk_put end R A 3410 R B 3411 C S sk_copy R E 3406 ife E 3 R A 3414 R B 3415 C S sk_copy M A 64 C S sk_put R A 3412 R B 3413 C S sk_copy R A 3414 R B 3415 C S sk_copy end R A 3405 R B 3400 C S sk_copy R E 3409 ifn E Z M A @sk_size J sk_result end R K 3408 W 3400 K M I 3100 M J 3300
sk_commit: E K Z J sk_committed R E J W I E I I 1 I J 1 I K -1 J sk_commit
sk_committed: R E 3402 I E 1 W 3402 E J sk_rebuild
sk_copy: M J A M K B
sk_copy_next: ifge J K O S P end M I 3100 A I J R A I C S sk_put I J 1 J sk_copy_next
sk_put: R E 3408 ifge E 54 W 3409 1 O S P end M I 3300 A I E W I A I E 1 W 3408 E O S P
sk_result: C S stats_label M A @sk_steps C S stats_label R F 3402 C S stats_int M A 27 C S cw_pad M A @sk_term C S stats_label M A 54 C S cw_pad M J Z
sk_print: R E 3400 ifge J E M A Z O S P end M I 3100 A I J R A I C S app_put I J 1 J sk_print
sk_normal: ${ascii('NORMAL')}
sk_limit: ${ascii('STEP LIMIT')}
sk_size: ${ascii('SIZE LIMIT')}
sk_steps: ${ascii('; steps=')}
sk_term: ${ascii('Prefix term (@ applies):')}
${common}`;
COMPILER_WORKSHOP.push({number:349,kind:'text',id:'combinator-bench',site:'ada',title:'Combinator Bench',inputs:['prefix-term|N'],outputs:['SKI reduction, bounded'],description:'Prefix @ applies its next two terms; @Ia means I applied to a. Leaves are combinators S,K,I and inert a,b,c. Rules: Ix=x, Kxy=x, Sxyz=xz(yz). Example @@@SIIa|4 reduces to @aa. Enter at most 32 symbols and limit N=1..20 reductions. Uses leftmost outermost reduction, including inside arguments. NORMAL means no rule applies. STEP LIMIT leaves a reducible term; SIZE LIMIT preserves the last term when a rewrite would exceed 54 symbols. These bounded stops do not prove divergence.',algorithm:combinator,examples:[{input:"@@@SIIa|4",output:row("NORMAL; steps=3")+row("Prefix term (@ applies):")+"@aa"}]});
const unify=`app_compute: M I 3300 M K 3
un_bind_clear: W I -1 I I 1 I K -1 N K Z J un_bind_clear W 3000 Z W 3001 Z W 3002 1 W 3003 Z W 3004 Z M I 2552 R K 2610
un_input: ife K Z J un_input_done end R E I I I 1 I K -1 ife E 61 R E 3003 ifn E Z J cw_bad end R E 3002 ifn E Z J cw_bad end W 3003 1 W 3002 1 R E 3000 W 3001 E W 3004 Z J un_input end R F 3002 ife F Z J cw_bad end ife E 112 I F 1 else ifn E 105 ifn E 98 ifl E 120 J cw_bad end ifg E 122 J cw_bad end end end I F -1 end W 3002 F R F 3004 I F 1 ifg F 20 J cw_bad end W 3004 F R J 3000 A J 3100 W J E R E 3000 I E 1 W 3000 E J un_input
un_input_done: R E 3003 ifn E 1 J cw_bad end R E 3002 ifn E Z J cw_bad end R L 3000 I L -1 M K Z
un_end_node: M I 3100 A I L R E I ife E 112 I K -2 M I 3500 A I K R F I I K 1 else M F L I F 1 M I 3500 A I K W I F I K 1 end M I 3200 A I L W I F I L -1 ifge L Z J un_end_node end W 3400 Z R E 3001 W 3401 E W 3005 2
un_solve: R E 3005 ife E Z J un_success end I E -2 W 3005 E M I 3400 A I E R A I M F I/1 W 3006 F C S un_deref W 3007 A R A 3006 C S un_deref W 3008 A R G 3007 ife G A J un_solve end M I 3100 A I G R E I ifge E 120 M I 3100 A I A R F I ife E F J un_solve end W 3009 E W 3010 A J un_bind end M I 3100 A I A R F I ifge F 120 W 3009 F W 3010 G J un_bind end ifn E F M A @un_mismatch J stats_label end ifn E 112 J un_solve end R G 3007 R H 3008 I G 1 I H 1 R E 3005 M I 3400 A I E W I G M I/1 H M J 3200 A J G R G J M J 3200 A J H R H J M I/2 G M I/3 H I E 4 W 3005 E J un_solve
un_bind: R E 3009 S E 120 W 3009 E R A 3010 W 3500 A W 3011 1
un_occurs: R E 3011 ife E Z R I 3009 A I 3300 R E 3010 W I E J un_solve end I E -1 W 3011 E M I 3500 A I E R A I C S un_deref M I 3100 A I A R F I ifge F 120 S F 120 R E 3009 ife E F M A @un_cycle J stats_label end else ife F 112 I A 1 R E 3011 M I 3500 A I E W I A M J 3200 A J A R F J M I/1 F I E 2 W 3011 E end end J un_occurs
un_deref: M I 3100 A I A R E I ifl E 120 O S P end S E 120 M I 3300 A I E R E I ifl E Z O S P end M A E J un_deref
un_success: W 3012 Z W 3013 Z M L Z
un_variable: M I 3300 A I L R E I ifl E Z J un_variable_next end M A L A A 120 C S un_emit M A 61 C S un_emit M I 3300 A I L R E I W 3500 E W 3011 1
un_expand: R E 3011 ife E Z M A 32 C S un_emit J un_variable_next end I E -1 W 3011 E M I 3500 A I E R A I C S un_deref M I 3100 A I A R F I M G A M A F C S un_emit ife F 112 I G 1 R E 3011 M I 3500 A I E M J 3200 A J G R H J W I H M I/1 G I E 2 W 3011 E end J un_expand
un_variable_next: I L 1 ifl L 3 J un_variable end R E 3013 ifn E Z M A @un_output_limit J stats_label end M A @un_yes C S stats_label M A 27 C S cw_pad R K 3012 ife K Z M A @un_none J stats_label end I K -1 M J Z
un_output: ifge J K M A Z O S P end M I 3700 A I J R A I C S app_put I J 1 J un_output
un_emit: R E 3012 ifge E 135 W 3013 1 O S P end M I 3700 A I E W I A I E 1 W 3012 E O S P
un_mismatch: ${ascii('NO UNIFIER: constructors')}
un_cycle: ${ascii('NO UNIFIER: occurs check')}
un_yes: ${ascii('UNIFIED (prefix types)')}
un_none: ${ascii('No substitutions needed')}
un_output_limit: ${ascii('UNIFIED; OUTPUT LIMIT (134)')}
${common}`;
COMPILER_WORKSHOP.push({number:351,kind:'text',id:'type-unifier',site:'relay',title:'Type Unifier',inputs:['type=type'],outputs:['Bindings / occurs check'],description:'Unify two prefix types, each at most twenty symbols. i and b are distinct base types, x/y/z are variables, and p takes two following types (a pair). Example pxi=pby gives x=b y=i. Finds a most-general substitution and expands chained bindings transitively. Unbound variables remain free. Distinct constructors fail; binding a variable to a type containing itself fails the occurs check. Equal types need no substitutions. If fully expanded substitutions exceed 134 characters, reports UNIFIED; OUTPUT LIMIT explicitly.',algorithm:unify,examples:[{input:"pxi=pby",output:row("UNIFIED (prefix types)")+"x=b y=i"}]});
