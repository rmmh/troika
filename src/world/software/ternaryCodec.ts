import type {TextSoftware} from './native';
export const TERNARY_CODEC:TextSoftware={
 number:302,kind:'text',id:'ternary-codec',site:'ternary',title:'Balanced Ternary Codec',
 inputs:['enc n / dec T01'],outputs:['Nine trits / signed value'],
 description:'Convert Troika trytes between signed decimal and nine balanced trits. Type enc -42 or dec 0000T1110. T means -1, 0 means zero, and 1 means +1; the leftmost trit has weight 6561 and the rightmost weight 1. enc accepts an integer from -9841 to 9841 and emits exactly nine trits. dec requires exactly nine uppercase T/0/1 characters and emits signed decimal. Commands are lowercase, with exactly one separating space. A leading decimal minus is allowed; plus signs, extra spaces and more than four decimal digits are rejected. Conversion executes on the native CPU.',
 examples:[{input:'enc -42',output:'0000T1110'},{input:'dec 0000T1110',output:'-42'},{input:'enc 9841',output:'111111111'},{input:'dec TTTTTTTTT',output:'-9841'},{input:'enc 9842',error:true},{input:'dec 101',error:true}],
 algorithm:`app_compute: R E 2610 ifl E 5 J tc_bad end R E 2555 N E 32 J tc_bad
 R E 2552 ife E 101 R E 2553 N E 110 J tc_bad R E 2554 N E 99 J tc_bad J tc_encode end
 N E 100 J tc_bad R E 2553 N E 101 J tc_bad R E 2554 N E 99 J tc_bad
 R E 2610 N E 13 J tc_bad M I 2556 M K 9 M G Z
 tc_decode: R E I M F Z ife E 84 M F -1 else ife E 49 M F 1 else N E 48 J tc_bad end end P G 3 A G F I I 1 I K -1 N K Z J tc_decode
 ifl G Z M A 45 C S app_put P G -1 end
 M H 1000 M L Z
 tc_place: M F Z
 tc_digit: ifge G H S G H I F 1 J tc_digit end
 ifn F Z M L 1 end ife H 1 M L 1 end
 ifn L Z M A F A A 48 C S app_put end
 Q H 10 N H Z J tc_place M A Z O S P
 tc_encode: M I 2556 R K 2610 I K -4 M H 1 R E I ife E 45 M H -1 I I 1 I K -1 end
 ifl K 1 J tc_bad end ifg K 4 J tc_bad end M G Z
 tc_number: R E I ifl E 48 J tc_bad end ifg E 57 J tc_bad end S E 48
 ifg G 984 J tc_bad end ife G 984 ifg E 1 J tc_bad end end P G 10 A G E I I 1 I K -1 N K Z J tc_number P G H
 M I 2908 M K 9
 tc_trit: M E G Q E 3 M F E P F 3 S G F M F 48 ife G -1 M F 84 end ife G 1 M F 49 end W I F M G E I I -1 I K -1 N K Z J tc_trit
 M A 2900 M B 9 J app_emit
 tc_bad: M A -1 O S P`,
};
