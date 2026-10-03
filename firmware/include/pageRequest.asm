; Deferred action -> request header -> body, using one shared scratch arena.
; page_request_header(): A=status,B=header length,C=5711; moves stage 0 -> 1.
; Send/copy all header cells before page_request_body(): A=status,B=body length,
; C=5711, stage 1 -> 2. GET has zero body. Neither operation performs I/O.
; page_request_clear(): release action/stage after body copied, or cancellation.
; Pending f_action freezes native input editing throughout this sequence.
$pr_stage: 5453
$pr_length: 5454
; Transmission state is cleared here even when helpers are used without sending.
$pr_transmit_phase: 5455
$pr_header_length: 5456
page_request_header:
      C S pr_ready N A Z O S P
      R E pr_stage N E Z J pr_bad
      R E f_action
      ife E 2
        R A f_action_ptr N A 5954 J pr_bad R B f_action_len
        C S url_parse N A Z O S P
        W pr_length Z M A 1 M B Z J pr_header
      end
      N E 1 J pr_bad
      C S page_form_body N A Z O S P W pr_length B
      R K f_records M I 4739
pr_form:
      E K Z J pr_bad R E I E E 5 J pr_target
      A I 18 I K -1 J pr_form
pr_target:
      M A I/1 M B I/2 C S url_parse N A Z O S P
      M A 2 R B pr_length
pr_header:
      C S http_request_header N A Z O S P W pr_stage 1 J pp_ok
page_request_body:
      C S pr_ready N A Z O S P
      R E pr_stage N E 1 J pr_bad
      R E f_action
      ife E 2 M B Z M C 5711 J pr_body_done end
      N E 1 J pr_bad C S page_form_body N A Z O S P
      R E pr_length N B E J pr_changed
pr_body_done: W pr_stage 2 J pp_ok
page_request_clear:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      W pr_stage Z W pr_length Z W pr_transmit_phase Z W pr_header_length Z W f_action Z W f_action_ptr Z W f_action_len Z J pp_ok
pr_ready:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pr_bad J pp_ok
pr_bad: M A -126 O S P
pr_changed: M A -127 O S P
