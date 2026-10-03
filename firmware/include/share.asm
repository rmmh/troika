; Public text-file sharing for the archive HTTP service. Trusted native handler.
; name: 1..10 lowercase letters/digits/underscore; text: 0..54 literal cells.
; Files are confined to /public/shared; replacement publishes only after writing.
$sh_name: 2508
$sh_name_len: 2509
$sh_text: 2510
$sh_text_len: 2511
http_file_post:
      R E h_path_len N E 10 J sh_missing
      M A h_path M B @sh_route M C 10 C S dns_equal N A Z J sh_missing
      R E hf_count N E 2 J sh_bad
      M A @sh_name_field M B 4 C S http_form_find N A Z J sh_bad
      ifl C 1 J sh_bad end ifg C 10 J sh_bad end W sh_name B W sh_name_len C
      M I B M K C
sh_name_loop:
      R E I E E 0s_NY J sh_name_next
      ifge E -13 ifle E 13 E E Z J sh_bad J sh_name_next end end
      ifl E 28 J sh_bad end ifg E 37 J sh_bad end
sh_name_next: I I 1 I K -1 N K Z J sh_name_loop
      M A @sh_text_field M B 4 C S http_form_find N A Z J sh_bad W sh_text B W sh_text_len C
      M A 2552 M B @sh_prefix M C 15 C S net_copy
      R B sh_name R C sh_name_len C S net_copy
      M A 2552 R B sh_name_len A B 15 M C Z R D sh_text_len ifn D Z M C 1 end
      C S fs_replace_begin N A Z J sh_fail
      R C sh_text_len
      ifn C Z
        M A fs_buffer R B sh_text C S net_copy C S fs_replace_append N A Z J sh_fail
      end
      C S fs_replace_finish N A Z J sh_fail
      M A h_path M B 2559 R C sh_name_len A C 8 W h_path_len C C S net_copy
      M A Z O S P
sh_fail:
      U S A R E fs_opened
      ife E 3 R E fm_committed ife E Z C S fs_replace_abort end end
      C S fs_close O S A ife A -18 M A 507 else M A 500 end O S P
sh_bad: M A 400 O S P
sh_missing: M A 404 O S P
sh_route: "/app/share"
sh_name_field: "name"
sh_text_field: "text"
sh_prefix: "/public/shared/"
