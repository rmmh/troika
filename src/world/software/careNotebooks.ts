import type {DocumentSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
/** Shared record transport/parser; each notebook supplies its own units and rules.
 * Parsed numeric fields3810..3813, title pointer/length3820/3821, suffix3822/3823.
 * No application calculation or command executes in JavaScript. */
function notebook(plant:boolean):string{
 const fields=plant?3:2,command=plant?'day':'km',stamp=plant?'water':'done';
 const labels:Record<string,string>={format:plant?'NAME|WATERED|RESERVE|SUN':'COMPONENT|LAST|INTERVAL',commands:plant?':day N / :water':':km N / :done',bad:'Invalid fields; H: format',changed:plant?'Watered; S saves journal':'Serviced; S saves log',clockset:plant?'Day set for this session':'Odometer set for session',empty:'Empty slot; H shows format',future:plant?'Watered day is in future':'Service mileage is ahead',now:plant?'Day ':'Odometer ',count:plant?' Dry:':' Due:',selected:plant?'Moisture ':'Remaining ',unit:plant?' units':' km',due:plant?'Water by day ':'Interval ',over:plant?'WATER TODAY H:format ?:cmds':'SERVICE DUE H:format ?:cmds',ok:plant?'Moisture OK H:format ?:cmds':'Not due H:format ?:commands'};
 return `
doc_app_init: W 3808 Z O S P
doc_app_validate: J care_parse
doc_app_key: E A 72 J care_help E A 104 J care_help E A 63 J care_commands M A Z O S P
care_help: W doc_message @care_format M A 1 O S P
care_commands: W doc_message @care_commands_text M A 1 O S P
doc_app_command:
 W 3840 A W 3841 B W 3842 C E B Z J care_normal R E A N E 58 J care_normal
 ife B ${stamp.length+1} ${[...stamp].map((ch,i)=>`M I A M E I/${i+1} N E ${ch.charCodeAt(0)} J care_try_clock`).join(' ')} J care_stamp end
care_try_clock:
 ifl B ${command.length+3} J care_bad end
 ${[...command+' '].map((ch,i)=>`M I A M E I/${i+1} N E ${ch.charCodeAt(0)} J care_bad`).join(' ')}
 M J A A J ${command.length+2} M K B S K ${command.length+2} C S care_digits N A Z J care_bad
 ${plant?'ifg G 999 J care_bad end':''} W 3808 G W doc_message @care_clockset M A 1 O S P
care_normal: M A Z O S P
care_selected: R E doc_selected P E 55 A E 3000 W 3843 E R B E E B Z J care_bad M A E I A 1 J care_parse
care_stamp:
 C S care_selected N A Z J care_no_record R E 3810 R F 3808 ifg E F W doc_message @care_future M A -1 O S P end
 M I 4900 M K 55
care_zero: W I Z I I 1 I K -1 N K Z J care_zero
 W 3899 4901 R A 3820 R C 3821 M B A M A 4901 C S doc_copy R E 3821 A E 4901 W 3899 E M A 124 C S care_put R F 3808 C S care_number
 R J 3822 R K 3823
care_suffix: E K Z J care_publish R A J C S care_put I J 1 I K -1 J care_suffix
care_publish: R E 3899 S E 4901 W 4900 E R A 3843 M B 4900 M C 55 C S doc_copy W doc_dirty 1 W doc_message @care_changed M A 1 O S P
care_no_record: W doc_message @care_empty M A -1 O S P
care_bad: M A -1 O S P
care_parse:
 W 3820 A W 3821 Z W 3822 Z W 3823 Z M J A M K B M H Z M D Z E B Z J care_bad R E J E E 58 J care_bad
care_name:
 E K Z J care_bad R E J E E 124 J care_name_end ifl E 32 J care_bad end ifg E 126 J care_bad end ifn E 32 M D 1 end I H 1 ifg H 18 J care_bad end I J 1 I K -1 J care_name
care_name_end: E H Z J care_bad E D Z J care_bad W 3821 H I J 1 I K -1 W 3824 Z
care_field: M G Z M H Z
care_field_digit:
 E K Z J care_field_end R E J E E 124 J care_field_end
 ifl E 48 J care_bad end ifg E 57 J care_bad end ifg G 900 J care_bad end ife G 900 ifg E 48 J care_bad end end
 P G 10 S E 48 A G E I H 1 ifg H 4 J care_bad end I J 1 I K -1 J care_field_digit
care_field_end:
 E H Z J care_bad R F 3824 M I 3810 A I F W I G
 ife F Z W 3822 J W 3823 K end
 I F 1 W 3824 F ife F ${fields} N K Z J care_bad J care_validate_fields end
 E K Z J care_bad I J 1 I K -1 J care_field
care_validate_fields:
 R E 3811 ifl E 1 J care_bad end
 ${plant?'ifg E 99 J care_bad end R E 3810 ifg E 999 J care_bad end R E 3812 ifl E 1 J care_bad end ifg E 3 J care_bad end':''}
 M A Z O S P
care_digits: M G Z M H Z
care_digits_loop: E K Z J care_digits_done R E J ifl E 48 J care_bad end ifg E 57 J care_bad end ifg G 900 J care_bad end ife G 900 ifg E 48 J care_bad end end P G 10 S E 48 A G E I H 1 ifg H 4 J care_bad end I J 1 I K -1 J care_digits_loop
care_digits_done: E H Z J care_bad M A Z O S P
; Report stores independent derived values for selected-record tests and UI.
doc_app_report:
 W 3844 Z W 3845 Z W 3846 Z
care_count: R E 3844 P E 55 A E 3000 R B E ife B Z J care_count_next end M A E I A 1 C S care_parse N A Z J care_count_next
 C S care_compute ife A Z R E 3847 ifle E Z R E 3845 I E 1 W 3845 E end end
care_count_next: R E 3844 I E 1 W 3844 E ifl E 12 J care_count end
 W 3899 3700 M A @care_now C S care_text R F 3808 C S care_number M A @care_count_text C S care_text R F 3845 C S care_number M B 3727 C S care_pad
 C S care_selected ifn A Z M A @care_empty C S care_text J care_report_done end
 C S care_compute ifn A Z M A @care_future C S care_text J care_report_done end
 M A @care_selected_text C S care_text R F 3847 C S care_number M A @care_unit C S care_text M B 3754 C S care_pad
 M A @care_due C S care_text R F ${plant?'3848':'3811'} C S care_number M B 3781 C S care_pad
 R E 3847 ifle E Z M A @care_over else M A @care_ok end C S care_text
care_report_done: R E 3899 S E 3700 W doc_report_len E O S P
care_compute:
 R E 3808 R F 3810 ifl E F M A -1 O S P end S E F
 ${plant?'R F 3812 P E F':''} R G 3811 S G E W 3847 G
 ${plant?`R G 3811 R H 3812 M F Z
care_days: ifle G Z J care_days_done end S G H I F 1 J care_days
care_days_done: R E 3810 A F E W 3848 F`:''}
 M A Z O S P
; Bounded outputs never exceed108 chars for declared numeric/label limits.
care_put: U S I R I 3899 ifge I 3808 ifl I 4901 O S I O S P end end ifge I 4955 O S I O S P end W I A I I 1 W 3899 I O S I O S P
care_text: M J A
care_text_loop: R A J E A Z O S P C S care_put I J 1 J care_text_loop
care_pad: R E 3899 ifge E B O S P end M A 32 C S care_put J care_pad
care_number:
 ifl F Z M A 45 C S care_put M E Z S E F M F E end
 M H 1000 M L Z
care_digit: M G F Q G H M E G P E H ifg E F I G -1 S E H end S F E ifn G Z M L 1 end ife H 1 M L 1 end ifn L Z M A G A A 48 C S care_put end Q H 10 N H Z J care_digit O S P
${Object.entries(labels).map(([key,value])=>`care_${({commands:'commands_text',bad:'bad_text',count:'count_text',selected:'selected_text'} as Record<string,string>)[key]??key}: ${ascii(value)}`).join('\n')}
`;
}
export const MAINTENANCE_LOG:DocumentSoftware={number:219,kind:'document',id:'maintenance-log',site:'bicycle',title:'Bicycle Maintenance Log',dataPath:'/bike-care',inputs:['Part/last/gap'],outputs:['Service due','Mileage left'],algorithm:notebook(false),description:'Keep twelve component schedules as COMPONENT|LAST|INTERVAL. Names use 1..18 characters and cannot begin with :; last-service odometer and service interval use 0..9000 and 1..9000. Enter a draft command :km 1200 to set the session odometer. The report counts components due now and shows selected remaining mileage; negative means overdue. :done stamps the selected component with the current odometer, preserving its interval. Mileage ahead of the session odometer is flagged and cannot be stamped. H recalls the format; ? recalls commands. Empty edits delete records. S saves component records to /bike-care; L reloads. Set the odometer again after launching.',examples:[{records:['Chain|500|200','Brakes|300|600'],commands:[':km 750']}]};
export const PLANT_JOURNAL:DocumentSoftware={number:220,kind:'document',id:'plant-journal',site:'nala',title:'Window Plant Journal',dataPath:'/plant-care',inputs:['Plant/day/water'],outputs:['Moisture budget','Watering due'],algorithm:notebook(true),description:'Keep twelve plant watering models as NAME|WATERED|RESERVE|SUN. Names use 1..18 characters and cannot begin with :, watered day 0..999, water reserve 1..99 units, and sun exposure 1..3 units consumed per day. Enter :day 12 to set the session day. Moisture is reserve minus elapsed days times sun exposure; zero or less means water today. The suggested day is watered day plus reserve divided by sun, rounded upward. :water stamps the selected plant with today, restoring its full reserve. Future watering dates are flagged. This is a simple planning model: adjust reserve and exposure to your observations. H recalls the format and ? the commands. S saves records to /plant-care; L reloads. Set the day again after launching.',examples:[{records:['Fern|2|12|2','Cactus|1|30|1'],commands:[':day 8']}]};
export const CARE_NOTEBOOKS:DocumentSoftware[]=[MAINTENANCE_LOG,PLANT_JOURNAL];
