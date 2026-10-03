; Native offline checker. Read-only by default; never frees an orphan implicitly.
; The iterative tree walk shares the one handle and uses eight ancestor frames.
; fs_check returns A=0 for a structurally valid volume, B=orphan block count.
; Tree/FAT cross-links, duplicate siblings, cycles and bad metadata return -11.
; This trades repeated scans for bounded RAM, intentionally an offline operation.
$fs_walk_stack: 6962
$fs_walk_depth: 6986
$fs_check_target: 6987
$fs_check_refs: 6988
$fs_check_name: 6989

fs_walk_begin:
      R E fs_opened
      N E Z J fs_busy
      R E fs_mounted
      E E Z J fs_bad_format
      W fs_walk_depth Z
      W fs_found_kind 2
      R E fs_root
      W fs_found_first E
      W fs_found_count 9
      C S fs_enum_open
      O S P

; Preorder traversal. A=status, B=kind or 0 EOF; found_* describes the entry.
; On returning a directory its child enumeration is already selected.
fs_walk_next:
      C S fs_enum_next
      N A Z O S P
      ife B Z
        R E fs_walk_depth
        ife E Z
          C S fs_close
          M B Z
          O S P
        end
        I E -1
        W fs_walk_depth E
        P E 3
        A E fs_walk_stack
        R F E
        W fs_file_block F
        I E 1
        R F E
        W fs_file_left F
        I E 1
        R F E
        W fs_file_used F
        W fs_enum_tag -1
        J fs_walk_next
      end
      ife B 2
        R E fs_walk_depth
        ifge E 8 J fs_corrupt end
        M F E
        I E 1
        W fs_walk_depth E
        P F 3
        A F fs_walk_stack
        R E fs_file_block
        W F E
        I F 1
        R E fs_file_left
        W F E
        I F 1
        R E fs_file_used
        W F E
        R E fs_found_first
        W fs_file_block E
        R E fs_found_count
        W fs_file_left E
        W fs_file_used Z
        W fs_enum_tag -1
      end
      M A Z
      O S P

; Validate all FAT entries, including unused capacity in the final FAT page.
fs_check_fat:
      R L fs_capacity
      M C 1
fs_check_fat_page:
      M D fs_fat_buffer
      C S fs_read_block
      N A Z O S P
      W fs_fat_tag C
      M J fs_fat_buffer
      M K 243
fs_check_fat_cell:
      R E J
      ifle L Z
        N E -2 J fs_corrupt
        J fs_check_fat_advance
      end
      R A fs_capacity
      S A L
      R F fs_data
      ifl A F
        N E -2 J fs_corrupt
        J fs_check_fat_advance
      end
      E E -3 J fs_check_fat_advance
      E E -1 J fs_check_fat_advance
      E E Z J fs_check_fat_advance
      L E F J fs_corrupt
      R G fs_capacity
      G E G J fs_corrupt
      E E A J fs_corrupt
fs_check_fat_advance:
      I L -1
      I J 1
      I K -1
      N K Z J fs_check_fat_cell
      I C 1
      R E fs_fat_count
      ifle C E J fs_check_fat_page end
      M A Z
      O S P

; Compare all sibling pairs in the currently selected directory.
; Use only the 18-cell mutation/name scratch; save iterator indices on S.
fs_check_duplicates:
      C S fs_enum_next
      N A Z O S P
      E B Z J fs_duplicates_done
      R E fs_file_used
      U S E
      R E fs_slot
      I E 1
      R J E
      U S J
      I E 1
      M F fs_check_name
fs_duplicate_copy:
      R G E
      W F G
      I E 1
      I F 1
      I J -1
      N J Z J fs_duplicate_copy
fs_duplicate_scan:
      C S fs_enum_next
      ifn A Z
        O S J
        O S J
        O S P
      end
      E B Z J fs_duplicate_restore
      R E fs_slot
      I E 1
      R J E
      R K S
      N J K J fs_duplicate_scan
      M F fs_check_name
fs_duplicate_compare:
      I E 1
      R G E
      R H F
      N G H J fs_duplicate_scan
      I F 1
      I J -1
      N J Z J fs_duplicate_compare
      O S J
      O S J
      J fs_corrupt
fs_duplicate_restore:
      O S J
      O S E
      W fs_file_used E
      J fs_check_duplicates
