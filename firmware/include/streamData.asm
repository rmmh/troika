; Native stream DATA, incremental receive, FIN/tombstone and local abort.
; Requires stream.asm. All callbacks execute on this CPU; no host protocol state.

; Preserve A/B/C so a new connect can replace a closed connection's controls.
stream_discard_old_control:
      R E st_wire_owner
      ife E 2 W net_pending Z W net_resolving Z W st_wire_owner Z end
      W st_control Z W st_control_ready Z
      O S P
stream_retire:
      C S stream_discard_old_control
      W st_state Z
      M A Z O S P
; A=source pointer, B=1..216 cells. Return 0 accepted, -1 would-block,
; -60 invalid/state, -63 DATA limit. Caller retains data on every error.
stream_send:
      R E st_state
      E E 4 J stream_send_state
      N E 5 J stream_bad
stream_send_state:
      R E st_tx_closed N E Z J stream_bad
      R E st_tx_waiting N E Z J net_tx_busy
      ifl B 1 J stream_bad end
      ifg B 216 J stream_bad end
      R E st_send_next ifg E 9840 M A -63 O S P end
      ; Reject wrapped spans and any source overlapping retained TX.
      M E A A E B I E -1
      ifl E A J stream_bad end
      ifle A 1822
        ifge E 1580 J stream_bad end
      end
      W st_send_pointer A W st_send_count B
      M A 1580 M B 4 C S stream_frame_build
      R E st_send_next W 1603 E
      R E st_send_count W 1606 E
      M A 1607 R B st_send_pointer R C st_send_count C S net_copy
      J stream_arm
; After outstanding DATA is acknowledged, queue FIN at send-next.
stream_shutdown:
      R E st_tx_closed N E Z J net_no_input
      R E st_state E E 4 J stream_shutdown_state
      N E 5 J stream_bad
stream_shutdown_state:
      R E st_tx_waiting N E Z J net_tx_busy
      M A 1580 M B 5 C S stream_frame_build
      R E st_send_next W 1603 E
      C S stream_start_closing N A Z O S P
      J stream_arm
stream_start_closing:
      R E st_closing N E Z J net_no_input
      C S net_now
      M A net_tick M B 729 M C st_close_until C S net_add_ticks
      N A Z J stream_fail
      W st_closing 1 W st_state 5
      M A Z O S P
; Once both halves close, preserve only identity/final sequence for duplicate FIN.
stream_maybe_closed:
      R E st_tx_closed E E Z J net_no_input
      R E st_rx_closed E E Z J net_no_input
      C S net_now
      M A net_tick M B 729 M C st_tombstone_until C S net_add_ticks
      N A Z J stream_fail
      W st_state 6 W st_closing Z W st_status 2
      M A Z O S P

; A=sequence to acknowledge. Higher-priority payload ACK can replace a queued
; lower-priority rejection/handshake; one latest payload ACK is sufficient.
stream_ack:
      W st_ack_sequence A
      M A 1823 M B 3 C S stream_frame_build
      R E st_ack_sequence W 1847 E
      M A 1823 M B 3
      J stream_queue_control
; Full validated stream ingress. DATA ownership is retained until consume/read.
stream_input:
      R I net_input E I/1 4 J stream_icmp_input
      C S stream_handshake_input
      N A 2 O S P
      R I net_input
      E I/25 5 J stream_fin_input
      R E st_state E E 6 J stream_drop
      E I/25 3 J stream_ack_input
      N I/25 4 J stream_drop
      M E I/23 R F st_last_received
      ife E F
        E E Z J stream_drop
        M A E C S stream_ack
        J stream_drop
      end
      R E st_rx_closed
      ifn E Z M A 3 C S stream_abort J stream_drop end
      R E st_rx_left N E Z J stream_drop
      ; net_poll placed new input in TX scratch when RX was already owned.
      N I 1337 J stream_drop
      M E I/23 R F st_receive_next N E F J stream_drop
      W st_rx_sequence E
      M E I/26 W st_rx_left E
      W st_rx_pointer 1364
      M A 1 O S P
stream_ack_input:
      R E st_tx_waiting E E Z J stream_drop
      R E st_tx_kind
      E E 4 J stream_ack_kind
      N E 5 J stream_drop
stream_ack_kind:
      M E I/24 R F st_send_next N E F J stream_drop
      R E st_tx_kind
      ife E 4
        R E st_send_next I E 1 W st_send_next E
      else
        W st_tx_closed 1
      end
      C S stream_release_tx
      C S stream_maybe_closed
      J stream_drop
