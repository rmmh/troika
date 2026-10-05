import type {TextSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';

export const MONTH_CALENDAR:TextSoftware={
 number:228,kind:'text',id:'month-calendar',site:'station',title:'Month Calendar',
 inputs:['Month YYYY-MM'],outputs:['Su Mo Tu We Th Fr Sa'],
 description:'Print a month from 2000-01 through 2099-12 as a Sunday-first calendar. Enter exactly YYYY-MM. Six aligned week rows retain blank days before and after the month; February follows the leap-year rule for this century. Useful for planning a visit or copying a month into a notebook. Type a new month after clearing the old input with Backspace. Enter calculates and F1 returns to Programs.',
 algorithm:`app_compute: R E 2610 N E 7 J month_bad
 R E 2552 N E 50 J month_bad R E 2553 N E 48 J month_bad R E 2556 N E 45 J month_bad
 M I 2554 C S month_pair N A Z O S P M G D M I 2557 C S month_pair N A Z O S P M H D
 ifl H 1 J month_bad end ifg H 12 J month_bad end
 M A G I A 3 M B 4 C S app_div M K G A K A I K 6
 M A G M B 4 C S app_div M L Z E C Z M L 1 M J 1
month_prior: ifge J H J month_start end C S month_length A K D I J 1 J month_prior
month_start: C S month_length M A K M B 7 C S app_div M G C M H D M J Z M L Z
month_cell: M K J S K G I K 1
 ifl K 1 J month_blank end ifg K H J month_blank end
 M A K M B 10 C S app_div M D C ife A Z M A 32 else A A 48 end C S app_put M A D A A 48 C S app_put J month_space
month_blank: M A 32 C S app_put M A 32 C S app_put
month_space: M A 32 C S app_put I J 1 I L 1 ife L 7 M L Z M K 6
month_pad: M A 32 C S app_put I K -1 N K Z J month_pad end
 ifl J 42 J month_cell end M A Z O S P
month_pair: R E I ifl E 48 J month_bad end ifg E 57 J month_bad end M D E S D 48 P D 10 M E I/1 ifl E 48 J month_bad end ifg E 57 J month_bad end S E 48 A D E M A Z O S P
month_length: M I @month_days A I J I I -1 R D I E J 2 A D L O S P
month_bad: M A -1 O S P
month_days: 31 28 31 30 31 30 31 31 30 31 30 31
${POSITIVE_DIVISION}`,
 examples:[{input:'2026-02',output:Array.from({length:6},(_,r)=>Array.from({length:7},(_,c)=>{const d=r*7+c+1;return d<=28?String(d).padStart(2,' ')+' ':'   ';}).join('')+'      ').join('')},{input:'2100-01',error:true},{input:'2026-13',error:true}],
};
