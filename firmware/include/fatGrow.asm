; Native copy-on-write directory growth. Requires fatMutate.
; Reuses remaining offline-checker scratch; no additional buffer or recursion.
$fg_expected: 6986
$fg_used: 6987
$fg_operation: 6988
$fg_kind: 6989
$fg_old_first: 6990
$fg_old_count: 6991
$fg_read_block: 6992
$fg_read_left: 6993

fm_grow_directory:
      R E fm_expected W fg_expected E
      R E fm_used W fg_used E
      R E fm_operation W fg_operation E
      R E fm_kind W fg_kind E
      R E fs_dir_first W fg_old_first E W fg_read_block E
      R E fs_dir_count W fg_old_count E W fg_read_left E
      ; Resolve the directory's own entry using the original path prefix.
      R A fm_path R B fs_name_ptr S B A I B -1
      ifl B 1 J fs_bad_path end
      C S fs_lookup N A Z O S P
      R E fs_found_kind N E 2 J fs_not_directory
      R E fs_found_first R F fg_old_first N E F J fm_stale
      R E fs_found_count R F fg_old_count N E F J fm_stale
      R E fs_dir_block W fm_entry_block E
      R E fs_slot W fm_entry_slot E
      R E fs_name_ptr W fm_name E
      R E fs_name_len W fm_name_len E
      R E fg_old_first W fm_old_first E
      R E fg_old_count W fm_old_count E I E 1 W fm_expected E
      W fm_old_kind 2 W fm_kind 2 W fm_operation 5
      W fm_old_used 243 W fm_used 243
      W fm_first Z W fm_tail Z W fm_written Z W fm_committed Z
      W fs_opened 3
fg_copy_block:
      R C fg_read_block M D fs_buffer C S fs_read_block
      N A Z J fg_failed
      C S fs_replace_append N A Z J fg_failed
      R E fg_read_left I E -1 W fg_read_left E
      E E Z J fg_append_empty
      R A fg_read_block C S fs_next
      ifn B Z M A B J fg_failed end
      W fg_read_block A
      J fg_copy_block
fg_append_empty:
      M A fs_buffer M C 243 C S fm_zero
      C S fs_replace_append N A Z J fg_failed
      C S fs_replace_finish N A Z J fg_failed
      ; The directory is now larger and its old chain is free. Re-resolve the
      ; original target: no cached entry coordinate from before growth survives.
      R E fg_operation W fm_operation E
      R E fg_kind W fm_kind E
      R A fm_path R B fm_path_len R C fg_expected R D fg_used
      J fm_begin
fg_failed:
      R E fs_opened N E 3 O S P
      R E fm_committed
      ifn E Z W fs_opened Z O S P end
      U S A C S fs_replace_abort M E A O S A
      N E Z M A E
      O S P
