; Native network link/route service. Requires netDevice, frame, serial modules.
; Each interface record is 27 trytes: base, address(3), gateway(3), DNS(3),
; neighbour address(3), neighbour link(3), expiry(3), valid, ICMP timestamp(3),
; timestamp-valid, reserved(3). One client record, two for a router.
$net_ifaces: 2066
$net_iface_count: 2120
$net_tick: 2121
$net_input_iface: 2124
$net_pending: 2125
$net_pending_iface: 2126
$net_target: 2127
$net_serial: 2130
$net_resolve_end: 2133
$net_retry_at: 2136
$net_sends: 2139
$net_resolving: 2140
$net_status: 2141
$net_rx_owned: 2142
$net_input: 2143
$net_poll_index: 2144
$net_send_deadline: 2145
$net_last_sent: 2148
$net_temp: 2151
$net_source: 2154

; Bounded shared helpers; caller owns all registers except S.
net_copy:
      E C Z O S P
net_copy_loop:
      D A B
      I C -1
      N C Z J net_copy_loop
      O S P
net_zero:
      E C Z O S P
net_zero_loop:
      W A Z
      I A 1
      I C -1
      N C Z J net_zero_loop
      O S P
net_now:
      M A net_tick
      R B net_ifaces
      C S net_clock
      O S P
; A=wide source, B=positive small delta, C=wide destination; A=status.
net_add_ticks:
      M E A/0
      M F A/1
      M G A/2
      M H G
      A G B
      ifl G H
        I F 1
        ife F -9841
          I E 1
          ife E -9841
            M A -32
            O S P
          end
        end
      end
      W C E
      I C 1
      W C F
      I C 1
      W C G
      M A Z
      O S P

; Return A=0 no application frame, 1 newly owned RX, 3 temporary control input
; in TX scratch while RX is owned. Caller must not retain that temporary frame.
; Neighbour traffic is processed here; net_input/net_input_iface identify input.
net_poll:
      R E net_iface_count
      ifl E 1 J net_bad_interface end
      ifg E 2 J net_bad_interface end
      R F net_poll_index
      ifge F E M F Z end
      M I F
      I F 1
      ifge F E M F Z end
      W net_poll_index F
      P I 27
      A I net_ifaces
      W net_input_iface I
      R B I
      M F B
      I F 3
      R E F
      ife E Z
        M I/19 Z
        J net_no_input
      end
      M A 1337
      R E net_rx_owned
      N E Z M A 1823
      W net_input A
      C S net_receive
      ife A -4
        M A Z
        O S P
      end
      N A Z O S P
      R A net_input
      C S frame_validate
      ifn A Z
        M A Z
        O S P
      end
      R I net_input
      E I/1 1 J net_neighbour
      R E net_rx_owned
      ifn E Z
        M A 3
        O S P
      end
      W net_rx_owned 1
      M A 1
      O S P
net_consume:
      W net_rx_owned Z
      M A Z
      O S P
net_neighbour:
      E I/25 1 J net_neighbour_ask
      R E net_resolving
      E E Z J net_no_input
      R E net_input_iface
      R F net_pending_iface
      N E F J net_no_input
      M A I
      A A 17
      M B net_serial
      C S wide_compare
      N A Z J net_no_input
      R A net_input
      I A 8
      M B net_target
      C S wide_compare
      N A Z J net_no_input
      R A net_input
      I A 11
      R B net_pending_iface
      I B 1
      C S wide_compare
      N A Z J net_no_input
      C S net_now
      M A net_tick
      M B net_resolve_end
      C S wide_compare
      ifg A Z J net_no_input end
      R A net_pending_iface
      I A 10
      M B net_target
      M C 3
      C S net_copy
      R A net_pending_iface
      I A 13
      R B net_input
      I B 2
      M C 3
      C S net_copy
      C S net_now
      M A net_tick
      M B 2430
      R C net_pending_iface
      A C 16
      C S net_add_ticks
      N A Z J net_fail
      R I net_pending_iface
      M I/19 1
      W net_resolving Z
      J net_no_input
net_neighbour_ask:
      M A I
      I A 11
      R B net_input_iface
      I B 1
      C S wide_compare
      N A Z J net_no_input
      ; Reply in TX scratch. If input is already there, this is a safe self-copy.
      M A 1823
      R B net_input
      M C 243
      C S net_copy
      M A 1828
      M B 1825
      M C 3
      C S net_copy
      M A 1834
      M B 1831
      M C 3
      C S net_copy
      M A 1831
      R B net_input_iface
      I B 1
      M C 3
      C S net_copy
      W 1837 27
      W 1848 2
      M A 1823
      R I net_input_iface
      R B I
      C S net_send
      ; Busy control replies may be dropped; the query sender retries.
net_no_input:
      M A Z
      O S P

; Client route: A=frame pointer, B=interface record. Preserve destination in
; the frame; resolve it when local, otherwise resolve the configured gateway.
net_begin_send:
      E B net_ifaces J net_begin_send_iface
      N B 2093 J net_bad_interface
      R E net_iface_count
      N E 2 J net_bad_interface
net_begin_send_iface:
      R E net_pending
      N E Z J net_tx_busy
      M I B
      M K A
      M E K/11
      M F I/1
      N E F J net_client_gateway
      M E K/12
      M F I/2
      N E F J net_client_gateway
      M C K
      I C 11
      J net_begin_to
net_client_gateway:
      M C I
      I C 4
      M F C
      C S frame_tuple_zero
      E A 1 J net_no_route
      M E I/4
      M F I/1
      N E F J net_no_route
      M E I/5
      M F I/2
      N E F J net_no_route
      M A K
      M B I
