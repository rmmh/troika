; Native FAT atomic file create/replace. Requires fat + fatWrite helpers.
; Optional fatAdmin adds mkdir/delete/rmdir using this mutation engine.
; Mutation state reuses the offline checker's scratch at 6962..7006.
; Caller path must remain stable outside filesystem RAM until commit/abort.
; begin(A=path,B=length,C=block count,D=last used), append(fs_buffer), finish.
; Empty files use count=used=0. Each append supplies one whole logical block.
$fm_path: 6962
$fm_path_len: 6963
$fm_expected: 6964
$fm_used: 6965
$fm_entry_block: 6966
$fm_entry_slot: 6967
$fm_old_first: 6968
$fm_old_count: 6969
$fm_first: 6970
$fm_tail: 6971
$fm_written: 6972
$fm_name: 6973
$fm_name_len: 6974
$fm_kind: 6975
$fm_committed: 6976
$fm_scan: 6977
$fm_value: 6978
$fm_block: 6979
$fm_free_block: 6980
$fm_free_left: 6981
$fm_next: 6982
$fm_old_kind: 6983
$fm_old_used: 6984
$fm_operation: 6985

fs_replace_begin:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E Z J fs_busy
      W fm_operation 1 W fm_kind 1
      J fm_begin
fm_begin:
      R E fs_mounted N E 2 J fs_not_checked
      ifl B 1 J fs_bad_path end
      ifg B 171 J fs_bad_path end
      M E A A E B I E -1
      ifl E A J fs_bad_path end
      ifle A 7006
        ifge E 6440 J fs_bad_path end
      end
      ifl C Z J fm_bad_state end
      R E fs_capacity ifg C E J fm_bad_state end
      ife C Z
        N D Z J fm_bad_state
      else
        ifl D 1 J fm_bad_state end
        ifg D 243 J fm_bad_state end
      end
      W fm_path A W fm_path_len B W fm_expected C W fm_used D
      W fm_committed Z W fm_first Z W fm_tail Z W fm_written Z
      C S fs_lookup
      E A -12 J fm_missing
      N A Z O S P
      R E fm_operation E E 2 J fm_exists
      R E fs_found_kind
      R F fm_operation
      ife F 4
        N E 2 J fs_not_directory
      else
        N E 1 J fs_is_directory
      end
      W fm_old_kind E
      R E fs_found_first W fm_old_first E
      R E fs_found_count W fm_old_count E
      R E fs_found_used W fm_old_used E
      J fm_save_entry
fm_missing:
      R E fs_path_left N E Z J fs_missing
      R E fm_operation ifg E 2 J fs_missing end
      ife E 2
        R E fs_depth ifg E 8 J fs_bad_path end
      end
      W fm_old_kind Z W fm_old_first Z W fm_old_count Z W fm_old_used Z
      R E fs_dir_first W fs_dir_block E
      R E fs_dir_count W fs_dir_left E
fm_find_slot_block:
      R C fs_dir_block M D fs_buffer C S fs_read_block
      N A Z O S P
      M J fs_buffer M K 9
fm_find_slot:
      R E J E E Z J fm_empty_slot
      A J 27 I K -1 N K Z J fm_find_slot
      R E fs_dir_left I E -1 W fs_dir_left E
      E E Z J fm_directory_full
      R A fs_dir_block R E fs_dir_root
      ifn E Z
        I A 1
      else
        C S fs_next
        ifn B Z M A B O S P end
      end
      W fs_dir_block A J fm_find_slot_block
fm_empty_slot:
      W fs_slot J
fm_save_entry:
      R E fs_dir_block W fm_entry_block E
      R E fs_slot W fm_entry_slot E
      R E fs_name_ptr W fm_name E
      R E fs_name_len W fm_name_len E
      W fs_opened 3
      M A Z O S P

; Raw FAT cell lookup. A=physical data block; A=status,J=cell,C=FAT page.
; Unlike fs_next, free and bad cells are legitimate results for allocation.
fm_fat_cell:
      R E fs_data ifl A E J fs_corrupt end
      R E fs_capacity ifge A E J fs_corrupt end
      M J A M C 1
fm_fat_divide:
      L J 243 J fm_fat_page
      S J 243 I C 1 J fm_fat_divide
fm_fat_page:
      R E fs_fat_tag
      ifn E C
        M D fs_fat_buffer C S fs_read_block
        N A Z O S P
        W fs_fat_tag C
      end
      A J fs_fat_buffer
      M A Z O S P
