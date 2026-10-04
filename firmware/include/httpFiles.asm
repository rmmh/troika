; Single-connection native HTTP file server. Requires checked FAT, streams and
; HTTP request/response/form modules. Configure NIC, serial volume and URL origin.
; init mounts/checks serial_unit, installs the callback and listens on port 80.
; step returns 0; hs_status retains the last failure until the next request.
; Application http_file_type(A=request path,B=count) returns MIME type 1 or 2.
; Application http_file_post() runs after EOF/form validation: return HTTP status
; for an empty response, negative for failure, or 0 to serve rewritten h_path.
; It must copy retained values before reusing the POST body. hs_body_buffer
; selects a stable 216-cell buffer; zero means the default 4010..4225.
; After init, optional hs_prepare points to a trusted response hook called after EOF
; and Host validation for GET or after a successful POST rewrites h_path.
; Return A=0 for a file, HTTP status >1 for an empty reply,
; negative for failure, or A=1 with B=stable body, C=count, D=MIME. Generated
; bodies must remain immutable until completion and leave no filesystem handle.
; Optional hs_upload handles PUT: B=0 reset, B=1 body cell C, B=2 valid EOF,
; B=3 cancel. Body/reset/cancel return 0; EOF returns HTTP status or failure.
; Install after init. The hook must discard unpublished state on cancel/reset.
; Optional hs_admit runs after the request line and before more input or EOF.
; Return 0 to proceed, positive to defer without consuming, negative to fail.
; With this hook installed the first feed stops at the request-line newline,
; even when headers/body share that stream frame. The hook may inspect h_method
; and h_path; it must not reenter HTTP or consume the retained input itself.
; Files are only visible below /public; GET / maps to /public/index.
$hs_network: 2530
$hs_upload: 2518
$hs_prepare: 2492
$hs_state: 2493
$hs_status: 2494
$hs_length: 2495
$hs_left: 2496
$hs_pointer: 2497
$hs_count: 2498
$hs_type: 2499
$hs_body_buffer: 2332
$hs_admit: 2334
http_files_init:
      W hs_admit Z W hs_body_buffer Z W hs_network Z W hs_upload Z W hs_prepare Z W block_service_vector Z R B serial_unit C S fs_mount N A Z O S P
      C S fs_check N A Z O S P
      W block_service_vector @http_files_network
      C S hs_reset N A Z O S P M A 80 J stream_listen
hs_reset:
      R E hs_upload ifn E Z M B Z C S E end
      W hs_state Z W hs_left Z W hf_count Z M A Z J http_init
http_files_step:
      R E hs_state ife E 5 R E st_state
        ife E Z C S hs_reset end ife E 6 C S hs_reset end
      end
      C S http_files_network
      R E hs_state E E 5 J http_ok
      C S stream_peek ifl A Z J hs_fail end
      R E hs_state
      ife E Z
        R E hs_admit
        ifn E Z
          R F h_method
          ifn F Z
            U S A U S B U S C C S E M D A O S C O S B O S A
            ifl D Z M A D J hs_fail end N D Z J http_ok
          else
            ; Bound this feed at the first newline so admission precedes PUT
            ; body callbacks. A fragmented request line is still consumed.
            M I A M K B M F Z
hs_line_span:
            E K Z J hs_line_ready
            R E I I I 1 I F 1 I K -1 N E 27 J hs_line_span
hs_line_ready:
            M B F
          end
        end
        ifn B Z
          W hs_count B C S http_feed N A Z J hs_fail
          R A hs_count C S stream_consume N A Z J hs_fail J http_ok
        end
        N C 1 J http_ok
        M A 5711 M B 1 C S stream_read ifl A Z J hs_fail end
        C S http_eof N A Z J hs_fail W hs_status Z
        R E h_host_match ifn E 1 M A 404 J hs_empty end
        R E h_method
        ife E 4
          R E hs_upload E E Z J hs_method
          M B 2 C S E ifl A Z J hs_fail end J hs_empty
        end
        ife E 2
          R A hs_body_buffer E A Z M A 4010 R B h_length C S http_form_parse
          ifn A Z M A 400 J hs_empty end
          C S http_file_post ifl A Z J hs_fail end N A Z J hs_empty
        else
          ifn E 1 M A 405 J hs_empty end
        end
        R E hs_prepare
        ifn E Z
          C S E ifl A Z J hs_fail end
          ife A 1
            W hs_pointer B W hs_left C M B C M C D M A 200
            C S http_response_header N A Z J hs_fail W hs_state 1 J http_ok
          end
          N A Z J hs_empty
        end
        ; Build a confined path in scratch. The HTTP parser has validated the
        ; narrow URL path grammar; dot traversal and percent escapes are invalid.
        M A 5711 M B @hs_public M C 7 C S net_copy
        R E h_path_len
        ife E 1 M A 5718 M B @hs_index M C 6 C S net_copy M B 13
        else M A 5718 M B h_path M C E C S net_copy R B h_path_len A B 7 end
        M A 5711 C S fs_lookup
        ifn A Z
          E A -12 J hs_missing E A -13 J hs_missing J hs_fail
        end
        R E fs_found_kind N E 1 J hs_missing
        R E fs_found_count ifg E 41 M A 413 J hs_empty end
        ife E 41 R F fs_found_used ifg F 121 M A 413 J hs_empty end end
        ifn E Z I E -1 P E 243 R F fs_found_used A E F end W hs_length E
        C S fs_open N A Z J hs_fail
        M A h_path R B h_path_len C S http_file_type W hs_type A
        R B hs_length M C A M A 200 C S http_response_header N A Z J hs_fail
        W hs_state 1 J http_ok
      end
      ; Drain unexpected remaining input while finishing a response.
      ifn B Z M A B C S stream_consume N A Z J hs_fail end
      R E hs_state
      ife E 1
        M A h_line R B h_line_len C S stream_send E A -1 J http_ok N A Z J hs_fail
        R E hs_left ifn E Z W hs_state 3
        else R E fs_opened ife E Z W hs_state 4 else W hs_state 2 end end
      end
      R E hs_state
      ife E 2
        C S fs_read_next N A Z J hs_fail
        ife B Z C S fs_close W hs_state 4
        else W hs_left B W hs_pointer fs_buffer W hs_state 3 end
      end
      R E hs_state
      ife E 3
        R B hs_left ifg B 216 M B 216 end W hs_count B
        R A hs_pointer C S stream_send E A -1 J http_ok N A Z J hs_fail
        R E hs_pointer R F hs_count A E F W hs_pointer E
        R E hs_left S E F W hs_left E ife E Z R E fs_opened ife E Z W hs_state 4 else W hs_state 2 end end J http_ok
      end
      R E hs_state
      ife E 4
        C S stream_shutdown E A -1 J http_ok N A Z J hs_fail W hs_state 5
      end
      J http_ok
hs_method: M A 405 J hs_empty
hs_missing: M A 404
hs_empty:
      M B Z M C Z C S http_response_header N A Z J hs_fail W hs_state 1 J http_ok
hs_fail:
      W hs_status A R E hs_upload ifn E Z M B 3 C S E end C S fs_close M A 1 C S stream_abort W hs_state 5 J http_ok
http_body:
      R E h_method
      ife E 4 R E hs_upload E E Z J http_ok M C A M B 1 C S E O S P end
      N E 2 J http_ok
      R E h_received ifg E 216 J http_large end
      R F hs_body_buffer E F Z M F 4010 I F -1 A F E W F A J http_ok
http_files_network:
      R E hs_network N E Z M P E
      C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end
      C S stream_service O S P
hs_public: "/public"
hs_index: "/index"
