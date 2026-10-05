import type {BoardSoftware,DocumentSoftware} from './native';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const commands:[string,string][]=[['look','look'],['inventory','inventory'],['help','help'],['new','new'],['go north','north'],['north','north'],['go south','south'],['south','south'],['go east','east'],['east','east'],['go west','west'],['west','west'],['examine note','note'],['examine coat','coat'],['examine drawer','drawer'],['examine stairs','stairs'],['examine clock','clock'],['examine clerk','clerk'],['take key','key'],['take wick','wick'],['take oil','oil'],['take afternoon','afternoon'],['use key drawer','unlock'],['combine wick oil','combine'],['combine oil wick','combine'],['use lamp stairs','light'],['use key clock','wind'],['give afternoon clerk','give']];
const events:Record<string,string>={intro:'Your afternoon is missing. The clerk points to a note.',look:'Read this room, exits and objects above. C types a command.',inventory:'Your carried objects are listed under Bag above.',help:'Try examine NOUN, take NOUN, use ITEM TARGET or combine wick oil.',blocked:'There is no open exit that way. Read the exits above.',dark:'The stairs are dark. A working lamp would help.',absent:'That object is not here, or is not available yet.',note:'The note says: a coat keeps the key; a clock keeps your time.',coat:'Inside the coat you discover a small brass key.',drawer:'The drawer is locked. Its brass keyhole catches the light.',stairs:'Unlit stairs lead north. Use a lamp before climbing.',clock:'The clock has stopped. A brass winding hole waits below its face.',clerk:'The clerk says: bring back your afternoon and it will be yours.',key:'You take the brass key.',wick:'You take a dry wick from the open drawer.',oil:'You take a small bottle of oil.',afternoon:'You take the folded afternoon from behind the clock face.',unlock:'The key opens the drawer. A dry wick lies inside.',combine:'Wick and oil become a small lamp. Both ingredients are used.',need:'You need both the dry wick and the oil bottle.',light:'Your lamp lights the stairs. The north passage is now safe.',wind:'The key winds the clock. Its face opens around a folded afternoon.',won:'The clerk unfolds your afternoon. You have your time back.',already:'That has already been done.',unknown:'Unknown command. Try help, look, inventory or examine note.'};
const world=`
; State record 12 is R plus ten digits: room, coat searched, key, drawer,
; wick (0/1/2), oil (0/1/2), lamp, stairs, clock, afternoon (0/1/2).
; Records 1..11 are native-generated narrative views, never editable state.
doc_app_init: C S story_reset W doc_dirty Z O S P
story_reset: M I 3810 M E 10
story_zero: W I Z I I 1 I E -1 N E Z J story_zero W 3820 @ev_intro J story_encode
story_decode: R E 3605 ife E Z C S story_reset end M I 3810 M J 3607 M E 10
story_read_state: R F J S F 48 W I F I I 1 I J 1 I E -1 N E Z J story_read_state O S P
story_encode: M I 3605 M E 55
story_clear_state: W I Z I I 1 I E -1 N E Z J story_clear_state W 3605 11 W 3606 82 M I 3607 M J 3810 M E 10
story_write_state: R F J A F 48 W I F I I 1 I J 1 I E -1 N E Z J story_write_state O S P
doc_app_validate: ifn C 11 M A Z O S P end ifn B 11 J story_bad end R E A N E 82 J story_bad M J A I J 1 M I 3900 M K 10
story_validate_digits: R E J ifl E 48 J story_bad end ifg E 51 J story_bad end S E 48 W I E I I 1 I J 1 I K -1 N K Z J story_validate_digits
 R E 3901 ifg E 1 J story_bad end R E 3902 ifg E 1 J story_bad end R F 3901 ifg E F J story_bad end R E 3903 ifg E 1 J story_bad end R F 3902 ifg E F J story_bad end
 R E 3904 ifg E 2 J story_bad end ifn E Z R F 3903 E F Z J story_bad end R E 3905 ifg E 2 J story_bad end
 R E 3906 ifg E 1 J story_bad end R F 3904 R G 3905 ife E 1 ifn F 2 J story_bad end ifn G 2 J story_bad end else ife F 2 J story_bad end ife G 2 J story_bad end end
 R E 3907 ifg E 1 J story_bad end R F 3906 ifg E F J story_bad end R E 3908 ifg E 1 J story_bad end R F 3907 ifg E F J story_bad end ifn E Z R F 3902 E F Z J story_bad end
 R E 3909 ifg E 2 J story_bad end ifn E Z R F 3908 E F Z J story_bad end ife E 2 R F 3900 N F Z J story_bad end R E 3900 ife E 3 R F 3907 E F Z J story_bad end M A Z O S P
story_bad: M A -1 O S P
doc_app_key: E A 67 J story_command_draft E A 99 J story_command_draft E A 63 J story_help_key M A Z O S P
story_command_draft: W doc_length Z W doc_caret Z W doc_mode 1 W doc_message @story_type M A 1 O S P
story_help_key: W 3820 @ev_help W doc_message @story_type M A 1 O S P
doc_app_command: W 3821 A W 3822 B C S story_decode R J 3821 R K 3822 M I 4700 M G Z M H Z
story_normalize: E K Z J story_normalized R E J I J 1 I K -1 ife E 32 ifn G Z M H 1 end J story_normalize end ifge E 65 ifle E 90 A E 32 end end ifl E 97 J story_unknown end ifg E 122 J story_unknown end ifn H Z W I 32 I I 1 I G 1 M H Z end W I E I I 1 I G 1 J story_normalize
story_normalized: W I Z E G Z J story_unknown M G @story_commands
story_find_command: R K G E K Z J story_unknown M J 4700
story_compare: R E J R F K ifn E F A G 2 J story_find_command end E E Z J story_dispatch I J 1 I K 1 J story_compare
story_dispatch: M I G/1 M P I
story_new: C S story_reset W doc_dirty 1 J story_handled
story_unknown: W 3820 @ev_unknown W doc_message @story_try M A -1 O S P
story_look: W 3820 @ev_look J story_handled
story_inventory: W 3820 @ev_inventory J story_handled
story_help: W 3820 @ev_help J story_handled
story_north: R E 3819 E E 2 J story_finished R E 3810 ife E Z W 3810 1 J story_moved end ife E 2 R F 3817 ife F Z W 3820 @ev_dark J story_handled end W 3810 3 J story_moved end J story_blocked
story_south: R E 3819 E E 2 J story_finished R E 3810 ife E 1 W 3810 Z J story_moved end ife E 3 W 3810 2 J story_moved end J story_blocked
story_east: R E 3819 E E 2 J story_finished R E 3810 ife E Z W 3810 2 J story_moved end J story_blocked
story_west: R E 3819 E E 2 J story_finished R E 3810 ife E 2 W 3810 Z J story_moved end J story_blocked
story_moved: W 3820 @ev_look J story_changed
story_blocked: W 3820 @ev_blocked J story_handled
story_note: R E 3810 N E Z J story_absent W 3820 @ev_note J story_handled
story_coat: R E 3810 N E 1 J story_absent R E 3811 N E Z J story_already W 3811 1 W 3820 @ev_coat J story_changed
story_drawer: R E 3810 N E Z J story_absent R E 3813 ifn E Z W 3820 @ev_unlock else W 3820 @ev_drawer end J story_handled
story_stairs: R E 3810 N E 2 J story_absent W 3820 @ev_stairs J story_handled
story_clock: R E 3810 N E 3 J story_absent R E 3818 ifn E Z W 3820 @ev_wind else W 3820 @ev_clock end J story_handled
story_clerk: R E 3810 N E Z J story_absent W 3820 @ev_clerk J story_handled
story_key: R E 3810 N E 1 J story_absent R E 3811 E E Z J story_absent R E 3812 N E Z J story_already W 3812 1 W 3820 @ev_key J story_changed
story_wick: R E 3810 N E Z J story_absent R E 3813 E E Z J story_absent R E 3814 N E Z J story_already W 3814 1 W 3820 @ev_wick J story_changed
story_oil: R E 3810 N E 2 J story_absent R E 3815 N E Z J story_already W 3815 1 W 3820 @ev_oil J story_changed
story_afternoon: R E 3810 N E 3 J story_absent R E 3818 E E Z J story_absent R E 3819 N E Z J story_already W 3819 1 W 3820 @ev_afternoon J story_changed
story_unlock: R E 3810 N E Z J story_absent R E 3812 E E Z J story_absent R E 3813 N E Z J story_already W 3813 1 W 3820 @ev_unlock J story_changed
story_combine: R E 3816 N E Z J story_already R E 3814 N E 1 J story_need R E 3815 N E 1 J story_need W 3814 2 W 3815 2 W 3816 1 W 3820 @ev_combine J story_changed
story_need: W 3820 @ev_need J story_handled
story_light: R E 3810 N E 2 J story_absent R E 3816 E E Z J story_absent R E 3817 N E Z J story_already W 3817 1 W 3820 @ev_light J story_changed
story_wind: R E 3810 N E 3 J story_absent R E 3812 E E Z J story_absent R E 3818 N E Z J story_already W 3818 1 W 3820 @ev_wind J story_changed
story_give: R E 3810 N E Z J story_absent R E 3819 N E 1 J story_absent W 3819 2 W 3820 @ev_won J story_changed
story_absent: W 3820 @ev_absent J story_handled
story_already: W 3820 @ev_already J story_handled
story_finished: W 3820 @ev_won J story_handled
story_changed: C S story_encode W doc_dirty 1
story_handled: W doc_message @story_type M A 1 O S P
; Derived narrative rows are regenerated from native state, including after a
; disk load. They are not hidden host gameplay or editable game flags.
doc_app_report: C S story_decode R E 3819 ife E 2 W 3820 @ev_won end R E 3810 M I @story_rooms A I E R A I M C Z C S story_record
 R E 3810 M I @story_descriptions A I E R A I M C 1 C S story_record
 R E 3810 M I @story_exits A I E R A I M C 2 C S story_record
 R E 3810 M I @story_visible A I E R A I
 ife E 1 R F 3811 R G 3812 ifn F Z ife G Z M A @see_key end end end
 ife E 2 R F 3815 ifn F Z M A @see_no_oil end end
 ife E 3 R F 3818 R G 3819 ifn F Z ife G Z M A @see_afternoon end end end M C 3 C S story_record
 M I 3950 M J @story_bag
story_bag_prefix: R E J E E Z J story_bag_items W I E I I 1 I J 1 J story_bag_prefix
story_bag_items: M L Z M G Z
story_bag_item: M J @story_item_states A J L R J J R E J ife E 1 M J @story_item_names A J L R J J
story_bag_word: R E J E E Z J story_bag_word_done W I E I I 1 I J 1 J story_bag_word
story_bag_word_done: W I 32 I I 1 I G 1 end I L 1 ifl L 5 J story_bag_item end ife G Z M J @story_empty_bag
story_bag_empty: R E J E E Z J story_bag_end W I E I I 1 I J 1 J story_bag_empty end
story_bag_end: W I Z M A 3950 M C 4 C S story_record M L Z
story_help_rows: M I @story_help_lines A I L R A I M C L I C 5 C S story_record I L 1 ifl L 5 J story_help_rows end M A @story_objective M C 10 C S story_record
 C S doc_report_reset R J 3820 M L Z
story_report_word: R E J E E Z O S P ife E 32 I J 1 J story_report_word end M G J M H Z
story_measure_word: R E J E E Z J story_place_word E E 32 J story_place_word I H 1 I J 1 J story_measure_word
story_place_word: ife L 27 M L Z end ifn L Z M E L I E 1 A E H ifg E 27
story_pad_line: M A 32 C S doc_report_put I L 1 ifl L 27 J story_pad_line end M L Z
 else M A 32 C S doc_report_put I L 1 end end M J G M K H
story_emit_word: R A J C S doc_report_put I J 1 I L 1 I K -1 N K Z J story_emit_word J story_report_word
story_record: M I C P I 55 A I 3000 M J I M K 55
story_record_clear: W J Z I J 1 I K -1 N K Z J story_record_clear M J I I J 1 M K Z
story_record_copy: R E A E E Z J story_record_end ifge K 54 J story_record_end end W J E I A 1 I J 1 I K 1 J story_record_copy
story_record_end: W I K O S P
story_commands: ${commands.map(([,handler],i)=>`@story_cmd${i} @story_${handler}`).join(' ')} 0
${commands.map(([command],i)=>`story_cmd${i}: ${txt(command)}`).join('\n')}
${Object.entries(events).map(([key,value])=>`ev_${key}: ${txt(value)}`).join('\n')}
story_rooms: @room_counter @room_coats @room_court @room_clock
room_counter: ${txt('Room: Counter')}
room_coats: ${txt('Room: Cloakroom')}
room_court: ${txt('Room: Courtyard')}
room_clock: ${txt('Room: Clock Room')}
story_descriptions: @desc_counter @desc_coats @desc_court @desc_clock
desc_counter: ${txt('The clerk guards a note and a brass-handled drawer.')}
desc_coats: ${txt('An old coat hangs beneath a dusty mirror.')}
desc_court: ${txt('An oil shelf stands beside a narrow stairway.')}
desc_clock: ${txt('A silent clock has stolen part of your day.')}
story_exits: @exit_counter @exit_coats @exit_court @exit_clock
exit_counter: ${txt('Exits: north east')}
exit_coats: ${txt('Exits: south')}
exit_court: ${txt('Exits: west north (stairs)')}
exit_clock: ${txt('Exits: south')}
story_visible: @see_counter @see_coats @see_court @see_clock
see_counter: ${txt('See: clerk note drawer')}
see_coats: ${txt('See: coat')}
see_court: ${txt('See: oil stairs')}
see_clock: ${txt('See: clock')}
see_key: ${txt('See: coat key')}
see_no_oil: ${txt('See: stairs')}
see_afternoon: ${txt('See: clock afternoon')}
story_item_states: 3812 3814 3815 3816 3819
story_item_names: @item_key @item_wick @item_oil @item_lamp @item_afternoon
item_key: ${txt('key')}
item_wick: ${txt('wick')}
item_oil: ${txt('oil')}
item_lamp: ${txt('lamp')}
item_afternoon: ${txt('afternoon')}
story_bag: ${txt('Bag: ')}
story_empty_bag: ${txt('empty')}
story_help_lines: @story_h0 @story_h1 @story_h2 @story_h3 @story_h4
story_h0: ${txt('C: command; S/L: save/load')}
story_h1: ${txt('look / inventory / examine NOUN')}
story_h2: ${txt('go north / take NOUN')}
story_h3: ${txt('use ITEM TARGET / combine wick oil')}
story_h4: ${txt('give afternoon clerk / new')}
story_objective: ${txt('Find your afternoon; give it to the clerk.')}
story_type: ${txt('C: command  ?: help')}
story_try: ${txt('Try help or examine note')}`;

