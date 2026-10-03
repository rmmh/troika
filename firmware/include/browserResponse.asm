; Resident HTTP -> compiler-phase response loading. Compiler image must already
; occupy image_slot; no nested image_call may surround these entrypoints.
; browser_response_begin(): invalidate old page and initialize HTTP response.
; browser_response_step(): consume at most one held stream DATA; A=0 pending,
; 1 accepted after EOF, negative sticky failure. Caller services networking.
; Acceptance seals the page and commits origin, but never invokes LOAD.
$br_phase: 2500
$br_started: 2501
$br_count: 2502
$br_status: 2503
browser_response_begin:
      R E h_active N E Z J http_busy R E im_busy N E Z J pp_busy
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      W pp_valid Z W f_ready Z W f_action Z
      W br_started Z W br_status Z W br_phase 1
      M A 1 C S http_init N A Z J br_fail J pp_ok
browser_response_step:
      R E br_phase N E 1 J br_result
      C S stream_peek ifl A Z J br_fail end
      ifn B Z
        W br_count B C S http_feed N A Z J br_fail
        R A br_count C S stream_consume N A Z J br_fail J pp_ok
      end
      N C 1 J pp_ok
      M A 5711 M B 1 C S stream_read ifl A Z J br_fail end
      C S http_eof N A Z J br_fail
      C S br_init N A Z J br_fail
      M A Z M B 2 C S image_call N A Z J br_fail
      C S url_commit N A Z J br_fail
      W br_phase 2 W br_status 1 M A 1 O S P
br_result: R A br_status O S P
br_fail: W br_status A W br_phase -1 J pp_fail
; HTTP callback is resident: every body cell dispatches into the compiler slot.
http_body:
      U S A C S br_init O S C N A Z O S P
      M A Z M B 3 J image_call
br_init:
      R E br_started N E Z J pp_ok
      R C h_type
      R E h_status ifn E 200 ifg C 1 J br_type end end
      ife C Z R E h_length N E Z J br_type M C 1 end
      ifl C 1 J br_type end ifg C 2 J br_type end
      M A Z M B Z C S image_call N A Z O S P
      W br_started 1 J pp_ok
br_type: M A -130 O S P
