; Native mode-T viewport for accepted pages. Requires pageState/Forth/text.
; page_view(A=top logical row 0..1485,B=focused record or -1).
; page_view_edit additionally accepts C=edit cursor (0..54), or -1 for none.
; Returns A=0/error,B=total logical rows. Scroll position is caller-owned.
; F/C records are hidden; L/S show bracketed labels, I shows name = value.
; Eight metadata cells use the remaining Forth-state arena; no layout buffer.
$pv_top: 5439
$pv_focus: 5440
$pv_start: 5441
$pv_anchor: 5442
$pv_cursor: 5449
$pv_caret_row: 5450
$pv_caret_col: 5451
$pv_target: 5452
page_view: M C -1
page_view_edit:
      ifl C -1 J pv_bad end ifg C 54 J pv_bad end
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pv_bad
      ifl A Z J pv_bad end ifg A 1485 J pv_bad end
      ifl B -1 J pv_bad end R E f_records ifge B E J pv_bad end
      W pv_top A W pv_focus B W pv_anchor -1
      W pv_cursor C W pv_caret_row -1 W pv_caret_col Z W pv_target -1
      M I -9841 M K 729
pv_clear: W I Z I I 1 I K -1 N K Z J pv_clear
      W Z 0sDMT W -3659 -9841 W -3658 9841 W -3657 9841 W -3656 -9841 W -3655 Z W -3654 -9841
      W -3653 -9841 W -3652 -1943
      M G Z M H Z M D Z R E pp_mode
      ife E 1
        M A 2552 R B pp_here S B A C S pv_text N A Z O S P J pv_done
      end
      M I 4739 R K f_records M L Z
pv_record:
      E K Z J pv_done
      R E I E E 5 J pv_next E E 8 J pv_next
      W pv_start G M D Z R F pv_focus ife F L M D 729 W pv_anchor G end
      ife E 3 C S pv_newline J pv_next end
      ife E 6
        M A I/4 M B I/5 U S I C S pv_text O S I N A Z O S P
        M A 32 U S I C S pv_emit M A 61 C S pv_emit M A 32 C S pv_emit O S I
      end
      R E I
      ife E 4 M A 91 U S I C S pv_emit O S I end
      ife E 7 M A 91 U S I C S pv_emit O S I end
      ife E 6
        ifn D Z
          R F pv_cursor ifge F Z
            M E I/2 ifle F E M E I/1 A E F W pv_target E end
          end
        end
      end
      ife E 9 M B @pv_emit C S pp_graphic_view
      else M A I/1 M B I/2 end
      U S I C S pv_text O S I N A Z O S P
      W pv_target -1 R E I
      ; Reserve a blank after every input, including exact-width and LF endings.
      ife E 6 M A 32 U S I C S pv_emit O S I end
      ife E 4 M A 93 U S I C S pv_emit O S I end
      ife E 7 M A 93 U S I C S pv_emit O S I end
      ifn H Z C S pv_newline else R E pv_start E G E C S pv_newline end
pv_next: A I 18 I K -1 I L 1 J pv_record
pv_done:
      M B G ifn H Z I B 1 end E B Z M B 1 C S pv_caret M A Z O S P
pv_bad: M A -120 O S P
; Counted Troika text. Preserve outer record K/L and palette D; advance row G and column H.
; text_ascii/pv_emit clobber I/J; callers preserve their record address on S.
pv_text:
      M E A M F B
pv_text_loop:
      R J pv_target ife E J W pv_caret_row G W pv_caret_col H end
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

; Paint the caret with palette 2 while preserving its underlying glyph and B.
pv_caret:
      R E pv_caret_row ifl E Z O S P end R F pv_top S E F
      ifl E Z O S P end ifge E 27 O S P end
      P E 27 R F pv_caret_col A E F S E 9841 R F E
      ifge F 729 S F 729 end A F 1458 W E F O S P
