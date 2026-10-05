; Native H-mode map. Pages0..3 (-9841..-6926) are exclusively bitmap VRAM.
; Code is relocated by the opt-in bitmapVram overlay contract. All positions
; are computed from the native DE441 vectors; distance rings are guides, not orbits.
; Scratch4840..4899 only; retained ephemeris4400..4759 is immutable.
au_map:
 W Z 0sDMH W 47 -8297 W 49 249 W 50 8177 M I -9841 M K 2916 K I K
 M A 3 M B 2 M C @ah_title M D -1 C S ah_text
 R I au_length A I 2552 W I Z M A 3 M B 10 M C 2552 M D 1 C S ah_text
 R E au_zoom ife E Z M C @ah_inner else M C @ah_outer end M A 3 M B 18 M D -1 C S ah_text
 W 4890 80 R E au_play ifn E Z W 4890 62 end R E au_direction ifg E Z W 4891 43 else W 4891 45 end R E au_speed M I @ah_speeds A I E R J I M I 4892
ah_speed_copy: R E J W I E I J 1 I I 1 N E Z J ah_speed_copy
 M A 114 M B 18 M C 4890 R E au_ended ifn E Z M C @ah_limit end M D 1 C S ah_text
 ; Dotted distance guides at14-pixel intervals around (81,84).
 W 4870 14
ah_ring_start: R E 4870 W 4871 E W 4872 Z M F 1 S F E W 4873 F
ah_ring: R E 4872 M F E Q F 2 P F 2 ife E F C S ah_octants end R E 4872 I E 1 W 4872 E R F 4873 ifl F Z P E 2 I E 1 A F E else R G 4871 I G -1 W 4871 G S E G P E 2 I E 1 A F E end W 4873 F R E 4872 R F 4871 ifle E F J ah_ring end R E 4870 A E 14 W 4870 E ifle E 56 J ah_ring_start end
 W au_map_body Z
ah_body:
 R E au_map_body ife E 2 M B 4730 else M B E P B 30 A B 4400 end M A 4760 M C 4700 C S am_sub ifn A Z O S P end
 R E au_map_body ife E 2 M B 4740 else M B E P B 30 A B 4410 end M A 4770 M C 4710 C S am_sub ifn A Z O S P end
 M A 4760 C S au_map_coordinate A A 81 W 4860 A M A 4770 C S au_map_coordinate P A -1 A A 84 W 4861 A
 R E 4860 ifl E 5 J ah_next end ifg E 150 J ah_next end ifl A 29 J ah_next end ifg A 135 J ah_next end
 ; Preserve the Sun when outer-scale inner bodies occupy the center.
 R E au_zoom ifn E Z R E 4860 S E 81 F E A R F 4861 S F 84 F F A ifl E 4 ifl F 4 J ah_next end end end
 R A 4860 R B 4861 M C 1 C S ah_pixel R A 4860 I A -1 R B 4861 M C 1 C S ah_pixel R A 4860 I A 1 R B 4861 M C 1 C S ah_pixel R A 4860 R B 4861 I B -1 M C 1 C S ah_pixel R A 4860 R B 4861 I B 1 M C 1 C S ah_pixel
 R E au_body ife E 11 M E 2 end R F au_map_body ife E F
 M L -3
ah_focus: R A 4860 A A L R B 4861 I B -3 M C 1 C S ah_pixel R A 4860 A A L R B 4861 I B 3 M C 1 C S ah_pixel R A 4860 I A -3 R B 4861 A B L M C 1 C S ah_pixel R A 4860 I A 3 R B 4861 A B L M C 1 C S ah_pixel I L 1 ifle L 3 J ah_focus end end
 R E au_map_body A E 49 W 4898 E W 4899 Z R A 4860 A A 5 R B 4861 I B -2 M C 4898 M D -1 C S ah_text
ah_next: R E au_map_body I E 1 W au_map_body E ifl E 9 J ah_body end
 ; A fixed three-pixel Sun symbol is a marker, never a claimed angular size.
 M L -3
ah_sun: M A 81 A A L M B 84 M C 1 C S ah_pixel M A 81 M B 84 A B L M C 1 C S ah_pixel I L 1 ifle L 3 J ah_sun end
 M A 3 M B 144 R E au_body M I @au_names A I E R C I M D 1 C S ah_text
 M A Z M B 153 M C @ah_keys M D -1 C S ah_text O S P

