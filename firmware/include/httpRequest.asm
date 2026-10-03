; Server request parsing and virtual-host policy. Requires http.asm.
; Kept separate so browser images need not retain server-only code.
http_request_line:
      M I h_line R K h_line_len M L Z
http_method_scan:
      E K Z J http_bad R E I E E -27 J http_method_end
      M A E C S http_token_char N A Z O S P
      I I 1 I K -1 I L 1 J http_method_scan
http_method_end:
      E L Z J http_bad W h_method 3
      ife L 3 M A h_line M B @http_get M C 3 C S dns_equal ife A Z W h_method 1 end end
      ife L 3 M A h_line M B @http_put M C 3 C S dns_equal ife A Z W h_method 4 end end
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

http_request_host:
      M A url_text M B @url_scheme M C 7 C S url_copy
      M A 5961 R B h_value R C h_value_len C S url_copy
      A A C W A 0s_NI R B h_value_len I B 8 M A url_text C S url_parse N A Z J http_bad
      R E url_current_valid N E 1 J http_ok
      C S url_same_origin ife A Z W h_host_match 1 end J http_ok

http_request_headers:
      R E h_length
      R F h_host_seen N F 1 J http_bad
      R F h_method
      ife F 1 N E Z J http_bad end
      ife F 2
        R F h_app_path N F 1 J http_method_bad
        ifg E 216 J http_large end
        R F h_type N F 3 J http_type_bad
      end
      R F h_method ife F 4 R F h_type N F 1 J http_type_bad end
      J http_ok
http_put: "PUT"
http_get: "GET"
http_post: "POST"
http_version: "HTTP/T1"
