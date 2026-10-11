; Native pixel canvas inside the existing text-mode screen allocation.
; 54x36 logical pixels occupy rows3..20 as 27x18 quadrant glyphs.
; Palette is per 2x2 block: highest nonzero pixel color supplies its ink.
; App state:2600=x,2601=y,2602=help,2603=ticks,2604=status,2605=cursor.
; 2606=playing;2607=timed studio(1) or non-timed editor(0).
; Pixel buffer3000..4943; app scratch2700..2999 and5000..5224.
app_entry:
 M S 5710 W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
 W Z 0sDMT W -3659 -8297 W -3658 7599
 M I -3657 M J @cv_palette M K 14
cv_palette_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J cv_palette_loop
 W 2602 Z W 2606 Z W 150 Z C S cv_reset J cv_redraw
cv_reset: W 2607 1 W 2606 Z W 150 Z W 2600 26 W 2601 18 W 2603 Z W 2604 Z W 2605 1 J canvas_init
cv_redraw:
 W 2514 Z M I -9841 M K 729
cv_clear_screen: W I 32 I I 1 I K -1 N K Z J cv_clear_screen
 M A @app_title M B Z C S cv_text
 R E 2602 ifn E Z C S canvas_help M A @cv_help_exit M B 25 C S cv_text J app_key end
 M A @cv_controls R E 2607 ife E Z M A @cv_edit_controls end M B 1 C S cv_text R E 2607 ife E Z M A @cv_edit_status R E 150 ifn E Z M A @cv_hearing end M B 2 C S cv_text else M A @cv_paused R E 2606 ifn E Z M A @cv_running end M B 2 C S cv_text R F 2603 C S cv_number M A @cv_hints C S cv_append end C S canvas_draw C S canvas_status
 M A @cv_footer R E 2607 ife E Z M A @cv_edit_footer end M B 25 C S cv_text
app_key:
 W 2514 1 R E 68 E E 4 J cv_input R E 2606 E E Z J app_key
 H 0sAAA -8 R E 68 E E 4 J cv_input C S canvas_step J cv_redraw
cv_input: R A 69 ife A 91 W 150 Z J program_menu end
 E A 83 J cv_left E A 84 J cv_right E A 89 J cv_up E A 90 J cv_down E A 88 J cv_click
 C S text_ascii ifge A 65 ifle A 90 A A 32 end end E A 104 J cv_help E A 114 J cv_restart
 R E 2602 N E Z J app_key ife A 103 R E 2607 E E Z J app_key R E 2606 M F 1 S F E W 2606 F J cv_redraw end ife A 32 W 2606 Z W 150 Z J cv_redraw end
 W 2606 Z E A 110 J cv_step C S canvas_key J cv_redraw
cv_help: W 2606 Z W 150 Z R E 2602 M F 1 S F E W 2602 F J cv_redraw
cv_restart: R E 2602 N E Z J app_key C S cv_reset J cv_redraw
cv_left: R E 2602 N E Z J app_key R E 2600 ifg E Z I E -1 W 2600 E end J cv_redraw
cv_right: R E 2602 N E Z J app_key R E 2600 ifl E 53 I E 1 W 2600 E end J cv_redraw
cv_up: R E 2602 N E Z J app_key R E 2601 ifg E Z I E -1 W 2601 E end J cv_redraw
cv_down: R E 2602 N E Z J app_key R E 2601 ifl E 35 I E 1 W 2601 E end J cv_redraw
cv_click: W 2606 Z R E 2602 N E Z J app_key C S canvas_click J cv_redraw
cv_step: W 2606 Z R E 2607 E E Z J app_key C S canvas_step J cv_redraw
; Text A=zero terminated pointer,B=row. Clobbers E/I/J.
cv_text: M I B P I 27 A I -9841 M J A
cv_append: M J A
cv_text_loop: R E J E E Z O S P W I E I J 1 I I 1 J cv_text_loop
; Plot A=x B=y C=color, safely clipped; clobbers E/I only.
cv_plot: ifl A Z O S P end ifg A 53 O S P end ifl B Z O S P end ifg B 35 O S P end M I B P I 54 A I A A I 3000 W I C O S P
cv_clear_pixels: M I 3000 M K 1944
cv_clear_pixels_loop: W I Z I I 1 I K -1 N K Z J cv_clear_pixels_loop O S P
; Read four pixels per screen cell, pack quadrant mask plus dominant ink.
cv_pixels: M H Z M L -9760
cv_pixel_row: M G Z
cv_pixel_cell: M I H P I 108 M E G P E 2 A I E A I 3000 M D Z M F Z R E I ifn E Z I D 1 M F E end M E I/1 ifn E Z I D 2 ifg E F M F E end end M E I/54 ifn E Z I D 4 ifg E F M F E end end M E I/55 ifn E Z I D 8 ifg E F M F E end end P F 729 A F D A F 128 W L F I L 1 I G 1 ifl G 27 J cv_pixel_cell end I H 1 ifl H 18 J cv_pixel_row end
 R E 2605 E E Z O S P R A 2600 M B 2 C S cv_div W 2690 A R A 2601 M B 2 C S cv_div P A 27 R E 2690 A A E A A -9760 W A 5146 O S P
; Integer division for nonnegative A/B, resultA remainderC; preservesG..L.
cv_div: M C A M E A Q E B M F E P F B S C F ifl C Z I E -1 A C B end M A E O S P
; F signed integer to current I screen pointer. Clobbers A..F/J; preservesG..L.
cv_number: ifl F Z W I 45 I I 1 F F A end M D 1000 M J Z
cv_number_loop: M A F M B D C S cv_div M F C ifn A Z M J 1 end ife D 1 M J 1 end ifn J Z A A 48 W I A I I 1 end E D 1 O S P Q D 10 J cv_number_loop
cv_controls: 65 114 114 111 119 115 58 97 105 109 32 69 110 116 101 114 58 115 101 116 32 78 58 115 116 101 112 0
cv_footer: 71 58 114 117 110 32 83 112 97 99 101 58 115 116 111 112 32 70 49 58 101 120 105 116 0
cv_help_exit: 72 58 98 97 99 107 32 40 115 116 97 116 101 32 112 114 101 115 101 114 118 101 100 41 0
cv_palette: -8297 -4093 -8297 -4105 -8297 7988 -8297 3575 -8297 -3606 -8297 -698 -8297 8230

; Common signed truncation A/B, B positive; preserves G..L.
cv_trunc: W 2688 A F A A C S cv_div R E 2688 ifl E Z P A -1 end O S P
; Tick counter is bounded so histories never overflow.
cv_tick: R E 2603 ifge E 999 W 2606 Z M A Z O S P end I E 1 W 2603 E M A 1 O S P

cv_paused: 80 97 117 115 101 100 32 116 105 99 107 32 0
cv_running: 82 117 110 110 105 110 103 32 116 105 99 107 32 0

cv_hints: 32 72 58 104 101 108 112 0

cv_edit_controls: 65 114 114 111 119 115 58 97 105 109 32 69 110 116 101 114 58 115 101 116 32 80 58 104 101 97 114 0

cv_edit_status: 50 55 32 101 100 105 116 97 98 108 101 32 115 97 109 112 108 101 115 32 72 58 104 101 108 112 0

cv_edit_footer: 85 58 117 110 100 111 32 83 112 97 99 101 58 115 116 111 112 32 70 49 58 101 120 105 116 0

cv_hearing: 65 117 100 105 116 105 111 110 105 110 103 32 72 58 104 101 108 112 0
