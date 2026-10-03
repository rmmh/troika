; Native browser request headers. Requires http.asm and url.asm.
; http_request_header(A=1 GET/2 POST,B=body length). Pending URL must be valid.
; POST requires the committed origin and /app/name; GET requires length zero.
; A=0/error, B=header count, C=5711. Output uses shared scratch, at most 159
; cells. Send/copy it before reusing scratch to encode the form body. No I/O,
; origin commit, replay, or application action occurs here. A..L caller-saved.
http_request_header:
      R E h_active N E Z J http_busy
      R E url_valid N E 1 J http_bad
      ifl A 1 J http_method_bad end
      ifg A 2 J http_method_bad end
      ifl B Z J http_bad end
      ifg B 216 J http_large end
      ife A 1 N B Z J http_bad end
      W h_method A W h_length B
      ife A 2
        R E url_current_valid N E 1 J http_method_bad
        C S url_same_origin N A Z J http_method_bad
        R A url_path R B url_path_len C S url_check_path
        N A Z O S P N C 1 J http_method_bad
      end
      W h_temp 5711
      R E h_method
      ife E 1 M A @hr_get M B 4 else M A @hr_post M B 5 end
      C S hr_text
      R A url_path R B url_path_len C S hr_text
      M A @hr_version M B 15 C S hr_text
      ; The canonical URL already contains the normalized host and optional
      ; nondefault port. Copy its authority without another decimal encoder.
      M A 5961 R B url_path S B A C S hr_text
      M A @hr_length M B 17 C S hr_text
      R D h_length M E 1
      ifge D 10 M E 10 end
      ifge D 100 M E 100 end
hr_decimal:
      M F D Q F E ifg F 9 I F -1 end
      M G F P G E ifg G D I F -1 S G E end
      S D G A F 0s_NN R I h_temp W I F I I 1 W h_temp I
      ifn E 1 Q E 10 J hr_decimal end
      R E h_method
      ife E 2
        M A @hr_type M B 15 C S hr_text
        M A @http_form_type M B 25 C S hr_text
      end
      R I h_temp W I 27 I I 1 W I 27 I I 1
      M B I S B 5711 M C 5711 J http_ok
; Append trusted bounded native literals or validated canonical URL slices.
hr_text:
      M C B M B A R A h_temp C S url_copy
      A A C W h_temp A O S P
hr_get: "GET "
hr_post: "POST "
hr_version: " HTTP/T1\nHost: "
hr_length: "\nContent-Length: "
hr_type: "\nContent-Type: "
