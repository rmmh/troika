; Standalone native terminal controller. No HTTP, browser, page or Forth runtime.
; Common network/filesystem core and terminal client code may later be replaced
; as a program overlay. TextDevice commands stay entirely on this CPU.
$terminal_length: 2520
terminal_entry:
      M S 5710 W net_ifaces 95 W net_iface_count 1
      W serial_unit Z W serial_volume Z W 2544 Z W 2545 1
      W block_service_vector Z M B Z C S fs_mount N A Z J terminal_failed
      C S fs_check N A Z J terminal_failed
      W block_service_vector @terminal_network
      C S dhcp_client_start ifl A Z J terminal_failed end
terminal_boot:
      C S terminal_network R E dhcpc_state N E 3 J terminal_boot
terminal_prompt:
      W terminal_length Z W 2514 Z W 2504 10 W 2505 1
      W Z 0sDMT W -3659 -9841 W -3658 9841
      M I -9841 M K 729
terminal_clear: W I 32 I I 1 I K -1 N K Z J terminal_clear
      M A @terminal_heading M B 30 M C Z M D Z C S text_write
terminal_keys:
      C S terminal_network W 2514 1 R E 68 N E 4 J terminal_keys W 2514 Z R E 69
      E E 88 J terminal_connect E E 27 J terminal_connect
      ife E 86 R F terminal_length ifg F Z I F -1 W terminal_length F end J terminal_draw end
      ifl E -40 J terminal_keys end ifg E 57 J terminal_keys end E E Z J terminal_keys E E 54 J terminal_keys
      R F terminal_length ifge F 54 J terminal_keys end M I 2552 A I F W I E I F 1 W terminal_length F
terminal_draw:
      M I -9787 M K 81
terminal_blank: W I 32 I I 1 I K -1 N K Z J terminal_blank
      M A 2552 R B terminal_length M C 54 M D Z C S text_write J terminal_keys
terminal_connect:
      W 2505 Z M C 2552 R D terminal_length C S phase_entry W 2506 A
      J terminal_prompt
terminal_network:
      C S net_poll
      ifg A Z C S dhcp_client_input C S dns_client_input C S stream_input E A 2 C S net_discard_input end
      C S dhcp_client_service C S dns_client_service C S stream_service O S P
dhcp_lease_lost: C S dns_client_cancel M A 6 J stream_abort
terminal_failed: W 2506 A W 2504 -2 H 0sAAA Z
terminal_heading: "Native terminal\nHost (Enter):\n"
