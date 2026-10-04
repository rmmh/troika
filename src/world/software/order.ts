import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const helpers=`${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');

export const ORDER_SOFTWARE: TextSoftware[] = [
  {
    number:111,kind:'text',id:'sample-ranks',site:'scorebook',title:'Competition rank converter',
    description:'Converts one to nine signed values in -99..99 into ascending competition ranks, retaining input order. Rank is one plus the number of strictly smaller observations. Equal values share a rank and leave gaps, so 10 10 30 becomes 1 1 3. This is not dense ranking or averaged tied ranks.',
    inputs:['Values'],outputs:['Ascending ranks'],
    algorithm:`app_compute: C S stats_parse N A Z O S P M J Z
rank_outer: R E 3000 ifge J E M A Z O S P end M I 2900 A I J R G I M K Z M H 1
rank_inner: R E 3000 ifge K E J rank_write end M I 2900 A I K R E I ifl E G I H 1 end I K 1 J rank_inner
rank_write: ifn J Z M A 32 C S app_put end M F H C S stats_int I J 1 J rank_outer
${helpers}`,
    examples:[{input:'30 10 10 20',output:'4 1 1 3'},{input:'-1 0 -2',output:'2 3 1'},{input:'0',output:'1'},{input:'',error:true}],
  },
  {
    number:112,kind:'text',id:'inversion-count',site:'toolshed',title:'Sequence inversion counter',
    description:'Counts pairs of observations that are out of ascending order. Enter one to nine signed values in -99..99. Each earlier value strictly greater than a later value contributes one inversion; ties contribute zero. The result is also the minimum number of adjacent swaps needed to sort the sequence.',
    inputs:['Values'],outputs:['Inversions'],
    algorithm:`app_compute: C S stats_parse N A Z O S P M J Z M H Z
inv_outer: R E 3000 ifge J E M F H J stats_int end M I 2900 A I J R G I M K J I K 1
inv_inner: R E 3000 ifge K E I J 1 J inv_outer end M I 2900 A I K R E I ifg G E I H 1 end I K 1 J inv_inner
${helpers}`,
    examples:[{input:'3 1 2',output:'2'},{input:'4 3 2 1',output:'6'},{input:'2 2 2',output:'0'},{input:'1 2 3',output:'0'}],
  },
  {
    number:113,kind:'text',id:'majority-value',site:'roofbirds',title:'Strict majority detector',
    description:'Finds an observation occurring more than half the time among one to nine signed values in -99..99, or prints NONE. Native candidate cancellation is followed by a complete verification pass. A plurality or a tied half is not a majority.',
    inputs:['Observations'],outputs:['Majority or NONE'],
    algorithm:`app_compute: C S stats_parse N A Z O S P M J 2900 R K 3000 M H Z
vote_next: R E J ife H Z M G E M H 1 else ife E G I H 1 else I H -1 end end I J 1 I K -1 N K Z J vote_next
 M J 2900 R K 3000 M H Z
vote_verify: R E J ife E G I H 1 end I J 1 I K -1 N K Z J vote_verify P H 2 R E 3000 ifg H E M F G J stats_int end M A @vote_none J stats_label
vote_none: ${ascii('NONE')}
${helpers}`,
    examples:[{input:'2 1 2 3 2',output:'2'},{input:'1 1 2 2',output:'NONE'},{input:'-99',output:'-99'},{input:'1 2 3',output:'NONE'}],
  },
  {
    number:114,kind:'text',id:'nearest-readings',site:'orchard',title:'Closest observation pair',
    description:'Finds two readings with the smallest absolute difference in a list of two to nine signed integers in -99..99. Reports the gap and their zero-based indices in the original input. Equal gaps prefer the earliest first index, then earliest second index. Duplicate readings give a zero gap.',
    inputs:['Readings'],outputs:['Nearest pair'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 2 J app_bad end M J Z M H 199 W 3020 Z W 3021 1
near_outer: R E 3000 ifge J E J near_done end M I 2900 A I J R G I M K J I K 1
near_inner: R E 3000 ifge K E I J 1 J near_outer end M I 2900 A I K R A I S A G F A A ifl A H M H A W 3020 J W 3021 K end I K 1 J near_inner
near_done: M A @gap_label C S stats_label M F H C S stats_int M A @first_label C S stats_label R F 3020 C S stats_int M A @second_label C S stats_label R F 3021 J stats_int
gap_label: ${ascii('gap=')}
first_label: ${ascii(' first=')}
second_label: ${ascii(' second=')}
${helpers}`,
    examples:[{input:'8 1 7 3',output:'gap=1 first=0 second=2'},{input:'-99 99',output:'gap=198 first=0 second=1'},{input:'4 4 4',output:'gap=0 first=0 second=1'},{input:'1',error:true}],
  },
];
