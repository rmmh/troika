import type {TextSoftware} from './native';
const header='abc:result (0=false 1=true)'.padEnd(27);
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const format=(bits:string)=>header+[...bits].map((v,i)=>`${i.toString(2).padStart(3,'0')}:${v}`.padEnd(9)).join('').padEnd(81)+(bits==='00000000'?'CONTRADICTION':bits==='11111111'?'TAUTOLOGY':'CONTINGENT');
export const BOOLEAN_TABLE:TextSoftware={
 number:287,kind:'text',id:'boolean-table',site:'relay',title:'Boolean Truth Table',
 inputs:['RPN expression'],outputs:['Values / classification'],
 description:'Enter a postfix Boolean expression using lowercase a,b,c, constants 0/1, ! (NOT), & (AND), | (OR), and ^ (XOR). Spaces are optional. An operator follows its operands: ab& means a AND b; aa!| is always true. Evaluates all eight assignments in abc binary order. Each abc:result field shows false=0 or true=1; the final line classifies the formula as tautology, contradiction or contingent. Empty expressions, unknown symbols, missing operands and extra operands are errors. No host evaluation is used.',
 examples:[{input:'ab&',output:format('00000011')},{input:'aa!|',output:format('11111111')},{input:'ab^c^',output:format('01101001')},{input:'ab',error:true}],
 algorithm:`app_compute: W 3000 Z W 3001 Z
bt_assignment: R E 3000 C S bt_bits M J 2552 R K 2610 M L Z
bt_token: E K Z J bt_result R E J I J 1 I K -1 E E 32 J bt_token
 ifge E 97 ifle E 99 M I 3003 A I E R F I J bt_push end end
 ife E 48 M F Z J bt_push end ife E 49 M F 1 J bt_push end
 ife E 33 ifl L 1 J bt_bad end M I 2899 A I L R E I M F 1 S F E W I F J bt_token end
 ifn E 38 ifn E 124 ifn E 94 J bt_bad end end end
 ifl L 2 J bt_bad end M I 2899 A I L R F I M G I/-1
 ife E 38 P F G else A F G ife E 124 ifg F Z M F 1 end else ife F 1 M F 1 else M F Z end end end
 M I/-1 F I L -1 J bt_token
bt_push: M I 2900 A I L W I F I L 1 J bt_token
bt_result: N L 1 J bt_bad R F 2900 R E 3001 A E F W 3001 E R E 3000 M I 3200 A I E W I F I E 1 W 3000 E ifl E 8 J bt_assignment end
 M A @bt_header M B 27 C S app_emit W 3000 Z
bt_field: R E 3000 C S bt_bits M J 3100 M K 3
bt_digit: R A J A A 48 C S app_put I J 1 I K -1 N K Z J bt_digit M A 58 C S app_put R E 3000 M I 3200 A I E R A I A A 48 C S app_put M K 4
bt_space: M A 32 C S app_put I K -1 N K Z J bt_space R E 3000 I E 1 W 3000 E ifl E 8 J bt_field end
bt_pad: R E 2620 ifl E 108 M A 32 C S app_put J bt_pad end R E 3001 ife E Z M A @bt_false M B 13 else ife E 8 M A @bt_true M B 9 else M A @bt_mixed M B 10 end end J app_emit
bt_bad: M A -1 O S P
; E=assignment. Native Boolean digit extraction; no host-generated truth table.
bt_bits: M F Z ifge E 4 M F 1 I E -4 end W 3100 F M F Z ifge E 2 M F 1 I E -2 end W 3101 F W 3102 E O S P
bt_header: ${ascii(header)}
bt_false: ${ascii('CONTRADICTION')}
bt_true: ${ascii('TAUTOLOGY')}
bt_mixed: ${ascii('CONTINGENT')}`,
};
