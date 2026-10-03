; Native LAN-only DHCP server. Requires common network modules.
; Configure pool host values, count, duration and interface address/gateway/DNS,
; then init. Leases are server-local RAM, never a hidden host map.
$dhcps_duration: 2321
$dhcps_count: 2322
$dhcps_ready: 2323
$dhcps_kind: 2324
$dhcps_identity: 2325
$dhcps_requested: 2328
$dhcps_match: 2331
$dhcps_free: 2332
$dhcps_slot: 2333
$dhcps_reply_kind: 2334
$dhcps_leases: 4739
$dhcps_pool: 4847
; Slots: identity[3], address[3], expiry[3], state, reserved[2].
; Pool order determines assignment. Reinitialization explicitly drops leases.
dhcp_server_init:
      W dhcps_ready Z
      R E net_iface_count
      N E 1 J dhcps_bad
      R E net_ifaces
      E E 95 J dhcps_init_base
      N E 122 J dhcps_bad
dhcps_init_base:
      R E dhcps_count
      ifl E 1 J dhcps_bad end
      ifg E 9 J dhcps_bad end
      R E dhcps_duration
      ifl E 81 J dhcps_bad end
      M F 2067
      C S frame_tuple_zero
      E A 1 J dhcps_bad
      M F 2073
      C S frame_tuple_zero
      E A 1 J dhcps_bad
      M F 2070
      C S frame_tuple_zero
      ifn A 1
        R E 2070 R F 2067 N E F J dhcps_bad
        R E 2071 R F 2068 N E F J dhcps_bad
      end
      M A dhcps_leases
      M C 108
      C S net_zero
      M I dhcps_pool
      M K dhcps_leases
      R L dhcps_count
dhcps_init_loop:
      R E 2067 M K/3 E
      R E 2068 M K/4 E
      R E I M K/5 E
      M F K I F 3
      C S frame_tuple_zero
      E A 1 J dhcps_bad
      M A K I A 3 M B 2067
      C S wide_compare
      E A Z J dhcps_bad
      M A K I A 3 M B 2070
      C S wide_compare
      E A Z J dhcps_bad
      M F dhcps_pool
dhcps_init_duplicates:
      E F I J dhcps_init_next
      R E F R G I
      E E G J dhcps_bad
      I F 1
      J dhcps_init_duplicates
dhcps_init_next:
      I I 1
      A K 12
      I L -1
      N L Z J dhcps_init_loop
      W dhcps_ready 1
      M A Z
      O S P
dhcps_bad: M A -55 O S P

; Caller passes validated ingress in net_input. A=1 reply submitted/release,
; A=0 ignored, negative NIC error. No retained application frame is changed.
dhcp_server_input:
      R E dhcps_ready
      E E Z J net_no_input
      R E net_input_iface
      N E net_ifaces J net_no_input
      R I net_input
      N I/1 2 J net_no_input
      N I/15 68 J net_no_input
      N I/16 67 J net_no_input
      N I/26 27 J net_no_input
      N I/27 1 J net_no_input
      M E I/28
      E E 1 J dhcps_kind_ok
      E E 3 J dhcps_kind_ok
      N E 6 J net_no_input
dhcps_kind_ok:
      W dhcps_kind E
      ; Payload identity must name the directly attached sender.
      M A I I A 2
      M B I A B 29
      C S wide_compare
      N A Z J net_no_input
      M A I A A 45
      M C 9
dhcps_reserved_loop:
      R E A N E Z J net_no_input
      I A 1 I C -1
      N C Z J dhcps_reserved_loop
      R E dhcps_kind
      E E 1 J dhcps_discover_shape
      ; REQUEST/RELEASE select this server and carry no configuration.
      M A I A A 32 M B 2067
      C S wide_compare
      N A Z J net_no_input
      M A I A A 38 M C 7
      C S dhcps_zero_range
      N A Z J net_no_input
      ; Network destination is local or unspecified for bootstrap REQUEST.
      M A I I A 11 M B 2067
      C S wide_compare
      ifn A Z
        M F I I F 11
        C S frame_tuple_zero
        N A 1 J net_no_input
        R E dhcps_kind E E 6 J net_no_input
      end
      ; A configured sender uses the requested address as its source.
      M A I I A 8 M B I A B 35
      C S wide_compare
      ifn A Z
        M F I I F 8
        C S frame_tuple_zero
        N A 1 J net_no_input
        R E dhcps_kind E E 6 J net_no_input
      end
      J dhcps_valid
