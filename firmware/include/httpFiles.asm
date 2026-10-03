; Single-connection native HTTP file server. Requires checked FAT, streams and
; HTTP request/response modules. Configure NIC, serial volume and URL origin.
; init mounts/checks serial_unit, installs the callback and listens on port 80.
; step returns 0; hs_status retains the last failure until the next request.
; Application http_file_type(A=request path,B=count) returns MIME type 1 or 2.
; Files are only visible below /public; GET / maps to /public/index.
$hs_state: 2493
$hs_status: 2494
$hs_length: 2495
$hs_left: 2496
$hs_pointer: 2497
$hs_count: 2498
$hs_type: 2499
http_files_init:
      W block_service_vector Z R B serial_unit C S fs_mount N A Z O S P
      C S fs_check N A Z O S P
      W block_service_vector @http_files_network
      C S hs_reset N A Z O S P M A 80 J stream_listen
hs_reset:
      W hs_state Z W hs_left Z M A Z J http_init
http_files_step:
      R E hs_state ife E 5 R E st_state
        ife E Z C S hs_reset end ife E 6 C S hs_reset end
      end
      C S http_files_network
      R E hs_state E E 5 J http_ok
      C S stream_peek ifl A Z J hs_fail end
      R E hs_state
      ife E Z
        ifn B Z
          W hs_count B C S http_feed N A Z J hs_fail
          R A hs_count C S stream_consume N A Z J hs_fail J http_ok
        end
        N C 1 J http_ok
        M A 5711 M B 1 C S stream_read ifl A Z J hs_fail end
        C S http_eof N A Z J hs_fail W hs_status Z
        R E h_host_match ifn E 1 M A 404 J hs_empty end
        R E h_method ifn E 1 M A 405 J hs_empty end
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
        R E fs_opened ife E Z W hs_state 4 else W hs_state 2 end
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
        R E hs_left S E F W hs_left E ife E Z W hs_state 2 end J http_ok
      end
      R E hs_state
      ife E 4
        C S stream_shutdown E A -1 J http_ok N A Z J hs_fail W hs_state 5
      end
      J http_ok
hs_missing: M A 404
hs_empty:
      M B Z M C Z C S http_response_header N A Z J hs_fail W hs_state 1 J http_ok
hs_fail:
      W hs_status A C S fs_close M A 1 C S stream_abort W hs_state 5 J http_ok
http_body: J http_ok
http_files_network:
      C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end
      C S stream_service O S P
hs_public: "/public"
hs_index: "/index"
