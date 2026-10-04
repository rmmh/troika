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
      W url_port 23 W tc_length Z W tc_send Z W tc_closing Z
 tc_begin:
      C S browser_network C S tc_cancel N A Z J tc_abort
      M A 244 C S browser_connect_begin E A -1 J tc_begin ifl A Z J tc_fail end
 tc_connect:
      C S browser_network C S tc_cancel N A Z J tc_abort
      C S browser_connect_step ifl A Z J tc_fail end E A Z J tc_connect
      M I -9841 M K 729
 tc_clear: W I 32 I I 1 I K -1 N K Z J tc_clear
      W tc_cursor 27 M A @tc_banner M B 28 M C 27 M D Z C S text_write W tc_cursor C
      C S tc_prompt
 tc_loop:
      W 2514 Z
      C S browser_network
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
        W tc_send Z W tc_length Z C S tc_prompt
      end
      R E tc_closing
      ifn E Z
        R E st_state E E 6 J http_ok
        C S stream_shutdown E A -1 J tc_loop ifl A Z J tc_fail end J tc_loop
      end
      W 2514 1 R E 68 N E 4 J tc_loop W 2514 Z R E 69
      ife E 91 W tc_closing 1 J tc_loop end
      E E 88 J tc_submit E E 27 J tc_submit
      ife E 86 R E tc_length ifg E Z I E -1 W tc_length E end C S tc_prompt J tc_loop end
      ife E 87 R E tc_length ifg E Z I E -1 W tc_length E end C S tc_prompt J tc_loop end
      ifl E -40 J tc_loop end ifg E 57 J tc_loop end E E Z J tc_loop E E 54 J tc_loop
      R F tc_length ifge F 80 J tc_loop end
      M I 2552 A I F W I E I F 1 W tc_length F C S tc_prompt J tc_loop
 tc_submit:
      R E tc_length M I 2552 A I E W I 27 I E 1 W tc_send E J tc_loop
 tc_prompt:
      M I -9841 M K 27
 tc_top: W I 32 I I 1 I K -1 N K Z J tc_top
      W -9841 62 W -9840 32 M A 2552 R B tc_length
      ifg B 24 M E B S E 24 A A E M B 24 end
      M C 2 M D Z C S text_write M I -9841 A I C W I 95 O S P
 tc_cancel:
      R E 68 N E 4 J http_ok R E 69 N E 91 J http_ok M A 1 O S P
 tc_abort: M A -133
 tc_fail:
      U S A C S dns_client_cancel R E st_state ifn E 6 M A 1 C S stream_abort end O S A O S P
 tc_bad: M A -137 O S P
 tc_scheme: "http://"
 tc_banner: "Native echo. F1 disconnect.\n"
