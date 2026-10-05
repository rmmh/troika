import type {BoardSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');

export const RULE_LOOM:BoardSoftware={
 number:221,kind:'board',id:'rule-loom',site:'comet',title:'Comet Rule Loom',columns:8,rows:8,
 stepKey:'n',counterLabel:'Gens',controls:'Enter:rule/seed N:grow',
 inputs:['Top: rule bits','Bottom: seed'],outputs:['Pattern history'],
 description:'Grow an eight-cell circular pattern with a programmable neighborhood rule. The top row gives outputs for neighborhoods 000 through 111, left to right; Enter toggles a bit. Enter on the bottom row toggles a seed cell. N computes the next generation and scrolls the previous six rows upward. Left and right edges meet. Editing a rule or seed clears history and the generation counter, keeping the current bottom row. Middle rows are read-only. R restores rule 30 and a single seed; F1 exits.',
 algorithm:`game_reset: M I game_board M J @loom_rule M K 8
loom_rule_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J loom_rule_copy
 M I 2956 M K 8
loom_seed_clear: W I 46 I I 1 I K -1 N K Z J loom_seed_clear W 2960 42
 J loom_clear_history
game_move: ifl A 8 M I game_board A I A R E I M F 97 S F E W I F J loom_clear_history end
 ifl A 56 O S P end M I game_board A I A R E I M F 88 S F E W I F
loom_clear_history: W game_moves Z M I 2908 M K 48
loom_history_clear: W I 46 I I 1 I K -1 N K Z J loom_history_clear
 W game_message @loom_prompt O S P
game_key: E A 1 J loom_step E A -26 J loom_step M A Z O S P
loom_step: M I 2956 M J 3000 M K 8
loom_snapshot: R E I W J E I I 1 I J 1 I K -1 N K Z J loom_snapshot
 M I 2908 M J 2916 M K 48
loom_scroll: R E J W I E I I 1 I J 1 I K -1 N K Z J loom_scroll
 M G Z
loom_cell: M H Z M J G I J -1 ifl J Z M J 7 end M I 3000 A I J R E I E E 42 I H 4
 M I 3000 A I G R E I E E 42 I H 2
 M J G I J 1 ife J 8 M J Z end M I 3000 A I J R E I E E 42 I H 1
 M I game_board A I H R E I M F 46 E E 49 M F 42 M I 2956 A I G W I F
 I G 1 ifl G 8 J loom_cell end C S game_count_move W game_message @loom_prompt M A 1 O S P
loom_rule: ${ascii('01111000')}
loom_prompt: ${ascii('Top:000..111 Bottom:seed')}`,
 examples:[{moves:[],steps:1,board:'01111000'+'.'.repeat(44)+'*'+'.'.repeat(6)+'***..',status:0,movesMade:1}],
};