; Eight circle-symmetric points, preserving the ring accumulator and L.
ah_octants: M L Z
ah_octant: R E 4871 R F 4872 ifge L 4 M G E M E F M F G end M G L ifge G 4 I G -4 end ifge G 2 P E -1 I G -2 end ifn G Z P F -1 end M A E A A 81 M B F A B 84 M C -1 C S ah_pixel I L 1 ifl L 8 J ah_octant end O S P

; Plot(A=x,B=y,C=trit -1/+1). Bounded writes; preserves C,D,G,H,K,L.
ah_pixel: ifl A Z O S P end ifg A 161 O S P end ifl B Z O S P end ifg B 161 O S P end M E A Q E 9 M F E P F 9 S A F ifl A Z I E -1 A A 9 end M I B P I 18 A I E S I 9841 M J @ah_masks A J A R J J R F I M E F B E J P J -1 Y E J P J -1 S F E P J C A F J W I F O S P
ah_masks: 6561 2187 729 243 81 27 9 3 1

; Text(A=x,B=y,C=ASCII0ptr,D=ink). Uppercase ROM copy rendered by guest.
; Every glyph is five ternary bit rows, not host font or host drawing.
ah_text: W 4840 A W 4841 B W 4842 C W 4843 D
ah_char: R I 4842 R E I ife E Z O S P end R F 4840 ifg F 156 O S P end ifge E 97 ifle E 122 S E 32 end end ifl E 32 M E 32 end ifg E 90 M E 32 end S E 32 P E 5 A E @ah_font W 4844 E W 4845 Z
ah_font_row: R I 4844 R E 4845 A I E R E I W 4846 E W 4847 81 W 4848 Z
ah_font_pixel: R E 4846 R F 4847 M G E Q G F P F G S E F W 4846 E ifn G Z R A 4840 R E 4848 A A E R B 4841 R E 4845 A B E R C 4843 C S ah_pixel end R E 4847 Q E 3 W 4847 E R E 4848 I E 1 W 4848 E ifl E 5 J ah_font_pixel end R E 4845 I E 1 W 4845 E ifl E 5 J ah_font_row end R E 4840 A E 6 W 4840 E R E 4842 I E 1 W 4842 E J ah_char

ah_title: 68 69 52 52 49 32 73 67 82 70 32 88 89 32 47 32 83 85 78 0

ah_inner: 73 78 78 69 82 32 53 77 32 75 77 47 80 88 0

ah_outer: 79 85 84 69 82 32 49 53 48 77 32 75 77 47 80 88 0

ah_keys: 90 32 77 32 70 32 72 32 68 32 60 62 32 83 80 65 67 69 32 82 32 43 47 45 32 70 49 0

ah_h: 49 72 0

ah_d: 49 68 0

ah_10d: 49 48 68 0

ah_30d: 51 48 68 0

ah_365d: 51 54 53 68 0
ah_speeds: @ah_h @ah_d @ah_10d @ah_30d @ah_365d
; ASCII32..90, exact5x5 ROM patterns repacked as positive ternary digits.
ah_font: 0 0 0 0 0 9 9 9 0 9 30 30 0 0 0 30 121 30 121 30 40 90 120 10 120 109 3 9 27 85 36 84 37 84 118 9 9 0 0 0 3 9 9 9 3 27 9 9 9 27 0 91 39 91 0 0 9 121 9 0 0 0 0 9 27 0 0 121 0 0 0 0 0 0 9 1 3 9 27 81 39 85 91 109 39 9 36 9 9 39 39 82 3 9 121 120 1 39 1 120 84 84 121 3 3 121 81 120 1 120 39 81 120 82 39 121 1 3 9 27 39 82 39 82 39 39 82 40 1 39 0 9 0 9 0 0 9 0 9 27 3 9 27 9 3 0 121 0 121 0 27 9 3 9 27 39 82 12 0 9 39 82 94 91 39 39 82 121 82 82 120 82 120 82 120 39 82 81 82 39 120 82 82 82 120 121 81 120 81 121 121 81 120 81 81 39 81 85 82 40 82 82 121 82 82 39 9 9 9 39 13 3 3 84 36 82 84 90 84 82 81 81 81 81 121 82 112 91 82 82 82 109 91 85 82 39 82 82 82 39 120 82 120 81 81 39 82 82 91 40 120 82 120 84 82 40 81 39 1 120 121 9 9 9 9 82 82 82 82 39 82 82 82 30 9 82 82 91 91 30 82 30 9 30 82 82 30 9 9 9 121 3 9 27 121

ah_limit: 76 73 77 73 84 0

ah_save_palette: R E 47 W 4835 E R E 49 W 4836 E R E 50 W 4837 E O S P
au_exit: R E 4835 W 47 E R E 4836 W 49 E R E 4837 W 50 E J program_menu
