; Native virtual door/bell. Volatile state resets closed on every CPU boot.
; Demo maintenance code is configured in firmware, not a production credential.
$door_open: 2508
$door_bells: 2509
$door_requested: 2510
http_file_post:
      R E h_path_len N E 9 J door_missing
      M A h_path M B @door_action M C 9 C S dns_equal E A Z J door_change
      M A h_path M B @door_bell_action M C 9 C S dns_equal N A Z J door_missing
      R E hf_count N E 1 J door_bad M A @door_ring_field M B 4 C S http_form_find N A Z J door_bad
      N C 1 J door_bad R E B N E 29 J door_bad
      R E door_bells ifl E 9 I E 1 W door_bells E end J door_response
door_change:
      R E hf_count N E 2 J door_bad
      M A @door_state_field M B 5 C S http_form_find N A Z J door_bad
      N C 1 J door_bad R E B ifl E 28 J door_bad end ifg E 29 J door_bad end S E 28 W door_requested E
      M A @door_code_field M B 4 C S http_form_find N A Z J door_bad N C 3 J door_denied
      M A B M B @door_code M C 3 C S dns_equal N A Z J door_denied
      R E door_requested W door_open E
door_response:
      M A h_path M B @door_index M C 6 C S net_copy W h_path_len 6 M A Z O S P
door_prepare:
      R E h_path_len ife E 1 J door_page end
      N E 6 J door_plain M A h_path M B @door_index M C 6 C S dns_equal N A Z J door_plain
door_page:
      M A 2552 M B @door_template M C 204 C S net_copy
      R E door_open ifn E Z M A 2588 M B @door_open_text M C 6 C S net_copy end
      R E door_bells A E 28 W 2605 E
      M A 1 M B 2552 M C 204 M D 2 O S P
door_plain: M A Z O S P
door_bad: M A 400 O S P
door_denied: M A 403 O S P
door_missing: M A 404 O S P
door_action: "/app/door"
door_bell_action: "/app/bell"
door_index: "/index"
door_ring_field: "ring"
door_state_field: "state"
door_code_field: "code"
door_code: "314"
door_open_text: "OPEN  "
door_template: "PAGE 1\nH 12:Door station\nT 12:Door: CLOSED\nT 7:Bell: 0\nF 9:/app/door\nI 4:code 0:\nI 5:state 1:0\nS 5:Apply\nT 21:State: 0 shut, 1 open\nL 4:Bell 5:/bell\nL 6:Manual 7:/manual\nL 3:BBS 22:http://bbs.world/index\n"
