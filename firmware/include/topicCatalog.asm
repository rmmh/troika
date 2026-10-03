; Optional httpFiles GET preparation hook. /topics and /topics1..5 enumerate
; 18 named topic entries per page from /public. Body stays in 2552..4009 until sent.
; A=0 ordinary file, 1 generated body (B pointer/C count/D MIME), HTTP error >1.
$tc_page: 2512
$tc_skip: 2513
$tc_count: 2514
$tc_cursor: 2515
$tc_entry: 2516
$tc_length: 2517
topic_catalog:
      R E h_path_len ifl E 7 J tc_plain end ifg E 8 J tc_plain end
      M A h_path M B @tc_route M C 7 C S dns_equal N A Z J tc_plain
      M F 1 R E h_path_len
      ife E 8 R F 6203 ifl F 29 J tc_missing end ifg F 33 J tc_missing end S F 28 end
      W tc_page F I F -1 P F 18 W tc_skip F W tc_count Z
      M A @tc_directory M B 7 C S fs_lookup N A Z O S P C S fs_enum_open N A Z O S P
      M I 2552 M B @tc_header M C 74 C S tc_copy W tc_cursor I
tc_next:
      C S fs_enum_next N A Z J tc_fail E B Z J tc_finish
      N B 1 J tc_next
      W tc_entry C M I C M E I/1 ifl E 3 J tc_next end ifg E 12 J tc_next end
      I E -2 W tc_length E M E I/2 N E 7 J tc_next M E I/3 N E 0s_NY J tc_next
      I I 4 R K tc_length C S tp_name N A Z J tc_next
      R E tc_skip ifn E Z I E -1 W tc_skip E J tc_next end
      R E tc_count ifge E 18 J tc_more end I E 1 W tc_count E
      R I tc_cursor W I -29 I I 1 W I -27 I I 1
      R A tc_length C S tc_number W I 16 I I 1
      R B tc_entry I B 4 R C tc_length C S tc_copy
      W I -27 I I 1 R A tc_length A A 3 C S tc_number W I 16 I I 1
      M B @tc_shared M C 3 C S tc_copy R B tc_entry I B 4 R C tc_length C S tc_copy
      W I 27 I I 1 W tc_cursor I J tc_next
tc_more:
      R I tc_cursor M B @tc_next_link M C 20 C S tc_copy
      R E tc_page A E 29 M I/-2 E W tc_cursor I
tc_finish:
      C S fs_close N A Z O S P
      M A 1 M B 2552 R C tc_cursor S C 2552 M D 2 O S P
tc_fail: U S A C S fs_close O S A O S P
tc_plain: M A Z O S P
tc_missing: M A 404 O S P
; Cursor I; positive decimal A <=18. Source B/C can be filesystem cells.
tc_number:
      ifge A 10 W I 29 I I 1 S A 10 end A A 28 W I A I I 1 O S P
tc_copy: M A I C S net_copy M I A O S P
tc_route: "/topics"
tc_directory: "/public"
tc_shared: "/t_"
tc_header: "PAGE 1\nT 16:Community topics\nL 5:Forum 6:/forum\nL 9:New topic 9:/newtopic\n"
tc_next_link: "L 4:Next 8:/topics2\n"
