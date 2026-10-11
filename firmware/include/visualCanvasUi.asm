; Shared native 162x162 H-mode canvas. Opt in via bitmapVram:true.
; VRAM -9841..-6926; pane x0..161,y18..143. UI2600..2699,
; renderer2900..2999; apps own2700..2899 and3000..5224.
; Hooks canvas_init/key(A ASCII or raw83/84/88/89/90)/step/draw/help.
; 2602 help,2603 tick (saturates9841),2606 running,2611 full-repaint flag.
; Custom keys preserve running. N pauses/steps; H pauses and preserves state.
app_entry: M S 5710 W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
 R E 47 W 2620 E R E 49 W 2621 E R E 50 W 2622 E W 150 Z
 W 2602 Z W 2606 Z W 2612 Z C S vc_reset J vc_redraw
vc_reset: W 2606 Z W 2603 Z W 2611 1 W 150 Z C S vc_clear J canvas_init
vc_redraw: W 2514 Z W Z 0sDMH C S vc_palette
 R E 2602 ifn E Z M I -9841 M E 2916 K I E C S canvas_help M A Z M B 153 M C @vc_back M D 1 C S vc_text J app_key end
 C S canvas_draw W 2611 Z
 M I -9841 M E 162 K I E M A Z M B 1 M C @app_title M D 1 C S vc_text
 M I -7141 M E 216 K I E M A Z M B 153 M C @vc_keys M D -1 C S vc_text
app_key: W 2514 1 R E 68 E E 4 J vc_input R E 2606 E E Z J app_key
 H 0sAAA -8 R E 68 E E 4 J vc_input C S vc_step J vc_redraw
vc_input: R A 69 E A 91 J vc_exit
 ife A 83 J vc_custom end ife A 84 J vc_custom end ife A 88 J vc_custom end ife A 89 J vc_custom end ife A 90 J vc_custom end
 ife A 81 R E 2612 I E 1 ifge E 4 M E Z end W 2612 E J vc_redraw end
 C S text_ascii ifge A 65 ifle A 90 A A 32 end end E A 104 J vc_help
 R E 2602 N E Z J app_key E A 114 J vc_restart ife A 32 W 2606 Z W 150 Z J vc_redraw end ife A 103 R E 2606 M F 1 S F E W 2606 F J vc_redraw end ife A 110 W 2606 Z C S vc_step J vc_redraw end
vc_custom: R E 2602 N E Z J app_key C S canvas_key J vc_redraw
vc_restart: C S vc_reset J vc_redraw
vc_help: W 2606 Z W 150 Z R E 2602 M F 1 S F E W 2602 F W 2611 1 ife F Z C S vc_clear end J vc_redraw
vc_step: R E 2603 ifl E 9841 I E 1 W 2603 E end J canvas_step
vc_exit: W 150 Z R E 2620 W 47 E R E 2621 W 49 E R E 2622 W 50 E J program_menu
; Clear pane only. Clobbers E/I.
vc_clear: M I -9517 M E 2268 K I E O S P
; Palette presets preserve the three hardware trit indices.
vc_palette: R E 2612 P E 3 A E @vc_palettes R F E W 47 F M F E/1 W 49 F M F E/2 W 50 F O S P
vc_palettes: -8297 249 8177 -9784 4383 9725 -8383 -2924 9841 -9580 5631 -3276
vc_keys: 71 58 82 85 78 32 78 58 83 84 69 80 32 72 58 72 69 76 80 32 70 49 58 69 88 73 84 0
vc_back: 72 58 66 65 67 75 32 32 84 65 66 58 80 65 76 69 84 84 69 0
; Nonnegative floor division A/B => quotientA,remainderC, preservesG..L.
vc_div: M C A M E A Q E B M F E P F B S C F ifl C Z I E -1 A C B end M A E O S P
; Signed truncation A/B (positiveB), preservesG..L; scratch2688.
vc_trunc: W 2688 A F A A C S vc_div R E 2688 ifl E Z P A -1 end O S P
; Pane-only plot, full-screen variant for text. PreservesC/D/G/H/K/L.
vc_pixel: ifl B 18 O S P end ifg B 143 O S P end
vc_screen_pixel: ifl C -1 O S P end ifg C 1 O S P end ifl A Z O S P end ifg A 161 O S P end ifl B Z O S P end ifg B 161 O S P end M E A Q E 9 M F E P F 9 S A F ifl A Z I E -1 A A 9 end M I B P I 18 A I E S I 9841 M J @vc_masks A J A R J J R F I M E F B E J P J -1 Y E J P J -1 S F E P J C A F J W I F O S P
vc_masks: 6561 2187 729 243 81 27 9 3 1
; Bounded Bresenham endpoints each -162..323. Pixels clip to pane.
; A=x0 B=y0 C=x1 D=y1 E=ink; clobbersA..J, preservesK/L.
vc_line: ifl A -162 O S P end ifg A 323 O S P end ifl B -162 O S P end ifg B 323 O S P end ifl C -162 O S P end ifg C 323 O S P end ifl D -162 O S P end ifg D 323 O S P end
 W 2920 A W 2921 B W 2922 C W 2923 D W 2924 E M F C S F A F F A W 2925 F M G D S G B F G A P G -1 W 2926 G A F G W 2929 F M E 1 ifg A C M E -1 end W 2927 E M E 1 ifg B D M E -1 end W 2928 E
