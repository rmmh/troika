; HTTP body assembly inside download phase; requires fatMutate/http metadata.
; Init A=stable destination,B=length. Each char A is counted by HTTP first.
; Caller installs this phase before initializing HTTP and keeps path stable.
$dd_path: 2507
$dd_length: 2508
$dd_started: 2509
$dd_filled: 2510
 download_init:
      ifl B 1 J fs_bad_path end ifg B 171 J fs_bad_path end
      W dd_path A W dd_length B W dd_started Z W dd_filled Z J dd_wait
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
      C S fs_replace_append N A Z O S P C S dd_progress W dd_filled Z J pp_ok
 download_finish:
      C S dd_begin N A Z O S P
      M J @dd_saving C S dd_caption J fs_replace_finish
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

; Native transfer feedback occupies the bottom three text rows. The bar is
; updated after each durable block append, never by a host-side timer.
dd_wait: M I -9193 M K 81
dd_clear: W I 32 I I 1 I K -1 N K Z J dd_clear
      M J @dd_waiting C S dd_caption M I -9166 W I 91 I I 1 M K 25
dd_empty: W I 46 I I 1 I K -1 N K Z J dd_empty W I 93 J pp_ok
dd_caption: M I -9193 M K 27
dd_caption_clear: W I 32 I I 1 I K -1 N K Z J dd_caption_clear M I -9193
dd_caption_copy: R E J E E Z O S P W I E I I 1 I J 1 J dd_caption_copy
dd_progress: M J @dd_receiving C S dd_caption
      R G h_received R H h_length ifle H Z M F 100 J dd_percent end
      ifge G H M F 100 J dd_percent end
      ; Compute floor(100*received/length) without an overflowing product.
      M L H S L G M K Z M F Z M J 100
dd_ratio: ifge K L S K L I F 1 else A K G end I J -1 N J Z J dd_ratio
dd_percent: M G F M H 100 M I -9139
      ; Three decimal places, keeping the total bounded by100.
      M E Z
dd_digit: ifl G H J dd_digit_out end S G H I E 1 J dd_digit
dd_digit_out: A E 48 W I E I I 1 E H 1 J dd_percent_end Q H 10 J dd_digit_reset
dd_digit_reset: M E Z J dd_digit
dd_percent_end: W I 37
      ; Each complete four percent fills one of25 native screen cells.
      M G F M H Z
dd_fill_count: ifl G 4 J dd_bar end I G -4 I H 1 J dd_fill_count
dd_bar: M I -9165 M K Z
dd_bar_cell: M E 46 ifl K H M E 35 end W I E I I 1 I K 1 ifl K 25 J dd_bar_cell end O S P
dd_waiting: 87 97 105 116 105 110 103 32 102 111 114 32 100 111 119 110 108 111 97 100 46 46 46 0
dd_receiving: 68 111 119 110 108 111 97 100 105 110 103 46 46 46 0
dd_saving: 83 97 118 105 110 103 32 100 111 119 110 108 111 97 100 46 46 46 0
