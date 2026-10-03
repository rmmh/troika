; Native FAT v2 read path. All state lives in the specified 567-tryte region.
; Public: fs_mount(B=unit), fs_lookup(A=path,B=length), fs_open(), fs_read_next().
; Result A: 0 success; read-next B=count (0 EOF), data at fs_buffer.
; Errors: hardware -1..-6; -10 format, -11 corruption, -12 missing,
; -13 not-directory, -14 is-directory, -15 path, -16 media changed.
; All registers A..L are caller-saved; S is the native stack.
$fs_buffer: 6440
$fs_fat_buffer: 6683
$fs_unit: 6926
$fs_mounted: 6927
$fs_gen_hi: 6928
$fs_gen_mid: 6929
$fs_gen_lo: 6930
$fs_capacity: 6931
$fs_fat_count: 6932
$fs_root: 6933
$fs_data: 6934
$fs_vol_hi: 6935
$fs_vol_mid: 6936
$fs_vol_lo: 6937
$fs_fat_tag: 6938
$fs_dir_first: 6939
$fs_dir_count: 6940
$fs_dir_block: 6941
$fs_dir_left: 6942
$fs_dir_root: 6943
$fs_path_ptr: 6944
$fs_path_left: 6945
$fs_name_ptr: 6946
$fs_name_len: 6947
$fs_depth: 6948
$fs_slot: 6949
$fs_slots_left: 6950
$fs_found_kind: 6951
$fs_found_first: 6952
$fs_found_count: 6953
$fs_found_used: 6954
$fs_file_block: 6955
$fs_file_left: 6956
$fs_file_used: 6957
$fs_chain_block: 6958
$fs_chain_left: 6959
$fs_opened: 6960

fs_mount:
      R E fs_opened
      N E Z J fs_busy
      W fs_mounted Z
      W fs_opened Z
      W fs_found_kind Z
      ifl B Z J fs_bad_unit end
      ifg B 26 J fs_bad_unit end
      R A 0s_BG
      N A Z J fs_busy
      W 0s_BL B
      W fs_unit B
      R A 0s_BA
      E A Z J fs_no_media
      R A 0s_BO
      W fs_gen_hi A
      R A 0s_BP
      W fs_gen_mid A
      R A 0s_BQ
      W fs_gen_lo A
      R A 0s_BB
      W fs_capacity A
      M C Z
      M D fs_fat_buffer
      M A 1
      C S block_io
      N A Z O S P
      C S fs_check_media
      N A Z O S P
      M J fs_fat_buffer
      R A J
      N A 243 J fs_bad_format
      I J 1
      R A J
      N A 27 J fs_bad_format
      I J 1
      R A J
      N A 1 J fs_bad_format
      I J 1
      R A J
      N A 2 J fs_bad_format
      I J 1
      R A J
      N A 243 J fs_bad_format
      I J 1
      R A J
      R B fs_capacity
      N A B J fs_bad_format
      ; ceil(capacity / 243), without relying on rounded Q division.
      M C Z
fs_mount_fat_size:
      I C 1
      S B 243
      ifg B Z J fs_mount_fat_size end
      I J 1
      R A J
      N A C J fs_bad_format
      W fs_fat_count C
      I C 1
      W fs_root C
      I J 1
      R A J
      N A C J fs_bad_format
      I J 1
      R A J
      N A 9 J fs_bad_format
      I C 9
      W fs_data C
      I J 1
      R A J
      N A C J fs_bad_format
      I J 1
      R A J
      W fs_vol_hi A
      M F A
      I J 1
      R A J
      W fs_vol_mid A
      ; Count nonzero components, rather than OR-ing signed values.
      N A Z M F 1
      I J 1
      R A J
      W fs_vol_lo A
      N A Z M F 1
      E F Z J fs_bad_format
      I J 1
      M K 230
fs_mount_reserved:
      R A J
      N A Z J fs_bad_format
      I J 1
      I K -1
      N K Z J fs_mount_reserved
      W fs_fat_tag -1
      W fs_mounted 1
      M A Z
      O S P

fs_check_media:
      R E 0s_BL
      R F fs_unit
      N E F J fs_media_changed
      R E 0s_BO
      R F fs_gen_hi
      N E F J fs_media_changed
      R E 0s_BP
      R F fs_gen_mid
      N E F J fs_media_changed
      R E 0s_BQ
      R F fs_gen_lo
      N E F J fs_media_changed
      M A Z
      O S P

; C=block D=buffer. Preserve J,K,L for callers; always validate generation.
fs_read_block:
      C S fs_check_media
      N A Z O S P
      R B fs_unit
      M A 1
      C S block_io
      ifn A Z
        W fs_mounted Z
        W fs_opened Z
        W fs_fat_tag -1
        O S P
      end
      C S fs_check_media
      O S P

