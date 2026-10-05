import type {TextSoftware} from './native';
import {SAMPLE_OUTPUT} from './statistics';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const row=(s:string)=>s.padEnd(27);
// Chord spelling/inversion reference: Open Music Theory, authored open textbook.
// https://viva.pressbooks.pub/openmusictheory/chapter/triads/
// https://viva.pressbooks.pub/openmusictheory/chapter/inversion/
// Pulse distribution background: Toussaint, BRIDGES 2005 (original paper).
// https://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf
const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const common=`mu_bad: M A -1 O S P
mu_pad: M B A
mu_padding: R E 2620 ifge E B M A Z O S P end M A 32 C S app_put J mu_padding
; Signed integer lists, one optional |, at3100. A=input pointer,B=length.
mu_parse: M J A M K B M D Z W 3001 -1
mu_space: ife K Z W 3000 D M A Z O S P end R E J ife E 32 I J 1 I K -1 J mu_space end ife E 124 R E 3001 ifge E Z J mu_bad end W 3001 D I J 1 I K -1 J mu_space end ifge D 24 J mu_bad end M H 1 M G Z M L Z ife E 45 M H -1 I J 1 I K -1 else ife E 43 I J 1 I K -1 end end
mu_digit: ife K Z J mu_save end R E J ife E 32 J mu_save end ife E 124 J mu_save end ifl E 48 J mu_bad end ifg E 57 J mu_bad end ifge L 2 J mu_bad end P G 10 S E 48 A G E I L 1 I J 1 I K -1 J mu_digit
mu_save: ife L Z J mu_bad end P G H M I 3100 A I D W I G I D 1 J mu_space
mu_pc: M I @mu_names A I A R A I J stats_label
mu_note: M A F M B 12 C S app_div M H A I H -1 M A C C S mu_pc M F H J stats_int
mu_names: ${names.map((_,i)=>'@mu_name'+i).join(' ')}
${names.map((name,i)=>`mu_name${i}: ${ascii(name)}`).join('\n')}
mu_list: W 3440 A W 3441 B W 3442 Z
mu_list_next: R E 3442 R F 3441 ifge E F M A Z O S P end ifn E Z M A 32 C S app_put end R I 3440 A I E R F I C S mu_note R E 3442 I E 1 W 3442 E J mu_list_next
${SAMPLE_OUTPUT}`;
// Only hardware oscillator periods are stored; note selection and sequencing are guest code.
const playback=`app_text_init: W 3830 Z W 150 Z M A Z O S P
app_text_key: C S text_ascii ife A 80 J mu_play end ife A 112 J mu_play end M A Z O S P
mu_play: R E 3830 ife E Z M A 1 O S P end W 2514 Z M I 149 M K 27
mu_audio_clear: W I Z I I 1 I K -1 N K Z J mu_audio_clear W 152 9841 M G Z
mu_play_note: W 150 Z M I 3800 A I G R E I ifn E Z S E 24 M I @mu_periods A I E R E I W 154 E W 155 6 W 153 3 W 150 6561 end M H 5
mu_audio_wait: H 0sAAA -1 R E 68 ife E 4 R E 69 ife E 91 W 150 Z J program_menu end ife E -27 J mu_audio_stop end end I H -1 N H Z J mu_audio_wait W 150 Z H 0sAAA -1 I G 1 R E 3830 ifl G E J mu_play_note end
mu_audio_stop: W 150 Z M A 1 O S P
mu_periods: ${Array.from({length:72},(_,i)=>Math.round(19683/(440*2**((i+24-69)/12)))-1).join(' ')}
`;
const playHint='P:play Space:stop F1:exit';
export const MUSIC_WORKSHOP:TextSoftware[]=[];
const chordKinds=[['major',[0,4,7]],['minor',[0,3,7]],['dim',[0,3,6]],['aug',[0,4,8]],['sus2',[0,2,7]],['sus4',[0,5,7]],['dom7',[0,4,7,10]],['maj7',[0,4,7,11]],['min7',[0,3,7,10]],['half-dim7',[0,3,6,10]],['dim7',[0,3,6,9]]] as const;
const chord=`app_compute: W 3830 Z W 150 Z M A 2552 R B 2610 C S mu_parse N A Z O S P R E 3001 ifn E -1 J mu_bad end R E 3000 ifl E 3 J mu_bad end ifg E 4 J mu_bad end M I 3200 M K 12 K I K M L Z W 3400 99
ch_note: M I 3100 A I L R A I ifl A 24 J mu_bad end ifg A 95 J mu_bad end R E 3400 ifl A E W 3400 A end M J 3800 A J L W J A M B 12 C S app_div M I 3200 A I C R E I ifn E Z J mu_bad end W I 1 I L 1 R E 3000 ifl L E J ch_note end W 3830 E R A 3400 M B 12 C S app_div W 3401 C W 3402 Z W 3403 Z M A @ch_heading C S stats_label M A 27 C S mu_pad
ch_root: W 3404 Z
ch_kind: R G 3404 ifge G 11 J ch_next_root end M I @ch_patterns M E G P E 5 A I E R E I R F 3000 ifn E F J ch_next_kind end W 3405 I W 3406 Z W 3407 Z
ch_match: R G 3406 R F 3000 ifge G F J ch_found end R I 3405 A I G I I 1 R E I R F 3403 A E F ifge E 12 S E 12 end M I 3200 A I E R F I ife F Z J ch_next_kind end R F 3401 ife E F W 3407 G end R E 3406 I E 1 W 3406 E J ch_match
ch_found: R A 3403 C S mu_pc M A 32 C S app_put R I 3404 A I @ch_kind_labels R A I C S stats_label M A @ch_inv C S stats_label R F 3407 C S stats_int R E 3402 I E 1 W 3402 E M A E I A 1 P A 27 C S mu_pad
ch_next_kind: R E 3404 I E 1 W 3404 E J ch_kind
ch_next_root: R E 3403 I E 1 W 3403 E ifl E 12 J ch_root end R E 3402 ife E Z M A @ch_none C S stats_label M A 54 C S mu_pad end M A @ch_play J stats_label
ch_heading: ${ascii('Matches; inv0=root position')}
ch_inv: ${ascii(' inv')}
ch_none: ${ascii('No listed chord matches')}
ch_play: ${ascii(playHint)}
ch_patterns: ${chordKinds.flatMap(([,pcs])=>[pcs.length,...pcs,...Array(4-pcs.length).fill(-1)]).join(' ')}
ch_kind_labels: ${chordKinds.map((_,i)=>'@ch_kind'+i).join(' ')}
${chordKinds.map(([name],i)=>`ch_kind${i}: ${ascii(name)}`).join('\n')}
${playback}${common}`;
MUSIC_WORKSHOP.push({number:358,kind:'text',audio:true,keyHandler:true,id:'chord-finder',site:'sol',title:'Chord Finder',inputs:['3 or 4 notes'],outputs:['Roots and bass inversions'],description:'Enter three or four note numbers 24..95, with distinct pitch classes; C4=60 and each step is a semitone. Order is free; lowest note is bass. Example 64 67 72 identifies C major, inversion1. Tests major/minor/dim/aug/sus2/sus4 triads and dom7/maj7/min7/half-dim7/dim7 chords. All matches appear in root order. inv0 is root position; inv1/2/3 put the next chord member in bass. P auditions input notes once on the guest pulse voice; hardware pitches are quantized. Enable world sound. Space stops playback; F1 silences and exits.',algorithm:chord,examples:[{"input":"64 67 72","output":"Matches; inv0=root positionC major inv1               P:play Space:stop F1:exit"},{"input":"60 63 66 69","output":"Matches; inv0=root positionC dim7 inv0                D# dim7 inv3               F# dim7 inv2               A dim7 inv1                P:play Space:stop F1:exit"}]});
const voice=`app_compute: W 3830 Z W 150 Z M A 2552 R B 2610 C S mu_parse N A Z O S P R E 3000 ifn E 6 J mu_bad end R E 3001 ifn E 3 J mu_bad end M L Z M H -1 M I 3200 M K 12 K I K
vl_source: M I 3100 A I L R E I ifl E 36 J mu_bad end ifg E 84 J mu_bad end ifle E H J mu_bad end M H E I L 1 ifl L 3 J vl_source end M L Z
vl_target: M I 3103 A I L R E I ifl E Z J mu_bad end ifg E 11 J mu_bad end M I 3200 A I E R F I ifn F Z J mu_bad end W I 1 I L 1 ifl L 3 J vl_target end W 3400 999 W 3401 999 W 3402 36
vl_low: R A 3402 M B 12 C S app_div W 3405 C M I 3200 A I C R E I ife E Z J vl_low_next end R E 3402 I E 1 W 3403 E
vl_mid: R E 3403 ifg E 84 J vl_low_next end M A E M B 12 C S app_div W 3406 C R E 3405 ife C E J vl_mid_next end M I 3200 A I C R E I ife E Z J vl_mid_next end R E 3403 I E 1 W 3404 E
vl_high: R E 3404 ifg E 84 J vl_mid_next end M A E M B 12 C S app_div R E 3405 ife C E J vl_high_next end R E 3406 ife C E J vl_high_next end M I 3200 A I C R E I ife E Z J vl_high_next end M G Z M H Z M L Z
vl_cost: M I 3402 A I L R E I M I 3100 A I L R F I S E F F E A A G E ifg E H M H E end I L 1 ifl L 3 J vl_cost end R E 3400 ifg G E J vl_high_next end ife G E R F 3401 ifge H F J vl_high_next end end W 3400 G W 3401 H M L Z
vl_best: M I 3402 A I L R E I M I 3800 A I L W I E I L 1 ifl L 3 J vl_best end
vl_high_next: R E 3404 I E 1 W 3404 E J vl_high
vl_mid_next: R E 3403 I E 1 W 3403 E J vl_mid
vl_low_next: R E 3402 I E 1 W 3402 E ifle E 84 J vl_low end W 3830 3 M A @vl_motion C S stats_label R F 3400 C S stats_int M A @vl_leap C S stats_label R F 3401 C S stats_int M A 27 C S mu_pad M A @vl_from C S stats_label M A 3100 M B 3 C S mu_list M A 54 C S mu_pad M A @vl_to C S stats_label M A 3800 M B 3 C S mu_list M A 81 C S mu_pad M A @vl_numbers C S stats_label M J Z
vl_print_numbers: ifn J Z M A 32 C S app_put end M I 3800 A I J R F I C S stats_int I J 1 ifl J 3 J vl_print_numbers end M A 108 C S mu_pad M A @vl_play J stats_label
vl_motion: ${ascii('motion=')}
vl_leap: ${ascii(' max-leap=')}
vl_from: ${ascii('From: ')}
vl_to: ${ascii('To: ')}
vl_numbers: ${ascii('Notes: ')}
vl_play: ${ascii(playHint)}
${playback}${common}`;
MUSIC_WORKSHOP.push({number:359,kind:'text',audio:true,keyHandler:true,id:'voice-leading',site:'bellows',title:'Voice Leading',inputs:['notes|classes'],outputs:['Closest uncrossed voicing'],description:'Enter three strictly ascending note numbers 36..84, |, then three distinct target pitch classes 0..11 (C=0). Example 48 52 55|0 5 9 moves C major to F major. Native search tries every ascending target voicing in 36..84, using each requested class once. Minimize total semitone movement, then largest individual leap, then the lexicographically first target. This optimizes one chord change without crossing voices, not a full harmony rulebook. P plays the target once; enable sound. Pulse pitches are quantized; Space stops and F1 silences/exits.',algorithm:voice,examples:[{"input":"48 52 55|0 5 9","output":"motion=3 max-leap=2        From: C3 E3 G3             To: C3 F3 A3               Notes: 48 53 57            P:play Space:stop F1:exit"}]});
const rhythm=`app_compute: W 3830 Z W 150 Z M A 2552 R B 2610 C S mu_parse N A Z O S P R E 3001 ifn E -1 J mu_bad end R E 3000 ifn E 3 J mu_bad end R G 3100 R H 3101 R J 3102 ifl G 1 J mu_bad end ifg G 24 J mu_bad end ifl H Z J mu_bad end ifg H G J mu_bad end ifl J Z J mu_bad end ifge J G J mu_bad end W 3406 Z ife H Z M A Z J ry_flat end ife H G M A 1 J ry_flat end W 3220 H S G H W 3400 G W 3405 Z
ry_divide: R L 3405 M I 3220 A I L R B I R A 3400 C S app_div M I 3200 A I L W I A M I 3221 A I L W I C W 3400 B I L 1 W 3405 L ifg C 1 J ry_divide end M I 3200 A I L R E 3400 W I E C S ry_build J ry_normalize
ry_build: R L 3405 ife L -1 M A Z J ry_bit end ife L -2 M A 1 J ry_bit end M I 3200 A I L R E I M I 3240 A I L W I E
ry_repeat: R L 3405 M I 3240 A I L R E I ife E Z J ry_remainder end I E -1 W I E I L -1 W 3405 L C S ry_build R E 3405 I E 1 W 3405 E J ry_repeat
ry_remainder: R L 3405 M I 3220 A I L R E I ife E Z O S P end I L -2 W 3405 L C S ry_build R E 3405 I E 2 W 3405 E O S P
ry_bit: R I 3406 A I 3300 W I A R E 3406 I E 1 W 3406 E O S P
ry_flat: R I 3406 A I 3300 W I A R E 3406 I E 1 W 3406 E R F 3100 ifl E F J ry_flat end
ry_normalize: M L Z R E 3101 ife E Z J ry_first_done end
ry_first: M I 3300 A I L R E I ifn E Z J ry_first_done end I L 1 J ry_first
ry_first_done: W 3407 L M J Z
ry_rotate: R E 3407 A E J R F 3102 S E F R H 3100 ifl E Z A E H end ifge E H S E H end M I 3300 A I E R E I M I 3800 A I J ifn E Z M E 69 end W I E I J 1 ifl J H J ry_rotate end W 3830 H M A @ry_steps C S stats_label R F 3100 C S stats_int M A @ry_hits C S stats_label R F 3101 C S stats_int M A @ry_rot C S stats_label R F 3102 C S stats_int M A 27 C S mu_pad M J Z
ry_pattern: M I 3800 A I J R E I M A 46 ifn E Z M A 120 end C S app_put I J 1 R E 3100 ifl J E J ry_pattern end M A 54 C S mu_pad M A @ry_gaps C S stats_label M A 81 C S mu_pad R E 3101 ife E Z M A @ry_silence C S stats_label J ry_footer end M L Z
ry_first_rotated: M I 3800 A I L R E I ifn E Z J ry_gap_start end I L 1 J ry_first_rotated
ry_gap_start: W 3408 L W 3409 Z M K Z
ry_gap_next: I L 1 R E 3100 ifge L E M L Z end I K 1 M I 3800 A I L R E I ife E Z J ry_gap_next end R E 3409 ifn E Z M A 32 C S app_put end M F K C S stats_int W 3409 1 M K Z R E 3408 ifn L E J ry_gap_next end
ry_footer: M A 135 C S mu_pad M A @ry_play J stats_label
ry_steps: ${ascii('steps=')}
ry_hits: ${ascii(' hits=')}
ry_rot: ${ascii(' rot=')}
ry_gaps: ${ascii('Cyclic gaps (steps):')}
ry_silence: ${ascii('none (silence)')}
ry_play: ${ascii(playHint)}
${playback}${common}`;
MUSIC_WORKSHOP.push({number:360,kind:'text',audio:true,keyHandler:true,id:'euclidean-beat',site:'pendulum',title:'Euclidean Rhythm',inputs:['steps hits shift'],outputs:['Evenly spread pulse circle'],description:'Distribute hits as evenly as possible around 1..24 equal steps using native Bjorklund grouping. Enter steps, hits (0..steps), and right rotation (0..steps-1). Example 8 3 0 makes x..x..x. with cyclic gaps 3 3 2. Start the unrotated pattern at its first hit; x strikes and . rests. Gap lengths wrap back to the first hit. P plays one cycle of quantized pulse clicks; enable sound. Space stops only during playback and is ordinary input whitespace otherwise. F1 silences and exits.',algorithm:rhythm,examples:[{"input":"8 3 0","output":"steps=8 hits=3 rot=0       x..x..x.                   Cyclic gaps (steps):       3 3 2                                                 P:play Space:stop F1:exit"},{"input":"13 5 0","output":"steps=13 hits=5 rot=0      x..x.x..x.x..              Cyclic gaps (steps):       3 2 3 2 3                                             P:play Space:stop F1:exit"}]});
// Deliberately a small checklist, not a full species-counterpoint validator.
// https://viva.pressbooks.pub/openmusictheory/chapter/species-counterpoint/
const counterpoint=`app_compute: M A 2552 R B 2610 C S mu_parse N A Z O S P R G 3001 ifl G 2 J mu_bad end ifg G 8 J mu_bad end R E 3000 M F G P F 2 ifn E F J mu_bad end W 3400 G M I 3200 M K 15 K I K M L Z
cp_validate: M I 3100 A I L R E I ifl E 36 J mu_bad end ifg E 84 J mu_bad end I L 1 R E 3000 ifl L E J cp_validate end M L Z
cp_note: M I 3100 A I L R G I R E 3400 A I E R H I W 3404 G W 3405 H ifl H G M A Z M B L I B 1 C S cp_hit end M A H S A G F A A M B 12 C S app_div W 3406 C ifn C Z ifn C 3 ifn C 4 ifn C 7 ifn C 8 ifn C 9 M A 1 M B L I B 1 C S cp_hit end end end end end end
 ife L Z J cp_endpoint end R E 3400 I E -1 ife L E J cp_endpoint end J cp_motion
cp_endpoint: R E 3406 ifn E Z ifn E 7 M A 2 M B L I B 1 C S cp_hit end end
cp_motion: ife L Z J cp_next end R G 3404 R E 3402 S G E R H 3405 R E 3403 S H E M E G F E A ifg E 12 M A 4 M B L I B 1 C S cp_hit end M E H F E A ifg E 12 M A 4 M B L I B 1 C S cp_hit end ife G Z J cp_next end ife H Z J cp_next end ifg G Z ifl H Z J cp_next end else ifg H Z J cp_next end end R E 3406 R F 3407 ifn E F J cp_next end ifn E Z ifn E 7 J cp_next end end M A 3 M B L I B 1 C S cp_hit
cp_next: R E 3404 W 3402 E R E 3405 W 3403 E R E 3406 W 3407 E I L 1 R E 3400 ifl L E J cp_note end M F Z M L Z
cp_total: M I 3200 A I L R E I A F E I L 1 ifl L 5 J cp_total end W 3408 F M A @cp_total_label C S stats_label R F 3408 C S stats_int M A 27 C S mu_pad M L Z
cp_result: M I @cp_labels A I L R A I C S stats_label M I 3200 A I L R F I C S stats_int M A @cp_first C S stats_label M I 3210 A I L R F I ife F Z M A 45 C S app_put else C S stats_int end I L 1 M A L I A 1 P A 27 C S mu_pad ifl L 5 J cp_result end M A Z O S P
cp_hit: M I 3200 A I A R E I I E 1 W I E M I 3210 A I A R E I ife E Z W I B end O S P
cp_labels: @cp_cross @cp_dissonant @cp_ends @cp_parallel @cp_leaps
cp_cross: ${ascii('Crossings: ')}
cp_dissonant: ${ascii('Dissonant: ')}
cp_ends: ${ascii('Ends: ')}
cp_parallel: ${ascii('Parallels: ')}
cp_leaps: ${ascii('Leaps>12: ')}
cp_first: ${ascii(' first:')}
cp_total_label: ${ascii('Checklist issues: ')}
${common}`;
MUSIC_WORKSHOP.push({number:361,kind:'text',id:'counterpoint',site:'scorebook',title:'Counterpoint Check',inputs:['lower|upper'],outputs:['Five checks; first position'],description:'Enter two equal lines of 2..8 note numbers 36..84 separated by |; lower voice first, C4=60. Example 48 50 52|60 62 64 exposes parallel octaves. Counts crossings, dissonant vertical intervals, imperfect endpoints, same-direction parallel fifths/octaves, and each melodic leap over twelve semitones. Allowed vertical classes: 0,3,4,7,8,9; endpoints need 0 or 7. Absolute intervals classify crossed voices too. First gives the one-based arrival note, or -. Zero issues passes only these checks: not a complete species-counterpoint judgment.',algorithm:counterpoint,examples:[{"input":"48 50 52|60 62 64","output":"Checklist issues: 2        Crossings: 0 first:-       Dissonant: 0 first:-       Ends: 0 first:-            Parallels: 2 first:2       Leaps>12: 0 first:-        "},{"input":"48 50 48|60 59 60","output":"Checklist issues: 0        Crossings: 0 first:-       Dissonant: 0 first:-       Ends: 0 first:-            Parallels: 0 first:-       Leaps>12: 0 first:-        "}]});
const melody=`app_compute: W 3830 Z W 150 Z R E 2610 ifl E 3 J mu_bad end R G 2552 ife G 84 W 3450 1 else ife G 73 W 3450 2 else ife G 82 W 3450 3 else J mu_bad end end end M A 2553 R B 2610 I B -1 ife G 82 R E 2553 ifn E 124 J mu_bad end I A 1 I B -1 else R E 2553 ifn E 32 J mu_bad end end C S mu_parse N A Z O S P R E 3450 ife E 3 R E 3001 ifn E -1 J mu_bad end W 3451 Z R E 3000 W 3452 E else R E 3001 ifn E 1 J mu_bad end W 3451 1 R E 3000 I E -1 W 3452 E R E 3450 R F 3100 ife E 1 ifl F -24 J mu_bad end ifg F 24 J mu_bad end else ifl F 24 J mu_bad end ifg F 95 J mu_bad end end end R E 3452 ifl E 1 J mu_bad end ifg E 12 J mu_bad end M L Z
ml_note: R I 3451 A I 3100 A I L R F I ifl F 24 J mu_bad end ifg F 95 J mu_bad end R E 3450 ife E 1 R E 3100 A F E else ife E 2 R E 3100 P E 2 S E F M F E end end ifl F 24 J mu_bad end ifg F 95 J mu_bad end M I 3800 R E 3450 ife E 3 R E 3452 I E -1 S E L A I E else A I L end W I F I L 1 R E 3452 ifl L E J ml_note end W 3830 E M A @ml_heading C S stats_label M A 27 C S mu_pad M A @ml_notes C S stats_label M A 3800 R B 3452 C S mu_list M A 81 C S mu_pad M A @ml_intervals C S stats_label M J 1 R E 3452 ife E 1 M A @ml_none C S stats_label J ml_footer end
ml_interval: ifg J 1 M A 32 C S app_put end M I 3800 A I J R F I M E I/-1 S F E ifg F Z M A 43 C S app_put end C S stats_int I J 1 R E 3452 ifl J E J ml_interval end
ml_footer: M A 135 C S mu_pad M A @ml_play J stats_label
ml_heading: ${ascii('Chromatic result; C4=60')}
ml_notes: ${ascii('N: ')}
ml_intervals: ${ascii('I: ')}
ml_none: ${ascii('none (one note)')}
ml_play: ${ascii(playHint)}
${playback}${common}`;
MUSIC_WORKSHOP.push({number:362,kind:'text',audio:true,keyHandler:true,id:'melody-transform',site:'cassettes',title:'Melody Transform',inputs:['T n| / I n| / R|'],outputs:['Notes and interval contour'],description:'Transform up to twelve note numbers 24..95 (C4=60). T shifts by -24..24 semitones: T 2|60 62 64. I reflects chromatically around a note: I 60|60 62 64 gives 60 58 56. R reverses note order: R|60 62 64. Results outside 24..95 are rejected, not wrapped. N spells pitches with sharps; I lists successive signed semitone intervals. This is chromatic, not key-aware diatonic inversion. P auditions the result with quantized pulse pitches; enable sound. Space stops playback; F1 silences/exits.',algorithm:melody,examples:[{"input":"T 2|60 62 64","output":"Chromatic result; C4=60    N: D4 E4 F#4                                          I: +2 +2                                              P:play Space:stop F1:exit"},{"input":"I 60|60 62 64","output":"Chromatic result; C4=60    N: C4 A#3 G#3                                         I: -2 -2                                              P:play Space:stop F1:exit"}]});
const tuning=`app_compute: M I 2552 R K 2610 M L Z
 tu_number: M G Z M H Z
 tu_digit: ife K Z J tu_save end R E I ife E 47 J tu_save end ife E 124 J tu_save end ifl E 48 J mu_bad end ifg E 57 J mu_bad end ifge H 2 J mu_bad end P G 10 S E 48 A G E I H 1 I I 1 I K -1 J tu_digit
 tu_save: ife H Z J mu_bad end ifl G 1 J mu_bad end ifg G 81 J mu_bad end M J 3100 A J L W J G I L 1 ife L 4 ifn K Z J mu_bad end J tu_bounds end ife K Z J mu_bad end R E I ife L 2 ifn E 124 J mu_bad end else ifn E 47 J mu_bad end end I I 1 I K -1 J tu_number
 tu_bounds: R E 3100 R F 3101 ifl E F J mu_bad end P F 2 ifg E F J mu_bad end R E 3102 R F 3103 ifl E F J mu_bad end P F 2 ifg E F J mu_bad end R G 3100 R E 3103 P G E R H 3102 R E 3101 P H E W 3400 G W 3401 H M A @tu_relative C S stats_label M F G M D H C S stats_fraction M A 27 C S mu_pad R G 3400 R H 3401 ife G H M A @tu_equal C S stats_label M A 54 C S mu_pad M A @tu_none J stats_label end ifg G H M A @tu_left else M A @tu_right end C S stats_label M A 54 C S mu_pad M A @tu_period C S stats_label R F 3101 R E 3103 P F E R D 3400 R E 3401 S D E F D A C S stats_fraction M A 81 C S mu_pad M A @tu_units C S stats_label M A 108 C S mu_pad M A @tu_example J stats_label
 tu_relative: ${ascii('left/right=')}
 tu_equal: ${ascii('Same tuning')}
 tu_none: ${ascii('No beating: equal frequency')}
 tu_left: ${ascii('Left interval is higher')}
 tu_right: ${ascii('Right interval is higher')}
 tu_period: ${ascii('Beat period=')}
 tu_units: ${ascii('measured in base cycles')}
 tu_example: ${ascii('Beat Hz = base Hz / period')}
${common}`;
MUSIC_WORKSHOP.push({number:363,kind:'text',id:'tuning-compare',site:'soundmap',title:'Tuning Comparator',inputs:['p/q|r/s'],outputs:['Exact comma and beat period'],description:'Compare two rational tunings of an interval above the same base pitch. Enter p/q|r/s, integers 1..81; both ratios must be within one octave, 1..2. Example 3/2|40/27 gives left/right=81/80 and one beat per 54 base cycles. Reports the exact reduced comma, higher tuning, and beat period q*s/abs(p*s-r*q). Beat Hz equals base Hz divided by that period; equal tunings have no beating. These are ideal frequency ratios, not quantized APU playback or a cents approximation.',algorithm:tuning,examples:[{"input":"3/2|40/27","output":"left/right=81/80           Left interval is higher    Beat period=54             measured in base cycles    Beat Hz = base Hz / period"},{"input":"2/2|3/3","output":"left/right=1               Same tuning                No beating: equal frequency"}]});
