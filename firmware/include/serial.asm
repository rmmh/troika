; Native durable serial ranges. Protocol state 2534..2550 (inside 2066..2551).
; Configure system unit and expected volume identity before first allocation.
; serial_alloc returns A/B/C=high/middle/low, D=status (0 success).
; Errors include -30 wrong volume, -31 invalid/rolled-back counter, -32 exhausted.
; A range is reserved on disk before any serial from that range is exposed.
$serial_next: 2534
$serial_end: 2537
$serial_floor: 2540
$serial_volume: 2543
$serial_unit: 2546
$serial_valid: 2547
$serial_staging: 2548

; Lexicographic comparison of balanced three-tryte tuples: A/B=input pointers,
; A=-1/0/1 result, other registers caller-saved. No flattening or truncation.
wide_compare:
      M F A
      M G B
      M E 3
wide_compare_loop:
      R H F
      R J G
      ifl H J
        M A -1
        O S P
      end
      ifg H J
        M A 1
        O S P
      end
      I F 1
      I G 1
      I E -1
      N E Z J wide_compare_loop
      M A Z
      O S P

serial_alloc:
      R E serial_valid
      E E Z J serial_alloc_refill
      M A serial_next
      M B serial_end
      C S wide_compare
      E A -1 J serial_issue
serial_alloc_refill:
      C S serial_refill
      ifn A Z
        M D A
        M A Z
        M B Z
        M C Z
        O S P
      end
serial_issue:
      R A serial_next
      R B 2535
      R C 2536
      M E C
      I E 1
      W 2536 E
      ife E -9841
        M E B
        I E 1
        W 2535 E
        ife E -9841
          M E A
          I E 1
          W serial_next E
        end
      end
      M D Z
      O S P

serial_refill:
      R E fs_opened
      N E Z J fs_busy
      W serial_valid Z
      ; Reuse a checked mount only if it is still the configured system unit.
      R E fs_mounted
      ife E 2
        R E fs_unit
        R F serial_unit
        ife E F
          C S fs_check_media
          N A Z O S P
          J serial_check_volume
        end
      end
      R B serial_unit
      C S fs_mount
      N A Z O S P
serial_check_volume:
      M A fs_vol_hi
      M B serial_volume
      C S wide_compare
      ifn A Z
        M A -30
        O S P
      end
      R E fs_mounted
      ifn E 2
        C S fs_check
        N A Z O S P
      end
      M A @serial_path
      M B 8
      C S fs_lookup
      N A Z O S P
      R E fs_found_kind
      N E 1 J serial_bad_counter
      R E fs_found_count
      N E 1 J serial_bad_counter
      R E fs_found_used
      N E 3 J serial_bad_counter
      C S fs_open
      N A Z O S P
      C S fs_read_next
      N A Z J serial_refill_close
      ; The stored bound must be strictly positive as a full balanced tuple.
      R E fs_buffer
      ifg E Z J serial_counter_positive end
      L E Z J serial_bad_counter_close
      R E 6441
      ifg E Z J serial_counter_positive end
      L E Z J serial_bad_counter_close
      R E 6442
      ifle E Z J serial_bad_counter_close end
serial_counter_positive:
      M A fs_buffer
      M B serial_floor
      C S wide_compare
      E A -1 J serial_bad_counter_close
      R E fs_buffer
      ife E 9841
        R E 6441
        ife E 9841
          R E 6442
          ife E 9841
            M A -32
            J serial_refill_close
          end
        end
      end
      R E fs_buffer
      W serial_staging E
      R E 6441
      W 2549 E
      R E 6442
      W 2550 E
      M F E
      A E 27
      W 6442 E
      ifl E F
        R E 6441
        I E 1
        W 6441 E
        ife E -9841
          R E fs_buffer
          I E 1
          W fs_buffer E
          ife E -9841
            ; Saturate the exclusive bound at the exhausted sentinel.
            W fs_buffer 9841
            W 6441 9841
            W 6442 9841
          end
        end
      end
      M A Z
      C S fs_overwrite
      N A Z J serial_refill_close
      ; Publish RAM state only after the atomic durable write completes.
      R E serial_staging
      W serial_next E
      R E 2549
      W 2535 E
      R E 2550
      W 2536 E
      R E fs_buffer
      W serial_end E
      W serial_floor E
      R E 6441
      W 2538 E
      W 2541 E
      R E 6442
      W 2539 E
      W 2542 E
      W serial_valid 1
      M A Z
serial_refill_close:
      U S A
      C S fs_close
      O S A
      O S P
serial_bad_counter_close:
      M A -31
      J serial_refill_close
serial_bad_counter:
      M A -31
      O S P
serial_path: "/net.seq"