stream_fin_input:
      R E st_rx_left N E Z J stream_drop
      M E I/23 R F st_receive_next N E F J stream_drop
      R E st_rx_closed
      ife E Z
        W st_rx_closed 1 W st_eof 1
        C S stream_start_closing
        N A Z J stream_drop
      end
      R A st_receive_next C S stream_ack
      R E st_state N E 6 C S stream_maybe_closed
      J stream_drop

; Peek without copying: A=payload pointer, B=remaining cells, C=EOF pending.
; A negative status is returned in A on failure (B=C=0). EOF is acknowledged
; explicitly by read when there are no remaining bytes.
stream_peek:
      R A st_status
      ifl A Z M B Z M C Z O S P end
      R A st_rx_pointer R B st_rx_left R C st_eof
      O S P
; A=consumed cells, 1..remaining. Only the final consume releases RX and ACKs.
stream_consume:
      ifl A 1 J stream_bad end
      R E st_rx_left ifg A E J stream_bad end
      S E A W st_rx_left E
      R F st_rx_pointer A F A W st_rx_pointer F
      N E Z J net_no_input
      R E st_rx_sequence W st_last_received E
      I E 1 W st_receive_next E
      C S net_consume
      R A st_last_received
      J stream_ack
; A=destination, B=capacity 1..216. A=count/negative error, B=one-time EOF flag.
; Destination must not overlap any network buffer (including a held RX frame).
stream_read:
      ifl B 1 J stream_read_bad end
      ifg B 216 J stream_read_bad end
      M E A A E B I E -1
      ifl E A J stream_read_bad end
      ifle A 2065
        ifge E 1337 J stream_read_bad end
      end
      R E st_status ifl E Z M A E M B Z O S P end
      R E st_rx_left
      ife E Z
        M A Z R B st_eof W st_eof Z
        O S P
      end
      ifg B E M B E end
      W st_read_count B M C B R B st_rx_pointer C S net_copy
      R A st_read_count C S stream_consume
      N A Z O S P
      R A st_read_count M B Z O S P

stream_read_bad: M A -60 M B Z O S P

; A=RESET reason 1..6; immediately free connection and report a local error.
; A copied control header permits best-effort RESET after cleanup. New connection
; attempts may discard this old control without waiting for neighbour resolution.
stream_abort:
      ifl A 1 J stream_bad end
      ifg A 6 J stream_bad end
      W st_abort_reason A W st_abort_allowed Z
      R E st_state
      ifge E 3
        ifle E 5 W st_abort_allowed 1 end
      end
      M A -65
      R E st_abort_reason
      E E 3 M A -64
      E E 5 M A -62
      E E 6 M A -66
      C S stream_fail
      R E st_abort_allowed E E Z J stream_abort_done
      M A st_own M B 2067 C S wide_compare
      N A Z J stream_abort_done
      R F net_ifaces I F 3 R E F E E Z J stream_abort_done
      M A 1823 M B 6 C S stream_frame_build
      W 1849 1 R E st_abort_reason W 1850 E
      M A 1823 M B 4 C S stream_queue_control
stream_abort_done:
      R A st_status O S P

; Correlate a validated ICMP quote with the outstanding retained stream frame.
; Compare end-to-end addresses, ports, both serials, sequence, kind and used;
; link addresses and hop limit may have changed at routers and are excluded.
stream_icmp_input:
      R E st_tx_waiting E E Z J stream_drop
      R E st_tx_sends E E Z J stream_drop
      R E net_input_iface N E net_ifaces J stream_drop
      M E I/25 ifl E 3 J stream_drop end
      M A I I A 11 M B st_own C S wide_compare
      N A Z J stream_drop
      M E I/29 N E 3 J stream_drop
      M A I A A 36 M B 1588 M C 6 C S stream_header_equal
      N A Z J stream_drop
      R A net_input A A 43 M B 1595 M C 12 C S stream_header_equal
      N A Z J stream_drop
      C S net_now C S stream_check_timers
      N A Z J stream_drop
      R I net_input M E I/27 W st_icmp_code E
      M E I/25 W st_icmp_kind E
      M A st_icmp_source M B I I B 8 M C 3 C S net_copy
      R E st_icmp_kind M A -67 E E 4 M A -68
      C S stream_fail
      J stream_drop
stream_header_equal:
      R E A R F B N E F J stream_mismatch
      I A 1 I B 1 I C -1 N C Z J stream_header_equal
      M A Z O S P
