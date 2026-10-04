import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const helpers=`${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
/** Root followed by 1..7 coefficients. Bounds keep Horner intermediates <=9837. */
const rooted=`poly_parse: C S stats_parse N A Z O S P R K 3000 ifl K 2 J app_bad end ifg K 8 J app_bad end R G 2900 ifl G -3 J app_bad end ifg G 3 J app_bad end M J 2901 M H K I H -1
poly_check: R E J ifl E -9 J app_bad end ifg E 9 J app_bad end I J 1 I H -1 N H Z J poly_check M A Z O S P`;

export const POLYNOMIAL_SOFTWARE: TextSoftware[] = [
  {
    number:115,kind:'text',id:'poly-evaluate',site:'ternary',title:'Horner polynomial evaluator',
    description:'Enter x followed by one to seven integer coefficients in ascending power order: constant first. x must be -3..3 and coefficients -9..9. Native Horner evaluation returns the exact value. These bounds keep every intermediate within a tryte, including degree six at x=3.',
    inputs:['x c0 c1 ...'],outputs:['Value'],
    algorithm:`app_compute: C S poly_parse N A Z O S P M J 2900 A J K I J -1 I K -1 M H Z
horner_next: P H G R E J A H E I J -1 I K -1 N K Z J horner_next M F H J stats_int
${rooted}
${helpers}`,
    examples:[{input:'2 1 2 3',output:'17'},{input:'-3 9 9 9 9 9 9 9',output:'4923'},{input:'3 9 9 9 9 9 9 9',output:'9837'},{input:'0 -9 2',output:'-9'},{input:'4 1 2',error:true}],
  },
  {
    number:116,kind:'text',id:'poly-derivative',site:'pendulum',title:'Polynomial derivative',
    description:'Enter one to nine integer coefficients in -99..99, constant first. Returns coefficients of the formal derivative in ascending power order, multiplying each coefficient by its original exponent. The derivative of a constant is 0. Explicit trailing zeros are retained.',
    inputs:['c0 c1 c2 ...'],outputs:['Coefficients'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R L 3000 ife L 1 M F Z J stats_int end M J 1
 derivative_next: ifg J 1 M A 32 C S app_put end M I 2900 A I J R F I P F J C S stats_int I J 1 ifl J L J derivative_next end M A Z O S P
${helpers}`,
    examples:[{input:'5 3 -2 4',output:'3 -4 12'},{input:'99',output:'0'},{input:'0 0 0',output:'0 0'},{input:'0 99 99 99 99 99 99 99 99',output:'99 198 297 396 495 594 693 792'}],
  },
  {
    number:117,kind:'text',id:'poly-integral',site:'crystal',title:'Exact polynomial integral',
    description:'Enter one to nine integer coefficients in -99..99, constant first. Returns ascending coefficients of the formal antiderivative with integration constant fixed to zero. Each coefficient is divided by its new exponent and printed as a reduced fraction; no rounding is used. Explicit trailing zeros remain.',
    inputs:['c0 c1 c2 ...'],outputs:['Coefficients'],
    algorithm:`app_compute: C S stats_parse N A Z O S P M A 48 C S app_put M J Z R L 3000
integral_next: M A 32 C S app_put M I 2900 A I J R F I M D J I D 1 C S stats_fraction I J 1 ifl J L J integral_next end M A Z O S P
${helpers}`,
    examples:[{input:'3 3 -2',output:'0 3 3/2 -2/3'},{input:'0',output:'0 0'},{input:'-99 99',output:'0 -99 99/2'},{input:'1 2 3 4',output:'0 1 1 1 1'}],
  },
  {
    number:118,kind:'text',id:'synthetic-divide',site:'ada',title:'Synthetic polynomial divide',
    description:'Enter r followed by one to seven integer coefficients, constant first. Divides by x-r and prints ascending quotient coefficients and the remainder. r must be -3..3 and coefficients -9..9, keeping arithmetic exact in native trytes. A constant has quotient 0. Explicit high-degree zero coefficients remain.',
    inputs:['r c0 c1 ...'],outputs:['Quotient/rem'],
    algorithm:`app_compute: C S poly_parse N A Z O S P M J K I J -2 W 3020 J M H Z
synthetic_next: M I 2901 A I J R E I P H G A H E ifn J Z M I 3100 A I J I I -1 W I H end I J -1 ifge J Z J synthetic_next end
 M A @quotient_label C S stats_label R L 3020 ife L Z M F Z C S stats_int else M J Z
synthetic_print: ifn J Z M A 32 C S app_put end M I 3100 A I J R F I C S stats_int I J 1 ifl J L J synthetic_print end end
 M A @remainder_label C S stats_label M F H J stats_int
quotient_label: ${ascii('q=')}
remainder_label: ${ascii(' r=')}
${rooted}
${helpers}`,
    examples:[{input:'2 -6 1 1',output:'q=3 1 r=0'},{input:'-1 3 2 1',output:'q=1 1 r=2'},{input:'3 9',output:'q=0 r=9'},{input:'0 5 0 0',output:'q=0 0 r=5'},{input:'1',error:true}],
  },
];
