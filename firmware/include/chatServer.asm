; CHAT/1 datagrams: nine independent sessions, cached idempotent replies.
; Client records 2552..2794 (27 each), reply cache 2800..3699 (100 each),
; transient reply 3800..3899, history 7007..9193 (27 x 81).
; No browser arenas or filesystem handles are live on this dedicated CPU.
$chat_pending: 5250
$chat_slot: 5251
$chat_cache: 5252
$chat_free: 5253
$chat_count: 5254
$chat_head: 5255
$chat_event: 5256
$chat_status: 5257
$chat_scan: 5258
$chat_best: 5259
$chat_ready: 5260
chat_init:
      W chat_head 7007 W chat_ready 1 O S P
chat_service:
      R E chat_pending E E Z O S P
      M A 1823 M C 243 C S net_zero
      M A 1823 R B chat_pending M C 100 C S net_copy
      M A 1823 M B 95 C S net_send
      N A -1 W chat_pending Z
      O S P
chat_input:
      R I net_input
      N I/1 2 O S P N I/16 194 O S P N I/26 73 O S P
      N I/11 1 O S P N I/12 3 O S P N I/13 8 O S P
      N I/27 1 O S P
      M E I/28 ifl E 1 O S P end ifg E 4 O S P end
      M E I/29 ifl E 1 O S P end
      M E I/30 ifl E Z O S P end
      M E I/31 ifl E 1 O S P end ifg E 3 O S P end
      M E I/32 ifl E 1 O S P end ifg E 12 O S P end
      M E I/45 ifl E Z O S P end ifg E 54 O S P end
      C S net_now
      W chat_slot 2552 W chat_cache 2800 W chat_free Z W chat_count 9
chat_find:
      R I chat_slot
      R E I
      ifn E Z
        M A net_tick M B I A B 20 C S wide_compare
        R I chat_slot ifge A Z W I Z end
      end
      R E I
      ife E Z
        R E chat_free E E Z W chat_free I
      else
        M A I I A 1 R B net_input I B 8 C S wide_compare
        ife A Z
          R I chat_slot R J net_input M E I/4
          E E J/15 J chat_found
        end
      end
      R E chat_slot A E 27 W chat_slot E
      R E chat_cache A E 100 W chat_cache E
      R E chat_count I E -1 W chat_count E N E Z J chat_find
      R J net_input
      N J/28 1 J chat_not_joined
      R I chat_free E I Z J chat_full
      W chat_slot I
      ; Cache address corresponds to record index (exact division).
      M E I S E 2552 Q E 27 P E 100 A E 2800 W chat_cache E
      M A I M C 27 C S net_zero R I chat_slot
      M I/0 1 M A I I A 1 R B net_input I B 8 M C 3 C S net_copy
      R I chat_slot R J net_input M E J/15 M I/4 E
      ; A fresh session accepts any positive initial sequence.
      J chat_execute
chat_found:
      M E I/5
      E E J/29 J chat_replay
      I E 1 E E -9841 M E 1
      N E J/29 J chat_bad_sequence
chat_execute:
      W chat_status Z W chat_best Z
      R I chat_slot R J net_input
      E J/28 1 J chat_join
      N I/0 1 J chat_membership_error
      M E I/19 N E J/31 J chat_membership_error
      E J/28 2 J chat_say
      E J/28 3 J chat_poll
      ; Leave retains sequence/reply until a new JOIN, making QUIT retry-safe.
      M I/0 2 J chat_reply
chat_join:
      ; Nicknames are unique among active clients. Validate canonical ASCII cells.
      M K J A K 33 M L J/32
chat_nick_chars:
      R E K
      ifl E -40 J chat_invalid end
      E E -27 J chat_invalid E E Z J chat_invalid
      ifg E 13
        ifl E 28 J chat_invalid end
        ifg E 37 N E 53 J chat_invalid end
      end
      I K 1 I L -1 N L Z J chat_nick_chars
      W chat_scan 2552 W chat_count 9
chat_nick_scan:
      R I chat_scan R E chat_slot
      ifn I E
        M A net_tick M B I A B 20 C S wide_compare
        R I chat_scan ifge A Z W I Z end
        R E I ife E 1
          R J net_input M E I/6 M F J/32
          ife E F
            M K I I K 7 M L J A L 33 M C E
chat_nick_compare:
            R E K R F L N E F J chat_nick_next
            I K 1 I L 1 I C -1 N C Z J chat_nick_compare
            W chat_status -7 J chat_reply
          end
        end
      end
chat_nick_next:
      R E chat_scan A E 27 W chat_scan E
      R E chat_count I E -1 W chat_count E N E Z J chat_nick_scan
      R I chat_slot R J net_input
      M A I I A 6 M B J A B 32 M C 13 C S net_copy
      R I chat_slot R J net_input M E J/31 M I/19 E M I/0 1
      J chat_reply
chat_say:
      M E J/45 E E Z J chat_invalid
      R E chat_event E E 9841 J chat_exhausted
      I E 1 W chat_event E
      R K chat_head M K/0 E M E J/31 M K/1 E
      M A K I A 2 M B I I B 6 M C 13 C S net_copy
      R K chat_head M A K A A 15 R B net_input A B 45 M C 55 C S net_copy
      R E chat_head A E 81 E E 9194 M E 7007 W chat_head E
      J chat_reply
chat_poll:
      ; Find the earliest retained event in this room after the cursor.
      W chat_scan 7007 W chat_count 27
chat_history:
      R K chat_scan R J net_input
      M E K/0 M G J/30 ifg E G
        M F K/1 M G J/31 ife F G
          R F chat_best
          ife F Z W chat_best K else R F F ifl E F W chat_best K end end
        end
      end
      R E chat_scan A E 81 W chat_scan E
      R E chat_count I E -1 W chat_count E N E Z J chat_history
      J chat_reply
chat_membership_error: W chat_status -3 J chat_reply
chat_invalid: W chat_status -1 J chat_reply
chat_exhausted: W chat_status -6 J chat_reply
chat_bad_sequence: W chat_status -4 J chat_uncached
chat_full: W chat_status -2 J chat_uncached
chat_not_joined: W chat_status -3 J chat_uncached
chat_uncached:
      W chat_slot Z W chat_cache 3800 W chat_best Z
chat_reply:
      C S net_reverse
      M A 1850 M C 216 C S net_zero
      W 1849 73 W 1850 1 R E chat_status W 1851 E
      R J net_input M E J/29 W 1852 E
      M E J/31 W 1854 E
      R K chat_best
      ifn K Z
        M A 1853 M B K M C 70 C S net_copy
      end
      R I chat_slot
      ifn I Z R J net_input M E J/29 M I/5 E end
      R A chat_cache M B 1823 M C 100 C S net_copy
chat_replay:
      R I chat_slot
      ifn I Z
        M A net_tick M B 9841 M C I A C 20 C S net_add_ticks
      end
      R E chat_cache W chat_pending E O S P
