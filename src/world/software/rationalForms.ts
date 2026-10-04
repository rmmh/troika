import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const helpers=`${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
export const RATIONAL_FORM_SOFTWARE:TextSoftware[] = [
  {
    number:166,kind:'text',id:'decimal-cycle',site:'ternary',title:'Repeating Decimal Form',
    description:'Enter an integer numerator and nonzero denominator in -99..99. Native long division prints the exact decimal expansion, enclosing a repeating suffix in parentheses: 1 6 becomes 0.1(6). Terminating expansions have no parentheses or trailing zeroes; integers have no decimal point. A remainder-position table detects the cycle without rounding or a host calculation.',
    inputs:['Numerator denom'],outputs:['Exact decimal'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 2 J app_bad end R G 2900 R H 2901 E H Z J app_bad ifl H Z P G -1 P H -1 end ifl G Z M A 45 C S app_put P G -1 end
 M A G M B H C S app_div M G C M F A C S stats_int ife G Z M A Z O S P end M A 46 C S app_put M I 3100 M E H
dec_clear: W I -1 I I 1 I E -1 N E Z J dec_clear M J Z
dec_digit: ife G Z M K -1 J dec_emit_start end M I 3100 A I G R K I ifg K -1 J dec_emit_start end W I J M A G P A 10 M B H C S app_div M G C M I 3300 A I J A A 48 W I A I J 1 J dec_digit
dec_emit_start: M L Z
dec_emit: ife L J ifg K -1 M A 41 C S app_put end M A Z O S P end ife L K M A 40 C S app_put end M I 3300 A I L R A I C S app_put I L 1 J dec_emit
${helpers}`,
    examples:[{input:'1 6',output:'0.1(6)'},{input:'22 7',output:'3.(142857)'},{input:'-1 8',output:'-0.125'},{input:'1 -3',output:'-0.(3)'},{input:'99 9',output:'11'},{input:'0 99',output:'0'},{input:'1 0',error:true}],
  },
  {
    number:167,kind:'text',id:'egyptian-sum',site:'crystal',title:'Egyptian Fraction Sum',
    description:'Enter a nonnegative numerator and positive denominator in 0..99 and 1..99. Prints an integer part, if present, followed by a greedy sum of distinct unit fractions. For example 4 13 becomes 1/4 + 1/18 + 1/468. All arithmetic and reduction run natively. Every reduced remainder denominator must fit 9841; an overflow reports an error rather than a truncated or approximate sum. Zero prints 0.',
    inputs:['Numerator denom'],outputs:['Unit fractions'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E 2 J app_bad end R G 2900 R H 2901 ifl G Z J app_bad end ifl H 1 J app_bad end M A G M B H C S app_div M G C M J Z
 ifn A Z M F A C S stats_int M J 1 end ife G Z ife J Z M F Z C S stats_int end M A Z O S P end
egy_step: M A H M B G C S app_div M K A M L C ifn L Z I K 1 end ifn J Z M A 32 C S app_put M A 43 C S app_put M A 32 C S app_put end M A 49 C S app_put M A 47 C S app_put M F K C S stats_int ife L Z M A Z O S P end M J 1
 ; New numerator G-L; reduce against each denominator factor before multiplying.
 S G L M A G M B H C S egy_gcd M B A M A G C S app_div M G A M A H C S app_div M H A
 M A G M B K C S egy_gcd M B A M A G C S app_div M G A M A K C S app_div M K A
 M A 9841 M B K C S app_div ifg H A J app_bad end P H K J egy_step
egy_gcd: E B Z O S P C S app_div M A B M B C J egy_gcd
${helpers}`,
    examples:[{input:'4 13',output:'1/4 + 1/18 + 1/468'},{input:'7 3',output:'2 + 1/3'},{input:'2 4',output:'1/2'},{input:'0 9',output:'0'},{input:'3 0',error:true},{input:'-1 3',error:true}],
  },
];
