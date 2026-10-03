; Disk-loaded file console. B=0 initializes (discarding the page), B=1 polls.
; Return 0 to stay, 1 to leave for site home. Network pump stays resident.
; Line buffer 2552..2731, console state in inactive Forth VM arena.
$cs_length: 5225
$cs_cursor: 5226
$cs_arg: 5227
$cs_arglen: 5228
$cs_command: 5229
$cs_mode: 5230
$cs_pointer: 5231
$cs_left: 5232
$cs_status: 5233
$cs_kind: 5234
console_init:
      C S f_reset W pp_valid Z W cs_length Z W cs_mode Z W cs_status Z
      W Z 0sDMT W -3659 -9841 W -3658 9841 C S cs_clear
      M A @cs_help M B 48 C S cs_print J cs_prompt
console_poll:
      R E 0s_PA N E 4 J cs_ok R A 0s_PB E A 91 J cs_exit
      R E cs_mode
      ifn E Z
        E A 27 J cs_resume E A 88 J cs_resume J cs_ok
      end
      E A 27 J cs_execute E A 88 J cs_execute
      E A 86 J cs_back E A 87 J cs_back
      ifge A -40 ifle A -14 N A -27 A A 27 end end
      U S A C S text_ascii O S B ifl A Z J cs_ok end
      R E cs_length ifge E 180 J cs_ok end
      M I 2552 A I E W I B I E 1 W cs_length E J cs_prompt
cs_back:
      R E cs_length E E Z J cs_ok I E -1 W cs_length E M I 2552 A I E W I Z J cs_prompt
cs_execute:
      C S cs_clear M I 2552 R K cs_length M L Z
cs_word:
      E K Z J cs_args R E I E E -27 J cs_args I I 1 I K -1 I L 1 J cs_word
cs_args:
      W cs_command L
cs_spaces:
      E K Z J cs_arg_ready R E I N E -27 J cs_arg_ready I I 1 I K -1 J cs_spaces
cs_arg_ready:
      W cs_arg I W cs_arglen K W cs_length Z
      R E cs_command E E Z J cs_prompt M I @cs_commands
cs_match:
      R K I E K Z J cs_bad R E cs_command
      ife E K M A 2552 M B I I B 2 M C K C S dns_equal E A Z J cs_dispatch end
      A I K I I 2 J cs_match
cs_dispatch:
      M E I/1 R A cs_arg R B cs_arglen
      E E 1 J cs_dir E E 2 J cs_type E E 3 J cs_delete E E 4 J cs_mkdir E E 5 J cs_rmdir
      ifn B Z J cs_bad end E E 6 J cs_prompt E E 7 J cs_exit
      M A @cs_help M B 48 C S cs_print J cs_prompt
cs_delete: C S fs_delete J cs_result
cs_mkdir: C S fs_mkdir J cs_result
cs_rmdir: C S fs_rmdir J cs_result
cs_dir:
      ife B Z M A @cs_root M B 1 end
      C S fs_lookup N A Z J cs_result C S fs_enum_open N A Z J cs_result W cs_mode 1 J cs_list
cs_type:
      C S fs_lookup N A Z J cs_result C S fs_open N A Z J cs_result W cs_mode 2 W cs_left Z J cs_cat
cs_resume:
      C S cs_clear R E cs_mode E E 1 J cs_list J cs_cat
cs_list:
      C S fs_enum_next N A Z J cs_result E B Z J cs_finish
      W cs_kind B M I C M B I/1 M A C I A 2 C S cs_print
      R E cs_kind ife E 2 M A @cs_root M B 1 C S cs_print end
      M A @cs_lf M B 1 C S cs_print R E cs_cursor ifge E 729 J cs_more end J cs_list
cs_cat:
      R E cs_left
      ife E Z
        C S fs_read_next N A Z J cs_result E B Z J cs_finish
        W cs_pointer fs_buffer W cs_left B
      end
      R A cs_pointer R B cs_left U S B C S cs_print O S E
      ifl A Z J cs_result end
      S E B R F cs_pointer A F E W cs_pointer F W cs_left B
      R E cs_cursor ifge E 729 J cs_more end J cs_cat
cs_finish: C S fs_close W cs_mode Z J cs_prompt
cs_exit: C S fs_close W cs_mode Z M A 1 O S P
cs_result:
      W cs_status A
      ifn A Z
        R E fs_opened ife E 3 R E fm_committed ife E Z C S fs_replace_abort end end
        C S fs_close W cs_mode Z M A @cs_error M B 6 C S cs_print
        R F cs_status F F A M I 5720 W I 27 M K 1
cs_digit:
        M E F Q E 10 M G E P G 10 ifg G F I E -1 S G 10 end
        S F G A F 28 I I -1 W I F I K 1 M F E N F Z J cs_digit
        R E cs_status ifl E Z I I -1 W I 20 I K 1 end
        M A I M B K C S cs_print J cs_prompt
      end
      M A @cs_success M B 3 C S cs_print J cs_prompt
cs_bad: M A -137 J cs_result
cs_clear:
      M I -9814 M K 702
cs_clear_loop: W I 32 I I 1 I K -1 N K Z J cs_clear_loop W cs_cursor 27 J cs_ok
cs_print: R C cs_cursor M D Z C S text_write W cs_cursor C O S P
cs_more:
      C S cs_top M A @cs_more_text M B 26 M C Z M D Z C S text_write J cs_ok
cs_prompt:
      C S cs_top W -9841 62 W -9840 32
      M A 2552 R B cs_length ifg B 24 M E B S E 24 A A E M B 24 end
      M C 2 M D Z C S text_write M I -9841 A I C W I 95 J cs_ok
cs_top:
      M I -9841 M K 27
cs_top_loop: W I 32 I I 1 I K -1 N K Z J cs_top_loop O S P
cs_ok: M A Z O S P
cs_commands: 3 1 "dir" 4 2 "type" 3 3 "del" 5 4 "mkdir" 5 5 "rmdir" 3 6 "cls" 4 7 "exit" 4 8 "help" 0
cs_root: "/"
cs_lf: 27
cs_success: "ok\n"
cs_error: "error "
cs_more_text: "Enter: more  F1: site home"
cs_help: "dir type del mkdir rmdir\ncls help exit\nF1: home\n"
