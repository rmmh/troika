; Native single-LAN DHCP client; common network + serial required.
; Application defines dhcp_lease_lost (native return) to clear DNS/stream state.
; start clears configuration. service/input return 1 on ACK, 0 pending/ignored,
; negative on failed transaction. service must continue while bound for expiry.
; Control frames use TX scratch only; retained application TX is never replaced.
$dhcpc_state: 2344
$dhcpc_identity: 2345
$dhcpc_server: 2348
$dhcpc_address: 2351
$dhcpc_until: 2354
$dhcpc_renew: 2357
$dhcpc_serial: 2360
$dhcpc_deadline: 2363
$dhcpc_retry: 2366
$dhcpc_sends: 2369
$dhcpc_duration: 2370
$dhcpc_status: 2371
$dhcpc_link: 2372
$dhcpc_serial_valid: 2375
$dhcpc_first_sent: 2376
; States 0 stopped, 1 discover, 2 request, 3 bound, 4 renew,
; 5 wait for link, 6 renewal failed (old lease still expires at original time).
dhcp_client_start:
      R E net_iface_count
      N E 1 J net_bad_interface
      R B net_ifaces
      E B 95 J dhcpc_start_base
      N B 122 J net_bad_interface
dhcpc_start_base:
      M A dhcpc_identity M C 3
      C S net_copy
      C S dhcpc_clear
      W dhcpc_state 5
      M A Z O S P
dhcpc_clear:
      W dhcpc_state Z
      W dhcpc_serial_valid Z
      M A 2067 M C 9 C S net_zero
      W 2085 Z
      W net_pending Z
      W net_resolving Z
      C S dhcp_lease_lost
      M A Z O S P

dhcp_client_service:
      R E dhcpc_state
      E E Z J net_no_input
      R F net_ifaces I F 3 R E F
      ife E Z
        R E dhcpc_state
        ifn E 5 C S dhcpc_clear W dhcpc_state 5 end
        J net_no_input
      end
      C S net_now
      R E dhcpc_state
      ife E 5 W dhcpc_state 1 end
      R E dhcpc_state
      ifge E 3
        M A net_tick M B dhcpc_until C S wide_compare
        ifge A Z
          C S dhcpc_clear
          W dhcpc_state 1
          J net_no_input
        end
        R E dhcpc_state
        E E 6 J net_no_input
        ife E 3
          M A net_tick M B dhcpc_renew C S wide_compare
          E A -1 J net_no_input
          W dhcpc_state 4
          W dhcpc_serial_valid Z
        end
      end
      R E dhcpc_serial_valid
      ife E Z
        C S serial_alloc
        E D -1 J net_no_input
        ifn D Z
          W dhcpc_status D
          C S dhcpc_clear
          R A dhcpc_status
          O S P
        end
        W dhcpc_serial A W 2361 B W 2362 C
        C S net_now
        M A net_tick M B 729 M C dhcpc_deadline C S net_add_ticks
        N A Z J dhcpc_fail
        M A dhcpc_retry M B net_tick M C 3 C S net_copy
        W dhcpc_serial_valid 1
        W dhcpc_sends Z
        ; Durable range refill may take time. Never renew an already expired lease.
        R E dhcpc_state
        ife E 4
          M A net_tick M B dhcpc_until C S wide_compare
          ifge A Z
            C S dhcpc_clear W dhcpc_state 1
            J net_no_input
          end
        end
      end
      M A net_tick M B dhcpc_deadline C S wide_compare
      ifge A Z
        R E dhcpc_state
        ife E 4
          W dhcpc_state 6
          W dhcpc_serial_valid Z
        else
          C S dhcpc_clear
          W dhcpc_state 1
        end
        M A -53 O S P
      end
      R E dhcpc_sends
      ifge E 3 J net_no_input end
      M A net_tick M B dhcpc_retry C S wide_compare
      E A -1 J net_no_input
      M A 1823 M C 243 C S net_zero
      W 1823 1 W 1824 2 W 1837 27 W 1838 68 W 1839 67
      W 1849 27 W 1850 1 W 1851 1
      M A 1840 M B dhcpc_serial M C 3 C S net_copy
      M A 1852 M B dhcpc_identity M C 3 C S net_copy
      R E dhcpc_state
      ifn E 1
        W 1851 3
        M A 1828 M B dhcpc_link M C 3 C S net_copy
        M A 1834 M B dhcpc_server M C 3 C S net_copy
        M A 1855 M B dhcpc_server M C 6 C S net_copy
        R E dhcpc_state
        ife E 4
          M A 1831 M B dhcpc_address M C 3 C S net_copy
        end
      end
      M A 1823 R B net_ifaces C S net_send
      E A -1 J net_no_input
      N A Z J dhcpc_fail
      C S net_now
      R E dhcpc_sends
      ife E Z
        M A dhcpc_first_sent M B net_tick M C 3 C S net_copy
      end
      R E dhcpc_sends I E 1 W dhcpc_sends E
      M A net_tick M B 243 M C dhcpc_retry C S net_add_ticks
      N A Z J dhcpc_fail
      J net_no_input
