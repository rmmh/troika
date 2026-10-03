; Bounded disk-backed noticeboard application for httpFiles/httpForm.
; One named msg field, 1..54 text cells. Append a fixed-width counted T record
; to the selected trusted topic file; arbitrary message punctuation/newlines stay literal text.
; The initial board is a trusted PAGE 1 file. It is never reconstructed by host
; code. At most 1200 old wire cells are retained in the server page arena.
$nb_source: 2508
$nb_length: 2509
$nb_total: 2510
$nb_offset: 2511
$nb_chunk: 2512
$nb_target: 2513
$nb_page: 2514
$nb_target_len: 2515
http_file_post:
      W nb_page 1 R E h_path_len
      ifn E 9
        N E 10 J nb_missing R E 6205 ifl E 30 J nb_missing end ifg E 33 J nb_missing end
        S E 28 W nb_page E
      end
      M I @nb_routes M K 3
nb_route_next:
      M A h_path M B I M C 9 C S dns_equal
      ife A Z
        M A 5711 M B I I B 9 M C 13 C S net_copy W nb_target 5711
        C S nb_path J nb_input
      end
      A I 22 I K -1 N K Z J nb_route_next J nb_missing
nb_input:
      R E hf_count N E 1 J nb_bad
      M A @nb_field M B 3 C S http_form_find N A Z J nb_bad
      ifl C 1 J nb_bad end W nb_source B W nb_length C
nb_lookup:
      R A nb_target R B nb_target_len C S fs_lookup E A -12 J nb_full N A Z O S P
      C S fs_open N A Z O S P W nb_total Z
nb_read:
      C S fs_read_next N A Z J nb_fail
      E B Z J nb_loaded
      R E nb_total A E B ifg E 1200 J nb_next_page end
      R A nb_total A A 2552 M C B M B fs_buffer C S net_copy
      ; net_copy consumes C. Count the block using the advanced destination.
      S A 2552 W nb_total A J nb_read
nb_loaded:
      C S fs_close N A Z O S P
      R A nb_total A A 2552 M B @nb_text M C 5 C S net_copy
      M I A M K 54
nb_pad: W I -27 I I 1 I K -1 N K Z J nb_pad W I 27
      R B nb_source R C nb_length C S net_copy
      R E nb_total A E 60 W nb_total E
      ; Derive block geometry without relying on rounded Q as floor division.
      M D E M C D Q C 243 M E C P E 243
      ifg E D I C -1 S E 243 end S D E
      ifn D Z I C 1 else M D 243 end
      R A nb_target R B nb_target_len C S fs_replace_begin N A Z J nb_fail
      W nb_offset Z
nb_write:
      R E nb_offset R F nb_total E E F J nb_publish
      M C F S C E ifg C 243 M C 243 end W nb_chunk C
      M B 2552 A B E M A fs_buffer C S net_copy
      C S fs_replace_append N A Z J nb_fail
      R E nb_offset R F nb_chunk A E F W nb_offset E J nb_write
nb_publish:
      C S fs_replace_finish N A Z J nb_fail
      R C nb_target_len I C -7 W h_path_len C M A h_path R B nb_target I B 7 C S net_copy M A Z O S P
nb_next_page:
      C S fs_close N A Z O S P R E nb_page E E 5 J nb_full I E 1 W nb_page E
      C S nb_path J nb_lookup
nb_path:
      W nb_target_len 13 R E nb_page E E 1 O S P
      A E 28 W 5724 E W nb_target_len 14 O S P
nb_full: M A 409 O S P
nb_fail:
      U S A R E fs_opened
      ife E 3 R E fm_committed ife E Z C S fs_replace_abort end end
      O S A
nb_close: U S A C S fs_close O S A O S P
nb_bad: M A 400 O S P
nb_missing: M A 404 O S P
nb_field: "msg"
nb_routes: "/app/post/public/board/app/game/public/games/app/code/public/build"
nb_text: "T 54:"
