; Small native dialogue engine. Ada uses ELIZA-style prefix rules; Lin and Sam
; have game/workshop prompts. Only messages from "you" trigger replies, so bots
; cannot form an unbounded feedback loop. Native timed chatter stops after
; three unsolicited messages until a human speaks; retries do not consume turns.
$cb_due: 5225
$cb_turn: 5228
$cb_idle_count: 5229
$cb_pending: 5253
$cb_length: 5254
$cb_source: 5257
$cb_left: 5258
$cb_text: 2700
chat_bot_input:
      R E cc_persona E E Z O S P R I net_input N I/32 3 O S P
      M A I A A 33 M B @cb_you M C 3 C S dns_equal N A Z O S P
      W cb_idle_count Z R E cb_turn ife E Z W cb_turn 1 end
      R I net_input M E I/45 W cb_left E M E I A E 46 W cb_source E
      R E cc_persona E E 2 J cb_game_reply E E 3 J cb_work_reply
      ; Normalize a bounded copy for matching; preserve the original remainder.
      M A 2800 R B cb_source R C cb_left C S net_copy
      M I 2800 R K cb_left
cb_lower:
      R E I ifge E -40 ifle E -14 ifn E -27 A E 27 W I E end end end
      I I 1 I K -1 N K Z J cb_lower
      R E cb_left ifg E 7
        M A 2800 M B @cb_feel M C 7 C S dns_equal
        ife A Z M B @cb_why M C 16 M D 7 J cb_reflect end
      end
      R E cb_left ifg E 5
        M A 2800 M B @cb_am M C 5 C S dns_equal
        ife A Z M B @cb_how_long M C 23 M D 5 J cb_reflect end
      end
      R E cb_left ifg E 7
        M A 2800 M B @cb_want M C 7 C S dns_equal
        ife A Z M B @cb_why_want M C 16 M D 7 J cb_reflect end
      end
      M B @cb_more M C 24 J cb_literal
cb_reflect:
      U S D M A cb_text C S net_copy O S D
      R B cb_source A B D R C cb_left S C D
      M E cb_text A E 53 S E A ifg C E M C E end
      C S net_copy W A 0s_NF I A 1 S A cb_text W cb_length A J cb_queued
cb_game_reply: M B @cb_game_answer M C 48 J cb_literal
cb_work_reply: M B @cb_work_answer M C 27
cb_literal:
      W cb_length C M A cb_text C S net_copy
cb_queued:
      W cb_pending 1 C S net_now M A net_tick M B 27 M C cb_due C S net_add_ticks O S P
chat_bot_service:
      R E cc_persona E E Z O S P R E cc_joined E E Z O S P
      R E cc_pending N E Z O S P
      C S net_now M A net_tick M B cb_due C S wide_compare E A -1 O S P
      R E cb_pending
      ife E Z
        R E cb_idle_count ifge E 3 O S P end
        R E cc_persona I E -1 P E 8 M I @cb_idle_tables A I E
        R E cb_turn P E 2 A I E R B I M C I/1
        ; Advance once when queuing a new SAY, never on a transport retry.
        R E cb_turn I E 1 ife E 4 M E 1 end W cb_turn E
        R E cb_idle_count I E 1 W cb_idle_count E
        C S cb_literal
      end
      M A 2 R B cc_room M C cb_text R D cb_length C S cc_start
      W cb_pending Z
      C S net_now M A net_tick M B 729 M C cb_due C S net_add_ticks O S P
cb_you: "you"
cb_feel: "i feel "
cb_am: "i am "
cb_want: "i want "
cb_why: "Why do you feel "
cb_how_long: "How long have you been "
cb_why_want: "Why do you want "
cb_more: "Tell me more about that."
cb_game_answer: "Try the take-away game. What is your first move?"
cb_work_answer: "What have you tried so far?"
cb_greeting: "Hello. How are you feeling today?"
cb_idle: "What is on your mind today?"
cb_game_greeting: "Anyone up for a game of take-away?"
cb_game_idle_text: "I think taking two is a good opening."
cb_work_greeting: "What are you building today?"
cb_work_idle_text: "I am testing packets on my own NIC."

cb_idle_thought: "Has anything surprised you today?"
cb_idle_story: "We can start with a small story."
cb_game_thought: "A short game can have a clever ending."
cb_game_story: "Which rules would you change?"
cb_work_thought: "Small experiments make good workshop notes."
cb_work_story: "What would you build from three spare parts?"

; Four (pointer,length) pairs per persona: greeting, then three prompts.
cb_idle_tables:
      @cb_greeting 33 @cb_idle 27 @cb_idle_thought 33 @cb_idle_story 32
      @cb_game_greeting 34 @cb_game_idle_text 37 @cb_game_thought 38 @cb_game_story 29
      @cb_work_greeting 28 @cb_work_idle_text 35 @cb_work_thought 43 @cb_work_story 44
