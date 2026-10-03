; Local copy phase. C/D=counted "source destination" arguments in page text.
; The console and browser are inactive while this phase owns the filesystem.
phase_entry:
      M A C M I C M K D M B Z
cp_word:
      E K Z J cp_bad R E I E E -27 J cp_spaces I I 1 I K -1 I B 1 J cp_word
cp_spaces:
      E K Z J cp_bad R E I N E -27 J cp_args I I 1 I K -1 J cp_spaces
cp_args:
      E B Z J cp_bad M C I M D K J fs_copy
cp_bad: M A -137 O S P
