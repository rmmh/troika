; Console PUT phase. B=6, C/D=counted "absolute-local-path URL" arguments.
; Owns the slot until completion; pumps resident networking while waiting.
; One FAT block is retained until all its stream fragments are accepted.
; No retry/replay after failure. Response bodies are discarded as raw data.
$us_path: 5225
$us_pathlen: 5226
$us_length: 5227
$us_left: 5228
$us_pointer: 5229
$us_count: 5230
$us_header: 5231
phase_entry:
      W us_path C M I C M K D M L Z
us_word:
      E K Z J us_bad R E I E E -27 J us_space I I 1 I K -1 I L 1 J us_word
us_space:
      E K Z J us_bad R E I N E -27 J us_args I I 1 I K -1 J us_space
us_args:
      E L Z J us_bad W us_pathlen L
      R E us_path R E E N E 22 J fs_bad_path
      M A I M B K C S url_parse N A Z O S P
      ; Validate the source before connecting. Serial allocation may overwrite
      ; filesystem lookup state, so repeat lookup after the connection opens.
      C S us_lookup N A Z O S P
us_begin:
      C S browser_network M A 243 C S browser_connect_begin E A -1 J us_begin ifl A Z J us_fail end
us_connect:
      C S browser_network C S browser_connect_step ifl A Z J us_fail end E A Z J us_connect
      C S us_lookup N A Z J us_fail C S fs_open N A Z J us_fail
      C S us_make_header W us_header B
us_header_send:
      C S browser_network M A 5711 R B us_header C S stream_send
      E A -1 J us_header_send N A Z J us_fail
us_block:
      C S fs_read_next N A Z J us_fail E B Z J us_close
      W us_left B W us_pointer fs_buffer
us_send:
      C S browser_network R B us_left ifg B 216 M B 216 end W us_count B
      R A us_pointer C S stream_send E A -1 J us_send N A Z J us_fail
      R E us_left R F us_count S E F W us_left E
      R G us_pointer A G F W us_pointer G N E Z J us_send J us_block
us_close:
      C S fs_close N A Z J us_fail
us_shutdown:
      C S browser_network C S stream_shutdown E A -1 J us_shutdown N A Z J us_fail
      W br_download -1 M A 1 C S http_init N A Z J us_fail
us_response:
      C S browser_network C S stream_peek ifl A Z J us_fail end
      ifn B Z
        W us_count B C S http_feed N A Z J us_fail
        R A us_count C S stream_consume N A Z J us_fail J us_response
      end
      N C 1 J us_response M A 5711 M B 1 C S stream_read ifl A Z J us_fail end
      C S http_eof N A Z J us_fail W br_download Z
      R A h_status E A 200 J http_ok O S P
us_lookup:
      R A us_path R B us_pathlen C S fs_lookup N A Z O S P
      R E fs_found_kind N E 1 J fs_is_directory
      R E fs_found_count ifg E 41 J http_large end
      R F fs_found_used ife E 41 ifg F 121 J http_large end end
      ifn E Z I E -1 P E 243 A E F end W us_length E J http_ok
us_fail:
      U S A C S fs_close C S dns_client_cancel
      R E st_state ifn E 6 M A 1 C S stream_abort end
      W br_download Z O S A O S P
us_bad: M A -137 O S P
; Header is generated only after DNS/connection setup releases scratch.
us_make_header:
      W h_temp 5711 M A @us_put M B 4 C S us_text
      R A url_path R B url_path_len C S us_text
      M A @us_version M B 15 C S us_text
      M A 5961 R B url_path S B A C S us_text
      M A @us_length_text M B 17 C S us_text
      R D us_length M E 1
      ifge D 10 M E 10 end ifge D 100 M E 100 end ifge D 1000 M E 1000 end
us_decimal:
      M F D Q F E ifg F 9 I F -1 end
      M G F P G E ifg G D I F -1 S G E end
      S D G A F 28 R I h_temp W I F I I 1 W h_temp I
      ifn E 1 Q E 10 J us_decimal end
      M A @us_type M B 27 C S us_text R B h_temp S B 5711 J http_ok
us_text:
      M C B M B A R A h_temp C S url_copy A A C W h_temp A O S P
us_put: "PUT "
us_version: " HTTP/T1\nHost: "
us_length_text: "\nContent-Length: "
us_type: "\nContent-Type: text/plain\n\n"
