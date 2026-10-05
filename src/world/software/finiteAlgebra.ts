import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
const support=`fa_bad: M A -1 O S P
fa_pad: M D A
fa_spaces: R E 2620 ifge E D M A Z O S P end M A 32 C S app_put J fa_spaces
${SAMPLE_OUTPUT}`;

// Six-element tables occupy 3000..3035, inverses 3050..3055 and center flags
// 3070..3075. At most 216 associativity triples; all products below 36.
export const FINITE_ALGEBRA:TextSoftware[]=[{
 number:383,kind:'text',id:'group-table',site:'masks',title:'Group Table Inspector',
 inputs:['n|table digits'],outputs:['Group laws / inverses'],
 description:'Enter n| followed by n squared operation-table digits, n=1..6, elements 0..n-1. Rows are left operands and columns right operands. Example 3|012120201 describes addition modulo 3. Native exhaustive checks report the first associativity witness, missing identity or first element without a two-sided inverse. A group reports its identity, each inverse and center (elements commuting with all others); ABELIAN means every pair commutes. The table may use any element labels. This validates the supplied operation, not merely its Latin-square shape.',
 algorithm:`app_compute: R K 2610 ifl K 3 J fa_bad end R L 2552 S L 48 ifl L 1 J fa_bad end ifg L 6 J fa_bad end R E 2553 ifn E 124 J fa_bad end M E L P E L A E 2 N E K J fa_bad M G Z M J L P J L
gt_parse: M I 2554 A I G R E I S E 48 ifl E Z J fa_bad end ifge E L J fa_bad end M I 3000 A I G W I E I G 1 ifl G J J gt_parse end
 M G Z
gt_assoc_row: M H Z
gt_assoc_col: M K Z
gt_assoc: M A G M B H C S gt_lookup M B K C S gt_lookup M D A M A H M B K C S gt_lookup M B A M A G C S gt_lookup ifn A D W 3092 G W 3093 H W 3094 K W 3095 D W 3096 A J gt_not_assoc end I K 1 ifl K L J gt_assoc end I H 1 ifl H L J gt_assoc_col end I G 1 ifl G L J gt_assoc_row end
 M G Z
gt_identity: ifge G L J gt_no_identity end M H Z
gt_identity_item: M A G M B H C S gt_lookup ifn A H J gt_identity_next end M A H M B G C S gt_lookup ifn A H J gt_identity_next end I H 1 ifl H L J gt_identity_item end W 3090 G J gt_inverses
gt_identity_next: I G 1 J gt_identity
gt_inverses: M G Z
gt_inverse: M H Z
gt_inverse_candidate: ifge H L W 3092 G J gt_no_inverse end M A G M B H C S gt_lookup R E 3090 ifn A E J gt_inverse_next end M A H M B G C S gt_lookup R E 3090 ifn A E J gt_inverse_next end M I 3050 A I G W I H I G 1 ifl G L J gt_inverse end J gt_centers
gt_inverse_next: I H 1 J gt_inverse_candidate
gt_centers: W 3091 1 M G Z
gt_center: M I 3070 A I G W I 1 M H Z
gt_commute: M A G M B H C S gt_lookup M D A M A H M B G C S gt_lookup ifn A D M I 3070 A I G W I Z W 3091 Z end I H 1 ifl H L J gt_commute end I G 1 ifl G L J gt_center end
 M A @gt_group R E 3091 ifn E Z M A @gt_abelian end C S stats_label M A L A A 48 C S app_put M A 27 C S fa_pad M A @gt_identity_label C S stats_label R A 3090 A A 48 C S app_put M A 54 C S fa_pad M A @gt_inverse_label C S stats_label M A 81 C S fa_pad M G Z
gt_show_inverse: M A G A A 48 C S app_put M A 58 C S app_put M I 3050 A I G R A I A A 48 C S app_put M A 32 C S app_put I G 1 ifl G L J gt_show_inverse end M A 108 C S fa_pad M A @gt_center_label C S stats_label M G Z
gt_show_center: M I 3070 A I G R E I ifn E Z M A G A A 48 C S app_put M A 32 C S app_put end I G 1 ifl G L J gt_show_center end M A 135 C S fa_pad M A @gt_legend J stats_label
gt_not_assoc: M A @gt_not C S stats_label M A 27 C S fa_pad M A @gt_associativity C S stats_label M A 54 C S fa_pad M A @gt_triple C S stats_label R A 3092 A A 48 C S app_put M A 44 C S app_put R A 3093 A A 48 C S app_put M A 44 C S app_put R A 3094 A A 48 C S app_put M A 81 C S fa_pad M A @gt_left C S stats_label R A 3095 A A 48 C S app_put M A @gt_right C S stats_label R A 3096 A A 48 C S app_put M A Z O S P
gt_no_identity: M A @gt_not C S stats_label M A 27 C S fa_pad M A @gt_identity_missing J stats_label
gt_no_inverse: M A @gt_not C S stats_label M A 27 C S fa_pad M A @gt_inverse_missing C S stats_label R A 3092 A A 48 C S app_put M A Z O S P
gt_lookup: P A L A A B A A 3000 R A A O S P
gt_group: ${ascii('GROUP; order=')}
gt_abelian: ${ascii('ABELIAN GROUP; order=')}
gt_identity_label: ${ascii('Identity: ')}
gt_inverse_label: ${ascii('Inverses by element:')}
gt_center_label: ${ascii('Center: ')}
gt_legend: ${ascii('Table: row * column')}
gt_not: ${ascii('NOT A GROUP')}
gt_associativity: ${ascii('Associativity fails')}
gt_triple: ${ascii('a,b,c = ')}
gt_left: ${ascii('(a*b)*c=')}
gt_right: ${ascii('  a*(b*c)=')}
gt_identity_missing: ${ascii('No two-sided identity')}
gt_inverse_missing: ${ascii('No inverse for element ')}
${support}`,
 examples:[{input:'3|012120201',output:row('ABELIAN GROUP; order=3')+row('Identity: 0')+row('Inverses by element:')+row('0:0 1:2 2:1 ')+row('Center: 0 1 2 ')+'Table: row * column'},{input:'2|0001',output:row('NOT A GROUP')+'No inverse for element 0'},{input:'2|0000',output:row('NOT A GROUP')+'No two-sided identity'}],
}];

