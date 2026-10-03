; Atomic same-directory rename. A/B=source path/count, C/D=new basename/count.
; Checked mount, no open handle/callback. Names cannot include a slash. The
; caller's slices stay outside FS, copy state and the 171-cell path at 4010.
; A single directory block is changed; file chains and directory children stay
; reachable through the old or new name, even on a completely full medium.
$rn_path: 5225
$rn_length: 5226
$rn_name: 5227
$rn_name_len: 5228
$rn_block: 5229
$rn_slot: 5230
$rn_prefix: 5231
fs_rename:
      R E block_servicing N E Z J fs_busy R E fs_opened N E Z J fs_busy
      R E fs_mounted N E 2 J fs_not_checked
      ifle B 1 J fs_bad_path end ifl D 1 J fs_bad_path end ifg D 18 J fs_bad_path end
      M E 9841 S E D I E 1 ifg C E J fs_bad_path end
      W rn_path A W rn_length B W rn_name C W rn_name_len D
      M I C M K D
rn_name_loop:
      R E I E E 22 J fs_bad_path I I 1 I K -1 N K Z J rn_name_loop
      C S fs_lookup N A Z O S P
      R E fs_dir_block W rn_block E R E fs_slot W rn_slot E
      R E fs_name_ptr R F rn_path S E F W rn_prefix E
      R F rn_name_len A F E ifg F 171 J fs_bad_path end
      M A 4010 R B rn_path M C E C S fm_copy
      M A 4010 R E rn_prefix A A E R B rn_name R C rn_name_len C S fm_copy
      R B rn_prefix R E rn_name_len A B E M A 4010
      C S fs_lookup E A Z J fm_exists N A -12 O S P
      R E fs_path_left N E Z J fs_missing
      R C rn_block M D fs_buffer C S fs_read_block N A Z O S P
      R I rn_slot W fs_slot I C S fs_check_entry N A Z O S P
      R I rn_slot R E rn_name_len M I/1 E
      M A I I A 2 M C 18 C S fm_zero
      R A rn_slot I A 2 R B rn_name R C rn_name_len C S fm_copy
      R C rn_block M D fs_buffer J fs_write_block