; A=physical block, B=FAT value; atomic page update, preserving fs_buffer.
fm_fat_set:
      W fm_value B
      C S fm_fat_cell N A Z O S P
      R E fm_value W J E
      M D fs_fat_buffer
      J fs_write_block
fm_allocate:
      R E fs_data W fm_scan E
fm_allocate_loop:
      R A fm_scan R E fs_capacity
      ifge A E M A -18 O S P end
      C S fm_fat_cell N A Z O S P
      R E J
      ife E Z
        R E fm_scan W fm_block E
        M A E M B -1
        J fm_fat_set
      end
      R E fm_scan I E 1 W fm_scan E
      J fm_allocate_loop

fs_replace_append:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E 3 J fm_bad_state
      R E fm_committed N E Z J fm_bad_state
      R E fm_written R F fm_expected
      ifge E F J fm_bad_state end
      I E 1
      ife E F
        R K fm_used M J fs_buffer A J K Z K 243
fm_pad_tail:
        E K Z J fm_append_allocate
        W J Z I J 1 I K -1 J fm_pad_tail
      end
fm_append_allocate:
      C S fm_allocate N A Z O S P
      R C fm_block M D fs_buffer C S fs_write_block
      N A Z O S P
      R A fm_tail
      ife A Z
        R E fm_block W fm_first E
      else
        R B fm_block C S fm_fat_set N A Z O S P
      end
      R E fm_block W fm_tail E
      R E fm_written I E 1 W fm_written E
      M A Z O S P

fs_replace_finish:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E 3 J fm_bad_state
      R E fm_committed N E Z J fm_bad_state
      R E fm_written R F fm_expected N E F J fm_bad_state
      R C fm_entry_block M D fs_buffer C S fs_read_block
      N A Z O S P
      R E fm_entry_slot W fs_slot E
      C S fs_check_entry N A Z O S P
      R J fm_entry_slot R E fm_old_kind N J/0 E J fm_stale
      R E fm_old_first N J/20 E J fm_stale
      R E fm_old_count N J/21 E J fm_stale
      R E fm_old_used N J/22 E J fm_stale
      R E fm_old_kind
      ifn E Z
        R E fm_name_len N J/1 E J fm_stale
        M A J I A 2 R B fm_name M C E
fm_check_name:
        R E A R F B N E F J fm_stale
        I A 1 I B 1 I C -1 N C Z J fm_check_name
      end
      R J fm_entry_slot M A J M C 27 C S fm_zero
      R E fm_kind
      ifn E Z
        M J/0 E R E fm_name_len M J/1 E
        M A J I A 2 R B fm_name R C fm_name_len C S fm_copy
        R E fm_first M J/20 E
        R E fm_expected M J/21 E
        R E fm_used M J/22 E
      end
      R C fm_entry_block M D fs_buffer C S fs_write_block
      N A Z O S P
      W fm_committed 1
      R E fm_old_first W fm_free_block E
      R E fm_old_count W fm_free_left E
      C S fm_free_chain N A Z O S P
      J fs_close
; Abort explicitly frees only this mutation's unpublished, fully written chain.
fs_replace_abort:
      R E block_servicing N E Z J fs_busy
      R E fs_opened N E 3 J fm_bad_state
      R E fm_committed N E Z J fm_bad_state
      R E fm_first W fm_free_block E
      R E fm_written W fm_free_left E
      C S fm_free_chain N A Z O S P
      J fs_close
fm_free_chain:
      R E fm_free_left E E Z J fm_ok
      R A fm_free_block C S fs_next
      ifn B Z M A B J fm_error end
      W fm_next A
      R A fm_free_block M B Z C S fm_fat_set
      N A Z O S P
      R E fm_next W fm_free_block E
      R E fm_free_left I E -1 W fm_free_left E
      J fm_free_chain
fm_copy:
      E C Z J fm_ok
fm_copy_loop:
      D A B I C -1 N C Z J fm_copy_loop
      M A Z O S P
fm_zero:
      E C Z J fm_ok
fm_zero_loop:
      W A Z I A 1 I C -1 N C Z J fm_zero_loop
fm_ok: M A Z O S P
fm_stale: M A -11
fm_error:
      E A -11 W fs_mounted 1
      W fs_opened Z
      O S P
fm_exists: M A -20 O S P
fm_directory_full:
      R E fs_dir_root N E Z J fm_no_directory_space
      R E fs_dir_count ifge E 9 J fm_no_directory_space end
      J fm_grow_directory
fm_no_directory_space: M A -19 O S P
fm_bad_state: M A -22 O S P
