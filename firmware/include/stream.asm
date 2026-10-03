; Native stream connection/handshake core. Requires common network/serial.
; Payload delivery and half-close are implemented separately; this module alone
; does not constitute the complete reliable stream in transport.txt.
; All routines are caller-saved. One interface and one active connection.
$st_state: 2380
$st_listener: 2381
$st_own: 2382
$st_peer: 2385
$st_local_port: 2388
$st_peer_port: 2389
$st_a: 2390
$st_b: 2393
$st_send_next: 2396
$st_receive_next: 2397
$st_last_received: 2398
$st_tx_closed: 2399
$st_rx_closed: 2400
$st_tx_kind: 2401
$st_tx_waiting: 2402
$st_tx_sends: 2403
$st_tx_until: 2404
$st_tx_retry: 2407
$st_close_until: 2410
$st_closing: 2413
$st_rx_left: 2414
$st_rx_pointer: 2415
$st_rx_sequence: 2416
$st_eof: 2417
$st_status: 2418
$st_wire_owner: 2423
$st_tombstone_until: 2425
$st_role: 2439
$st_control: 2440
$st_control_ready: 2441
$st_frame: 2442
$st_control_header: 2443
$st_frame_kind: 2471
; States: 0 closed, 1 OPEN-SENT, 2 durable B pending, 3 OPEN-RECEIVED,
; 4 established, 5 closing, 6 tombstone. Role 1 active, 2 passive.

; A=port (0 disables listener). Does not disturb an existing connection.
stream_listen:
      L A Z J stream_bad
      W st_listener A
      M A Z O S P
; A=peer address pointer, B=peer port, C=local port.
stream_connect:
      R E st_state N E Z J net_tx_busy
      R E net_pending N E Z J net_tx_busy
      ifl B 1 J stream_bad end
      ifl C 1 J stream_bad end
      W st_peer_port B W st_local_port C
      M I A
      M F A C S frame_tuple_zero E A 1 J net_no_route
      M A st_peer M B I M C 3 C S net_copy
      C S stream_new N A Z O S P
      C S serial_alloc
      ifn D Z M A D O S P end
      W st_a A W 2391 B W 2392 C
      W st_role 1 W st_state 1
      M A 1580 M B 1 C S stream_frame_build
      J stream_arm
stream_bad: M A -60 O S P
stream_new:
      R E net_iface_count N E 1 J net_bad_interface
      M F 2067 C S frame_tuple_zero E A 1 J net_no_route
      M A st_a M C 29 C S net_zero
      W st_send_next 1 W st_receive_next 1
      W st_wire_owner Z W st_control Z W st_control_ready Z
      M A st_own M B 2067 M C 3 C S net_copy
      M A Z O S P
; A=frame destination, B=kind; constructs all common stream header fields.
stream_frame_build:
      W st_frame A W st_frame_kind B
      M C 243 C S net_zero
      R I st_frame M I/0 1 M I/1 3 M I/14 27
      M A I I A 8 M B st_own M C 6 C S net_copy
      R A st_frame A A 15 M B st_local_port M C 8 C S net_copy
      R I st_frame R E st_frame_kind M I/25 E
      R A st_frame O S P
stream_arm:
      C S net_now
      M A net_tick M B 729 M C st_tx_until C S net_add_ticks
      N A Z J stream_fail
      M A st_tx_retry M B net_tick M C 3 C S net_copy
      R E 1605 W st_tx_kind E
      W st_tx_waiting 1 W st_tx_sends Z
      M A Z O S P
; Release retained handshake/data without changing buffers or control state.
stream_release_tx:
      W st_tx_waiting Z
      R E st_wire_owner
      ife E 1
        W st_wire_owner Z W net_pending Z W net_resolving Z
      end
      M A Z O S P
stream_established:
      C S stream_release_tx
      W st_state 4 W st_status 1
      M A Z O S P
; A=negative failure. Application reads st_status; no implicit EOF on failure.
stream_fail:
      W st_status A W st_state Z W st_tx_waiting Z
      R E st_wire_owner
      ifn E Z W net_pending Z W net_resolving Z end
      W st_wire_owner Z W st_control Z W st_control_ready Z
      O S P

; A=control frame pointer, B=priority (1 rejection, 2 handshake).
; Header+one RESET payload cell are budgeted state; all remaining cells are zero.
stream_queue_control:
      R E st_control
      ifge E B M A Z O S P end
      W st_control B
      M B A M A st_control_header M C 28 C S net_copy
      W st_control_ready Z
      R E st_wire_owner
      ife E 2 W st_wire_owner Z W net_pending Z W net_resolving Z end
      M A Z O S P
stream_queue_ack_zero:
      M A 1823 M B 3 C S stream_frame_build
      M A 1823 M B 2 C S stream_queue_control
      J stream_drop
stream_service:
      C S net_now
      R E st_state
      ifn E Z
        M A st_own M B 2067 C S wide_compare
        ifn A Z M A -66 J stream_fail end
        R F net_ifaces I F 3 R E F
        ife E Z M A -66 J stream_fail end
      end
      R E st_tx_waiting
      ifn E Z
        M A net_tick M B st_tx_until C S wide_compare
        ifge A Z M A -62 J stream_fail end
        R E st_tx_sends
        ifge E 3
          M A net_tick M B st_tx_retry C S wide_compare
          ifge A Z M A -62 J stream_fail end
        end
      end
      R E st_state
      ife E 2
        C S serial_alloc
        E D -1 J stream_service_wire
        ifn D Z M A D J stream_fail end
        W st_b A W 2394 B W 2395 C
        W st_state 3
        M A 1580 M B 2 C S stream_frame_build
        W st_tx_kind 2
        ; Existing reservation deadline is not restarted after durable B work.
        C S net_now
        M A net_tick M B st_tx_until C S wide_compare
        ifge A Z M A -62 J stream_fail end
      end
