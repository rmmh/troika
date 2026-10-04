; Fixed, versioned 12x55 document containers. Live records 3000..3659;
; staging 4010..4675 contains six header cells and 660 payload cells.
; Public load/save return A=0 success, negative error; save A=1 means the
; directory commit succeeded but cleanup failed. No host filesystem helpers.
$ds_error: 2617
$ds_total: 2618
$ds_count: 2619
$ds_pointer: 2620
$ds_record: 2621
$ds_index: 2622
$ds_committed: 2623

doc_store_mount:
 R E fs_mounted ife E 2 M A Z O S P end
 M B Z C S fs_mount N A Z O S P J fs_check

doc_store_load:
 C S doc_store_mount N A Z O S P
 M A @doc_file_path M B doc_file_path_len C S fs_lookup N A Z O S P
 R E fs_found_kind ifn E 1 J ds_bad end
 R E fs_found_count N E 3 J ds_bad R E fs_found_used N E 180 J ds_bad
 C S fs_open N A Z O S P W ds_total Z
 ds_read:
 C S fs_read_next N A Z J ds_read_error E B Z J ds_read_done
 W ds_count B R E ds_total A E B ifg E 666 J ds_read_bad end
 M A 4010 R E ds_total A A E M B fs_buffer R C ds_count C S doc_copy
 R E ds_total R F ds_count A E F W ds_total E J ds_read
 ds_read_bad: M A -130
 ds_read_error: W ds_error A C S fs_close R A ds_error O S P
 ds_read_done: C S fs_close R E ds_total N E 666 J ds_bad
 C S ds_validate N A Z O S P
 M A doc_data M B 4016 M C 660 C S doc_copy M A Z O S P

doc_store_save:
 W ds_committed Z C S doc_store_mount N A Z O S P
 W 4010 0sDOC W 4011 1 W 4012 software_id W 4013 12 W 4014 660
 M A 4016 M B doc_data M C 660 C S doc_copy C S ds_sum W 4015 G
 C S ds_validate N A Z O S P
 M A @doc_file_path M B doc_file_path_len M C 3 M D 180 C S fs_replace_begin N A Z O S P
 W ds_pointer 4010 W ds_total 666
 ds_write:
 R E ds_total M C 243 ifl E C M C E end W ds_count C
 M A fs_buffer R B ds_pointer C S doc_copy C S fs_replace_append N A Z J ds_write_error
 R E ds_pointer R F ds_count A E F W ds_pointer E R E ds_total S E F W ds_total E N E Z J ds_write
 C S fs_replace_finish ife A Z W ds_committed 1 O S P end
 R E fm_committed ifn E Z W ds_committed 1 C S fs_close M A 1 O S P end
 ds_write_error:
 W ds_error A R E fs_opened ife E 3 R E fm_committed ife E Z C S fs_replace_abort end end R A ds_error O S P

 ds_sum: M I 4016 M K 660 M G Z
 ds_sum_loop: R E I A G E I I 1 I K -1 N K Z J ds_sum_loop O S P
 ds_validate:
 R E 4010 N E 0sDOC J ds_bad R E 4011 N E 1 J ds_bad
 R E 4012 N E software_id J ds_bad R E 4013 N E 12 J ds_bad R E 4014 N E 660 J ds_bad
 C S ds_sum R E 4015 N E G J ds_bad W ds_record 4016 W ds_index Z
 ds_validate_record:
 R I ds_record R H I ifl H Z J ds_bad end ifg H 54 J ds_bad end I I 1 M K Z
 ds_validate_char:
 R E I ifl K H ifl E 32 J ds_bad end ifg E 126 J ds_bad end else N E Z J ds_bad end
 I I 1 I K 1 ifl K 54 J ds_validate_char end
 ifn H Z R A ds_record I A 1 M B H R C ds_index C S doc_app_validate N A Z J ds_bad end
 R E ds_record A E 55 W ds_record E R E ds_index I E 1 W ds_index E ifl E 12 J ds_validate_record end M A Z O S P
 ds_bad: M A -130 O S P
