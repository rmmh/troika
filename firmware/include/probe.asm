; Exclusive native ICMP probe, suitable for a disk-loaded console phase.
; begin(A=destination tuple,B=hop limit 1..27), service(): 0 pending,
; 1 echo, 3 unreachable, 4 time exceeded, negative failure. input() returns
; 1 for a matched reply (consumed), 0 otherwise. Caller validates ingress and
; services configuration, then dispatches input before discarding other frames.
; No active stream/RX/TX/DNS operation may share the application buffers.
; Uses inactive Forth state 5225..5249, no payload/log buffer. Echo payload is empty.
$pg_state: 5225
$pg_result: 5226
$pg_code: 5227
$pg_target: 5228
$pg_own: 5231
$pg_serial: 5234
$pg_until: 5237
$pg_reporter: 5240
$pg_started: 5243
$pg_finished: 5246
$pg_hops: 5249
probe_begin:
      R E pg_state ifge E 1 ifle E 2 J net_tx_busy end end
      R E net_pending N E Z J net_tx_busy
      R E net_rx_owned N E Z J net_tx_busy
      R E 2380 ifn E Z N E 6 J net_tx_busy end
      R E 2290 N E Z J net_tx_busy
      R E 2402 N E Z J net_tx_busy
      R E 2423 N E Z J net_tx_busy
      R E 2440 N E Z J net_tx_busy
      ifl B 1 J probe_bad end ifg B 27 J probe_bad end
      M K A M F A C S frame_tuple_zero E A 1 J probe_bad
      W pg_state Z W pg_hops B
      M B K M A pg_target M C 3 C S net_copy
      M A pg_own M B 2067 M C 3 C S net_copy
      C S serial_alloc ifn D Z M A D J probe_fail end
      W pg_serial A W 5235 B W 5236 C
      M A 1580 M C 243 C S net_zero
      W 1580 1 W 1581 4 R E pg_hops W 1594 E W 1605 1
      M A 1588 M B pg_own M C 3 C S net_copy
      M A 1591 M B pg_target M C 3 C S net_copy
      M A 1597 M B pg_serial M C 3 C S net_copy
      C S net_now M A net_tick M B 972 M C pg_until C S net_add_ticks
      N A Z J probe_fail
      M A 1580 M B net_ifaces C S net_begin_send N A Z J probe_fail
      M A pg_reporter M C 9 C S net_zero
      W pg_code Z W pg_result Z W pg_state 1 M A Z O S P
probe_service:
      R E pg_state ifl E 1 J probe_result end ifg E 2 J probe_result end
      M A pg_own M B 2067 C S wide_compare N A Z J probe_changed
      R F net_ifaces I F 3 R E F E E Z J probe_changed
      C S net_now M A net_tick M B pg_until C S wide_compare
      ifge A Z M A -141 J probe_fail end
      R E pg_state
      ife E 1
        C S net_service ifl A Z J probe_fail end E A Z O S P
        M A pg_started M B net_last_sent M C 3 C S net_copy W pg_state 2
      end
      M A Z O S P
probe_input:
      C S probe_service
      R E pg_state N E 2 J probe_ignore
      R E net_input_iface N E net_ifaces J probe_ignore
      R I net_input N I/1 4 J probe_ignore
      M A I A A 17 M B pg_serial C S wide_compare N A Z J probe_ignore
      R A net_input I A 11 M B pg_own C S wide_compare N A Z J probe_ignore
      R I net_input
      M E I/25
      ife E 2
        N I/26 Z J probe_ignore
        M A I I A 8 M B pg_target C S wide_compare N A Z J probe_ignore
        M A 1
      else
        M E I/25 ifl E 3 J probe_ignore end
        ; Match the quoted request, ignoring hop/link fields changed by routers.
        N I/29 4 J probe_ignore N I/43 Z J probe_ignore N I/44 Z J probe_ignore
        N I/48 Z J probe_ignore N I/49 Z J probe_ignore N I/50 Z J probe_ignore
        N I/51 Z J probe_ignore N I/52 Z J probe_ignore
        N I/53 1 J probe_ignore N I/54 Z J probe_ignore
        M E I/42 R F pg_hops ifg E F J probe_ignore end
        M A I A A 36 M B pg_own C S wide_compare N A Z J probe_ignore
        R A net_input A A 39 M B pg_target C S wide_compare N A Z J probe_ignore
        R I net_input M E I/27 W pg_code E M A I/25
      end
      W pg_result A W pg_state 3
      R B net_input I B 8 M A pg_reporter M C 3 C S net_copy
      C S net_now M A pg_finished M B net_tick M C 3 C S net_copy
      C S net_discard_input M A 1 O S P
probe_ignore: M A Z O S P
probe_changed: M A -142
probe_fail:
      R E pg_state
      ifge E 1 ifle E 2 W net_pending Z W net_resolving Z end end
      W pg_result A W pg_state 3 O S P
probe_bad: M A -140 O S P
probe_result: R A pg_result O S P
