import type {TextSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
function help(lines:string[]){return `canvas_help: ${lines.map((_,i)=>`M A @help${i} M B ${3+i} C S cv_text`).join(' ')} O S P\n${lines.map((s,i)=>`help${i}: ${ascii(s)}`).join('\n')}`;}
function app(number:number,id:string,site:string,title:string,description:string,algorithm:string):TextSoftware{return{number,id,site,title,kind:'text',uiModule:'creativeCanvasUi',inputs:['Keyboard canvas'],outputs:['Native pixel graphics'],description,algorithm,examples:[{input:'',output:''}]};}
const turtle=`
canvas_init: W 2703 2 W 2704 1 W 2705 2 J tt_draw
canvas_click: J tt_draw
canvas_step: J tt_draw
canvas_key: ife A 100 R E 2703 I E 1 ifg E 3 M E Z end W 2703 E J tt_draw end ife A 97 R E 2704 M F 3 S F E W 2704 F J tt_draw end ife A 115 R E 2705 I E 1 ifg E 4 M E 1 end W 2705 E J tt_draw end O S P
canvas_draw: J cv_pixels
tt_draw: C S cv_clear_pixels R E 2600 W 2700 E R E 2601 W 2701 E W 2702 Z W 2603 Z W 2604 Z R L 2703 C S tt_expand O S P
tt_expand: E L Z J tt_forward I L -1 U S L C S tt_expand O S L
 R E 2700 U S E R E 2701 U S E R E 2702 U S E R F 2704 A E F ifge E 8 S E 8 end W 2702 E U S L C S tt_expand O S L O S E W 2702 E O S E W 2701 E O S E W 2700 E
 U S L C S tt_expand O S L
 R E 2700 U S E R E 2701 U S E R E 2702 U S E R F 2704 S E F ifl E Z A E 8 end W 2702 E U S L C S tt_expand O S L O S E W 2702 E O S E W 2701 E O S E W 2700 E
 U S L C S tt_expand O S L I L 1 O S P
tt_forward: R E 2603 I E 1 W 2603 E R H 2705
tt_segment: R E 2702 M I @tt_dx A I E R F I R A 2700 A A F W 2700 A M I @tt_dy A I E R F I R B 2701 A B F W 2701 B ifl A Z W 2604 1 end ifg A 53 W 2604 1 end ifl B Z W 2604 1 end ifg B 35 W 2604 1 end M C 2 C S cv_plot I H -1 N H Z J tt_segment O S P
canvas_status: M A @tt_settings M B 22 C S cv_text M I -9241 R F 2703 C S cv_number M I -9234 R F 2704 P F 45 C S cv_number M I -9226 R F 2705 C S cv_number M A @tt_segments M B 23 C S cv_text R F 2603 C S cv_number R E 2604 ifn E Z M A @tt_clipped M B 24 J cv_text end O S P
tt_settings: ${ascii('Depth   Turn    Step')}
tt_segments: ${ascii('Segments ')}
tt_clipped: ${ascii('Off-canvas strokes clipped')}
tt_dx: 0 1 1 1 0 -1 -1 -1
tt_dy: -1 -1 0 1 1 1 0 -1
${help(['BRANCHING TURTLE','Arrows move the root cursor.','Enter/N redraw at cursor.','D:depth0..3 A:turn45/90','S:stroke length1..4','Rule F -> F[+F]F[-F]F','[ saves, ] restores turtle.','Depth3 draws125 strokes.','Canvas54x36; edges clip.','R restores depth2/45deg.','Move root near bottom first.'])}`;
export const BRANCHING_TURTLE=app(396,'branch-turtle','nala','Branching Turtle','Draw a native branching L-system on a 54 x 36 quadrant-pixel canvas. The fixed rule F -> F[+F]F[-F]F expands to depth 0..3; brackets save and restore position and heading. D changes depth, A selects 45/90-degree turns, S cycles stroke length 1..4. Arrows position the root and Enter or N redraws. Depth 3 has 125 forward strokes and a bounded native stack; off-canvas strokes are explicitly reported and clipped. H shows help without losing settings; R restores defaults; F1 returns to programs.',turtle);
const chaos=`
canvas_init: W 2700 26 W 2701 1 W 2702 1 W 2703 34 W 2704 52 W 2705 34 W 2706 Z J ct_clear
ct_clear: C S cv_clear_pixels W 2710 1 W 2711 432 W 2712 288 W 2603 Z O S P
canvas_click: R E 2706 P E 2 M I 2700 A I E R F 2600 W I F R F 2601 M I/1 F J ct_clear
canvas_key: ifge A 49 ifle A 51 S A 49 W 2706 A O S P end end E A 99 J ct_clear O S P
canvas_step: W 2720 32
ct_next: R A 2710 P A 16 I A 1 M B 243 C S cv_div W 2710 C M A C M B 27 C S cv_div M B 3 C S cv_div W 2721 C P C 2 M I 2700 A I C R E I P E 16 R A 2711 A A E M B 2 C S cv_div W 2711 A M E I/1 P E 16 R A 2712 A A E M B 2 C S cv_div W 2712 A M B 16 C S cv_div W 2722 A R A 2711 M B 16 C S cv_div R B 2722 R C 2721 I C 1 C S cv_plot R E 2603 ifl E 9841 I E 1 W 2603 E end R E 2720 I E -1 W 2720 E N E Z J ct_next O S P
canvas_draw: J cv_pixels
canvas_status: M A @ct_anchor M B 22 C S cv_text R F 2706 I F 1 C S cv_number M A @ct_points M B 23 C S cv_text R F 2603 C S cv_number M A @ct_hint M B 24 J cv_text
ct_anchor: ${ascii('Anchor ')}
ct_points: ${ascii('Points ')}
ct_hint: ${ascii('1/2/3:anchor C:clear')}
${help(['CHAOS TRIANGLE','1/2/3 selects an attractor.','Arrows aim; Enter moves it.','Moving a vertex clears ink.','N plots32 midpoint steps.','C clears; seed resets to1.','Guest generator modulo243.','Positions use1/16 pixels.','Canvas54x36; colors mark','which attractor was chosen.','A2x2 block shares ink color.','R restores the triangle.'])}`;
export const CHAOS_TRIANGLE=app(400,'chaos-triangle','gallery','Chaos Triangle','Explore midpoint-contraction art using three editable attractors. Keys 1/2/3 choose an anchor; arrows and Enter move it, clearing the picture. N runs 32 bounded native iterations, selecting vertices with a reproducible 243-state integer generator and retaining positions in sixteenths of a pixel. C clears and resets the seed. The 54 x 36 canvas accumulates points colored by chosen attractor; each 2 x 2 quadrant block uses its highest present color index. This finite sampled picture is not an exact mathematical fractal. H preserves the picture while showing help, R restores the triangle, F1 exits.',chaos);
const fieldHelpers=`
cf_index: R A 2600 M B 2 C S cv_div W 2690 A R A 2601 M B 2 C S cv_div P A 27 R H 2690 A H A O S P
cf_clear: M I 3000 M K 1986
cf_clear_loop: W I Z I I 1 I K -1 N K Z J cf_clear_loop O S P
cf_cursor: C S cf_index M I H A I -9760 W I 5146 O S P
`;
const ripple=`
canvas_init: C S cf_clear W 3256 8 W 3756 8 W 2700 Z W 2604 Z O S P
canvas_click: C S cf_index M I 4500 A I H R E I N E Z O S P M I 3000 A I H W I 8 M I 3500 A I H W I 8 O S P
canvas_key: ife A 100 R E 2700 M F 1 S F E W 2700 F O S P end ife A 98 C S cf_index M I 4500 A I H R E I M F 1 S F E W I F M I 3000 A I H W I Z M I 3500 A I H W I Z O S P end ife A 105 C S cf_index M I 4500 A I H R E I N E Z O S P M I 3000 A I H W I -8 M I 3500 A I H W I -8 end O S P
canvas_step: W 2604 Z W 2720 Z
rt_cell: R H 2720 ifge H 486 J rt_publish end M I 4500 A I H R E I ifn E Z M I 4000 A I H W I Z J rt_next end M A H M B 27 C S cv_div W 2740 A W 2741 C M G Z
${[[2740,0,-27],[2741,26,1],[2740,17,27],[2741,0,-1]].map(([axis,edge,offset])=>`R E ${axis} ifn E ${edge} M I 3000 A I H A I ${offset} R E I A G E end`).join('\n')}
 M I 3000 A I H R E I M F E P F 4 S G F W 2742 E M A G F A A M B 4 C S cv_div ifl G Z P A -1 end R E 2742 P E 2 A E A M I 3500 A I H R F I S E F R F 2700 ifn F Z ifg E Z I E -1 else ifl E Z I E 1 end end end ifg E 12 M E 12 R F 2604 I F 1 W 2604 F end ifl E -12 M E -12 R F 2604 I F 1 W 2604 F end M I 4000 A I H W I E
rt_next: R E 2720 I E 1 W 2720 E J rt_cell
rt_publish: M H Z
rt_copy: M I 3000 A I H R E I M I 3500 A I H W I E M I 4000 A I H R E I M I 3000 A I H W I E I H 1 ifl H 486 J rt_copy end R E 2603 ifl E 9841 I E 1 W 2603 E end O S P
canvas_draw: M H Z
rt_draw: M I 4500 A I H R E I ifn E Z M F 5246 else M I 3000 A I H R E I M F 128 ifn E Z M C 1 ifl E Z M C 4 F E A end ifge E 4 I C 1 end ifge E 8 I C 1 end M F C P F 729 A F 143 end end M I -9760 A I H W I F I H 1 ifl H 486 J rt_draw end J cf_cursor
canvas_status: M A @rt_time M B 22 C S cv_text R F 2603 C S cv_number M A @rt_damp M B 23 C S cv_text R F 2700 C S cv_number M A @rt_clip M B 24 C S cv_text R F 2604 J cv_number
rt_time: ${ascii('Wave tick ')}
rt_damp: ${ascii('D:damping0/1=')}
rt_clip: ${ascii('Saturated cells ')}
${help(['RIPPLE TANK 27x18 cells','Enter:+8 impulse I:-8','B:toggle fixed-zero wall','D:damping off/on; N:tick','uNext=2u-prev+trunc(Lap/4)','Lap=sum4neighbors-4u.','Outside and walls stay0.','Damping removes1 toward0.','Values clamp to -12..12;','status counts saturation.','Cyan/green crests; blue/','purple troughs. R resets.'])}
${fieldHelpers}`;
export const RIPPLE_TANK=app(397,'ripple-tank','tide','Ripple Tank','Edit a 27 x 18 discrete wave tank. Enter sets a +8 displacement and I a -8 displacement, with previous/current equal (initially at rest). B toggles a fixed-zero wall and clears displacement there. N updates all cells simultaneously by uNext = 2*u - previous + trunc((neighborSum - 4*u)/4). Outside and walls stay zero. D optionally removes one unit toward zero after updating. Values saturate at -12..12, with the clipped-cell count visible; this explicit quantized toy is not a precision physical solver. Color distinguishes amplitude and sign. Arrows aim, H preserves state, R resets, F1 exits.',ripple);
const gas=`
canvas_init: C S cf_clear W 2700 Z W 2701 Z W 2604 Z W 3255 2 W 3257 8 W 3113 2 W 3117 2 W 3121 2 W 3125 2 W 3356 8 W 3360 8 W 3364 8 W 3368 8 W 3169 4 W 3277 4 W 3181 1 W 3289 1 W 4224 1 W 4225 1 W 4226 1 W 4227 1 W 4228 1 W 4230 1 W 4231 1 W 4232 1 W 4233 1 W 4234 1 O S P
canvas_click: C S cf_index M I 4000 A I H R E I ifn E Z W 2604 1 O S P end W 2604 Z M I 3000 A I H R A I W 2740 A M I @lg_bits R E 2700 A I E R B I W 2741 B C S cv_div M B 2 C S cv_div R E 2740 R F 2741 ife C Z A E F else S E F end M I 3000 A I H W I E O S P
canvas_key: ifge A 49 ifle A 52 S A 49 W 2700 A O S P end end ife A 118 R E 2701 M F 1 S F E W 2701 F O S P end ife A 98 C S cf_index M I 3000 A I H R E I ifn E Z W 2604 2 O S P end M I 4000 A I H R E I M F 1 S F E W I F W 2604 Z end O S P
canvas_step: M I 3500 M K 486
lg_clear: W I Z I I 1 I K -1 N K Z J lg_clear W 2720 Z
lg_stream: R H 2720 ifge H 486 J lg_collide_all end M A H M B 27 C S cv_div W 2740 A W 2741 C M I 3000 A I H R E I W 2742 E W 2721 Z
lg_direction: R A 2742 M B 2 C S cv_div W 2742 A E C Z J lg_next_dir R G 2721 R H 2720 M I @lg_delta A I G R E I M F H A F E W 2743 F W 2744 G M K Z
 ife G Z R E 2740 E E Z M K 1 end ife G 1 R E 2741 E E 26 M K 1 end ife G 2 R E 2740 E E 17 M K 1 end ife G 3 R E 2741 E E Z M K 1 end
 ife K Z M I 4000 A I F R E I ifn E Z M K 1 end end ifn K Z W 2743 H A G 2 ifge G 4 S G 4 end W 2744 G end R E 2744 M I @lg_bits A I E R E I M I 3500 R F 2743 A I F R F I A F E W I F
lg_next_dir: R E 2721 I E 1 W 2721 E ifl E 4 J lg_direction end R E 2720 I E 1 W 2720 E J lg_stream
lg_collide_all: M H Z W 2604 Z
lg_collide: M I 3500 A I H R E I ife E 5 M E 10 else ife E 10 M E 5 end end M I 3000 A I H W I E I H 1 ifl H 486 J lg_collide end R E 2603 ifl E 9841 I E 1 W 2603 E end O S P
canvas_draw: W 2720 Z W 2702 Z
lg_draw: R H 2720 ifge H 486 J cf_cursor end M I 4000 A I H R E I ifn E Z M F 5246 else M I 3000 A I H R E I W 2740 E M A E M G Z M K 4
lg_count: M B 2 C S cv_div A G C I K -1 N K Z J lg_count R E 2702 A E G W 2702 E M F 128 ifn G Z M F G P F 729 A F 143 R E 2701 ifn E Z R E 2740 ife E 1 M F 1552 end ife E 2 M F 1520 end ife E 4 M F 1576 end ife E 8 M F 1518 end end end end R H 2720 M I -9760 A I H W I F I H 1 W 2720 H J lg_draw
canvas_status: M A @lg_particles M B 22 C S cv_text R F 2702 C S cv_number M A @lg_dir M B 23 C S cv_text R F 2700 I F 1 C S cv_number R E 2604 ife E 1 M A @lg_wall else ife E 2 M A @lg_occupied else M A @lg_hint end end M B 24 J cv_text
lg_bits: 1 2 4 8
lg_delta: -27 1 27 -1
lg_particles: ${ascii('Particles ')}
lg_dir: ${ascii('Direction1N2E3S4W=')}
lg_wall: ${ascii('Wall blocks particle edit')}
lg_occupied: ${ascii('Occupied: wall rejected')}
lg_hint: ${ascii('B:wall V:density/velocity')}
${help(['LATTICE GAS 27x18 cells','1/2/3/4 select N/E/S/W.','Enter toggles that particle.','B toggles an empty wall.','Occupied wall edits refused.','N streams all particles;','walls/edges reflect them.','An opposing pair turns90deg','only when alone in a cell.','Particles are conserved.','V:density/velocity view','H preserves; R restarts.'])}
${fieldHelpers}`;
export const LATTICE_GAS=app(401,'lattice-gas','bottles','Lattice Gas','A 27 x 18 native lattice gas stores at most one particle in each of four directions per cell. Select direction 1 N/2 E/3 S/4 W and Enter to toggle it. B toggles a wall only in an empty cell; occupied edits are explicitly refused. N streams simultaneously: a wall or boundary reflects a particle back into its source with opposite direction. Then an isolated opposing pair turns 90 degrees; other occupancies remain unchanged. Every tick conserves the exact particle count. V toggles density/velocity rendering. This discrete four-direction model is not a general fluid solver. Arrows aim, H preserves state, R resets, F1 exits.',gas);
const interference=`
canvas_init: W -3657 -9841 W -3656 -7570 W -3655 -9841 W -3654 -5299 W -3653 -9841 W -3652 -2271 W -3651 -9841 W -3650 757 W -3649 -9841 W -3648 3785 W -3647 -9841 W -3646 6813 W -3645 -9841 W -3644 9841 W -3659 -9841 W 2700 16 W 2701 18 W 2702 38 W 2703 18 W 2704 Z W 2705 8 W 2706 Z J in_render
canvas_click: R E 2704 M I 2700 A I E R F 2600 W I F R F 2601 M I/1 F J in_render
canvas_step: R E 2706 I E 1 ifge E 8 M E Z end W 2706 E J in_render
canvas_key: ife A 49 W 2704 Z O S P end ife A 50 W 2704 2 O S P end ife A 119 R E 2705 P E 2 ifg E 16 M E 4 end W 2705 E J in_render end O S P
canvas_draw: J cv_pixels
in_render: W 2720 Z
in_pixel: R E 2720 ifge E 486 O S P end M A E M B 27 C S cv_div P A 2 P C 2 W 2721 C W 2722 A M B A M A C M C Z C S in_distance P A 8 R B 2705 C S cv_div M B 8 C S cv_div M I @in_cos A I C R E I W 2730 E R A 2721 R B 2722 M C 2 C S in_distance P A 8 R B 2705 C S cv_div R E 2706 A A E M B 8 C S cv_div M I @in_cos A I C R E I R F 2730 A E F F E A ifg E 7 M E 7 end R I 2722 P I 54 R F 2721 A I F A I 3000 W I E M I/1 E M I/54 E M I/55 E R F 2720 I F 1 W 2720 F J in_pixel
in_distance: M I 2700 A I C R E I S A E M E I/1 S B E P A A P B B A A B M D A M G Z M H 64
in_sqrt: ifg G H M A H O S P end M A G A A H M B 2 C S cv_div M E A P E E ifle E D M G A I G 1 else M H A I H -1 end J in_sqrt
canvas_status: M A @in_source M B 22 C S cv_text R F 2704 Q F 2 I F 1 C S cv_number M A @in_wave M B 23 C S cv_text R F 2705 C S cv_number M A @in_phase M B 24 C S cv_text R F 2706 J cv_number
in_cos: 4 3 0 -3 -4 -3 0 3
in_source: ${ascii('1/2:source selected ')}
in_wave: ${ascii('W:wavelength pixels ')}
in_phase: ${ascii('N:phase eighths ')}
${help(['INTERFERENCE SCREEN','1/2 selects either source.','Arrows aim; Enter moves it.','W:wavelength4/8/16 pixels','N:phase shifts by1/8 cycle.','Radius=floor(sqrt(dx2+dy2))','Cosine has8 integer samples.','Amplitudes add; intensity','is their squared sum.','Gray indexes abs amplitude','(zero dark,8 shares color7).','27x18 samples, pitch2.'])}`;
export const INTERFERENCE_SCREEN=app(399,'interference','lenses','Interference Screen','Move two scalar-wave sources on a 27 x 18 sampled field at two-pixel spacing with 1/2, arrows and Enter. W cycles wavelength 4/8/16 pixels; N advances the second source phase by one eighth-cycle. Native integer square root gives floor radial distance and an eight-sample cosine table supplies signed amplitudes. Their sum squared is intensity; gray levels index absolute amplitude 0..8, with 8 sharing color 7 and each 2 x 2 block sharing its highest ink index. This intentionally quantized distance/phase model shows interference bands, not precision diffraction. H preserves settings and image, R resets, F1 exits.',interference);
const gears=`
canvas_init: M I 5000 M K 72
ge_clear: W I Z I I 1 I K -1 N K Z J ge_clear M H Z
ge_teeth: M I 5040 A I H M J @ge_initial A J H R E J W I E I H 1 ifl H 6 J ge_teeth end W 5001 1 W 5006 1 W 5008 1 W 5013 1 W 5010 1 W 5025 1 W 5027 1 W 5022 1 W 5029 1 W 5034 1 W 2700 Z W 2701 Z W 2702 -1 J ge_solve
canvas_click: W 2710 Z W 2711 9841 W 2712 Z
ge_nearest: R H 2710 M I @ge_x A I H R E I R F 2600 S E F P E E M I @ge_y A I H R F I R G 2601 S F G P F F A E F R F 2711 ifl E F W 2711 E W 2712 H end I H 1 W 2710 H ifl H 6 J ge_nearest end R E 2712 W 2700 E R F 2702 ifl F Z W 2702 E O S P end ifn E F M I F P I 6 A I E A I 5000 R G I M H 1 S H G W I H M I E P I 6 A I F A I 5000 W I H end W 2702 -1 J ge_solve
canvas_key: ife A 116 R E 2700 M I 5040 A I E R F I I F 1 ifg F 4 M F 1 end W I F O S P end ife A 100 R E 2700 W 2701 E J ge_solve end ife A 99 W 2702 -1 end O S P
ge_solve: M I 5050 M K 6
ge_sign_clear: W I Z I I 1 I K -1 N K Z J ge_sign_clear R E 2701 M I 5050 A I E W I 1 W 2604 Z W 2710 Z
ge_pass: W 2711 Z
ge_from: R H 2711 M I 5050 A I H R G I E G Z J ge_from_next W 2712 Z
ge_to: R H 2711 R K 2712 M I H P I 6 A I K A I 5000 R E I E E Z J ge_to_next M I 5050 A I H R G I P G -1 M I 5050 A I K R E I ife E Z W I G else ifn E G W 2604 1 end end
ge_to_next: R E 2712 I E 1 W 2712 E ifl E 6 J ge_to end
ge_from_next: R E 2711 I E 1 W 2711 E ifl E 6 J ge_from end R E 2710 I E 1 W 2710 E ifl E 6 J ge_pass end O S P
canvas_step: C S ge_solve R E 2604 N E Z O S P W 2710 Z
ge_rotate: R H 2710 M I 5050 A I H R G I ifn G Z M I 5040 A I H R B I M A 12 C S cv_div P A G M I 5060 A I H R E I A E A ifl E Z A E 48 end ifge E 48 S E 48 end W I E end I H 1 W 2710 H ifl H 6 J ge_rotate end R E 2603 ifl E 9841 I E 1 W 2603 E end O S P
canvas_draw: C S cv_clear_pixels W 2710 Z
ge_draw_from: R H 2710 ifge H 6 J ge_circles_start end I H 1 W 2711 H
ge_draw_to: R K 2711 ifge K 6 J ge_draw_from_next end R H 2710 M I H P I 6 A I K A I 5000 R E I E E Z J ge_draw_to_next M I @ge_x A I H R E I W 2740 E M I @ge_y A I H R E I W 2741 E M I @ge_x A I K R E I W 2742 E M I @ge_y A I K R E I W 2743 E W 2744 1 C S ge_line
ge_draw_to_next: R E 2711 I E 1 W 2711 E J ge_draw_to
ge_draw_from_next: R E 2710 I E 1 W 2710 E J ge_draw_from
ge_circles_start: W 2710 Z
ge_circle: R H 2710 ifge H 6 J cv_pixels end M I @ge_x A I H R E I W 2740 E M I @ge_y A I H R E I W 2741 E M I 5050 A I H R E I M C 1 ifg E Z M C 2 end ifl E Z M C 5 end R E 2604 ifn E Z M C 6 end W 2744 C W 2711 Z
ge_ring: R K 2711 M I @ge_dx A I K R A I R E 2740 A A E M I @ge_dy A I K R B I R E 2741 A B E R C 2744 C S cv_plot I K 1 W 2711 K ifl K 12 J ge_ring end R H 2710 M I 5060 A I H R A I M B 4 C S cv_div M I @ge_dx A I A R E I R F 2740 A E F W 2742 E M I @ge_dy A I A R E I R F 2741 A E F W 2743 E C S ge_line R H 2710 R E 2700 ife H E R A 2740 R B 2741 M C 7 C S cv_plot end I H 1 W 2710 H J ge_circle
ge_line: R E 2742 R F 2740 S E F W 2745 E F E A R F 2743 R G 2741 S F G W 2746 F F F A ifg F E M E F end W 2747 E W 2748 Z E E Z O S P
ge_line_point: R A 2745 R G 2748 P A G W 2749 A F A A R B 2747 C S cv_div R E 2749 ifl E Z P A -1 end R E 2740 A A E W 2750 A R A 2746 R G 2748 P A G W 2749 A F A A R B 2747 C S cv_div R E 2749 ifl E Z P A -1 end R E 2741 A A E M B A R A 2750 R C 2744 C S cv_plot R E 2748 I E 1 W 2748 E R F 2747 ifle E F J ge_line_point end O S P
canvas_status: M A @ge_selected M B 22 C S cv_text R F 2700 I F 1 C S cv_number M A @ge_teeth_text C S cv_append R E 2700 M J 5040 A J E R F J C S cv_number M A @ge_driver C S cv_append R F 2701 I F 1 C S cv_number R E 2604 ifn E Z M A @ge_stopped M B 23 C S cv_text else M A @ge_speed M B 23 C S cv_text R E 2701 M J 5040 A J E R F J R E 2700 M J 5050 A J E R G J P F G C S cv_number W I 47 I I 1 R E 2700 M J 5040 A J E R F J C S cv_number M A @ge_ratio C S cv_append end R E 2604 ifn E Z M A @ge_jam else R E 2702 ifge E Z M A @ge_pending else M A @ge_hint end end M B 24 J cv_text
ge_selected: ${ascii('Gear ')}
ge_teeth_text: ${ascii(' Teeth')}
ge_driver: ${ascii(' Driver')}
ge_stopped: ${ascii('Driver component stopped')}
ge_speed: ${ascii('Speed ')}
ge_ratio: ${ascii(' of driver')}
ge_jam: ${ascii('JAM: odd contact cycle')}
ge_pending: ${ascii('Enter another gear to link')}
ge_hint: ${ascii('D:driver C:cancel link')}
ge_initial: 1 2 3 4 2 1
ge_x: 8 26 44 8 26 44
ge_y: 9 9 9 27 27 27
ge_dx: 4 3 2 0 -2 -3 -4 -3 -2 0 2 3
ge_dy: 0 2 3 4 3 2 0 -2 -3 -4 -3 -2
${help(['GEAR CONTACT BENCH','Enter nearest gear selects;','Enter another toggles mesh.','T:teeth factor1..4 D:driver','C cancels pending contact.','N:advance; cyan clockwise,','blue counterclockwise.','Each tick phase+=sign*12/t.','48phase units per turn;','spokes quantize to12 angles.','Odd mesh cycle jams driver','component; unlinked rests.','Contact schematic, not','physical gear placement.'])}`;
export const GEAR_CONTACT=app(398,'gear-contact','pendulum','Gear Contact Bench','Edit a schematic of six external gears: aim and Enter selects the nearest gear, then Enter another toggles their contact. T cycles the selected tooth-count factor 1..4; D makes it the driver; C cancels a pending link. N propagates opposite rotation directions through the driver component and advances phase by sign*12/teeth out of 48 units per turn, so speed ratios are exact. Spokes display 12 quantized angles. An odd contact cycle jams that component and stops its advancement; disconnected gears remain at rest. This is a contact graph with abstract centers, not a claim that arbitrary drawn gears physically mesh. H preserves state, R restores the chain, F1 exits.',gears);
export const CREATIVE_DYNAMICS=[BRANCHING_TURTLE,RIPPLE_TANK,GEAR_CONTACT,INTERFERENCE_SCREEN,CHAOS_TRIANGLE,LATTICE_GAS];
