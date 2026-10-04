import type { TextSoftware } from './native';
import { SAMPLE_OUTPUT } from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const bad='app_bad: M A -1 O S P';
export const NETWORK_SOFTWARE: TextSoftware[] = [
  {
    number:129,kind:'text',id:'ipv4-cidr',site:'relay',title:'IPv4 CIDR notebook',
    description:'Enter four decimal octets followed by /prefix, such as 192.168.1.42/24. Octets are 0..255 and prefix is 0..32. Reports the network address, last address and dotted netmask. Last is the numeric upper bound, not a claim about usable hosts for /31 or /32. Leading zeros are decimal; whitespace and omitted fields are rejected. Arithmetic and parsing run natively.',
    inputs:['IPv4/prefix'],outputs:['Network range'],
    algorithm:`app_compute: M J 2552 R K 2610 M G Z
cidr_octet: C S net_decimal N A Z O S P ifg D 255 J app_bad end M I 2900 A I G W I D E K Z J app_bad R E J ifl G 3 N E 46 J app_bad else N E 47 J app_bad end I J 1 I K -1 I G 1 ifl G 4 J cidr_octet end
 C S net_decimal N A Z O S P N K Z J app_bad ifg D 32 J app_bad end M H D M J Z
cidr_part: M K 8 ifge H 8 M K Z I H -8 else S K H M H Z end M B 1
cidr_power: E K Z J cidr_mask P B 2 I K -1 J cidr_power
cidr_mask: M I 2900 A I J R A I C S app_div P A B M I 2910 A I J W I A A A B I A -1 M I 2920 A I J W I A M A 256 S A B M I 2930 A I J W I A I J 1 ifl J 4 J cidr_part end
 M A @cidr_net C S stats_label M J 2910 C S cidr_address M A @cidr_last C S stats_label M J 2920 C S cidr_address M A @cidr_bits C S stats_label M J 2930 J cidr_address
cidr_address: M K 4
cidr_emit: R F J C S stats_int I J 1 I K -1 ifn K Z M A 46 C S app_put J cidr_emit end M A Z O S P
; Decimal token (one to three digits), J/K immutable-input cursor/remaining.
net_decimal: M D Z M F Z
net_digit: E K Z J net_decimal_done R E J ifl E 48 J net_decimal_done end ifg E 57 J net_decimal_done end ifge F 3 J app_bad end P D 10 S E 48 A D E I F 1 I J 1 I K -1 J net_digit
net_decimal_done: E F Z J app_bad M A Z O S P
cidr_net: ${ascii('net=')}
cidr_last: ${ascii(' last=')}
cidr_bits: ${ascii(' mask=')}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'192.168.1.42/24',output:'net=192.168.1.0 last=192.168.1.255 mask=255.255.255.0'},{input:'10.1.2.3/0',output:'net=0.0.0.0 last=255.255.255.255 mask=0.0.0.0'},{input:'255.255.255.255/32',output:'net=255.255.255.255 last=255.255.255.255 mask=255.255.255.255'},{input:'1.2.3.256/24',error:true}],
  },
  {
    number:130,kind:'text',id:'mac-inspect',site:'radios',title:'MAC address inspector',
    description:'Enter exactly six hexadecimal byte pairs separated by colons. Normalizes letters to uppercase and reports the first-byte group and local bits. group=1 denotes a group/multicast address; local=1 denotes locally administered addressing. Accepts either letter case; rejects whitespace, short fields and other separators. It does not infer a manufacturer or validate ownership.',
    inputs:['MAC address'],outputs:['Canonical + bits'],
    algorithm:`app_compute: R E 2610 ifn E 17 J app_bad end M J 2552 M H Z
mac_pair: R A J C S net_nibble ifl A Z O S P end M G A P G 16 I J 1 R A J C S net_nibble ifl A Z O S P end A G A M I 2900 A I H W I G I J 1 I H 1 ifl H 6 R E J N E 58 J app_bad I J 1 J mac_pair end M J Z
mac_emit: M I 2900 A I J R A I M B 16 C S app_div M K C C S net_hex C S app_put M A K C S net_hex C S app_put I J 1 ifl J 6 M A 58 C S app_put J mac_emit end
 R A 2900 M B 2 C S app_div M G C M B 2 C S app_div M H C
 M A @mac_group C S stats_label M F G C S stats_int M A @mac_local C S stats_label M F H J stats_int
net_nibble: ifge A 48 ifle A 57 S A 48 O S P end end ifge A 65 ifle A 70 S A 55 O S P end end ifge A 97 ifle A 102 S A 87 O S P end end M A -1 O S P
net_hex: ifl A 10 A A 48 else A A 55 end O S P
mac_group: ${ascii(' group=')}
mac_local: ${ascii(' local=')}
${SAMPLE_OUTPUT}
${bad}`,
    examples:[{input:'02:ab:00:10:ff:01',output:'02:AB:00:10:FF:01 group=0 local=1'},{input:'FF:FF:FF:FF:FF:FF',output:'FF:FF:FF:FF:FF:FF group=1 local=1'},{input:'00:00:00:00:00:00',output:'00:00:00:00:00:00 group=0 local=0'},{input:'0:00:00:00:00:00',error:true}],
  },
];
