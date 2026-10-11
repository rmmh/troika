import type {TextSoftware} from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const text=(name:string,s:string)=>{if(s.length>27)throw Error(`Bitmap label too long: ${s}`);if([...s.toUpperCase()].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)>90))throw Error(`Unsupported bitmap glyph: ${s}`);return `${name}: ${ascii(s)}\n`;};
const help=(lines:string[])=>`canvas_help: ${lines.map((_,i)=>`M A Z M B ${18+i*9} M C @vp_help${i} M D 1 C S vc_text`).join(' ')} O S P\n${lines.map((s,i)=>text('vp_help'+i,s)).join('')}`;
const app=(number:number,id:string,site:string,title:string,description:string,algorithm:string):TextSoftware=>({number,id,site,title,kind:'text',bitmapVram:true,uiModule:'visualCanvasUi',launchHelp:'Arrows and ENTER edit; H explains each tool. TAB colors, R resets, F1 programs.',inputs:['Native keyboard'],outputs:['Interactive bitmap'],description,algorithm,examples:[{input:'',output:''}]});
const common=`
vp_clear: M I -9679 M E 2538 K I E O S P
vp_hint: M A Z M B 10 M C @vp_controls M D -1 J vc_text
vp_digit: A C 48 W 2800 C W 2801 Z M C 2800 M D 1 J vc_text
vp_dot: W 2880 A W 2881 B W 2882 C M K 3
vp_dot_row: R A 2880 R B 2881 R C 2882 C S vc_pixel R A 2880 I A 1 R B 2881 R C 2882 C S vc_pixel R A 2880 I A 2 R B 2881 R C 2882 C S vc_pixel R E 2881 I E 1 W 2881 E I K -1 N K Z J vp_dot_row O S P
`;
const turn=(a:number,b:number,c:number,out:number)=>`R E ${b} R F ${a} S E F R G ${c+1} R H ${a+1} S G H P E G R F ${b+1} S F H R G ${c} R H ${a} S G H P F G S E F W ${out} E `;
// Segment coordinates are at most 24 in magnitude. Cross products <=1152;
// reduce signs before multiplying orientation pairs (never square a cross).
const segment=`vp_intersect: ${turn(2820,2822,2824,2830)}${turn(2820,2822,2826,2831)}${turn(2824,2826,2820,2832)}${turn(2824,2826,2822,2833)}
 M I 2830 M K 4
vp_sign: R E I ifg E Z M E 1 end ifl E Z M E -1 end W I E I I 1 I K -1 N K Z J vp_sign R E 2830 R F 2831 P E F ifg E Z M A Z O S P end R E 2832 R F 2833 P E F ifg E Z M A Z O S P end M L Z
vp_bbox: M I 2820 A I L R E I M F I/2 ifg E F M G E M E F M F G end M G I/4 M H I/6 ifg G H M J G M G H M H J end ifg E H M A Z O S P end ifg G F M A Z O S P end I L 1 ifl L 2 J vp_bbox end M A 1 O S P
`;
const untangle=`
canvas_init: W 2700 Z M I @un_initial M J 3000 M K 12
un_copy: D J I I K -1 N K Z J un_copy J un_check
canvas_step: W 2606 Z O S P
canvas_key: ifge A 49 ifle A 54 S A 49 W 2700 A O S P end end R I 2700 P I 2 A I 3000 ife A 83 R E I ifg E Z I E -1 W I E end end ife A 84 R E I ifl E 18 I E 1 W I E end end I I 1 ife A 89 R E I ifg E Z I E -1 W I E end end ife A 90 R E I ifl E 12 I E 1 W I E end end J un_check
un_check: W 2701 Z W 2710 Z
un_outer: W 2711 Z
un_inner: R E 2710 R F 2711 ifge F E J un_next end M I @un_edges A I E A I E R G I M H I/1 M I @un_edges A I F A I F R J I M K I/1 ife G J J un_next end ife G K J un_next end ife H J J un_next end ife H K J un_next end P G 2 A G 3000 P H 2 A H 3000 P J 2 A J 3000 P K 2 A K 3000 R E G W 2820 E M E G/1 W 2821 E R E H W 2822 E M E H/1 W 2823 E R E J W 2824 E M E J/1 W 2825 E R E K W 2826 E M E K/1 W 2827 E C S vp_intersect ifn A Z R E 2701 I E 1 W 2701 E end
un_next: R E 2711 I E 1 W 2711 E ifl E 7 J un_inner end R E 2710 I E 1 W 2710 E ifl E 7 J un_outer end O S P
canvas_draw: C S vp_clear C S vp_hint W 2710 Z
un_edge_draw: R I 2710 P I 2 A I @un_edges R E I M F I/1 P E 2 A E 3000 P F 2 A F 3000 R A E M B E/1 R C F M D F/1 P A 8 A A 8 P B 8 A B 30 P C 8 A C 8 P D 8 A D 30 M E -1 C S vc_line R E 2710 I E 1 W 2710 E ifl E 7 J un_edge_draw end W 2710 Z
un_node_draw: R I 2710 P I 2 A I 3000 R A I M B I/1 P A 8 A A 7 P B 8 A B 29 M C 1 C S vp_dot R I 2710 P I 2 A I 3000 R A I M B I/1 P A 8 A A 3 P B 8 A B 21 R C 2710 I C 1 C S vp_digit R E 2710 I E 1 W 2710 E ifl E 6 J un_node_draw end M A Z M B 145 M C @un_work R E 2701 ife E Z M C @un_win end M D 1 C S vc_text M A 144 M B 145 R C 2700 I C 1 J vp_digit
un_initial: 2 2 16 10 2 10 16 2 9 12 9 0
un_edges: 0 1 1 2 2 3 3 4 4 5 5 0 0 3
${text('vp_controls','1..6 NODE ARROWS MOVE')}${text('un_work','UNTANGLE / SELECTED:')}${text('un_win','NO CROSSINGS! SELECTED:')}${help(['PLANAR UNTANGLER','1..6 selects a vertex.','ARROWS move it on the grid.','Make nonincident edges','neither cross nor touch.','The drawing need not match','a prescribed arrangement.','Gold dots label vertices.','Shared ends are allowed.','N does not move vertices.','TAB colors H returns.','R reset F1 programs.'])}${segment}${common}`;

