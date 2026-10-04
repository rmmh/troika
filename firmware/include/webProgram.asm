; Resident program-overlay glue. Forth runs only after the UI phase returns.
$bu_forth_event: 2515
bu_forth_load: M B Z
bu_run_forth:
      U S B M A @wp_forth_path M B 6 C S image_load O S B N A Z O S P
      M A Z C S image_call U S A C S bu_interact O S B N A Z O S P M A B O S P
web_program_menu:
      C S browser_network C S dns_client_cancel
      R E st_state ifn E Z ifn E 6 M A 1 C S stream_abort end end
      R E net_pending N E Z J web_program_menu
      R E st_control N E Z J web_program_menu
      R E 100 N E Z J web_program_menu
      C S fs_close W block_service_vector Z W 2506 Z J program_menu
wp_forth_path: "/forth"
