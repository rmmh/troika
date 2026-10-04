; HTTP body assembly inside download phase; requires fatMutate/http metadata.
; Init A=stable destination,B=length. Each char A is counted by HTTP first.
; Caller installs this phase before initializing HTTP and keeps path stable.
$dd_path: 2507
$dd_length: 2508
$dd_started: 2509
$dd_filled: 2510
 download_init:
      ifl B 1 J fs_bad_path end ifg B 171 J fs_bad_path end
      W dd_path A W dd_length B W dd_started Z W dd_filled Z J pp_ok
 dd_begin:
      R E dd_started N E Z J pp_ok
      R E h_status N E 200 J dd_status
      R D h_length M C D Q C 243 M E C P E 243
      ifg E D I C -1 S E 243 end
      S D E
      ifn D Z I C 1 else ifn C Z M D 243 end end
      R A dd_path R B dd_length C S fs_replace_begin N A Z O S P
      W dd_started 1 J pp_ok
 download_char:
      U S A C S dd_begin O S H N A Z O S P
      R E dd_filled M I fs_buffer A I E W I H I E 1 W dd_filled E
      E E 243 J dd_append
      R E h_received R F h_length N E F J pp_ok
 dd_append:
      C S fs_replace_append N A Z O S P W dd_filled Z J pp_ok
 download_finish:
      C S dd_begin N A Z O S P
      J fs_replace_finish
 download_cancel:
      R E dd_started E E Z J pp_ok
      R E fs_opened N E 3 J pp_ok R E fm_committed N E Z J pp_ok
      J fs_replace_abort
 dd_status: M A -132 O S P

; A download may outlast any number of DHCP renewals. Refill before the shared
; serial range runs out, including while no body data is arriving. Only the
; checked system volume is eligible: serial_refill then overwrites /net.seq
; without running the orphan checker or changing any FAT/directory entries.
; Park the partial block and lookup/handle state in this download phase.
; Mutation metadata remains intact; retain the refill's current FAT cache/tag.
 download_service:
      R E dd_started E E Z J pp_ok
      R E serial_valid E E Z J pp_ok
      R E 2539 R F 2536 S E F ifge E 4 J pp_ok end
      R E fs_opened N E 3 J fm_bad_state
      R E fs_mounted N E 2 J fs_not_checked
      R E fs_unit R F serial_unit N E F J fs_busy
      M A @dd_saved_buffer M B fs_buffer M C 243 C S net_copy
      M A @dd_saved_lookup M B fs_dir_first M C 23 C S net_copy
      W fs_opened Z C S serial_refill U S A
      M A fs_buffer M B @dd_saved_buffer M C 243 C S net_copy
      M A fs_dir_first M B @dd_saved_lookup M C 23 C S net_copy
      O S A O S P
; Private data is charged to the phase slot; accepted page RAM stays intact.
dd_saved_buffer//243
dd_saved_lookup//23
