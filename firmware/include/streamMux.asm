; Three-client native stream scheduler. Link with stream + streamData.
; Configuration supplies mx_slots (2*633 cells), mx_frame (243 ingress cells).
; Two parked contexts store RX/TX[486], network operation[32], stream state[105],
; and private neighbour cache[10]. The third context uses the normal live RAM.
; The selected slot remains live at the ordinary library addresses. Only this
; module changes selection; application state is explicitly outside this layer.
; APIs: mux_init(A=listener), mux_select(A=0..2), mux_step(). Caller-saved.
; mux_step services every transport and restores the caller's selected slot.
$mx_current: 2300
$mx_requested: 2301
$mx_pointer: 2302
$mx_return: 2303
$mx_iter: 2304
$mx_free: 2305
$mx_busy: 2306
$mx_port: 2307
$mx_packets: 2308
$mx_record: 2309
$mx_locations: 2312
$mx_protocol: 2315
$mx_service: 2316
mux_init:
      W mx_port A W mx_current Z W mx_busy Z W mx_protocol Z W mx_service Z
      M A mx_slots M C 1266 C S net_zero
      W mx_locations Z W 2313 mx_slots M E mx_slots A E 633 W 2314 E
      M A 1337 M C 486 C S net_zero
      M A 2125 M C 32 C S net_zero
      M A 2380 M C 105 C S net_zero
      R E mx_port W st_listener E
      M I mx_slots A I 519 W I E A I 633 W I E
      M A Z O S P
mux_select:
      ifl A Z J stream_bad end ifg A 2 J stream_bad end
      R E mx_current E A E J net_no_input
      W mx_requested A
      M I mx_locations A I A R E I W mx_pointer E W I Z
      R F mx_current M I mx_locations A I F W I E
      M A 1337 M B E M C 486 C S mux_swap
      M A 2125 R B mx_pointer A B 486 M C 32 C S mux_swap
      M A 2380 R B mx_pointer A B 518 M C 105 C S mux_swap
      M A 2076 R B mx_pointer A B 623 M C 10 C S mux_swap
      R E mx_requested W mx_current E J net_no_input
mux_swap:
      R E A R F B W A F W B E
      I A 1 I B 1 I C -1 N C Z J mux_swap
      O S P
mux_step:
      R E mx_busy N E Z O S P
      W mx_busy 1 R E mx_current W mx_return E W mx_packets 3
mux_receive:
      M A mx_frame R B net_ifaces C S net_receive
      N A Z J mux_service_all
      M A mx_frame C S frame_validate N A Z J mux_packet_done
      R E mx_protocol ifn E Z M A mx_frame C S E N A Z J mux_packet_done end
      M I mx_frame M E I/1
      E E 1 J mux_neighbour_all
      E E 4 J mux_icmp_all
      N E 3 J mux_packet_done
      W mx_iter Z W mx_free -1
mux_find:
      ; Inspect parked metadata directly: routing a packet must not copy three
      ; complete transport contexts before finding its owner.
      M I 2380 R E mx_iter R F mx_current
      ifn E F M I mx_locations A I E R I I A I 518 end
      W mx_record I R E I
      ife E Z R F mx_free ife F -1 R F mx_iter W mx_free F end end
      ife E 6 R F mx_free ife F -1 R F mx_iter W mx_free F end end
      ifn E Z
        M A mx_frame I A 8 M B I I B 5 C S wide_compare
        ife A Z
          R I mx_record M J mx_frame M E I/9
          N E J/15 J mux_find_next M E I/8 N E J/16 J mux_find_next
          M A I I A 10 M B mx_frame A B 17 C S wide_compare
          ife A Z R A mx_iter C S mux_select J mux_deliver end
        end
      end
mux_find_next:
      R E mx_iter I E 1 W mx_iter E N E 3 J mux_find
      ; Only OPEN may allocate a new slot. Unknown traffic cannot claim one.
      M I mx_frame M E I/25 N E 1 J mux_packet_done
      R A mx_free
      ife A -1
        ; Every connection is occupied. The ordinary stream layer emits BUSY
        ; without replacing any retained DATA or unread application payload.
        M A Z
      end
      C S mux_select
mux_deliver:
      C S mux_ingress C S stream_input
      E A 2 C S net_discard_input
      J mux_packet_done
mux_neighbour_all:
      M I mx_frame M E I/25
      ife E 1
        C S mux_ingress R I net_input C S net_neighbour C S net_discard_input
        J mux_packet_done
      end
      W mx_iter Z
mux_neighbour_next:
      M I 2125 R E mx_iter R F mx_current
      ifn E F M I mx_locations A I E R I I A I 486 end
      M E I/15
      ifn E Z
        M A I I A 5 M B mx_frame A B 17 C S wide_compare
        ife A Z
          R A mx_iter C S mux_select C S mux_ingress
          R I net_input C S net_neighbour C S net_discard_input
          J mux_packet_done
        end
      end
      R E mx_iter I E 1 W mx_iter E N E 3 J mux_neighbour_next
      J mux_packet_done
mux_icmp_all:
      ; Quoted errors are matched independently against each retained frame.
      W mx_iter Z
mux_icmp_next:
      R A mx_iter C S mux_select C S mux_ingress C S stream_input
      E A 2 C S net_discard_input
      R E mx_iter I E 1 W mx_iter E N E 3 J mux_icmp_next
mux_packet_done:
      R E mx_packets I E -1 W mx_packets E N E Z J mux_receive
mux_service_all:
      W mx_iter Z
mux_service_next:
      R A mx_iter C S mux_select
      R E mx_service ifn E Z C S E end
      C S stream_service
      R E mx_iter I E 1 W mx_iter E N E 3 J mux_service_next
      R A mx_return C S mux_select W mx_busy Z O S P
mux_ingress:
      W net_input_iface net_ifaces
      M A 1337 R E net_rx_owned N E Z M A 1823
      W net_input A M B mx_frame M C 243 C S net_copy
      R E net_input E E 1337 W net_rx_owned 1
      O S P
