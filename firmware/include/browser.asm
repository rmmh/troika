; Resident browser lifecycle. Configure one NIC, address/lease policy, system
; unit and volume before browser_init; caller owns S and drives browser_step.
; init mounts/checks the system disk and installs /interact. open(A=URL,B=count)
; starts a native initial navigation. step returns 0 busy, 1 interactive, or a
; sticky negative failure. Disk phases are trusted native images.
$bu_state: 2504
$bu_status: 2505
$bu_download: 2511
$bu_destination: 2512
$bu_destination_len: 2513
browser_init:
      W block_service_vector Z R B serial_unit C S fs_mount N A Z J bu_fail
      C S fs_check N A Z J bu_fail C S f_reset
      W bu_state Z W bu_status Z W bu_download Z W block_service_vector @browser_network
      C S bu_interact N A Z J bu_fail J pp_ok
; Download keeps an accepted interactive page. Destination C/count D must stay
; stable outside scratch/FS/phase memory until completion. URL is copied now.
browser_download_open:
      R E pp_valid N E 1 J bu_busy R E 5446 N E 1 J bu_busy
      ifl D 1 J fs_bad_path end ifg D 171 J fs_bad_path end
      M F 1 J bu_open_check
browser_open: M F Z
bu_open_check:
      R E bu_state ifge E 1 ifle E 3 J bu_busy end end
      R E st_state ifn E Z N E 6 J bu_busy end
      W bu_download F W bu_destination C W bu_destination_len D
      U S A U S B C S bu_interact O S B O S C N A Z J bu_fail
      M A C C S url_parse ifn A Z W bu_download Z O S P end
      W f_action 2 W f_action_ptr 5954 W f_action_len B
      ; Clear request/send staging after cancellation, including a failed phase.
      M A 5453 M C 4 C S net_zero J bu_action
; Cancel at a caller boundary, never from a disk/network callback. A=-133.
; Download response failure aborts unpublished blocks before releasing transport.
browser_cancel:
      R E bu_state ifl E 1 J bu_busy end ifg E 3 J bu_busy end
      ife E 3 R E bu_download ifn E Z M A -133 C S br_fail end end
      M A -133 J bu_fail
browser_step:
      C S browser_network R E bu_state
      ife E 5
        M A Z M B 1 C S image_call ifl A Z J bu_fail end
        E A Z J bu_ready
        ifge A 4
          U S A U S B U S C M E A M A @bu_copy_path M B 9
          ife E 6 M A @bu_upload_path M B 7 end
          ife E 7 M A @bu_telnet_path M B 7 end
          C S image_load O S D O S C O S B N A Z J bu_fail
          M A Z C S image_call J bu_console_result
        end
        ifge A 2
          W bu_state Z
          ife A 2 C S bu_console_get
          else M A B M B C M F -1 C S bu_open_check end
          ifl A Z W bu_download 2 J bu_fail end J bu_pending
        end
        W bu_state Z M A @bu_home_path M B 6 J browser_open
      end
      ife E 1
        R E bc_phase
        ife E Z
          M A 243 C S browser_connect_begin E A -1 J bu_pending
        else C S browser_connect_step end
        ifl A Z J bu_fail end E A Z J bu_pending W bu_state 2
      end
      R E bu_state
      ife E 2
        M B 13 M A Z C S image_call ifl A Z J bu_fail end N A Z J bu_pending
        R E bu_download
        ifg E Z
          M A @bu_download_path M B 9 C S image_load N A Z J bu_fail
          R A bu_destination R B bu_destination_len C S browser_download_response_begin
        else
          M A @bu_compile_path M B 8 C S image_load N A Z J bu_fail
          C S browser_response_begin
        end
        N A Z J bu_fail W bu_state 3
      end
      R E bu_state
      ife E 3
        C S browser_response_step ifl A Z J bu_fail end E A Z J bu_pending
        R E bu_download ife E 2 M A Z J bu_console_result end
        C S bu_interact N A Z J bu_fail
        R E bu_download ifg E Z
          W bu_download Z W bu_state 4 W bu_status 1 J bu_ready
        end
        W bu_download Z
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
      R E f_action
      ifge E 3
        W bu_state Z M A @bu_console_path M B 8 C S image_load N A Z J bu_fail
        M B Z R E f_action ife E 4 M B 3 R D f_action_len end
        M A Z C S image_call N A Z J bu_fail
        W bu_state 5 W bu_status 1 J bu_ready
      end
      M A Z M B 14 C S image_call N A Z J bu_fail
      W bc_phase Z W bu_state 1 W bu_status Z
bu_pending: M A Z O S P
bu_ready: M A 1 O S P
bu_result: R A bu_status O S P
bu_busy: M A -131 O S P
bu_fail:
      W bu_status A W bu_state -1
      U S A C S dns_client_cancel
      ; A completed stream still owes its peer the final FIN acknowledgement.
      R E st_state ifn E 6 M A 1 C S stream_abort end O S A
      R E bu_download E E 2 J bu_console_result ifl E Z J bu_console_result end
      ifn E Z W f_action Z O S P end J pp_fail
; Console GET receives one counted argument string B/C, retained in page text.
; Split URL and absolute local path before replacing console code with interact.
bu_console_get:
      M J B M I B M K C M L Z
bu_console_url:
      E K Z J bu_console_bad R E I E E -27 J bu_console_space
      I I 1 I K -1 I L 1 J bu_console_url
bu_console_space:
      E K Z J bu_console_bad R E I N E -27 J bu_console_destination
      I I 1 I K -1 J bu_console_space
bu_console_destination:
      E L Z J bu_console_bad N E 22 J fs_bad_path
      M A J M B L M C I M D K M F 2 J bu_open_check
bu_console_bad: M A -137 O S P
; Do not recurse if the trusted console image itself fails to load.
; Caller-boundary recovery for a failed browser operation, A=negative status.
; Discards the failed page and shows the local console, or returns a load error.
browser_show_error:
bu_console_result:
      W bu_download Z W bu_state Z U S A
      M A @bu_console_path M B 8 C S image_load O S C N A Z J bu_fail
      M A Z M B 2 C S image_call N A Z J bu_fail
      W bu_state 5 W bu_status 1 J bu_ready
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
bu_download_path: "/download"
bu_compile_path: "/compile"
bu_interact_path: "/interact"

bu_console_path: "/console"
bu_home_path: "/index"

bu_copy_path: "/filecopy"

bu_telnet_path: "/telnet"
bu_upload_path: "/upload"
