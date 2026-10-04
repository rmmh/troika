import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const dates=`date_load: R G J M H J/1 M K J/2 ifl G Z J app_bad end ifl H 1 J app_bad end ifg H 12 J app_bad end ifl K 1 J app_bad end C S date_month ifg K D J app_bad end M A Z O S P
; Years 00..99 mean 2000..2099, including the leap century year 2000.
date_month: M I @date_lengths A I H I I -1 R D I ife H 2 M A G M B 4 C S app_div ife C Z I D 1 end end M A Z O S P
; E/F are high/low base-100 limbs of the nonnegative day ordinal.
date_ordinal: M I @date_starts A I H I I -1 R L I A L K I L -1 ifg H 2 M A G M B 4 C S app_div ife C Z I L 1 end end
 M F G P F 65 A F L W 3200 F M A G I A 3 M B 4 C S app_div R F 3200 A F A M A F M B 100 C S app_div M E G P E 3 A E A M F C M A Z O S P
date_two: M A F M B 10 C S app_div M D C A A 48 C S app_put M A D A A 48 J app_put
date_lengths: 31 28 31 30 31 30 31 31 30 31 30 31
date_starts: 0 31 59 90 120 151 181 212 243 273 304 334`;
const helpers=`${dates}\n${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
export const CALENDAR_SOFTWARE:TextSoftware[] = [
  {
    number:162,kind:'text',id:'date-shift',site:'clockwork',title:'Calendar Day Shift',
    description:'Enter year month day offset. Year 0..99 means 2000..2099; offset is -99..99 calendar days. Native Gregorian month and leap-day handling returns YYYY-MM-DD. Invalid dates and results outside 2000..2099 are errors. This counts calendar dates without time-of-day, time zones or holiday rules.',
    inputs:['YY month day +/-'],outputs:['Shifted date'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 4 J app_bad end M J 2900 C S date_load N A Z O S P R L 2903
shift_next: E L Z J shift_output ifg L Z C S date_month I K 1 ifg K D M K 1 I H 1 ifg H 12 M H 1 I G 1 ifg G 99 J app_bad end end end I L -1 else I K -1 ifl K 1 I H -1 ifl H 1 M H 12 I G -1 ifl G Z J app_bad end end C S date_month M K D end I L 1 end J shift_next
shift_output: M F G A F 2000 C S stats_int M A 45 C S app_put M F H C S date_two M A 45 C S app_put M F K J date_two
${helpers}`,
    examples:[{input:'0 2 28 1',output:'2000-02-29'},{input:'1 2 28 1',output:'2001-03-01'},{input:'24 3 1 -1',output:'2024-02-29'},{input:'99 12 31 1',error:true},{input:'1 2 29 0',error:true}],
  },
  {
    number:163,kind:'text',id:'date-span',site:'sundial',title:'Calendar Day Difference',
    description:'Enter two dates as year month day year month day. Years 0..99 mean 2000..2099. Native Gregorian arithmetic prints the signed number of elapsed calendar days from the first date to the second; the same date is zero. Base-100 limbs preserve full-century differences up to 36524 days despite the single-tryte limit. Invalid dates are errors; time zones, time-of-day and holidays are not involved.',
    inputs:['YY M D YY M D'],outputs:['Elapsed days'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 6 J app_bad end M J 2900 C S date_load N A Z O S P C S date_ordinal W 3001 E W 3002 F M J 2903 C S date_load N A Z O S P C S date_ordinal M G E M H F R E 3001 S G E R E 3002 S H E ifl H Z I G -1 A H 100 end
 ifl G Z M A 45 C S app_put P G -1 ifn H Z I G -1 M E 100 S E H M H E end end ife G Z M F H J stats_int end M F G C S stats_int M F H J date_two
${helpers}`,
    examples:[{input:'0 1 1 99 12 31',output:'36524'},{input:'99 12 31 0 1 1',output:'-36524'},{input:'24 2 28 24 3 1',output:'2'},{input:'1 3 1 1 2 28',output:'-1'},{input:'0 1 1 0 1 1',output:'0'},{input:'0 4 31 0 5 1',error:true}],
  },
];
