; Native simulated camera/alarm controller. Device state is shared by HTTP
; clients, not parked with their application contexts. GET is read-only.
$security_armed: 2508
$security_alarm: 2509
$security_position: 2510
$security_moves: 2511
$security_command: 2512
http_file_post:
      R E h_path_len N E 11 J security_missing
      M A h_path M B @security_action M C 11 C S dns_equal N A Z J security_missing
      R E hf_count N E 2 J security_bad
      M A @security_action_field M B 6 C S http_form_find N A Z J security_bad
      N C 1 J security_bad R E B ifl E 28 J security_bad end ifg E 31 J security_bad end
      S E 28 W security_command E
      M A @security_code_field M B 4 C S http_form_find N A Z J security_bad
      R E security_command E E Z J security_move
      N C 3 J security_denied M A B M B @security_code M C 3 C S dns_equal N A Z J security_denied
      R E security_command
      ife E 1 W security_armed 1 J security_response end
      ife E 2 W security_armed Z end
      W security_alarm Z J security_response
security_move:
      R E security_position I E 1 E E 27 M E Z W security_position E
      R E security_moves ifl E 9 I E 1 W security_moves E end
      R E security_armed ifn E Z W security_alarm 1 end
security_response:
      M A h_path M B @security_index M C 6 C S net_copy W h_path_len 6 M A Z O S P
security_prepare:
      R E h_path_len ife E 1 J security_page end
      N E 6 J security_plain M A h_path M B @security_index M C 6 C S dns_equal N A Z J security_plain
security_page:
      M A 2552 M B @security_template M C security_length C S net_copy
      R E security_armed A E 28 W security_armed_cell E
      R E security_alarm A E 28 W security_alarm_cell E
      R E security_moves A E 28 W security_moves_cell E
      M I security_view_cell R E security_position
security_row:
      ifge E 9 S E 9 A I 14 J security_row end
      A I E W I security_pixel
      M A 1 M B 2552 M C security_length M D 2 O S P
security_plain: M A Z O S P
security_bad: M A 400 O S P
security_denied: M A 403 O S P
security_missing: M A 404 O S P
security_action: "/app/device"
security_index: "/index"
security_action_field: "action"
security_code_field: "code"
security_code: "271"
