; Local file phase. B=8 delete, 9 mkdir, 10 rmdir with single path C/D.
; B=4 copy, B=5 rename. C/D=counted "source destination" arguments in page text.
; The console and browser are inactive while this phase owns the filesystem.
phase_entry:
      ifge B 8
        ifg B 10 J cp_bad end
        R E fs_opened N E Z J fs_busy
        M E B M A C M B D
        ife E 8 C S fs_delete else ife E 9 C S fs_mkdir else C S fs_rmdir end end
        C S cp_fail
        ; A rejected read-only write invalidates the mount but changes no
        ; blocks. Recheck it so the caller can reload the console and show -4.
        ife A -4
          U S A R B fs_unit C S fs_mount E A Z C S fs_check
          O S B E A Z M A B
        end
        O S P
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
