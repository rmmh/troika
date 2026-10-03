; Resident browser lifecycle. Configure one NIC, address/lease policy, system
; unit and volume before browser_init; caller owns S and drives browser_step.
; init mounts/checks the system disk and installs /interact. open(A=URL,B=count)
; starts a native initial navigation. step returns 0 busy, 1 interactive, or a
; sticky negative failure. /compile and /interact are trusted native images.
$bu_state: 2504
$bu_status: 2505
browser_init:
      W block_service_vector Z R B serial_unit C S fs_mount N A Z J bu_fail
      C S fs_check N A Z J bu_fail C S f_reset
      W bu_state Z W bu_status Z W block_service_vector @browser_network
      C S bu_interact N A Z J bu_fail J pp_ok
browser_open:
      R E bu_state ifge E 1 ifle E 3 J bu_busy end end
      R E st_state ifn E Z N E 6 J bu_busy end
      U S A U S B C S bu_interact O S B O S C N A Z J bu_fail
      M A C C S url_parse N A Z O S P
      W f_action 2 W f_action_ptr 5954 W f_action_len B
      ; Clear request/send staging after cancellation, including a failed phase.
      M A 5453 M C 4 C S net_zero J bu_action
browser_step:
      C S browser_network R E bu_state
      ife E 1
        C S browser_connect_step ifl A Z J bu_fail end E A Z J bu_pending W bu_state 2
      end
      R E bu_state
      ife E 2
        M B 13 M A Z C S image_call ifl A Z J bu_fail end N A Z J bu_pending
        M A @bu_compile_path M B 8 C S image_load N A Z J bu_fail
        C S browser_response_begin N A Z J bu_fail W bu_state 3
      end
      R E bu_state
      ife E 3
        C S browser_response_step ifl A Z J bu_fail end E A Z J bu_pending
        C S bu_interact N A Z J bu_fail
        R E f_ready ifn E Z M A Z M B Z C S image_call N A Z J bu_fail end
        W bu_state 4 W bu_status 1
        R E f_action N E Z J bu_ready
        M A Z M B 8 M C Z C S image_call N A Z J bu_fail J bu_ready
      end
      R E bu_state N E 4 J bu_result
      R E f_action
      ife E Z
        M A Z M B 9 C S image_call
        E A -122 J bu_ready E A -125 J bu_ready ifl A Z J bu_fail end
      end
      R E f_action E E Z J bu_ready
      R E st_state ifn E Z N E 6 J bu_ready end
bu_action:
      M A Z M B 14 C S image_call N A Z J bu_fail
      M A 243 C S browser_connect_begin ifl A Z J bu_fail end
      W bu_state 1 W bu_status Z
bu_pending: M A Z O S P
bu_ready: M A 1 O S P
bu_result: R A bu_status O S P
bu_busy: M A -131 O S P
bu_fail:
      W bu_status A W bu_state -1
      U S A C S dns_client_cancel M A 1 C S stream_abort O S A J pp_fail
bu_interact: M A @bu_interact_path M B 9 J image_load
; Callback-safe pump: never enters phase code or consumes an owned stream body.
browser_network:
      C S net_poll
      ifg A Z
        C S dhcp_client_input C S dns_client_input C S stream_input
        E A 2 C S net_discard_input
      end
      C S dhcp_client_service C S dns_client_service C S stream_service O S P
dhcp_lease_lost: C S dns_client_cancel M A 6 J stream_abort
bu_compile_path: "/compile"
bu_interact_path: "/interact"
