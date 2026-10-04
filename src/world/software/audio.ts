import type { NativeSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';

const clear = `sound_clear: M I 149 M E 27
sound_zero: W I Z I I 1 I E -1 N E Z J sound_zero W 152 9841 O S P`;
const bad = 'app_bad: M A -1 O S P';
/** round(19683/A), ties downward, without an overflowing 19683 literal.
 * A must be 1..3280. Clobbers B/C/E/F/G; preserves H..L and D. */
const period = `sound_period: M B A M A 6561 C S app_div M G A P G 3 M A C P A 3 C S app_div A G A P C 2 ifg C B I G 1 end M A G O S P
${POSITIVE_DIVISION}`;

export const AUDIO_SOFTWARE: NativeSoftware[] = [
  {
    number:71,audio:true,id:'pulse-tone',site:'bellows',title:'Pulse Tone Bench',
    description:'Sounds one hardware pulse oscillator. Enter requests 20..2000 Hz, duty code 1..4 (one-eighth, one-quarter, one-half, three-quarters), and level 0..13. Reports rounded actual Hz and samples per period. Enter starts; Space releases; F1 silences and exits.',
    inputs:['Hz (20..2000)','Duty (1..4)','Level (0..13)'],outputs:['Actual Hz','Period samples'],
    algorithm:`app_compute: C S sound_clear R K 2552 R H 2553 R J 2554 ifl K 20 J app_bad end ifg K 2000 J app_bad end ifl H 1 J app_bad end ifg H 4 J app_bad end ifl J Z J app_bad end ifg J 13 J app_bad end
 M A K C S sound_period W 2561 A M E A I E -1 W 154 E C S sound_period W 2560 A W 155 J W 153 H W 150 6561 M A Z O S P
${clear}
${bad}
${period}`,
    examples:[{input:[440,3,8],output:[437,45]},{input:[2000,1,13],output:[1968,10]},{input:[20,4,0],output:[20,984]},{input:[0,3,8],error:true},{input:[440,5,8],error:true},{input:[440,3,14],error:true}],
  },
  {
    number:72,audio:true,id:'interval-tone',site:'soundmap',title:'Interval Ear Laboratory',
    description:'Plays two pulse voices at a base frequency and a rational multiple. Base is 20..1000 Hz; numerator and denominator are 1..9. The rounded second request must be 20..2000 Hz. Reports both quantized actual pitches. Each voice uses level six. Space releases both.',
    inputs:['Base Hz','Ratio numerator','Ratio denom'],outputs:['First actual Hz','Second actual Hz'],
    algorithm:`app_compute: C S sound_clear R K 2552 R H 2553 R J 2554 ifl K 20 J app_bad end ifg K 1000 J app_bad end ifl H 1 J app_bad end ifg H 9 J app_bad end ifl J 1 J app_bad end ifg J 9 J app_bad end
 M A K P A H Q A J ifl A 20 J app_bad end ifg A 2000 J app_bad end W 2567 A
 M A K C S sound_period M E A I E -1 W 154 E C S sound_period W 2560 A
 R A 2567 C S sound_period M E A I E -1 W 158 E C S sound_period W 2561 A
 W 155 6 W 159 6 W 153 3 W 157 3 W 150 8748 M A Z O S P
${clear}
${bad}
${period}`,
    examples:[{input:[440,3,2],output:[437,656]},{input:[220,2,1],output:[221,437]},{input:[20,1,9],error:true},{input:[1000,9,1],error:true},{input:[440,1,0],error:true}],
  },
  {
    number:73,audio:true,id:'envelope-lab',site:'signals',title:'ADSR Envelope Laboratory',
    description:'Explores the pulse hardware envelope at about 437 Hz. Attack, decay and release are 0..13 envelope ticks per volume step; ticks run at 81 Hz. Peak is ten and sustain four. Enter gates on; Space gates off so release can be heard. Zero times are instantaneous; all three zero bypass the envelope at peak level.',
    inputs:['Attack (0..13)','Decay (0..13)','Release (0..13)'],outputs:['Envelope word','Actual Hz'],
    algorithm:`app_compute: C S sound_clear R G 2552 R H 2553 R J 2554 ifl G Z J app_bad end ifg G 13 J app_bad end ifl H Z J app_bad end ifg H 13 J app_bad end ifl J Z J app_bad end ifg J 13 J app_bad end
 P G 729 P H 27 A G H A G J W 156 G W 2560 G W 154 44 W 155 7398 W 153 3 W 150 6561 W 2561 437 M A Z O S P
${clear}
${bad}`,
    examples:[{input:[1,2,3],output:[786,437]},{input:[13,13,13],output:[9841,437]},{input:[0,0,0],output:[0,437]},{input:[14,0,0],error:true}],
  },
  {
    number:74,audio:true,id:'wave-forge',site:'cassettes',title:'Wavetable Forge',
    description:'Builds a 27-cell signed waveform in guest RAM and plays it on the hardware wave channel. Shape 1 is a saw, 2 a triangle, 3 a square. Request 20..700 Hz and level 0..13. Reports actual quantized Hz and samples per table step. Space releases.',
    inputs:['Hz (20..700)','Shape (1..3)','Level (0..13)'],outputs:['Actual Hz','Samples per step'],
    algorithm:`app_compute: C S sound_clear R K 2552 R H 2553 R J 2554 ifl K 20 J app_bad end ifg K 700 J app_bad end ifl H 1 J app_bad end ifg H 3 J app_bad end ifl J Z J app_bad end ifg J 13 J app_bad end
 M A 729 Q A K W 2561 A M E A I E -1 W 163 E P A 27 C S sound_period W 2560 A M I 2900 M G Z
wave_build: M E G I E -13 ife H 2 F E A P E 2 M F 13 S F E M E F end ife H 3 M E -13 ifl G 13 M E 13 end end W I E I I 1 I G 1 ifl G 27 J wave_build end
 W 165 2900 W 164 J W 161 1 W 150 729 M A Z O S P
${clear}
${bad}
${period}`,
    examples:[{input:[220,1,8],output:[243,3]},{input:[440,2,10],output:[364,2]},{input:[700,3,0],output:[729,1]},{input:[20,1,8],output:[20,36]},{input:[10,1,8],error:true},{input:[440,4,8],error:true}],
  },
  {
    number:75,audio:true,id:'noise-bench',site:'radios',title:'Hardware Noise Bench',
    description:'Runs the hardware nine-bit noise generator. Choose 1..243 samples per shift, mode 1 for the long-noise taps or -1 for metallic taps, and level 0..13. Reports the period register and channel mask for inspection. Enter starts; Space releases.',
    inputs:['Samples (1..243)','Mode (1 or -1)','Level (0..13)'],outputs:['Period register','Channel mask'],
    algorithm:`app_compute: C S sound_clear R K 2552 R H 2553 R J 2554 ifl K 1 J app_bad end ifg K 243 J app_bad end ifn H 1 ifn H -1 J app_bad end end ifl J Z J app_bad end ifg J 13 J app_bad end
 I K -1 W 167 K W 166 H W 168 J W 150 243 W 2560 K W 2561 243 M A Z O S P
${clear}
${bad}`,
    examples:[{input:[4,1,8],output:[3,243]},{input:[243,-1,13],output:[242,243]},{input:[1,1,0],output:[0,243]},{input:[0,1,8],error:true},{input:[4,0,8],error:true}],
  },
];
