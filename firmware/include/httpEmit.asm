; Bounded native response-header encoder. Requires http.asm.
; http_response_header(A=status 100..999,B=body length 0..9841,C=type 0..3).
; Type 0 omits Content-Type and requires an empty body. Output at h_line;
; returns A=status, B=header length, C=pointer. Does not transmit or act.
http_response_header:
      R E h_active N E Z J http_busy
      ifl A 100 J http_bad end
      ifg A 999 J http_bad end
      ifl B Z J http_bad end
      ifg B 9841 J http_large end
      ifl C Z J http_type_bad end
      ifg C 3 J http_type_bad end
      ife C Z N B Z J http_type_bad end
      W h_status A W h_length B W h_type C W h_temp h_line
      M A @http_response_prefix M B 8 C S he_text N A Z O S P
      R A h_status C S he_decimal N A Z O S P
      M A 27 C S he_char
      M A @he_length M B 16 C S he_text N A Z O S P
      R A h_length C S he_decimal N A Z O S P
      M A 27 C S he_char
      R E h_type E E Z J he_end
      M A @he_type M B 14 C S he_text N A Z O S P
      R E h_type
      ife E 1 M A @http_plain M B 10 end
      ife E 2 M A @http_page M B 16 end
      ife E 3 M A @http_form_type M B 25 end
      C S he_text N A Z O S P M A 27 C S he_char
he_end:
      M A 27 C S he_char N A Z O S P
      R B h_temp S B h_line W h_line_len B M C h_line J http_ok
he_char:
      R I h_temp ifge I 6311 J http_large end
      W I A I I 1 W h_temp I J http_ok
he_text:
      M J A M K B
he_text_loop:
      E K Z J http_ok R A J C S he_char N A Z O S P
      I J 1 I K -1 J he_text_loop
he_decimal:
      M D A M E 1
      ifge D 10 M E 10 end
      ifge D 100 M E 100 end
      ifge D 1000 M E 1000 end
he_decimal_loop:
      M F D Q F E ifg F 9 I F -1 end
      M G F P G E ifg G D I F -1 S G E end
      S D G M A F A A 0s_NN C S he_char N A Z O S P
      ifn E 1 Q E 10 J he_decimal_loop end J http_ok
he_length: "Content-Length: "
he_type: "Content-Type: "
