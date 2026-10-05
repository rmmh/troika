; Disk-loaded file console. B=0 initializes (discarding the page), B=1 polls.
; Return 0 to stay, 1 for home, 2 GET, 3 OPEN or 4 COPY or 5 REN or 6 PUT arguments B/C.
; Positive actions clear browser status before returning across the phase gate.
; Actions 8/9/10 delegate delete/mkdir/rmdir to the file-operation phase.
; Action 6 also carries complete ping/trace commands to the network phase.
; Network pump stays resident.
; Line buffer 2552..2731, console state in inactive Forth VM arena.
$cs_length: 5225
$cs_cursor: 5226
$cs_arg: 5227
$cs_arglen: 5228
$cs_command: 5229
$cs_mode: 5230
$cs_pointer: 5231
$cs_left: 5232
$cs_pos: 5235
$cs_nav: 5236
$cs_view: 5237
$cs_status: 5233
$cs_kind: 5234
$cs_sum: 5238
$cs_browser_status: 2505
console_init:
      W 2514 Z
      C S f_reset W pp_valid Z W cs_length Z W cs_mode Z W cs_status Z W cs_pos Z W cs_nav -1 W 3724 Z
      W Z 0sDMT W -3659 -8297 W -3658 7599 W -3655 8177 W -3654 -8297 C S cs_clear
      J cs_help
console_download:
      U S D C S console_init O S C M A 2556 M B 5954 C S net_copy
      W A -27 S A 2552 I A 1 W cs_length A W cs_pos A
      W 2552 -7 W 2553 -9 W 2554 7 W 2555 -27 J cs_prompt
console_poll:
      R E 0s_PA N E 4 J cs_ok R A 0s_PB E A 91 J cs_exit
      R E cs_mode
      ifn E Z
        E A 27 J cs_resume E A 88 J cs_resume J cs_ok
      end
      E A 27 J cs_execute E A 88 J cs_execute
      E A 86 J cs_back E A 87 J cs_delete
      E A 83 J cs_left_key E A 84 J cs_right_key
      E A 89 J cs_history_up E A 90 J cs_history_down
      C S cs_input_case
      U S A C S text_ascii O S B ifl A Z J cs_ok end
      R E cs_length ifge E 180 J cs_ok end
      R F cs_pos M I 2552 A I E
cs_insert_shift: ifle E F J cs_insert end M G I/-1 W I G I I -1 I E -1 J cs_insert_shift
cs_insert: W I B R E cs_length I E 1 W cs_length E I F 1 W cs_pos F J cs_prompt
 ; Fold command/path input, but keep literal case after "write path ".
cs_input_case:
      U S A R E cs_pos ifl E 8 J cs_fold end
      M A 2552 M B @cs_write_prefix M C 6 C S dns_equal N A Z J cs_fold
      M I 2558 R K cs_pos I K -6
cs_write_spaces:
      E K Z J cs_fold R E I N E -27 J cs_write_path I I 1 I K -1 J cs_write_spaces
cs_write_path:
      E K Z J cs_fold R E I E E -27 J cs_literal I I 1 I K -1 J cs_write_path
cs_fold:
      O S A ifge A -40 ifle A -14 N A -27 A A 27 end end O S P
cs_literal: O S A O S P
cs_left_key: R E cs_pos ifg E Z I E -1 W cs_pos E end J cs_prompt
cs_right_key: R E cs_pos R F cs_length ifl E F I E 1 W cs_pos E end J cs_prompt
cs_back: R E cs_pos E E Z J cs_ok I E -1 W cs_pos E
cs_delete: R E cs_pos R F cs_length ifge E F J cs_ok end M I 2552 A I E
cs_delete_shift: M G I/1 W I G I I 1 I E 1 ifl E F J cs_delete_shift end I F -1 W cs_length F J cs_prompt
; Three bounded recent commands plus an unsent draft in discarded PAGE RAM.
; These records survive file-operation phases, but never survive fresh browsing.
cs_history_up: R E cs_nav I E 1 R F 3724 ifge E F J cs_ok end U S E R E cs_nav ifl E Z M A 3543 C S cs_history_store end O S E W cs_nav E J cs_history_get
cs_history_down: R E cs_nav ifl E Z J cs_ok end I E -1 W cs_nav E
cs_history_get: M B 3543 ifge E Z M B E P B 181 A B 3000 end R C B ifl C Z J cs_history_bad end ifg C 180 J cs_history_bad end W cs_length C W cs_pos C I B 1 M A 2552 C S net_copy J cs_prompt
cs_history_bad: W cs_length Z W cs_pos Z W cs_nav -1 W 3724 Z J cs_prompt
cs_history_store: R C cs_length W A C I A 1 M B 2552 J net_copy
cs_history_save: R E cs_length E E Z O S P M I 3361 M J 3542 M K 362
cs_history_shift: R E I W J E I I -1 I J -1 I K -1 N K Z J cs_history_shift
      R E 3724 ifl E 3 I E 1 W 3724 E end M A 3000 J cs_history_store
cs_execute:
      C S cs_history_save W cs_pos Z W cs_nav -1 C S cs_clear M I 2552 R K cs_length M L Z
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
      E E 1 J cs_dir E E 2 J cs_type
      ifle E 5 W cs_browser_status Z M C B M B A M A E I A 5 O S P end
      E E 14 J cs_free E E 15 J cs_checksum
      E E 16 J cs_probe E E 17 J cs_probe
      ife E 19 M C B M B A M A 7 W cs_browser_status Z O S P end
      ifge E 9 W cs_browser_status Z M C B M B A M A E I A -7 O S P end
      ifn B Z J cs_bad end E E 6 J cs_prompt E E 7 J cs_exit
      J cs_help
