; Native disk-backed code replacement. Requires fat and fatWrite error labels.
; Build defines image_capacity and reserves image_slot//image_capacity inside
; ordinary resident RAM. Loader, callers, IRQs and disk-service callbacks must
; stay outside that slot. Header: 0sIMG, version 1, code count, wrapping sum.
; image_load(A=path,B=length) requires checked mount/no FS handle; returns A.
; image_call(A=entry offset) gates execution on a complete validated load.
; Native images are trusted application code, not sandboxed page Forth.
$im_valid: 2487
$im_busy: 2488
$im_length: 2489
$im_written: 2490
$im_sum: 2491
$im_expected: 2492
image_load:
      R E im_busy N E Z J im_busy_error
      R E block_servicing N E Z J im_busy_error
      R E fs_opened N E Z J im_busy_error
      R E fs_mounted N E 2 J fs_not_checked
      W im_busy 1 W im_valid Z W im_length Z W im_written Z W im_sum Z
      C S fs_lookup N A Z J im_error
      C S fs_open N A Z J im_error
      C S fs_read_next N A Z J im_error
      ifl B 4 J im_bad end
      M J fs_buffer R E J N E 0sIMG J im_bad
      M E J/1 N E 1 J im_bad
      M E J/2 ifl E 1 J im_bad end ifg E image_capacity J im_bad end
      W im_length E M E J/3 W im_expected E
      I J 4 I B -4
im_block:
      R H im_written A H B R E im_length ifg H E J im_bad end
      M G @image_slot R E im_written A G E W im_written H R L im_sum
im_copy:
      E B Z J im_next
      R E J W G E A L E I J 1 I G 1 I B -1 J im_copy
im_next:
      W im_sum L C S fs_read_next N A Z J im_error
      M J fs_buffer N B Z J im_block
      R E im_written R F im_length N E F J im_bad
      R E im_sum R F im_expected N E F J im_bad
      ; Clear stale instructions beyond a shorter replacement before exposing it.
      M G @image_slot R E im_length A G E M F image_capacity S F E
im_clear:
      E F Z J im_ready W G Z I G 1 I F -1 J im_clear
im_ready:
      C S fs_close W im_valid 1 W im_busy Z M A Z O S P
im_bad: M A -116
im_error:
      U S A C S fs_close O S A W im_busy Z O S P
im_busy_error: M A -117 O S P
image_call:
      R E im_busy N E Z J im_busy_error
      R E block_servicing N E Z J im_busy_error
      R E im_valid N E 1 J im_unloaded
      ifl A Z J im_unloaded end R E im_length ifge A E J im_unloaded end
      M E @image_slot A E A W im_busy 2 C S E W im_busy Z O S P
im_unloaded: M A -118 O S P
