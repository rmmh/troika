; Native Troika-text conversion and counted drawing into mode T's ASCII cells.
; text_write(A=stable source,B=0..1458 count,C=0..729 cell offset,D=palette -13..13).
; Returns A=0 all drawn, 1 screen full, -115 invalid; B=remaining, C=next cell.
; Newlines advance to the next 27-cell row; ordinary text wraps at column 27.
; Invalid cells are not consumed; an earlier prefix may already be displayed.
; Source must not alias the screen. No hidden cursor state or host formatting.
; The application selects DMT, initializes palettes and clears cells separately.
text_write:
      ifl B Z J tx_bad end ifg B 1458 J tx_bad end
      ifl C Z J tx_bad end ifg C 729 J tx_bad end
      ifl D -13 J tx_bad end ifg D 13 J tx_bad end
      E B Z J tx_ok
      ifle A -9113 J tx_bad end
      M G A A G B I G -1 ifl G A J tx_bad end
      M E A P D 729 M F C
tx_column:
      ifge F 27 S F 27 J tx_column end
tx_loop:
      E B Z J tx_ok ifge C 729 M A 1 O S P end
      R A E C S text_ascii ifl A Z O S P end
      I E 1 I B -1
      ife A 10
        A C 27 S C F M F Z
      else
        M G C S G 9841 A A D W G A I C 1 I F 1 E F 27 M F Z
      end
      J tx_loop
tx_ok: M A Z O S P
; A=Troika text cell -> A=ASCII or -115. Preserve B..H and J..L.
text_ascii:
      ifl A -40 J tx_bad end
      ifle A -14
        ife A -27 M A 32 O S P end
        ifl A -27 A A 105 else A A 104 end O S P
      end
      ifle A 13
        E A Z J tx_bad
        ifl A Z A A 110 else A A 109 end O S P
      end
      ifg A 57 J tx_bad end E A 54 J tx_bad
      M I @tx_symbols A I A I I -13 I I -1 R A I O S P
; Encoded text 14..57, including LF and the undefined cell 54 (rejected above).
tx_symbols:
46 44 58 59 33 63 45 43 47 40 41 39 35 10
48 49 50 51 52 53 54 55 56 57 64 95 34
36 37 38 42 60 61 62 91 92 93 94 96 123 0 124 125 126

tx_bad: M A -115 O S P
