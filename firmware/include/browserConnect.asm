; Connect the immutable pending URL using native DNS and reliable streams.
; browser_connect_begin(A=local port), browser_connect_step():
; A=0 pending, 1 established, negative error. Caller dispatches ingress to
; DNS/stream handlers and services networking. No origin commit or HTTP I/O.
; Resolve the action target before begin, but prepare headers only afterwards:
; DNS normalization uses the same scratch as HTTP header generation.
$bc_phase: 2493
$bc_local: 2494
$bc_port: 2495
$bc_address: 2496
$bc_status: 2499
browser_connect_begin:
      R E bc_phase ifge E 1 ifle E 3 J net_tx_busy end end
      R E st_state ifn E Z N E 6 J net_tx_busy end
      R E dnsc_state N E Z J net_tx_busy
      R E net_pending N E Z J net_tx_busy
      R E url_valid N E 1 J bc_bad ifl A 1 J bc_bad end
      W bc_local A R E url_port W bc_port E W bc_status Z
      R E url_kind
      ife E 1
        M A bc_address M B url_address M C 3 C S net_copy
        W bc_phase 2 J browser_connect_step
      end
      M A url_host R B url_host_len C S dns_client_begin
      ifl A Z J bc_fail end W bc_phase 1
      E A 1 J bc_resolved J bc_pending
browser_connect_step:
      R E bc_phase
      E E Z J bc_result E E 4 J bc_result
      ife E 1
        C S dns_client_service ifl A Z J bc_fail end
        E A Z J bc_pending
bc_resolved:
        M A bc_address M B dnsc_address M C 3 C S net_copy W bc_phase 2
      end
      R E bc_phase
      ife E 2
        M A bc_address R B bc_port R C bc_local C S stream_connect
        E A -1 J bc_pending ifl A Z J bc_fail end W bc_phase 3
      end
      C S stream_service
      R A st_status ifl A Z J bc_fail end
      R E st_state N E 4 J bc_pending
      W bc_phase 4 W bc_status 1 M A 1 O S P
bc_pending: M A Z O S P
bc_result: R A bc_status O S P
bc_bad: M A -128 O S P
bc_fail: W bc_status A W bc_phase Z O S P