export const MISPLACED_AFTERNOON:DocumentSoftware={number:215,kind:'document',id:'lost-afternoon',site:'lostfound',title:'Misplaced Afternoon',dataPath:'/afternoon',visibleRecords:11,commandOnly:true,inputs:['Typed command'],outputs:['Room/inventory','Story response'],description:'A small parser adventure about reclaiming your missing afternoon. Enter or C opens a blank command line; type and Enter. Explore four rooms, examine objects, take useful things and combine them. Try look, inventory, examine note, go north, take key, use key drawer, or combine wick oil. Commands ignore letter case and extra spaces. Read room/exits/objects/bag rows; selecting a row displays its full text. S saves your actual world and inventory to /afternoon; L reloads. The command new starts over; ? gives help; F1 exits with an unsaved-change prompt. Return the recovered afternoon to the clerk to win.',algorithm:world,examples:[{records:[],commands:['examine note','go north','examine coat','take key']}]};

export const DINNER_SEATING:BoardSoftware={number:216,kind:'board',id:'dinner-seating',site:'otto',title:'Dinner Seating',columns:5,rows:5,stepKey:'n',counterLabel:'Swaps',controls:'Enter:swap N:check R:reset',inputs:['Two guest seats','N: check seating'],outputs:['Circular seating','First conflict'],description:'Seat eight guests around the table. A Ada, B Bea, C Cy, D Dee, E Eli, F Fay, G Gus and H Hal occupy the eight chairs clockwise. Move to a chair and Enter: its guest turns lowercase. Select another chair to swap, or the same chair to cancel. N checks these rules: Ada sits beside Bea; Cy opposite Hal; Dee cannot sit beside Eli; Fay sits between Ada and Hal; Bea opposite Dee; Eli beside Gus. Opposite means four seats away; neighbors wrap around the table. The first conflict is explained by name. Any arrangement meeting all rules wins. R restarts, F1 exits.',algorithm:`game_reset: M I 3200 M E Z
dinner_init: W I E I I 1 I E 1 ifl E 8 J dinner_init end W 3208 -1 W game_message @dinner_prompt J dinner_render
game_move: R E game_status N E Z O S P M G A M H Z
dinner_find: M I @dinner_cells A I H R E I ife E G J dinner_chair end I H 1 ifl H 8 J dinner_find end O S P
dinner_chair: R G 3208 ifl G Z W 3208 H W game_message @dinner_pick J dinner_render end W 3208 -1 ifn G H M I 3200 A I G R E I M J 3200 A J H R F J W I F W J E C S game_count_move end W game_message @dinner_prompt J dinner_render
game_key: E A 1 J dinner_check E A -26 J dinner_check M A Z O S P
dinner_check: R E game_status ifn E Z M A Z O S P end M G Z
dinner_positions: M I 3200 A I G R E I M J 3300 A J E W J G I G 1 ifl G 8 J dinner_positions end
 M G 0 M H 1 C S dinner_distance ifn A 1 W game_message @dinner_ab J dinner_done end
 M G 2 M H 7 C S dinner_distance ifn A 4 W game_message @dinner_ch J dinner_done end
 M G 3 M H 4 C S dinner_distance ife A 1 W game_message @dinner_de J dinner_done end
 M G 5 M H 0 C S dinner_distance ifn A 1 W game_message @dinner_fay J dinner_done end
 M G 5 M H 7 C S dinner_distance ifn A 1 W game_message @dinner_fay J dinner_done end
 M G 1 M H 3 C S dinner_distance ifn A 4 W game_message @dinner_bd J dinner_done end
 M G 4 M H 6 C S dinner_distance ifn A 1 W game_message @dinner_eg J dinner_done end
 W game_status 1 W game_message @dinner_win
dinner_done: M A 1 O S P
dinner_distance: M I 3300 A I G R A I M I 3300 A I H R E I S A E F A A ifg A 4 M E 8 S E A M A E end O S P
dinner_render: M I game_board M E 25
dinner_clear: W I 46 I I 1 I E -1 N E Z J dinner_clear W 2912 84 M G Z
dinner_draw: M I 3200 A I G R E I A E 65 R F 3208 ife F G A E 32 end M I @dinner_cells A I G R F I M I game_board A I F W I E I G 1 ifl G 8 J dinner_draw end O S P
dinner_cells: 2 4 14 24 22 20 10 0
dinner_prompt: ${txt('Swap guests; N checks rules')}
dinner_pick: ${txt('Choose another guest')}
dinner_ab: ${txt('Ada must sit beside Bea')}
dinner_ch: ${txt('Cy must sit opposite Hal')}
dinner_de: ${txt('Dee cannot sit beside Eli')}
dinner_fay: ${txt('Fay needs Ada and Hal beside')}
dinner_bd: ${txt('Bea must sit opposite Dee')}
dinner_eg: ${txt('Eli must sit beside Gus')}
dinner_win: ${txt('Everyone enjoys the dinner!')}`,examples:[{moves:[2,4],board:'H.B.A.....G.T.C.....F.E.D',status:0,movesMade:1}]};
