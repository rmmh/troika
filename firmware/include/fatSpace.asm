; Read-only FAT space accounting. Requires checked mount and no open handle.
; A=status, B=free blocks, C=physical blocks. One block is 243 signed cells.
; The console owns 5235..5237; FAT pages use fs_buffer, leaving the cache intact.
$sp_block: 5235
$sp_left: 5236
$sp_free: 5237
fs_space:
      R E block_servicing N E Z J fs_busy R E fs_opened N E Z J fs_busy
      R E fs_mounted N E 2 J fs_not_checked
      W sp_block 1 R E fs_capacity W sp_left E W sp_free Z
sp_page:
      R C sp_block M D fs_buffer C S fs_read_block N A Z O S P
      M I fs_buffer R K sp_left ifg K 243 M K 243 end
      R E sp_left S E K W sp_left E
sp_cell:
      R E I ife E Z R F sp_free I F 1 W sp_free F end
      I I 1 I K -1 N K Z J sp_cell
      R E sp_left ifn E Z R E sp_block I E 1 W sp_block E J sp_page end
      R B sp_free R C fs_capacity M A Z O S P
