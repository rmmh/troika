; Native FAT directory creation/removal and file deletion.
; Requires fatMutate + fatGrow; omit from download-only browser images.
; A=stable path pointer, B=length. Same checked-mount/reentry contract as replace.
fs_mkdir:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E Z J fs_busy
      W fm_operation 2 W fm_kind 2
      M C 1 M D 243
      C S fm_begin N A Z O S P
      M A fs_buffer M C 243 C S fm_zero
      C S fs_replace_append N A Z O S P
      J fs_replace_finish
fs_delete:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E Z J fs_busy
      W fm_operation 3 W fm_kind Z M C Z M D Z
      C S fm_begin N A Z O S P
      J fs_replace_finish
fs_rmdir:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E Z J fs_busy
      E B 1 J fs_bad_path
      W fm_operation 4 W fm_kind Z M C Z M D Z
      C S fm_begin N A Z O S P
      R E fm_old_first W fm_free_block E
      R E fm_old_count W fm_free_left E
fm_empty_directory:
      R C fm_free_block M D fs_buffer C S fs_read_block
      N A Z O S P
      M J fs_buffer M K 243
fm_empty_cell:
      R E J
      ifn E Z W fs_opened Z M A -21 O S P end
      I J 1 I K -1 N K Z J fm_empty_cell
      R E fm_free_left I E -1 W fm_free_left E
      E E Z J fs_replace_finish
      R A fm_free_block C S fs_next
      ifn B Z M A B J fm_error end
      W fm_free_block A
      J fm_empty_directory

