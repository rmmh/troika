; Page-word backend for forthVm. Native page loader owns record validation.
; Record schema (18 cells): kind, text pointer/length/capacity,
; secondary pointer/length/capacity, then 11 reserved cells. Kinds H=1 T=2
; B=3 L=4 F=5 I=6 S=7 C=8. For I, text is its current value.
; f_validate_navigation(A=5954,B=length) must validate a copied URL/path;
; returns A=0 or a browser error. It cannot execute page code or take action.
f_browser:
      E A 21 J fp_fetch
      E A 22 J fp_store
      E A 23 J fp_field
      E A 24 J fp_text
      E A 25 J fp_send
      E A 26 J fp_go
      M A -80 O S P
fp_bad: M A -87 O S P
fp_action_bad: M A -88 O S P
fp_ok: M A Z O S P
; A=pointer B=count; validate one whole current string/variable region.
f_slice:
      ifl B Z J fp_bad end
      ifg B 1458 J fp_bad end
      M E A M F B
      ifge E 5333
        R G f_variables E G Z J fp_bad
        ifg G 27 J fp_bad end
        A G 5333 M H E A H F
        ifg H G J fp_bad end
        ifg E G J fp_bad end
        J fp_ok
      end
      ifl E 2552 J fp_bad end
      M H E A H F ifg H 4010 J fp_bad end
      R K f_records ifl K Z J fp_bad end
      ifg K 27 J fp_bad end
      M I 4739
fp_slice_record:
      E K Z J fp_bad
      M J I/1 M L I/2
      C S fp_contains E A Z O S P
      M J I/4 M L I/5
      C S fp_contains E A Z O S P
      A I 18 I K -1 J fp_slice_record
; E/F=request, J/L=declared slice. Preserve E/F/I/K.
fp_contains:
      ifl J 2552 J fp_bad end
      ifl L Z J fp_bad end
      ifg L 1458 J fp_bad end
      M G J A G L ifg G 4010 J fp_bad end
      ifl E J J fp_bad end
      M H E A H F ifg H G J fp_bad end
      J fp_ok
fp_fetch:
      R A f_arg_b M B 1 C S f_slice N A Z O S P
      R E f_arg_b R A E
      R J f_ds A J 5224 W J A J fp_ok
fp_store:
      R E f_arg_b R F f_variables
      ifl E 5333 J fp_bad end
      ifl F 1 J fp_bad end
      ifg F 27 J fp_bad end
      A F 5333 ifge E F J fp_bad end
      R A f_arg_a W E A J fp_ok
fp_field:
      R E f_arg_b ifl E Z J fp_bad end
      ifg E 2 J fp_bad end
      R K f_records ifl K Z J fp_bad end
      ifg K 27 J fp_bad end
      M I 4739
fp_field_loop:
      E K Z J fp_bad
      R F I
      ife F 6
        E E Z J fp_field_found
        I E -1
      end
      A I 18 I K -1 J fp_field_loop
fp_field_found:
      M A I/1 M B I/2 W f_arg_a A W f_arg_b B
      C S f_slice N A Z O S P
      R J f_ds A J 5223 R A f_arg_a W J A
      I J 1 R B f_arg_b W J B J fp_ok
fp_text:
      R A f_arg_c R B f_arg_a C S f_slice N A Z O S P
      R E f_arg_b ifl E Z J fp_bad end
      R F f_records ifge E F J fp_bad end
      ifg F 27 J fp_bad end
      P E 18 A E 4739 M I E R F I
      ifn F 1 N F 2 J fp_bad end
      M D I/1 M F I/3 R C f_arg_a
      ifl F Z J fp_bad end
      ifg F 1458 J fp_bad end
      ifg C F J fp_bad end
      ifl D 2552 J fp_bad end
      M E D A E F ifg E 4010 J fp_bad end
      ; Variables may contain arbitrary trytes; validate text before any copy.
      R E f_arg_c M F C
fp_text_validate:
      E F Z J fp_text_valid
      R H E ifl H -40 J fp_bad end
      ifg H 57 J fp_bad end
      E H Z J fp_bad
      E H 54 J fp_bad
      I E 1 I F -1 J fp_text_validate
fp_text_valid:
      ; memmove permits a slice of the destination itself.
      R B f_arg_c M E D M F B M G C
      E G Z J fp_text_done
      ifg E F
        A E G A F G
fp_copy_reverse:
        I E -1 I F -1 R H F W E H I G -1 N G Z J fp_copy_reverse
        J fp_text_done
      end
fp_copy_forward:
      R H F W E H I E 1 I F 1 I G -1 N G Z J fp_copy_forward
fp_text_done: M I/2 C J fp_ok
fp_send:
      R E f_action N E Z J fp_action_bad
      R E f_form N E 1 J fp_action_bad
      W f_action 1 J fp_ok
fp_go:
      R E f_action N E Z J fp_action_bad
      R B f_arg_b ifl B 1 J fp_bad end
      ifg B 108 J fp_bad end
      R A f_arg_a C S f_slice N A Z O S P
      R F f_arg_a R G f_arg_b M E 5954
fp_go_copy:
      R H F W E H I E 1 I F 1 I G -1 N G Z J fp_go_copy
      M A 5954 R B f_arg_b C S f_validate_navigation N A Z O S P
      W f_action 2 W f_action_ptr 5954 W f_action_len B
      J fp_ok
