; Native interaction helpers for accepted pages. No persistent input buffer.
; page_focus(A=current record or -1,B=direction +/-1) -> A=status,B=next or -1.
; page_edit(A=input record,B=cursor,C=0 insert/1 backspace/2 delete,D=Troika cell)
; -> A=status,B=new cursor. Cursor and input freeze policy belong to controller.
; Edits preserve the fixed 54-cell input reservation and all other records.
page_focus:
      C S pe_ready N A Z O S P
      ifl H -1 J pe_bad end ifge H K J pe_bad end
      ifn B 1 ifn B -1 J pe_bad end end
      M L K
pfocus_loop:
      E L Z J pfocus_none
      A H B ifl H Z M H K I H -1 end ifge H K M H Z end
      M I H P I 18 A I 4739 R E I
      E E 4 J pfocus_found E E 6 J pfocus_found E E 7 J pfocus_found
      I L -1 J pfocus_loop
pfocus_found: M B H J pp_ok
pfocus_none: M B -1 J pp_ok
page_edit:
      U S D C S pe_ready O S D N A Z O S P
      R E f_action N E Z J pe_pending
      ifl H Z J pe_bad end ifge H K J pe_bad end
      M I H P I 18 A I 4739 R E I N E 6 J pe_bad
      M G I/1 M F I/2 M E I/3
      N E 54 J pe_bad ifl G 2552 J pe_bad end ifg G 3956 J pe_bad end
      ifl F Z J pe_bad end ifg F 54 J pe_bad end
      ifl B Z J pe_bad end ifg B F J pe_bad end
      ifl C Z J pe_bad end ifg C 2 J pe_bad end
      ife C Z
        ifl D -40 J pe_bad end ifg D 57 J pe_bad end
        E D Z J pe_bad E D 54 J pe_bad
        E F 54 J pe_full
        M J G A J F M K F S K B
pe_insert:
        E K Z J pe_store
        M E J I E -1 R H E W J H I J -1 I K -1 J pe_insert
pe_store:
        W J D I F 1 I B 1 M I/2 F J pp_ok
      end
      ife C 1 E B Z J pp_ok I B -1 else E B F J pp_ok end
      M J G A J B M K F S K B I K -1
pe_delete:
      E K Z J pe_tail
      M E J I E 1 R H E W J H I J 1 I K -1 J pe_delete
pe_tail:
      W J Z I F -1 M I/2 F J pp_ok
pe_pending: M A -123 O S P
pe_full: M A -122 O S P
pe_bad: M A -121 O S P
; Preserve B/C/D; save requested record in H, validate accepted/idle page.
pe_ready:
      M H A
      R E pp_active N E Z J pp_busy R E f_active N E Z J pp_busy
      R E pp_valid N E 1 J pe_bad
      R K f_records ifl K Z J pe_bad end ifg K 27 J pe_bad end
      J pp_ok
