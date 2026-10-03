; Atomic same-volume file copy. A/B=source path/count, C/D=destination/count.
; Requires a checked mount and no open handle; paths must remain stable outside
; FS and copy state. Copy metadata occupies inactive Forth state 5225..5230.
; One source block is read directly while the mutation owns the sole handle.
; Its allocated chain stays reachable until destination publication, including
; self-copy. No second filesystem handle or hidden buffer is used.
$cp_destination: 5225
$cp_destination_len: 5226
$cp_block: 5227
$cp_left: 5228
$cp_used: 5229
$cp_next: 5230
fs_copy:
      R E block_servicing N E Z J fs_busy R E fs_opened N E Z J fs_busy
      R E fs_mounted N E 2 J fs_not_checked
      W cp_destination C W cp_destination_len D
      C S fs_lookup N A Z O S P R E fs_found_kind N E 1 J fs_is_directory
      R E fs_found_first W cp_block E R E fs_found_count W cp_left E
      R E fs_found_used W cp_used E
      R A cp_destination R B cp_destination_len R C cp_left R D cp_used
      C S fs_replace_begin N A Z J cp_fail
cp_loop:
      R E cp_left E E Z J cp_finish
      R A cp_block C S fs_next ifn B Z M A B J cp_fail end W cp_next A
      R E cp_left
      ife E 1 N A -1 J cp_corrupt else E A -1 J cp_corrupt end
      R C cp_block M D fs_buffer C S fs_read_block N A Z J cp_fail
      R E cp_left
      ife E 1
        R E cp_used M I fs_buffer A I E M K 243 S K E
cp_padding:
        E K Z J cp_append R E I N E Z J cp_corrupt I I 1 I K -1 J cp_padding
      end
cp_append:
      C S fs_replace_append N A Z J cp_fail
      R E cp_next W cp_block E R E cp_left I E -1 W cp_left E J cp_loop
cp_finish: C S fs_replace_finish E A Z O S P J cp_fail
cp_corrupt: M A -11
cp_fail:
      U S A R E fs_opened
      ife E 3 R E fm_committed E E Z C S fs_replace_abort end
      C S fs_close O S A
      ife A -11 R E fs_mounted E E 2 W fs_mounted 1 end
      O S P
