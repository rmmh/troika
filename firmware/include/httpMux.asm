; Three-client HTTP adapter for read-only files plus memory-only application
; actions (door profile). Disk-mutating handlers require additional locking.
; Configuration: hm_bank_a/b each (599 + hm_body_cells) cells, generated response
; bound hm_body_cells at 2552, plus the independent streamMux configuration.
; Shared FAT cache and mount remain live. Each reader saves its file cursor and
; block buffer. Call only at HTTP step boundaries, never during a parser/hook.
$hm_current: 2320
$hm_requested: 2321
$hm_pointer: 2322
$hm_iter: 2323
$hm_echo_owner: 2324
$hm_locations: 2325
$hm_serial: 2328
http_mux_init:
      R E hs_upload N E Z J stream_bad
      M A 80 C S mux_init
      W hm_current Z W hm_echo_owner -1 W hm_locations Z
      W 2326 hm_bank_a W 2327 hm_bank_b
      M A hm_bank_a M C 599 A C hm_body_cells C S net_zero
      M A hm_bank_b M C 599 A C hm_body_cells C S net_zero
      W hs_network @http_mux_network
      W mx_protocol @http_mux_protocol W mx_service @http_mux_transport
      M A Z O S P
http_mux_select:
      W hm_requested A C S mux_select N A Z O S P
      R E hm_requested R F hm_current E E F J net_no_input
      M I hm_locations A I E R B I W hm_pointer B W I Z
      M I hm_locations A I F W I B
      M A 2493 M C 7 C S mux_swap
      M A 6196 M C 124 C S mux_swap
      M A 4010 M C 216 C S mux_swap
      M A 2552 M C hm_body_cells C S mux_swap
      M A 6440 M C 243 C S mux_swap
      M A 6955 M C 6 C S mux_swap
      M A hm_serial M C 3 C S mux_swap
      R E hm_requested W hm_current E J net_no_input
http_mux_step:
      C S mux_step W hm_iter Z
http_mux_next:
      R A hm_iter C S http_mux_select
      ; Passive B serials are unique across clients. A slot may accept a new
      ; OPEN before its old HTTP state sees the transport tombstone.
      M A hm_serial M B st_b C S wide_compare
      ifn A Z
        C S fs_close C S hs_reset
        M A hm_serial M B st_b M C 3 C S net_copy
      end
      C S http_files_step
      R E hm_iter I E 1 W hm_iter E N E 3 J http_mux_next
      O S P
http_mux_network:
      ; Outer loop already pumped. Disk callbacks must continue all transports
      ; while leaving the interrupted application's parser/FS state selected.
      R E block_servicing E E Z O S P
      J mux_step
http_mux_protocol:
      M I A N I/1 4 J net_no_input N I/25 1 J net_no_input
      R E hm_echo_owner
      ife E -1 R E mx_current W hm_echo_owner E end
      M A E C S mux_select C S mux_ingress C S net_echo_input
      O S P
http_mux_transport:
      R E hm_echo_owner R F mx_current N E F O S P
      C S net_echo_service R E echo_pending E E Z W hm_echo_owner -1
      O S P
http_mux_wait:
      R E echo_pending N E Z M A 6561 N E Z J net_wait
      M K Z
http_mux_idle:
      M I 2380 R E mx_current
      ifn K E M I mx_locations A I K R I I A I 518 end
      R E I N E Z M A 6561 N E Z J net_wait
      M I 2493 R E hm_current
      ifn K E M I hm_locations A I K R I I end
      R E I N E Z M A 6561 N E Z J net_wait
      I K 1 N K 3 J http_mux_idle
      M A Z J net_wait
