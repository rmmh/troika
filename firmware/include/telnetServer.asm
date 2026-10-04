; Three independent byte-echo connections over native streams, port 23.
; RX is consumed only after its bytes are copied into that slot's retained TX.
; No application queues, line buffers, or host callbacks are needed.
$ts_iter: 2320
$ts_count: 2321
$ts_echo_owner: 2322
telnet_server_init:
      C S serial_refill N A Z O S P
      M A 23 C S mux_init W ts_echo_owner -1
      W mx_protocol @telnet_protocol W mx_service @telnet_transport
      J net_wait_init
telnet_server_step:
      C S mux_step W ts_iter Z
ts_next:
      R A ts_iter C S mux_select
      R E st_state ifl E 4 J ts_advance end ifg E 5 J ts_advance end
      C S stream_peek ifl A Z J ts_advance end
      ifn B Z
        W ts_count B C S stream_send N A Z J ts_advance
        R A ts_count C S stream_consume
      end
      R E st_rx_closed ifn E Z C S stream_shutdown end
ts_advance:
      R E ts_iter I E 1 W ts_iter E N E 3 J ts_next O S P
telnet_server_wait:
      R E echo_pending N E Z M A 6561 N E Z J net_wait
      M K Z
ts_idle:
      M I 2380 R E mx_current
      ifn K E M I mx_locations A I K R I I A I 518 end
      R E I ifn E Z ifn E 6 ifn E 4 M A 6561 J net_wait end end end
      ; Established idle streams have no deadline. Only retained TX, unread
      ; application data or control/resolution work requires a timer wakeup.
      M E I/22 N E Z M A 6561 N E Z J net_wait
      M E I/34 N E Z M A 6561 N E Z J net_wait
      A I 60 R E I N E Z M A 6561 N E Z J net_wait
      M I 2125 R E mx_current
      ifn K E M I mx_locations A I K R I I A I 486 end
      R E I N E Z M A 6561 N E Z J net_wait
      I K 1 N K 3 J ts_idle M A Z J net_wait
telnet_protocol:
      M I A N I/1 4 J net_no_input N I/25 1 J net_no_input
      R E ts_echo_owner ife E -1 R E mx_current W ts_echo_owner E end
      M A E C S mux_select C S mux_ingress C S net_echo_input O S P
telnet_transport:
      R E ts_echo_owner R F mx_current N E F O S P
      C S net_echo_service R E echo_pending E E Z W ts_echo_owner -1 O S P
