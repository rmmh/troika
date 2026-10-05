import type {TextSoftware} from './native';
import {SAMPLE_PARSE,SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const parse=(count:number)=>`app_compute: C S stats_parse N A Z O S P R E 3000 ifn E ${count} J app_bad end `;
const bound=(p:number,lo:number,hi:number)=>`R E ${p} ifl E ${lo} J app_bad end ifg E ${hi} J app_bad end `;
const common=`nt_pad: M B A
nt_pad_next: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J nt_pad_next
nt_gcd: E B Z O S P C S app_div M A B M B C J nt_gcd
; Normalize signed A modulo positive B. Preserve G/H/J/K/L.
nt_mod: ifl A Z F A A C S app_div ifn C Z M A B S A C else M A Z end else C S app_div M A C end O S P
; Print the count in3200 and ascending list at3100 in three-character fields.
nt_list: M A @nt_count C S stats_label R F 3200 C S stats_int M A 27 C S nt_pad R K 3200 ife K Z M A @nt_none J stats_label end M J Z
nt_item: R G 2620 I G 3 M I 3100 A I J R F I C S stats_int M A G C S nt_pad I J 1 ifl J K J nt_item end M A Z O S P
nt_count: ${ascii('solutions=')}
nt_none: ${ascii('NONE')}
app_bad: M A -1 O S P
${SAMPLE_PARSE}
${SAMPLE_OUTPUT}`;
export const NUMBER_THEORY_WORKSHOP:TextSoftware[]=[
{number:292,kind:'text',id:'congruence-pair',site:'clockwork',title:'Congruence Pair',inputs:['a m b n'],outputs:['Shared residue / period'],description:'Find all integers x with x modulo m equal to a and x modulo n equal to b. Enter a m b n, where moduli are 1..99 and each residue is 0..modulus-1. Moduli may share factors. Reports the least nonnegative solution and period lcm(m,n), or NONE. Every solution is x plus an integer multiple of period. Example 2 6 5 9 gives x=14, period=18; 1 2 0 4 has no solution.',algorithm:parse(4)+bound(2900,0,98)+bound(2901,1,99)+bound(2902,0,98)+bound(2903,1,99)+`R E 2900 R F 2901 ifge E F J app_bad end R E 2902 R F 2903 ifge E F J app_bad end R A 2901 R B 2903 C S nt_gcd M B A R A 2901 C S app_div R E 2903 P A E M L A R G 2900 R H 2901 R K 2903
crt_find: ifge G L M A @nt_none J stats_label end M A G M B K C S app_div R E 2902 ife C E J crt_found end A G H J crt_find
crt_found: M A @crt_x C S stats_label M F G C S stats_int M A 27 C S nt_pad M A @crt_period C S stats_label M F L J stats_int
crt_x: ${ascii('x=')}
crt_period: ${ascii('period=')}
${common}`,examples:[{"input":"2 6 5 9","output":"x=14                       period=18"},{"input":"1 2 0 4","output":"NONE"},{"input":"98 99 97 98","output":"x=9701                     period=9702"}]},
{number:293,kind:'text',id:'diophantine-line',site:'toolshed',title:'Diophantine Line',inputs:['a b c'],outputs:['Integer solution family'],description:'Solve a*x+b*y=c over all integers. Enter positive a,b=1..99 and c=-99..99. Reports NONE if gcd(a,b) does not divide c. Otherwise x0 is the smallest nonnegative possible x; y0 may be negative. The complete family is x=x0+dx*t and y=y0+dy*t for any integer t. Example 6 9 3 gives x0=2,y0=-1,dx=3,dy=-2. No nonnegative-y restriction is imposed.',algorithm:parse(3)+bound(2900,1,99)+bound(2901,1,99)+`R A 2900 R B 2901 C S nt_gcd W 3200 A M B A R A 2902 C S nt_mod ifn A Z M A @nt_none J stats_label end R A 2901 R B 3200 C S app_div W 3201 A R A 2900 R B 3200 C S app_div P A -1 W 3202 A M G Z
dio_find: R H 2900 P H G R E 2902 S H E M A H R B 2901 C S nt_mod E A Z J dio_found I G 1 J dio_find
dio_found: M A H F A A R B 2901 C S app_div M H A R E 2900 P E G R F 2902 S F E ifl F Z P H -1 end W 3203 G W 3204 H M A @dio_origin C S stats_label M F G C S stats_int M A @dio_y C S stats_label M F H C S stats_int M A 27 C S nt_pad M A @dio_dx C S stats_label R F 3201 C S stats_int M A @dio_dy C S stats_label R F 3202 C S stats_int M A 54 C S nt_pad M A @dio_rule J stats_label
dio_origin: ${ascii('x0=')}
dio_y: ${ascii(' y0=')}
dio_dx: ${ascii('dx=')}
dio_dy: ${ascii(' dy=')}
dio_rule: ${ascii('x=x0+dx*t; y=y0+dy*t')}
${common}`,examples:[{"input":"6 9 3","output":"x0=2 y0=-1                 dx=3 dy=-2                 x=x0+dx*t; y=y0+dy*t"},{"input":"2 4 1","output":"NONE"},{"input":"99 98 -99","output":"x0=97 y0=-99               dx=98 dy=-99               x=x0+dx*t; y=y0+dy*t"}]},
{number:294,kind:'text',id:'mod-square-roots',site:'crystal',title:'Modular Square Roots',inputs:['a modulus'],outputs:['All x: x*x mod m = a'],description:'Find every square root of a modulo m, including composite moduli and zero roots. Enter a m, with m=2..99 and 0<=a<m. Lists every x in 0..m-1 in increasing order, nine three-character fields per row; solutions=0 prints NONE. Native arithmetic updates successive square residues without floating point. Example 1 8 gives roots 1,3,5,7. Unlike a Jacobi value of 1, this is an actual complete root list.',algorithm:parse(2)+bound(2900,0,98)+bound(2901,2,99)+`R E 2900 R F 2901 ifge E F J app_bad end W 3200 Z M G Z M H Z R K 2901
sq_next: R E 2900 ife H E R E 3200 M I 3100 A I E W I G I E 1 W 3200 E end M A G P A 2 I A 1 A A H M B K C S app_div M H C I G 1 ifl G K J sq_next end J nt_list
${common}`,examples:[{"input":"1 8","output":"solutions=4                1  3  5  7  "},{"input":"0 81","output":"solutions=9                0  9  18 27 36 45 54 63 72 "},{"input":"2 15","output":"solutions=0                NONE"}]},
{number:295,kind:'text',id:'primitive-roots',site:'keys',title:'Primitive Root Census',inputs:['Modulus (2..99)'],outputs:['Generators of unit group'],description:'List all primitive roots modulo m=2..99. A generator visits every residue coprime to m before returning to 1. Reports phi(m), the size of this unit group, and all generators in ascending order, nine three-character fields per row. Composite moduli are supported; NONE means their unit group has no single generator. Example 9 gives phi=6 and generators 2,5, while 8 has none. At most 40 generators fit the complete display.',algorithm:parse(1)+bound(2900,2,99)+`R K 2900 M G 1 M H Z
root_phi: M A G M B K C S nt_gcd ife A 1 I H 1 end I G 1 ifl G K J root_phi end W 3201 H W 3200 Z M G 1
root_candidate: M A G M B K C S nt_gcd ifn A 1 J root_next end M H 1 M J Z
root_power: M A H P A G M B K C S app_div M H C I J 1 ifn H 1 J root_power end R E 3201 ife J E R E 3200 M I 3100 A I E W I G I E 1 W 3200 E end
root_next: I G 1 ifl G K J root_candidate end M A @root_phi_label C S stats_label R F 3201 C S stats_int M A @root_count C S stats_label R F 3200 C S stats_int M A 27 C S nt_pad R K 3200 ife K Z M A @nt_none J stats_label end M J Z J nt_item
root_phi_label: ${ascii('phi=')}
root_count: ${ascii(' generators=')}
${common}`,examples:[{"input":"9","output":"phi=6 generators=2         2  5  "},{"input":"8","output":"phi=4 generators=0         NONE"},{"input":"83","output":"phi=82 generators=40       2  5  6  8  13 14 15 18 19 20 22 24 32 34 35 39 42 43 45 46 47 50 52 53 54 55 56 57 58 60 62 66 67 71 72 73 74 76 79 80 "}]},
{number:296,kind:'text',id:'mobius-sieve',site:'seedbank',title:'Mobius Sieve',inputs:['Limit (1..99)'],outputs:['Mobius / prefix census'],description:'Sieve integers 1..n for n=1..99. mu(n) is 0 if a prime square divides n, otherwise +1 for an even number of distinct prime factors and -1 for odd; mu(1)=1. Mertens is the exact sum of mu(1)..mu(n). Squarefree counts values 1..n with nonzero mu, including 1. Example 10 gives mu=1, Mertens=-1, squarefree=7. These three quantities describe different aspects of the same factorization sieve.',algorithm:parse(1)+bound(2900,1,99)+`M E 3200 M F 100 K E F M J 3100 M K 100
mu_init: W J 1 I J 1 I K -1 N K Z J mu_init R L 2900 M G 2
mu_prime: ifg G L J mu_finish end M I 3200 A I G R E I N E Z J mu_next M J G
mu_multiple: M I 3200 A I J W I 1 M I 3100 A I J R E I P E -1 W I E A J G ifle J L J mu_multiple end M H G P H G ifg H L J mu_next end M J H
mu_square: M I 3100 A I J W I Z A J H ifle J L J mu_square end
mu_next: I G 1 J mu_prime
mu_finish: M G Z M H Z M J 1
mu_sum: M I 3100 A I J R E I A G E ifn E Z I H 1 end I J 1 ifle J L J mu_sum end M A @mu_value C S stats_label M I 3100 A I L R F I C S stats_int M A 27 C S nt_pad M A @mu_prefix C S stats_label M F G C S stats_int M A 54 C S nt_pad M A @mu_free C S stats_label M F H J stats_int
mu_value: ${ascii('mu(n)=')}
mu_prefix: ${ascii('Mertens=')}
mu_free: ${ascii('squarefree=')}
${common}`,examples:[{"input":"10","output":"mu(n)=1                    Mertens=-1                 squarefree=7"},{"input":"1","output":"mu(n)=1                    Mertens=1                  squarefree=1"},{"input":"99","output":"mu(n)=0                    Mertens=1                  squarefree=61"}]},
{number:297,kind:'text',id:'jacobi-symbol',site:'observatory',title:'Jacobi Symbol',inputs:['a odd-n'],outputs:['Jacobi(a,n) / meaning'],description:'Compute the Jacobi symbol (a/n) for a=-99..99 and positive odd n=1..99 using factor-of-two rules and quadratic reciprocity. Convention (a/1)=1. Zero means a and n share a factor; -1 rules out a square residue. A value of 1 does NOT prove a is a square modulo composite n and is not a primality test. Example 2 15 gives 1 although 2 has no square root modulo 15.',algorithm:parse(2)+bound(2901,1,99)+`R A 2901 M B 2 C S app_div ife C Z J app_bad end R A 2900 R B 2901 C S nt_mod M G A R H 2901 M K 1
ja_loop: E G Z J ja_done M A G M B 2 C S app_div ife C Z M G A M A H M B 8 C S app_div ife C 3 P K -1 end ife C 5 P K -1 end J ja_loop end M A G M B 4 C S app_div M L C M A H M B 4 C S app_div ife L 3 ife C 3 P K -1 end end M A H M B G C S app_div M H G M G C J ja_loop
ja_done: ifn H 1 M K Z end M A @ja_value C S stats_label M F K C S stats_int M A 27 C S nt_pad M A @ja_one ife K Z M A @ja_zero end ifl K Z M A @ja_negative end J stats_label
ja_value: ${ascii('Jacobi=')}
ja_one: ${ascii('1 is not a square proof')}
ja_zero: ${ascii('Shared factor (n>1)')}
ja_negative: ${ascii('Not a square residue')}
${common}`,examples:[{"input":"2 15","output":"Jacobi=1                   1 is not a square proof"},{"input":"3 15","output":"Jacobi=0                   Shared factor (n>1)"},{"input":"2 3","output":"Jacobi=-1                  Not a square residue"},{"input":"-1 1","output":"Jacobi=1                   1 is not a square proof"}]},
];
