; Protected program selector. Text below is ASCII screen data, not Troika text.
; Programs tail-jump to program_menu only after releasing their live I/O.
; 2471 is selector index 0..3; 2470 remains the counted path-editor length.
; Both are reset before use and are outside filesystem/loader scratch.
program_boot:
      M S 5710 M B Z C S fs_mount N A Z J program_recover
      C S fs_check N A Z J program_recover
      J program_menu
program_recover: W 2506 A J program_menu
program_menu:
      W 150 Z ; entering the protected selector silences all APU channels
      W 26 -9841 W block_service_vector Z W block_servicing Z M S 5710
      W 2471 Z W 2532 Z W 2504 11 W 2505 1 W 2514 Z W Z 0sDMT W -3659 -8297 W -3658 7599
      M I -9841 M K 729
pm_clear: W I 32 I I 1 I K -1 N K Z J pm_clear
      M J @pm_title M K -9841 M I K C S pm_draw
      R E 2506 ifl E Z M J @pm_error M K -9544 M I K C S pm_draw end
      J pm_mark
pm_key:
      W 2514 1 R E 68 N E 4 J pm_key R E 69
      E E 29 J pm_web E E 30 J pm_terminal E E 31 J pm_irc E E 32 J pm_file
      E E 88 J pm_enter E E 27 J pm_enter
      E E 81 J pm_next E E 90 J pm_next E E 84 J pm_next
      E E 82 J pm_previous E E 89 J pm_previous E E 83 J pm_previous J pm_key
pm_previous: M F -1 J pm_shift
pm_next: M F 1
pm_shift:
      R E 2471 M I E P I 27 A I -9787 W I 32 A E F
      ifl E Z M E 3 end ifg E 3 M E Z end W 2471 E
pm_mark:
      R I 2471 P I 27 A I -9787 W I 62 J pm_key
pm_enter:
      R E 2471 E E Z J pm_web E E 1 J pm_terminal E E 2 J pm_irc J pm_file
; A downloaded PRG file uses the same checked native loader as built-ins.
; Keep its counted path in scratch, outside both loader and filesystem state.
pm_file:
      W 2504 15 W 2470 Z M J @pm_path_prompt M K -9517 M I K C S pm_draw
pm_file_key:
      R E 68 N E 4 J pm_file_key R E 69 E E 91 J program_menu
      E E 88 J pm_file_load E E 27 J pm_file_load
      E E 86 J pm_file_back E E 87 J pm_file_back
      ifge E -40 ifle E -14 N E -27 A E 27 end end
      M A E
      ifge E -13 ifle E 13
        E E Z J pm_file_key
        ifl E Z A A 110 else A A 109 end J pm_file_char
      end end
      ifge E 28 ifle E 37 A A 20 J pm_file_char end end
      E E 14 M A 46 E E 14 J pm_file_char
      E E 20 M A 45 E E 20 J pm_file_char
      E E 22 M A 47 E E 22 J pm_file_char
      N E 39 J pm_file_key M A 95
pm_file_char:
      R F 2470 ifge F 18 J pm_file_key end
      M I 5711 A I F W I E M I -9490 A I F W I A I F 1 W 2470 F J pm_file_key
pm_file_back:
      R F 2470 E F Z J pm_file_key I F -1 W 2470 F M I -9490 A I F W I 32 J pm_file_key
pm_file_load:
      R B 2470 E B Z J pm_file_key M A 5711 J pm_load
pm_web: M A @pm_web_path M B 4 J pm_load
pm_terminal: M A @pm_terminal_path M B 9 J pm_load
pm_irc: M A @pm_irc_path M B 4
pm_load: W 2505 Z W 2514 Z W 2506 Z J program_exec
pm_draw:
      R E J I J 1 E E Z O S P
      ife E 10 A K 27 M I K J pm_draw end
      W I E I I 1 J pm_draw
pm_web_path: "/web"
pm_terminal_path: "/terminal"
pm_irc_path: "/irc"
pm_title: 84 114 111 105 107 97 32 112 114 111 103 114 97 109 115 10 10 32 32 49 32 87 101 98 10 32 32 50 32 84 101 114 109 105 110 97 108 10 32 32 51 32 73 82 67 10 32 32 52 32 82 117 110 32 100 105 115 107 32 112 114 111 103 114 97 109 10 10 65 114 114 111 119 115 47 84 97 98 58 112 105 99 107 32 69 110 116 101 114 58 114 117 110 10 80 114 101 115 115 32 49 44 32 50 44 32 51 32 111 114 32 52 0
pm_path_prompt: 80 97 116 104 32 40 69 110 116 101 114 41 58 0
pm_error: 76 111 97 100 32 102 97 105 108 101 100 46 32 84 114 121 32 97 103 97 105 110 46 0