const shadows=`
canvas_init: W 2700 1 W 2701 1 W 2702 Z W 2703 Z M I 3000 M E 27 K I E J sh_check
canvas_step: W 2606 Z O S P
canvas_key: ife A 83 R E 2700 ifg E Z I E -1 W 2700 E end end ife A 84 R E 2700 ifl E 2 I E 1 W 2700 E end end ife A 89 R E 2701 ifg E Z I E -1 W 2701 E end end ife A 90 R E 2701 ifl E 2 I E 1 W 2701 E end end ife A 122 R E 2702 I E 1 ifg E 2 M E Z end W 2702 E end ife A 98 R E 2703 M F 1 S F E W 2703 F M I 3000 M E 27 K I E end ife A 88 R I 2702 P I 9 R E 2701 P E 3 A I E R E 2700 A I E A I 3000 R E I M F 1 S F E W I F end J sh_check
sh_check: M I 3100 M E 27 K I E W 2710 Z
sh_project: R I 2710 A I 3000 R E I ife E Z J sh_skip end R A 2710 M B 9 C S vc_div W 2711 A M A C M B 3 C S vc_div W 2712 A W 2713 C P A 3 A A C A A 3100 W A 1 R A 2711 P A 3 R E 2713 A A E A A 3109 W A 1 R A 2711 P A 3 R E 2712 A A E A A 3118 W A 1
sh_skip: R E 2710 I E 1 W 2710 E ifl E 27 J sh_project end W 2704 Z M I 3100 M J @sh_goal R E 2703 P E 27 A J E M K 27
sh_compare: R E I R F J ifn E F R E 2704 I E 1 W 2704 E end I I 1 I J 1 I K -1 N K Z J sh_compare O S P
canvas_draw: C S vp_clear C S vp_hint W 2710 Z
sh_draw_cells: R A 2710 M B 9 C S vc_div W 2711 A M A C M B 3 C S vc_div W 2712 A W 2713 C R I 2710 A I 3000 R E I ifn E Z W 2722 1 C S sh_cube end R E 2710 I E 1 W 2710 E ifl E 27 J sh_draw_cells end M A 110 M B 20 M C @sh_xy M D -1 C S vc_text M A 110 M B 60 M C @sh_xz M D -1 C S vc_text M A 110 M B 100 M C @sh_yz M D -1 C S vc_text R E 2700 W 2713 E R E 2701 W 2712 E R E 2702 W 2711 E W 2722 -1 C S sh_cube W 2710 Z
sh_panels: R A 2710 M B 9 C S vc_div W 2711 A M A C M B 3 C S vc_div P A 6 R E 2711 P E 40 A A E A A 28 W 2712 A P C 6 A C 140 W 2713 C R I 2710 A I 3100 R C I ife C Z M C -1 end R A 2713 R B 2712 C S vp_dot R I 2710 A I @sh_goal R E 2703 P E 27 A I E R C I ife C Z M C -1 end R A 2713 R B 2712 S A 30 C S vp_dot R E 2710 I E 1 W 2710 E ifl E 27 J sh_panels end M A Z M B 145 M C @sh_work R E 2704 ife E Z M C @sh_win end M D 1 C S vc_text M A 18 M B 145 R C 2700 I C 1 C S vp_digit M A 24 M B 145 R C 2701 I C 1 C S vp_digit M A 48 M B 145 R C 2702 I C 1 J vp_digit
sh_cube: R A 2713 R E 2712 S A E P A 12 A A 43 W 2720 A R B 2713 A B E P B 7 R E 2711 P E 15 S B E A B 60 W 2721 B M C A A C 13 M D B A D 7 R E 2722 C S vc_line R A 2720 R B 2721 M C A S C 13 M D B A D 7 R E 2722 C S vc_line R A 2720 S A 13 R B 2721 A B 7 R C 2720 M D B A D 7 R E 2722 C S vc_line R A 2720 A A 13 R B 2721 A B 7 R C 2720 M D B A D 7 R E 2722 C S vc_line R A 2720 R B 2721 A B 14 M C A M D B A D 9 R E 2722 C S vc_line R A 2720 S A 13 R B 2721 A B 7 M C A M D B A D 9 R E 2722 C S vc_line R A 2720 A A 13 R B 2721 A B 7 M C A M D B A D 9 R E 2722 J vc_line
${text('vp_controls','ARROWS XY Z LAYER ENTER')}${text('sh_work','XY:   Z:  MATCH SHADOWS')}${text('sh_xy','XY')}${text('sh_xz','XZ')}${text('sh_yz','YZ')}${text('sh_win','XY:   Z:  SOLVED')}
${help(['SHADOW BLOCKS','Build a 3x3x3 sculpture.','ARROWS select X and Y.','Z cycles the three layers.','ENTER toggles that voxel.','B chooses another target.','Right panels: XY, XZ, YZ.','Target left, yours right.','Gold filled; dim empty.','Cursor marks this voxel.','Any matching solid wins.','TAB colors R reset.','H returns F1 programs.'])}${common}`;
const inversion=`
canvas_init: W 2700 Z W 2701 Z W 2702 6 W 2703 Z O S P
canvas_step: W 2606 Z O S P
canvas_key: ife A 83 R E 2700 ifg E -4 I E -1 W 2700 E end end ife A 84 R E 2700 ifl E 4 I E 1 W 2700 E end end ife A 89 R E 2701 ifg E -4 I E -1 W 2701 E end end ife A 90 R E 2701 ifl E 4 I E 1 W 2701 E end end ife A 43 R E 2702 ifl E 9 I E 1 W 2702 E end end ife A 45 R E 2702 ifg E 1 I E -1 W 2702 E end end ife A 98 R E 2703 I E 1 ifge E 3 M E Z end W 2703 E end O S P
canvas_draw: C S vp_clear C S vp_hint W 2704 Z W 2710 -9 W 2711 -9
iv_point: R E 2703 ife E Z R A 2710 A A 9 M B 3 C S vc_div ifn C Z J iv_next end R A 2711 A A 9 M B 3 C S vc_div ifn C Z J iv_next end end R E 2703 ife E 1 R E 2710 R F 2711 ifn E Z ifn F Z ifn E F P F -1 ifn E F J iv_next end end end end end R E 2703 ife E 2 R E 2710 M F E P E F R F 2711 M G F P F G A E F ifl E 9 J iv_next end ifg E 16 ifl E 49 J iv_next end ifg E 64 J iv_next end end end
 R A 2710 P A 6 A A 81 R B 2711 P B 6 A B 81 M C -1 C S vc_pixel R E 2710 R F 2700 S E F W 2712 E R G 2711 R F 2701 S G F W 2713 G M F E P F E M H G P H G A F H W 2714 F ife F Z R E 2704 I E 1 W 2704 E J iv_next end R A 2702 P A A P A 6 W 2715 A R E 2712 P A E R B 2714 C S vc_trunc R E 2700 P E 6 A A E A A 80 W 2716 A R A 2715 R E 2713 P A E R B 2714 C S vc_trunc R E 2701 P E 6 A A E A A 80 M B A R A 2716 M C 1 C S vp_dot
iv_next: R E 2710 I E 1 W 2710 E ifle E 9 J iv_point end W 2710 -9 R E 2711 I E 1 W 2711 E ifle E 9 J iv_point end R A 2700 P A 6 A A 78 R B 2701 P B 6 A B 81 M C A A C 6 M D B M E -1 C S vc_line R A 2700 P A 6 A A 81 R B 2701 P B 6 A B 78 M C A M D B A D 6 M E -1 C S vc_line M A Z M B 145 M C @iv_status M D 1 C S vc_text M A 48 M B 145 R C 2702 C S vp_digit M A 150 M B 145 R C 2704 J vp_digit
${text('vp_controls','ARROWS CENTER +/- R B MOTIF')}${text('iv_status','RADIUS:   OMITTED:')}${help(['INVERSION LENS','Gold is the inverted motif.','Dim dots show its source.','ARROWS move the center.','+/- chooses radius 1..9.','B: lattice / rays / rings.','Map: center + r*r*d/dist2','Positions use a six-pixel','unit; divide toward zero.','Coincident source omitted;','off-canvas images clipped.','This is a quantized map.','TAB colors H returns.','R reset F1 programs.'])}${common}`;
const boolean=`
canvas_init: W 2700 Z W 2701 Z M I @bo_initial M J 3000 M K 9
bo_initcopy: D J I I K -1 N K Z J bo_initcopy O S P
canvas_step: W 2606 Z O S P
canvas_key: ifge A 49 ifle A 51 S A 49 W 2700 A O S P end end ife A 98 R E 2701 I E 1 ifge E 4 M E Z end W 2701 E end R I 2700 P I 3 A I 3000 ife A 83 R E I ifg E Z I E -1 W I E end end ife A 84 R E I ifl E 53 I E 1 W I E end end I I 1 ife A 89 R E I ifg E Z I E -1 W I E end end ife A 90 R E I ifl E 35 I E 1 W I E end end I I 1 ife A 43 R E I ifl E 12 I E 1 W I E end end ife A 45 R E I ifg E 2 I E -1 W I E end end O S P
canvas_draw: C S vp_clear C S vp_hint W 2710 Z W 2711 Z W 2720 Z W 2721 Z W 2722 -9517 W 2702 Z
bo_cell: W 2712 Z W 2713 Z W 2714 Z
 R E 2710 R F 3000 S E F P E E R G 2711 R F 3001 S G F P G G A E G R H 3002 P H H ifle E H W 2712 1 end
 R E 2710 R F 3003 S E F F E A R G 2711 R F 3004 S G F F G A R H 3005 ifle E H ifle G H W 2713 1 end end
 R E 2710 R F 3006 S E F R G 2711 R F 3007 S G F ifge E Z ifge G Z A E G R H 3008 P H 2 ifle E H W 2714 1 end end end
 R E 2712 R F 2713 R G 2714 M H E A H F A H G W 2715 H M J Z R L 2701 ife L Z ifg H Z M J 1 end end ife L 1 ife H 3 M J 1 end end ife L 2 M A H M B 2 C S vc_div ifn C Z M J 1 end end ife L 3 ifn E Z ife F Z ife G Z M J 1 end end end end M E Z ifg H Z M E -1 end ifn J Z M E 1 R F 2702 I F 1 W 2702 F end P E 13 R F 2720 P F 27 A F E W 2720 F R E 2721 I E 1 W 2721 E ife E 3 R I 2722 W I F A I 18 W I F A I 18 W I F R I 2722 I I 1 W 2722 I W 2720 Z W 2721 Z end R E 2710 I E 1 W 2710 E ifl E 54 J bo_cell end W 2710 Z R E 2722 A E 36 W 2722 E R E 2711 I E 1 W 2711 E ifl E 36 J bo_cell end M A Z M B 145 M C @bo_union R E 2701 ife E 1 M C @bo_intersection end ife E 2 M C @bo_xor end ife E 3 M C @bo_minus end M D 1 C S vc_text M A 144 M B 145 R C 2700 I C 1 J vp_digit
bo_initial: 20 18 10 29 18 8 18 9 10
${text('vp_controls','1..3 SHAPE ARROWS +/- B OP')}${text('bo_union','UNION / SELECTED:')}${text('bo_intersection','INTERSECTION / SELECTED:')}${text('bo_xor','ODD COVER / SELECTED:')}${text('bo_minus','CIRCLE MINUS REST / SEL:')}${help(['BOOLEAN STENCIL STUDIO','1 circle 2 square 3 wedge','ARROWS move +/- size 2..12','B cycles four operations.','Gold result; dim removed.','Union any; intersect all.','Odd cover: three-way XOR.','Minus: circle without 2/3.','Native 54x36 sample grid.','TAB colors H back R reset.','F1 returns to programs.'])}${common}`;
const ribbon=`
canvas_init: W 2702 Z
fo_reset: W 2700 3 W 2701 Z W 2703 Z W 2704 Z M I 3000 M E 72 K I E M L Z
fo_initial: M I L P I 8 A I 3000 M E L I E 1 W I E M I L A I 3064 W I 1 I L 1 ifl L 8 J fo_initial end O S P
canvas_step: W 2606 Z O S P
canvas_key: ife A 83 R E 2700 ifg E Z I E -1 W 2700 E end end ife A 84 R E 2700 ifl E 6 I E 1 W 2700 E end end ife A 116 R E 2702 M F 1 S F E W 2702 F J fo_reset end ife A 117 R E 2703 ifn E Z M I 3200 M J 3000 M K 72 C S fo_copy W 2703 Z J fo_check end end ife A 88 W 2701 Z J fo_fold end ife A 98 W 2701 1 J fo_fold end O S P
fo_copy: D J I I K -1 N K Z J fo_copy O S P
fo_fold: W 2710 Z
fo_bound: R E 2710 R F 2700 R G 2701 ife G Z ifg E F J fo_bound_next end else ifle E F J fo_bound_next end end M I E A I 3064 R H I ife H Z J fo_bound_next end P F 2 I F 1 S F E ifl F Z W 2704 2 O S P end ifg F 7 W 2704 2 O S P end
fo_bound_next: R E 2710 I E 1 W 2710 E ifl E 8 J fo_bound end M I 3000 M J 3200 M K 72 C S fo_copy W 2703 1 W 2710 Z
fo_move: R E 2710 R F 2700 R G 2701 ife G Z ifg E F J fo_move_next end else ifle E F J fo_move_next end end M I E A I 3064 R H I ife H Z J fo_move_next end P F 2 I F 1 S F E W 2711 F W 2712 H M I F A I 3064 R G I W 2713 G M L H I L -1
fo_stack: R I 2710 P I 8 A I L A I 3000 R E I P E -1 R J 2711 P J 8 R G 2713 A J G A J 3000 W J E I G 1 W 2713 G I L -1 ifge L Z J fo_stack end R I 2711 A I 3064 R E 2713 W I E R I 2710 A I 3064 W I Z R I 2710 P I 8 A I 3000 M E 8 K I E
fo_move_next: R E 2710 I E 1 W 2710 E ifl E 8 J fo_move end J fo_check
fo_check: W 2704 Z R E 2702 M I 3071 ifn E Z M I 3064 end R E I ifn E 8 O S P end R E 2702 M I 3056 M J @fo_goal_left ifn E Z M I 3000 M J @fo_goal_right end M K 8
fo_goal_check: R E I R F J ifn E F O S P end I I 1 I J 1 I K -1 N K Z J fo_goal_check W 2704 1 O S P
canvas_draw: C S vp_clear C S vp_hint W 2710 Z
fo_column: W 2711 Z R I 2710 A I 3064 R E I W 2712 E
fo_layer: R E 2711 R F 2712 ifge E F J fo_column_next end R I 2710 P I 8 A I E A I 3000 R G I W 2713 G R A 2710 P A 19 A A 7 M B 133 P E 10 S B E W 2714 A W 2715 B M C A A C 14 M D B M E 1 ifl G Z M E -1 end C S vc_line R A 2714 R B 2715 S B 6 R C 2713 F C A C S vp_digit R E 2711 I E 1 W 2711 E J fo_layer
fo_column_next: R E 2710 I E 1 W 2710 E ifl E 8 J fo_column end R A 2700 P A 19 A A 24 M B 38 M C A M D 135 M E -1 C S vc_line M A Z M B 145 M C @fo_work R E 2704 ife E 1 M C @fo_win end ife E 2 M C @fo_error end M D 1 C S vc_text M A Z M B 26 M C @fo_left R E 2702 ifn E Z M C @fo_right end M D 1 J vc_text
${text('vp_controls','ARROWS CREASE ENTER/B U T')}${text('fo_work','FOLD TO THE TARGET STACK')}${text('fo_win','FOLDED STACK MATCHES!')}${text('fo_error','FOLD WOULD LEAVE THE STRIP')}${text('fo_left','GOAL8 8+1-4+5-6+3-2+7-')}${text('fo_right','GOAL1 1+8-5+4-3+6-7+2-')}
${help(['FOLDED RIBBON','Eight numbered panels.','ARROWS select a crease.','ENTER folds left to right.','B folds right onto left.','A folded stack reverses','order and flips every face.','Gold line: +; dim line: -.','Target lists bottom to top.','U undoes the last fold.','T chooses mirrored target.','Off-strip folds rejected.','TAB colors H returns.','R reset F1 programs.'])}${common}`;
const triangulation=`
canvas_init: W 2702 Z
tr_reset: W 2700 Z W 2701 -1 W 2703 Z W 2704 Z W 2705 Z W 2706 Z M I 3100 M E 64 K I E M I @tr_points R E 2702 P E 16 A I E M J 3000 M K 16
tr_copy: D J I I K -1 N K Z J tr_copy O S P
canvas_step: W 2606 Z O S P
canvas_key: ifge A 49 ifle A 56 S A 49 W 2700 A O S P end end ife A 83 R E 2700 I E -1 ifl E Z M E 7 end W 2700 E end ife A 84 R E 2700 I E 1 ifg E 7 M E Z end W 2700 E end ife A 98 R E 2702 M F 1 S F E W 2702 F J tr_reset end ife A 88 R E 2701 ifl E Z R E 2700 W 2701 E O S P end W 2710 E R F 2700 W 2711 F W 2701 -1 M I E P I 8 A I F A I 3100 R G I ifn G Z W I Z M I F P I 8 A I E A I 3100 W I Z R E 2704 I E -1 W 2704 E W 2703 Z J tr_count end C S tr_legal ife A Z W 2703 1 O S P end R E 2710 R F 2711 M I E P I 8 A I F A I 3100 W I 1 M I F P I 8 A I E A I 3100 W I 1 R E 2704 I E 1 W 2704 E W 2703 Z J tr_count end O S P
tr_connected: ife E F M A Z O S P end M G E S G F F G A ife G 1 M A 1 O S P end ife G 7 M A 1 O S P end M I E P I 8 A I F A I 3100 R A I O S P
tr_legal: R E 2710 R F 2711 C S tr_connected ifn A Z M A Z O S P end R E 2710 R F 2711 ife E F M A Z O S P end M I E P I 2 A I 3000 R G I W 2820 G M G I/1 W 2821 G M I F P I 2 A I 3000 R G I W 2822 G M G I/1 W 2823 G W 2712 Z W 2713 Z
tr_edge_check: R E 2712 R F 2713 ifle F E J tr_edge_next end R G 2710 R H 2711 ife E G J tr_edge_next end ife E H J tr_edge_next end ife F G J tr_edge_next end ife F H J tr_edge_next end C S tr_connected ife A Z J tr_edge_next end R I 2712 P I 2 A I 3000 R E I W 2824 E M E I/1 W 2825 E R I 2713 P I 2 A I 3000 R E I W 2826 E M E I/1 W 2827 E C S vp_intersect ifn A Z M A Z O S P end
tr_edge_next: R E 2713 I E 1 W 2713 E ifl E 8 J tr_edge_check end W 2713 Z R E 2712 I E 1 W 2712 E ifl E 8 J tr_edge_check end
 R E 2820 R F 2822 A E F W 2824 E R E 2821 R F 2823 A E F W 2825 E W 2712 Z W 2714 Z
tr_inside: R I 2712 P I 2 A I 3000 R E I P E 2 W 2820 E M E I/1 P E 2 W 2821 E R I 2712 I I 1 ifge I 8 M I Z end P I 2 A I 3000 R E I P E 2 W 2822 E M E I/1 P E 2 W 2823 E ${turn(2820,2822,2824,2834)} R E 2821 R F 2823 R G 2825 R H 2834 ifle E G ifg F G ifg H Z R E 2714 I E 1 W 2714 E end end else ifle F G ifl H Z R E 2714 I E -1 W 2714 E end end end R E 2712 I E 1 W 2712 E ifl E 8 J tr_inside end R A 2714 ifn A Z M A 1 end O S P
tr_count: W 2705 Z W 2706 999 W 2720 Z W 2721 1 W 2722 2
tr_triplet: R E 2720 R F 2721 C S tr_connected ife A Z J tr_count_next end R E 2721 R F 2722 C S tr_connected ife A Z J tr_count_next end R E 2720 R F 2722 C S tr_connected ife A Z J tr_count_next end R I 2720 P I 2 A I 3000 R E I W 2820 E M E I/1 W 2821 E R I 2721 P I 2 A I 3000 R E I W 2822 E M E I/1 W 2823 E R I 2722 P I 2 A I 3000 R E I W 2824 E M E I/1 W 2825 E ${turn(2820,2822,2824,2834)} R E 2834 F E A ife E Z J tr_count_next end R F 2706 ifl E F W 2706 E end R E 2705 I E 1 W 2705 E
tr_count_next: R E 2722 I E 1 W 2722 E ifl E 8 J tr_triplet end R E 2721 I E 1 W 2721 E I E 1 W 2722 E ifl E 8 J tr_triplet end R E 2720 I E 1 W 2720 E I E 1 W 2721 E I E 1 W 2722 E ifl E 8 J tr_triplet end R E 2705 ife E Z W 2706 Z end O S P
canvas_draw: C S vp_clear C S vp_hint W 2720 Z W 2721 Z
tr_draw_edges: R E 2720 R F 2721 ifle F E J tr_draw_next end C S tr_connected ife A Z J tr_draw_next end R I 2720 P I 2 A I 3000 R A I M B I/1 R I 2721 P I 2 A I 3000 R C I M D I/1 P A 9 A A 22 P B 8 A B 32 P C 9 A C 22 P D 8 A D 32 M E 1 C S vc_line
tr_draw_next: R E 2721 I E 1 W 2721 E ifl E 8 J tr_draw_edges end W 2721 Z R E 2720 I E 1 W 2720 E ifl E 8 J tr_draw_edges end W 2720 Z
tr_draw_node: R I 2720 P I 2 A I 3000 R A I M B I/1 P A 9 A A 20 P B 8 A B 25 R C 2720 I C 1 C S vp_digit R E 2720 R F 2700 ife E F R I 2720 P I 2 A I 3000 R A I M B I/1 P A 9 A A 21 P B 8 A B 31 M C -1 C S vp_dot end R E 2720 I E 1 W 2720 E ifl E 8 J tr_draw_node end M A Z M B 145 M C @tr_work R E 2704 ife E 5 M C @tr_win end R E 2703 ifn E Z M C @tr_bad end M D 1 C S vc_text M A 144 M B 145 R C 2705 C S vp_digit M A Z M B 136 M C @tr_score M D -1 C S vc_text R A 2706 M B 100 C S vc_div A A 48 W 2800 A M A C M B 10 C S vc_div A A 48 W 2801 A A C 48 W 2802 C W 2803 Z M A 42 M B 136 M C 2800 M D 1 C S vc_text M A 114 M B 136 R C 2701 ifl C Z M C -3 else I C 1 end J vp_digit
tr_points: 0 0 12 0 12 4 8 4 8 8 12 8 12 12 0 12 3 0 9 0 12 3 12 9 9 12 3 12 0 9 0 3
${text('vp_controls','1..8 POINT ENTER PAIR B MAP')}${text('tr_work','ADD LEGAL DIAGONALS / T:')}${text('tr_win','TRIANGULATED! TRIANGLES:')}${text('tr_bad','EXTERIOR/CROSSING CHORD')}${text('tr_score','MIN 2A:    ANCHOR:')}${help(['TRIANGULATION ATELIER','1..8 selects a vertex.','ENTER marks each endpoint.','Repeat a diagonal to erase.','No crossing/exterior chord.','B: concave / convex shape.','Five diagonals win.','Any valid six triangles.','MIN 2A: twice least area.','TAB colors H back R reset.','F1 returns to programs.'])}${segment}${common}`;