; Explicit next-hop API for native routers: A=frame, B=interface, C=next-hop.
net_begin_to:
      E B net_ifaces J net_begin_to_iface
      N B 2093 J net_bad_interface
      R E net_iface_count
      N E 2 J net_bad_interface
net_begin_to_iface:
      R E net_pending
      N E Z J net_tx_busy
      W net_source A
      W net_pending_iface B
      M E C/0
      M F B/1
      N E F J net_no_route
      M E C/1
      M F B/2
      N E F J net_no_route
      M F C
      C S frame_tuple_zero
      E A 1 J net_no_route
      M B C
      M A net_target
      M C 3
      C S net_copy
      M A 1580
      R B net_source
      ifn B 1580
        M C 243
        C S net_copy
      end
      W net_pending 1
      W net_resolving Z
      W net_status Z
      C S net_now
      M A net_tick
      M B 729
      M C net_send_deadline
      C S net_add_ticks
      N A Z J net_fail
      M A Z
      O S P
; Resolve a control packet's next hop without replacing an unacknowledged
; application frame. B=interface, C=next hop. net_service returns 2 when ready.
net_begin_control_route:
      M A 1580
      C S net_begin_to
      N A Z O S P
      W net_pending 2
      M A Z
      O S P
net_no_route:
      M A -43
      O S P
net_fail:
      W net_status A
      W net_pending Z
      W net_resolving Z
      O S P

; Service one pending application send. A=0 waiting, 1 submitted, negative error.
; Control traffic uses TX scratch; the retained application frame is untouched
; until its selected next-hop link tuple is installed immediately before SEND.
net_service:
      R E net_pending
      E E Z J net_no_input
      R I net_pending_iface
      R F I
      I F 3
      R E F
      ife E Z
        M I/19 Z
        M A -2
        J net_fail
      end
      C S net_now
      N A Z J net_fail
      M A net_tick
      M B net_send_deadline
      C S wide_compare
      ifge A Z
        M A -41
        J net_fail
      end
      ; A broadcast neighbour query excludes its sender, so resolve self locally.
      R A net_pending_iface
      I A 1
      M B net_target
      C S wide_compare
      ife A Z
        R A net_pending_iface
        I A 10
        M B net_target
        M C 3
        C S net_copy
        R I net_pending_iface
        R F I
        M D I
        I D 13
        M G 3
net_self_identity:
        R E F
        W D E
        I F 1
        I D 1
        I G -1
        N G Z J net_self_identity
        M A net_tick
        M B 2430
        R C net_pending_iface
        A C 16
        C S net_add_ticks
        N A Z J net_fail
        R I net_pending_iface
        M I/19 1
      end
      R I net_pending_iface
      M E I/19
      E E Z J net_need_neighbour
      M A I
      I A 10
      M B net_target
      C S wide_compare
      N A Z J net_need_neighbour
      M A net_tick
      R B net_pending_iface
      A B 16
      C S wide_compare
      ifge A Z
        R I net_pending_iface
        M I/19 Z
        J net_need_neighbour
      end
      R E net_pending
      ife E 2
        W net_pending Z
        W net_resolving Z
        W net_status 2
        M A 2
        O S P
      end
      M A 1585
      R B net_pending_iface
      I B 13
      M C 3
      C S net_copy
      M A 1580
      R I net_pending_iface
      R B I
      C S net_send
      E A -1 J net_no_input
      N A Z J net_fail
      C S net_now
      M A net_last_sent
      M B net_tick
      M C 3
      C S net_copy
      W net_status 1
      W net_pending Z
      W net_resolving Z
      M A 1
      O S P
net_need_neighbour:
      R E net_resolving
      N E Z J net_resolve_timer
      R I net_pending_iface
      M I/19 Z
      C S serial_alloc
      ifn D Z
        ; The filesystem may be held by a bounded file-read phase. Wait inside
        ; the application's total deadline; other counter failures abort.
        E D -1 J net_no_input
        M A D
        J net_fail
      end
      W net_serial A
      W 2131 B
      W 2132 C
      C S net_now
      M A net_tick
      M B 27
      M C net_resolve_end
      C S net_add_ticks
      N A Z J net_fail
      M A net_retry_at
      M B net_tick
      M C 3
      C S net_copy
      W net_sends Z
      W net_resolving 1
net_resolve_timer:
      M A net_tick
      M B net_resolve_end
      C S wide_compare
      ifge A Z
        M A -42
        J net_fail
      end
      M A net_tick
      M B net_retry_at
      C S wide_compare
      E A -1 J net_no_input
      R E net_sends
      ifge E 3 J net_no_input end
      M A 1823
      M C 243
      C S net_zero
      W 1823 1
      W 1824 1
      M A 1831
      R B net_pending_iface
      I B 1
      M C 3
      C S net_copy
      M A 1834
      M B net_target
      M C 3
      C S net_copy
      W 1837 27
      M A 1840
      M B net_serial
      M C 3
      C S net_copy
      W 1848 1
      M A 1823
      R I net_pending_iface
      R B I
      C S net_send
      E A -1 J net_no_input
      N A Z J net_fail
      R E net_sends
      I E 1
      W net_sends E
      C S net_now
      M A net_tick
      M B 9
      M C net_retry_at
      C S net_add_ticks
      N A Z J net_fail
      M A Z
      O S P

; Prepare a reply by reversing endpoints/ports into TX scratch. A=buffer,
; B=input interface on return. The application chooses kind/payload then queues.
net_reverse:
      M A 1823
      R B net_input
      M C 243
      C S net_copy
      M I 1823
      X I/2 I/5
      X I/3 I/6
      X I/4 I/7
      X I/8 I/11
      X I/9 I/12
      X I/10 I/13
      X I/15 I/16
      M I/14 27
      M A 1823
      R B net_input_iface
      O S P
