; Main browser only: canonical native program routes are /p + four digits.
; Action6 is deferred until native browser owns a settled stream; F3 replaces it
; with ordinary Save Link. Generic pages and malformed paths retain navigation.
pu_program_link:
      R E url_path_len N E 6 J pp_ok R I url_path R E I N E 22 J pp_ok
      M E I/1 N E 3 J pp_ok I I 2 M K 4 J wp_program_digits
