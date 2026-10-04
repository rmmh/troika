; Native IRC program overlay: DHCP, routed CHAT/1, text UI, no HTTP or Forth.
$ic_event: 5262
$ic_input: 5263
$ic_status: 5264
$ic_room: 5265
$ic_record: 5266
$ic_left: 5267
$ic_cursor: 5268
$ic_exit: 5269
irc_entry:
      W 2532 3
      M S 5710 W net_ifaces 95 W net_iface_count 1 W 2545 1
      W block_service_vector @irc_network C S dhcp_client_start ifl A Z J irc_failed end
irc_boot: C S irc_network R E dhcpc_state N E 3 J irc_boot
      ; A fresh source port separates a restarted program from old cached replies.
      ; Never wrap this short port into a live/tombstoned session identity.
      C S serial_alloc ifn D Z M A D J irc_failed end
      N A Z J irc_ports_full N B Z J irc_ports_full ifle C Z J irc_ports_full end W cc_port C
      R E 2069 W cc_host E W cc_room 1 W cc_nick_len 5
      M A cc_nick M B @ic_nick M C 5 C S net_copy
      C S chat_client_init W 2504 12 W 2505 Z W ic_event -1 W ic_exit Z C S net_wait_init
irc_loop:
      W 2505 Z
      C S irc_network C S chat_client_keys
      R E ic_exit
      ife E 1 R E cc_pending ife E Z
        R E cc_joined ife E Z J irc_leave end
        M A 4 R B cc_room M C Z M D Z C S cc_start W ic_exit 2
      end end
      R E ic_exit ife E 2 R E cc_pending E E Z J irc_leave R E cc_status E E -8 J irc_leave end
      R E ic_exit E E Z C S chat_client_queue
      C S chat_client_service C S irc_draw W 2505 1 M A 6561 C S net_wait J irc_loop
irc_leave:
      C S net_service R E net_pending N E Z J irc_leave R E 100 N E Z J irc_leave
      W block_service_vector Z W 2506 Z J program_menu
chat_client_program_exit:
      W cc_q_count Z W cc_q_head 3000 W cc_q_tail 3000 W ic_exit 1 O S P
irc_network:
      C S net_echo_service C S net_poll
      ifg A Z
        C S dhcp_client_input C S net_echo_input
        ife A Z C S chat_client_input C S net_discard_input end
      end
      C S dhcp_client_service O S P
dhcp_lease_lost: W cc_status -8 W cc_joined Z W cc_pending Z O S P
; Bot hooks are intentionally absent from this human-facing program.
chat_bot_input: O S P
irc_ports_full: M A -32
irc_failed: W 2506 A J program_menu
irc_draw:
      R E cc_cursor R F ic_event ife E F
        R E cc_input_len R F ic_input ife E F
          R E cc_status R F ic_status ife E F R E cc_room R F ic_room E E F O S P end
        end
      end
      R E cc_cursor W ic_event E R E cc_input_len W ic_input E R E cc_status W ic_status E R E cc_room W ic_room E
      W Z 0sDMT W -3659 -9841 W -3658 9841 M I -9841 M K 729
ic_clear: W I 32 I I 1 I K -1 N K Z J ic_clear
      M A @ic_heading M B @ic_heading_end S B A M C Z M D Z C S text_write W ic_cursor C
      R E cc_room A E 48 W -9832 E
      R E cc_log_count ifg E 6 M E 6 end W ic_left E P E 81 R F cc_log_head S F E ifl F 7007 A F 2187 end W ic_record F
ic_history:
      R E ic_left E E Z J ic_prompt
      R I ic_record M A I I A 3 M B I/2 R C ic_cursor M D Z C S text_write
      U S C M A @ic_colon M B 2 O S C M D Z C S text_write
      R I ic_record M A I A A 16 M B I/15 M D Z C S text_write
      M A @ic_lf M B 1 M D Z C S text_write W ic_cursor C
      R E ic_record A E 81 E E 9194 M E 7007 W ic_record E
      R E ic_left I E -1 W ic_left E J ic_history
ic_prompt:
      M A cc_line R B cc_input_len ifg B 78 M E B S E 78 A A E M B 78 end
      M C 650 M D Z C S text_write W -9193 62 W -9192 32 O S P
ic_nick: "guest"
ic_heading: "IRC room 1\n/join N /say TEXT /quit\nF2: programs\n"
ic_heading_end:
ic_colon: ": "
ic_lf: 27
