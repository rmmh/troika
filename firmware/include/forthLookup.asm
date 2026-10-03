; Resident dictionary lookup and shared compiler status. Requires forthVm.
; Kept outside replaceable compiler code so sealed handlers remain callable.
fc_ok: M A Z O S P
fc_syntax: M A -90 J fc_compile_fail
fc_full: M A -91 J fc_compile_fail
fc_control_full: M A -92
fc_compile_fail: W f_ready Z W f_status A O S P

; The most recent completed word wins. A=0 found/1 missing; B=kind,
; C=body/target-cell, D=entry. Never sees a current incomplete definition.
fc_lookup:
      R I f_latest
fc_lookup_loop:
      E I Z J fc_missing
      M K I/2 R L f_token_len
      N K L J fc_lookup_next
      M J I I J 3 C S fc_compare
      N A Z J fc_lookup_next
      M B I/1 M C I I C 3 A C K M D I M A Z O S P
fc_lookup_next: R I I J fc_lookup_loop
fc_missing: M A 1 O S P
; J=name K=length, preserve I/J/K/L. A=0 equal/1 different.
fc_compare:
      M E J M F f_token M G K
fc_compare_loop:
      R H E R A F N H A J fc_missing
      I E 1 I F 1 I G -1 N G Z J fc_compare_loop
      J fc_ok
; Public lookup copies/folds a bounded name without disturbing a running VM.
; Returns the same A/B/C/D as fc_lookup. It does not execute the word.
f_find:
      R E f_active ifn E Z M A -90 O S P end
      R E f_ready ifn E 1 M A -90 O S P end
      ifl B 1 J fc_syntax end
      ifg B 27 J fc_syntax end
      M I A M J f_token M K B W f_token_len B
fc_find_copy:
      R E I ifge E -13 ifle E 13 N E Z S E 27 end end
      W J E I I 1 I J 1 I K -1 N K Z J fc_find_copy
      J fc_lookup

