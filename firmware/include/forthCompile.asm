; Native streamed page compiler. Modes: 0 top, 1 colon name, 2 body,
; 3 deferred name, 4 variable name, 5 tick target, 6 IS, 7 deferred binding.
; Completed entries alone are linked; call operands bind at compile time.
fc_token:
      C S fc_builtin W f_flags B
      R E f_mode
      E E 1 J fc_declare
      E E 3 J fc_declare
      E E 4 J fc_declare
      E E 5 J fc_tick
      E E 6 J fc_is
      E E 7 J fc_bind
      E E 2 J fc_body
      N E Z J fc_syntax
      ife B 40 W f_mode 1 J fc_ok end
      ife B 50 W f_mode 3 J fc_ok end
      ife B 51 W f_mode 4 J fc_ok end
      ife B 52 W f_mode 5 J fc_ok end
      J fc_syntax
fc_declare:
      ifge B 40 J fc_syntax end
      C S fc_name N A Z O S P
      C S fc_decimal N A Z O S P
      N B Z J fc_syntax
      R E f_mode M D Z
      E E 3 M D 1
      E E 4 M D 2
      W f_scratch D
      ife D 2 R E f_variables ifge E 27 J fc_full end end
      R E f_here W f_current_entry E
      R A f_latest C S fc_emit N A Z O S P
      R A f_scratch C S fc_emit N A Z O S P
      R A f_token_len C S fc_emit N A Z O S P
      M I f_token R K f_token_len
fc_name_copy:
      R A I C S fc_emit N A Z O S P
      I I 1 I K -1 N K Z J fc_name_copy
      R E f_here W f_current_body E
      R D f_scratch
      ife D Z W f_mode 2 J fc_ok end
      M A Z
      ife D 2
        R E f_variables M A 5333 A A E W A Z I E 1 W f_variables E
      end
      C S fc_emit N A Z O S P
      J fc_complete
fc_name:
      M I f_token R K f_token_len
fc_name_loop:
      R E I
      E E 0s_NC J fc_syntax
      E E 0s_ND J fc_syntax
      E E 0s_NJ J fc_syntax
      E E 0s_NK J fc_syntax
      E E 0s_NL J fc_syntax
      E E 0s_OI J fc_syntax
      I I 1 I K -1 N K Z J fc_name_loop
      J fc_ok
fc_complete:
      R E f_current_entry W f_latest E
      W f_current_entry Z W f_current_body Z W f_mode Z J fc_ok
fc_body:
      R B f_flags
      ifge B 40 J fc_syntax_word end
      C S fc_decimal N A Z O S P
      ifn B Z M A Z M B C J fc_emit_pair end
      C S fc_lookup
      ife A Z
        ife B Z M A 2 M B C J fc_emit_pair end
        ife B 1 M A 5 M B C J fc_emit_pair end
        R B C M A Z J fc_emit_pair
      end
      R A f_flags ifl A Z J fc_syntax end
      J fc_emit
fc_syntax_word:
      E B 41 J fc_end_colon
      E B 42 J fc_if
      E B 43 J fc_else
      E B 44 J fc_then
      E B 45 J fc_begin
      E B 46 J fc_until
      E B 47 J fc_while
      E B 48 J fc_repeat
      ife B 49 M A 2 R B f_current_body J fc_emit_pair end
      ife B 54 M A 1 J fc_emit end
      J fc_syntax
fc_end_colon:
      R E f_controls N E Z J fc_syntax
      M A 1 C S fc_emit N A Z O S P J fc_complete
; Helpers preserve B/C/D/I/J/K/L; failure leaves the page permanently invalid.
fc_emit:
      R E f_here ifge E 4739 J fc_full end
      W E A I E 1 W f_here E J fc_ok
fc_emit_pair:
      C S fc_emit N A Z O S P M A B J fc_emit
; Two cells per control frame, maximum 13 frames. A=kind B=fixup/target.
fc_push_control:
      R E f_controls ifge E 13 J fc_control_full end
      M F E P F 2 A F 5306 W F A I F 1 W F B
      I E 1 W f_controls E J fc_ok
fc_top_control:
      R E f_controls E E Z J fc_syntax
      I E -1 P E 2 A E 5306 M I E M A I/0 M B I/1 O S P
fc_pop_control:
      R E f_controls I E -1 W f_controls E J fc_ok
fc_if:
      M A 4 M B Z C S fc_emit_pair N A Z O S P
      R B f_here I B -1 M A 1 J fc_push_control
fc_else:
      C S fc_top_control N A 1 J fc_syntax
      W f_scratch B
      M A 3 M B Z C S fc_emit_pair N A Z O S P
      R E f_here R F f_scratch W F E
      I E -1 M I/0 2 M I/1 E J fc_ok
fc_then:
      C S fc_top_control
      ifn A 1 N A 2 J fc_syntax end
      R E f_here W B E J fc_pop_control
fc_begin:
      M A 3 R B f_here J fc_push_control
fc_until:
      C S fc_top_control N A 3 J fc_syntax
      M A 4 C S fc_emit_pair N A Z O S P J fc_pop_control
fc_while:
      C S fc_top_control N A 3 J fc_syntax
      M A 4 M B Z C S fc_emit_pair N A Z O S P
      R B f_here I B -1 M A 4 J fc_push_control
fc_repeat:
      C S fc_top_control N A 4 J fc_syntax W f_scratch B
      C S fc_pop_control C S fc_top_control N A 3 J fc_syntax
      M A 3 C S fc_emit_pair N A Z O S P
      R E f_here R F f_scratch W F E J fc_pop_control
fc_tick:
      R E f_flags ifge E 40 J fc_syntax end
      C S fc_lookup
      ife A Z
        E B 1 J fc_syntax
        ife B Z W f_binding C W f_mode 6 J fc_ok end
        R B C R E f_here W f_binding E M A Z
        C S fc_emit_pair N A Z O S P
      else
        R A f_flags ifl A Z J fc_syntax end
        R E f_here W f_binding E
        C S fc_emit N A Z O S P
      end
      M A 1 C S fc_emit N A Z O S P W f_mode 6 J fc_ok
fc_is:
      R E f_flags N E 53 J fc_syntax W f_mode 7 J fc_ok
fc_bind:
      C S fc_lookup N A Z J fc_syntax N B 1 J fc_syntax
      R E f_binding W C E W f_binding Z W f_mode Z J fc_ok

f_seal:
      R E f_active ifn E Z M A -90 O S P end
      R E f_status ifn E Z M A E O S P end
      R E f_ready ife E 1 J fc_ok end
      C S f_record_end N A Z O S P
      R E f_comment N E Z J fc_syntax
      R E f_mode N E Z J fc_syntax
      R E f_controls N E Z J fc_syntax
      R I f_latest
fc_seal_loop:
      E I Z J fc_seal_done
      M E I/1
      ife E 1
        M J I M E I/2 A J E I J 3 R E J E E Z J fc_syntax
      end
      R I I J fc_seal_loop
fc_seal_done: W f_ready 1 J fc_ok
