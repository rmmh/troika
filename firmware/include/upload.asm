; Optional raw PUT handler for httpFiles: B=0 reset, 1 body cell C, 2 valid EOF,
; 3 cancel. Body operations return 0; EOF returns an empty HTTP status response.
; /shared/name is confined to /public/shared/name. All signed trytes are data.
; The caller owns framing and invokes cancel on malformed/truncated/reset input.
$up_started: 2519
$up_filled: 2520
$up_status: 2521
share_upload:
      E B Z J up_reset E B 1 J up_char E B 2 J up_finish J up_abort
up_reset: C S up_abort W up_started Z W up_filled Z W up_status Z J http_ok
up_begin:
      R E up_status N E Z J http_ok R E up_started N E Z J http_ok
      R E h_host_match N E 1 J up_missing
      R E h_path_len ifl E 9 J up_missing end ifg E 18 J up_missing end
      M A h_path M B @up_route M C 8 C S dns_equal N A Z J up_missing
      M I 6204 R K h_path_len I K -8
up_name:
      R E I E E 0s_NY J up_name_next
      ifge E -13 ifle E 13 E E Z J up_bad J up_name_next end end
      ifl E 28 J up_bad end ifg E 37 J up_bad end
up_name_next: I I 1 I K -1 N K Z J up_name
      M A 2552 M B @up_public M C 7 C S net_copy M B h_path R C h_path_len C S net_copy
      R B h_path_len A B 7
      R D h_length M C D Q C 243 M E C P E 243
      ifg E D I C -1 S E 243 end S D E
      ifn D Z I C 1 else ifn C Z M D 243 end end
      M A 2552 C S fs_replace_begin N A Z J up_storage
      W up_started 1 J http_ok
up_char:
      U S C C S up_begin O S H
      R E up_status N E Z J http_ok
      R E up_filled M I fs_buffer A I E W I H I E 1 W up_filled E
      E E 243 J up_append R E h_received R F h_length N E F J http_ok
up_append: C S fs_replace_append N A Z J up_storage W up_filled Z J http_ok
up_finish:
      C S up_begin R E up_status ifn E Z M A E O S P end
      C S fs_replace_finish
      ifn A Z C S up_storage R A up_status O S P end
      W up_started Z M A 200 O S P
up_storage:
      U S A C S up_abort O S A
      ife A -18 M E 507 else M E 500 end J up_reject
up_missing: M E 404 J up_reject
up_bad: M E 400
up_reject: W up_status E J http_ok
up_abort:
      R E up_started E E Z J http_ok W up_started Z
      R E fs_opened N E 3 J http_ok R E fm_committed N E Z J http_ok
      J fs_replace_abort
up_route: "/shared/"
up_public: "/public"