stream_service_wire:
      R E st_wire_owner
      ifn E Z
        C S net_service
        E A Z O S P
        ifl A Z
          R E st_wire_owner
          E E 1 J stream_fail
          W st_control Z W st_control_ready Z W st_wire_owner Z
          J net_no_input
        end
        W st_wire_owner Z
        ife A 1
          R E st_tx_sends I E 1 W st_tx_sends E
          M A net_last_sent M B 243 M C st_tx_retry C S net_add_ticks
          N A Z J stream_fail
          J net_no_input
        end
        W st_control_ready 1
      end
      R E st_control
      ifn E Z
        R E st_control_ready
        ifn E Z
          M A net_tick M B 2082 C S wide_compare
          ifge A Z W st_control_ready Z end
        end
        R E st_control_ready
        ife E Z
          M A 2454 M B net_ifaces C S net_control_to
          E A -1 J net_no_input
          ifn A Z W st_control Z J net_no_input end
          W st_wire_owner 2
          J net_no_input
        end
        M A 1823 M C 243 C S net_zero
        M A 1823 M B st_control_header M C 28 C S net_copy
        M A 1828 M B 2079 M C 3 C S net_copy
        M A 1823 R B net_ifaces C S net_send
        E A -1 J net_no_input
        W st_control Z W st_control_ready Z
        J net_no_input
      end
      R E st_state E E 2 J net_no_input
      R E st_tx_waiting E E Z J net_no_input
      R E st_tx_sends ifge E 3 J net_no_input end
      M A net_tick M B st_tx_retry C S wide_compare
      E A -1 J net_no_input
      W 1594 27
      M A 1580 M B net_ifaces C S net_begin_send
      E A -1 J net_no_input
      N A Z J stream_fail
      W st_wire_owner 1
      M A Z O S P

; Handshake ingress consumes handled packets. A=2 means a matched DATA/FIN/ACK
; remains owned for the payload/close layer, including implicit confirmation.
stream_handshake_input:
      R I net_input
      N I/1 3 J stream_drop
      R E net_input_iface N E net_ifaces J stream_drop
      M A I I A 11 M B 2067 C S wide_compare
      N A Z J stream_drop
      R I net_input
      E I/25 1 J stream_open_input
      R E st_state E E Z J stream_drop
      C S stream_match N A Z J stream_drop
      R I net_input
      E I/25 6 J stream_reset_input
      R E st_state
      ife E 1
        N I/25 2 J stream_drop
        M A st_b M B I A B 20 M C 3 C S net_copy
        C S stream_established
        J stream_queue_ack_zero
      end
      E E 2 J stream_drop
      M A I A A 20 M B st_b C S wide_compare
      N A Z J stream_drop
      R I net_input
      E I/25 2 J stream_duplicate_open_ack
      R E st_state
      ife E 3
        E I/25 3 J stream_confirm_ack
        E I/25 4 J stream_confirm_payload
        N I/25 5 J stream_drop
stream_confirm_payload:
        N I/23 1 J stream_drop
        C S stream_established
      end
      M A 2 O S P
stream_confirm_ack:
      N I/24 Z J stream_drop
      C S stream_established
      J stream_drop
stream_duplicate_open_ack:
      R E st_role N E 1 J stream_drop
      J stream_queue_ack_zero
stream_reset_input:
      R E st_state
      ife E 1
        M F I A F 20 C S frame_tuple_zero
        N A 1 J stream_drop
      else
        M A I A A 20 M B st_b C S wide_compare
        N A Z J stream_drop
      end
      R I net_input M E I/27 W 2473 E
      M A -61 C S stream_fail
      J stream_drop
stream_open_input:
      R E st_state
      ifn E Z
        R E st_role N E 2 J stream_busy
        C S stream_match N A Z J stream_busy
        R E st_state
        E E 2 J stream_drop
        ife E 3
          ; Coalesce a repeated OPEN into the current bounded OPEN-ACK retry.
          R E st_tx_sends ifge E 3 J stream_drop end
          C S net_now M A st_tx_retry M B net_tick M C 3 C S net_copy
          J stream_drop
        end
        N E 4 J stream_busy
        M A 1823 M B 2 C S stream_frame_build
        M A 1823 M B 2 C S stream_queue_control
        J stream_drop
      end
      R E st_listener
      E E Z J stream_refused
      R I net_input N I/16 E J stream_refused
      C S stream_new
      N A Z J stream_refused
      R I net_input
      M A st_peer M B I I B 8 M C 3 C S net_copy
      M E I/16 W st_local_port E M E I/15 W st_peer_port E
      M A st_a M B I A B 17 M C 3 C S net_copy
      W st_state 2 W st_role 2
      ; B reservation has a deadline even if a filesystem handle delays it.
      C S stream_arm
      J stream_drop
stream_refused: M A 1 J stream_reject
stream_busy: M A 2
stream_reject:
      W 2472 A
      C S net_reverse
      M A 1843 M C 3 C S net_zero
      W 1848 6 W 1849 1
      R E 2472 W 1850 E
      M A 1823 M B 1 C S stream_queue_control
      J stream_drop
stream_match:
      R I net_input
      M A I I A 8 M B st_peer C S wide_compare
      N A Z O S P
      M E I/15 R F st_peer_port N E F J stream_mismatch
      M E I/16 R F st_local_port N E F J stream_mismatch
      M A I A A 17 M B st_a C S wide_compare
      O S P
stream_mismatch: M A 1 O S P
stream_drop:
      C S net_discard_input
      M A Z O S P