; A=physical data block. A=next (-1 final), B=status. Preserves nothing else.
fs_next:
      M L A
      R E fs_data
      L A E J fs_next_corrupt
      R E fs_capacity
      G A E J fs_next_corrupt
      E A E J fs_next_corrupt
      M J A
      M C 1
fs_next_divide:
      L J 243 J fs_next_page
      S J 243
      I C 1
      J fs_next_divide
fs_next_page:
      M K C
      R E fs_fat_tag
      ifn E C
        M D fs_fat_buffer
        C S fs_read_block
        ifn A Z
          M B A
          O S P
        end
        W fs_fat_tag K
      end
      A J fs_fat_buffer
      R A J
      ife A -1
        M B Z
        O S P
      end
      R E fs_data
      L A E J fs_next_corrupt
      R E fs_capacity
      G A E J fs_next_corrupt
      E A E J fs_next_corrupt
      E A L J fs_next_corrupt
      M B Z
      O S P
fs_next_corrupt:
      M B -11
      O S P

; A=first B=declared count, checks exact chain length before exposing data.
fs_validate_chain:
      W fs_chain_block A
      W fs_chain_left B
      ifl B 1 J fs_corrupt end
      R E fs_capacity
      ifg B E J fs_corrupt end
fs_chain_loop:
      R A fs_chain_block
      C S fs_next
      ifn B Z
        M A B
        O S P
      end
      R E fs_chain_left
      I E -1
      W fs_chain_left E
      ife E Z
        N A -1 J fs_corrupt
        M A Z
        O S P
      end
      E A -1 J fs_corrupt
      W fs_chain_block A
      J fs_chain_loop

; Caller supplies a counted absolute path. No lookup operation mutates disk.
fs_lookup:
      R E fs_opened
      N E Z J fs_busy
      W fs_opened Z
      W fs_found_kind Z
      W fs_path_ptr A
      W fs_path_left B
      R E fs_mounted
      E E Z J fs_bad_format
      ifl B 1 J fs_bad_path end
      ifg B 171 J fs_bad_path end
      M C 9841
      S C B
      I C 1
      ifg A C J fs_bad_path end
      R E A
      N E 0s_NI J fs_bad_path
      I A 1
      I B -1
      W fs_path_ptr A
      W fs_path_left B
      W fs_depth Z
      R A fs_root
      W fs_dir_first A
      W fs_dir_count 9
      W fs_dir_root 1
      ife B Z
        W fs_found_kind 2
        W fs_found_first A
        W fs_found_count 9
        W fs_found_used 243
        M A Z
        O S P
      end
fs_component:
      R E fs_depth
      I E 1
      W fs_depth E
      ifg E 9 J fs_bad_path end
      R J fs_path_ptr
      W fs_name_ptr J
      R K fs_path_left
      M L Z
fs_name_loop:
      E K Z J fs_name_ready
      R A J
      E A 0s_NI J fs_name_ready
      ; Encoded lowercase letters occupy -13..-1 and 1..13.
      ifge A -13
        ifle A 13
          N A Z J fs_name_valid
        end
      end
      ifge A 0s_NN
        ifle A 0s_NW J fs_name_valid end
      end
      E A 0s_NA J fs_name_valid
      E A 0s_NY J fs_name_valid
      E A 0s_NG J fs_name_valid
      J fs_bad_path
fs_name_valid:
      I J 1
      I K -1
      I L 1
      ifg L 18 J fs_bad_path end
      J fs_name_loop
fs_name_ready:
      E L Z J fs_bad_path
      ; Dot and dot-dot components are rejected, not canonicalized.
      ifle L 2
        R A fs_name_ptr
        R E A
        ife E 0s_NA
          E L 1 J fs_bad_path
          I A 1
          R E A
          E E 0s_NA J fs_bad_path
        end
      end
      W fs_name_len L
      ifn K Z
        I K -1
        I J 1
        E K Z J fs_bad_path
      end
      W fs_path_ptr J
      W fs_path_left K
      R A fs_dir_first
      W fs_dir_block A
      R A fs_dir_count
      W fs_dir_left A
fs_dir_read:
      R C fs_dir_block
      M D fs_buffer
      C S fs_read_block
      N A Z O S P
      W fs_slot fs_buffer
      W fs_slots_left 9
fs_dir_slot:
      R J fs_slot
      R E J
      E E Z J fs_dir_skip
      ifl E 1 J fs_corrupt end
      ifg E 2 J fs_corrupt end
      I J 1
      R K J
      ifl K 1 J fs_corrupt end
      ifg K 18 J fs_corrupt end
      R L fs_name_len
      N K L J fs_dir_skip
      R L fs_name_ptr