fs_duplicates_done:
      W fs_file_used Z
      W fs_enum_tag -1
      M A Z
      O S P

fs_check:
      R E fs_opened
      N E Z J fs_busy
      R E fs_mounted
      E E Z J fs_bad_format
      C S fs_check_fat
      N A Z O S P
      C S fs_walk_begin
      N A Z O S P
      C S fs_check_duplicates
      N A Z O S P
fs_check_tree:
      C S fs_walk_next
      N A Z O S P
      E B Z J fs_check_reachability
      ife B 2
        C S fs_check_duplicates
        N A Z O S P
      else
        ; fs_check_entry left the last chain block in fs_chain_block.
        R E fs_found_count
        ifn E Z
          R C fs_chain_block
          M D fs_buffer
          C S fs_read_block
          N A Z O S P
          W fs_enum_tag -1
          R K fs_found_used
          M J fs_buffer
          A J K
          Z K 243
fs_check_file_tail:
          E K Z J fs_check_tree
          R E J
          N E Z J fs_corrupt
          I J 1
          I K -1
          J fs_check_file_tail
        end
      end
      J fs_check_tree

; For each data block, count references by walking the bounded tree again.
; Native stack retains the orphan count across traversals, never a RAM bitmap.
fs_check_reachability:
      M A Z
fs_check_scan:
      U S A
      M E Z
      U S E
      R E fs_data
      W fs_check_target E
fs_check_target_loop:
      ; Free/bad blocks cannot be reachable: the earlier tree validation rejects
      ; them in a live chain. Avoid a whole-tree rescan for every free block.
      R J fs_check_target
      M C 1
fs_check_skip_divide:
      L J 243 J fs_check_skip_page
      S J 243
      I C 1
      J fs_check_skip_divide
fs_check_skip_page:
      R E fs_fat_tag
      ifn C E
        M D fs_fat_buffer
        C S fs_read_block
        ifn A Z
          O S E
          O S E
          O S P
        end
        W fs_fat_tag C
      end
      A J fs_fat_buffer
      R E J
      E E Z J fs_check_next_target
      E E -3 J fs_check_next_target
      W fs_check_refs Z
      C S fs_walk_begin
      ifn A Z
        O S E
        O S E
        O S P
      end
fs_check_reference_loop:
      C S fs_walk_next
      ifn A Z
        O S E
        O S E
        O S P
      end
      E B Z J fs_check_target_done
      R E fs_found_count
      E E Z J fs_check_reference_loop
      W fs_chain_left E
      R A fs_found_first
fs_check_reference_chain:
      R E fs_check_target
      ife A E
        R E fs_check_refs
        I E 1
        W fs_check_refs E
        ifg E 1
          O S E
          O S E
          J fs_corrupt
        end
      end
      C S fs_next
      ifn B Z
        O S E
        O S E
        M A B
        O S P
      end
      R E fs_chain_left
      I E -1
      W fs_chain_left E
      N E Z J fs_check_reference_chain
      J fs_check_reference_loop
fs_check_target_done:
      R E fs_check_refs
      ife E Z
        ; Read raw FAT cell: fs_next rejects free/bad values, which are normal here.
        R J fs_check_target
        M C 1
fs_check_target_divide:
        L J 243 J fs_check_target_page
        S J 243
        I C 1
        J fs_check_target_divide
fs_check_target_page:
        M D fs_fat_buffer
        C S fs_read_block
        ifn A Z
          O S E
          O S E
          O S P
        end
        W fs_fat_tag C
        A J fs_fat_buffer
        R E J
        E E Z J fs_check_next_target
        E E -3 J fs_check_next_target
        M F S
        I F 1
        R F F
        ifn F Z
          W J Z
          M D fs_fat_buffer
          C S fs_write_block
          ifn A Z
            O S E
            O S E
            O S P
          end
        end
        O S E
        I E 1
        U S E
      end
fs_check_next_target:
      R E fs_check_target
      I E 1
      W fs_check_target E
      R F fs_capacity
      L E F J fs_check_target_loop
      O S B
      O S E
      W fs_mounted 2
      M A Z
      O S P

; Explicit repair: first validate the entire tree/FAT, then free only blocks
; proved unreachable. Old directory copies never cause child reclamation.
fs_reclaim:
      C S fs_check
      N A Z O S P
      M A 1
      C S fs_check_scan
      O S P
