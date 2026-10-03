; Native mode-T viewport for accepted pages. Requires pageState/Forth/text.
; page_view(A=top logical row 0..1485,B=focused record or -1).
; Returns A=0/error,B=total logical rows. Scroll position is caller-owned.
; F/C records are hidden; L/S show bracketed labels, I shows name = value.
; Three metadata cells use the remaining Forth-state arena; no layout buffer.
$pv_top: 5439
$pv_focus: 5440
$pv_start: 5441
page_view:
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pv_bad
      ifl A Z J pv_bad end ifg A 1485 J pv_bad end
      ifl B -1 J pv_bad end R E f_records ifge B E J pv_bad end
      W pv_top A W pv_focus B
      M I -9841 M K 729
pv_clear: W I Z I I 1 I K -1 N K Z J pv_clear
      W Z 0sDMT W -3659 -9841 W -3658 9841 W -3657 9841 W -3656 -9841
      M G Z M H Z M D Z R E pp_mode
      ife E 1
        M A 2552 R B pp_here S B A C S pv_text N A Z O S P J pv_done
      end
      M I 4739 R K f_records M L Z
pv_record:
      E K Z J pv_done
      R E I E E 5 J pv_next E E 8 J pv_next
      W pv_start G M D Z R F pv_focus E F L M D 729
      ife E 3 C S pv_newline J pv_next end
      ife E 6
        M A I/4 M B I/5 U S I C S pv_text O S I N A Z O S P
        M A 32 U S I C S pv_emit M A 61 C S pv_emit M A 32 C S pv_emit O S I
      end
      R E I
      ife E 4 M A 91 U S I C S pv_emit O S I end
      ife E 7 M A 91 U S I C S pv_emit O S I end
      M A I/1 M B I/2 U S I C S pv_text O S I N A Z O S P
      R E I
      ife E 4 M A 93 U S I C S pv_emit O S I end
      ife E 7 M A 93 U S I C S pv_emit O S I end
      ifn H Z C S pv_newline else R E pv_start E G E C S pv_newline end
pv_next: A I 18 I K -1 I L 1 J pv_record
pv_done:
      M B G ifn H Z I B 1 end E B Z M B 1 M A Z O S P
pv_bad: M A -120 O S P
; Counted Troika text. Preserve outer record K/L and palette D; advance row G and column H.
; text_ascii/pv_emit clobber I/J; callers preserve their record address on S.
pv_text:
      M E A M F B
pv_text_loop:
      E F Z J pp_ok
      R A E C S text_ascii ifl A Z O S P end
      C S pv_emit I E 1 I F -1 J pv_text_loop
; ASCII A to current logical row/column, clipped to the viewport.
pv_emit:
      E A 10 J pv_newline
      M J G R I pv_top S J I
      ifge J Z
        ifl J 27
          P J 27 A J H S J 9841 A A D W J A
        end
      end
      I H 1 E H 27 J pv_newline M A Z O S P
pv_newline: I G 1 M H Z M A Z O S P
