; Server-only idle helper. Call init after configuring one/two interfaces.
; wait(A=maximum sleep cycles, 0=indefinite) rechecks all queues before H.
; Pending NIC interrupts bridge the queue-check/sleep race. A..L caller-saved.
; A timed wait is required whenever protocol retry/expiry work remains.
net_wait_init:
      W 19 @net_wait_irq
      M I net_ifaces R K net_iface_count
net_wait_enable:
      R F I A F 12 W F 9801
      A I 27 I K -1 N K Z J net_wait_enable
      M A Z O S P
net_wait:
      R E net_rx_owned N E Z J net_wait_done
      M I net_ifaces R K net_iface_count
net_wait_queue:
      R F I I F 4 R E F N E Z J net_wait_done
      A I 27 I K -1 N K Z J net_wait_queue
net_wait_halt:
      H -9679 A
      W 26 -9841
net_wait_done: M A Z O S P
; Minimal wake-only IRQ: no register clobbers; leave all lines masked until H.
net_wait_irq: R P 40
; Native HTTP startup loops: don't delay buffered parsing/output work.
http_server_wait:
      R E 2493
      ifn E Z ifn E 5 R E 2402 E E Z J net_wait_done end end
      M A 6561 R E 2380 ife E Z R E net_pending ife E Z R E 2440 ife E Z R E 2529 ife E Z M A Z end end end end
      J net_wait