dhcpc_fail:
      W dhcpc_status A
      C S dhcpc_clear
      R A dhcpc_status
      O S P

; Structurally validated ingress. No configuration changes before full matching.
dhcp_client_input:
      R E dhcpc_serial_valid
      E E Z J net_no_input
      R E dhcpc_sends
      E E Z J net_no_input
      R E dhcpc_state
      E E 1 J dhcpc_input_state
      E E 2 J dhcpc_input_state
      N E 4 J net_no_input
dhcpc_input_state:
      R E net_input_iface N E net_ifaces J net_no_input
      R I net_input
      N I/1 2 J net_no_input
      N I/15 67 J net_no_input
      N I/16 68 J net_no_input
      N I/26 27 J net_no_input
      N I/27 1 J net_no_input
      M A I I A 5 M B dhcpc_identity C S wide_compare
      N A Z J net_no_input
      M A I A A 29 M B dhcpc_identity C S wide_compare
      N A Z J net_no_input
      M A I A A 17 M B dhcpc_serial C S wide_compare
      N A Z J net_no_input
      M A I I A 8 M B I A B 32 C S wide_compare
      N A Z J net_no_input
      M F I A F 32 C S frame_tuple_zero
      E A 1 J net_no_input
      ; Bootstrap destination zero, configured renewal destination our address.
      R E dhcpc_state
      ife E 4
        M A I I A 11 M B dhcpc_address C S wide_compare
        N A Z J net_no_input
      else
        M F I I F 11 C S frame_tuple_zero
        N A 1 J net_no_input
      end
      M F I A F 45 M G 9
dhcpc_reserved:
      R E F N E Z J net_no_input
      I F 1 I G -1 N G Z J dhcpc_reserved
      C S net_now
      M A net_tick M B dhcpc_deadline C S wide_compare
      ifge A Z J net_no_input end
      R E dhcpc_state
      ife E 4
        M A net_tick M B dhcpc_until C S wide_compare
        ifge A Z J net_no_input end
      end
      R I net_input
      R E dhcpc_state
      ife E 1
        N I/28 2 J net_no_input
      else
        M A I A A 32 M B dhcpc_server C S wide_compare
        N A Z J net_no_input
        M A I I A 2 M B dhcpc_link C S wide_compare
        N A Z J net_no_input
        E I/28 5 J dhcpc_nak
        N I/28 4 J net_no_input
        M A I A A 35 M B dhcpc_address C S wide_compare
        N A Z J net_no_input
      end
      ; OFFER/ACK configuration grammar and subnet relationships.
      M E I/44
      ifl E 81 J net_no_input end
      M F I A F 35 C S frame_tuple_zero
      E A 1 J net_no_input
      N I/32 I/35 J net_no_input
      N I/33 I/36 J net_no_input
      M F I A F 38 C S frame_tuple_zero
      ifn A 1
        N I/32 I/38 J net_no_input
        N I/33 I/39 J net_no_input
      end
      M F I A F 41 C S frame_tuple_zero
      E A 1 J net_no_input
      R E dhcpc_state
      E E 1 J dhcpc_offer
      ; Anchor expiry to first REQUEST submission, never delayed ACK reception.
      M E I/44 W dhcpc_duration E
      M A dhcpc_first_sent M B E M C dhcpc_until C S net_add_ticks
      N A Z J dhcpc_fail
      ; CPU Q rounds nearest: correct its possible upward half to floor.
      R E dhcpc_duration M F E Q E 2 S F E S F E
      ifl F Z I E -1 end
      M A dhcpc_first_sent M B E M C dhcpc_renew C S net_add_ticks
      N A Z J dhcpc_fail
      M A net_tick M B dhcpc_until C S wide_compare
      ifge A Z
        C S dhcpc_clear W dhcpc_state 1
        J net_no_input
      end
      M A 2067 R B net_input A B 35 M C 9 C S net_copy
      W 2085 Z
      W dhcpc_state 3
      W dhcpc_serial_valid Z
      W dhcpc_status 1
      M A 1 O S P
dhcpc_offer:
      M A dhcpc_server M B I A B 32 M C 6 C S net_copy
      M A dhcpc_link R B net_input I B 2 M C 3 C S net_copy
      W dhcpc_state 2
      W dhcpc_serial_valid Z
      M A Z O S P
dhcpc_nak:
      M F I A F 35 M G 10
dhcpc_nak_zero:
      R E F N E Z J net_no_input
      I F 1 I G -1 N G Z J dhcpc_nak_zero
      C S dhcpc_clear
      W dhcpc_state 1
      M A -56 O S P
