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
$br_download: 2506
browser_response_begin:
      R E h_active N E Z J http_busy R E im_busy N E Z J pp_busy
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      W br_download Z W pp_valid Z W f_ready Z W f_action Z
      J br_http_init
; Download image must be installed. A=stable destination path,B=length.
browser_download_response_begin:
      R E h_active N E Z J http_busy R E im_busy N E Z J pp_busy
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      W br_download 1 M C A M D B M A Z M B 4 C S image_call N A Z J br_fail
br_http_init:
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
      R E br_download ifn E Z
        M A Z M B 6 C S image_call N A Z J br_fail J br_accepted
      end
      C S br_init N A Z J br_fail
      M A Z M B 2 C S image_call N A Z J br_fail
      C S url_commit N A Z J br_fail
br_accepted:
      W br_phase 2 W br_status 1 M A 1 O S P
br_result: R A br_status O S P
br_fail:
      W br_status A W br_phase -1 R E br_download
      ifn E Z U S A M A Z M B 7 C S image_call O S A O S P end
      J pp_fail
; HTTP callback is resident: every body cell dispatches into the compiler slot.
http_body:
      R E br_download ifn E Z M C A M A Z M B 5 J image_call end
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
