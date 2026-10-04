; Native CHAT/1 client. All protocol decisions, retries, commands and history
; live on this CPU. Host input is ordinary TextDevice keystrokes only.
$cc_sequence: 2508
$cc_cursor: 2509
$cc_room: 2510
$cc_joined: 2511
$cc_pending: 2512
$cc_attempts: 2513
$cc_status: 2514
$cc_next: 2515
$cc_due: 2518
$cc_requested: 2521
$cc_input_len: 2522
$cc_saved_op: 2523
$cc_nick_len: 2524
$cc_host: 2525
$cc_persona: 2526
$cc_log_head: 5250
$cc_log_count: 5251
$cc_ready: 5252
$cc_nick: 2552
$cc_line: 2564
$cc_q_head: 5259
$cc_q_tail: 5260
$cc_q_count: 5261
chat_client_init:
      W cc_sequence 1 W cc_log_head 7007 W cc_ready 1 W cc_q_head 3000 W cc_q_tail 3000
      M A 1 R B cc_room M C Z M D Z J cc_start
; A=command, B=room, C=text pointer, D=text length. No outstanding request.
cc_start:
      W cc_pending A W cc_requested B W cc_attempts Z
      U S A U S B U S C U S D M A 1580 M C 243 C S net_zero O S D O S C O S B O S A
      W 1580 1 W 1581 2 W 1587 80 W 1588 1 W 1589 3 R E cc_host W 1590 E
      W 1591 1 W 1592 3 W 1593 8 W 1594 27 A E 1000 W 1595 E W 1596 194
      R E cc_sequence W 1599 E W 1606 73 W 1607 1 W 1608 A W 1609 E
      R E cc_cursor W 1610 E W 1611 B R E cc_nick_len W 1612 E W 1625 D
      U S C U S D M A 1613 M B cc_nick M C E C S net_copy O S C O S B
      ifn C Z M A 1626 C S net_copy end
      C S net_now M A cc_due M B net_tick M C 3 C S net_copy O S P
chat_client_service:
      C S net_now R E cc_pending
      ife E Z
        R E cc_joined E E Z O S P
        M A net_tick M B cc_next C S wide_compare E A -1 O S P
        M A 3 R B cc_room M C Z M D Z C S cc_start
      end
      M A net_tick M B cc_due C S wide_compare E A -1 O S P
      R E cc_attempts ifge E 12 W cc_status -8 O S P end
      M A 1580 M B 95 C S net_send N A Z O S P
      R E cc_attempts I E 1 W cc_attempts E
      R B cc_host P B 3 A B 81 M A net_tick M C cc_due C S net_add_ticks O S P
chat_client_input:
      R E cc_pending E E Z O S P
      R I net_input N I/1 2 O S P N I/15 194 O S P N I/26 73 O S P
      N I/8 1 O S P N I/9 3 O S P N I/10 8 O S P
      N I/11 1 O S P N I/12 3 O S P
      R E cc_host N I/13 E O S P A E 1000 N I/16 E O S P
      N I/27 1 O S P R E cc_sequence N I/29 E O S P
      R E cc_pending W cc_saved_op E W cc_pending Z
      R E cc_sequence I E 1 E E -9841 M E 1 W cc_sequence E
      M E I/28 W cc_status E
      ifn E Z J cc_next_poll end
      R E cc_saved_op
      ife E 1 R E cc_requested W cc_room E W cc_cursor Z W cc_joined 1 W cc_log_head 7007 W cc_log_count Z end
      R E cc_saved_op E E 4 W cc_joined Z
      W cc_status 2 R E cc_joined N E Z W cc_status 1
      R I net_input M E I/30 R F cc_cursor ifle E F J cc_next_poll end
      M E I/31 R F cc_room N E F J cc_next_poll
      M E I/32 ifl E 1 J cc_next_poll end ifg E 12 J cc_next_poll end
      M E I/45 ifl E 1 J cc_next_poll end ifg E 54 J cc_next_poll end
      M E I/30 W cc_cursor E
      R A cc_log_head M B I A B 30 M C 70 C S net_copy
      R E cc_log_head A E 81 E E 9194 M E 7007 W cc_log_head E
      R E cc_log_count ifl E 27 I E 1 W cc_log_count E end
      C S chat_bot_input
cc_next_poll:
      C S net_now M A net_tick R B cc_host A B 27 M C cc_next C S net_add_ticks O S P
; Native terminal commands: /join 1..3, /say text, /quit, /retry.
; A bounded native FIFO retains commands while a request is outstanding.
chat_client_keys:
cc_key_next:
      R E 68 N E 4 O S P R E 69
      E E 88 J cc_command
      ife E 86 R F cc_input_len ifg F Z I F -1 W cc_input_len F end J cc_key_next end
      ifl E -40 J cc_key_next end ifg E 57 J cc_key_next end E E Z J cc_key_next
      R F cc_input_len ifge F 81 J cc_key_next end
      M I cc_line A I F W I E I F 1 W cc_input_len F J cc_key_next
cc_command:
      R E cc_input_len W 5256 E W cc_input_len Z
      ife E 6
        M A cc_line M B @cc_retry M C 6 C S dns_equal
        ife A Z R E cc_pending E E Z O S P W cc_attempts Z W cc_due Z W 2519 Z W 2520 Z W cc_status Z O S P end
      end
cc_parse:
      ; cc_command saves its length here before any comparator can clobber it.
      R E 5256
      ife E 7
        M A cc_line M B @cc_join M C 6 C S dns_equal
        ife A Z R B 2570 S B 28 ifl B 1 J cc_bad_command end ifg B 3 J cc_bad_command end
          M A 1 M C Z M D Z J cc_enqueue end
      end
      R E 5256
      ife E 5 M A cc_line M B @cc_quit M C 5 C S dns_equal
        ife A Z M A 4 M B Z M C Z M D Z J cc_enqueue end end
      R E 5256 ifl E 6 J cc_bad_command end ifg E 59 J cc_bad_command end
      M A cc_line M B @cc_say M C 5 C S dns_equal N A Z J cc_bad_command
      M A 2 M B Z M C 2569 R D 5256 I D -5 J cc_enqueue
cc_bad_command: W cc_status -9 O S P
; 27 records of [op, room (0=current at dispatch), length, text[54]].
cc_enqueue:
      R E cc_q_count ifge E 27 W cc_status -10 O S P end
      R I cc_q_tail M I/0 A M I/1 B M I/2 D
      ifn D Z M A I I A 3 M B C M C D C S net_copy end
      R E cc_q_tail A E 57 E E 4539 M E 3000 W cc_q_tail E
      R E cc_q_count I E 1 W cc_q_count E O S P
chat_client_queue:
      R E cc_pending N E Z O S P R E cc_q_count E E Z O S P
      R I cc_q_head M A I/0 M B I/1 E B Z R B cc_room
      M C I I C 3 M D I/2 C S cc_start
      R E cc_q_head A E 57 E E 4539 M E 3000 W cc_q_head E
      R E cc_q_count I E -1 W cc_q_count E O S P
cc_join: "/join "
cc_say: "/say "
cc_quit: "/quit"
cc_retry: "/retry"
