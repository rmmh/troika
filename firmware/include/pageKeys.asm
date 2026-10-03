; Poll one text-device key. A=1 if empty, 0 if handled, negative on error.
; Never consume while page/UI is unavailable or a deferred action is pending.
; Text cells insert; LF and 88 activate. Controls 81..84,86..92 encode UI
; events by subtracting 80. Cell 85 is reserved; unknown cells return -125.
page_poll:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pu_bad R E pu_ready N E 1 J pu_bad
      R E f_action N E Z J pu_pending
      R E 0s_PA ifn E 4 M A 1 O S P end
      R B 0s_PB
      ife B 27 M A 8 J page_ui end
      ifge B 81
        ifg B 92 J pk_bad end E B 85 J pk_bad
        M A B S A 80 J page_ui
      end
      ifl B -40 J pk_bad end ifg B 57 J pk_bad end
      E B Z J pk_bad E B 54 J pk_bad
      M A 5 J page_ui
pk_bad: M A -125 O S P
