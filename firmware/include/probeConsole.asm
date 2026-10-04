; Native console ping/trace. C/D is the complete counted command line.
; Runs in the PUT disk phase; browser/page state is already discarded.
; Probe engine owns 5225..5249; this UI uses 5250..5257 and shared scratch.
$pc_trace: 5250
$pc_hop: 5251
$pc_cursor: 5252
$pc_arg: 5253
$pc_length: 5254
$pc_result: 5255
$pc_rows: 5256
$pc_numeric: 5257
probe_console:
      W 2514 Z
      W pc_trace Z R E C N E 3 W pc_trace 1
      M I C M K D
pc_word:
      E K Z J us_bad R E I E E -27 J pc_spaces I I 1 I K -1 J pc_word
pc_spaces:
      E K Z J us_bad R E I N E -27 J pc_host I I 1 I K -1 J pc_spaces
pc_host:
      ifg K 54 J us_bad end W pc_arg I W pc_length K
      ; Accept a host, not a URL/path/port. Numeric hosts use [AAA.BBB.CCC].
      W pc_numeric Z R E I E E 0s_OH W pc_numeric 1
      M J I M L K
pc_host_chars:
      R E J E E -27 J us_bad E E 22 J us_bad E E 16 J us_bad
      R F pc_numeric ifn F Z ifge E -13 ifle E 13 ifn E Z S E 27 W J E end end end end
      I J 1 I L -1 N L Z J pc_host_chars
      M A 2800 M B @pc_scheme M C 7 C S net_copy
      R B pc_arg R C pc_length C S net_copy W A 22
      M A 2800 R B pc_length I B 8 C S url_parse N A Z O S P
pc_stream_idle:
      C S browser_network
      R E st_state ifn E Z N E 6 J pc_stream_idle end
      R E url_kind ife E 1
        M A pg_target M B url_address M C 3 C S net_copy J pc_resolved
      end
      M A url_host R B url_host_len C S dns_client_begin ifl A Z O S P end
      E A 1 J pc_dns_done
pc_dns:
      C S browser_network R A dnsc_status ifl A Z O S P end
      E A 1 J pc_dns_done C S pc_cancel E A Z J pc_dns J pc_cancelled
pc_dns_done:
      M A pg_target M B dnsc_address M C 3 C S net_copy
pc_resolved:
      C S pc_clear M A @pc_heading M B 20 C S pc_print
      W pc_hop 27 R E pc_trace N E Z W pc_hop 1
pc_next:
      W pg_state Z M A pg_target R B pc_hop C S probe_begin
      ifl A Z W pc_result A J pc_report end
pc_poll:
      C S net_poll
      ifg A Z C S dhcp_client_input C S probe_input C S net_discard_input end
      C S dhcp_client_service C S probe_service
      ifn A Z W pc_result A J pc_report end
      C S pc_cancel E A Z J pc_poll
pc_cancelled:
      W net_pending Z W net_resolving Z C S dns_client_cancel M A -133 O S P
pc_report:
      R F pc_hop C S pc_number M A @pc_space M B 1 C S pc_print
      R E pc_result
      ifg E Z
        R F pg_reporter C S pc_number M A @pc_dot M B 1 C S pc_print
        R F 5241 C S pc_number M A @pc_dot M B 1 C S pc_print
        R F 5242 C S pc_number
      else M A @pc_star M B 1 C S pc_print end
      M A @pc_space M B 1 C S pc_print
      R E pc_result
      M A @pc_timeout E E 1 M A @pc_echo E E 3 M A @pc_unreachable E E 4 M A @pc_exceeded
      M B 2 C S pc_print
      R E pc_trace ife E Z
        R E pc_result ifg E Z
          M A @pc_ticks M B 7 C S pc_print R F 5248 R E 5245 S F E C S pc_number
          M A @pc_lf M B 1 C S pc_print
        end
        J pc_done
      end
      R E pc_result E E 1 J pc_done E E 3 J pc_done
      ifl E Z N E -141 J pc_done end
      R E pc_hop ifge E 27 J pc_done end I E 1 W pc_hop E
      R E pc_rows I E 1 W pc_rows E ifl E 20 J pc_next end
      C S pc_pause N A Z J pc_cancelled C S pc_clear J pc_next
pc_done:
      C S pc_pause N A Z J pc_cancelled R A pc_result ifg A Z M A Z end O S P
; Enter advances/returns; F1 cancels, including during DNS/probe wait.
pc_cancel:
      R E 68 N E 4 J http_ok R E 69 N E 91 J http_ok M A 1 O S P
pc_pause:
      M A @pc_more M B 24 C S pc_print
pc_key:
      W 2514 1 C S browser_network R E 68 N E 4 J pc_key W 2514 Z R E 69
      E E 91 M A 1 E E 91 O S P
      E E 88 J http_ok E E 27 J http_ok J pc_key
pc_clear:
      M I -9841 M K 729
pc_clear_loop: W I 32 I I 1 I K -1 N K Z J pc_clear_loop
      W pc_cursor Z W pc_rows Z O S P
pc_print: R C pc_cursor M D Z C S text_write W pc_cursor C O S P
pc_number:
      M I 5720 M K Z
      M L Z ifl F Z M L 1 F F A end
pc_digit:
      M E F Q E 10 M G E P G 10 ifg G F I E -1 S G 10 end
      S F G A F 28 I I -1 W I F I K 1 M F E N F Z J pc_digit
      ifn L Z I I -1 W I 20 I K 1 end
      M A I M B K J pc_print
pc_ticks: "ticks: "
pc_lf: 27
pc_scheme: "http://"
pc_heading: "hop address E/U/T/*\n"
pc_space: " "
pc_dot: "."
pc_star: "*"
pc_echo: "E\n"
pc_unreachable: "U\n"
pc_exceeded: "T\n"
pc_timeout: "*\n"
pc_more: "Enter: continue F1: exit"
