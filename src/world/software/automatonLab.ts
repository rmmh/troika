import type {TextSoftware} from './native';
const chars=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const header=(s:string)=>s.padEnd(27);
export const AUTOMATON_LAB:TextSoftware={
 number:317,kind:'text',id:'automaton-lab',site:'relay',title:'Finite Automaton Lab',
 inputs:['rules|word|final'],outputs:['Decision and state path'],
 description:'Build a deterministic finite automaton over letters a and b. Enter comma-separated rules, then |word|final states. A rule 0a1 means state 0 reading a goes to state 1. States are digits 0..5; start is always 0. Example 0a1,1b2|ab|2 accepts and traces 0 1 2. Give 1..12 rules and at least one final-state digit; no spaces. Duplicate rules for a state/letter and duplicate final digits are errors. An empty word is allowed. Acceptance requires consuming the entire word and ending in a final state. A missing transition rejects and stops the trace before that letter. All parsing and transitions run natively.',
 examples:[{input:'0a1,1b2|ab|2',output:header('ACCEPT: final state reached')+'Path: 0 1 2'},{input:'0a1||0',output:header('ACCEPT: final state reached')+'Path: 0'},{input:'0a1|aa|1',output:header('REJECT: missing transition')+'Path: 0 1'},{input:'0a1|a|0',output:header('REJECT: not a final state')+'Path: 0 1'},{input:'0a1,0a2|a|2',error:true}],
 algorithm:`app_compute: M I 3000 M K 12
fa_clear: W I -1 I I 1 I K -1 N K Z J fa_clear M I 3020 M K 6 K I K
 M I 2552 R K 2610
fa_rule: ifl K 4 J fa_bad end R E I S E 48 ifl E Z J fa_bad end ifg E 5 J fa_bad end
 M F I/1 S F 97 ifl F Z J fa_bad end ifg F 1 J fa_bad end
 M G I/2 S G 48 ifl G Z J fa_bad end ifg G 5 J fa_bad end
 M J E P J 2 A J F A J 3000 R H J N H -1 J fa_bad W J G
 I I 3 I K -3 R E I I I 1 I K -1 E E 124 J fa_word N E 44 J fa_bad J fa_rule
fa_word: W 3100 I W 3101 Z
fa_word_next: E K Z J fa_bad R E I I I 1 I K -1 E E 124 J fa_finals
 ifl E 97 J fa_bad end ifg E 98 J fa_bad end R F 3101 I F 1 W 3101 F J fa_word_next
fa_finals: E K Z J fa_bad
fa_final_next: R E I S E 48 ifl E Z J fa_bad end ifg E 5 J fa_bad end
 M J 3020 A J E R F J N F Z J fa_bad W J 1 I I 1 I K -1 N K Z J fa_final_next
 M G Z W 3200 Z W 3102 1 R I 3100 R K 3101
fa_step: E K Z J fa_finish R F I S F 97 M J G P J 2 A J F A J 3000 R G J E G -1 J fa_missing
 R H 3102 M J 3200 A J H W J G I H 1 W 3102 H I I 1 I K -1 J fa_step
fa_finish: M J 3020 A J G R E J ife E Z M A @fa_reject else M A @fa_accept end J fa_output
fa_missing: M A @fa_missing_text
fa_output: M B 27 C S app_emit M A @fa_path M B 6 C S app_emit M J 3200 R K 3102
fa_trace: R A J A A 48 C S app_put I J 1 I K -1 E K Z O S P M A 32 C S app_put J fa_trace
fa_bad: M A -1 O S P
fa_accept: ${chars(header('ACCEPT: final state reached'))}
fa_reject: ${chars(header('REJECT: not a final state'))}
fa_missing_text: ${chars(header('REJECT: missing transition'))}
fa_path: ${chars('Path: ')}`,
};
