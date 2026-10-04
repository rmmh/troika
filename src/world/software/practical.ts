import type { NativeSoftware } from './native';
import { BINARY_XOR, POSITIVE_DIVISION } from './arithmetic';

const bad = 'app_bad: M A -1 O S P';

export const PRACTICAL_SOFTWARE: NativeSoftware[] = [
  {
    number: 5, id: 'fraction', site: 'ada', title: 'Fraction reducer',
    description: 'Reduces a signed fraction to coprime numerator and positive denominator. A zero denominator is rejected; zero becomes 0/1.',
    inputs: ['Numerator', 'Denominator'], outputs: ['Numerator', 'Denominator'],
    algorithm: `app_compute: R G 2552 R H 2553 E H Z J app_bad
 M A G F A A M B H F B A
app_gcd: E B Z J app_reduce C S app_div M A B M B C J app_gcd
app_reduce: M B A M A G F A A C S app_div
 ifl G Z P A -1 end ifl H Z P A -1 end W 2560 A
 M A H F A A C S app_div W 2561 A M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[42,56],output:[3,4]}, {input:[-42,-56],output:[3,4]}, {input:[42,-56],output:[-3,4]}, {input:[0,9841],output:[0,1]}, {input:[7,0],error:true}],
  },
  {
    number: 6, id: 'cycle-align', site: 'clockwork', title: 'Cycle alignment',
    description: 'Finds the first common tick of two positive repeating periods. Reports their LCM and the number of turns of each. Rejects results above 9841.',
    inputs: ['First period', 'Second period'], outputs: ['Common tick', 'First turns', 'Second turns'],
    algorithm: `app_compute: R G 2552 R H 2553 ifl G 1 J app_bad end ifl H 1 J app_bad end
 M A G M B H
app_gcd: E B Z J app_lcm C S app_div M A B M B C J app_gcd
app_lcm: M B A M A G C S app_div M J A
 M A 9841 M B H C S app_div ifg J A J app_bad end
 P J H W 2560 J M A J M B G C S app_div W 2561 A
 M A J M B H C S app_div W 2562 A M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[12,18],output:[36,3,2]}, {input:[9841,9841],output:[9841,1,1]}, {input:[99,100],error:true}, {input:[0,7],error:true}],
  },
  {
    number: 7, id: 'divmod', site: 'ada', title: 'Signed division bench',
    description: 'Integer division truncates toward zero. The remainder has the dividend sign and satisfies dividend = quotient*divisor + remainder. Zero divisors are rejected.',
    inputs: ['Dividend', 'Divisor'], outputs: ['Quotient', 'Remainder'],
    algorithm: `app_compute: R G 2552 R H 2553 E H Z J app_bad
 M A G F A A M B H F B A C S app_div
 ifl G Z P A -1 P C -1 end ifl H Z P A -1 end
 W 2560 A W 2561 C M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[-7,3],output:[-2,-1]}, {input:[7,-3],output:[-2,1]}, {input:[-9841,-2],output:[4920,-1]}, {input:[9841,1],output:[9841,0]}, {input:[1,0],error:true}],
  },
  {
    number: 8, id: 'hailstone', site: 'orbit', title: 'Hailstone orbit',
    description: 'Iterates n/2 for even n and 3*n+1 for odd n until 1. Reports steps and peak. Positive seeds only; rejects an intermediate above 9841 or a run beyond 500 steps.',
    inputs: ['Positive seed'], outputs: ['Steps', 'Peak'],
    algorithm: `app_compute: R G 2552 ifl G 1 J app_bad end M H G M J Z
app_step: E G 1 J app_done ifge J 500 J app_bad end
 M A G M B 2 C S app_div
 ife C Z M G A else ifg G 3280 J app_bad end P G 3 I G 1 end
 ifg G H M H G end I J 1 J app_step
app_done: W 2560 J W 2561 H M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[1],output:[0,1]}, {input:[6],output:[8,16]}, {input:[27],output:[111,9232]}, {input:[9841],error:true}, {input:[0],error:true}],
  },
  {
    number: 9, id: 'josephus', site: 'scorebook', title: 'Circle elimination',
    description: 'Number players 1..n in a circle. Starting at 1, remove every kth remaining player. Reports the survivor using the Josephus recurrence. Both inputs are 1..243.',
    inputs: ['Players (1..243)', 'Count (1..243)'], outputs: ['Survivor'],
    algorithm: `app_compute: R G 2552 R H 2553 ifl G 1 J app_bad end ifg G 243 J app_bad end
 ifl H 1 J app_bad end ifg H 243 J app_bad end M J Z M B 1
app_circle: M A J A A H C S app_div M J C I B 1 ifle B G J app_circle end
 I J 1 W 2560 J M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[7,3],output:[4]}, {input:[5,2],output:[3]}, {input:[1,243],output:[1]}, {input:[244,2],error:true}],
  },
  {
    number: 10, id: 'nim', site: 'mancala', title: 'Three-heap Nim coach',
    description: 'Normal-play Nim: remove any positive number from one heap; taking the last token wins. For heaps 0..4095, returns a winning move if one exists. Heap 0 means the position is losing.',
    inputs: ['Heap 1', 'Heap 2', 'Heap 3'], outputs: ['Winning (0/1)', 'Heap to reduce', 'Remove'],
    algorithm: `app_compute: W 2566 Z W 2567 Z
app_validate: R I 2566 A I 2552 R B I ifl B Z J app_bad end ifg B 4095 J app_bad end
 R A 2567 C S app_xor W 2567 A R E 2566 I E 1 W 2566 E ifl E 3 J app_validate end
 W 2560 Z W 2561 Z W 2562 Z R E 2567 E E Z M A Z E E Z O S P
 W 2566 Z
app_move: R I 2566 A I 2552 R A I W 2568 A R B 2567 C S app_xor
 R E 2568 ifl A E S E A W 2562 E R E 2566 I E 1 W 2561 E W 2560 1 M A Z O S P end
 R E 2566 I E 1 W 2566 E J app_move
${bad}
${BINARY_XOR}`,
    examples: [{input:[3,4,5],output:[1,1,2]}, {input:[1,2,3],output:[0,0,0]}, {input:[0,0,7],output:[1,3,7]}, {input:[4095,4095,1],output:[1,1,1]}, {input:[4096,1,1],error:true}],
  },
  {
    number: 11, id: 'hamming', site: 'signals', title: 'Hamming 7,4 encoder',
    description: 'Encodes a four-bit value (0..15) into a seven-bit Hamming code with even parity. Data bits occupy positions 3,5,6,7, numbered from the least significant bit. Detects invalid input.',
    inputs: ['Data (0..15)'], outputs: ['Codeword'],
    algorithm: `app_compute: R A 2552 ifl A Z J app_bad end ifg A 15 J app_bad end
 M B 2 C S app_div W 2566 C C S app_div W 2567 C C S app_div W 2568 C W 2569 A
 R G 2566 P G 4 R H 2567 P H 16 A G H R H 2568 P H 32 A G H R H 2569 P H 64 A G H
 R A 2566 R E 2567 A A E R E 2569 A A E C S app_div A G C
 R A 2566 R E 2568 A A E R E 2569 A A E C S app_div P C 2 A G C
 R A 2567 R E 2568 A A E R E 2569 A A E C S app_div P C 8 A G C
 W 2560 G M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[0],output:[0]}, {input:[1],output:[7]}, {input:[8],output:[75]}, {input:[15],output:[127]}, {input:[16],error:true}],
  },
  {
    number: 12, id: 'crc8', site: 'signals', title: 'Three-byte CRC-8',
    description: 'CRC-8 of exactly three bytes: polynomial 0x07, initial state 0, most significant bit first, no reflection and no final XOR. Enter each byte as 0..255.',
    inputs: ['Byte 1', 'Byte 2', 'Byte 3'], outputs: ['CRC (decimal)'],
    algorithm: `app_compute: W 2566 Z W 2567 Z
app_byte: R I 2566 A I 2552 R B I ifl B Z J app_bad end ifg B 255 J app_bad end
 R A 2567 C S app_xor W 2567 A W 2568 8
app_crc_bit: R A 2567 ifge A 128 S A 128 P A 2 M B 7 C S app_xor else P A 2 end W 2567 A
 R E 2568 I E -1 W 2568 E N E Z J app_crc_bit
 R E 2566 I E 1 W 2566 E ifl E 3 J app_byte end
 R E 2567 W 2560 E M A Z O S P
${bad}
${BINARY_XOR}`,
    examples: [{input:[0,0,0],output:[0]}, {input:[1,2,3],output:[72]}, {input:[49,50,51],output:[192]}, {input:[0,256,0],error:true}],
  },
  {
    number: 13, id: 'recipe-scale', site: 'hearth', title: 'Recipe ratio scaler',
    description: 'Scales a nonnegative whole-unit quantity between batch sizes 1..99. Returns whole units plus remainder/denominator, preserving the exact fraction. Rejects a whole result above 9841.',
    inputs: ['Quantity', 'Old batch size', 'New batch size'], outputs: ['Whole units', 'Remainder', 'Denominator'],
    algorithm: `app_compute: R G 2552 R H 2553 R J 2554 ifl G Z J app_bad end
 ifl H 1 J app_bad end ifg H 99 J app_bad end ifl J 1 J app_bad end ifg J 99 J app_bad end
 M A G M B H C S app_div M K A M L C
 M A 9841 M B J C S app_div ifg K A J app_bad end P K J
 M A L P A J M B H C S app_div M E 9841 S E K ifg A E J app_bad end A K A
 W 2560 K W 2561 C W 2562 H M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[250,4,6],output:[375,0,4]}, {input:[10,3,2],output:[6,2,3]}, {input:[9841,99,99],output:[9841,0,99]}, {input:[9841,1,2],error:true}, {input:[10,0,2],error:true}],
  },
  {
    number: 14, id: 'choose', site: 'cardtable', title: 'Unordered selections',
    description: 'Counts ways to choose k distinct objects from n without order or replacement. The bounded calculator accepts 0 <= k <= n <= 12, so every exact intermediate fits a tryte.',
    inputs: ['N (0..12)', 'Selected k'], outputs: ['Combinations'],
    algorithm: `app_compute: R G 2552 R H 2553 ifl G Z J app_bad end ifg G 12 J app_bad end
 ifl H Z J app_bad end ifg H G J app_bad end M J 1 M B 1 E H Z J app_chosen
app_choose: M A J P A G C S app_div M J A I G -1 I B 1 ifle B H J app_choose end
app_chosen: W 2560 J M A Z O S P
${bad}
${POSITIVE_DIVISION}`,
    examples: [{input:[12,6],output:[924]}, {input:[5,2],output:[10]}, {input:[0,0],output:[1]}, {input:[5,6],error:true}, {input:[13,6],error:true}],
  },
];
