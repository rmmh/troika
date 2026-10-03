; Native two-interface router. No host forwarding or per-flow state.
; Route entries: kind(1 connected/2 static/3 default), subnet(2), interface
; index(0/1), next hop(3). Tables are guest RAM, nine entries maximum.
$router_routes: 2200
$router_route_count: 2263
$router_candidate: 2264
$router_destination: 2265
$router_index: 2266
$router_entry: 2267
$router_forwarded: 2269
$router_dropped: 2270
$router_default: 2272
$router_connected0: 2273
$router_connected1: 2274
$router_pending_kind: 2275
$router_error_kind: 2276
$router_error_code: 2277
$router_error_iface: 2278
$router_error_next: 2279

router_init:
      R E net_iface_count
      N E 2 J router_bad_config
      R E net_ifaces
      N E 95 J router_bad_config
      R E 2093
      N E 122 J router_bad_config
      M F 2067
      C S frame_tuple_zero
      E A 1 J router_bad_config
      M F 2094
      C S frame_tuple_zero
      E A 1 J router_bad_config
      R E router_route_count
      ifl E 2 J router_bad_config end
      ifg E 9 J router_bad_config end
      W router_connected0 Z
      W router_connected1 Z
      W router_index Z
      W router_entry router_routes
router_init_entry:
      R I router_entry
      M E I/0
      ifl E 1 J router_bad_config end
      ifg E 3 J router_bad_config end
      M G I/3
      ifl G Z J router_bad_config end
      ifg G 1 J router_bad_config end
      P G 27
      A G net_ifaces
      M E I/0
      ife E 1
        M E I/1
        M F G/1
        N E F J router_bad_config
        M E I/2
        M F G/2
        N E F J router_bad_config
        M F I
        I F 4
        C S frame_tuple_zero
        N A 1 J router_bad_config
        M E I/3
        A E router_connected0
        R F E
        N F Z J router_bad_config
        W E 1
      else
        M E I/4
        M F G/1
        N E F J router_bad_config
        M E I/5
        M F G/2
        N E F J router_bad_config
        M F I
        I F 4
        C S frame_tuple_zero
        E A 1 J router_bad_config
      end
      M J router_routes
      R K router_index
router_init_duplicates:
      E K Z J router_init_next
      M E I/0
      M F J/0
      ife E 3
        E F 3 J router_bad_config
      else
        ifn F 3
          M E I/1
          M F J/1
          ife E F
            M E I/2
            M F J/2
            E E F J router_bad_config
          end
        end
      end
      I J 7
      I K -1
      J router_init_duplicates
router_init_next:
      R E router_index
      I E 1
      W router_index E
      R F router_route_count
      ifl E F
        R I router_entry
        I I 7
        W router_entry I
        J router_init_entry
      end
      R E router_connected0
      N E 1 J router_bad_config
      R E router_connected1
      N E 1 J router_bad_config
      M A Z
      O S P
router_bad_config: M A -44 O S P

; A=destination tuple pointer. Return A=status, B=interface record, C=next hop.
router_route:
      W router_destination A
      W router_candidate Z
      W router_default Z
      M I router_routes
      R K router_route_count
router_route_scan:
      M E I/0
      ife E 3
        W router_default I
      else
        R J router_destination
        M E I/1
        M F J/0
        ife E F
          M E I/2
          M F J/1
          E E F W router_candidate I
        end
      end
      I I 7
      I K -1
      N K Z J router_route_scan
      R I router_candidate
      E I Z R I router_default
      E I Z J net_no_route
      M B I/3
      P B 27
      A B net_ifaces
      M E I/0
      ife E 1
        R C router_destination
      else
        M C I
        I C 4
      end
      M A Z
      O S P

