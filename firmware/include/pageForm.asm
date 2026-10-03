; Serialize a validated page's current inputs into the shared 243-cell scratch.
; Requires page.asm and url.asm. Native loader owns names/order/uniqueness;
; native input editing must preserve the record schema and value reservations.
; page_form_body(): A=0/error, B=body length, C=5711. Maximum 208 cells.
; No submission or origin change. Call only after handler completion; the
; application freezes input until it has sent the corresponding header/body.
; Scratch may be partially changed on failure; output is usable only for A=0.
page_form_body:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pf_bad R E f_form N E 1 J pf_bad
      R K f_records ifl K 1 J pf_bad end ifg K 27 J pf_bad end
      M I 4739 M L 5712 M D Z
pf_record:
      E K Z J pf_done
      R E I
      ife E 6
        I D 1 ifg D 3 J pf_bad end
        M B I/4 M C I/5
        ifl C 1 J pf_bad end ifg C 13 J pf_bad end
        C S pf_string N A Z O S P
        M B I/1 M C I/2
        ifl C Z J pf_bad end ifg C 54 J pf_bad end
        C S pf_string N A Z O S P
      end
      A I 18 I K -1 J pf_record
pf_done:
      W 5711 D M B L S B 5711 M C 5711 J pp_ok
pf_bad: M A -113 O S P
; B=source C=count. Bounds/text validation before copying each counted string.
; Preserve record pointer I, records remaining K, field count D and output L.
pf_string:
      ifl B 2552 J pf_bad end ifg B 4010 J pf_bad end
      M E B A E C ifg E 4010 J pf_bad end
      M J B M F C
pf_text:
      E F Z J pf_copy
      R E J ifl E -40 J pf_bad end ifg E 57 J pf_bad end
      E E Z J pf_bad E E 54 J pf_bad
      I J 1 I F -1 J pf_text
pf_copy:
      W L C I L 1 M A L C S url_copy A L C J pp_ok
