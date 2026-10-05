; Poll one text-device key. A=1 if empty, 0 if handled, negative on error.
; Never consume while page/UI is unavailable or a deferred action is pending.
; Text cells insert; LF and 88 activate. Up/Down (89/90) move focus,
; like reverse/forward Tab. PageUp/PageDown (94/95) scroll one row.
; Other controls map by subtracting 80. Cell 85 is reserved; unknown=-125.
page_poll:
      M A -1 J pu_validate
pk_read:
      R E pu_ready N E 1 J pu_bad
      R E 0s_PA ifn E 4 M A 1 O S P end
      R B 0s_PB
      E B 27 M B 88
      ifge B 81
        ifg B 95 J pk_bad end E B 85 J pk_bad
        M A B S A 80
        ife A 9 M A 2 else E A 10 M A 1 end
        ifge A 14 I A -5 end
        J page_ui
      end
      ifl B -40 J pk_bad end ifg B 57 J pk_bad end
      E B Z J pk_bad E B 54 J pk_bad
      M A 5 J page_ui
pk_bad: M A -125 O S P
