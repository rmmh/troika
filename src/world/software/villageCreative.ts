import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const copy=`village_copy: M I game_board M J @village_initial M K game_cells
village_copy_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J village_copy_loop O S P`;
export const VILLAGE_CREATIVE:BoardSoftware[]=[
{number:194,kind:'board',id:'matchbox-room',site:'miniature',title:'Matchbox Furnisher',columns:6,rows:6,stepKey:'n',counterLabel:'Items',controls:'Enter:place N:turn R:reset',inputs:['Furniture anchor','N: rotate'],outputs:['Room','Door access'],description:'Furnish a matchbox room with a two-square bench B, an L-shaped chair C, then a square table T. Arrows choose the upper-left anchor; Enter places the current shape and N rotates it clockwise. Four turns return to the original orientation. Walls # and door D cannot be covered. Every remaining floor square must still connect to D by side-to-side walking: a placement that cuts off an alcove is rejected. Fit all three pieces to win. R resets; F1 exits.',
algorithm:`game_reset: W 3200 Z C S village_copy W game_message @room_bench O S P
game_key: E A 1 J room_rotate E A -26 J room_rotate M A Z O S P
room_rotate: R E game_status ifn E Z M A Z O S P end R E 3200 I E 1 ife E 4 M E Z end W 3200 E A E 48 W 2904 E C S room_prompt M A 1 O S P
room_prompt: R E game_moves M I @room_prompts A I E R E I W game_message E O S P
game_move: R E game_status N E Z O S P M H A R E game_moves P E 4 R F 3200 A E F M I @room_shapes A I E R J I R K J W 3204 K I J 1 M L 3300
room_validate: R E J A E H M I game_board A I E ifl E Z J room_bad end ifge E 36 J room_bad end R F I N F 46 J room_bad W L I I L 1 I J 1 I K -1 N K Z J room_validate
 R E game_moves M I @room_letters A I E R G I R K 3204 M L 3300
room_place: R I L W I G I L 1 I K -1 N K Z J room_place
 M I 3000 M K 36
room_clear_seen: W I Z I I 1 I K -1 N K Z J room_clear_seen
 W 3206 Z W 3207 Z M A 32 C S room_visit
room_flood: R E 3206 R F 3207 ifge E F J room_check end M I 3100 A I E R H I I E 1 W 3206 E
 M A H I A -6 C S room_visit M A H I A 6 C S room_visit M A H I A -1 C S room_visit M A H I A 1 C S room_visit J room_flood
room_check: M I game_board M K 36 M G Z
room_empty_count: R E I ife E 46 I G 1 end ife E 68 I G 1 end I I 1 I K -1 N K Z J room_empty_count
 R E 3207 ifn E G R K 3204 M L 3300
room_undo: R I L W I 46 I L 1 I K -1 N K Z J room_undo W game_message @room_blocked O S P end
 C S game_count_move W 3200 Z W 2904 48 R E game_moves ife E 3 W game_status 1 W game_message @room_win else C S room_prompt end O S P
room_bad: W game_message @room_overlap O S P
room_visit: ifl A Z O S P end ifge A 36 O S P end M I game_board A I A R E I ifn E 46 ifn E 68 O S P end end M I 3000 A I A R E I N E Z O S P W I 1 R E 3207 M I 3100 A I E W I A I E 1 W 3207 E O S P
village_initial: ${ascii('TURN0##....##....##....##....###D###')}
room_shapes: @room_b0 @room_b1 @room_b0 @room_b1 @room_c0 @room_c1 @room_c2 @room_c3 @room_t @room_t @room_t @room_t
room_b0: 2 0 1
room_b1: 2 0 6
room_c0: 3 0 6 7
room_c1: 3 0 1 6
room_c2: 3 0 1 7
room_c3: 3 1 6 7
room_t: 4 0 1 6 7
room_letters: 66 67 84
room_prompts: @room_bench @room_chair @room_table
room_bench: ${ascii('Bench B: 2 cells. N rotates')}
room_chair: ${ascii('Chair C: L shape. N rotates')}
room_table: ${ascii('Table T: 2 by 2 square')}
room_overlap: ${ascii('Needs clear floor: try again')}
room_blocked: ${ascii('Would block a path to D')}
room_win: ${ascii('A furnished, walkable room!')}
${copy}`,
examples:[{moves:[7],board:'TURN0##BB..##....##....##....###D###',status:0,movesMade:1},{moves:[7,14,9],board:'TURN0##BBTT##.CTT##.CC.##....###D###',status:1,movesMade:3}]},
{number:195,kind:'board',id:'beacon-echo',site:'lighthouse',title:'Beacon Echo',columns:8,rows:3,stepKey:'n',counterLabel:'Round',controls:'N:show/hide Enter:answer',inputs:['Four light pads','N: show/hide'],outputs:['Light sequence','Answer progress'],description:'Remember the keeper\'s light sequence. N shows it; N again hides it and arms the four pads 1..4 on the bottom row. Select each answer with arrows and Enter. Stars show how far you have answered. Each correct round adds a light, up to eight. A wrong pad ends the game. N may replay the current sequence and clears the partial answer; using a pad while the lights are showing does nothing. R restarts the same native-generated practice sequence; F1 exits.',
algorithm:`game_reset: W 3200 Z W 3201 Z M G 17 M J 3000 M K 8
beacon_generate: M A G P A 5 I A 1 M B 97 C S app_div M G C M A C M B 4 C S app_div A C 49 W J C I J 1 I K -1 N K Z J beacon_generate C S village_copy W game_message @beacon_start J beacon_render
game_key: E A 1 J beacon_toggle E A -26 J beacon_toggle M A Z O S P
beacon_toggle: R E game_status ifn E Z M A Z O S P end R E 3200 ife E 1 W 3200 2 W game_message @beacon_answer else W 3200 1 W game_message @beacon_look end W 3201 Z C S beacon_render M A 1 O S P
game_move: R E game_status N E Z O S P R E 3200 N E 2 O S P ifl A 16 O S P end ifge A 20 O S P end S A 16 A A 49 R G 3201 M I 3000 A I G R E I ifn A E W game_status 2 W 3200 1 W game_message @beacon_wrong J beacon_render end I G 1 W 3201 G R E game_moves I E 1 ife E G C S game_count_move R E game_moves ife E 8 W game_status 1 W 3200 1 W game_message @beacon_win else W 3200 Z W 3201 Z W game_message @beacon_next end end
beacon_render: M I game_board M J 3000 M K Z R H game_moves I H 1 ifg H 8 M H 8 end
beacon_cells: M E 46 R F 3200 ife F 1 ifl K H R E J end end W I E M E 46 R F 3201 ifl K F M E 42 end M I/8 E I I 1 I J 1 I K 1 ifl K 8 J beacon_cells end O S P
village_initial: ${ascii('................1234....')}
beacon_start: ${ascii('N: look at the first light')}
beacon_look: ${ascii('Remember these. N hides')}
beacon_answer: ${ascii('Choose pads in order')}
beacon_next: ${ascii('Correct! N shows next round')}
beacon_wrong: ${ascii('Wrong light. R retries')}
beacon_win: ${ascii('Eight rounds echoed!')}
${copy}
${POSITIVE_DIVISION}`,
examples:[{moves:[],steps:1,board:'3...............1234....',status:0,movesMade:0}]},
{number:196,kind:'board',id:'gazette-search',site:'gazette',title:'Gazette Word Search',columns:8,rows:8,stepKey:'n',counterLabel:'Found',controls:'Enter:word ends N:clue',inputs:['Word endpoints','N: another clue'],outputs:['Found words','Eight-word goal'],description:'Find TROIKA, MERE, DISK, NIC, ROM, NODE, LAMP and PORT in the Gazette\'s letter square. Words run in any of eight straight directions. Enter on one endpoint, then the other; select endpoints in the spelling order. Entering the same endpoint cancels. Found letters become lowercase, including shared letters; a word counts only once. N cycles word clues and cancels a partial selection. Any listed word may be found regardless of the clue. Find all eight; R resets and F1 exits.',
algorithm:`game_reset: C S village_copy W 3200 -1 W 3204 Z M I 3100 M K 8
search_clear: W I Z I I 1 I K -1 N K Z J search_clear W game_message @search_w0 O S P
game_key: E A 1 J search_clue E A -26 J search_clue M A Z O S P
search_clue: R E game_status ifn E Z M A Z O S P end R E 3204 I E 1 ife E 8 M E Z end W 3204 E W 3200 -1 M I @search_clues A I E R E I W game_message E M A 1 O S P
game_move: R E game_status N E Z O S P R G 3200 ifl G Z W 3200 A W game_message @search_end O S P end ife A G J search_cancel end M H A M A G M B 8 C S app_div M J A M K C M A H M B 8 C S app_div M D A S D J M F C S F K M G D F G A M H F F H A ifn G Z ifn H Z N G H J search_bad end end M K G ifg H K M K H end I K 1 W 3201 K M E Z ifl D Z M E -8 end ifg D Z M E 8 end ifl F Z I E -1 end ifg F Z I E 1 end W 3202 E M L @search_words M H Z
search_word: R E L I L 1 M G L A G E W 3203 G R F 3201 N E F J search_next_word M K E M I L R J 3200 A J game_board
search_compare: R E J ifge E 97 S E 32 end R F I N E F J search_next_word I I 1 R D 3202 A J D I K -1 N K Z J search_compare
 M I 3100 A I H R E I ifn E Z W 3200 -1 W game_message @search_already O S P end W I 1 R J 3200 A J game_board R K 3201
search_mark: R E J ifl E 97 A E 32 W J E end R D 3202 A J D I K -1 N K Z J search_mark C S game_count_move W 3200 -1 R E game_moves ife E 8 W game_status 1 W game_message @search_win else W game_message @search_found end O S P
search_next_word: R L 3203 I H 1 ifl H 8 J search_word end
search_bad: W 3200 -1 W game_message @search_no O S P
search_cancel: W 3200 -1 W game_message @search_cancelled O S P
village_initial: ${ascii('RELRNANOTMORTINIORTRCEAOTROIKATMEPEDISAEDSMRIREROOAASSRENLNELTKI')}
search_words: 6 ${ascii('TROIKA').split(' ').slice(0,-1).join(' ')} 4 ${ascii('MERE').split(' ').slice(0,-1).join(' ')} 4 ${ascii('DISK').split(' ').slice(0,-1).join(' ')} 3 ${ascii('NIC').split(' ').slice(0,-1).join(' ')} 3 ${ascii('ROM').split(' ').slice(0,-1).join(' ')} 4 ${ascii('NODE').split(' ').slice(0,-1).join(' ')} 4 ${ascii('LAMP').split(' ').slice(0,-1).join(' ')} 4 ${ascii('PORT').split(' ').slice(0,-1).join(' ')}
search_clues: @search_w0 @search_w1 @search_w2 @search_w3 @search_w4 @search_w5 @search_w6 @search_w7
search_w0: ${ascii('Find TROIKA (6 letters)')}
search_w1: ${ascii('Find MERE (4 letters)')}
search_w2: ${ascii('Find DISK (4 letters)')}
search_w3: ${ascii('Find NIC (3 letters)')}
search_w4: ${ascii('Find ROM (3 letters)')}
search_w5: ${ascii('Find NODE (4 letters)')}
search_w6: ${ascii('Find LAMP (4 letters)')}
search_w7: ${ascii('Find PORT (4 letters)')}
search_end: ${ascii('Choose its last letter')}
search_found: ${ascii('Word found! N: next clue')}
search_already: ${ascii('That word is already found')}
search_no: ${ascii('Not a listed straight word')}
search_cancelled: ${ascii('Cancelled. Pick a new start')}
search_win: ${ascii('All eight words found!')}
${copy}
${POSITIVE_DIVISION}`,
examples:[{moves:[24,29],board:'RELRNANOTMORTINIORTRCEAOtroikaTMEPEDISAEDSMRIREROOAASSRENLNELTKI',status:0,movesMade:1}]},
{number:197,kind:'board',id:'pocket-sequencer',site:'sol',title:'Pocket Sequencer',columns:8,rows:3,stepKey:'n',counterLabel:'Plays',controls:'Enter:edit N:play Spc:stop',inputs:['Note/rest slots','Tempo 1..3'],outputs:['Edited phrase','APU sound'],description:'Compose an eight-step phrase on the real Troika pulse voice. Enter on a top-row slot cycles rest, C D E F G A B and high c. The middle row shows the current tempo after T; choose 1, 2 or 3 to set slow, medium or fast. N plays the phrase once; the bottom-row star records the final step. Enable sound in the world controls to hear it. Space stops playback and F1 silences and exits immediately at the next short polling interval. Other keys are ignored during playback. The phrase plays once and stops automatically. R restores the starter tune.',
algorithm:`game_reset: C S sequencer_clear C S village_copy W 3200 2 W game_message @sequence_ready O S P
game_move: ifl A 8 M I game_board A I A R E I M J @sequence_notes M K Z
sequence_find_note: R F J E E F J sequence_cycle I J 1 I K 1 J sequence_find_note
sequence_cycle: I K 1 ife K 9 M K Z end M J @sequence_notes A J K R E J W I E W game_message @sequence_ready O S P end ifge A 12 ifle A 14 S A 11 W 3200 A A A 48 W 2909 A end end O S P
game_key: E A 1 J sequence_play E A -26 J sequence_play M A Z O S P
sequence_play: C S sequencer_clear M G Z
sequence_note: M I 2916 M K 8
sequence_cursor_clear: W I 46 I I 1 I K -1 N K Z J sequence_cursor_clear M I 2916 A I G W I 42
 M I game_board A I G R E I M J @sequence_notes M K Z
sequence_pitch: R F J E E F J sequence_start I J 1 I K 1 J sequence_pitch
sequence_start: W 150 Z ifn K Z M I @sequence_periods A I K R E I W 154 E W 155 8 W 153 3 W 150 6561 end
 R E 3200 M I @sequence_ticks A I E R H I
sequence_wait: H 0sAAA -1 R E 68 ife E 4 R E 69 E E 91 J program_menu E E -27 J sequence_stopped end I H -1 N H Z J sequence_wait
 W 150 Z H 0sAAA -1 I G 1 ifl G 8 J sequence_note end C S game_count_move W game_message @sequence_done M A 1 O S P
sequence_stopped: W 150 Z W game_message @sequence_stop M A 1 O S P
sequencer_clear: M I 149 M K 27
sequence_zero: W I Z I I 1 I K -1 N K Z J sequence_zero W 152 9841 O S P
village_initial: ${ascii('C.E.G.c.T2..123.........')}
sequence_notes: ${ascii('.CDEFGABc')}
sequence_periods: 0 74 66 59 55 49 44 39 37
sequence_ticks: 0 8 5 3
sequence_ready: ${ascii('Edit notes, then N to listen')}
sequence_done: ${ascii('Phrase done. N plays again')}
sequence_stop: ${ascii('Stopped. N starts again')}
${copy}`,
examples:[{moves:[0],board:'D.E.G.c.T2..123.........',status:0,movesMade:0}]},
];