// Coefficients are little-endian at 2900, remainder at 2920, divisor at 2940,
// quotient at 2980 (eight cells each). Seven factors fit 3050..3056. Degree <=7
// bounds any encoded polynomial by 6560; coefficient products are at most four.
FINITE_ALGEBRA.push({
 number:384,kind:'text',id:'ternary-factors',site:'ternary',title:'Ternary Polynomial Factors',
 inputs:['Digits 0..2'],outputs:['Exact factors modulo 3'],
 description:'Factor a polynomial over the three-element field. Enter one to eight coefficient digits 0,1,2, highest degree first; no leading zero except the single zero polynomial. Example 1001 means x cubed plus 1 and factors as 11*11*11, since arithmetic is modulo 3. The native program extracts the leading unit 1 or 2 and repeatedly divides by monic candidates in ascending degree and coefficient order. Every printed factor is irreducible; repeated factors remain repeated. Constants have no nonconstant factors; zero has no finite factorization. This is polynomial arithmetic, not integer base-three factorization.',
 algorithm:`app_compute: R K 2610 ifl K 1 J fa_bad end ifg K 8 J fa_bad end M I 2900 M E 8 K I E R E 2552 S E 48 ifl E Z J fa_bad end ifg E 2 J fa_bad end W 3091 E ife E Z ifn K 1 J fa_bad end M A @pf_zero J stats_label end M E K I E -1 W 3090 E M G Z
pf_parse: M I 2552 A I G R E I S E 48 ifl E Z J fa_bad end ifg E 2 J fa_bad end R F 3091 ife F 2 P E 2 ifge E 3 I E -3 end end M I K I I -1 S I G A I 2900 W I E I G 1 ifl G K J pf_parse end W 3092 Z W 3093 1 W 3094 3
pf_degree: R E 3093 P E 2 R F 3090 ifg E F J pf_remaining end R E 3094 W 3095 E P E 2 W 3096 E
pf_candidate: R E 3095 R F 3096 ifge E F J pf_next_degree end M I 2940 M E 8 K I E R K 3095 M G Z
pf_decode: M A K M B 3 C S app_div M K A M I 2940 A I G W I C I G 1 N K Z J pf_decode M G Z
pf_copy: M I 2900 A I G R E I M I 2920 A I G W I E M I 2980 A I G W I Z I G 1 ifl G 8 J pf_copy end R K 3090
pf_divide: R E 3093 ifl K E J pf_remainder end M I 2920 A I K R F I W 3097 F ife F Z J pf_divide_next end M I K S I E A I 2980 W I F M G Z
pf_subtract: M I 2940 A I G R E I R F 3097 P E F M J K R F 3093 S J F A J G A J 2920 R A J S A E A A 6 M B 3 C S app_div W J C I G 1 R E 3093 ifle G E J pf_subtract end
pf_divide_next: I K -1 J pf_divide
pf_remainder: M G Z R H 3093
pf_test: ifge G H J pf_found end M I 2920 A I G R E I ifn E Z J pf_next_candidate end I G 1 J pf_test
pf_found: R G 3092 M I 3050 A I G R E 3095 W I E I G 1 W 3092 G R E 3090 S E H W 3090 E M G Z
pf_replace: M I 2980 A I G R E I M I 2900 A I G W I E I G 1 ifl G 8 J pf_replace end R E 3090 ife E Z J pf_output end J pf_candidate
pf_next_candidate: R E 3095 I E 1 W 3095 E J pf_candidate
pf_next_degree: R E 3093 I E 1 W 3093 E R E 3094 P E 3 W 3094 E J pf_degree
pf_remaining: R G 3090 ife G Z J pf_output end M A Z
pf_encode: P A 3 M I 2900 A I G R E I A A E I G -1 ifge G Z J pf_encode end R G 3092 M I 3050 A I G W I A I G 1 W 3092 G
pf_output: M A @pf_unit C S stats_label R A 3091 A A 48 C S app_put M A 27 C S fa_pad M A @pf_monic C S stats_label M A 54 C S fa_pad R L 3092 ife L Z M A @pf_none C S stats_label J pf_footer end M G Z
pf_factor: ifn G Z M A 42 C S app_put end M I 3050 A I G R K I M H Z
pf_digits: M A K M B 3 C S app_div M K A M I 3100 A I H W I C I H 1 N K Z J pf_digits
pf_print: I H -1 M I 3100 A I H R A I A A 48 C S app_put ifg H Z J pf_print end I G 1 ifl G L J pf_factor end
pf_footer: M A 81 C S fa_pad M A @pf_order C S stats_label M A 108 C S fa_pad M A @pf_field J stats_label
pf_zero: ${ascii('Zero has no factorization')}
pf_unit: ${ascii('Unit: ')}
pf_monic: ${ascii('Monic irreducible factors:')}
pf_none: ${ascii('(none; constant)')}
pf_order: ${ascii('Digits: high degree first')}
pf_field: ${ascii('Arithmetic modulo 3')}
${support}`,
 examples:[{input:'2002',output:row('Unit: 2')+row('Monic irreducible factors:')+row('11*11*11')+row('Digits: high degree first')+'Arithmetic modulo 3'},{input:'101',output:row('Unit: 1')+row('Monic irreducible factors:')+row('101')+row('Digits: high degree first')+'Arithmetic modulo 3'},{input:'0',output:'Zero has no factorization'},{input:'01',error:true}],
});
