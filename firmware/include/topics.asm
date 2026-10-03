; Optional noticeboard dispatcher: /app/newtopic and /app/replytopic.
; Public topic names are 1..10 lower-case letters, digits or underscore.
; Reuse noticeboard's bounded literal append and atomic publication engine.
$tp_name_ptr: 2523
$tp_name_len: 2524
$tp_create: 2525
topic_post:
      W tp_create Z R E h_path_len
      ife E 13 M A h_path M B @tp_new M C 13 C S dns_equal ife A Z W tp_create 1 J tp_input end end
      ife E 15 M A h_path M B @tp_reply M C 15 C S dns_equal E A Z J tp_input end
      M A -138 O S P
tp_input:
      R E hf_count N E 2 J nb_bad
      M A @tp_field M B 5 C S http_form_find N A Z J nb_bad
      ifl C 1 J nb_bad end ifg C 10 J nb_bad end W tp_name_ptr B W tp_name_len C
      M I B M K C C S tp_name N A Z O S P
      M A @nb_field M B 3 C S http_form_find N A Z J nb_bad
      ifl C 1 J nb_bad end W nb_source B W nb_length C
      M A 5711 M B @tp_prefix M C 10 C S net_copy R B tp_name_ptr R C tp_name_len C S net_copy
      W nb_target 5711 R E tp_name_len A E 10 W nb_target_len E W nb_page 5
      M A 5711 R B nb_target_len C S fs_lookup
      R E tp_create ife E Z E A -12 J nb_missing N A Z O S P J nb_lookup end
      E A Z J nb_full N A -12 O S P
      M I 2552 M B @tp_head M C 9 C S tp_copy
      R A tp_name_len C S tp_number W I 16 I I 1
      R B tp_name_ptr R C tp_name_len C S tp_copy
      M B @tp_form M C 32 C S tp_copy
      R A tp_name_len C S tp_number W I 16 I I 1
      R B tp_name_ptr R C tp_name_len C S tp_copy
      M B @tp_tail M C 43 C S tp_copy M E I S E 2552 W nb_total E J nb_loaded
; Validate I/K counted name; caller has bounded K to 1..10.
tp_name:
      R E I E E 0s_NY J tp_name_next
      ifge E -13 ifle E 13 E E Z J nb_bad J tp_name_next end end
      ifl E 28 J nb_bad end ifg E 37 J nb_bad end
tp_name_next: I I 1 I K -1 N K Z J tp_name M A Z O S P
; A/B counted request path -> A=1 for the reserved valid topic namespace, 0 else.
topic_is_path:
      ifl B 4 J tp_no end ifg B 13 J tp_no end
      M I A R E I N E 22 J tp_no M E I/1 N E 7 J tp_no M E I/2 N E 0s_NY J tp_no
      I I 3 M K B I K -3 C S tp_name N A Z J tp_no M A 1 O S P
tp_no: M A Z O S P
tp_number:
      ifge A 10 W I 29 I I 1 I A -10 end A A 28 W I A I I 1 O S P
tp_copy: M A I C S net_copy M I A O S P
tp_field: "topic"
tp_new: "/app/newtopic"
tp_reply: "/app/replytopic"
tp_prefix: "/public/t_"
tp_head: "PAGE 1\nH "
tp_form: "\nF 15:/app/replytopic\nI 5:topic "
tp_tail: "\nI 3:msg 0:\nS 5:Reply\nL 6:Topics 7:/topics\n"
