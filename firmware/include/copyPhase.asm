; Local file phase. B=8 delete, 9 mkdir, 10 rmdir with single path C/D.
; B=4 copy, B=5 rename. C/D=counted "source destination" arguments in page text.
; B=11 writes "path text"; no text creates an empty file. One separator is removed.
; The console and browser are inactive while this phase owns the filesystem.
phase_entry:
      E B 11 J cw_write
      ifge B 8
        ifg B 10 J cp_bad end
        R E fs_opened N E Z J fs_busy
        M E B M A C M B D
        ife E 8 C S fs_delete else ife E 9 C S fs_mkdir else C S fs_rmdir end end
        J cp_complete
      end
      ifl B 4 J cp_bad end ifg B 5 J cp_bad end W 5233 B
      M A C M I C M K D M B Z
cp_word:
      E K Z J cp_bad R E I E E -27 J cp_spaces I I 1 I K -1 I B 1 J cp_word
cp_spaces:
      E K Z J cp_bad R E I N E -27 J cp_args I I 1 I K -1 J cp_spaces
cp_args:
      E B Z J cp_bad M C I M D K R E 5233 E E 5 J fs_rename J fs_copy
cp_bad: M A -137 O S P

cp_complete:
      C S cp_fail
      ; Rejected read-only writes changed no blocks. Recheck before reloading.
      ife A -4
        U S A R B fs_unit C S fs_mount E A Z C S fs_check
        O S B E A Z M A B
      end
      O S P
cw_write:
      ifl D 1 J cp_bad end ifg D 415 J cp_bad end
      R E fs_opened N E Z J fs_busy
      M A C M I C M K D M B Z
cw_path:
      E K Z J cw_begin R E I E E -27 J cw_text
      I I 1 I K -1 I B 1 J cw_path
cw_text: I I 1 I K -1
cw_begin:
      E B Z J cp_bad ifg K 243 J cp_bad end
      W 5233 I W 5234 K M D K M C Z ifn K Z M C 1 end
      C S fs_replace_begin N A Z J cp_complete
      R E 5234
      ifn E Z
        M A fs_buffer M C 243 C S fm_zero
        M A fs_buffer R B 5233 R C 5234 C S fm_copy
        C S fs_replace_append N A Z J cp_complete
      end
      C S fs_replace_finish J cp_complete
