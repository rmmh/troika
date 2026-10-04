; Native segmented program replacement. A/B=counted path on checked mounted disk.
; The caller quiesces its connections, IRQs and filesystem, then tail-jumps here.
; Kernel code occupies -3631..program_core_end-1; no segment may overwrite it.
; Success never returns: clear application data, reset S and enter the new image.
; Failure returns to the kernel program_recover hook, never partially loaded code.
; File: PRG,1,entry,segments,checksum; each segment: address,length,data.
; Checksum includes entry,segment count and all segment metadata/data.
$px_entry: 2450
$px_segments: 2451
$px_expected: 2452
$px_sum: 2453
$px_pointer: 2454
$px_left: 2455
$px_destination: 2456
$px_count: 2457
$px_end: 2458
$px_previous: 2459
$px_entry_valid: 2460
program_exec:
      W 0s_NM -9841 W block_service_vector Z W block_servicing Z M S 5710
      C S fs_lookup N A Z J program_error
      C S fs_open N A Z J program_error
      W px_left Z W px_previous -9113 W px_entry_valid Z
      C S program_cell N A Z J program_error N B 0sPRG J program_bad
      C S program_cell N A Z J program_error N B 1 J program_bad
      C S program_cell N A Z J program_error W px_entry B W px_sum B
      C S program_cell N A Z J program_error ifl B 1 J program_bad end ifg B 4 J program_bad end
      W px_segments B R E px_sum A E B W px_sum E
      C S program_cell N A Z J program_error W px_expected B
program_segment:
      C S program_checked_cell N A Z J program_error W px_destination B
      R E px_previous ifle B E J program_bad end
      C S program_checked_cell N A Z J program_error ifl B 1 J program_bad end W px_count B
      R E px_destination M F E A F B I F -1 ifl F E J program_bad end W px_end F W px_previous F
      ; Segments must stay wholly inside an available physical code extent.
      ifge E -9112 ifle F -3686 J program_range_ok end end
      ifge E program_core_end ifle F -365 J program_range_ok end end
      ifge E 365 ifle F 1336 J program_range_ok end end
      ifge E 7007 ifle F 9841 J program_range_ok end end
      J program_bad
program_range_ok:
      R G px_entry ifge G E ifle G F W px_entry_valid 1 end end
program_copy:
      C S program_checked_cell N A Z J program_error
      R I px_destination W I B I I 1 W px_destination I
      R E px_count I E -1 W px_count E N E Z J program_copy
      R E px_segments I E -1 W px_segments E N E Z J program_segment
      C S program_cell N A 1 J program_bad
      R E px_entry_valid E E Z J program_bad
      R E px_sum R F px_expected N E F J program_bad
      C S fs_close
      ; Keep filesystem and scratch/stack while clearing all former protocol,
      ; document and language state. Save entry in a register across the loop.
      R L px_entry M I 1337 M K 4131
program_clear: W I Z I I 1 I K -1 N K Z J program_clear
      M S 5710 M P L
program_bad: M A -119
program_error: ifge A Z M A -119 end U S A C S fs_close O S A J program_recover
program_checked_cell:
      C S program_cell N A Z O S P R E px_sum A E B W px_sum E O S P
; A=0 cell in B, 1 EOF, negative filesystem failure. No caller register guarantee.
program_cell:
      R E px_left
      ife E Z
        C S fs_read_next N A Z O S P E B Z M A 1 E B Z O S P
        W px_left B W px_pointer fs_buffer
      end
      R I px_pointer R B I I I 1 W px_pointer I R E px_left I E -1 W px_left E M A Z O S P