const shadowTargets=[[0,1,3,9,12,21],[0,2,4,6,8,13,22]];
const shadowPlanes=(voxels:number[])=>{const out=Array(27).fill(0);for(const p of voxels){const z=Math.floor(p/9),y=Math.floor(p%9/3),x=p%3;out[y*3+x]=out[9+z*3+x]=out[18+z*3+y]=1;}return out;};
export const PLANAR_UNTANGLER=app(475,'planar-untangle','jun','Planar Untangler','Move six labeled vertices on an 18 by 12 integer grid until nonincident edges neither cross nor touch. Shared endpoints are allowed. Keys 1..6 select a vertex; arrows move it by one grid unit. Any uncrossed arrangement wins. Exact orientation signs and bounding boxes decide contact; native line pixels show the arrangement. N leaves the puzzle unchanged. H explains, Tab changes palette and R restores the scramble.',untangle);
export const SHADOW_BLOCKS=app(476,'shadow-blocks','miniature','Shadow Blocks','Toggle a 3 by 3 by 3 voxel sculpture until its XY, XZ and YZ silhouettes match three targets. Each right-hand panel places the target left of your current projection; gold means occupied. Arrows select XY, Z cycles layer, Enter toggles the selected voxel, and B chooses a second target. Every matching sculpture is accepted, even if hidden internal voxels differ. Isometric wire cubes show the sculpture; H explains and R clears it.',shadows+`\nsh_goal: ${shadowTargets.flatMap(shadowPlanes).join(' ')}\n`);
export const INVERSION_LENS=app(477,'inversion-lens','lenses','Inversion Lens','Explore circle inversion of lattice, ray and ring motifs. Dim source points and gold mapped points share a six-pixel coordinate unit. Arrows move the center within -4..4, +/- selects radius 1..9, B cycles motifs. Each native coordinate is center plus trunc(6*r*r*displacement/squared-distance), with truncation toward zero only at the final division. Coincident points are counted and omitted; off-screen mapped dots are clipped. Intermediate numerators stay within 6318. This is an explicitly quantized map, not a continuous optical simulation.',inversion);
export const BOOLEAN_STENCIL=app(478,'boolean-stencil','stamps','Boolean Stencil Studio','Compose a circle, square and right-triangle wedge on a 54 by 36 sample grid. Keys 1..3 choose the shape; arrows move its center or wedge corner; +/- changes radius, half-width or wedge-leg half-length from 2 to 12. B cycles union, all-three intersection, odd-coverage XOR and circle-minus-the-other-two. Gold is the result, dim ink marks removed operand regions. Each exact integer membership predicate runs inside the native machine; H explains and R restores the composition.',boolean);
export const FOLDED_RIBBON=app(479,'folded-ribbon','paper','Folded Ribbon','Fold eight numbered paper panels into the displayed target stack. Arrows choose a crease; Enter folds everything left of it onto the right, B folds right onto left. Every moved stack reverses order and flips each signed face before landing above the stationary stack. Gold baselines mark positive faces, dim baselines negative. The target lists bottom to top; a fold extending outside the eight positions is rejected atomically. U undoes one fold, T chooses a mirrored target, R resets. This models a one-dimensional paper strip with explicit layer order.',ribbon+`\nfo_goal_left: 8 -1 4 -5 6 -3 2 -7\nfo_goal_right: 1 -8 5 -4 3 -6 7 -2\n`);
export const TRIANGULATION_ATELIER=app(480,'triangulation','pottery','Triangulation Atelier','Triangulate a concave or convex eight-vertex polygon by adding five legal diagonals. Choose a vertex with 1..8 and Enter, then choose another and Enter; repeating an existing diagonal removes it. Chords crossing or touching nonincident edges, passing through other vertices or lying outside the polygon are rejected. Native orientation tests and midpoint winding determine legality. Every complete triangulation has six triangles; any valid arrangement wins. MIN 2A reports twice the smallest triangle area. B switches polygon, H explains and R resets.',triangulation);
export const VISUAL_PUZZLES=[PLANAR_UNTANGLER,SHADOW_BLOCKS,INVERSION_LENS,BOOLEAN_STENCIL,FOLDED_RIBBON,TRIANGULATION_ATELIER];
