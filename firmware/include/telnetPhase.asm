; Native terminal mode. Entry C/D=counted hostname. Port 23, local port 244.
; Line input at 2552..2632 (80 printable cells plus LF). No scrollback buffer.
; Enter submits a line, Backspace edits, F1 drains pending output and closes.
$tc_length: 5250
$tc_send: 5251
$tc_cursor: 5252
$tc_closing: 5253
$tc_rx: 5254
$tc_left: 5255
$tc_count: 5256
$tc_pos: 5257
$tc_view: 5258
$tc_recalled: 5259
phase_entry:
      W 2514 Z ; Host presentation hint: waiting for physical input, never checkpoint-safe.
      ifl D 1 J tc_bad end ifg D 54 J tc_bad end
      U S C U S D M A 2800 M B @tc_scheme M C 7 C S net_copy O S C O S B
      M I B M K C
 tc_host:
      R E I E E -27 J tc_bad E E 22 J tc_bad E E 16 J tc_bad
      ifge E -13 ifle E 13 ifn E Z S E 27 W I E end end end
      I I 1 I K -1 N K Z J tc_host
      C S net_copy W A 22 S A 2800 I A 1 M B A M A 2800 C S url_parse N A Z O S P
      W url_port 23 W tc_length Z W tc_pos Z W tc_recalled Z W 3800 Z W tc_send Z W tc_closing Z
      W -3659 -8297 W -3658 7599 W -3655 8177 W -3654 -8297
 tc_begin:
      C S terminal_network C S tc_cancel N A Z J tc_abort
      M A 244 C S browser_connect_begin E A -1 J tc_begin ifl A Z J tc_fail end
 tc_connect:
      C S terminal_network C S tc_cancel N A Z J tc_abort
      C S browser_connect_step ifl A Z J tc_fail end E A Z J tc_connect
      M I -9841 M K 729
 tc_clear: W I 32 I I 1 I K -1 N K Z J tc_clear
      W tc_cursor 27 M A @tc_banner M B 55 M C 27 M D Z C S text_write W tc_cursor C
      C S tc_prompt
 tc_loop:
      W 2514 Z
      C S terminal_network
      C S stream_peek ifl A Z J tc_fail end
      ifn B Z
        W tc_rx A W tc_left B W tc_count B
 tc_output:
        R C tc_cursor ifge C 729
          M A -9814 M B -9787 M C 675 C S net_copy
          M I -9139 M K 27
 tc_blank: W I 32 I I 1 I K -1 N K Z J tc_blank
          W tc_cursor 702
        end
        R A tc_rx M B 1 R C tc_cursor M D Z C S text_write ifl A Z J tc_fail end W tc_cursor C
        R E tc_rx I E 1 W tc_rx E R E tc_left I E -1 W tc_left E N E Z J tc_output
        R A tc_count C S stream_consume ifl A Z J tc_fail end
      end
      R E st_rx_closed N E Z W tc_closing 1
      R B tc_send
      ifn B Z
        M A 2552 C S stream_send E A -1 J tc_loop ifl A Z J tc_fail end
        W tc_send Z W tc_length Z W tc_pos Z W tc_recalled Z C S tc_prompt
      end
      R E tc_closing
      ifn E Z
        R E st_state E E 6 J tc_ok
        C S stream_shutdown E A -1 J tc_loop ifl A Z J tc_fail end J tc_loop
      end
      W 2514 1 R E 68 N E 4 J tc_loop W 2514 Z R E 69
      ife E 91 W tc_closing 1 J tc_loop end
      E E 88 J tc_submit E E 27 J tc_submit
      E E 83 J tc_left_key E E 84 J tc_right_key
      E E 86 J tc_back E E 87 J tc_delete
      E E 89 J tc_recall E E 90 J tc_draft
      ifl E -40 J tc_loop end ifg E 57 J tc_loop end E E Z J tc_loop E E 54 J tc_loop
      R F tc_length ifge F 80 J tc_loop end R G tc_pos M I 2552 A I F
 tc_insert_shift: ifle F G J tc_insert end M H I/-1 W I H I I -1 I F -1 J tc_insert_shift
 tc_insert: W I E R F tc_length I F 1 W tc_length F I G 1 W tc_pos G J tc_redraw
 tc_left_key: R E tc_pos ifg E Z I E -1 W tc_pos E end J tc_redraw
 tc_right_key: R E tc_pos R F tc_length ifl E F I E 1 W tc_pos E end J tc_redraw
 tc_back: R E tc_pos E E Z J tc_loop I E -1 W tc_pos E
 tc_delete: R E tc_pos R F tc_length ifge E F J tc_loop end M I 2552 A I E
 tc_delete_shift: M G I/1 W I G I I 1 I E 1 ifl E F J tc_delete_shift end I F -1 W tc_length F J tc_redraw
 tc_recall: R E tc_recalled N E Z J tc_loop R C 3800 E C Z J tc_loop R C tc_length W 3881 C M A 3882 M B 2552 C S net_copy W tc_recalled 1 M B 3800 J tc_restore
 tc_draft: R E tc_recalled E E Z J tc_loop W tc_recalled Z M B 3881
 tc_restore: R C B W tc_length C W tc_pos C I B 1 M A 2552 C S net_copy
 tc_redraw: C S tc_prompt J tc_loop
 tc_submit:
      R C tc_length W 3800 C M A 3801 M B 2552 C S net_copy
      R E tc_length M I 2552 A I E W I 27 I E 1 W tc_send E J tc_loop
 tc_prompt:
      M I -9841 M K 27
 tc_top: W I 32 I I 1 I K -1 N K Z J tc_top
      W -9841 62 W -9840 32 R E tc_pos M F Z ifg E 23 M F E S F 23 end W tc_view F
      M A 2552 A A F R B tc_length S B F ifg B 24 M B 24 end
      M C 2 M D Z C S text_write R E tc_pos R F tc_view S E F A E -9839 R F tc_pos R G tc_length
      ife F G W E 1553 else R F E A F 1458 W E F end O S P
 tc_cancel:
      R E 68 N E 4 J tc_ok R E 69 N E 91 J tc_ok M A 1 O S P
 tc_abort: M A -133
 tc_fail:
      U S A C S dns_client_cancel R E st_state ifn E 6 M A 1 C S stream_abort end O S A O S P
 tc_ok: M A Z O S P
 tc_bad: M A -137 O S P
 tc_scheme: "http://"
 tc_banner: "Native echo. F1 disconnect.\nLeft/Right edit; Up recall\n"