; Consume one validated application frame. The main loop still services
; neighbour control traffic while a pending forward frame owns its buffer.
router_input:
      R E net_pending
      N E Z J router_drop
      R I net_input
      M F I
      I F 5
      C S frame_tuple_zero
      E A 1 J router_drop
      M F I
      I F 11
      C S frame_tuple_zero
      E A 1 J router_drop
      M A I
      I A 11
      M B 2067
      C S wide_compare
      E A Z J router_local
      R A net_input
      I A 11
      M B 2094
      C S wide_compare
      E A Z J router_local
      R I net_input
      M E I/14
      ifle E 1
        W router_error_kind 4
        W router_error_code Z
        J router_emit_error
      end
      M A I
      I A 11
      C S router_route
      ifn A Z
        W router_error_kind 3
        W router_error_code 1
        J router_emit_error
      end
      R I net_input
      M E I/14
      I E -1
      M I/14 E
      M A I
      C S net_begin_to
      ifn A Z J router_drop end
      W router_pending_kind 1
      J net_consume
router_local:
      R I net_input
      M E I/1
      ife E 4
        E I/25 1 J router_echo
        J router_drop
      end
      M E I/1
      ife E 2
        W router_error_kind 3
        W router_error_code 3
        J router_emit_error
      end
      E I/25 1 J router_refuse
      J router_drop
router_refuse:
      C S net_reverse
      W 1848 6
      W 1849 1
      W 1850 1
      J router_send_reply
router_echo:
      C S net_reverse
      W 1848 2
router_send_reply:
      M A 1834
      C S router_route
      N A Z J router_drop
      M A 1823
      C S net_begin_to
      N A Z J router_drop
      W router_pending_kind 2
      J net_consume
router_drop:
      R E router_dropped
      ifl E 9841 I E 1 end
      W router_dropped E
      J net_consume

router_emit_error:
      R E net_pending
      N E Z J router_drop
      R I net_input
      M E I/1
      E E 1 J router_drop
      ife E 4
        M E I/25
        ifge E 3 J router_drop end
      end
      M F I
      I F 5
      C S frame_tuple_zero
      E A 1 J router_drop
      M F I
      I F 8
      C S frame_tuple_zero
      E A 1 J router_drop
      M F I
      I F 11
      C S frame_tuple_zero
      E A 1 J router_drop
      M A I
      I A 8
      C S router_route
      N A Z J router_drop
      W router_error_iface B
      W router_error_next C
      C S net_now
      R I router_error_iface
      M E I/23
      ifn E Z
        M A I
        A A 20
        M B 9
        M C net_temp
        C S net_add_ticks
        N A Z J router_drop
        M A net_tick
        M B net_temp
        C S wide_compare
        E A -1 J router_drop
      end
      M A 1823
      M C 243
      C S net_zero
      W 1823 1
      W 1824 4
      W 1837 27
      R E router_error_kind
      W 1848 E
      W 1849 28
      R E router_error_code
      W 1850 E
      M A 1831
      R B router_error_iface
      I B 1
      M C 3
      C S net_copy
      M A 1834
      R B net_input
      I B 8
      M C 3
      C S net_copy
      M A 1840
      R B net_input
      A B 17
      M C 3
      C S net_copy
      M A 1851
      R B net_input
      M C 27
      C S net_copy
      M A 1823
      R B router_error_iface
      R C router_error_next
      C S net_begin_to
      N A Z J router_drop
      W router_pending_kind 2
      R A router_error_iface
      A A 20
      M B net_tick
      M C 3
      C S net_copy
      R I router_error_iface
      M I/23 1
      J net_consume

; Main-loop timer/output work; handle resolution failure of a forwarded frame.
router_service:
      C S net_service
      ife A 1
        R E router_pending_kind
        ife E 1
          R E router_forwarded
          ifl E 9841 I E 1 end
          W router_forwarded E
        end
      end
      ife A -42
        R E router_pending_kind
        ife E 1
          ; Retained forward still owns the original network tuple/header.
          W net_input 1580
          R E 1594
          I E 1
          W 1594 E
          W router_error_kind 3
          W router_error_code 2
          C S router_emit_error
        end
      end
      M A Z
      O S P