vc_line_loop: R A 2920 R B 2921 R C 2924 C S vc_pixel R E 2920 R F 2922 ife E F R E 2921 R F 2923 E E F O S P end R E 2929 P E 2 W 2930 E R F 2926 ifge E F R E 2929 A E F W 2929 E R E 2920 R F 2927 A E F W 2920 E end R E 2930 R F 2925 ifle E F R E 2929 A E F W 2929 E R E 2921 R F 2928 A E F W 2921 E end J vc_line_loop

; ASCII5x5 text, clobbersA..J; preservesK/L. Scratch2900..2908.
vc_text: ifl A Z O S P end ifg A 156 O S P end ifl B Z O S P end ifg B 157 O S P end W 2900 A W 2901 B W 2902 C W 2903 D
vc_char: R I 2902 R E I ife E Z O S P end R F 2900 ifg F 156 O S P end ifge E 97 ifle E 122 S E 32 end end ifl E 32 M E 32 end ifg E 90 M E 32 end S E 32 P E 5 A E @vc_font W 2904 E W 2905 Z
vc_font_row: R I 2904 R E 2905 A I E R E I W 2906 E W 2907 81 W 2908 Z
vc_font_pixel: R E 2906 R F 2907 M G E Q G F P F G S E F W 2906 E ifn G Z R A 2900 R E 2908 A A E R B 2901 R E 2905 A B E R C 2903 C S vc_screen_pixel end R E 2907 Q E 3 W 2907 E R E 2908 I E 1 W 2908 E ifl E 5 J vc_font_pixel end R E 2905 I E 1 W 2905 E ifl E 5 J vc_font_row end R E 2900 A E 6 W 2900 E R E 2902 I E 1 W 2902 E J vc_char

vc_font: 0 0 0 0 0 9 9 9 0 9 30 30 0 0 0 30 121 30 121 30 40 90 120 10 120 109 3 9 27 85 36 84 37 84 118 9 9 0 0 0 3 9 9 9 3 27 9 9 9 27 0 91 39 91 0 0 9 121 9 0 0 0 0 9 27 0 0 121 0 0 0 0 0 0 9 1 3 9 27 81 39 85 91 109 39 9 36 9 9 39 39 82 3 9 121 120 1 39 1 120 84 84 121 3 3 121 81 120 1 120 39 81 120 82 39 121 1 3 9 27 39 82 39 82 39 39 82 40 1 39 0 9 0 9 0 0 9 0 9 27 3 9 27 9 3 0 121 0 121 0 27 9 3 9 27 39 82 12 0 9 39 82 94 91 39 39 82 121 82 82 120 82 120 82 120 39 82 81 82 39 120 82 82 82 120 121 81 120 81 121 121 81 120 81 81 39 81 85 82 40 82 82 121 82 82 39 9 9 9 39 13 3 3 84 36 82 84 90 84 82 81 81 81 81 121 82 112 91 82 82 82 109 91 85 82 39 82 82 82 39 120 82 120 81 81 39 82 82 91 40 120 82 120 84 82 40 81 39 1 120 121 9 9 9 9 82 82 82 82 39 82 82 82 30 9 82 82 91 91 30 82 30 9 30 82 82 30 9 9 9 121 3 9 27 121
