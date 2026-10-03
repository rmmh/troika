; Optional httpFiles GET preparation hook. /catalog and /catalog1..5 enumerate
; 18 entries per page from /public/shared. Body stays in 2552..4009 until sent.
; A=0 ordinary file, 1 generated body (B pointer/C count/D MIME), HTTP error >1.
$ct_page: 2512
$ct_skip: 2513
$ct_count: 2514
$ct_cursor: 2515
$ct_entry: 2516
$ct_length: 2517
share_catalog:
      R E h_path_len ifl E 8 J ct_plain end ifg E 9 J ct_plain end
      M A h_path M B @ct_route M C 8 C S dns_equal N A Z J ct_plain
      M F 1 R E h_path_len
      ife E 9 R F 6204 ifl F 29 J ct_missing end ifg F 33 J ct_missing end S F 28 end
      W ct_page F I F -1 P F 18 W ct_skip F W ct_count Z
      M A @ct_directory M B 14 C S fs_lookup N A Z O S P C S fs_enum_open N A Z O S P
      M I 2552 M B @ct_header M C 43 C S ct_copy W ct_cursor I
ct_next:
      C S fs_enum_next N A Z J ct_fail E B Z J ct_finish
      N B 1 J ct_next
      W ct_entry C M I C M E I/1 ifg E 10 J ct_next end W ct_length E
      R E ct_skip ifn E Z I E -1 W ct_skip E J ct_next end
      R E ct_count ifge E 18 J ct_more end I E 1 W ct_count E
      R I ct_cursor W I -29 I I 1 W I -27 I I 1
      R A ct_length C S ct_number W I 16 I I 1
      R B ct_entry I B 2 R C ct_length C S ct_copy
      W I -27 I I 1 R A ct_length A A 8 C S ct_number W I 16 I I 1
      M B @ct_shared M C 8 C S ct_copy R B ct_entry I B 2 R C ct_length C S ct_copy
      W I 27 I I 1 W ct_cursor I J ct_next
ct_more:
      R I ct_cursor M B @ct_next_link M C 21 C S ct_copy
      R E ct_page A E 29 M I/-2 E W ct_cursor I
ct_finish:
      C S fs_close N A Z O S P
      M A 1 M B 2552 R C ct_cursor S C 2552 M D 2 O S P
ct_fail: U S A C S fs_close O S A O S P
ct_plain: M A Z O S P
ct_missing: M A 404 O S P
; Cursor I; positive decimal A <=18. Source B/C can be filesystem cells.
ct_number:
      ifge A 10 W I 29 I I 1 S A 10 end A A 28 W I A I I 1 O S P
ct_copy: M A I C S net_copy M I A O S P
ct_route: "/catalog"
ct_directory: "/public/shared"
ct_shared: "/shared/"
ct_header: "PAGE 1\nT 12:Shared files\nL 4:Home 6:/index\n"
ct_next_link: "L 4:Next 9:/catalog2\n"
