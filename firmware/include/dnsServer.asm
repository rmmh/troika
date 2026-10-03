; Native DNS server. Requires dns + common network modules.
; Server-only records occupy 2552..4252 (27 * 63), replacing browser arenas.
; Each record: length, name[54], address[3], TTL, reserved[4].
$dns_records: 2552
$dns_record_count: 2280
$dns_ready: 2281
$dns_record: 2282
$dns_index: 2283
$dns_query_len: 2284
$dns_query_ptr: 2285
; Validate the complete table once before listening. A=0/-50; no partial enable.
dns_server_init:
      W dns_ready Z
      R E dns_record_count
      ifl E Z J dns_bad_name end
      ifg E 27 J dns_bad_name end
      W dns_record dns_records
      W dns_index Z
dns_init_record:
      R E dns_index
      R F dns_record_count
      E E F J dns_init_done
      R I dns_record
      R B I
      M A I
      I A 1
      M C A
      C S dns_name
      N A Z O S P
      R I dns_record
      R E I
      M F I
      I F 1
      A F E
      M G 54
      S G E
      A G 1
; Check unused name cells then skip the three address cells and TTL.
dns_init_padding:
      I G -1
      E G Z J dns_init_address
      R E F
      N E Z J dns_bad_name
      I F 1
      J dns_init_padding
dns_init_address:
      M F I
      A F 55
      C S frame_tuple_zero
      E A 1 J dns_bad_name
      M E I/58
      ifl E 1 J dns_bad_name end
      N I/59 Z J dns_bad_name
      N I/60 Z J dns_bad_name
      N I/61 Z J dns_bad_name
      N I/62 Z J dns_bad_name
      ; Compare against every earlier record; at most 351 name comparisons.
      M K dns_records
      R L dns_index
dns_init_duplicate:
      E L Z J dns_init_next
      R E I
      R F K
      ife E F
        M C E
        M A I
        I A 1
        M B K
        I B 1
        C S dns_equal
        E A Z J dns_bad_name
      end
      A K 63
      I L -1
      J dns_init_duplicate
dns_init_next:
      R E dns_record
      A E 63
      W dns_record E
      R E dns_index
      I E 1
      W dns_index E
      J dns_init_record
dns_init_done:
      W dns_ready 1
      M A Z
      O S P
; Caller passes a structurally validated frame via net_input/net_input_iface.
; A=1 reply queued, 0 ignored/dropped, negative queue error. Caller consumes RX.
dns_server_input:
      R E dns_ready
      E E Z J net_no_input
      R E net_pending
      N E Z J net_no_input
      R I net_input
      N I/1 2 J net_no_input
      N I/15 243 J net_no_input
      N I/16 53 J net_no_input
      M A I
      I A 11
      R B net_input_iface
      I B 1
      C S wide_compare
      N A Z J net_no_input
      R I net_input
      N I/27 1 J net_no_input
      N I/28 1 J net_no_input
      M E I/29
      ifl E 1 J net_no_input end
      ifg E 54 J net_no_input end
      W dns_query_len E
      I E 3
      N E I/26 J net_no_input
      M A I
      A A 30
      W dns_query_ptr A
      M B I/29
      ; Canonical validation into bounded scratch leaves ingress immutable.
      M C 5711
      C S dns_name
      N A Z J net_no_input
      W dns_query_ptr 5711
      M I dns_records
      R L dns_record_count
dns_server_lookup:
      E L Z J dns_server_missing
      R E I
      R F dns_query_len
      ife E F
        M C E
        M A I
        I A 1
        R B dns_query_ptr
        C S dns_equal
        E A Z J dns_server_found
      end
      A I 63
      I L -1
      J dns_server_lookup
dns_server_missing:
      M I Z
dns_server_found:
      W dns_record I
      C S net_reverse
      ; Erase the old query payload and padding, keeping reply header/serial.
      M A 1850
      M C 216
      C S net_zero
      W 1850 1
      W 1851 2
      R E dns_query_len
      W 1857 E
      I E 8
      W 1849 E
      M A 1858
      R B dns_query_ptr
      R C dns_query_len
      C S net_copy
      R I dns_record
      ife I Z
        W 1852 1
      else
        M A 1853
        M B I
        A B 55
        M C 4
        C S net_copy
      end
      M A 1823
      R B net_input_iface
      C S net_begin_send
      N A Z O S P
      M A 1
      O S P
