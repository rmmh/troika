; Native same-size block overwrite. General replacement/mkdir are separate.
; fs_overwrite: A=logical block index of the opened file, buffer=fs_buffer.
; The entire volume must have passed fs_check since mount (mounted state 2).
; Entry size/FAT stay unchanged. File tail padding is forced to zero.
fs_overwrite:
      R E block_servicing N E Z J fs_busy
      R E fs_mounted
      N E 2 J fs_not_checked
      R E fs_opened
      N E 1 J fs_bad_format
      ifl A Z J fs_bad_block end
      R E fs_found_count
      ifge A E J fs_bad_block end
      W fs_chain_left A
      M F E
      I F -1
      ife A F
        R J fs_found_used
        M K 243
        S K J
        A J fs_buffer
fs_overwrite_padding:
        E K Z J fs_overwrite_start
        W J Z
        I J 1
        I K -1
        J fs_overwrite_padding
      end
fs_overwrite_start:
      R A fs_found_first
fs_overwrite_chain:
      R E fs_chain_left
      E E Z J fs_overwrite_commit
      C S fs_next
      ifn B Z
        M A B
        O S P
      end
      E A -1 J fs_corrupt
      R E fs_chain_left
      I E -1
      W fs_chain_left E
      J fs_overwrite_chain
fs_overwrite_commit:
      M C A
      M D fs_buffer
      C S fs_write_block
      O S P
fs_bad_block: M A -3 O S P
fs_not_checked: M A -17 O S P
