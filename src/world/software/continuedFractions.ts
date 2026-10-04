import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const helpers=`${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
export const CONTINUED_FRACTION_SOFTWARE:TextSoftware[] = [
  {
    number:141,kind:'text',id:'fraction-cf',site:'crystal',title:'Continued fraction form',
    description:'Enter an integer numerator and nonzero denominator, both in -99..99. Prints the regular continued-fraction coefficients, separated by spaces. The first coefficient uses floor division and may be negative; all later coefficients are positive. Denominator signs are normalized. Integers have one coefficient and zero becomes 0. Native Euclidean division produces the canonical finite expansion.',
    inputs:['Numerator denom'],outputs:['Coefficients'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 2 J app_bad end R G 2900 R H 2901 E H Z J app_bad ifl H Z P G -1 P H -1 end M J Z
cf_step: M A G F A A M B H C S app_div M K A M L C ifl G Z P K -1 ifn L Z I K -1 M E H S E L M L E end end
 ifn J Z M A 32 C S app_put end M F K C S stats_int E L Z M A Z E L Z O S P M G H M H L I J 1 J cf_step
${helpers}`,
    examples:[{input:'43 19',output:'2 3 1 4'},{input:'-43 19',output:'-3 1 2 1 4'},{input:'43 -19',output:'-3 1 2 1 4'},{input:'0 -99',output:'0'},{input:'5 0',error:true}],
  },
  {
    number:142,kind:'text',id:'cf-convergents',site:'ternary',title:'Continued fraction steps',
    description:'Enter one to nine integer continued-fraction coefficients in -99..99. Only the first may be zero or negative; later coefficients must be positive. Prints each exact convergent as numerator/denominator, including /1 for integers. Native recurrence checks every arithmetic step and reports an error if any numerator or denominator exceeds the signed tryte range -9841..9841. No rounded approximation replaces an overflow.',
    inputs:['Coefficients'],outputs:['Convergents'],
    algorithm:`app_compute: C S stats_parse N A Z O S P W 3100 Z W 3101 1 W 3102 1 W 3103 Z M J Z R L 3000
conv_next: M I 2900 A I J R K I ifn J Z ifl K 1 J app_bad end end M E K R F 3101 R D 3100 C S conv_madd N A Z O S P W 3104 D
 M E K R F 3103 R D 3102 C S conv_madd N A Z O S P W 3105 D
 ifn J Z M A 32 C S app_put end R F 3104 C S stats_int M A 47 C S app_put R F 3105 C S stats_int
 R E 3101 W 3100 E R E 3104 W 3101 E R E 3103 W 3102 E R E 3105 W 3103 E I J 1 ifl J L J conv_next end M A Z O S P
; D + E*F by monotone checked additions: an in-range final result never
; needs an out-of-range intermediate, even when the two terms have unlike signs.
conv_madd: ifl E Z P E -1 P F -1 end
conv_add: E E Z M A Z E E Z O S P M B D A D F ifg F Z ifl D B J app_bad end else ifl F Z ifg D B J app_bad end end end I E -1 J conv_add
${helpers}`,
    examples:[{input:'2 3 1 4',output:'2/1 7/3 9/4 43/19'},{input:'-3 1 2 1 4',output:'-3/1 -2/1 -7/3 -9/4 -43/19'},{input:'0 2',output:'0/1 1/2'},{input:'99 99',output:'99/1 9802/99'},{input:'99 99 99',error:true},{input:'1 0',error:true}],
  },
];
