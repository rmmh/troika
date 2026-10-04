import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const helpers=`${SAMPLE_PARSE}\n${SAMPLE_OUTPUT}\napp_bad: M A -1 O S P`;
const print=`transform_print: M J Z
transform_value: ifn J Z M A 32 C S app_put end M I 2900 A I J R F I C S stats_int I J 1 ifl J L J transform_value end M A Z O S P`;
export const TRANSFORM_SOFTWARE:TextSoftware[] = [
  {
    number:156,kind:'text',id:'convolution',site:'signals',title:'Linear Sequence Convolution',
    description:'Enter the length of the first sequence, followed by its coefficients and then the second sequence. Both must be nonempty and together contain at most eight values in -9..9. Native linear convolution returns all n+m-1 coefficients, with no circular wrapping or scaling. The same operation multiplies coefficient lists of polynomials in ascending power order.',
    inputs:['n a... b...'],outputs:['Convolution'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R E 3000 ifl E 3 J app_bad end I E -1 R H 2900 ifl H 1 J app_bad end ifge H E J app_bad end W 3002 H S E H W 3003 E M J 1
conv_validate: M I 2900 A I J R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I J 1 R E 3000 ifl J E J conv_validate end R L 3000 I L -2 M J Z
conv_output: M G Z M H Z
conv_term: M K J S K H ifge K Z R E 3003 ifl K E M I 2901 A I H R E I M I 2901 R F 3002 A I F A I K R F I P E F A G E end end I H 1 R E 3002 ifl H E J conv_term end ifn J Z M A 32 C S app_put end M F G C S stats_int I J 1 ifl J L J conv_output end M A Z O S P
${helpers}`,
    examples:[{input:'3 1 2 3 4 5',output:'4 13 22 15'},{input:'2 1 -1 1 1',output:'1 0 -1'},{input:'1 9 -9',output:'-81'},{input:'2 1 2',error:true}],
  },
  {
    number:157,kind:'text',id:'walsh-transform',site:'radios',title:'Walsh Hadamard Transform',
    description:'Enter 1, 2, 4 or 8 signed samples in -99..99. Native sum/difference butterflies compute the unnormalized Walsh-Hadamard transform in natural Hadamard order. Outputs are exact integers. Applying the transform twice yields the original samples multiplied by their count; this is not sequency ordering or a Fourier transform.',
    inputs:['Samples'],outputs:['Coefficients'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R L 3000 ifn L 1 ifn L 2 ifn L 4 ifn L 8 J app_bad end end end end M H 1
walsh_stage: ifge H L J transform_print end M G Z
walsh_block: M J Z
walsh_pair: M I 2900 A I G A I J R E I M K I A K H R F K M D E A D F S E F W I D W K E I J 1 ifl J H J walsh_pair end A G H A G H ifl G L J walsh_block end P H 2 J walsh_stage
${print}
${helpers}`,
    examples:[{input:'1 2 3 4',output:'10 -2 -4 0'},{input:'-99 99',output:'0 -198'},{input:'7',output:'7'},{input:'1 2 3',error:true}],
  },
  {
    number:158,kind:'text',id:'haar-lifting',site:'cassettes',title:'Integer Haar Lifting',
    description:'Enter mode 1 to encode or -1 to decode, then 1, 2, 4 or 8 values. Encoding accepts samples -49..49 and recursively stores floor averages followed by differences, coarse levels first. All resulting coefficients fit -99..99 for pasting into decode mode. Decoding accepts coefficients -99..99 and reconstructs exact integer samples, including negative odd differences. This is a reversible integer lifting transform, not normalized floating-point Haar coefficients.',
    inputs:['Mode values'],outputs:['Transformed data'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R L 2900 ifn L 1 ifn L -1 J app_bad end end R G 3000 I G -1 ifn G 1 ifn G 2 ifn G 4 ifn G 8 J app_bad end end end end W 3001 G W 3004 L M J Z
haar_load: M I 2901 A I J R E I ife L 1 ifl E -49 J app_bad end ifg E 49 J app_bad end end M I 2900 A I J W I E I J 1 ifl J G J haar_load end ife L -1 M G 2 end
haar_stage: R E 3004 ife E 1 ifl G 2 J haar_done end else R E 3001 ifg G E J haar_done end end M H G Q H 2 M J Z
haar_pair: R E 3004 ife E 1 M I J P I 2 A I 2900 R D I M K I/1 S D K C S haar_half A K E M I 3100 A I J W I K A I H W I D else M I 2900 A I J R K I A I H R D I C S haar_half S K E M F K A F D M I J P I 2 A I 3100 W I F M I/1 K end I J 1 ifl J H J haar_pair end M J Z
haar_copy: M I 3100 A I J R E I M I 2900 A I J W I E I J 1 ifl J G J haar_copy end R E 3004 ife E 1 M G H else P G 2 end J haar_stage
haar_done: R L 3001 J transform_print
haar_half: M A D F A A M B 2 C S app_div ifl D Z P A -1 ifn C Z I A -1 end end M E A O S P
${print}
${helpers}`,
    examples:[{input:'1 1 2 3 4',output:'2 -2 -1 -1'},{input:'-1 2 -2 -1 -1',output:'1 2 3 4'},{input:'1 -2 1',output:'-1 -3'},{input:'-1 -1 -3',output:'-2 1'},{input:'1 50',error:true}],
  },
  {
    number:159,kind:'text',id:'sequence-next',site:'pendulum',title:'Polynomial Sequence Step',
    description:'Enter one to nine equally spaced integer observations in -9..9. Native finite differences find the next value of the unique interpolating polynomial and its degree. Constant and one-value inputs have degree zero. This is algebraic continuation of a finite sequence, not evidence that future measurements will follow it. Bounds keep all differences and the next value within a signed tryte.',
    inputs:['Observations'],outputs:['Next and degree'],
    algorithm:`app_compute: C S stats_parse N A Z O S P R L 3000 M J Z
next_validate: M I 2900 A I J R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I J 1 ifl J L J next_validate end M I 2899 A I L R G I M H L I H -1 W 3001 Z M K 1
next_level: ife H Z J next_output end M J Z
next_difference: M I 2900 A I J R E I M F I/1 S F E W I F I J 1 ifl J H J next_difference end A G F ifn F Z W 3001 K end I K 1 I H -1 J next_level
next_output: M A @next_value C S stats_label M F G C S stats_int M A @next_degree C S stats_label R F 3001 J stats_int
next_value: ${text('next=')}
next_degree: ${text(' degree=')}
${helpers}`,
    examples:[{input:'1 4 9',output:'next=16 degree=2'},{input:'0 1 8',output:'next=21 degree=2'},{input:'3 3 3',output:'next=3 degree=0'},{input:'-9 9 -9 9 -9 9 -9 9 -9',output:'next=-4599 degree=8'},{input:'10',error:true}],
  },
];
