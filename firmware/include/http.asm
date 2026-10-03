; Native incremental HTTP/T1 framing. Requires url.asm and dns.asm.
; http_init(A=0 request/1 response), http_feed(A=stable source,B=0..216),
; http_eof. A=0 or sticky negative status. A..L are caller-saved.
; http_body(A=one raw body tryte) is an application native callback, A=status.
; It must not reenter this parser or alter its unread source/state.
$h_path: 6196
$h_mode: 6214
$h_phase: 6215
$h_length: 6216
$h_received: 6217
$h_type: 6218
$h_method: 6219
$h_host_seen: 6220
$h_length_seen: 6221
$h_type_seen: 6222
$h_line_len: 6223
$h_total: 6224
$h_status: 6225
$h_path_len: 6226
$h_source: 6227
$h_left: 6228
$h_active: 6229
$h_line: 6230
$h_error: 6311
$h_value: 6312
$h_value_len: 6313
$h_host_match: 6314
$h_name_len: 6315
$h_temp: 6316
$h_ended: 6317
$h_app_path: 6318

http_init:
      R E h_active N E Z J http_busy
      ifl A Z J http_bad end
      ifg A 1 J http_bad end
      M D A M E 6196 M F 124
http_clear: W E Z I E 1 I F -1 N F Z J http_clear
      W h_mode D J http_ok
http_feed:
      R E h_active N E Z J http_busy
      R E h_error ifn E Z M A E O S P end
      ifl B Z J http_bad end
      ifg B 216 J http_large end
      E B Z J http_ok
      R E h_ended N E Z J http_bad
      M E A A E B I E -1 ifl E A J http_bad end
      ; Host normalization reuses scratch/URL RAM. Never alias unread input.
      ifle A 6439 ifge E 5711 J http_bad end end
      W h_source A W h_left B W h_active 1
      C S http_feed_loop W h_active Z O S P
http_feed_loop:
      R E h_left E E Z J http_ok
      I E -1 W h_left E R F h_source R A F I F 1 W h_source F
      R E h_phase
      E E 3 J http_bad
      E E 2 J http_body_cell
      R E h_total I E 1 ifg E 486 J http_large end W h_total E
      ife A 27
        C S http_line N A Z O S P W h_line_len Z J http_feed_loop
      end
      ifl A -40 J http_bad end
      ifg A 57 J http_bad end
      E A Z J http_bad E A 54 J http_bad
      R E h_line_len ifge E 81 J http_large end
      M F h_line A F E W F A I E 1 W h_line_len E J http_feed_loop
http_body_cell:
      R E h_received I E 1 W h_received E
      C S http_body N A Z J http_fail
      R E h_received R F h_length ife E F W h_phase 3 end
      J http_feed_loop
http_eof:
      R E h_active N E Z J http_busy
      R E h_error ifn E Z M A E O S P end
      R E h_phase N E 3 J http_truncated W h_ended 1 J http_ok
http_ok: M A Z O S P
http_bad: M A -101 J http_fail
http_large: M A -102 J http_fail
http_type_bad: M A -103 J http_fail
http_method_bad: M A -104 J http_fail
http_busy: M A -105 O S P
http_truncated: M A -106
http_fail: W h_error A W h_phase -1 O S P

http_line:
      R E h_phase N E Z J http_header
      R E h_mode E E 1 J http_response_line
      J http_request_line
http_response_line:
      R E h_line_len N E 11 J http_bad
      M A h_line M B @http_response_prefix M C 8 C S dns_equal N A Z J http_bad
      M A 6238 M B 3 C S http_decimal N A Z O S P
      ifl D 100 J http_bad end W h_status D W h_phase 1 J http_ok
http_request_line:
      M I h_line R K h_line_len M L Z
http_method_scan:
      E K Z J http_bad R E I E E -27 J http_method_end
      M A E C S http_token_char N A Z O S P
      I I 1 I K -1 I L 1 J http_method_scan
http_method_end:
      E L Z J http_bad W h_method 3
      ife L 3 M A h_line M B @http_get M C 3 C S dns_equal ife A Z W h_method 1 end end
      ife L 4 M A h_line M B @http_post M C 4 C S dns_equal ife A Z W h_method 2 end end
      I I 1 I K -1 W h_value I M L Z
http_path_scan:
      E K Z J http_bad R E I E E -27 J http_path_end
      I I 1 I K -1 I L 1 ifg L 18 J http_bad end J http_path_scan
http_path_end:
      W h_path_len L I I 1 I K -1 N K 7 J http_bad
      M A I M B @http_version M C 7 C S dns_equal N A Z J http_bad
      R A h_value R B h_path_len C S url_check_path N A Z J http_bad W h_app_path C
      M A h_path R B h_value R C h_path_len C S url_copy
      W h_phase 1 J http_ok

