; Native one-query DNS client. Requires dns + common network/serial modules.
; Call dns_client_begin(A=name,B=length), then poll/consume received frames,
; call dns_client_input for ingress, and dns_client_service each loop.
; begin: 0 pending, 1 cached, negative error. service/input: 0 pending/ignored,
; 1 resolved, -51 not found, -52 service error, -53 timeout, other driver errors.
; Result is dnsc_address. One query owns retained TX until completion/cancel.
$dnsc_state: 2290
$dnsc_length: 2291
$dnsc_cache_length: 2292
$dnsc_cache_until: 2293
$dnsc_serial: 2296
$dnsc_server: 2299
$dnsc_own: 2302
$dnsc_deadline: 2305
$dnsc_retry: 2308
$dnsc_sends: 2311
$dnsc_queued: 2312
$dnsc_status: 2313
$dnsc_cache_server: 2314
$dnsc_cache_own: 2317
$dnsc_ttl: 2320
$dnsc_name: 6320
$dnsc_cache_name: 6374
$dnsc_address: 6428

dns_client_begin:
      R E dnsc_state
      N E Z J net_tx_busy
      R E net_pending
      N E Z J net_tx_busy
      M C 5711
      C S dns_normalize
      N A Z O S P
      W dnsc_length B
      M C B
      M A dnsc_name
      M B 5711
      C S net_copy
      M F 2067
      C S frame_tuple_zero
      E A 1 J net_no_route
      M F 2073
      C S frame_tuple_zero
      E A 1 J net_no_route
      C S net_now
      N A Z O S P
      R E dnsc_cache_length
      R F dnsc_length
      N E F J dnsc_new_query
      M A net_tick
      M B dnsc_cache_until
      C S wide_compare
      ifge A Z J dnsc_new_query end
      M A 2073
      M B dnsc_cache_server
      C S wide_compare
      N A Z J dnsc_new_query
      M A 2067
      M B dnsc_cache_own
      C S wide_compare
      N A Z J dnsc_new_query
      M A dnsc_name
      M B dnsc_cache_name
      R C dnsc_length
      C S dns_equal
      N A Z J dnsc_new_query
      W dnsc_status 1
      M A 1
      O S P
dnsc_new_query:
      C S serial_alloc
      ifn D Z M A D O S P end
      W dnsc_serial A
      W 2297 B
      W 2298 C
      M A dnsc_server
      M B 2073
      M C 3
      C S net_copy
      M A dnsc_own
      M B 2067
      M C 3
      C S net_copy
      C S net_now
      M A net_tick
      M B 729
      M C dnsc_deadline
      C S net_add_ticks
      N A Z O S P
      M A dnsc_retry
      M B net_tick
      M C 3
      C S net_copy
      W dnsc_sends Z
      W dnsc_queued Z
      W dnsc_state 1
      W dnsc_status Z
      M A Z
      O S P
; Explicit cancellation (for lease/link changes) invalidates the one cached name.
dns_client_cancel:
      W dnsc_cache_length Z
      M A -54
      J dnsc_finish
; All exits release only this query's pending TX; no owned RX is consumed here.
dnsc_finish:
      W dnsc_status A
      W dnsc_state Z
      R E dnsc_queued
      ifn E Z
        W net_pending Z
        W net_resolving Z
      end
      W dnsc_queued Z
      O S P