fs_name_compare:
      I J 1
      R E J
      R F L
      N E F J fs_dir_skip
      I L 1
      I K -1
      N K Z J fs_name_compare
      J fs_dir_found
fs_dir_skip:
      R E fs_slots_left
      I E -1
      W fs_slots_left E
      R J fs_slot
      A J 27
      W fs_slot J
      N E Z J fs_dir_slot
      R E fs_dir_left
      I E -1
      W fs_dir_left E
      E E Z J fs_missing
      R A fs_dir_block
      R E fs_dir_root
      ifn E Z
        I A 1
      else
        C S fs_next
        ifn B Z
          M A B
          O S P
        end
        E A -1 J fs_corrupt
      end
      W fs_dir_block A
      J fs_dir_read
fs_dir_found:
      R J fs_slot
      R E J
      W fs_found_kind E
      A J 20
      R A J
      W fs_found_first A
      I J 1
      R B J
      W fs_found_count B
      I J 1
      R E J
      W fs_found_used E
      ; Entry padding, unused name cells and reserved fields must be zero.
      M K 4
fs_entry_reserved:
      I J 1
      R E J
      N E Z J fs_corrupt
      I K -1
      N K Z J fs_entry_reserved
      R K fs_name_len
      R J fs_slot
      I J 2
      A J K
      Z K 18
fs_entry_padding:
      E K Z J fs_entry_shape
      R E J
      N E Z J fs_corrupt
      I J 1
      I K -1
      J fs_entry_padding
fs_entry_shape:
      R E fs_found_kind
      ife E 2
        ifl B 1 J fs_corrupt end
        ifg B 9 J fs_corrupt end
        R E fs_found_used
        N E 243 J fs_corrupt
        C S fs_validate_chain
        N A Z O S P
      else
        ife B Z
          N A Z J fs_corrupt
          R E fs_found_used
          N E Z J fs_corrupt
        else
          R E fs_found_used
          ifl E 1 J fs_corrupt end
          ifg E 243 J fs_corrupt end
          C S fs_validate_chain
          N A Z O S P
        end
      end
      R E fs_path_left
      ife E Z
        R E fs_found_kind
        ife E 2
          R E fs_depth
          ifg E 8 J fs_bad_path end
        end
        M A Z
        O S P
      end
      R E fs_found_kind
      N E 2 J fs_not_directory
      R E fs_depth
      ifge E 9 J fs_bad_path end
      R A fs_found_first
      W fs_dir_first A
      R A fs_found_count
      W fs_dir_count A
      W fs_dir_root Z
      J fs_component

fs_open:
      R E fs_opened
      N E Z J fs_busy
      R E fs_found_kind
      N E 1 J fs_is_directory
      C S fs_check_media
      N A Z O S P
      R A fs_found_first
      W fs_file_block A
      R A fs_found_count
      W fs_file_left A
      R A fs_found_used
      W fs_file_used A
      W fs_opened 1
      M A Z
      O S P
fs_read_next:
      M B Z
      R E fs_opened
      E E Z J fs_bad_format
      C S fs_check_media
      N A Z O S P
      R E fs_file_left
      ife E Z
        M A Z
        O S P
      end
      R C fs_file_block
      M D fs_buffer
      C S fs_read_block
      N A Z O S P
      R A fs_file_block
      C S fs_next
      ifn B Z
        M A B
        O S P
      end
      W fs_file_block A
      R E fs_file_left
      I E -1
      W fs_file_left E
      M B 243
      ife E Z
        N A -1 J fs_corrupt
        R B fs_file_used
        ; Reject nonzero file tail padding before exposing the last block.
        M J fs_buffer
        A J B
        M K 243
        S K B
fs_file_padding:
        E K Z J fs_file_ready
        R E J
        N E Z J fs_corrupt
        I J 1
        I K -1
        J fs_file_padding
      else
        E A -1 J fs_corrupt
      end
fs_file_ready:
      M A Z
      O S P
fs_close:
      W fs_opened Z
      M A Z
      O S P
fs_busy: M A -1 O S P
fs_no_media: M A -2 O S P
fs_bad_unit: M A -6 O S P
fs_bad_format: M A -10 O S P
fs_corrupt: W fs_opened Z M A -11 O S P
fs_missing: M A -12 O S P
fs_not_directory: M A -13 O S P
fs_is_directory: M A -14 O S P
fs_bad_path: M A -15 O S P
fs_media_changed:
      W fs_mounted Z
      W fs_opened Z
      W fs_fat_tag -1
      M A -16
      O S P
