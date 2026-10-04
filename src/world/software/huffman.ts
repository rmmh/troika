import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const HUFFMAN_SOFTWARE:TextSoftware = {
  number:150,kind:'text',id:'huffman-lengths',site:'signals',title:'Huffman Code Lengths',
  description:'Analyzes up to 54 characters containing at most nine distinct ASCII symbols. Builds a native Huffman tree and prints each symbol as hex:length in first-appearance order, followed by the total payload bit count. Equal weights prefer the earlier-created node. A single-symbol alphabet uses one bit per character; empty input prints EMPTY. Header and codebook storage costs are excluded. This analyzer does not emit a compressed file.',
  inputs:['Text (9 symbols)'],outputs:['Lengths and bits'],
  algorithm:`app_compute: M J Z
huff_clear: M I 3000 A I J W I Z M I 3100 A I J W I -1 I J 1 ifl J 17 J huff_clear end M J Z M G Z
huff_input: R E 2610 ifge J E J huff_tree end M I 2552 A I J R H I M K Z
huff_find: ifge K G J huff_new end M I 2900 A I K R E I E E H J huff_count I K 1 J huff_find
huff_new: ifge G 9 J app_bad end M I 2900 A I G W I H I G 1
huff_count: M I 3000 A I K R E I I E 1 W I E I J 1 J huff_input
huff_tree: ife G Z M A @huff_empty J stats_label end W 3200 G M E G P E 2 I E -1 W 3203 E
huff_merge: R E 3203 ifge G E J huff_output end M D -1 C S huff_min W 3202 H M D H C S huff_min R E 3202 M I 3000 A I E R F I M I 3000 A I H R K I A K F M I 3000 A I G W I K M I 3100 A I E W I G M I 3100 A I H W I G I G 1 J huff_merge
; Return H: smallest active weight, then creation index, excluding D.
huff_min: M J Z M H -1 M L 99
huff_candidate: ifge J G O S P end ifn J D M I 3100 A I J R E I ife E -1 M I 3000 A I J R E I ifl E L M L E M H J end end end I J 1 J huff_candidate
huff_output: M J Z M L Z R H 3200
huff_leaf: M K Z M G J
huff_parent: M I 3100 A I G R G I ifl G Z J huff_length end I K 1 J huff_parent
huff_length: ife H 1 M K 1 end M I 3000 A I J R E I P E K A L E ifn J Z M A 32 C S app_put end M I 2900 A I J R A I M B 16 C S app_div M G C M I @huff_hex A I A R A I C S app_put M I @huff_hex A I G R A I C S app_put M A 58 C S app_put M F K C S stats_int I J 1 ifl J H J huff_leaf end M A @huff_bits C S stats_label M F L J stats_int
huff_hex: ${text('0123456789ABCDEF')}
huff_bits: ${text(' bits=')}
huff_empty: ${text('EMPTY')}
${SAMPLE_OUTPUT}
app_bad: M A -1 O S P`,
  examples:[{input:'aaabbc',output:'61:1 62:2 63:2 bits=9'},{input:'aaaa',output:'61:1 bits=4'},{input:'',output:'EMPTY'},{input:'0123456789',error:true}],
};
