import type {TextSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const label=(name:string,s:string)=>{if(s.length>27)throw Error(`Visual label too long: ${s}`);return `${name}: ${ascii(s)}\n`;};
const help=(lines:string[])=>`canvas_help: ${lines.map((_,i)=>`M A Z M B ${18+i*9} M C @fx_help${i} M D 1 C S vc_text`).join(' ')} O S P\n${lines.map((s,i)=>label('fx_help'+i,s)).join('')}`;
const app=(number:number,id:string,site:string,title:string,description:string,algorithm:string):TextSoftware=>({number,id,site,title,kind:'text',uiModule:'visualCanvasUi',bitmapVram:true,launchHelp:'G runs; N steps; SPACE pauses. TAB colors; H help; R reset; F1 programs.',inputs:['Keyboard canvas'],outputs:['High-resolution canvas'],description,algorithm,examples:[{input:'',output:''}]});
// Native 81x63 samples become exact 2x2 H-mode pixels. One progressive row
// per redraw bounds latency even when each sample runs an iterative solver.
// Apps use2700..2799; renderer state2800..2809; sample scratch2810..2879.
const ready=(limit:number)=>`M I -7249 M E 108 K I E M C @fx_painting R E 2802 ifge E ${limit} M C @fx_ready end M A Z M B 145 M D -1 J vc_text
${label('fx_painting','PAINTING')}${label('fx_ready','READY')}`;
const raster=`
fx_restart: W 2802 Z W 2611 1 W 2790 1 W 2606 1 O S P
fx_raster: R E 2611 ifn E Z C S vc_clear W 2802 Z W 2611 Z W 2790 1 W 2606 1 end R E 2802 ifge E 63 O S P end W 2801 E W 2800 Z
fx_pixel_loop: C S fx_sample M C A C S fx_put2 R E 2800 I E 1 W 2800 E ifl E 81 J fx_pixel_loop end R E 2802 I E 1 W 2802 E ifge E 63 R E 2790 ifn E Z W 2790 Z W 2606 Z end end O S P
fx_put2: W 2880 C R A 2800 P A 2 R B 2801 P B 2 A B 18 W 2881 A W 2882 B C S vc_pixel R A 2881 I A 1 R B 2882 R C 2880 C S vc_pixel R A 2881 R B 2882 I B 1 R C 2880 C S vc_pixel R A 2881 I A 1 R B 2882 I B 1 R C 2880 J vc_pixel
fx_raster4: C S fx_raster C S fx_raster C S fx_raster J fx_raster
fx_status: M I -9679 M E 162 K I E M A Z M B 10 M C @fx_hint M D -1 C S vc_text ${ready(63)}
`;
// Fixed point unit27: pre-iteration |z|²<=2916, hence each square<=2916,
// double cross-product<=5832. Escape check clamps components before squaring.
const fractal=`
canvas_init: W 2700 -14 W 2701 Z W 2702 1 W 2703 18 J fx_restart
canvas_step: O S P
canvas_key: ife A 83 R E 2700 S E 4 ifge E -67 W 2700 E end J fx_restart end ife A 84 R E 2700 A E 4 ifle E 40 W 2700 E end J fx_restart end ife A 89 R E 2701 S E 4 ifge E -40 W 2701 E end J fx_restart end ife A 90 R E 2701 A E 4 ifle E 40 W 2701 E end J fx_restart end ife A 122 R E 2702 M F 3 S F E W 2702 F J fx_restart end ife A 105 R E 2703 ife E 18 M E 30 else M E 18 end W 2703 E J fx_restart end O S P
canvas_draw: C S fx_raster R E 2802 ifge E 63 W 2606 Z end J fx_status
fx_sample: R A 2800 S A 40 R B 2702 C S vc_trunc R E 2700 A A E W 2810 A R A 2801 S A 31 R B 2702 C S vc_trunc R E 2701 A A E W 2811 A W 2812 Z W 2813 Z W 2814 Z
fr_iter: R G 2812 R H 2813 ifl G -54 J fr_escaped end ifg G 54 J fr_escaped end ifl H -54 J fr_escaped end ifg H 54 J fr_escaped end M E G P E G M F H P F H M I E A I F ifg I 2916 J fr_escaped end S E F M A E M B 27 C S vc_trunc R E 2810 A A E W 2815 A M A G P A H P A 2 M B 27 C S vc_trunc R E 2811 A A E W 2813 A R E 2815 W 2812 E R E 2814 I E 1 W 2814 E R F 2703 ifl E F J fr_iter end M A Z O S P
fr_escaped: R A 2814 M B 3 C S vc_div M A C I A -1 O S P
${label('fx_hint','ARROWS PAN Z ZOOM I DETAIL')}${help(['FRACTAL NAVIGATOR','N: one row. G: finish.','Z: two useful zoom levels.','ARROWS pan by four units.','I: 18 or 30 iterations.','Fixed point: unit is1/27.','Zoom has finite precision.','Dark: no escape this run.','TAB palette SPACE pauses.','H returns to the same view.','R reset F1 programs.'])}${raster}`;
export const FRACTAL_NAVIGATOR=app(445,'fractal-view','comet','Fractal Navigator','Explore native Mandelbrot escape bands on an 81 x 63 sample grid drawn as 2 x 2 pixels. Arrows pan, Z switches two bounded zoom levels and I chooses 18 or 30 iterations. Arithmetic uses signed fixed-point units of 1/27 and truncation, so this is a deliberately quantized approximation, not deep-zoom precision. The first image paints automatically, then pauses. N draws one row; G completes the picture and stops. SPACE pauses, TAB changes the three-color palette, H explains and preserves the view, R resets and F1 exits.',fractal);
export const VISUAL_EXPLORERS:TextSoftware[]=[FRACTAL_NAVIGATOR];
const liquid=`
canvas_init: W 2700 23 W 2701 25 W 2702 43 W 2703 34 W 2704 60 W 2705 20 W 2710 1 W 2711 1 W 2712 -1 W 2713 1 W 2714 -1 W 2715 -1 W 2720 16 W 2721 Z J fx_restart
canvas_step: R E 2802 ifl E 63 O S P end M L Z
ll_move: M A L M B 2 C S vc_div M G 77 ifn C Z M G 59 end M I 2700 A I L R E I M J 2710 A J L R F J A E F ifg E G P F -1 W J F S E 2 end ifl E 3 P F -1 W J F A E 2 end M I 2700 A I L W I E I L 1 ifl L 6 J ll_move end W 2802 Z O S P
canvas_key: ifge A 49 ifle A 51 S A 49 W 2721 A O S P end end ife A 43 R E 2720 ifl E 20 I E 1 W 2720 E end J fx_restart end ife A 45 R E 2720 ifg E 8 I E -1 W 2720 E end J fx_restart end ife A 83 M G -2 M H Z J ll_edit end ife A 84 M G 2 M H Z J ll_edit end ife A 89 M G -2 M H 1 J ll_edit end ife A 90 M G 2 M H 1 J ll_edit end O S P
ll_edit: R I 2721 P I 2 A I H A I 2700 R E I A E G M F 77 ifn H Z M F 59 end ifl E 3 M E 3 end ifg E F M E F end W I E J fx_restart
canvas_draw: C S fx_raster4 C S fx_status R E 2721 A E 49 W 2716 E W 2717 Z M A 30 M B 10 M C 2716 M D 1 J vc_text
fx_sample: W 2810 Z M L Z R G 2720 P G G
ll_field: M I 2700 A I L R E I R F 2800 S E F F E A R F 2720 ifg E F J ll_next end P E E M H E M E I/1 R F 2801 S E F F E A R F 2720 ifg E F J ll_next end P E E A H E ifge H G J ll_next end M E G S E H R F 2810 A F E W 2810 F
ll_next: I L 2 ifl L 6 J ll_field end R E 2810 ifge E G M A 1 O S P end M A G M B 2 C S vc_div R E 2810 ifge E A M A -1 else M A Z end O S P
${label('fx_hint','BALL   1/2/3 +/- ARROWS')}${help(['LIQUID LANTERNS','Three compact quadratic','fields add, forming blobs.','Two thresholds show joins.','1/2/3 selects a source.','ARROWS reposition it.','+/- radius8..20 samples.','G: bounce the sources.','Each picture uses16 chunks.','N draws the next four rows.','TAB palette SPACE pauses.','H keeps sources intact.','R reset F1 programs.'])}${raster}`;
export const LIQUID_LANTERNS=app(446,'liquid-lantern','bottles','Liquid Lanterns','Three bouncing sources add bounded quadratic fields; two contour thresholds form merging liquid shapes. This is a graphic level-set toy, not fluid physics. Keys 1/2/3 select a source, arrows move it, +/- changes radius 8..20 samples. Native 81 x 63 field samples become 2 x 2 pixels. The first frame paints automatically, then pauses. N renders four rows; G assembles successive frames and advances sources only between complete frames. SPACE pauses, TAB cycles colors, H preserves settings for repaint, R resets and F1 exits.',liquid);
VISUAL_EXPLORERS.push(LIQUID_LANTERNS);
const rotor=`
canvas_init: W 2700 Z W 2701 1 W 2702 Z W 2703 Z W 2704 Z J fx_restart
canvas_step: R E 2802 ifl E 63 O S P end R E 2700 I E 1 ifge E 16 M E Z end W 2700 E W 2802 Z O S P
canvas_key: ife A 122 R E 2701 I E 1 ifg E 3 M E 1 end W 2701 E J fx_restart end ife A 116 R E 2702 I E 1 ifge E 3 M E Z end W 2702 E J fx_restart end ife A 83 M G -2 M H 2703 J rz_pan end ife A 84 M G 2 M H 2703 J rz_pan end ife A 89 M G -2 M H 2704 J rz_pan end ife A 90 M G 2 M H 2704 J rz_pan end O S P
rz_pan: R E H A E G ifl E Z A E 24 end ifge E 24 S E 24 end W H E J fx_restart
canvas_draw: C S fx_raster4 J fx_status
fx_sample: R I 2700 A I @rz_cos R G I R I 2700 A I @rz_sin R H I R E 2800 S E 40 R F 2801 S F 31 M A E P A G M J F P J H A A J R B 2701 P B 27 C S vc_trunc R E 2703 A A E A A 120 M B 24 C S vc_div W 2810 C R E 2800 S E 40 R F 2801 S F 31 M A F P A G M J E P J H S A J R B 2701 P B 27 C S vc_trunc R E 2704 A A E A A 120 M B 24 C S vc_div W 2811 C R E 2702 ife E Z R A 2810 M B 6 C S vc_div M G A R A 2811 M B 6 C S vc_div A A G M B 2 C S vc_div M A -1 ifn C Z M A 1 end O S P end ife E 1 R A 2810 R E 2811 A A E M B 8 C S vc_div ifl C 3 M A -1 else ifl C 6 M A Z else M A 1 end end O S P end R E 2810 S E 12 F E A R F 2811 S F 12 F F A A E F ifl E 6 M A 1 else ifl E 12 M A -1 else M A Z end end O S P
rz_cos: 27 25 19 10 0 -10 -19 -25 -27 -25 -19 -10 0 10 19 25
rz_sin: 0 10 19 25 27 25 19 10 0 -10 -19 -25 -27 -25 -19 -10
${label('fx_hint','Z ZOOM T TILE ARROWS SLIDE')}${help(['RASTER CAROUSEL','Inverse affine texture map.','T:checker/stripes/diamonds.','Z: three zoom levels.','ARROWS slide tile phase.','G: 16 quantized angles.','Native integer sine table.','N: four rows per chunk.','81x63 samples,2x2 pixels.','TAB palette SPACE pauses.','H returns to the same view.','R reset F1 programs.'])}${raster}`;
export const RASTER_CAROUSEL=app(447,'raster-carousel','pottery','Raster Carousel','Rotate and enlarge an infinite tiled texture through native inverse affine mapping. T selects checkerboard, diagonal stripes or diamond tiles; Z cycles three scales; arrows shift texture phase. A 16-angle integer sine/cosine table and truncation deliberately quantize rotation. The first frame paints automatically, then pauses. G animates complete frames; N renders four of the 63 sample rows. Samples occupy 2 x 2 high-resolution pixels. TAB changes palette, SPACE pauses, H preserves transform settings for repaint, R resets and F1 exits.',rotor);
VISUAL_EXPLORERS.push(RASTER_CAROUSEL);
const depth=`
canvas_init: W 2700 13 W 2701 10 W 2702 Z W 2703 Z J hd_preset
hd_preset: M L Z
hd_seed: M A L M B 27 C S vc_div M G C S G 13 S A 10 F G A F A A A G A M E Z R F 2703 ife F Z ifl G 12 M E 1 end ifl G 8 M E 2 end ifl G 4 M E 3 end else ifl C 9 ifge A Z M E 1 end else ifl C 18 M E 2 else M E 3 end end end M I 3000 A I L W I E I L 1 ifl L 567 J hd_seed end J fx_restart
canvas_step: O S P
canvas_key: ife A 118 R E 2702 M F 1 S F E W 2702 F J fx_restart end ife A 98 R E 2703 M F 1 S F E W 2703 F J hd_preset end ife A 83 R E 2700 ifg E Z I E -1 W 2700 E end J fx_restart end ife A 84 R E 2700 ifl E 26 I E 1 W 2700 E end J fx_restart end ife A 89 R E 2701 ifg E Z I E -1 W 2701 E end J fx_restart end ife A 90 R E 2701 ifl E 20 I E 1 W 2701 E end J fx_restart end ife A 88 R I 2701 P I 27 R E 2700 A I E A I 3000 R E I I E 1 ifge E 4 M E Z end W I E W 2702 Z J fx_restart end O S P
canvas_draw: C S fx_raster4 R E 2802 ifge E 63 W 2606 Z end R E 2702 ife E Z R A 2700 P A 6 R B 2701 P B 6 A B 18 M C A A C 5 M D B M E 1 C S vc_line R A 2700 P A 6 R B 2701 P B 6 A B 23 M C A A C 5 M D B M E 1 C S vc_line end J fx_status
fx_sample: R A 2800 M B 3 C S vc_div W 2810 A R A 2801 M B 3 C S vc_div P A 27 R E 2810 A A E A A 3000 R G A R E 2702 ife E Z ife G 3 R A 2800 R E 2801 A A E M B 2 C S vc_div M A -1 ifn C Z M A 1 end O S P end M A G ifn A Z S A 2 ife A Z M A 1 end end O S P end M H 12 P G 2 S H G R E 2800 ifl E H R E 2801 P E 17 R F 2800 P F 13 A E F I E 1 M A E M B 7 C S vc_div M A -1 ifl C 3 M A 1 end else S E H A E 3600 R A E end R I 2800 A I 3600 W I A O S P
${label('fx_hint','V MAP/DOTS B SHAPE ENTER')}${help(['HIDDEN DEPTH STUDIO','Default view shows depth.','V: preview or dots.','Look through the dots','to fuse adjacent repeats.','B restores hill or steps.','ARROWS move27x21 edit cell.','ENTER cycles its depth0..3.','N: four rows. G: finish.','Depth shortens repeats:','12,10,8,6 samples per row.','TAB colors SPACE pause.','H keeps your depth edits.'])}${raster}`;
export const HIDDEN_DEPTH=app(448,'hidden-depth','lenses','Hidden Depth Studio','Build depth-dependent repeating-dot images entirely in guest code. The default depth preview is directly readable; V toggles dots. A 27 x 21 depth grid contains levels 0..3; arrows choose a cell and Enter cycles it. B restores a hill or stepped depth preset. Each 81-sample output row copies an earlier sample at separation 12, 10, 8 or 6 according to depth; initial dots are deterministic. This simple causal stereogram model omits full occlusion solving. The first preview paints automatically. N draws four rows, G finishes, TAB changes palette, SPACE pauses, H preserves depth for repaint, R resets and F1 exits.',depth);
VISUAL_EXPLORERS.push(HIDDEN_DEPTH);
const crystal=`
canvas_init: W 2704 Z J cg_reset
cg_reset: M I 3000 M E 1944 K I E W 2702 1 W 2703 Z W 2705 Z W 2706 Z W 2707 3 W 2708 35 R E 2704 ife E Z W 3999 1 W 2706 1 else M I 4890 M E 54
cg_floor: W I 1 I I 1 I E -1 N E Z J cg_floor W 2706 54 end C S cg_spawn W 2802 Z W 2611 1 W 2790 1 W 2606 1 O S P
cg_random: R A 2702 P A 4 I A 1 M B 2187 C S vc_div W 2702 C M A C O S P
cg_spawn: C S cg_random R E 2704 ifn E Z M B 54 C S vc_div W 2700 C R E 2708 S E 3 ifl E Z M E Z end W 2701 E else M B 8 C S vc_div M I @cg_dx A I C R E I R F 2707 P E F A E 27 W 2700 E M I @cg_dy A I C R E I P E F A E 18 W 2701 E end W 2703 Z O S P
cg_dx: 1 1 0 -1 -1 -1 0 1
cg_dy: 0 1 1 1 0 -1 -1 -1
canvas_key: ife A 98 R E 2704 M F 1 S F E W 2704 F J cg_reset end O S P
canvas_step: R E 2802 ifl E 36 O S P end W 2710 128
cg_walk: C S cg_random M B 81 C S vc_div M B 4 C S vc_div R G 2700 R H 2701 ife C Z I G -1 end ife C 1 I G 1 end ife C 2 I H -1 end ife C 3 I H 1 end ifl G Z M G 53 end ifg G 53 M G Z end ifl H Z M H 35 end ifg H 35 M H Z end W 2700 G W 2701 H M I H P I 54 A I G A I 3000 R E I ifn E Z J cg_respawn end W 2711 I M E Z ifg G Z M F I/-1 F F A A E F end ifl G 53 M F I/1 F F A A E F end ifg H Z M F I/-54 F F A A E F end ifl H 35 M F I/54 F F A A E F end ifn E Z R E 2706 I E 1 W 2706 E M A E M B 2 C S vc_div M E 1 ifn C Z M E -1 end R I 2711 W I E R E 2700 S E 27 F E A R F 2701 S F 18 F F A ifg F E M E F end I E 3 ifg E 17 M E 17 end R F 2707 ifg E F W 2707 E end R E 2701 R F 2708 ifl E F W 2708 E end R I 2711 R C I R A 2700 R B 2701 C S cg_stamp J cg_respawn end R E 2703 I E 1 W 2703 E ifge E 729 J cg_respawn end J cg_next
cg_respawn: C S cg_spawn
cg_next: R E 2710 I E -1 W 2710 E N E Z J cg_walk O S P
canvas_draw: R E 2611 ifn E Z C S vc_clear W 2802 Z W 2790 1 W 2606 1 end W 2712 4
cg_rows: R H 2802 ifge H 36 J cg_status end W 2713 Z
cg_columns: R G 2713 M I H P I 54 A I G A I 3000 R C I M A G M B H C S cg_stamp R G 2713 I G 1 W 2713 G ifl G 54 R H 2802 J cg_columns end R E 2802 I E 1 W 2802 E R E 2712 I E -1 W 2712 E N E Z J cg_rows
cg_status: R E 2802 ifge E 36 R E 2790 ifn E Z W 2790 Z W 2606 Z end end M I -9679 M E 162 K I E M A Z M B 10 M C @cg_hint M D -1 C S vc_text ${ready(36)}
cg_stamp: P A 3 P B 3 A B 27 W 2881 A W 2882 B W 2880 C W 2883 Z
cg_stamp_row: W 2884 Z
cg_stamp_pixel: R A 2881 R E 2884 A A E R B 2882 R E 2883 A B E R C 2880 C S vc_pixel R E 2884 I E 1 W 2884 E ifl E 3 J cg_stamp_pixel end R E 2883 I E 1 W 2883 E ifl E 3 J cg_stamp_row end O S P
${label('cg_hint','B SEED N128 WALKS G GROWTH')}${help(['CRYSTAL GARDEN','Walkers stick to crystal.','B: center or floor seed.','N: 128 walk steps.','G grows;SPACE pauses.','Births alternate two inks.','Grid54x36,shown3x3 pixels.','Launch near the crystal;','contact does not wrap.','Respawn at729 steps or hit.','TAB colors R restarts seed.','H keeps the grown crystal.','F1 returns to programs.'])}`;
export const CRYSTAL_GARDEN=app(449,'crystal-garden','crystal','Crystal Garden','Watch diffusion-limited aggregation: one seeded random walker at a time sticks beside an existing orthogonal neighbor. B selects center or floor seeds; each N performs 128 bounded walk steps after initial painting, and G continues. Walkers wrap at edges but sticking checks only in-bounds neighbors. A hit or 729-step lifetime starts a new walker just outside the growing cluster. Center launches follow its bounded square radius; floor launches start three rows above the highest crystal. A 2187-state native generator makes each reset reproducible; two inks alternate births. The 54 x 36 occupancy grid is rendered as 3 x 3 pixels. TAB colors, SPACE pauses, H preserves the crystal for reconstruction, R resets and F1 exits.',crystal);
VISUAL_EXPLORERS.push(CRYSTAL_GARDEN);
// 18x14 simultaneous fields U/V in0..18; maximal u*v*v=5832.
// Four-neighbor reflecting boundary; old fields remain immutable in a tick.
const reaction=`
canvas_init: W 2700 9 W 2701 7 W 2702 9 J rc_reset
rc_reset: M I 3000 M J 3300 M K 252
rc_seed: W I 18 W J Z I I 1 I J 1 I K -1 N K Z J rc_seed W 2700 4 W 2701 3 C S rc_inject W 2700 13 C S rc_inject W 2701 11 C S rc_inject W 2700 4 C S rc_inject W 2700 9 W 2701 7 C S rc_inject O S P
rc_inject: R E 2701 P E 18 R F 2700 A E F W 2710 E M L -1
rc_inject_row: M K -1
rc_inject_column: R G 2700 A G K R H 2701 A H L ifl G Z J rc_inject_next end ifg G 17 J rc_inject_next end ifl H Z J rc_inject_next end ifg H 13 J rc_inject_next end M I H P I 18 A I G A I 3000 W I 6 A I 300 W I 12
rc_inject_next: I K 1 ifle K 1 J rc_inject_column end I L 1 ifle L 1 J rc_inject_row end O S P
canvas_key: ife A 83 R E 2700 ifg E Z I E -1 W 2700 E end O S P end ife A 84 R E 2700 ifl E 17 I E 1 W 2700 E end O S P end ife A 89 R E 2701 ifg E Z I E -1 W 2701 E end O S P end ife A 90 R E 2701 ifl E 13 I E 1 W 2701 E end O S P end ife A 88 J rc_inject end ife A 99 J rc_reset end ife A 98 R E 2702 A E 3 ifg E 12 M E 6 end W 2702 E end O S P
canvas_step: W 2710 Z
rc_cell: R A 2710 M B 18 C S vc_div W 2711 C W 2712 A R I 2710 A I 3000 R E I W 2720 E R I 2710 A I 3300 R F I W 2721 F M G Z M H Z M L Z
rc_neighbor: R I 2710 R E 2711 R F 2712 ife L Z ifg E Z I I -1 end end ife L 1 ifl E 17 I I 1 end end ife L 2 ifg F Z S I 18 end end ife L 3 ifl F 13 A I 18 end end A I 3000 R E I A G E A I 300 R E I A H E I L 1 ifl L 4 J rc_neighbor end R E 2720 P E 4 M A G S A E M B 4 C S vc_trunc W 2722 A R E 2721 P E 4 M A H S A E M B 6 C S vc_trunc W 2723 A R A 2720 R E 2721 P A E P A E M B 162 C S vc_div W 2724 A R A 2721 R B 2702 C S vc_div ifn C Z I A 1 end W 2725 A R E 2720 R F 2722 A E F R F 2724 S E F R F 2720 ifl F 18 I E 2 end ifl E Z M E Z end ifg E 18 M E 18 end R I 2710 A I 3600 W I E R E 2721 R F 2723 A E F R F 2724 A E F R F 2725 S E F ifl E Z M E Z end ifg E 18 M E 18 end R I 2710 A I 3900 W I E R E 2710 I E 1 W 2710 E ifl E 252 J rc_cell end M I 3600 M J 3000 M K 252
rc_publish_u: D J I I K -1 N K Z J rc_publish_u M I 3900 M J 3300 M K 252
rc_publish_v: D J I I K -1 N K Z J rc_publish_v O S P
canvas_draw: W 2710 Z
rc_paint: R A 2710 M B 18 C S vc_div P A 162 A A C A A -9517 M I A R J 2710 A J 3300 R E J M F Z ifg E 3 M F -9841 end ifg E 9 M F 9841 end M K 9
rc_tile: W I F A I 18 I K -1 N K Z J rc_tile R E 2710 I E 1 W 2710 E ifl E 252 J rc_paint end R A 2700 P A 9 R B 2701 P B 9 A B 18 M C A A C 8 M D B M E 1 C S vc_line R A 2700 P A 9 R B 2701 P B 9 A B 26 M C A A C 8 M D B M E 1 C S vc_line M I -9679 M E 162 K I E M A Z M B 10 M C @rc_hint M D -1 J vc_text
${label('rc_hint','ARROWS BRUSH ENTER INJECT B')}${help(['REACTION CANVAS','Five pools, two fields.','ARROWS move3x3 brush.','ENTER injects U6,V12.','B removal divisor6/9/12.','C: restore five seed pools.','U diffusion /4; V /6.','Reaction=floor(U*V*V/162).','Feed adds2 where U<18.','Removal=ceil(V/divisor).','Each tick clips to 0..18.','Quantized toy chemistry.','N step G run SPACE pause.','TAB colors R reset F1 exit.'])}`;
export const REACTION_CANVAS=app(450,'reaction-canvas','ecology','Reaction Canvas','Paint and evolve two simultaneous native concentration fields on an 18 x 14 grid, each cell a 9 x 9 high-resolution tile. Concentrations U,V lie in 0..18. U adds trunc(four-neighbor Laplacian/4), V uses divisor 6; reflecting boundaries repeat the edge cell. Reaction floor(U*V*V/162) transfers U to V. Feed adds two when old U<18; V loses ceil(V/k), where B cycles k=6,9,12. Final values clip to 0..18. This explicitly quantized toy can pin patterns and is not chemical prediction. Arrows position a 3 x 3 brush, Enter sets U=6,V=12; C restores five seed pools, N steps, G runs, SPACE pauses, TAB colors, H preserves state, R resets, F1 exits.',reaction);
VISUAL_EXPLORERS.push(REACTION_CANVAS);