dns_client_service:
      R E dnsc_state
      ife E Z R A dnsc_status O S P end
      C S net_now
      M A net_tick
      M B dnsc_deadline
      C S wide_compare
      ifge A Z
        M A -53
        J dnsc_finish
      end
      ; Config changes cannot keep a transaction bound to the old lease/server.
      M A 2067
      M B dnsc_own
      C S wide_compare
      N A Z J dns_client_cancel
      M A 2073
      M B dnsc_server
      C S wide_compare
      N A Z J dns_client_cancel
      R E dnsc_queued
      ifn E Z
        C S net_service
        L A Z J dnsc_finish
        N A 1 J net_no_input
        W dnsc_queued Z
        R E dnsc_sends
        I E 1
        W dnsc_sends E
        M A net_last_sent
        M B 243
        M C dnsc_retry
        C S net_add_ticks
        N A Z J dnsc_finish
        J net_no_input
      end
      R E dnsc_sends
      ifge E 3 J net_no_input end
      M A net_tick
      M B dnsc_retry
      C S wide_compare
      E A -1 J net_no_input
      ; Reconstruct identical query fields from guest state on each attempt.
      M A 1823
      M C 243
      C S net_zero
      W 1823 1
      W 1824 2
      M A 1831
      M B dnsc_own
      M C 3
      C S net_copy
      M A 1834
      M B dnsc_server
      M C 3
      C S net_copy
      W 1837 27
      W 1838 243
      W 1839 53
      M A 1840
      M B dnsc_serial
      M C 3
      C S net_copy
      R E dnsc_length
      W 1852 E
      I E 3
      W 1849 E
      W 1850 1
      W 1851 1
      M A 1853
      M B dnsc_name
      R C dnsc_length
      C S net_copy
      M A 1823
      M B net_ifaces
      C S net_begin_send
      N A Z J dnsc_finish
      W dnsc_queued 1
      M A Z
      O S P

; Input must already pass frame_validate. Never extends a timer on ingress.
dns_client_input:
      R E dnsc_state
      E E Z J net_no_input
      R I net_input
      N I/1 2 J net_no_input
      N I/15 53 J net_no_input
      N I/16 243 J net_no_input
      R E net_input_iface
      N E net_ifaces J net_no_input
      M A I
      I A 8
      M B dnsc_server
      C S wide_compare
      N A Z J net_no_input
      M A I
      I A 11
      M B dnsc_own
      C S wide_compare
      N A Z J net_no_input
      M A I
      A A 17
      M B dnsc_serial
      C S wide_compare
      N A Z J net_no_input
      N I/27 1 J net_no_input
      N I/28 2 J net_no_input
      R E dnsc_length
      N E I/34 J net_no_input
      I E 8
      N E I/26 J net_no_input
      M A I
      A A 35
      M B dnsc_name
      R C dnsc_length
      C S dns_equal
      N A Z J net_no_input
      ; Same deadline rule as service, even if a late packet is polled first.
      C S net_now
      M A net_tick
      M B dnsc_deadline
      C S wide_compare
      ifge A Z J net_no_input end
      M A 2067
      M B dnsc_own
      C S wide_compare
      N A Z J dns_client_cancel
      M A 2073
      M B dnsc_server
      C S wide_compare
      N A Z J dns_client_cancel
      R I net_input
      M E I/29
      ifl E Z J net_no_input end
      ifg E 2 J net_no_input end
      E E Z J dnsc_found
      N I/33 Z J net_no_input
      M F I
      A F 30
      C S frame_tuple_zero
      N A 1 J net_no_input
      M A -51
      E I/29 2 M A -52
      J dnsc_finish
dnsc_found:
      M E I/33
      ifl E 1 J net_no_input end
      W dnsc_ttl E
      M F I
      A F 30
      C S frame_tuple_zero
      E A 1 J net_no_input
      ; Publish cache only after expiry computation and complete validation.
      W dnsc_cache_length Z
      M A net_tick
      R B dnsc_ttl
      M C dnsc_cache_until
      C S net_add_ticks
      N A Z J dnsc_finish
      M A dnsc_address
      R B net_input
      A B 30
      M C 3
      C S net_copy
      M A dnsc_cache_name
      M B dnsc_name
      R C dnsc_length
      C S net_copy
      M A dnsc_cache_server
      M B dnsc_server
      M C 6
      C S net_copy
      R E dnsc_length
      W dnsc_cache_length E
      M A 1
      J dnsc_finish
