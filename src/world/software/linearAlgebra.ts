import type { TextSoftware } from './native';
import { SAMPLE_PARSE, SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const helpers=`linear_parse: C S stats_parse N A Z O S P M I 2900 R D 3000
linear_check: R E I ifl E -9 J app_bad end ifg E 9 J app_bad end I I 1 I D -1 N D Z J linear_check M A Z O S P
linear_fraction: ifl D Z P D -1 P F -1 end J stats_fraction
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P`;

export const LINEAR_SOFTWARE: TextSoftware[] = [
  {
    number:119,kind:'text',id:'determinant3',site:'crystal',title:'Three by three determinant',
    description:'Enter nine integers in -9..9, in row order for a 3x3 matrix. Computes the exact signed determinant by native cofactor expansion. A zero result means the rows are linearly dependent. All intermediate products and sums fit native trytes.',
    inputs:['3x3 row order'],outputs:['Determinant'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 9 J app_bad end
 R H 2904 R E 2908 P H E R F 2905 R E 2907 P F E S H F R E 2900 P H E
 R G 2903 R E 2908 P G E R F 2905 R E 2906 P F E S G F R E 2901 P G E S H G
 R G 2903 R E 2907 P G E R F 2904 R E 2906 P F E S G F R E 2902 P G E A H G M F H J stats_int
${helpers}`,
    examples:[{input:'1 0 0 0 1 0 0 0 1',output:'1'},{input:'1 2 3 0 1 4 5 6 0',output:'1'},{input:'1 2 3 2 4 6 0 0 0',output:'0'},{input:'-1 0 0 0 2 0 0 0 3',output:'-6'}],
  },
  {
    number:120,kind:'text',id:'linear-solve2',site:'ada',title:'Two-equation exact solver',
    description:'Enter a b c d e f for equations a*x+b*y=c and d*x+e*y=f, with integer values in -9..9. Returns the unique solution as reduced fractions. A zero determinant is an error, whether the system is inconsistent or has infinitely many solutions. No rounded approximations are used.',
    inputs:['a b c d e f'],outputs:['Solution'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 6 J app_bad end
 R G 2900 R E 2904 P G E R F 2901 R E 2903 P F E S G F E G Z J app_bad
 R H 2902 R E 2904 P H E R F 2901 R E 2905 P F E S H F
 R L 2900 R E 2905 P L E R F 2902 R E 2903 P F E S L F
 M A @x_label C S stats_label M F H M D G C S linear_fraction M A @y_label C S stats_label M F L M D G J linear_fraction
x_label: ${ascii('x=')}
y_label: ${ascii(' y=')}
${helpers}`,
    examples:[{input:'2 1 5 1 -1 1',output:'x=2 y=1'},{input:'2 0 1 0 3 -1',output:'x=1/2 y=-1/3'},{input:'1 2 3 2 4 6',error:true},{input:'0 0 1 0 0 0',error:true}],
  },
  {
    number:121,kind:'text',id:'matrix-inverse2',site:'lenses',title:'Exact two by two inverse',
    description:'Enter four integers a b c d in -9..9 for a 2x2 matrix in row order. Prints four reduced rational entries of its inverse in the same row order. Singular matrices report an error. Fractions always have positive denominators.',
    inputs:['a b c d'],outputs:['Inverse rows'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 4 J app_bad end
 R G 2900 R E 2903 P G E R F 2901 R E 2902 P F E S G F E G Z J app_bad
 R F 2903 M D G C S linear_fraction M A 32 C S app_put R F 2901 P F -1 M D G C S linear_fraction
 M A 32 C S app_put R F 2902 P F -1 M D G C S linear_fraction M A 32 C S app_put R F 2900 M D G J linear_fraction
${helpers}`,
    examples:[{input:'1 2 3 4',output:'-2 1 3/2 -1/2'},{input:'2 0 0 3',output:'1/2 0 0 1/3'},{input:'0 1 1 0',output:'0 1 1 0'},{input:'1 2 2 4',error:true}],
  },
  {
    number:122,kind:'text',id:'vector-products',site:'maps',title:'Three-dimensional products',
    description:'Enter uX uY uZ vX vY vZ, six integers in -9..9. Reports the dot product and the right-handed cross product u cross v. Dot zero indicates perpendicular vectors (including zero vectors); cross zero indicates parallel or zero vectors. Native integer arithmetic computes all components exactly.',
    inputs:['Two xyz vectors'],outputs:['Dot and cross'],
    algorithm:`app_compute: C S linear_parse N A Z O S P R E 3000 ifn E 6 J app_bad end
 R H 2900 R E 2903 P H E R F 2901 R E 2904 P F E A H F R F 2902 R E 2905 P F E A H F
 R G 2901 R E 2905 P G E R F 2902 R E 2904 P F E S G F
 R K 2902 R E 2903 P K E R F 2900 R E 2905 P F E S K F
 R L 2900 R E 2904 P L E R F 2901 R E 2903 P F E S L F
 M A @dot_label C S stats_label M F H C S stats_int M A @cross_label C S stats_label M F G C S stats_int M A 32 C S app_put M F K C S stats_int M A 32 C S app_put M F L J stats_int
dot_label: ${ascii('dot=')}
cross_label: ${ascii(' cross=')}
${helpers}`,
    examples:[{input:'1 0 0 0 1 0',output:'dot=0 cross=0 0 1'},{input:'1 2 3 4 5 6',output:'dot=32 cross=-3 6 -3'},{input:'9 9 9 9 9 9',output:'dot=243 cross=0 0 0'},{input:'0 0 0 1 2 3',output:'dot=0 cross=0 0 0'}],
  },
];
