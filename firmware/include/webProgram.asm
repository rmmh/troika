; Resident program-overlay glue. Forth runs only after the UI phase returns.
$bu_forth_event: 2515
$wp_download: 2511
bu_forth_load: M B Z
bu_run_forth:
      U S B M A @wp_forth_path M B 6 C S image_load O S B N A Z O S P
      M A Z C S image_call U S A C S bu_interact O S B N A Z O S P M A B O S P
web_program_menu: W wp_download Z
web_run_program:
      C S browser_network C S dns_client_cancel
      R E st_state ifn E Z ifn E 6 M A 1 C S stream_abort end end
      R E net_pending N E Z J web_run_program
      R E st_control N E Z J web_run_program
      R E 100 N E Z J web_run_program
      C S fs_close W block_service_vector Z W 2506 Z
      R E wp_download ife E 3 M A @wp_launch_path M B 7 J program_exec end J program_menu
wp_forth_path: "/forth"

wp_launch_path: "/launch"

; Counted path suffix validation is resident to share the narrow phase budget.
; I points at four remaining URL digits; K=4. No I/O or phase calls.
wp_program_digits:
      R E I ifl E 28 J pp_ok end ifg E 37 J pp_ok end
      I I 1 I K -1 N K Z J wp_program_digits W f_action 6 J pp_ok
