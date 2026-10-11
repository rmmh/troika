import type {TextSoftware} from './native';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const label=(id:string,s:string)=>`${id}: ${text(s)}\n`;
const help=(lines:string[])=>`canvas_help: ${lines.map((_,i)=>`M A Z M B ${19+i*8} M C @kg_help${i} M D 1 C S vc_text`).join(' ')} O S P\n${lines.map((s,i)=>label(`kg_help${i}`,s)).join('')}`;
const app=(number:number,id:string,site:string,title:string,description:string,algorithm:string):TextSoftware=>({number,id,site,title,kind:'text',bitmapVram:true,uiModule:'visualCanvasUi',launchHelp:'Native bitmap controls: G runs, Space pauses, N steps, H opens help, Tab changes palette, R resets, F1 returns to programs. App-specific controls stay on screen.',inputs:['Native keyboard'],outputs:['Animated bitmap'],description,algorithm,examples:[{input:'',output:''}]});
const common=`
kg_zero: M I 2700 M E 200 K I E M I 3000 M E 1600 K I E O S P
kg_status: M I -9679 M E 162 K I E M I -7249 M E 108 K I E O S P
; Cursor state2700/2701, arrow range8..153,26..130.
kg_cursor: ife A 83 R E 2700 S E 8 ifl E 8 M E 8 end W 2700 E end ife A 84 R E 2700 A E 8 ifg E 153 M E 153 end W 2700 E end ife A 89 R E 2701 S E 8 ifl E 26 M E 26 end W 2701 E end ife A 90 R E 2701 A E 8 ifg E 130 M E 130 end W 2701 E end O S P
kg_cross: R A 2700 S A 3 R B 2701 R C 2700 A C 3 M D B M E 1 C S vc_line R A 2700 R B 2701 S B 3 M C A R D 2701 A D 3 M E 1 J vc_line
; Signed number A to ASCII at2880. Up to4digits, preservesK/L.
kg_number: M I 2880 ifl A Z W I 45 I I 1 P A -1 end M G A M H 1000 M J Z
kg_digit: M A G M B H C S vc_div M G C ifn A Z M J 1 end ife H 1 M J 1 end ifn J Z A A 48 W I A I I 1 end M A H M B 10 C S vc_div M H A ifg H Z J kg_digit end W I Z O S P
`;
const fireworks=`
canvas_init: C S kg_zero W 2700 81 W 2701 58 O S P
canvas_key: W 2720 A C S kg_cursor R A 2720 ifge A 49 ifle A 51 S A 49 W 2706 A end end ife A 88 R E 2702 ife E Z R E 2700 W 2710 E R E 2701 W 2711 E W 2702 12 W 2703 324 W 2704 552 R A 2700 P A 4 S A 324 M B 12 C S vc_trunc W 2707 A R A 2701 P A 4 S A 552 M B 12 C S vc_trunc W 2708 A end end O S P
canvas_step: R E 2702 ifg E Z I E -1 W 2702 E R F 2703 R G 2707 A F G W 2703 F R F 2704 R G 2708 A F G W 2704 F ife E Z C S fw_burst end end M L Z
fw_update: M I L P I 7 A I 3000 M E I/4 ifg E Z I E -1 M I/4 E R F I M I/5 F M G I/1 M I/6 G M H I/2 A F H M H I/3 A G H I H 1 M I/3 H W I F M I/1 G ifl F 4 M I/4 Z end ifg F 640 M I/4 Z end ifl G 76 M I/4 Z end ifg G 568 M I/4 Z end end I L 1 ifl L 32 J fw_update end O S P
fw_burst: R E 2705 M L E P L 16 M F 1 S F E W 2705 F W 2721 L A L 16 W 2722 L R L 2721 M K Z
fw_emit: M I L P I 7 A I 3000 R E 2710 P E 4 W I E M I/5 E R E 2711 P E 4 M I/1 E M I/6 E M J @fw_vx A J K R E J R F 2706 I F 1 P E F M I/2 E M J @fw_vy A J K R E J P E F S E 7 M I/3 E M I/4 28 I K 1 I L 1 R E 2722 ifl L E J fw_emit end R E 2709 ifl E 999 I E 1 W 2709 E end O S P
canvas_draw: C S vc_clear C S kg_status M L Z
fw_stars: M A L P A 23 A A 11 M B 161 C S vc_div M A C W 2730 A M A L P A 17 M B 43 C S vc_div M B C A B 23 R A 2730 M C -1 C S vc_pixel I L 1 ifl L 13 J fw_stars end M L Z
fw_paint: M I L P I 7 A I 3000 M E I/4 ifg E Z W 2731 E R A I M B 4 C S vc_div W 2732 A M I L P I 7 A I 3000 M A I/1 M B 4 C S vc_div W 2733 A M I L P I 7 A I 3000 M A I/5 M B 4 C S vc_div W 2734 A M I L P I 7 A I 3000 M A I/6 M B 4 C S vc_div M B A R A 2734 R C 2732 R D 2733 M E -1 R F 2731 ifg F 14 M E 1 end C S vc_line end I L 1 ifl L 32 J fw_paint end R E 2702 ifg E Z R A 2703 M B 4 C S vc_div W 2732 A R A 2704 M B 4 C S vc_div M B A R A 2732 M C A M D B A D 6 M E 1 C S vc_line end C S kg_cross M A Z M B 10 M C @fw_keys M D -1 C S vc_text M A Z M B 145 M C @fw_hint M D 1 C S vc_text O S P
fw_vx: 8 7 6 3 0 -3 -6 -7 -8 -7 -6 -3 0 3 6 7
fw_vy: 0 3 6 7 8 7 6 3 0 -3 -6 -7 -8 -7 -6 -3
${label('fw_keys','ARROWS AIM ENTER LAUNCH')}${label('fw_hint','1/2/3 BURST SIZE TAB COLOR')}
${help(['FIREWORK GARDEN','ARROWS MOVE THE GOLD AIM.','ENTER LAUNCHES ONE ROCKET.','ITS FUSE LASTS 12 TICKS.','1/2/3: SMALL/MEDIUM/LARGE.','TWO BURSTS CAN OVERLAP.','GRAVITY BENDS FADING TAILS.','G RUNS; SPACE PAUSES.','N ADVANCES A SINGLE TICK.','TAB CHANGES ALL COLORS.','R CLEARS THE NIGHT SKY.'])}
${common}`;
export const FIREWORK_GARDEN=app(451,'firework-garden','lantern','Firework Garden','Aim with arrows and press Enter to launch a native rocket. Its twelve-tick fuse opens a sixteen-spark burst; 1/2/3 choose spread. Two bursts overlap, with gravity and fading tails. G runs, Space pauses, N steps, Tab changes palette, H helps and R resets. This is a discrete arcade particle toy.',fireworks);
const flock=`
canvas_init: C S kg_zero W 2700 81 W 2701 76 W 2702 1 W 2703 1 W 2704 1 W 2705 1 W 2707 324 W 2708 304 M L Z
fa_init: M I L P I 4 A I 3000 M E L P E 43 A E 56 W I E M E L P E 29 A E 112 M I/1 E M E 3 M I/2 E M E -2 M I/3 E I L 1 ifl L 12 J fa_init end O S P
canvas_key: W 2720 A C S kg_cursor R A 2720 ife A 99 M I 2702 C S fa_toggle end ife A 97 M I 2703 C S fa_toggle end ife A 115 M I 2704 C S fa_toggle end ife A 88 W 2705 1 R E 2700 P E 4 W 2707 E R E 2701 P E 4 W 2708 E end ife A 108 M I 2705 C S fa_toggle end ife A 112 M I 2706 C S fa_toggle R E 2700 P E 4 W 2709 E R E 2701 P E 4 W 2710 E end O S P
fa_toggle: R E I M F 1 S F E W I F O S P
canvas_step: M L Z
fa_bird: M I L P I 4 A I 3000 R E I W 2721 E M E I/1 W 2722 E M E I/2 W 2723 E M E I/3 W 2724 E W 2725 Z W 2726 Z W 2727 Z W 2728 Z W 2729 Z W 2730 Z W 2731 Z M K Z
fa_neighbor: ifn K L M I K P I 4 A I 3000 R E I R F 2721 S E F W 2732 E M F I/1 R G 2722 S F G W 2733 F F E A F F A A E F ifl E 160 R F 2725 I F 1 W 2725 F R F 2726 R G 2732 A F G W 2726 F R F 2727 R G 2733 A F G W 2727 F R F 2728 M G I/2 A F G W 2728 F R F 2729 M G I/3 A F G W 2729 F ifl E 32 R E 2732 C S fa_sign R F 2730 S F E W 2730 F R E 2733 C S fa_sign R F 2731 S F E W 2731 F end end end I K 1 ifl K 12 J fa_neighbor end
 R E 2702 ifn E Z R E 2726 C S fa_sign R F 2723 A F E W 2723 F R E 2727 C S fa_sign R F 2724 A F E W 2724 F end R E 2703 ifn E Z R B 2725 ifg B Z R A 2728 C S vc_trunc R E 2723 S A E M E A C S fa_sign R F 2723 A F E W 2723 F R A 2729 R B 2725 C S vc_trunc R E 2724 S A E M E A C S fa_sign R F 2724 A F E W 2724 F end end R E 2704 ifn E Z R E 2730 P E 2 R F 2723 A F E W 2723 F R E 2731 P E 2 R F 2724 A F E W 2724 F end
 R E 2705 ifn E Z R E 2707 R F 2721 S E F C S fa_sign R F 2723 A F E W 2723 F R E 2708 R F 2722 S E F C S fa_sign R F 2724 A F E W 2724 F end R E 2706 ifn E Z R E 2721 R F 2709 S E F W 2732 E R E 2722 R F 2710 S E F W 2733 E F E A R F 2732 F F A A E F ifl E 200 R E 2732 C S fa_sign P E 3 R F 2723 A F E W 2723 F R E 2733 C S fa_sign P E 3 R F 2724 A F E W 2724 F end end
 R E 2723 C S fa_clamp W 2723 E R E 2724 C S fa_clamp W 2724 E R F 2723 ife E Z ife F Z W 2723 1 end end R E 2721 R F 2723 A E F ifl E 24 M E 24 F F A end ifg E 620 M E 620 F F A P F -1 end W 2721 E W 2723 F R E 2722 R F 2724 A E F ifl E 96 M E 96 F F A end ifg E 552 M E 552 F F A P F -1 end W 2722 E W 2724 F M I L P I 4 A I 3100 R E 2721 W I E R E 2722 M I/1 E R E 2723 M I/2 E R E 2724 M I/3 E I L 1 ifl L 12 J fa_bird end M L Z
fa_commit: M I L A I 3100 R E I M I L A I 3000 W I E I L 1 ifl L 48 J fa_commit end O S P
fa_sign: ifg E Z M E 1 else ifl E Z M E -1 end end O S P
fa_clamp: ifg E 12 M E 12 end ifl E -12 M E -12 end O S P
canvas_draw: C S vc_clear C S kg_status M L Z
fa_paint: M I L P I 4 A I 3000 R A I M B 4 C S vc_div W 2740 A M I L P I 4 A I 3000 M A I/1 M B 4 C S vc_div W 2741 A M I L P I 4 A I 3000 M E I/2 C S fa_sign W 2742 E M E I/3 C S fa_sign W 2743 E R A 2740 R B 2741 M C A R E 2742 P E 3 S C E R E 2743 P E 2 A C E M D B R E 2743 P E 3 S D E R E 2742 P E 2 S D E M E 1 C S vc_line R A 2740 R B 2741 M C A R E 2742 P E 3 S C E R E 2743 P E 2 S C E M D B R E 2743 P E 3 S D E R E 2742 P E 2 A D E M E -1 C S vc_line I L 1 ifl L 12 J fa_paint end C S kg_cross R E 2705 ifn E Z R A 2707 M B 4 C S vc_div W 2740 A R A 2708 M B 4 C S vc_div M B A R A 2740 M C -1 C S vc_pixel end R E 2706 ifn E Z R A 2709 M B 4 C S vc_div W 2740 A R A 2710 M B 4 C S vc_div M B A R A 2740 M C A A C 4 M D B A D 4 M E 1 C S vc_line end M A Z M B 10 M C @fa_keys M D -1 C S vc_text M A Z M B 145 M C @fa_hint M D 1 C S vc_text M L Z
fa_flags: M I 2702 A I L R E I M F 45 ifn E Z M F 43 end W 2800 F W 2801 Z M A L P A 30 A A 6 M B 145 M C 2800 M D 1 C S vc_text I L 1 ifl L 5 J fa_flags end O S P
${label('fa_keys','ARROWS AIM ENTER LURE P FOE')}${label('fa_hint','C    A    S    L    P')}
${help(['FLOCKING AVIARY','12 NATIVE BIRDS, ONE TICK.','ARROWS AIM; ENTER SETS LURE','L TOGGLES LURE; P PLACES OR','REMOVES THE PREDATOR.','C/A/S TOGGLE COHESION,','ALIGNMENT AND SEPARATION.','NEIGHBORS WITHIN 40 PIXELS','CLOSE BIRDS PUSH APART.','WALL BOUNCE; LIMITED SPEED.','G RUN N STEP SPACE PAUSE.','TAB COLORS R RESET F1 EXIT'])}
${common}`;
export const FLOCKING_AVIARY=app(452,'flocking-aviary','roofbirds','Flocking Aviary','Steer twelve native birds with a movable lure and predator. Arrows aim; Enter places the lure, L toggles it, P places or removes the predator. C/A/S independently toggle cohesion, alignment and separation. Each bounded tick reads the old flock before publishing all new positions. Manhattan neighborhoods, integer accelerations, speed caps and bouncing walls make this a deliberately discrete flock model. G runs, N steps, Space pauses, Tab changes colors, H helps.',flock);
const curling=`
canvas_init: C S kg_zero W 2701 8 W 2704 8 O S P
canvas_key: R E 2706 ifn E Z O S P end ife A 83 R E 2700 ifg E -4 I E -1 W 2700 E end end ife A 84 R E 2700 ifl E 4 I E 1 W 2700 E end end ife A 89 R E 2701 ifl E 12 I E 1 W 2701 E end end ife A 90 R E 2701 ifg E 5 I E -1 W 2701 E end end ife A 98 R E 2703 ifn E Z R E 2704 ifg E Z I E -1 W 2704 E W 2705 3 end end end ife A 88 R E 2703 ife E Z R L 2702 ifl L 6 M I L P I 4 A I 3000 W I 324 M I/1 544 R E 2700 P E 2 M I/2 E R E 2701 P E -4 M I/3 E I L 1 W 2702 L W 2703 1 end end end O S P
canvas_step: R E 2703 ife E Z O S P end M L Z
ic_move: M I L P I 4 A I 3000 R E I M F I/2 A E F ifl E 16 M E 16 F F A Q F 2 end ifg E 628 M E 628 F F A Q F -2 end W I E M I/2 F M E I/1 M F I/3 A E F ifl E 88 M E 88 F F A Q F 2 end ifg E 552 M E 552 F F A Q F -2 end M I/1 E M I/3 F I L 1 R E 2702 ifl L E J ic_move end M L Z
ic_pair: M K L I K 1
ic_other: R E 2702 ifge K E J ic_pair_next end M I L P I 4 A I 3000 M J K P J 4 A J 3000 R E I R F J S E F W 2720 E F E A ifg E 30 J ic_skip end M E I/1 M F J/1 S E F W 2721 E F E A ifg E 30 J ic_skip end R E 2720 P E E R F 2721 P F F A E F ifge E 900 J ic_skip end M E I/2 M F J/2 S E F R G 2720 P E G M F I/3 M G J/3 S F G R G 2721 P F G A E F ifge E Z J ic_skip end M E I/2 M F J/2 M I/2 F M J/2 E M E I/3 M F J/3 M I/3 F M J/3 E
ic_skip: I K 1 J ic_other
ic_pair_next: I L 1 R E 2702 ifl L E J ic_pair end W 2703 Z M L Z
ic_friction: M I L P I 4 A I 3000 M E I/2 R G 2705 ife G Z C S ic_slow end M I/2 E ifn E Z W 2703 1 end M E I/3 ife G Z C S ic_slow end M I/3 E ifn E Z W 2703 1 end I L 1 R E 2702 ifl L E J ic_friction end R E 2705 ifg E Z I E -1 W 2705 E end R E 2703 ife E Z C S ic_score R E 2702 ife E 6 W 2706 -1 R E 2707 ifge E 12 W 2706 1 end W 2606 Z end end O S P
ic_slow: ifg E Z I E -1 else ifl E Z I E 1 end end O S P
ic_score: W 2707 Z M L Z
ic_count: M I L P I 4 A I 3000 R A I S A 324 F A A M B 4 C S vc_div ifg A 38 J ic_next end P A A W 2720 A M I L P I 4 A I 3000 M A I/1 S A 248 F A A M B 4 C S vc_div ifg A 38 J ic_next end P A A R E 2720 A A E M F Z ifle A 1444 M F 1 end ifle A 576 M F 2 end ifle A 100 M F 3 end R E 2707 A E F W 2707 E
ic_next: I L 1 R E 2702 ifl L E J ic_count end O S P
canvas_draw: C S vc_clear C S kg_status M L Z
ic_rings: M I @ic_radius A I L R K I W 2740 Z
ic_ring_point: R E 2740 M I @ic_circle_x A I E R A I P A K M B 10 C S vc_trunc A A 81 W 2741 A R E 2740 M I @ic_circle_y A I E R A I P A K M B 10 C S vc_trunc A A 62 W 2746 A R E 2740 I E 1 M I @ic_circle_x A I E R A I P A K M B 10 C S vc_trunc A A 81 W 2747 A R E 2740 I E 1 M I @ic_circle_y A I E R A I P A K M B 10 C S vc_trunc A A 62 M D A R A 2741 R B 2746 R C 2747 M E -1 ife L Z M E 1 end C S vc_line R E 2740 I E 1 W 2740 E ifl E 16 J ic_ring_point end I L 1 ifl L 3 J ic_rings end M L Z
ic_stones: R E 2702 ifge L E J ic_labels end M I L P I 4 A I 3000 R A I M B 4 C S vc_div W 2741 A M I L P I 4 A I 3000 M A I/1 M B 4 C S vc_div W 2742 A M K -2
ic_stone_row: R A 2741 S A 2 R B 2742 A B K M C A A C 4 M D B M E 1 C S vc_line I K 1 ifle K 2 J ic_stone_row end I L 1 J ic_stones
ic_labels: M A Z M B 10 M C @ic_keys M D -1 C S vc_text M A Z M B 145 M C @ic_hint M D 1 R E 2706 ife E 1 M C @ic_win end ife E -1 M C @ic_loss end C S vc_text R A 2700 C S kg_number M A 2 M B 127 M C 2880 M D 1 C S vc_text R A 2701 C S kg_number M A 36 M B 127 M C 2880 M D 1 C S vc_text R A 2707 C S kg_number M A 120 M B 127 M C 2880 M D 1 C S vc_text M A Z M B 136 M C @ic_shot M D -1 C S vc_text R A 2702 C S kg_number M A 30 M B 136 M C 2880 M D 1 C S vc_text M A 90 M B 136 M C @ic_sweep M D -1 C S vc_text R A 2704 C S kg_number M A 138 M B 136 M C 2880 M D 1 C S vc_text O S P
ic_radius: 10 24 38
ic_circle_x: 10 9 7 4 0 -4 -7 -9 -10 -9 -7 -4 0 4 7 9 10
ic_circle_y: 0 4 7 9 10 9 7 4 0 -4 -7 -9 -10 -9 -7 -4 0
${label('ic_shot','SHOT')}${label('ic_sweep','SWEEPS')}${label('ic_keys','ARROWS AIM/POWER ENTER SHOT')}${label('ic_hint','AIM POWER          SCORE')}${label('ic_win','HOUSE MASTER! R PLAY AGAIN')}${label('ic_loss','END COMPLETE - AIM FOR 12')}
${help(['ICE CURLING: SIX STONES','LEFT/RIGHT AIM -4 TO +4.','UP/DOWN POWER 5 TO 12.','ENTER THROWS WHEN AT REST.','B:3-TICK SWEEP; EIGHT USES.','STONES TRANSFER VELOCITY ON','CONTACT; WALLS LOSE SPEED.','SCORE 3/2/1 IN HOUSE RINGS.','12 POINTS WINS AFTER SIX.','SCORES UPDATE AT REST.','DISCRETE ARCADE FRICTION.','G RUN N STEP SPACE PAUSE.'])}
${common}`;
export const ICE_CURLING=app(453,'ice-curling','scorebook','Ice Curling','Send six stones into a three-ring house, scoring 3/2/1 points using whole-pixel center offsets; twelve points wins. Left/right sets aim, up/down power, Enter throws once all stones rest. B spends one of eight sweeps to suppress friction for three ticks. Stones exchange velocity on approaching contact and lose speed at walls. Aim, power and score appear along the bottom. This bounded integer arcade model invites banking and bumping earlier stones. G runs, N steps, Space pauses, H helps.',curling);
const mazeCells=[1,1,1,1,1,1,1,1,1,0,0,0,1,2,0,1,1,0,1,0,1,0,0,1,1,0,1,0,0,0,1,1,1,0,0,0,1,0,0,1,1,1,0,1,1,0,1,1,1,3,0,0,0,0,4,1,1,1,1,1,1,1,1,1];
const labyrinth=`
canvas_init: C S kg_zero W 2700 1 W 2701 1 W 2702 1 M L Z
ll_copy: M I @ll_map A I L R E I M I 3000 A I L W I E I L 1 ifl L 64 J ll_copy end O S P
canvas_key: R E 2706 ifn E Z O S P end ife A 109 R E 2705 M F 1 S F E W 2705 F end ife A 83 R E 2702 I E -1 ifl E Z M E 3 end W 2702 E end ife A 84 R E 2702 I E 1 ifg E 3 M E Z end W 2702 E end ife A 89 M G 1 J ll_walk end ife A 90 M G -1 J ll_walk end O S P
ll_walk: R E 2702 M I @ll_dx A I E R E I P E G R F 2700 A E F W 2720 E R E 2702 M I @ll_dy A I E R E I P E G R F 2701 A E F W 2721 E P E 8 R F 2720 A E F M I 3000 A I E R E I W 2707 Z ife E 1 W 2707 1 O S P end ife E 4 R F 2703 ifl F 2 W 2707 2 O S P end W 2706 1 W 2606 Z end ifge E 2 ifle E 3 R F 2703 I F 1 W 2703 F W I Z end end R E 2720 W 2700 E R E 2721 W 2701 E R E 2704 ifl E 999 I E 1 W 2704 E end O S P
canvas_step: O S P
canvas_draw: C S vc_clear C S kg_status W 2730 Z
ll_ray: R A 2730 M B 2 C S vc_div S A 13 W 2731 A R E 2702 M I @ll_dx A I E R F I P F 16 W 2732 F M I @ll_dy A I E R F I P F 16 W 2733 F M I @ll_dy A I E R F I P F -1 P F A R E 2732 A E F W 2732 E R E 2702 M I @ll_dx A I E R F I P F A R E 2733 A E F W 2733 E R E 2700 P E 64 A E 32 W 2734 E R E 2701 P E 64 A E 32 W 2735 E W 2736 Z
ll_march: R E 2734 R F 2732 A E F W 2734 E R E 2735 R F 2733 A E F W 2735 E R E 2736 I E 1 W 2736 E R A 2734 M B 64 C S vc_div W 2737 A R A 2735 M B 64 C S vc_div P A 8 R E 2737 A A E M I 3000 A I A R E I ifn E Z W 2738 E J ll_wall end R E 2736 ifl E 40 J ll_march end W 2738 1
ll_wall: M A 240 R B 2736 C S vc_div ifg A 59 M A 59 end W 2739 A M E 81 S E A W 2740 E M E 81 A E A W 2741 E
R A 2730 M B 3 C S vc_div W 2742 A M I @ll_masks A I C R J I W 2746 J R I 2740 P I 18 R E 2742 A I E S I 9841 W 2747 I M G -1 R E 2738 ifn E 1 M G 1 end W 2748 G
ll_stripe: R J 2746 R I 2747 R F I M E F B E J P J -1 Y E J P J -1 S F E R G 2748 P J G A F J W I F A I 18 W 2747 I R E 2740 I E 1 W 2740 E R F 2741 ifle E F J ll_stripe end R E 2730 I E 1 W 2730 E ifl E 54 J ll_ray end R E 2705 ifn E Z C S ll_minimap end M A Z M B 10 M C @ll_keys M D -1 C S vc_text M A Z M B 145 M C @ll_hint M D 1 R E 2707 ife E 1 M C @ll_block end ife E 2 M C @ll_locked end R E 2706 ifn E Z M C @ll_win end C S vc_text R A 2703 C S kg_number M A 150 M B 10 M C 2880 M D 1 J vc_text
ll_minimap: M L Z
ll_cell: M A L M B 8 C S vc_div P A 3 A A 22 W 2743 A P C 3 A C 2 W 2744 C M I 3000 A I L R E I M C -1 ife E Z M C Z end ifg E 1 M C 1 end W 2745 C M K Z
ll_minirow: R A 2744 R B 2743 A B K M C A A C 2 M D B R E 2745 C S vc_line I K 1 ifl K 3 J ll_minirow end I L 1 ifl L 64 J ll_cell end R A 2700 P A 3 A A 3 R B 2701 P B 3 A B 23 M C 1 J vc_pixel
ll_dx: 0 1 0 -1
ll_dy: -1 0 1 0
ll_masks: 9477 351 13
ll_map: ${mazeCells.join(' ')}
${label('ll_keys','ARROWS WALK/TURN M MAP')}${label('ll_hint','FIND TWO KEYS THEN THE EXIT')}${label('ll_block','STONE WALL - TURN TO LOOK')}${label('ll_locked','EXIT NEEDS BOTH KEYS')}${label('ll_win','DAWN! BOTH KEYS ARE HOME')}
${help(['LANTERN LABYRINTH','LEFT/RIGHT TURN A QUARTER.','UP FORWARD; DOWN BACKWARD.','TWO GOLD KEYS UNLOCK EXIT.','M SHOWS A SMALL FLOOR MAP.','GOLD WALLS MARK ITEMS.','YOUR MAP DOT IS ALSO GOLD.','R RESTARTS THE SAME MAZE.','54 NATIVE RAYS PER FRAME;','BOUNDED INTEGER RAY STEPS.','TAB CHANGES STONE/LIGHT.','F1 RETURNS TO PROGRAMS.'])}
${common}`;
export const LANTERN_LABYRINTH=app(454,'lantern-maze','maze','Lantern Labyrinth','Explore an authored stone maze through fifty-four native ray columns. Left/right turns a quarter; up walks forward and down backward. Find two golden keys, then reach the exit. M toggles a small floor map; gold marks items and your position. Walls block motion. Integer ray steps give a deliberately coarse early-computer perspective. R restarts, Tab changes palette, H explains and F1 exits.',labyrinth);
const magnetic=`
canvas_init: C S kg_zero W 3100 60 W 3101 60 W 3102 -1 W 3103 110 W 3104 90 W 3105 1 W 3106 65 W 3107 115 W 3108 -1 W 3109 125 W 3110 40 W 3111 1 W 2702 1 C S mt_launch O S P
canvas_key: ifge A 49 ifle A 52 S A 49 W 2700 A end end R I 2700 P I 3 A I 3100 ife A 83 R E I S E 4 ifl E 12 M E 12 end W I E end ife A 84 R E I A E 4 ifg E 149 M E 149 end W I E end ife A 89 M E I/1 S E 4 ifl E 26 M E 26 end M I/1 E end ife A 90 M E I/1 A E 4 ifg E 135 M E 135 end M I/1 E end ife A 112 M E I/2 P E -1 M I/2 E end ife A 116 R E 2702 M F 1 S F E W 2702 F end ife A 102 C S mt_launch end O S P
mt_launch: R L 2703 M I L P I 5 A I 3000 W I 24 M E L P E 28 A E 180 M I/1 E M I/2 9 M E L S E 3 M I/3 E M I/4 160 I L 1 ifge L 8 M L Z end W 2703 L O S P
canvas_step: R E 2702 ifn E Z R E 2704 I E 1 ifge E 8 M E Z W 2704 E C S mt_launch else W 2704 E end end M L Z
mt_particle: M I L P I 5 A I 3000 M E I/4 ifle E Z J mt_next end I E -1 M I/4 E R E I W 2720 E M E I/1 W 2721 E M E I/2 W 2722 E M E I/3 W 2723 E M K Z
mt_charge: M I K P I 3 A I 3100 R E I P E 4 R F 2720 S E F W 2724 E M E I/1 P E 4 R F 2721 S E F W 2725 E F E A R F 2724 F F A A E F M G Z ifl E 320 M G 1 end ifl E 160 M G 2 end ifl E 64 M G 3 end M F I/2 P G F P G -1 R E 2724 C S mt_sign P E G R F 2722 A F E W 2722 F R E 2725 C S mt_sign P E G R F 2723 A F E W 2723 F I K 1 ifl K 4 J mt_charge end R E 2722 C S mt_limit W 2722 E R E 2723 C S mt_limit W 2723 E M I L P I 5 A I 3000 R E 2720 R F 2722 A E F W I E M I/2 F R E 2721 R F 2723 A E F M I/1 E M I/3 F R F I ifl F Z M I/4 Z J mt_next end ifg F 644 M I/4 Z J mt_next end ifl E 76 M I/4 Z J mt_next end ifg E 568 M I/4 Z J mt_next end W 2726 E M A F M B 4 C S vc_div W 2727 A R A 2726 M B 4 C S vc_div R I 2701 P I 2 A I 3200 R E 2727 W I E M I/1 A R E 2701 I E 1 ifge E 512 M E Z end W 2701 E R E 2705 ifl E 512 I E 1 W 2705 E end
mt_next: I L 1 ifl L 8 J mt_particle end O S P
mt_sign: ifg E Z M E 1 else ifl E Z M E -1 end end O S P
mt_limit: ifg E 12 M E 12 end ifl E -12 M E -12 end O S P
canvas_draw: C S vc_clear C S kg_status M L Z
mt_trail: R E 2705 ifge L E J mt_symbols end M I L P I 2 A I 3200 R A I M B I/1 M C -1 R E 2701 S E L ifl E Z A E 512 end ifl E 64 M C 1 end C S vc_pixel I L 1 J mt_trail
mt_symbols: M L Z
mt_draw_charge: M I L P I 3 A I 3100 R A I S A 3 M B I/1 R C I A C 3 M D B M E 1 C S vc_line M I L P I 3 A I 3100 M E I/2 ifg E Z R A I M B I/1 S B 3 M C A M D B A D 6 M E 1 C S vc_line end R E 2700 ife E L M I L P I 3 A I 3100 R A I S A 5 M B I/1 S B 5 M C A A C 10 M D B M E -1 C S vc_line end I L 1 ifl L 4 J mt_draw_charge end M A Z M B 10 M C @mt_keys M D -1 C S vc_text M A Z M B 145 M C @mt_hint M D 1 J vc_text
${label('mt_keys','1-4 CHARGE ARROWS MOVE P+-')}${label('mt_hint','F EMIT T STREAM TAB PALETTE')}
${help(['MAGNETIC TRACER','A DISCRETE FIELD SKETCH.','1..4 SELECT A CHARGE.','ARROWS MOVE; P FLIPS SIGN.','POSITIVE REPELS TEST MOTES;','NEGATIVE ATTRACTS THEM.','F EMITS; T TOGGLES STREAM.','THREE MANHATTAN FORCE BANDS','AND SPEED CAP SHAPE PATHS.','512 RECENT TRAIL POINTS.','G RUN N STEP SPACE PAUSE.','DISCRETE FORCE MODEL.'])}
${common}`;
export const MAGNETIC_TRACER=app(455,'magnetic-tracer','lenses','Magnetic Tracer','Sculpt looping particle traces around four signed charges. 1..4 selects, arrows move, P reverses polarity. Positive charges repel the positive test motes; negative charges attract. F emits a mote; T toggles an eight-tick source. Three Manhattan distance bands and a speed limit define this deliberately discrete field sketch, not a physical solver. The native ring buffer retains 512 trail points. G runs, Space pauses, N steps, Tab changes palette, R resets and H explains.',magnetic);
const vector=`
canvas_init: C S kg_zero W 2700 324 W 2701 324 W 2705 3 W 2706 20 W 3000 324 W 3001 144 W 3002 1 W 3004 2 W 3005 484 W 3006 328 W 3008 1 W 3009 2 W 3010 164 W 3011 408 W 3012 -1 W 3013 -1 W 3014 2 O S P
canvas_key: R E 2708 ifn E Z O S P end ife A 83 R E 2704 I E -1 ifl E Z M E 7 end W 2704 E end ife A 84 R E 2704 I E 1 ifg E 7 M E Z end W 2704 E end ife A 89 R E 2704 M I @vd_dx A I E R E I R F 2702 A F E ifg F 12 M F 12 end ifl F -12 M F -12 end W 2702 F R E 2704 M I @vd_dy A I E R E I R F 2703 A F E ifg F 12 M F 12 end ifl F -12 M F -12 end W 2703 F W 2710 4 end ife A 90 R E 2702 C S vd_slow W 2702 E R E 2703 C S vd_slow W 2703 E end ife A 102 C S vd_fire end O S P
vd_slow: ifg E Z I E -1 else ifl E Z I E 1 end end O S P
vd_fire: M L Z
vd_slot: M I L P I 5 A I 3100 M E I/4 ife E Z R E 2700 W I E R E 2701 M I/1 E R E 2704 M J @vd_dx A J E R E J P E 5 R F 2702 A E F M I/2 E R E 2704 M J @vd_dy A J E R E J P E 5 R F 2703 A E F M I/3 E M I/4 32 O S P end I L 1 ifl L 4 J vd_slot end O S P
canvas_step: R E 2708 ifn E Z O S P end R E 2706 ifg E Z I E -1 W 2706 E end R E 2710 ifg E Z I E -1 W 2710 E end R E 2700 R F 2702 A E F C S vd_wrapx W 2700 E R E 2701 R F 2703 A E F C S vd_wrapy W 2701 E M L Z
vd_rocks: M I L P I 5 A I 3000 M E I/4 ifn E Z R E I M F I/2 A E F C S vd_wrapx W I E M E I/1 M F I/3 A E F C S vd_wrapy M I/1 E end I L 1 ifl L 6 J vd_rocks end M L Z
vd_bullets: M I L P I 5 A I 3100 M E I/4 ifg E Z I E -1 M I/4 E R E I M F I/2 A E F C S vd_wrapx W I E M E I/1 M F I/3 A E F C S vd_wrapy M I/1 E M K Z
vd_hit: M J K P J 5 A J 3000 M E J/4 ifn E Z R E I R F J S E F F E A ifg E 324 M F 648 S F E M E F end W 2720 E M E I/1 M F J/1 S E F F E A ifg E 252 M F 504 S F E M E F end R F 2720 A E F M F J/4 P F 20 ifle E F M I/4 Z C S vd_break J vd_bullet_next end end I K 1 ifl K 6 J vd_hit end end
vd_bullet_next: I L 1 ifl L 4 J vd_bullets end R E 2706 ife E Z M K Z
vd_shiphit: M J K P J 5 A J 3000 M E J/4 ifn E Z R E 2700 R F J S E F F E A ifg E 324 M F 648 S F E M E F end W 2720 E R E 2701 M F J/1 S E F F E A ifg E 252 M F 504 S F E M E F end R F 2720 A E F M F J/4 P F 20 A F 12 ifle E F R E 2705 I E -1 W 2705 E W 2700 324 W 2701 324 W 2702 Z W 2703 Z W 2706 20 ife E Z W 2708 -1 W 2606 Z end J vd_end end end I K 1 ifl K 6 J vd_shiphit end end
vd_end: M L Z M G Z
vd_left: M I L P I 5 A I 3000 M E I/4 A G E I L 1 ifl L 6 J vd_left end ife G Z W 2708 1 W 2606 Z end R E 2709 ifg E Z I E -1 W 2709 E end O S P
vd_break: R E J W 2711 E M E J/1 W 2712 E W 2709 8 R E 2707 I E 1 W 2707 E M E J/4 ife E 1 M J/4 Z O S P end M J/4 1 M J/2 -3 M J/3 2 M G Z
vd_split: M I G P I 5 A I 3000 M E I/4 ife E Z R E J A E 12 C S vd_wrapx W I E M E J/1 S E 12 C S vd_wrapy M I/1 E M I/2 3 M I/3 -2 M I/4 1 O S P end I G 1 ifl G 6 J vd_split end O S P
vd_wrapx: ifl E Z A E 648 end ifge E 648 S E 648 end O S P
vd_wrapy: ifl E 72 A E 504 end ifge E 576 S E 504 end O S P
canvas_draw: C S vc_clear C S kg_status M L Z
vd_drawrock: M I L P I 5 A I 3000 M E I/4 ifn E Z P E 5 W 2730 E R A I M B 4 C S vc_div W 2731 A M I L P I 5 A I 3000 M A I/1 M B 4 C S vc_div W 2732 A M K Z
vd_diamond: M I @vd_cx A I K R A I R E 2730 P A E R E 2731 A A E M I @vd_cy A I K R B I R E 2730 P B E R E 2732 A B E M I @vd_cx A I K I I 1 R C I R E 2730 P C E R E 2731 A C E M I @vd_cy A I K I I 1 R D I R E 2730 P D E R E 2732 A D E M E -1 C S vc_line I K 1 ifl K 4 J vd_diamond end end I L 1 ifl L 6 J vd_drawrock end M L Z
vd_drawshot: M I L P I 5 A I 3100 M E I/4 ifg E Z R A I M B 4 C S vc_div W 2731 A M I L P I 5 A I 3100 M A I/1 M B 4 C S vc_div M B A R A 2731 M C 1 C S vc_pixel end I L 1 ifl L 4 J vd_drawshot end R A 2700 M B 4 C S vc_div W 2731 A R A 2701 M B 4 C S vc_div W 2732 A R E 2704 M I @vd_dx A I E R E I W 2733 E R E 2704 M I @vd_dy A I E R E I W 2734 E M K -1
vd_ship: R A 2731 R E 2733 P E 3 A A E R B 2732 R E 2734 P E 3 A B E R C 2731 R E 2733 P E 2 S C E R E 2734 P E K P E 2 A C E R D 2732 R E 2734 P E 2 S D E R E 2733 P E K P E 2 S D E M E 1 C S vc_line A K 2 ifle K 1 J vd_ship end R E 2710 ifg E Z R A 2731 R F 2733 P F 3 S A F R B 2732 R F 2734 P F 3 S B F M C A R F 2733 P F 3 S C F M D B R F 2734 P F 3 S D F M E -1 C S vc_line end R E 2709 ifg E Z R A 2711 M B 4 C S vc_div W 2731 A R A 2712 M B 4 C S vc_div M B A R A 2731 R E 2709 S A E M C A P E 2 A C E M D B M E 1 C S vc_line end M A Z M B 10 M C @vd_keys M D -1 C S vc_text M A Z M B 145 M C @vd_hint M D 1 R E 2708 ife E 1 M C @vd_win end ife E -1 M C @vd_loss end C S vc_text R E 2708 ife E Z R A 2705 C S kg_number M A 36 M B 145 M C 2880 M D 1 C S vc_text R A 2707 C S kg_number M A 90 M B 145 M C 2880 M D 1 C S vc_text end O S P
vd_dx: 0 1 2 1 0 -1 -2 -1
vd_dy: -2 -1 0 1 2 1 0 -1
vd_cx: 0 1 0 -1 0
vd_cy: -1 0 1 0 -1
${label('vd_keys','ARROWS TURN/THRUST F FIRE')}${label('vd_hint','LIVES   HITS   CLEAR ROCKS')}${label('vd_win','SECTOR CLEAR! R NEW FLIGHT')}${label('vd_loss','SHIP LOST - R RETRY')}
${help(['VECTOR DRIFT','LEFT/RIGHT TURN 45 DEGREES.','UP THRUST; DOWN BRAKES.','F FIRES: FOUR SHOTS MAX.','G RUN N STEP SPACE PAUSE.','SHIP AND ROCKS WRAP AROUND.','LARGE ROCKS SPLIT IN TWO.','CLEAR ALL PIECES TO WIN.','THREE LIVES; BRIEF SHIELD','AFTER EACH SHIP COLLISION.','INERTIAL ARCADE MOTION.','TAB COLORS R RESET F1 EXIT.'])}
${common}`;
export const VECTOR_DRIFT=app(456,'vector-drift','comet','Vector Drift','Pilot an inertial vector ship through a wrapping rock field. Left/right turns, up adds thrust, down brakes and F fires up to four shots. Three large rocks split into two small ones; clear every fragment to win. Three lives and a twenty-tick collision shield allow recovery. Bursts mark rock hits. Native integer motion and Manhattan contact rules define an arcade game. G runs, N steps, Space pauses, Tab changes palette, H helps and R restarts.',vector);
export const KINETIC_GAMES=[FIREWORK_GARDEN,FLOCKING_AVIARY,ICE_CURLING,LANTERN_LABYRINTH,MAGNETIC_TRACER,VECTOR_DRIFT] as const;
