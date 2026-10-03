; Native bounded page bytecode VM. Only the native compiler may seal f_ready.
; f_run(A=validated handler body) returns A=status; no host interpreter/state.
; Browser integration supplies f_browser(A=opcode); operands are in f_arg_a/b/c.
$f_here: 5360
$f_latest: 5361
$f_variables: 5362
$f_ready: 5363
$f_ds: 5364
$f_rs: 5365
$f_ip: 5366
$f_budget: 5367
$f_action: 5368
$f_action_ptr: 5369
$f_action_len: 5370
$f_status: 5371
$f_active: 5372
$f_opcode: 5373
$f_current_body: 5374
$f_current_entry: 5375
$f_controls: 5376
$f_token_len: 5377
$f_token: 5378
$f_mode: 5405
$f_comment: 5406
$f_binding: 5407
$f_flags: 5408
$f_source: 5409
$f_source_left: 5410
$f_number: 5411
$f_sign: 5412
$f_scratch: 5413
$f_records: 5414
$f_form: 5415
$f_operand: 5416
$f_arg_a: 5417
$f_arg_b: 5418
$f_arg_c: 5419

f_reset:
      M E 4010 M F 729
f_clear_code: W E Z I E 1 I F -1 N F Z J f_clear_code
      M E 5225 M F 243
f_clear_state: W E Z I E 1 I F -1 N F Z J f_clear_state
      W f_here 4010 M A Z O S P

f_run:
      R E f_active ifn E Z M A -80 O S P end
      W f_ds Z W f_rs Z W f_action Z W f_action_ptr Z W f_action_len Z
      R E f_ready N E 1 J f_invalid
      R E f_here ifl E 4010 J f_invalid end
      ifg E 4739 J f_invalid end
      W f_active 1 W f_ip A W f_budget 729 W f_status Z
f_step:
      R E f_budget E E Z J f_exhausted
      I E -1 W f_budget E
      R J f_ip
      ifl J 4010 J f_invalid end
      R E f_here ifge J E J f_invalid end
      R K J I J 1 W f_ip J W f_opcode K
      ifl K Z J f_invalid end
      ifg K 27 J f_invalid end
      ; Operands are data cells, not separately charged instructions.
      ifle K 5
        ifn K 1
          ifge J E J f_invalid end
          R F J W f_operand F I J 1 W f_ip J
        end
      end
      M E @f_needs A E K R F E R I f_ds
      ifl I F J f_underflow end
      M E @f_deltas A E K R E E A E I
      ifg E 81 J f_overflow end
      W f_ds E M J 5225 A J E
      M H 5225 A H I
      M A Z M B Z M C Z
      ifg F Z I H -1 R B H end
      ifg F 1 I H -1 R A H end
      ifg F 2 I H -1 R C H end
      E K Z J f_literal
      E K 1 J f_return
      E K 2 J f_call
      E K 3 J f_jump
      E K 4 J f_zero_jump
      E K 5 J f_defer
      E K 6 J f_dup
      E K 7 J f_step
      E K 8 J f_swap
      E K 9 J f_result
      E K 10 J f_rot
      E K 11 J f_add
      E K 12 J f_subtract
      E K 13 J f_multiply
      E K 14 J f_divmod
      E K 15 J f_equal
      E K 16 J f_less
      E K 17 J f_greater
      E K 18 J f_zero_equal
      E K 19 J f_negate
      E K 20 J f_abs
      E K 27 J f_depth
      ; Browser words share the same prechecked stack effects.
      W f_arg_a A W f_arg_b B W f_arg_c C M A K
      C S f_browser
      N A Z J f_fail
      J f_step
f_literal: R A f_operand J f_result
f_dup: M A B J f_result
f_depth: M A I J f_result
f_result: I J -1 W J A J f_step
f_swap: I J -2 W J B I J 1 W J A J f_step
f_rot: I J -3 W J A I J 1 W J B I J 1 W J C J f_step
f_add: A A B J f_result
f_subtract: S A B J f_result
f_multiply: P A B J f_result
f_equal: M E Z E A B M E 1 M A E J f_result
f_less: M E Z L A B M E 1 M A E J f_result
f_greater: M E Z L B A M E 1 M A E J f_result
f_zero_equal: M A Z E B Z M A 1 J f_result
f_negate: M A Z S A B J f_result
f_abs: M A B ifl A Z M A Z S A B end J f_result
f_divmod:
      E B Z J f_divzero
      ; Q rounds nearest. Correct toward zero using the remainder's sign.
      M C A M D A Q D B M E D P E B S C E
      ifg A Z
        ifl C Z
          ifg B Z I D -1 else I D 1 end
        end
      else
        ifl A Z
          ifg C Z
            ifg B Z I D 1 else I D -1 end
          end
        end
      end
      M E D P E B S A E
      I J -2 W J A I J 1 W J D J f_step
f_zero_jump: N B Z J f_step
f_jump:
      R A f_operand
      ifl A 4010 J f_invalid end
      R E f_here ifge A E J f_invalid end
      W f_ip A J f_step
f_defer:
      R A f_operand
      ifl A 4010 J f_invalid end
      R E f_here ifge A E J f_invalid end
      R A A W f_operand A
f_call:
      R E f_rs ifge E 27 J f_return_overflow end
      M F 5306 A F E R G f_ip W F G
      I E 1 W f_rs E J f_jump
f_return:
      R E f_rs
      ifn E Z
        I E -1 W f_rs E M F 5306 A F E R G F W f_ip G J f_step
      end
      R E f_ds N E Z J f_unbalanced
      W f_active Z W f_status Z M A Z O S P
f_invalid: M A -80 J f_fail
f_underflow: M A -81 J f_fail
f_overflow: M A -82 J f_fail
f_return_overflow: M A -83 J f_fail
f_exhausted: M A -84 J f_fail
f_divzero: M A -85 J f_fail
f_unbalanced: M A -86
f_fail:
      W f_status A W f_active Z W f_ds Z W f_rs Z
      W f_action Z W f_action_ptr Z W f_action_len Z O S P
f_needs: 0 0 0 0 1 0 1 1 2 2 3 2 2 2 2 2 2 2 1 1 1 1 2 1 3 0 2 0
f_deltas: 1 0 0 0 -1 0 1 -1 0 1 0 -1 -1 -1 0 -1 -1 -1 0 0 0 0 -2 1 -3 0 -2 1