; Network utility mode shares /upload, with the complete command retained.
cs_probe:
      M C A A C B S C 2552 P C -1 M B 2552 M A 6 W cs_browser_status Z O S P
cs_free:
      N B Z J cs_bad C S fs_space N A Z J cs_result
      U S C U S B M A @cs_free_label M B 13 C S cs_print O S F C S cs_number
      M A @cs_total_label M B 14 C S cs_print O S F C S cs_number
      M A @cs_block_label M B 22 C S cs_print J cs_prompt
; Print signed F as decimal plus LF, using the existing shared scratch.
cs_number:
      ifl F Z U S F M A @cs_minus M B 1 C S cs_print O S F F F A end
      M I 5720 W I 27 M K 1
cs_unsigned:
      M E F Q E 10 M G E P G 10 ifg G F I E -1 S G 10 end
      S F G A F 28 I I -1 W I F I K 1 M F E N F Z J cs_unsigned
      M A I M B K J cs_print
cs_checksum:
      C S fs_lookup N A Z J cs_result C S fs_open N A Z J cs_result W cs_sum Z
cs_sum_block:
      C S fs_read_next N A Z J cs_result E B Z J cs_sum_done
      M I fs_buffer M K B R F cs_sum
cs_sum_cell:
      R E I P F 17 A F E I I 1 I K -1 N K Z J cs_sum_cell
      W cs_sum F J cs_sum_block
cs_sum_done:
      C S fs_close N A Z J cs_result
      M A @cs_sum_label M B 10 C S cs_print R F cs_sum C S cs_number
      M A @cs_blocks_label M B 8 C S cs_print R F fs_found_count C S cs_number
      M A @cs_last_label M B 11 C S cs_print R F fs_found_used C S cs_number J cs_prompt
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
cs_exit: W cs_browser_status Z C S fs_close W cs_mode Z M A 1 O S P
console_result: U S C R E 3724 ifl E Z M E Z end ifg E 3 M E Z end U S E C S console_init O S E W 3724 E C S cs_clear O S A
cs_result:
      W cs_status A
      ifn A Z
        C S fs_close W cs_mode Z M A @cs_error M B 6 C S cs_print
        R F cs_status F F A M I 5720 W I 27 M K 1
cs_digit:
        M E F Q E 10 M G E P G 10 ifg G F I E -1 S G 10 end
        S F G A F 28 I I -1 W I F I K 1 M F E N F Z J cs_digit
        R E cs_status ifl E Z I I -1 W I 20 I K 1 end
        M A I M B K C S cs_print
        M A @cs_error_help M B 9 C S cs_print J cs_prompt
      end
      M A @cs_success M B 3 C S cs_print J cs_prompt
cs_bad: M A -137 J cs_result
cs_clear:
      M I -9814 M K 702
cs_clear_loop: W I 32 I I 1 I K -1 N K Z J cs_clear_loop W cs_cursor 27 J cs_ok
cs_print: R C cs_cursor M D Z C S text_write W cs_cursor C O S P
cs_more:
      C S cs_top M A @cs_more_text M B 21 M C Z M D Z C S text_write J cs_ok
cs_prompt:
      C S cs_top W -9841 62 W -9840 32
      R E cs_pos M F Z ifg E 23 M F E S F 23 end W cs_view F M A 2552 A A F R B cs_length S B F ifg B 24 M B 24 end
      M C 2 M D Z C S text_write R E cs_pos R F cs_view S E F A E -9839 R F cs_pos R G cs_length
      ife F G W E 1553 else R F E A F 1458 W E F end J cs_ok
cs_top:
      M I -9841 M K 27
cs_top_loop: W I 32 I I 1 I K -1 N K Z J cs_top_loop O S P
cs_ok: M A Z O S P
cs_commands: 3 1 "dir" 4 2 "type" 3 3 "del" 5 4 "mkdir" 5 5 "rmdir" 3 6 "cls" 4 7 "exit" 4 8 "help" 3 9 "get" 4 10 "open" 4 11 "copy" 3 12 "ren" 3 13 "put" 4 14 "free" 3 15 "sum" 5 18 "write" 4 16 "ping" 5 17 "trace" 10 17 "traceroute" 6 19 "telnet" 0
cs_root: "/"
cs_lf: 27
cs_success: "ok\n"
cs_error: "error "
cs_error_help: "F1: home\n"
cs_more_text: "Enter: more  F1: home"


cs_free_label: "Free blocks: "
cs_total_label: "Total blocks: "
cs_block_label: "Block size: 243 cells\n"

cs_minus: "-"
cs_sum_label: "Checksum: "
cs_blocks_label: "Blocks: "
cs_last_label: "Last used: "

cs_write_prefix: "write "

cs_help: M A @cs_usage M B 338 C S cs_print J cs_prompt
cs_usage: "dir [/dir]  type /file\nwrite /file text  sum /file\ncopy /from /to  ren /p name\nmkdir /dir  rmdir /dir\ndel /file  free  cls  exit\nget URL /p  put /p URL\nopen URL  telnet HOST\nping HOST  trace HOST\nPaths absolute/lowercase.\nwrite replaces whole file.\nLeft/Right edit; Del erase  \nUp/Down: history/draft\nF1 home  F3 save link\nhelp: commands\n"
