; Protected program selector. Text below is ASCII screen data, not Troika text.
; Programs tail-jump to program_menu only after releasing their live I/O.
program_boot:
      M S 5710 M B Z C S fs_mount N A Z J program_recover
      C S fs_check N A Z J program_recover
      J program_menu
program_recover: W 2506 A J program_menu
program_menu:
      W 26 -9841 W block_service_vector Z W block_servicing Z M S 5710
      W 2504 11 W 2505 1 W 2514 1 W Z 0sDMT W -3659 -9841 W -3658 9841
      M I -9841 M K 729
pm_clear: W I 32 I I 1 I K -1 N K Z J pm_clear
      M J @pm_title M K -9841 M I K C S pm_draw
      R E 2506 ifl E Z M J @pm_error M K -9652 M I K C S pm_draw end
pm_key:
      R E 68 N E 4 J pm_key R E 69
      E E 29 J pm_web E E 30 J pm_terminal E E 31 J pm_irc J pm_key
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
pm_title: 84 114 111 105 107 97 32 112 114 111 103 114 97 109 115 10 10 49 32 87 101 98 10 50 32 84 101 114 109 105 110 97 108 10 51 32 73 82 67 10 10 80 114 101 115 115 32 49 44 32 50 32 111 114 32 51 0
pm_error: 76 111 97 100 32 102 97 105 108 101 100 46 32 67 104 111 111 115 101 32 97 103 97 105 110 46 0
