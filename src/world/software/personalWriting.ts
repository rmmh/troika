import type {DocumentSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const REPORT=`wr_text: J doc_report_text
wr_pad: R E doc_report_len ifge E B O S P end M A 32 C S doc_report_put J wr_pad
wr_number: M H 1000 M L Z
wr_digit: M G F Q G H M E G P E H ifg E F I G -1 S E H end S F E ifn G Z M L 1 end ife H 1 M L 1 end ifn L Z M A G A A 48 C S doc_report_put end Q H 10 N H Z J wr_digit O S P`;
const phrases=['rain','a blue cup','small birds','warm windows','waits','turns slowly','listens','drifts','at dawn','by the door','under leaves','near home'];
const poet=`
doc_app_init: W 3808 1 W 3809 Z ${phrases.map((v,i)=>`W ${3000+i*55} ${v.length} M A ${3001+i*55} M B @poet_word${i} M C ${v.length} C S doc_copy`).join(' ')} C S poet_pick W doc_message @poet_controls O S P
doc_app_validate: ifg B 12 J poet_bad end R E A ife E 58 J poet_bad end M A Z O S P
poet_bad: M A -1 O S P
doc_app_key: E A 110 J poet_next E A 78 J poet_next E A 102 J poet_form E A 70 J poet_form E A 104 J poet_help E A 72 J poet_help E A 63 J poet_seed_help M A Z O S P
poet_next: C S poet_pick W doc_message @poet_controls M A 1 O S P
poet_form: R E 3809 I E 1 ife E 3 M E Z end W 3809 E W doc_message @poet_controls M A 1 O S P
poet_help: W doc_message @poet_banks M A 1 O S P
poet_seed_help: W doc_message @poet_seed_tip M A 1 O S P
doc_app_command: E B Z J poet_normal R E A N E 58 J poet_normal ifl B 7 J poet_bad end ifg B 10 J poet_bad end M I A ${[...'seed '].map((c,i)=>`M E I/${i+1} N E ${c.charCodeAt(0)} J poet_bad`).join(' ')} M J A A J 6 M K B I K -6 M G Z
poet_seed_digits: R E J ifl E 48 J poet_bad end ifg E 57 J poet_bad end ifg G 900 J poet_bad end ife G 900 ifg E 48 J poet_bad end end P G 10 S E 48 A G E I J 1 I K -1 N K Z J poet_seed_digits W 3808 G C S poet_pick W doc_message @poet_controls M A 1 O S P
poet_normal: M A Z O S P
; Advance balanced-ternary generator three times, then choose a nonempty phrase
; from each four-record bank. Empty banks yield an explicit placeholder.
poet_pick: W 3814 Z
poet_pick_bank: R G 3808 P G 17 A G 43 F G A W 3808 G M E G Q E 4 M F E P F 4 ifg F G I E -1 S F 4 end S G F R E 3814 M I 3810 A I E W I G I E 1 W 3814 E ifl E 3 J poet_pick_bank end O S P
poet_phrase:
 ; F=bank0..2. Selection searches forward through empty slots, wrapping bank.
 M E F P E 4 W 3815 E M I 3810 A I F R G I M L Z
poet_seek: R E 3815 A E G P E 55 A E 3000 R H E ifn H Z I E 1 M I E J poet_emit end I G 1 ife G 4 M G Z end I L 1 ifl L 4 J poet_seek end M A @poet_empty J wr_text
poet_emit: R A I C S doc_report_put I I 1 I H -1 N H Z J poet_emit O S P
doc_app_report: C S doc_report_reset R E 3809 M I @poet_forms A I E R A I C S wr_text R F 3808 C S wr_number M B 27 C S wr_pad M F Z C S poet_phrase
 R E 3809 ife E 2 M A 32 C S doc_report_put M F 1 C S poet_phrase end M B 54 C S wr_pad
 R E 3809 ife E 2 M F 2 C S poet_phrase else M F 1 C S poet_phrase R E 3809 ife E 1 M A 32 C S doc_report_put M F 2 C S poet_phrase end end M B 81 C S wr_pad
 R E 3809 ife E Z M F 2 J poet_phrase end ife E 1 M F Z J poet_phrase end M A @poet_short_help J wr_text
${REPORT}
poet_forms: @poet_triptych @poet_echo @poet_couplet
poet_triptych: ${ascii('Triptych seed ')}
poet_echo: ${ascii('Echo seed ')}
poet_couplet: ${ascii('Couplet seed ')}
poet_controls: ${ascii('N next F form H banks ?seed')}
poet_banks: ${ascii('1-4 image 5-8 act 9-12 site')}
poet_seed_tip: ${ascii('Enter command :seed 0..9000')}
poet_short_help: ${ascii('N next F form H banks')}
poet_empty: ${ascii('(empty)')}
${phrases.map((v,i)=>`poet_word${i}: ${ascii(v)}`).join('\n')}`;
export const TEA_HOUSE_POET:DocumentSoftware={number:226,kind:'document',id:'tea-house-poet',site:'tea',title:'Tea House Poet',dataPath:'/tea-words',inputs:['Twelve phrases'],outputs:['Native verse'],algorithm:poet,description:'Write short free verse from editable phrase banks: records 1..4 are images, 5..8 actions and 9..12 places. Each phrase has up to 12 printable characters and cannot begin with :. Empty records are skipped; an entirely empty bank is marked (empty). N advances a deterministic native generator. F cycles Triptych (three separate phrases), Echo (image, action/place, image) and Couplet (image/action, place). H shows the bank map; ? shows the seed command. Edit a draft to :seed 42 for a repeatable choice; seeds are 0..9000. The displayed seed is the state after choosing three phrases. S saves wordbanks to /tea-words; L reloads. Form and seed start fresh on launch. F1 cancels editing or exits with an unsaved-change prompt.',examples:[{records:phrases,commands:[':seed 42']}]};
const recipes=`
doc_app_init: W 3808 Z W 3913 Z W doc_message @recipe_format O S P
doc_app_validate: J recipe_parse
recipe_bad: M A -1 O S P
recipe_parse:
 W 3863 A W 3864 Z M J A M K B M H Z M D Z E K Z J recipe_bad R E J E E 58 J recipe_bad
recipe_name: E K Z J recipe_bad R E J E E 124 J recipe_name_end ifl E 32 J recipe_bad end ifg E 126 J recipe_bad end ifn E 32 M D 1 end I H 1 ifg H 18 J recipe_bad end I J 1 I K -1 J recipe_name
recipe_name_end: E H Z J recipe_bad E D Z J recipe_bad W 3864 H I J 1 I K -1 W 3865 J M H Z M D Z
recipe_tags: E K Z J recipe_bad R E J E E 124 J recipe_tags_end ife E 44 E D Z J recipe_bad M D Z else ifl E 97 J recipe_bad end ifg E 122 J recipe_bad end M D 1 end I H 1 I J 1 I K -1 J recipe_tags
recipe_tags_end: ifn H Z E D Z J recipe_bad end W 3866 H I J 1 I K -1 W 3867 J W 3868 K E K Z J recipe_bad M D Z
recipe_ingredients: R E J ife E 32 E D Z J recipe_bad M D Z else ifl E 97 J recipe_bad end ifg E 122 J recipe_bad end M D 1 end I J 1 I K -1 N K Z J recipe_ingredients E D Z J recipe_bad M A Z O S P
doc_app_command:
 E B Z J recipe_normal R E A N E 58 J recipe_normal ifl B 5 J recipe_bad end M I A ${[...'find'].map((c,i)=>`M E I/${i+1} N E ${c.charCodeAt(0)} J recipe_bad`).join(' ')} ife B 5 W 3808 Z W 3913 Z W doc_message @recipe_query_set M A 1 O S P end M E I/5 N E 32 J recipe_bad ife B 6 J recipe_bad end
 W 3880 A W 3881 B M J A A J 6 M K B I K -6 M G Z M D Z
recipe_query_validate: E K Z J recipe_query_end R E J ife E 32 ifn D 2 J recipe_bad end M D Z else ife D Z ife E 43 M D 1 J recipe_query_char end ife E 45 M D 1 J recipe_query_char end ife E 33 M D 1 J recipe_query_char end end ifl E 97 J recipe_bad end ifg E 122 J recipe_bad end M D 2 end
recipe_query_char: I J 1 I K -1 J recipe_query_validate
recipe_query_end: ifn D 2 J recipe_bad end R B 3880 A B 6 R C 3881 I C -6 W 3808 C M A 3809 C S doc_copy W 3913 Z W doc_message @recipe_query_set M A 1 O S P
recipe_normal: M A Z O S P
doc_app_key: E A 110 J recipe_next E A 78 J recipe_next E A 112 J recipe_previous E A 80 J recipe_previous E A 106 J recipe_jump E A 74 J recipe_jump E A 104 J recipe_help E A 72 J recipe_help E A 63 J recipe_query_help M A Z O S P
recipe_help: W doc_message @recipe_format M A 1 O S P
recipe_query_help: W doc_message @recipe_query_tip M A 1 O S P
recipe_next: R E 3912 E E Z J recipe_ignored R F 3913 I F 1 ifge F E M F Z end W 3913 F M A 1 O S P
recipe_previous: R E 3912 E E Z J recipe_ignored R F 3913 I F -1 ifl F Z M F E I F -1 end W 3913 F M A 1 O S P
recipe_jump: R E 3912 E E Z J recipe_ignored M I 3900 R E 3913 A I E R E I W doc_selected E M A 1 O S P
recipe_ignored: M A Z O S P
; Compare each query token to complete tags/ingredient words. All positive
; terms must exist, all exclusions must be absent. No substring shortcuts.
recipe_match: W 3882 3809 R E 3808 W 3883 E
recipe_query_term: R K 3883 E K Z J recipe_match_yes R J 3882 W 3884 J W 3885 Z W 3886 Z R E J
 ife E 43 W 3886 1 I J 1 I K -1 else ife E 45 W 3886 2 I J 1 I K -1 else ife E 33 W 3886 3 I J 1 I K -1 end end end W 3884 J M H Z
recipe_term_chars: E K Z J recipe_term_ready R E J E E 32 J recipe_term_ready I H 1 I J 1 I K -1 J recipe_term_chars
recipe_term_ready: W 3885 H ifn K Z I J 1 I K -1 end W 3882 J W 3883 K R E 3886 ife E 1 R J 3865 R K 3866 M L 44 else ife E 2 R J 3865 R K 3866 M L 44 else R J 3867 R K 3868 M L 32 end end W 3887 Z
recipe_scan: E K Z J recipe_scan_done M G J M H Z
recipe_scan_length: E K Z J recipe_scan_compare R E J E E L J recipe_scan_compare I H 1 I J 1 I K -1 J recipe_scan_length
recipe_scan_compare: R E 3885 ifn H E J recipe_scan_next end M I G R F 3884 M D H
recipe_compare_word: E D Z J recipe_found R E I R A F ifn E A J recipe_scan_next end I I 1 I F 1 I D -1 J recipe_compare_word
recipe_found: W 3887 1 J recipe_scan_done
recipe_scan_next: ifn K Z I J 1 I K -1 end J recipe_scan
recipe_scan_done: R E 3886 R F 3887 ifge E 2 ifn F Z M A -1 O S P end else ife F Z M A -1 O S P end end J recipe_query_term
recipe_match_yes: M A Z O S P
; Insertion sort matching record indices by case-folded name. Ties retain
; original slot order, so navigation stays deterministic after every redraw.
doc_app_report: W 3912 Z W 3890 Z
recipe_collect: R E 3890 P E 55 A E 3000 R B E ife B Z J recipe_collect_next end M A E I A 1 C S recipe_parse N A Z J recipe_collect_next C S recipe_match N A Z J recipe_collect_next
 R E 3912 M I 3900 A I E R F 3890 W I F I E 1 W 3912 E
recipe_collect_next: R E 3890 I E 1 W 3890 E ifl E 12 J recipe_collect end W 3891 1
recipe_sort_outer: R E 3891 R F 3912 ifge E F J recipe_sorted end W 3892 E
recipe_sort_inner: R E 3892 E E Z J recipe_sort_next M I 3900 A I E R G I M H I/-1 P G 55 A G 3000 P H 55 A H 3000 R K G R L H I G 1 I H 1
recipe_name_compare: E K Z J recipe_shorter E L Z J recipe_sort_next R E G R F H ife E 124 ife F 124 J recipe_sort_next end J recipe_swap end ife F 124 J recipe_sort_next end ifge E 65 ifle E 90 A E 32 end end ifge F 65 ifle F 90 A F 32 end end ifl E F J recipe_swap end ifg E F J recipe_sort_next end I G 1 I H 1 I K -1 I L -1 J recipe_name_compare
recipe_shorter: E L Z J recipe_sort_next
recipe_swap: R E 3892 M I 3900 A I E R G I M H I/-1 W I H M I/-1 G I E -1 W 3892 E J recipe_sort_inner
recipe_sort_next: R E 3891 I E 1 W 3891 E J recipe_sort_outer
recipe_sorted: R E 3913 R F 3912 ifge E F W 3913 Z end C S doc_report_reset M A @recipe_matches C S wr_text R F 3912 C S wr_number M A @recipe_result C S wr_text R F 3913 R E 3912 ifn E Z I F 1 end C S wr_number M B 27 C S wr_pad
 R E 3912 ife E Z M A @recipe_none C S wr_text else M I 3900 R E 3913 A I E R E I P E 55 A E 3000 R B E M A E I A 1 C S recipe_parse R I 3863 R H 3864
recipe_show_name: R A I C S doc_report_put I I 1 I H -1 N H Z J recipe_show_name end
 M B 54 C S wr_pad M A @recipe_find C S wr_text M I 3809 R H 3808 ifg H 22 M H 22 end
recipe_show_query: E H Z J recipe_show_done R A I C S doc_report_put I I 1 I H -1 J recipe_show_query
recipe_show_done: M B 81 C S wr_pad M A @recipe_controls J wr_text
${REPORT}
recipe_format: ${ascii('NAME|tag,tag|food words')}
recipe_query_tip: ${ascii(':find oat +sweet -nut !milk')}
recipe_query_set: ${ascii('Query set; N/P results J:go')}
recipe_matches: ${ascii('Matches ')}
recipe_result: ${ascii(' result ')}
recipe_none: ${ascii('No matches; :find clears')}
recipe_find: ${ascii('Find ')}
recipe_controls: ${ascii('N/P next J:go H:format ?:q')}`;
export const RECIPE_INDEX:DocumentSoftware={number:227,kind:'document',id:'recipe-index',site:'citrus',title:'Recipe Index',dataPath:'/recipes',inputs:['Name/tags/foods'],outputs:['Filtered index'],algorithm:recipes,description:'Index twelve recipes as NAME|tag,tag|ingredient words, up to 54 characters total. Names use 1..18 printable characters and cannot begin with :. Tags and ingredient words use lowercase letters; separate tags by commas and ingredient words by single spaces. Tags may be empty; ingredients are required. This is an index, not a full recipe editor. Enter a draft command :find oat +sweet -nut !milk: ordinary terms require whole ingredient words, + requires an exact tag, - excludes a tag, and ! excludes an ingredient. Every term must match. :find alone clears the query. Results sort alphabetically by name, ignoring case; equal names retain slot order. N/P cycle results and J selects that recipe for editing. H shows the format; ? shows query syntax. The report displays the first 22 query characters. S saves recipes to /recipes; L reloads. Queries start empty each launch.',examples:[{records:['Oat biscuits|sweet|oat flour','Nut oats|sweet,nut|oat almond','Rice bowl|savory|rice pea'],commands:[':find oat +sweet -nut']}]};
export const PERSONAL_WRITING:DocumentSoftware[]=[TEA_HOUSE_POET,RECIPE_INDEX];
