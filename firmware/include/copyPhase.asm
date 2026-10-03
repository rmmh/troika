; Local file phase. B=4 copy, B=5 rename. C/D=counted "source destination" arguments in page text.
; The console and browser are inactive while this phase owns the filesystem.
phase_entry:
      ifl B 4 J cp_bad end ifg B 5 J cp_bad end W 5233 B
      M A C M I C M K D M B Z
cp_word:
      E K Z J cp_bad R E I E E -27 J cp_spaces I I 1 I K -1 I B 1 J cp_word
cp_spaces:
      E K Z J cp_bad R E I N E -27 J cp_args I I 1 I K -1 J cp_spaces
cp_args:
      E B Z J cp_bad M C I M D K R E 5233 E E 5 J fs_rename J fs_copy
cp_bad: M A -137 O S P
