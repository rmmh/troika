import type {TextSoftware} from './native';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const help=(lines:string[])=>`canvas_help: ${lines.map((_,i)=>`M A @help${i} M B ${3+i} C S cv_text`).join(' ')} O S P\n${lines.map((s,i)=>`help${i}: ${text(s)}`).join('\n')}`;
const label=(name:string,s:string)=>`${name}: ${text(s)}\n`;
const app=(number:number,id:string,site:string,title:string,description:string,algorithm:string):TextSoftware=>({number,id,site,title,kind:'text',audio:number===442,uiModule:'studioCanvasUi',inputs:['Keyboard studio'],outputs:['Editable native simulation'],description,algorithm,examples:[{input:'',output:''}]});
// State deliberately lies outside the 54x36 pixel buffer and native core.
const common=`
st_zero: M I 5000 M K 224 K I K O S P
; Horizontal bar A=x B=y D=length C=color, preserves G..L.
st_bar: ifle D Z O S P end C S cv_plot I A 1 I D -1 J st_bar
; Bresenham segment endpoints 2740..2743, color2744, clipped by cv_plot.
st_line: R E 2742 R F 2740 S E F F E A W 2750 E R E 2743 R F 2741 S E F F E A P E -1 W 2751 E W 2752 1 R E 2740 R F 2742 ifg E F W 2752 -1 end W 2753 1 R E 2741 R F 2743 ifg E F W 2753 -1 end R E 2750 R F 2751 A E F W 2754 E
st_line_pixel: R A 2740 R B 2741 R C 2744 C S cv_plot R E 2740 R F 2742 ife E F R E 2741 R F 2743 E E F O S P end R E 2754 P E 2 W 2755 E R F 2751 ifge E F R E 2754 A E F W 2754 E R E 2740 R F 2752 A E F W 2740 E end R E 2755 R F 2750 ifle E F R E 2754 A E F W 2754 E R E 2741 R F 2753 A E F W 2741 E end J st_line_pixel
`;
const factory=`
canvas_init: C S st_zero W 5000 2 W 5001 4 W 5002 3 W 5003 -1 W 5004 -1 W 5005 -1 W 5008 2 W 5009 2 W 5019 30 W 2700 Z W 2605 Z O S P
canvas_click: R A 2600 M B 18 C S cv_div ifg A 2 M A 2 end W 2700 A O S P
canvas_key: ifge A 49 ifle A 51 S A 49 W 2700 A O S P end end ife A 116 R I 2700 A I 5000 R E I I E 1 ifg E 9 M E 1 end W I E end ife A 98 R E 2700 ifl E 2 M I 5008 A I E R F I I F 1 ifg F 5 M F 1 end M J 5006 A J E R G J ifge F G W I F W 2604 Z else W 2604 1 end end end ife A 102 R E 5019 ifle E 94 A E 5 W 5019 E end end O S P
canvas_step: C S cv_tick E A Z O S P M L Z
ff_work: M I 5003 A I L R E I ifg E Z I E -1 W I E M I 5010 A I L R E I I E 1 W I E end I L 1 ifl L 3 J ff_work end
 R E 5005 ife E Z W 5005 -1 R E 5020 I E 1 W 5020 E end M L 1
ff_release: M I 5003 A I L R E I ife E Z M J 5006 A J L R F J M I 5008 A I L R G I ifl F G I F 1 W J F M I 5003 A I L W I -1 else M I 5016 A I L R E I I E 1 W I E end end I L -1 ifge L Z J ff_release end
 M L 2
ff_start: M I 5003 A I L R E I ife E -1 M J 5019 ifg L Z M J 5005 A J L end R F J ifg F Z I F -1 W J F M I 5000 A I L R E I M I 5003 A I L W I E M I 5021 A I L W I E else M I 5013 A I L R E I I E 1 W I E end end I L -1 ifge L Z J ff_start end O S P
canvas_draw: C S cv_clear_pixels M A 2 M B 18 M D 50 M C 1 C S st_bar M L Z
ff_paint: M H Z
ff_frame: M A L P A 18 I A 1 M B H I B 3 M C 6 R E 2700 ife E L M C 1 end ife H Z M D 15 C S st_bar else ife H 11 M D 15 C S st_bar else C S cv_plot A A 14 C S cv_plot end end I H 1 ifl H 12 J ff_frame end M H Z
ff_bars: M A L P A 18 I A 3 M B H I B 6 M I 5000 A I L R D I M C 2 C S st_bar M A L P A 18 I A 3 M B H A B 10 M I 5003 A I L R D I M C 3 C S st_bar I H 1 ifl H 2 J ff_bars end ifl L 2 M H Z
ff_binbar: M A L P A 18 A A 12 M B H A B 24 M I 5008 A I L R D I P D 2 M C 6 C S st_bar M A L P A 18 A A 12 M B H A B 24 M I 5006 A I L R D I P D 2 M C 5 C S st_bar I H 1 ifl H 3 J ff_binbar end end M I 5003 A I L R E I ifge E Z M I 5021 A I L R B I M A B S A E P A 12 C S cv_div M E L P E 18 I E 2 A A E M B 18 M C 3 C S cv_plot I B -1 C S cv_plot end I L 1 ifl L 3 J ff_paint end C S cv_pixels M A @ff_heads M B 3 C S cv_text M A @ff_legend M B 20 J cv_text
${label('ff_heads',' M1       M2       M3')}${label('ff_legend','Time/work; buffer stock')}
canvas_status: M A @ff_controls M B 21 C S cv_text M A @ff_machine M B 22 C S cv_text R F 2700 I F 1 C S cv_number M A @ff_time C S cv_append R E 2700 M J 5000 A J E R F J C S cv_number R E 2700 ifl E 2 M A @ff_bin C S cv_append R E 2700 M J 5006 A J E R F J C S cv_number W I 47 I I 1 R E 2700 M J 5008 A J E R F J C S cv_number end M A @ff_totals M B 23 C S cv_text R F 5019 C S cv_number M A @ff_done C S cv_append R F 5020 C S cv_number M A @ff_measure M B 24 C S cv_text R E 2700 M J 5010 A J E R F J C S cv_number M A @ff_block C S cv_append R E 2700 M J 5016 A J E R F J C S cv_number M A @ff_hint R E 2604 ifn E Z M A @ff_full end M B 26 J cv_text
${label('ff_bin',' Bin ')}${label('ff_hint','F:+5 raw parts R:reset')}${label('ff_full','Bin too full to shrink')}
${label('ff_controls','1..3:select T:time B:buffer')}${label('ff_machine','M')}${label('ff_time',' time ')}${label('ff_totals','Raw ')}${label('ff_done',' Done ')}${label('ff_measure','Busy ')}${label('ff_block',' Block ')}
${help(['FACTORY FLOOR','3 machines; 2 bounded bins.','1/2/3 select; T time1..9.','B:output bin size1..5.','A full bin cannot shrink.','F adds5 raw parts (max99).','N:tick; G:run Space:pause.','Tick: work, unload right to','left; start right-to-left.','Time edits affect new jobs.','Green=time coral=remaining.','Blue=bin stock; Busy counts','work ticks; Block=full.','R resets30 parts; F1 exits.'])}
${common}`;
export const FACTORY_FLOOR=app(439,'factory-floor','toolshed','Factory Floor','Explore three serial machines and two finite buffers. Select 1/2/3; T cycles service time 1..9 for future jobs, B cycles that machine output buffer 1..5 when current stock fits. F adds five raw parts (maximum 99 waiting). Every native tick decrements active jobs, unloads completed jobs downstream first, then starts idle machines downstream first. A completed blocked job occupies its machine. Green bars show service times, coral remaining work, blue buffer stock; selected-machine busy and blocked ticks plus raw/completed totals expose bottlenecks. N steps, G runs, Space pauses, H explains; R resets. Trials stop at 999 ticks.',factory);
const ecology=`
canvas_init: C S st_zero W 2700 1 W 5001 1 W 5002 1 W 5010 1 W 5011 1 W 5020 1 W 5021 1 W 5038 1 W 5009 2 W 5057 7 W 5027 2 W 5075 7 W 5044 3 W 5092 9 W 2600 3 W 2601 3 O S P
me_index: R A 2600 M B 6 C S cv_div ifg A 7 M A 7 end W 2720 A R A 2601 M B 6 C S cv_div P A 8 R E 2720 A A E O S P
canvas_click: C S me_index M I 5000 A I A R E 2700 W I E M I 5048 A I A M E Z R F 2700 ifge F 2 ifle F 3 M E 7 end end W I E O S P
canvas_key: ifge A 49 ifle A 53 S A 49 W 2700 A end end O S P
canvas_step: C S cv_tick E A Z O S P W 2721 Z
me_agent: R L 2721 ifge L 48 J me_grow end M I 5000 A I L R E I ifl E 2 J me_next end ifg E 3 J me_next end W 2722 E M I 5096 A I L R E I R F 2603 ife E F J me_next end W I F M I 5048 A I L R E I I E -1 W I E ifle E Z M I 5000 A I L W I Z J me_next end W 2723 E W 2724 -1 W 2725 Z
me_seek: R L 2721 R A 2603 A A L R E 2725 A A E M B 4 C S cv_div M B C M A L C S me_neighbor ifl A Z J me_dir_next end M I 5000 A I A R E I R F 2722 I F -1 ife E F W 2724 A J me_move end ife E Z R F 2724 ifl F Z W 2724 A end end
me_dir_next: R E 2725 I E 1 W 2725 E ifl E 4 J me_seek end
me_move: R G 2724 ifl G Z J me_next end M I 5000 A I G R E I R F 2723 ifn E Z A F 4 R E 2722 ife E 3 I F 1 end end ifg F 12 M F 12 end W 2723 F R L 2721 M I 5000 A I L W I Z M I 5048 A I L W I Z M I 5000 A I G R E 2722 W I E M I 5048 A I G W I F M I 5096 A I G R E 2603 W I E ifge F 10 M F 5 M I 5048 A I G W I F M I 5000 A I L R E 2722 W I E M I 5048 A I L W I F M I 5096 A I L R E 2603 W I E end
me_next: R E 2721 I E 1 W 2721 E J me_agent
me_grow: R A 2603 M B 48 C S cv_div M I 5000 A I C R E I ife E Z W I 1 end O S P
; Neighbor A=index B=0N1E2S3W -> A or-1. No wrapping.
me_neighbor: M G A M H B M B 8 C S cv_div ife H Z ife A Z M A -1 O S P end M A G S A 8 O S P end ife H 1 ife C 7 M A -1 O S P end M A G I A 1 O S P end ife H 2 ife A 5 M A -1 O S P end M A G A A 8 O S P end ife C Z M A -1 O S P end M A G I A -1 O S P
canvas_draw: C S cv_clear_pixels W 2701 Z W 2702 Z W 2703 Z M L Z
me_draw: M I 5000 A I L R E I ifn E Z ifle E 3 M I 2700 A I E R F I I F 1 W I F end W 2726 E M A L M B 8 C S cv_div P A 6 W 2727 A P C 6 W 2728 C W 2729 Z
me_square: R E 2726 I E -1 P E 5 R F 2729 A E F M I @me_sprites A I E R E I W 2730 E W 2731 Z
me_sprite_pixel: R A 2730 M B 2 C S cv_div W 2730 A ifn C Z R A 2728 M E 4 R F 2731 S E F A A E R B 2727 R E 2729 A B E R E 2726 M I @me_colors A I E R C I C S cv_plot end R E 2731 I E 1 W 2731 E ifl E 5 J me_sprite_pixel end R E 2729 I E 1 W 2729 E ifl E 5 J me_square end end I L 1 ifl L 48 J me_draw end J cv_pixels
me_sprites: 4 21 14 4 31 18 18 31 21 14 17 31 21 14 4 31 21 31 21 31
canvas_status: M A @me_brush M B 21 C S cv_text M A @me_pop M B 22 C S cv_text R F 2702 C S cv_number M A @me_fox C S cv_append R F 2703 C S cv_number M A @me_grass M B 23 C S cv_text R F 2701 C S cv_number M A @me_tick C S cv_append R F 2603 C S cv_number M A @me_hint M B 24 C S cv_text R E 2700 M J @me_names A J E R A J J cv_append
me_names: @me_empty @me_grass_name @me_rabbit @me_fox_name @me_wall
${label('me_empty','Erase')}${label('me_grass_name','Grass')}${label('me_rabbit','Rabbit')}${label('me_fox_name','Fox')}${label('me_wall','Wall')}
me_colors: 0 2 1 3 6
${label('me_brush','1:erase 2:grass 3:rabbit')}${label('me_pop','Rabbits ')}${label('me_fox',' Foxes ')}${label('me_grass','Grass ')}${label('me_tick',' Tick ')}${label('me_hint','4:fox 5:wall Brush: ')}
${help(['MEADOW ECOLOGY 8x6','1 empty 2 grass 3 rabbit','4 fox 5 wall; Enter paints.','Rabbits cyan; foxes coral.','Tick: row-major agents.','Every agent moves once; new','offspring wait until next.','Energy -1; at0 starve.','Prefer prey, then empty;','N/E/S/W rotated(tick+cell).','Rabbit eats grass:+4; fox','eats rabbit:+5; energy<=12.','At10 split into two5s.','Empty tick%48 grows grass.','R resets; 999-tick limit.'])}
${common}`;
export const MEADOW_ECOLOGY=app(440,'meadow-ecology','ecology','Meadow Ecology','Paint an 8 x 6 habitat: 1 empty, 2 grass, 3 rabbit, 4 fox, 5 wall; arrows and Enter paint. N advances, G runs, Space pauses. Agents act in row-major order once per tick; marked destinations and newborns cannot act again. Each loses one energy and dies at zero. Neighbor search rotates N/E/S/W by tick+source index, preferring food over empty space. Rabbits eat grass for four energy; foxes eat rabbits for five, capped at twelve. A mover with at least ten energy splits into two agents of five. One empty cell at tick modulo 48 grows grass. Boundaries are closed; populations cannot exceed 48. This deterministic toy has no biological calibration. H explains; R resets; 999 ticks maximum.',ecology);
const furnace=`
canvas_init: C S st_zero W 5000 20 W 5001 60 W 5002 3 W 5003 1 W 5005 20 W 5006 1 W 2605 Z O S P
canvas_click: R A 2601 M E 35 S E A P E 3 ifg E 99 M E 99 end W 5001 E O S P
canvas_key: ife A 115 R E 5001 A E 10 ifg E 99 M E Z end W 5001 E end ife A 112 R E 5002 I E 1 ifg E 6 M E Z end W 5002 E end ife A 105 R E 5003 I E 1 ifg E 3 M E Z end W 5003 E end ife A 100 R E 5005 A E 10 ifg E 40 M E Z end W 5005 E end ife A 97 R E 5006 M F 1 S F E W 5006 F end O S P
canvas_step: C S cv_tick E A Z O S P R E 5001 R F 5000 S E F W 2700 E R F 5004 A F E ifg F 243 M F 243 end ifl F -243 M F -243 end W 2701 F C S fu_command W 5008 A R E 5006 ifn E Z R E 2700 ifg A 40 ifg E Z J fu_reject end end ifl A Z ifl E Z J fu_reject end end end R E 2701 W 5004 E J fu_apply
fu_reject: R E 5004 W 2701 E C S fu_command W 5008 A
fu_apply: ifl A Z M A Z end ifg A 40 M A 40 end W 5007 A M B 4 C S cv_trunc W 2702 A R A 5005 R E 5000 S A E M B 8 C S cv_trunc R E 5000 A E A R F 2702 A E F ifl E Z M E Z end ifg E 99 M E 99 end W 5000 E M L Z
fu_history: ${[5030,5060,5090].map(base=>`M I ${base+1} A I L R E I M I ${base} A I L W I E`).join(' ')} I L 1 ifl L 26 J fu_history end R E 5000 W 5056 E R E 5001 W 5086 E R E 5007 W 5116 E O S P
fu_command: R A 2700 R E 5002 P A E R E 2701 R F 5003 P E F A A E M B 9 J cv_trunc
canvas_draw: C S cv_clear_pixels M L Z
fu_plot: M A L P A 2 M B 35 M I 5030 A I L R E I Q E 3 S B E M C 2 C S cv_plot M A L P A 2 M B 35 M I 5060 A I L R E I Q E 3 S B E M C 1 C S cv_plot M A L P A 2 M B 35 M I 5090 A I L R E I Q E 3 S B E M C 3 C S cv_plot I L 1 ifl L 27 J fu_plot end J cv_pixels
canvas_status: M A @fu_keys M B 21 C S cv_text M A @fu_temp M B 22 C S cv_text R F 5000 C S cv_number M A @fu_set C S cv_append R F 5001 C S cv_number M A @fu_out C S cv_append R F 5007 C S cv_number M A @fu_gain M B 23 C S cv_text R F 5002 C S cv_number M A @fu_i C S cv_append R F 5003 C S cv_number M A @fu_aw C S cv_append R F 5006 C S cv_number M A @fu_sum M B 24 C S cv_text R F 5004 C S cv_number M A @fu_amb C S cv_append R F 5005 C S cv_number O S P
${label('fu_keys','S:set P:gain I:gain A:guard')}${label('fu_temp','T ')}${label('fu_set',' Set ')}${label('fu_out',' Heat ')}${label('fu_gain','P ')}${label('fu_i',' I ')}${label('fu_aw',' Guard ')}${label('fu_sum','Sum ')}${label('fu_amb',' Ambient ')}
${help(['FEEDBACK FURNACE','S:setpoint+10, wraps at99.','Enter:set from cursor y.','P:gain0..6 I:gain0..3','A:anti-windup0/1 D:ambient','e=set-temp; sum+=e +/-243.','u=trunc((P*e+I*sum)/9).','Clamp heater u to0..40.','Guard rejects sum update','when saturation and error','push farther outward.','temp+=trunc((ambient-T)/8)','      +trunc(heater/4).','T clips0..99; green=T,','cyan=set coral=heater.','R resets; quantized toy.'])}
${common}`;
export const FEEDBACK_FURNACE=app(441,'feedback-furnace','pendulum','Feedback Furnace','Tune a quantized PI controller while its thermal plant runs. S cycles setpoint, P proportional gain 0..6, I integral gain 0..3, A anti-windup, D ambient 0/10/20/30/40; Enter sets target from cursor height. Each tick forms error=target-temperature, proposes integral+error bounded +/-243, computes trunc((P*error+I*integral)/9), and clips heater to 0..40. Anti-windup rejects an integral update when its error drives saturation farther outward, then recomputes. Temperature adds trunc((ambient-temperature)/8)+trunc(heater/4), clipped 0..99. Colored histories show temperature, target and heater. H explains; N steps/G runs/Space pauses/R resets; 999 ticks maximum. No physical calibration.',furnace);
const wave=`
canvas_init: C S st_zero W 2607 Z W 2605 1 W 2700 Z W 2701 26 W 2702 3 W 2703 Z M L Z
ws_initial: M E L I E -13 M I 5000 A I L W I E I L 1 ifl L 27 J ws_initial end O S P
ws_index: R A 2600 M B 2 J cv_div
ws_backup: M L Z
ws_backup_loop: M I 5000 A I L R E I M I 5030 A I L W I E I L 1 ifl L 27 J ws_backup_loop end W 2703 1 O S P
canvas_click: W 150 Z C S ws_backup C S ws_index M I 5000 A I A M E 18 R F 2601 S E F ifg E 13 M E 13 end ifl E -13 M E -13 end W I E O S P
canvas_step: W 2606 Z O S P
canvas_key: ife A 112 W 152 9841 W 165 5000 R E 2702 I E -1 W 163 E W 164 8 W 161 1 W 150 729 O S P end W 150 Z ife A 116 R E 2702 I E 1 ifg E 9 M E 1 end W 2702 E O S P end ife A 97 C S ws_index W 2700 A O S P end ife A 98 C S ws_index W 2701 A O S P end ife A 117 R E 2703 ifn E Z M L Z
ws_undo: M I 5030 A I L R E I M J 5000 A J L R F J W J E W I F I L 1 ifl L 27 J ws_undo end end O S P end ife A 118 W 2720 1 J ws_transform end ife A 105 W 2720 2 J ws_transform end ife A 115 W 2720 3 J ws_transform end O S P
ws_transform: C S ws_backup R G 2700 R H 2701 ifg G H M E G M G H M H E end W 2721 G W 2722 H M L G
ws_each: R E 2720 ife E 1 R E 2721 R F 2722 A E F S E L M I 5030 A I E R E I else ife E 2 M I 5030 A I L R E I P E -1 else M I 5030 A I L R A I P A 2 R E 2721 ifg L E M E I/-1 A A E else R E I A A E end R E 2722 ifl L E M E I/1 A A E else R E I A A E end M B 4 C S cv_trunc M E A end end M I 5000 A I L W I E I L 1 R E 2722 ifle L E J ws_each end O S P
canvas_draw: C S cv_clear_pixels M A Z M B 18 M C 6 M D 54 C S st_bar M L Z
ws_plot: M I 5000 A I L R E I M B 18 S B E M A L P A 2 M C 2 R F 2700 R G 2701 ifg F G M H F M F G M G H end ifge L F ifle L G M C 1 end end C S cv_plot I A 1 C S cv_plot I L 1 ifl L 27 J ws_plot end J cv_pixels
canvas_status: M A @ws_keys M B 21 C S cv_text M A @ws_range M B 22 C S cv_text R F 2700 C S cv_number M A 45 W I A I I 1 R F 2701 C S cv_number M A @ws_step C S cv_append R F 2702 C S cv_number M A @ws_edit M B 23 C S cv_text C S ws_index M J 5000 A J A R F J C S cv_number M A @ws_ops M B 24 J cv_text
${label('ws_keys','A/B:range P:hear T:pitch')}${label('ws_range','Range ')}${label('ws_step',' Step ')}${label('ws_edit','Cursor value ')}${label('ws_ops','V:reverse I:negate S:smooth')}
${help(['WAVE SCULPTOR 27 samples','Arrows aim; Enter sets x','sample to18-y, clips+/-13.','A/B set inclusive range.','V reverses the selection.','I negates; S smooths by','trunc((left+2self+right)/4)','with held range endpoints.','U undo/redo last edit.','P:audition Space:silence','T cycles1..9 samples/step.','Pitch=729/step Hz exactly','before hardware playback.','R resets saw; F1 silences.'])}
${common}`;
export const WAVE_SCULPTOR=app(442,'wave-sculptor','cassettes','Wave Sculptor','Author all 27 signed samples of a native hardware wavetable. Arrows aim; Enter writes sample floor(x/2) to clamp(18-y,-13,13). A and B mark an inclusive range; V reverses it, I negates it, S smooths simultaneously with trunc((left+2*self+right)/4), repeating each endpoint outside the selection. U swaps the last edit with its undo copy. P auditions the current table through the guest APU; Space or any edit silences. T cycles 1..9 hardware samples per table step, giving 729/step Hz; level is eight. The selected range is cyan, other samples green. H explains, R restores the saw, F1 stops sound and exits.',wave);
const projection=`
canvas_init: C S st_zero W 2700 Z W 2701 Z W 2702 20 W 2703 1 W 2704 Z W 2605 Z J pr_preset
pr_preset: M L Z
pr_copy: M I @pr_cube R E 2704 ifn E Z M I @pr_pyramid end A I L R E I M I 5000 A I L W I E I L 1 ifl L 24 J pr_copy end O S P
canvas_click: R A 2600 S A 27 M B 3 C S cv_trunc W 2720 A R A 2601 M E 18 S E A M A E M B 2 C S cv_trunc ifg A 9 M A 9 end ifl A -9 M A -9 end R I 2700 P I 3 A I 5000 R E 2720 W I E M I/1 A O S P
canvas_step: C S cv_tick E A Z O S P R E 2701 I E 1 ifge E 8 M E Z end W 2701 E O S P
canvas_key: ifge A 49 ifle A 56 S A 49 W 2700 A O S P end end ife A 99 J canvas_step end ife A 118 R E 2703 M F 1 S F E W 2703 F O S P end ife A 98 R E 2704 M F 1 S F E W 2704 F J pr_preset end ife A 43 R E 2702 ifl E 24 I E 1 W 2702 E end O S P end ife A 45 R E 2702 ifg E 2 I E -1 W 2702 E end O S P end M E -1 ife A 120 M E Z end ife A 121 M E 1 end ife A 122 M E 2 end ifge E Z R I 2700 P I 3 A I 5000 A I E R F I I F 1 ifg F 9 M F -9 end W I F end O S P
canvas_draw: C S cv_clear_pixels W 2604 Z M L Z
pr_rotate: M I 5000 A I L R E I M E I/2 W 2720 E R E I W 2721 E R I 2701 A I @pr_cos R G I R I 2701 A I @pr_sin R H I R A 2721 P A G R E 2720 P E H S A E M B 10 C S cv_trunc M I 5030 A I L W I A R A 2721 P A H R E 2720 P E G A A E M B 10 C S cv_trunc R E 2702 A A E M I 5032 A I L W I A M I 5001 A I L R E I M I 5031 A I L W I E A L 3 ifl L 24 J pr_rotate end W 2722 Z
pr_edge: R E 2722 P E 2 M I @pr_edges A I E R E I P E 3 M J 5030 A J E R E J W 2760 E M E J/1 W 2761 E M E J/2 W 2762 E M E I/1 P E 3 M J 5030 A J E R E J W 2763 E M E J/1 W 2764 E M E J/2 W 2765 E
 R E 2703 ifn E Z R E 2762 R F 2765 ifl E 2 ifl F 2 J pr_edge_next end C S pr_clip_first else ifl F 2 C S pr_swap C S pr_clip_first C S pr_swap end end end
 R E 2703 ife E Z R E 2760 P E 2 A E 27 W 2740 E R E 2761 P E -2 A E 18 W 2741 E R E 2763 P E 2 A E 27 W 2742 E R E 2764 P E -2 A E 18 W 2743 E else R A 2760 P A 24 R B 2762 C S cv_trunc A A 27 W 2740 A R A 2761 P A -24 R B 2762 C S cv_trunc A A 18 W 2741 A R A 2763 P A 24 R B 2765 C S cv_trunc A A 27 W 2742 A R A 2764 P A -24 R B 2765 C S cv_trunc A A 18 W 2743 A end W 2744 2 C S st_line
pr_edge_next: R E 2722 I E 1 W 2722 E ifl E 12 J pr_edge end R I 2700 P I 3 A I 5030 R E I W 2770 E M E I/1 W 2771 E M E I/2 W 2772 E R E 2703 ifn E Z R E 2772 ifl E 2 J cv_pixels end R A 2770 P A 24 R B 2772 C S cv_trunc A A 27 W 2773 A R A 2771 P A -24 R B 2772 C S cv_trunc A A 18 M B A R A 2773 else R A 2770 P A 2 A A 27 R B 2771 P B -2 A B 18 end M C 7 C S cv_plot I A -1 C S cv_plot I A 2 C S cv_plot I A -1 I B -1 C S cv_plot I B 2 C S cv_plot J cv_pixels
pr_swap: M L Z
pr_swap_loop: M I 2760 A I L M J 2763 A J L R E I R F J W I F W J E I L 1 ifl L 3 J pr_swap_loop end O S P
pr_clip_first: R E 2604 I E 1 W 2604 E R E 2765 R F 2762 S E F W 2767 E M E 2 S E F W 2766 E M L Z
pr_clip_axis: M I 2763 A I L R A I M I 2760 A I L R E I S A E R E 2766 P A E R B 2767 C S cv_trunc M I 2760 A I L R E I A E A W I E I L 1 ifl L 2 J pr_clip_axis end W 2762 2 O S P
canvas_status: M A @pr_keys M B 21 C S cv_text M A @pr_vertex M B 22 C S cv_text R F 2700 I F 1 C S cv_number M L Z
pr_coords: M A 32 W I A I I 1 R J 2700 P J 3 A J 5000 A J L R F J C S cv_number I L 1 ifl L 3 J pr_coords end M A @pr_view M B 23 C S cv_text R F 2703 C S cv_number M A @pr_dist C S cv_append R F 2702 C S cv_number M A @pr_yaw C S cv_append R F 2701 C S cv_number M A @pr_clip M B 24 C S cv_text R F 2604 J cv_number
pr_cos: 10 7 0 -7 -10 -7 0 7
pr_sin: 0 7 10 7 0 -7 -10 -7
pr_cube: -6 -6 -6 6 -6 -6 6 6 -6 -6 6 -6 -6 -6 6 6 -6 6 6 6 6 -6 6 6
pr_pyramid: -6 -6 -6 6 -6 -6 6 -6 6 -6 -6 6 0 6 0 0 6 0 0 6 0 0 6 0
pr_edges: 0 1 1 2 2 3 3 0 4 5 5 6 6 7 7 4 0 4 1 5 2 6 3 7
${label('pr_keys','1..8:vertex XYZ:edit C:turn')}${label('pr_vertex','Vertex XYZ ')}${label('pr_view','Perspective ')}${label('pr_dist',' D ')}${label('pr_yaw',' Turn ')}${label('pr_clip','Near-plane cuts ')}
${help(['PROJECTION STUDIO','8 vertices; 12 fixed edges.','1..8 select; X/Y/Z cycles','coordinate -9..9. Enter','sets XY; Z stays unchanged.','C/N:yaw 1/8 turn; G:spin','V:orthographic/perspective.','+/- camera distance2..24.','B:cube/pyramid presets.','Yaw uses cosine/sine*10','table; truncate to units.','Perspective24*x/depth;','near plane depth2 clips','edges before rasterization.','No hidden faces. R resets.'])}
${common}`;
export const PROJECTION_STUDIO=app(443,'projection-room','lenses','Projection Studio','Edit an eight-vertex wire model with twelve fixed edges. Keys 1..8 select a vertex; X/Y/Z cycle its coordinate -9..9, Enter sets XY from the cursor while preserving Z. C or N rotates yaw in eighth turns using an explicit integer sine/cosine table; G animates. V switches orthographic and perspective projection; +/- changes camera distance 2..24. Perspective uses focal distance 24 and clips each crossing edge to depth 2 before native line rasterization; wholly behind edges disappear. B restores cube/pyramid presets. The selected XYZ and near-plane cut count stay visible. Truncated coordinates and no hidden-surface removal are deliberate. H explains, Space pauses, R resets.',projection);
const motion=`
canvas_init: C S st_zero W 2700 Z W 2701 Z W 2702 Z W 2705 1 W 2605 1 M L Z
mo_init: M I @mo_x A I L R E I M I 5000 A I L W I E M I @mo_y A I L R E I M I 5010 A I L W I E M I 5020 A I L W I 4 I L 1 ifl L 6 J mo_init end J mo_rewind
mo_rewind: W 2701 Z W 2702 Z R E 5000 W 2703 E R E 5010 W 2704 E W 2603 Z O S P
canvas_click: R I 2700 A I 5000 R E 2600 W I E R I 2700 A I 5010 R E 2601 W I E J mo_rewind
canvas_key: ifge A 49 ifle A 54 S A 49 W 2700 A O S P end end ife A 100 R I 2700 A I 5020 R E I I E 1 ifg E 9 M E 1 end W I E J mo_rewind end ife A 109 R I 2700 A I 5030 R E I M F 1 S F E W I F J mo_rewind end ife A 108 R E 2705 M F 1 S F E W 2705 F O S P end ife A 98 J mo_rewind end O S P
canvas_step: C S cv_tick E A Z O S P R G 2701 ife G 5 R E 2705 ife E Z W 2606 Z O S P end end R H 2702 I H 1 M I 5020 A I G R K I M J G I J 1 ifge J 6 M J Z end ifge H K W 2701 J W 2702 Z M I 5000 A I J R E I W 2703 E M I 5010 A I J R E I W 2704 E O S P end W 2702 H M L Z
mo_axis: M I 5000 ifn L Z M I 5010 end A I G R E I W 2720 E M I 5030 A I G R E I ife E Z M I 5000 ifn L Z M I 5010 end A I J R A I R E 2720 S A E P A H M B K C S cv_trunc R E 2720 A E A else R E 2720 end M I 2703 A I L W I E I L 1 ifl L 2 J mo_axis end O S P
canvas_draw: C S cv_clear_pixels W 2721 Z
mo_path: R L 2721 M I 5000 A I L R E I W 2740 E M I 5010 A I L R E I W 2741 E I L 1 ifge L 6 R E 2705 ife E Z J mo_dots end M L Z end M I 5000 A I L R E I W 2742 E M I 5010 A I L R E I W 2743 E W 2744 1 C S st_line R E 2721 I E 1 W 2721 E ifl E 6 J mo_path end
mo_dots: M L Z
mo_dot: M I 5000 A I L R A I M I 5010 A I L R B I M C 2 R E 2700 ife E L M C 7 end C S cv_plot I L 1 ifl L 6 J mo_dot end R A 2703 R B 2704 M C 3 C S cv_plot I A 1 C S cv_plot J cv_pixels
canvas_status: M A @mo_keys M B 21 C S cv_text M A @mo_frame M B 22 C S cv_text R F 2700 I F 1 C S cv_number M A @mo_duration C S cv_append R J 2700 A J 5020 R F J C S cv_number M A @mo_hold C S cv_append R J 2700 A J 5030 R F J C S cv_number M A @mo_play M B 23 C S cv_text R F 2701 I F 1 C S cv_number M A 43 W I A I I 1 R F 2702 C S cv_number M A @mo_loop C S cv_append R F 2705 C S cv_number M A @mo_pos M B 24 C S cv_text R F 2703 C S cv_number M A 44 W I A I I 1 R F 2704 J cv_number
mo_x: 4 14 28 48 38 18
mo_y: 28 8 18 5 30 32
${label('mo_keys','1..6:frame D:time M:mode')}${label('mo_frame','Frame ')}${label('mo_duration',' D ')}${label('mo_hold',' Hold ')}${label('mo_play','Playhead ')}${label('mo_loop',' Loop ')}${label('mo_pos','Position ')}
${help(['MOTION STUDIO six keyframes','1..6 selects a keyframe.','Arrows aim; Enter sets XY.','D:outgoing duration1..9.','M:linear/hold movement.','N:tick G:play Space:pause.','L:loop B:rewind keeps edits','Each segment lasts D ticks.','Linear: x0+trunc(delta*t/D)','Hold stays until last tick.','Last tick reaches next key.','No loop stops at frame6.','Gold=selected coral=object','Edits rewind the playhead.','R restores original path.'])}
${common}`;
export const MOTION_STUDIO=app(444,'motion-studio','gallery','Motion Studio','Author six timed positions rather than drawing animation frames. Keys 1..6 select a keyframe; arrows and Enter place it on the 54 x 36 canvas. D cycles its outgoing duration 1..9 ticks; M toggles linear or hold interpolation. Native linear motion is start+trunc((next-start)*elapsed/duration), landing exactly on the next key at its duration; hold jumps on that final tick. N steps, G plays, Space pauses. L toggles the closing segment back to keyframe one; without looping playback stops at keyframe six. B rewinds without erasing edits; position/duration edits also rewind. Colored keyframes, path and playhead remain visible. H explains; R restores the initial path.',motion);
export const INTERACTIVE_STUDIOS=[FACTORY_FLOOR,MEADOW_ECOLOGY,FEEDBACK_FURNACE,WAVE_SCULPTOR,PROJECTION_STUDIO,MOTION_STUDIO];
