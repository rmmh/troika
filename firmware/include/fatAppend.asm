; Atomic append to an existing file: A/B path/count, C/D stable suffix/count.
; Suffix is 1..243 cells outside filesystem RAM and this ten-cell state arena.
; Copy the still-reachable old chain block by block into a replacement chain.
; Uses only fs_buffer; no old-file-sized staging area or second open handle.
$ap_path: 5225
$ap_path_len: 5226
$ap_source: 5227
$ap_left: 5228
$ap_block: 5229
$ap_blocks: 5230
$ap_used: 5231
$ap_next: 5232
$ap_count: 5233
$ap_last: 5234
fs_append:
      R E block_servicing N E Z J fs_busy R E fs_opened N E Z J fs_busy
      ifl D 1 J fm_bad_state end ifg D 243 J fm_bad_state end
      ifl C 365 J fm_bad_state end
      M E C A E D I E -1 ifl E C J fm_bad_state end
      ifle C 7006 ifge E 6440 J fm_bad_state end end
      ifle C 5234 ifge E 5225 J fm_bad_state end end
      W ap_path A W ap_path_len B W ap_source C W ap_left D
      C S fs_lookup N A Z O S P R E fs_found_kind N E 1 J fs_is_directory
      R E fs_found_first W ap_block E R E fs_found_count W ap_blocks E W ap_count E
      R E fs_found_used W ap_used E R F ap_left A E F
      ifg E 243 S E 243 R F ap_count I F 1 W ap_count F end
      W ap_last E R E ap_blocks ife E Z W ap_count 1 end
      R A ap_path R B ap_path_len R C ap_count R D ap_last
      C S fs_replace_begin N A Z J ap_fail
ap_old:
      R E ap_blocks E E Z J ap_empty
      R A ap_block C S fs_next ifn B Z M A B J ap_fail end W ap_next A
      R E ap_blocks
      ife E 1 N A -1 J ap_corrupt else E A -1 J ap_corrupt end
      R C ap_block M D fs_buffer C S fs_read_block N A Z J ap_fail
      R E ap_blocks E E 1 J ap_tail
      C S fs_replace_append N A Z J ap_fail
      R E ap_next W ap_block E R E ap_blocks I E -1 W ap_blocks E J ap_old
ap_empty:
      M A fs_buffer M C 243 C S fm_zero W ap_used Z J ap_fill
ap_tail:
      R E ap_used M I fs_buffer A I E M K 243 S K E
ap_padding:
      E K Z J ap_fill R E I N E Z J ap_corrupt
      I I 1 I K -1 J ap_padding
ap_fill:
      R E ap_used E E 243 J ap_write
      R E ap_left E E Z J ap_write
      R I ap_source R F I I I 1 W ap_source I
      R I ap_used A I fs_buffer W I F
      R E ap_used I E 1 W ap_used E R E ap_left I E -1 W ap_left E J ap_fill
ap_write:
      C S fs_replace_append N A Z J ap_fail
      R E ap_left N E Z J ap_empty
      C S fs_replace_finish E A Z O S P
ap_fail:
      U S A R E fs_opened
      ife E 3 R E fm_committed E E Z C S fs_replace_abort end
      C S fs_close O S A
      ife A -11 R E fs_mounted E E 2 W fs_mounted 1 end
      O S P
ap_corrupt: M A -11 J ap_fail
