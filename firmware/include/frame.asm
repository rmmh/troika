; Native structural ingress validation, transport.txt. A=frame, A=0/-40 status.
; Clobbers A..L. A rejected frame must not change protocol state or get a reply.
; Application grammars and endpoint matching are checked by the owning service.
frame_validate:
      M K A
      N K/0 1 J frame_bad
      M E K/1
      ifl E 1 J frame_bad end
      M E K/1
      ifg E 4 J frame_bad end
      M E K/14
      ifl E 1 J frame_bad end
      M E K/14
      ifg E 27 J frame_bad end
      M G K/26
      ifl G Z J frame_bad end
      ifg G 216 J frame_bad end
      M I K
      A I 27
      A I G
      M J 216
      S J G
frame_padding:
      E J Z J frame_header
      R E I
      N E Z J frame_bad
      I I 1
      I J -1
      J frame_padding
frame_header:
      M F K
      I F 2
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      A F 17
      C S frame_positive
      N A Z O S P
      E K/1 1 J frame_neighbour
      E K/1 2 J frame_datagram
      ; All stream/ICMP traffic has unicast link/network destinations and source.
      M F K
      I F 5
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      I F 8
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      I F 11
      C S frame_tuple_zero
      E A 1 J frame_bad
      E K/1 4 J frame_icmp
      ; Stream ports and kinds.
      M E K/15
      ifl E 1 J frame_bad end
      M E K/16
      ifl E 1 J frame_bad end
      M E K/25
      ifl E 1 J frame_bad end
      M E K/25
      ifg E 6 J frame_bad end
      E K/25 1 J frame_open
      M F K
      A F 20
      E K/25 6 J frame_reset
      C S frame_positive
      N A Z O S P
      E K/25 2 J frame_open_ack
      E K/25 3 J frame_ack
      E K/25 4 J frame_data
      ; FIN
      M E K/23
      ifl E 1 J frame_bad end
      N K/24 Z J frame_bad
      N G Z J frame_bad
      J frame_ok
frame_open:
      M F K
      A F 20
      C S frame_tuple_zero
      N A 1 J frame_bad
frame_open_ack:
      N K/23 Z J frame_bad
      N K/24 Z J frame_bad
      N G Z J frame_bad
      J frame_ok
frame_ack:
      N K/23 Z J frame_bad
      L K/24 Z J frame_bad
      N G Z J frame_bad
      J frame_ok
frame_data:
      M E K/23
      ifl E 1 J frame_bad end
      M E K/23
      ifg E 9840 J frame_bad end
      N K/24 Z J frame_bad
      ifl G 1 J frame_bad end
      J frame_ok
frame_reset:
      ; B may be zero for an OPEN rejection; otherwise it must be positive.
      C S frame_tuple_zero
      ifn A 1
        M F K
        A F 20
        C S frame_positive
        N A Z O S P
      end
      N K/23 Z J frame_bad
      N K/24 Z J frame_bad
      N G 1 J frame_bad
      M E K/27
      ifl E 1 J frame_bad end
      M E K/27
      ifg E 6 J frame_bad end
      J frame_ok
frame_neighbour:
      N K/15 Z J frame_bad
      N K/16 Z J frame_bad
      N K/23 Z J frame_bad
      N K/24 Z J frame_bad
      N G Z J frame_bad
      M F K
      A F 20
      C S frame_tuple_zero
      N A 1 J frame_bad
      E K/25 1 J frame_neighbour_request
      N K/25 2 J frame_bad
      M F K
      I F 5
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      I F 8
      C S frame_tuple_zero
      E A 1 J frame_bad
      J frame_ok
frame_neighbour_request:
      M F K
      I F 5
      C S frame_tuple_zero
      N A 1 J frame_bad
      M F K
      I F 11
      C S frame_tuple_zero
      E A 1 J frame_bad
      J frame_ok
frame_datagram:
      M E K/15
      ifl E 1 J frame_bad end
      M E K/16
      ifl E 1 J frame_bad end
      N K/25 Z J frame_bad
      N K/23 Z J frame_bad
      N K/24 Z J frame_bad
      M F K
      A F 20
      C S frame_tuple_zero
      N A 1 J frame_bad
      ; Only DHCP allows an unspecified source or either broadcast destination.
      M E K/15
      ife E 67
        E K/16 68 J frame_ok
      end
      M E K/15
      ife E 68
        E K/16 67 J frame_ok
      end
      M F K
      I F 5
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      I F 8
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      I F 11
      C S frame_tuple_zero
      E A 1 J frame_bad
      J frame_ok
frame_icmp:
      N K/15 Z J frame_bad
      N K/16 Z J frame_bad
      N K/23 Z J frame_bad
      N K/24 Z J frame_bad
      M F K
      A F 20
      C S frame_tuple_zero
      N A 1 J frame_bad
      M E K/25
      ifl E 1 J frame_bad end
      M E K/25
      ifg E 4 J frame_bad end
      M E K/25
      ifle E 2
        ifg G 27 J frame_bad end
        J frame_ok
      end
      N G 28 J frame_bad
      M E K/25
      ife E 4
        N K/27 Z J frame_bad
      else
        M E K/27
        ifl E 1 J frame_bad end
        M E K/27
        ifg E 3 J frame_bad end
      end
      ; Error quotes must name an eligible original header and echo its serial.
      N K/28 1 J frame_bad
      M E K/29
      ifl E 2 J frame_bad end
      ifg E 4 J frame_bad end
      ife E 4
        M E K/53
        ifl E 1 J frame_bad end
        ifg E 2 J frame_bad end
      end
      N K/17 K/45 J frame_bad
      N K/18 K/46 J frame_bad
      N K/19 K/47 J frame_bad
      M E K/42
      ifl E 1 J frame_bad end
      ifg E 27 J frame_bad end
      M F K
      A F 33
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      A F 36
      C S frame_tuple_zero
      E A 1 J frame_bad
      M F K
      A F 39
      C S frame_tuple_zero
      E A 1 J frame_bad
      J frame_ok

; F points to a tuple; A=1 if all zero, else 0. Only A/E/F clobbered.
frame_tuple_zero:
      R E F
      N E Z J frame_tuple_nonzero
      I F 1
      R E F
      N E Z J frame_tuple_nonzero
      I F 1
      R E F
      N E Z J frame_tuple_nonzero
      M A 1
      O S P
frame_tuple_nonzero: M A Z O S P
frame_positive:
      R E F
      ifg E Z J frame_ok end
      L E Z J frame_bad
      I F 1
      R E F
      ifg E Z J frame_ok end
      L E Z J frame_bad
      I F 1
      R E F
      ifle E Z J frame_bad end
frame_ok: M A Z O S P
frame_bad: M A -40 O S P
