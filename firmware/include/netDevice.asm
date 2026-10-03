; Native NIC driver. A=243-tryte buffer, B=register base (95 Q / 122 R).
; net_send copies into hardware staging, net_receive copies and TAKEs one frame.
; A=result; B and I..L preserved; C..H clobbered. Never owns retry state.
; net_clock: A=three-tryte destination, B=base; reads one latched tick tuple.
net_send:
      E B 95 J net_send_base_ok
      N B 122 J net_bad_interface
net_send_base_ok:
      M F B
      I F 3
      R E F
      E E Z J net_link_down
      I F 2
      R E F
      N E Z J net_tx_busy
      I F 1
      W F Z
      I F 1
      M C A
      M D 243
net_send_copy:
      R E C
      W F E
      I C 1
      I D -1
      N D Z J net_send_copy
      I F 3
      W F 1
      I F 3
      R A F
      O S P
net_receive:
      E B 95 J net_receive_base_ok
      N B 122 J net_bad_interface
net_receive_base_ok:
      M F B
      I F 4
      R E F
      E E Z J net_rx_empty
      I F 4
      W F Z
      I F 1
      M C A
      M D 243
net_receive_copy:
      R E F
      W C E
      I C 1
      I D -1
      N D Z J net_receive_copy
      I F 1
      W F 2
      I F 3
      R A F
      O S P
net_clock:
      E B 95 J net_clock_base_ok
      N B 122 J net_bad_interface
net_clock_base_ok:
      M F B
      A F 15
      M C 3
net_clock_copy:
      R E F
      W A E
      I A 1
      I F 1
      I C -1
      N C Z J net_clock_copy
      M A Z
      O S P
net_bad_interface: M A -6 O S P
net_link_down: M A -2 O S P
net_tx_busy: M A -1 O S P
net_rx_empty: M A -4 O S P