http_header:
      R K h_line_len E K Z J http_headers_done
      M I h_line M L Z
http_name_scan:
      E K Z J http_bad R E I E E 0s_NC J http_name_end
      ifge E -40 ifle E -14 E E -27 J http_bad A E 27 end end
      W I E M A E C S http_token_char N A Z O S P
      I I 1 I K -1 I L 1 J http_name_scan
http_name_end:
      E L Z J http_bad W h_name_len L
      ifl K 2 J http_bad end
      I I 1 R E I N E -27 J http_bad I I 1 I K -2
      ifn K Z
        R E I E E -27 J http_bad
        M F I A F K I F -1 R E F E E -27 J http_bad
      end
      W h_value I W h_value_len K
      ife L 4 M A h_line M B @http_host_name M C 4 C S dns_equal E A Z J http_host end
      ife L 14 M A h_line M B @http_length_name M C 14 C S dns_equal E A Z J http_length end
      ife L 12 M A h_line M B @http_type_name M C 12 C S dns_equal E A Z J http_content_type end
      ife L 17 M A h_line M B @http_transfer_name M C 17 C S dns_equal E A Z J http_bad end
      J http_ok
http_host:
      R E h_host_seen N E Z J http_bad W h_host_seen 1
      R E h_mode E E 1 J http_ok
      M A url_text M B @url_scheme M C 7 C S url_copy
      M A 5961 R B h_value R C h_value_len C S url_copy
      A A C W A 0s_NI R B h_value_len I B 8 M A url_text C S url_parse N A Z J http_bad
      R E url_current_valid N E 1 J http_ok
      C S url_same_origin ife A Z W h_host_match 1 end J http_ok
http_length:
      R E h_length_seen N E Z J http_bad W h_length_seen 1
      R A h_value R B h_value_len C S http_decimal N A Z O S P W h_length D J http_ok
http_content_type:
      R E h_type_seen N E Z J http_bad W h_type_seen 1 W h_type -1
      R K h_value_len E K Z J http_bad
      ife K 10 R A h_value M B @http_plain M C 10 C S http_equal_ci ife A Z W h_type 1 end end
      ife K 16 R A h_value M B @http_page M C 16 C S http_equal_ci ife A Z W h_type 2 end end
      ife K 25 R A h_value M B @http_form_type M C 25 C S http_equal_ci ife A Z W h_type 3 end end
      J http_ok
http_headers_done:
      R E h_length_seen N E 1 J http_bad
      R E h_length
      ifn E Z R F h_type_seen N F 1 J http_bad end
      R F h_mode
      ife F Z
        R F h_host_seen N F 1 J http_bad
        R F h_method
        ife F 1 N E Z J http_bad end
        ife F 2
          R F h_app_path N F 1 J http_method_bad
          ifg E 216 J http_large end
          R F h_type N F 3 J http_type_bad
        end
      end
      W h_phase 2 E E Z W h_phase 3 J http_ok
; A=source B=count, D=checked decimal value 0..9841; preserves I/K/L.
http_decimal:
      ifl B 1 J http_bad end
      M E A M F B M D Z
http_decimal_loop:
      R G E ifl G 0s_NN J http_bad end
      ifg G 0s_NW J http_bad end
      S G 0s_NN ifg D 984 J http_bad end
      ife D 984 ifg G 1 J http_bad end end
      P D 10 A D G I E 1 I F -1 N F Z J http_decimal_loop J http_ok
; Case-insensitive value comparison against a lower-case literal. Preserve I/K/L.
http_equal_ci:
      M E A M F B M G C
http_ci_loop:
      R H E ifge H -40 ifle H -14 N H -27 A H 27 end end
      R A F ifn H A M A 1 O S P end
      I E 1 I F 1 I G -1 N G Z J http_ci_loop J http_ok
; HTTP token characters. Preserve I/K/L; source text is already code-validated.
http_token_char:
      ifge A -40 ifle A 13 E A -27 J http_bad E A Z J http_bad J http_ok end end
      ifge A 0s_NN ifle A 0s_NW J http_ok end end
      E A 0s_NE J http_ok E A 0s_NM J http_ok E A 0s_NL J http_ok
      E A 0s_NH J http_ok E A 0s_NG J http_ok E A 0s_NA J http_ok E A 0s_NY J http_ok
      ifge A 0s_OA ifle A 0s_OD J http_ok end end
      E A 0s_OK J http_ok E A 0s_OL J http_ok E A 0s_ON J http_ok E A 0s_OP J http_ok
      J http_bad
http_get: "GET"
http_post: "POST"
http_version: "HTTP/T1"
http_response_prefix: "HTTP/T1 "
http_host_name: "host"
http_length_name: "content-length"
http_type_name: "content-type"
http_transfer_name: "transfer-encoding"
http_plain: "text/plain"
http_page: "text/troika-page"
http_form_type: "application/x-troika-form"
