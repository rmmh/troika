; Entry at offset zero, called through image_call. B=operation:
; 0 LOAD, 1 form body, 2 text (C=source,D=count,F=cursor,G=palette),
; 3 request header (C=method,D=body length), 4 SUBMIT.
; LOAD/SUBMIT only produce deferred actions. The caller applies them once after
; success and owns event ordering, origin acceptance and network transmission.
phase_entry:
      E B Z J pi_load E B 1 J page_form_body E B 2 J pi_text
      E B 3 J pi_header E B 4 J pi_submit M A -119 O S P
pi_text: M A C M B D M C F M D G J text_write
pi_header: M A C M B D J http_request_header
pi_load: M A @pi_load_name M B 4 M E Z J pi_event
pi_submit: M A @pi_submit_name M B 6 M E 1
pi_event:
      R F pp_valid N F 1 J pp_bad
      W f_action Z W f_action_ptr Z W f_action_len Z
      U S E C S f_find O S E
      ife A 1
        E E Z J pp_ok M A 25 J f_browser
      end
      N A Z O S P M A C J f_invoke
pi_load_name: "LOAD"
pi_submit_name: "SUBMIT"
