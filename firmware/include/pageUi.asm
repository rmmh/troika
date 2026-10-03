; Native page interaction controller. page_ui(A=event,B=Troika insertion cell).
; Events: 0 initialize, 1 next focus, 2 previous focus, 3 left, 4 right,
; 5 insert, 6 backspace, 7 delete, 8 activate, 9 scroll up, 10 scroll down.
; Accepted page required. No network I/O: successful activation may set the
; deferred Forth action. Further events return -123 until the caller resolves
; and clears that action. Invalid/uninitialized events return -124.
; Six state cells plus viewport anchor are inside the Forth-state allocation.
$pu_top: 5443
$pu_focus: 5444
$pu_cursor: 5445
$pu_ready: 5446
$pu_follow: 5447
$pu_character: 5448
page_ui:
      ifl A Z J pu_bad end ifg A 10 J pu_bad end
      W pu_character B
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pu_bad
      R E f_action N E Z J pu_pending
      ife A Z
        W pu_top Z W pu_focus -1 W pu_cursor Z W pu_ready 1
        J pu_next
      end
      R E pu_ready N E 1 J pu_bad
      W pu_follow 1
      E A 1 J pu_next E A 2 J pu_previous
      ifge A 9
        W pu_follow Z R E pu_top
        ife A 9 ifg E Z I E -1 end else I E 1 end
        W pu_top E J pu_render
      end
      R E pu_focus ifl E Z J pp_ok end
      M I E P I 18 A I 4739 R E I
      E A 8 J pu_activate
      N E 6 J pp_ok
      R B pu_cursor M F I/2
      ife A 3 ifg B Z I B -1 end J pu_cursor_done end
      ife A 4 ifl B F I B 1 end J pu_cursor_done end
      M C A S C 5
      J pu_edit
pu_next: M B 1 J pu_focus_change
pu_previous: M B -1
pu_focus_change:
      R A pu_focus C S page_focus N A Z O S P
      W pu_focus B W pu_cursor Z W pu_follow 1
      ifge B Z
        M I B P I 18 A I 4739 R E I
        ife E 6 M E I/2 W pu_cursor E end
      end
      J pu_render
pu_cursor_done: W pu_cursor B J pu_render
pu_edit:
      R A pu_focus R D pu_character C S page_edit N A Z O S P
      J pu_cursor_done
pu_activate:
      ife E 4
        M A I/4 M B I/5 C S url_parse N A Z O S P
        W f_action 2 W f_action_ptr 5954 W f_action_len B J pp_ok
      end
      ifn E 6 ifn E 7 J pp_ok end end
      C S pi_submit N A Z O S P J pu_render
pu_render:
      R A pu_top R B pu_focus R C pu_cursor C S page_view_edit N A Z O S P
      M K B S K 27 ifl K Z M K Z end
      R E pu_top R F pu_follow
      ifn F Z
        R F pv_caret_row ifl F Z R F pv_anchor end ifge F Z
          ifl F E M E F else M G E A G 27 ifge F G M E F end end
        end
      end
      ifg E K M E K end
      R F pu_top ife E F J pp_ok end
      W pu_top E M A E R B pu_focus R C pu_cursor J page_view_edit
pu_pending: M A -123 O S P
pu_bad: M A -124 O S P