dhcps_discover_shape:
      ; DISCOVER must be a source-unspecified LAN broadcast.
      M A I I A 5 M C 9
      C S dhcps_zero_range
      N A Z J net_no_input
      M A I A A 32 M C 13
      C S dhcps_zero_range
      N A Z J net_no_input
dhcps_valid:
      M A dhcps_identity
      M B I A B 29
      ; Copy identity, then requested address (skip payload's selected server).
      M C 3 C S net_copy
      M A dhcps_requested
      R B net_input A B 35
      M C 3 C S net_copy
      W dhcps_match Z
      W dhcps_free Z
      C S net_now
      N A Z O S P
      M I dhcps_leases
      R L dhcps_count
dhcps_scan:
      M E I/9
      E E Z J dhcps_free_slot
      M A net_tick
      M B I I B 6
      C S wide_compare
      ifge A Z
        M I/9 Z
        J dhcps_free_slot
      end
      M A I M B dhcps_identity
      C S wide_compare
      ife A Z W dhcps_match I end
      J dhcps_scan_next
dhcps_free_slot:
      R E dhcps_free
      E E Z W dhcps_free I
dhcps_scan_next:
      A I 12 I L -1
      N L Z J dhcps_scan
      R E dhcps_kind
      E E 1 J dhcps_discover
      R I dhcps_match
      E I Z J dhcps_no_owner
      M A I I A 3 M B dhcps_requested
      C S wide_compare
      N A Z J dhcps_no_owner
      R E dhcps_kind
      ife E 6
        N I/9 2 J net_no_input
        M I/9 Z
        M A 1 O S P
      end
      W dhcps_slot I
      W dhcps_reply_kind 4
      M A net_tick
      R B dhcps_duration
      M C I I C 6
      C S net_add_ticks
      N A Z O S P
      R I dhcps_slot
      M I/9 2
      J dhcps_reply
dhcps_no_owner:
      R E dhcps_kind
      E E 6 J net_no_input
      J dhcps_nak
dhcps_discover:
      R I dhcps_match
      ifn I Z
        W dhcps_slot I
        W dhcps_reply_kind 2
        ; Repeat DISCOVER never extends an existing binding/reservation.
        J dhcps_reply
      end
      R I dhcps_free
      E I Z J dhcps_nak
      W dhcps_slot I
      M A I M B dhcps_identity M C 3
      C S net_copy
      M A net_tick M B 729
      R C dhcps_slot I C 6
      C S net_add_ticks
      N A Z O S P
      R I dhcps_slot M I/9 1
      W dhcps_reply_kind 2
      J dhcps_reply
dhcps_nak:
      W dhcps_slot Z
      W dhcps_reply_kind 5
dhcps_reply:
      ; Reverse in scratch, then replace unspecified request destinations with
      ; our authoritative server address. The client identity is link-unicast.
      C S net_reverse
      M A 1831 M B 2067 M C 3 C S net_copy
      M A 1828 M B dhcps_identity M C 3 C S net_copy
      M A 1850 M C 216 C S net_zero
      W 1849 27
      W 1850 1
      R E dhcps_reply_kind W 1851 E
      M A 1852 M B dhcps_identity M C 3 C S net_copy
      M A 1855 M B 2067 M C 3 C S net_copy
      R I dhcps_slot
      ifn I Z
        M A 1858 M B I I B 3 M C 3 C S net_copy
        M A 1861 M B 2070 M C 6 C S net_copy
        R E dhcps_duration W 1867 E
      end
      M A 1823 R B net_ifaces
      C S net_send
      N A Z O S P
      M A 1 O S P
; A=range, C=count; A=0 all zero, 1 otherwise; preserves I/K/L.
dhcps_zero_range:
      R E A
      ifn E Z M A 1 O S P end
      I A 1 I C -1
      N C Z J dhcps_zero_range
      M A Z O S P
