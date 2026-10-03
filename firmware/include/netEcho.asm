; Server-only ICMP echo responder, independent of application RX/retained TX.
; input follows validated net_poll ingress: A=1 handled, 0 unhandled.
; service owns net_pending only in state 2. Other protocols must not service
; that operation, but may keep processing their own input/application work.
; A 54-cell header/payload slot at 5333 plus a 3-cell expiry replaces no HTTP
; arena. Full slot drops further requests; ICMP peers can retry.
$echo_pending: 2529
$echo_iface: 2531
$echo_frame: 5333
$echo_until: 5387
net_echo_input:
      R I net_input N I/1 4 J echo_ignore N I/25 1 J echo_ignore
      M A I I A 11 R B net_input_iface I B 1 C S wide_compare
      N A Z J echo_drop
      R E echo_pending N E Z J echo_drop
      C S net_reverse W 1848 2 W echo_iface B
      M A echo_frame M B 1823 M C 54 C S net_copy
      W echo_pending 1
      J echo_drop
net_echo_service:
      R E echo_pending E E Z J echo_ignore
      ife E 1
        M A 5344 R B echo_iface C S net_control_to
        E A -1 J echo_ignore ifn A Z J echo_clear end
        W echo_pending 2
      end
      R E echo_pending
      ife E 2
        C S net_service E A Z O S P ifl A Z J echo_clear end
        M A 5338 R B echo_iface A B 13 M C 3 C S net_copy
        C S net_now M A net_tick M B 2430 M C echo_until C S net_add_ticks
        ifn A Z J echo_clear end W echo_pending 3
      end
      C S net_now M A net_tick M B echo_until C S wide_compare
      ifge A Z W echo_pending 1 J echo_ignore end
      M A 1823 M C 243 C S net_zero
      M A 1823 M B echo_frame M C 54 C S net_copy
      R I echo_iface M A 1823 R B I C S net_send
      E A -1 J echo_ignore
 echo_clear: W echo_pending Z
 echo_ignore: M A Z O S P
 echo_drop: C S net_discard_input M A 1 O S P
