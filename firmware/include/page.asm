; Native incremental text/plain or text/troika-page loader. Requires Forth+URL+pageState.
; page_init(A=1 plain/2 page), page_char(A=cell), page_feed(A=source,B=count),
; page_finish. No handler runs here. pp_valid gates application interaction.
page_init:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      ifl A 1 J pp_bad end ifg A 2 J pp_bad end
      M D A C S f_reset
      M E 2552 M F 1458 C S pp_clear
      M E 4739 M F 486 C S pp_clear
      W pp_mode D W pp_here 2552 J pp_ok
page_char:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      W pp_active 1 C S pp_char W pp_active Z O S P
page_feed:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_error ifn E Z M A E O S P end
      ifl B Z J pp_bad end ifg B 216 J pp_full end
      E B Z J pp_ok
      M E A A E B I E -1 ifl E A J pp_bad end
      ifle A 6439 ifge E 2552 J pp_bad end end
      W pp_source A W pp_feed_left B W pp_active 1
      C S pp_feed_loop W pp_active Z O S P
pp_feed_loop:
      R E pp_feed_left E E Z J pp_ok
      I E -1 W pp_feed_left E R E pp_source R A E I E 1 W pp_source E
      C S pp_char N A Z O S P J pp_feed_loop
pp_char:
      R E pp_error ifn E Z M A E O S P end
      R E pp_valid N E Z J pp_bad
      ifl A -40 J pp_bad end ifg A 57 J pp_bad end
      E A Z J pp_bad E A 54 J pp_bad
      R E pp_total I E 1 ifg E 2187 J pp_full end W pp_total E
      R E pp_mode E E 1 J pp_plain N E 2 J pp_bad
      R E pp_phase
      E E Z J pp_version E E 1 J pp_new_record E E 2 J pp_space
      E E 3 J pp_number E E 4 J pp_payload E E 5 J pp_separator J pp_bad
pp_plain:
      R E pp_here ifge E 4010 J pp_full end W E A I E 1 W pp_here E J pp_ok
pp_version:
      R E pp_index M F @pp_header A F E R F F N A F J pp_bad
      I E 1 W pp_index E ife E 7 W pp_phase 1 end J pp_ok
pp_new_record:
      M D Z E A 0s_MH M D 1 E A 0s_MT M D 2 E A 0s_MB M D 3 E A 0s_ML M D 4
      E A 0s_MF M D 5 E A 0s_MI M D 6 E A 0s_MS M D 7 E A 0s_MC M D 8
      E A 0s_MG M D 9
      E D Z J pp_bad R E f_records ifge E 27 J pp_full end
      ife D 5 R F f_form N F Z J pp_bad end
      ife D 6 R F f_form N F 1 J pp_bad R F pp_inputs ifge F 3 J pp_full end end
      ife D 7 R F f_form N F 1 J pp_bad R F pp_submit N F Z J pp_bad end
      P E 18 A E 4739 W pp_record E W E D W pp_kind D W pp_field Z
      W pp_phase 2 ife D 3 W pp_phase 5 end J pp_ok
pp_space:
      N A -27 J pp_bad W pp_length Z W pp_digits Z W pp_phase 3 J pp_ok
pp_number:
      E A 0s_NC J pp_string_start
      ifl A 0s_NN J pp_bad end ifg A 0s_NW J pp_bad end S A 0s_NN
      R E pp_length ifg E 218 J pp_full end ife E 218 ifg A 7 J pp_full end end
      P E 10 A E A W pp_length E R E pp_digits I E 1 W pp_digits E J pp_ok
pp_string_start:
      R E pp_digits E E Z J pp_bad
      R C pp_length W pp_left C W pp_phase 4 ife C Z W pp_phase 5 end
      R E pp_kind E E 8 J pp_ok
      ife E 9 ifl C 55 J pp_bad end ifg C 108 J pp_full end end
      M D C R J pp_record R F pp_field
      ife E 6
        ife F Z
          ifl C 1 J pp_bad end ifg C 13 J pp_full end I J 4
        else
          ifg C 54 J pp_full end M D 54 I J 1
        end
      else
        ife F Z I J 1 else I J 4 end
      end
      R E pp_here M F E A F D ifg F 4010 J pp_full end
      W J E M J/1 C M J/2 D W pp_dest E W pp_here F J pp_ok
pp_payload:
      R E pp_kind
      ife E 8
        C S fc_char N A Z J pp_fail
      else
        ife E 9
          R F pp_length S F 54 R G pp_left
          ifg G F ifl A -13 J pp_bad end ifg A 3 J pp_bad end end
        end
        R E pp_dest W E A I E 1 W pp_dest E
      end
      R E pp_left I E -1 W pp_left E ife E Z W pp_phase 5 end J pp_ok
pp_separator:
      R E pp_kind R F pp_field
      ife F Z
        ife E 4 W pp_field 1 J pp_space end
        ife E 6 W pp_field 1 J pp_space end
      end
      N A 27 J pp_bad
      E E 4 J pp_link E E 5 J pp_form E E 6 J pp_input
      ife E 7 W pp_submit 1 end
      ife E 8 C S f_record_end N A Z J pp_fail end
      J pp_record_done
pp_link:
      R I pp_record M A I/4 M B I/5 C S url_validate_link N A Z J pp_fail J pp_record_done
pp_form:
      R I pp_record M A I/1 M B I/2 C S url_check_path N A Z J pp_fail N C 1 J pp_bad
      W f_form 1 J pp_record_done
pp_input:
      R I pp_record M J I/4 M K I/5
pp_name_check:
      R E J E E 0s_NY J pp_name_next
      ifge E -13 ifle E 13 E E Z J pp_bad J pp_name_next end end
      ifl E 0s_NN J pp_bad end ifg E 0s_NW J pp_bad end
pp_name_next: I J 1 I K -1 N K Z J pp_name_check
      M I 4739 R K f_records
pp_duplicate_loop:
      E K Z J pp_input_done
      M E I/0
      ife E 6
        R J pp_record M E I/5 M F J/5
        ife E F
          M A I/4 M B J/4 M C E C S dns_equal E A Z J pp_bad
        end
      end
      A I 18 I K -1 J pp_duplicate_loop
pp_input_done: R E pp_inputs I E 1 W pp_inputs E
pp_record_done:
      R E f_records I E 1 W f_records E W pp_phase 1 J pp_ok
page_finish:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_error ifn E Z M A E O S P end
      R E pp_valid E E 1 J pp_ok
      R E pp_mode
      ife E 2
        R E pp_phase N E 1 J pp_bad C S f_seal N A Z J pp_fail
      else
        N E 1 J pp_bad
      end
      W pp_valid 1 J pp_ok
pp_header: "PAGE 1\n"
