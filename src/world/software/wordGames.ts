import type { TextSoftware } from './native';
export const WORD_LEXICON=Object.freeze(['cat','cot','cog','dog','dot','bat','bag','bug','bun','fun','fan','fin','fit','fat','rat','rag','rug','run','sun','sin','sit','sat','set','bet','all','eel','too']);
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const dictionary=`word_dictionary: ${ascii(WORD_LEXICON.join(''))}`;
const lower=`word_lower: ifge A 65 ifle A 90 A A 32 end end ifl A 97 J app_bad end ifg A 122 J app_bad end O S P`;
const bad='app_bad: M A -1 O S P';
const lexicon=' Dictionary: '+WORD_LEXICON.join(' ')+'.';
export const WORD_GAME_SOFTWARE:TextSoftware[] = [
  {
    number:160,kind:'text',id:'word-ladder',site:'letters',title:'Three-Letter Word Ladder',
    description:'Enter start|end using two three-letter words from the fixed practice dictionary. ASCII case is ignored. Native breadth-first search finds a shortest ladder changing exactly one letter at each step; equal routes follow dictionary order. Output includes both endpoints. NONE means known words are disconnected; unknown words or malformed input are errors.'+lexicon,
    inputs:['Start|end'],outputs:['Shortest ladder'],
    algorithm:`app_compute: R E 2610 ifn E 7 J app_bad end R E 2555 ifn E 124 J app_bad end M J Z
ladder_input: M I 2552 A I J ifge J 3 I I 1 end R A I C S word_lower ifl A Z O S P end M I 2900 A I J W I A I J 1 ifl J 6 J ladder_input end M J 2900 C S ladder_lookup ifl A Z O S P end W 3200 A M J 2903 C S ladder_lookup ifl A Z O S P end W 3201 A M J Z
ladder_clear: M I 3000 A I J W I -1 I J 1 ifl J 27 J ladder_clear end R G 3200 M I 3000 A I G W I G W 3100 G W 3202 Z W 3203 1
ladder_queue: R E 3202 R F 3203 ifge E F J ladder_none end M I 3100 A I E R H I I E 1 W 3202 E R E 3201 ife H E J ladder_trace end M G Z
ladder_neighbor: M I 3000 A I G R E I ifn E -1 J ladder_next end M I H P I 3 A I @word_dictionary M K G P K 3 A K @word_dictionary M D 3 M E Z
ladder_distance: R F I R A K ifn F A I E 1 end I I 1 I K 1 I D -1 N D Z J ladder_distance ife E 1 M I 3000 A I G W I H R E 3203 M I 3100 A I E W I G I E 1 W 3203 E end
ladder_next: I G 1 ifl G 27 J ladder_neighbor end J ladder_queue
ladder_trace: M J H M K Z
ladder_parent: M I 3300 A I K W I J I K 1 R E 3200 ife J E J ladder_emit_start end M I 3000 A I J R J I J ladder_parent
ladder_emit_start: I K -1
ladder_emit: ifl K Z M A Z O S P end R E 2620 ifn E Z M A 32 C S app_put M A 62 C S app_put M A 32 C S app_put end M I 3300 A I K R J I P J 3 A J @word_dictionary M L 3
ladder_word: R A J C S app_put I J 1 I L -1 N L Z J ladder_word I K -1 J ladder_emit
ladder_lookup: M G Z
ladder_lookup_word: ifge G 27 J app_bad end M I G P I 3 A I @word_dictionary R E I R F J N E F J ladder_lookup_next M E I/1 M F J/1 N E F J ladder_lookup_next M E I/2 M F J/2 N E F J ladder_lookup_next M A G O S P
ladder_lookup_next: I G 1 J ladder_lookup_word
ladder_none: M A 78 C S app_put M A 79 C S app_put M A 78 C S app_put M A 69 J app_put
${lower}
${dictionary}
${bad}`,
    examples:[{input:'cat|dog',output:'cat > cot > cog > dog'},{input:'CAT|cat',output:'cat'},{input:'all|eel',output:'NONE'},{input:'zzz|cat',error:true}],
  },
  {
    number:161,kind:'text',id:'letter-rack',site:'riddles',title:'Three-Letter Rack Solver',
    description:'Enter three to eight ASCII letters or ? blanks. Case is ignored. Native frequency counting lists every dictionary word that can be made from a subset of the rack, using each letter or blank at most once per word. Duplicate letters in a word need separate tiles. Results follow dictionary order and NONE means no matches. Each candidate starts with the complete rack.'+lexicon,
    inputs:['Letters and ?'],outputs:['Possible words'],
    algorithm:`app_compute: R E 2610 ifl E 3 J app_bad end ifg E 8 J app_bad end M J Z W 3200 Z
rack_clear: M I 2900 A I J W I Z I J 1 ifl J 26 J rack_clear end M J 2552 R K 2610
rack_input: R A J ife A 63 R E 3200 I E 1 W 3200 E else C S word_lower ifl A Z O S P end S A 97 M I 2900 A I A R E I I E 1 W I E end I J 1 I K -1 N K Z J rack_input M G Z
rack_candidate: M J Z
rack_copy: M I 2900 A I J R E I M I 3000 A I J W I E I J 1 ifl J 26 J rack_copy end R H 3200 M K G P K 3 A K @word_dictionary M D 3
rack_take: R E K S E 97 M I 3000 A I E R E I ifg E Z I E -1 W I E else ife H Z J rack_next end I H -1 end I K 1 I D -1 N D Z J rack_take R E 2620 ifn E Z M A 32 C S app_put end M J G P J 3 A J @word_dictionary M K 3
rack_emit: R A J C S app_put I J 1 I K -1 N K Z J rack_emit
rack_next: I G 1 ifl G 27 J rack_candidate end R E 2620 ife E Z M A 78 C S app_put M A 79 C S app_put M A 78 C S app_put M A 69 C S app_put end M A Z O S P
${lower}
${dictionary}
${bad}`,
    examples:[{input:'cat',output:'cat'},{input:'C?T',output:'cat cot'},{input:'al?',output:'all'},{input:'alx',output:'NONE'},{input:'???',output:WORD_LEXICON.join(' ')},{input:'a!',error:true}],
  },
];
