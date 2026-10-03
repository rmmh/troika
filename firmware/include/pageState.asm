; Resident page metadata and status helpers shared across loading/interaction.
; Requires forthVm state definitions.
$pp_here: 5420
$pp_phase: 5421
$pp_index: 5422
$pp_kind: 5423
$pp_field: 5424
$pp_record: 5425
$pp_total: 5426
$pp_mode: 5427
$pp_submit: 5428
$pp_inputs: 5429
$pp_length: 5430
$pp_digits: 5431
$pp_left: 5432
$pp_dest: 5433
$pp_valid: 5434
$pp_error: 5435
$pp_active: 5436
$pp_source: 5437
$pp_feed_left: 5438

pp_bad: M A -110 J pp_fail
pp_full: M A -111 J pp_fail
pp_busy: M A -112 O S P
pp_fail:
      W pp_error A W pp_valid Z W f_ready Z W f_action Z W f_action_ptr Z W f_action_len Z O S P
pp_ok: M A Z O S P
