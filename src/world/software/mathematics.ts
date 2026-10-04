import type { NativeSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const bad = 'app_bad: M A -1 O S P';

export const MATHEMATICAL_SOFTWARE: NativeSoftware[] = [
  {
    number: 27, id: 'mod-power', site: 'keys', title: 'Modular power bench',
    description: 'Computes base^exponent modulo m by repeated squaring. Base and exponent are nonnegative trytes; modulus is 1..99. Exponent zero gives 1 modulo m, including base zero.',
    inputs: ['Base', 'Exponent', 'Modulus (1..99)'], outputs: ['Residue'],
    algorithm: `app_compute: R G 2552 R H 2553 R J 2554
 ifl G Z J app_bad end ifl H Z J app_bad end ifl J 1 J app_bad end ifg J 99 J app_bad end
 M A G M B J C S app_div M G C M A 1 C S app_div M K C
app_power: E H Z J app_done M A H M B 2 C S app_div M H A
 ifn C Z M A K P A G M B J C S app_div M K C end
 M A G P A G M B J C S app_div M G C J app_power
app_done: W 2560 K M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[2,10,99],output:[34]}, {input:[9841,9841,97],output:[44]}, {input:[0,0,1],output:[0]}, {input:[0,0,7],output:[1]}, {input:[2,-1,7],error:true}, {input:[2,3,100],error:true}],
  },
  {
    number: 28, id: 'mod-inverse', site: 'keys', title: 'Modular inverse finder',
    description: 'Finds x in 1..m-1 for which a*x modulo m is 1. Accepts a nonnegative tryte and modulus 2..99. Reports an error when no inverse exists.',
    inputs: ['Value a', 'Modulus (2..99)'], outputs: ['Inverse'],
    algorithm: `app_compute: R A 2552 R H 2553 ifl A Z J app_bad end ifl H 2 J app_bad end ifg H 99 J app_bad end
 M B H C S app_div M G C M J 1
app_candidate: M A G P A J C S app_div E C 1 J app_done I J 1 ifl J H J app_candidate end J app_bad
app_done: W 2560 J M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[3,11],output:[4]}, {input:[98,99],output:[98]}, {input:[0,7],error:true}, {input:[6,9],error:true}, {input:[7,1],error:true}],
  },
  {
    number: 29, id: 'totient', site: 'crystal', title: 'Coprime census',
    description: 'Euler totient counts integers from 1 through n that are coprime to n. Uses distinct prime factors, accepting n in 1..9841; phi(1) is 1.',
    inputs: ['Positive n'], outputs: ['Coprime count'],
    algorithm: `app_compute: R G 2552 ifl G 1 J app_bad end M H G M J 2
app_factor: M A G M B J C S app_div ifg J A J app_last end
 ife C Z M G A M A H C S app_div S H A
app_strip: M A G C S app_div ife C Z M G A J app_strip end
 end I J 1 J app_factor
app_last: ifg G 1 M A H M B G C S app_div S H A end W 2560 H M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[1],output:[1]}, {input:[36],output:[12]}, {input:[97],output:[96]}, {input:[8192],output:[4096]}, {input:[0],error:true}],
  },
  {
    number: 30, id: 'prime-sieve', site: 'ternary', title: 'Prime sieve',
    description: 'Marks composites with the sieve of Eratosthenes, then reports the number and largest prime at or below n. Accepts 0..999. Largest is zero when no primes exist.',
    inputs: ['Limit (0..999)'], outputs: ['Prime count', 'Largest prime'],
    algorithm: `app_compute: R G 2552 ifl G Z J app_bad end ifg G 999 J app_bad end
 M I 2900 M H Z
app_clear_sieve: W I Z I I 1 I H 1 ifle H G J app_clear_sieve end
 M H 2 M J Z M K Z
app_sieve: ifg H G J app_done end M I 2900 A I H R E I
 ife E Z I J 1 M K H M L H A L H
app_mark: ifg L G J app_sieve_next end M I 2900 A I L W I 1 A L H J app_mark
 end
app_sieve_next: I H 1 J app_sieve
app_done: W 2560 J W 2561 K M A Z O S P
${bad}`,
    examples: [{input:[0],output:[0,0]}, {input:[2],output:[1,2]}, {input:[100],output:[25,97]}, {input:[999],output:[168,997]}, {input:[1000],error:true}],
  },
  {
    number: 31, id: 'fibonacci', site: 'seedbank', title: 'Fibonacci recurrence',
    description: 'Computes F(n) by successive addition, with F(0)=0 and F(1)=1. Accepts indices 0..20, the complete range whose result fits a positive tryte.',
    inputs: ['Index (0..20)'], outputs: ['Fibonacci'],
    algorithm: `app_compute: R G 2552 ifl G Z J app_bad end ifg G 20 J app_bad end M H Z M J 1
app_fib: E G Z J app_done ife G 1 M H J J app_done end M E H A E J M H J M J E I G -1 J app_fib
app_done: W 2560 H M A Z O S P
${bad}`,
    examples: [{input:[0],output:[0]}, {input:[1],output:[1]}, {input:[10],output:[55]}, {input:[20],output:[6765]}, {input:[21],error:true}],
  },
  {
    number: 32, id: 'partitions', site: 'cardtable', title: 'Integer partitions',
    description: 'Counts ways to write n as a sum of positive integers without regard to order. A native dynamic-programming table handles 0..30; the empty partition counts once.',
    inputs: ['Total (0..30)'], outputs: ['Partitions'],
    algorithm: `app_compute: R G 2552 ifl G Z J app_bad end ifg G 30 J app_bad end M I 2670 M E 31
app_partition_zero: W I Z I I 1 I E -1 N E Z J app_partition_zero W 2670 1 M H 1
app_part: ifg H G J app_done end M J H
app_sum: M I 2670 A I J R K I S I H R L I A K L A I H W I K I J 1 ifle J G J app_sum end
 I H 1 J app_part
app_done: M I 2670 A I G R E I W 2560 E M A Z O S P
${bad}`,
    examples: [{input:[0],output:[1]}, {input:[5],output:[7]}, {input:[10],output:[42]}, {input:[30],output:[5604]}, {input:[31],error:true}],
  },
  {
    number: 33, id: 'catalan', site: 'puzzlebox', title: 'Balanced-pair counter',
    description: 'Counts correctly nested strings of n opening and n closing brackets using the Catalan convolution. Accepts 0..9 pairs; the empty string counts once.',
    inputs: ['Pairs (0..9)'], outputs: ['Arrangements'],
    algorithm: `app_compute: R G 2552 ifl G Z J app_bad end ifg G 9 J app_bad end W 2670 1 M H 1
app_catalan_row: ifg H G J app_done end M J Z M K Z
app_term: M I 2670 A I J R E I M I 2670 A I H I I -1 S I J R F I P E F A K E
 I J 1 ifl J H J app_term end M I 2670 A I H W I K I H 1 J app_catalan_row
app_done: M I 2670 A I G R E I W 2560 E M A Z O S P
${bad}`,
    examples: [{input:[0],output:[1]}, {input:[3],output:[5]}, {input:[8],output:[1430]}, {input:[9],output:[4862]}, {input:[10],error:true}],
  },
  {
    number: 34, id: 'triangle', site: 'maps', title: 'Triangle classifier',
    description: 'Validates three integer sides in 1..57 and classifies their angles by squared lengths. Angle code -1 means acute, 0 right, 1 obtuse. Also reports perimeter. Degenerate triangles are rejected.',
    inputs: ['Side a (1..57)', 'Side b (1..57)', 'Side c (1..57)'], outputs: ['Angle (-1/0/1)', 'Perimeter'],
    algorithm: `app_compute: R G 2552 R H 2553 R J 2554
 ifl G 1 J app_bad end ifg G 57 J app_bad end ifl H 1 J app_bad end ifg H 57 J app_bad end ifl J 1 J app_bad end ifg J 57 J app_bad end
 ifg G H M E G M G H M H E end ifg H J M E H M H J M J E end
 M E G A E H ifle E J J app_bad end A E J W 2561 E
 P G G P H H P J J A G H M E Z ifl J G M E -1 end ifg J G M E 1 end W 2560 E M A Z O S P
${bad}`,
    examples: [{input:[3,4,5],output:[0,12]}, {input:[5,3,4],output:[0,12]}, {input:[2,2,3],output:[1,7]}, {input:[57,57,57],output:[-1,171]}, {input:[1,2,3],error:true}],
  },
  {
    number: 35, id: 'weekday', site: 'sundial', title: 'Century calendar',
    description: 'Validates a Gregorian date in 2000..2099 and reports weekday (Sunday=0 through Saturday=6) and day of year (1..366). February follows the leap-year rule for this century.',
    inputs: ['Year (2000-2099)', 'Month (1..12)', 'Day (1..31)'], outputs: ['Weekday (Sun=0)', 'Day of year'],
    algorithm: `app_compute: R G 2552 S G 2000 R H 2553 R J 2554
 ifl G Z J app_bad end ifg G 99 J app_bad end ifl H 1 J app_bad end ifg H 12 J app_bad end ifl J 1 J app_bad end
 M A G M B 4 C S app_div M L Z E C Z M L 1 M I @app_months A I H I I -1 R E I ife H 2 A E L end ifg J E J app_bad end
 M K J M I @app_months M E 1
app_month: ifge E H J app_ordinal end R F I A K F ife E 2 A K L end I I 1 I E 1 J app_month
app_ordinal: W 2561 K M A G I A 3 M B 4 C S app_div A A G A A K I A 5 M B 7 C S app_div W 2560 C M A Z O S P
${bad}
app_months: 31 28 31 30 31 30 31 31 30 31 30 31
${POSITIVE_DIVISION}`,
    examples: [{input:[2000,1,1],output:[6,1]}, {input:[2000,2,29],output:[2,60]}, {input:[2024,2,29],output:[4,60]}, {input:[2099,12,31],output:[4,365]}, {input:[2001,2,29],error:true}, {input:[2100,1,1],error:true}],
  },
  {
    number: 36, id: 'coin-change', site: 'menus', title: 'Minimum coin change',
    description: 'Finds the fewest coins making an amount 0..243, using unlimited unit coins and two chosen denominations in 1..99. Dynamic programming handles denominations for which greedy change fails.',
    inputs: ['Amount (0..243)', 'Coin a (1..99)', 'Coin b (1..99)'], outputs: ['Minimum coins'],
    algorithm: `app_compute: R G 2552 R H 2553 R J 2554
 ifl G Z J app_bad end ifg G 243 J app_bad end ifl H 1 J app_bad end ifg H 99 J app_bad end ifl J 1 J app_bad end ifg J 99 J app_bad end
 W 2670 Z M K 1
app_amount: ifg K G J app_done end M I 2670 A I K I I -1 R L I I L 1
 ifge K H M I 2670 A I K S I H R E I I E 1 ifl E L M L E end end
 ifge K J M I 2670 A I K S I J R E I I E 1 ifl E L M L E end end
 M I 2670 A I K W I L I K 1 J app_amount
app_done: M I 2670 A I G R E I W 2560 E M A Z O S P
${bad}`,
    examples: [{input:[6,3,4],output:[2]}, {input:[0,1,1],output:[0]}, {input:[243,1,1],output:[243]}, {input:[19,7,9],output:[3]}, {input:[5,0,3],error:true}],
  },
  {
    number: 37, id: 'hamming-decode', site: 'radios', title: 'Hamming 7,4 decoder',
    description: 'Decodes a seven-bit Hamming word (0..127), correcting one flipped bit with even parity. Reports data, corrected codeword, and corrected bit (0 means none, LSB=1). Multiple-bit errors cannot be detected reliably.',
    inputs: ['Word (0..127)'], outputs: ['Data (0..15)', 'Corrected word', 'Corrected bit'],
    algorithm: `app_compute: R G 2552 ifl G Z J app_bad end ifg G 127 J app_bad end M A G M B 2 M I 2670 M H 7
app_bits: C S app_div W I C I I 1 I H -1 N H Z J app_bits
 R A 2670 R E 2672 A A E R E 2674 A A E R E 2676 A A E C S app_div M J C
 R A 2671 R E 2672 A A E R E 2675 A A E R E 2676 A A E C S app_div P C 2 A J C
 R A 2673 R E 2674 A A E R E 2675 A A E R E 2676 A A E C S app_div P C 4 A J C W 2562 J
 ifn J Z M H 1 M K 1
app_weight: ifge H J J app_flip end P K 2 I H 1 J app_weight
app_flip: M I 2669 A I J R E I ife E Z A G K W I 1 else S G K W I Z end end
 W 2561 G R E 2676 P E 2 R F 2675 A E F P E 2 R F 2674 A E F P E 2 R F 2672 A E F W 2560 E M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[0],output:[0,0,0]}, {input:[7],output:[1,7,0]}, {input:[6],output:[1,7,1]}, {input:[127],output:[15,127,0]}, {input:[128],error:true}],
  },
  {
    number: 38, id: 'luhn-digit', site: 'tickets', title: 'Luhn check-digit bench',
    description: 'Computes the Luhn decimal check digit to append to a short nonnegative identifier (0..9841). Doubles alternate digits starting at the right of the supplied body, summing decimal digits of doubled values.',
    inputs: ['Identifier body'], outputs: ['Check digit'],
    algorithm: `app_compute: R G 2552 ifl G Z J app_bad end M H Z M J 1 M B 10
app_digit: M A G C S app_div M G A ife J 1 P C 2 ifg C 9 I C -9 end end A H C M E 1 S E J M J E N G Z J app_digit
 M A H C S app_div M E Z ifn C Z M E 10 S E C end W 2560 E M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[0],output:[0]}, {input:[7992],output:[1]}, {input:[1234],output:[4]}, {input:[-1],error:true}],
  },
];
