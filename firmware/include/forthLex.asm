; Streaming native source lexer and dictionary lookup. Requires forthVm.
; f_feed(A=source,B=count<=216) does not terminate an unfinished token.
; f_record_end inserts the logical LF between C records. f_seal ends the page.
f_feed:
      R E f_active ifn E Z M A -90 O S P end
      R E f_ready N E Z J fc_syntax
      R E f_status ifn E Z M A E O S P end
      ifl B Z J fc_syntax end
      ifg B 216 J fc_syntax end
      E B Z J fc_ok
      M E A A E B I E -1 ifl E A J fc_syntax end
      ifle A 5467 ifge E 4010 J fc_syntax end end
      W f_source A W f_source_left B
fc_feed_loop:
      R E f_source R A E I E 1 W f_source E
      R E f_source_left I E -1 W f_source_left E
      C S fc_char N A Z O S P
      R E f_source_left N E Z J fc_feed_loop
fc_ok: M A Z O S P
f_record_end:
      R E f_active ifn E Z M A -90 O S P end
      R E f_ready N E Z J fc_syntax
      R E f_status ifn E Z M A E O S P end
      M A 27 J fc_char
fc_char:
      ifl A -40 J fc_syntax end
      ifg A 57 J fc_syntax end
      E A Z J fc_syntax
      E A 54 J fc_syntax
      R E f_comment
      ife E 1
        ife A 0s_NK W f_comment Z end
        J fc_ok
      end
      ife E 2
        N A 27 J fc_ok
        W f_comment Z
      end
      E A -27 J fc_flush
      E A 27 J fc_flush
      R E f_token_len
      ife E Z
        ife A 0s_NJ W f_comment 1 J fc_ok end
        ife A 0s_OI W f_comment 2 J fc_ok end
      end
      E A 0s_NK J fc_syntax
      ifge E 27 J fc_syntax end
      ifge A -13 ifle A 13 S A 27 end end
      M F f_token A F E W F A I E 1 W f_token_len E
      J fc_ok
fc_flush:
      R E f_token_len E E Z J fc_ok
      C S fc_token W f_token_len Z O S P
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
; B=builtin code or -1. Syntax codes >=40 cannot be shadowed.
fc_builtin:
      M I @fc_words
fc_builtin_loop:
      R K I E K Z J fc_builtin_missing
      R L f_token_len N K L J fc_builtin_next
      M J I I J 2 C S fc_compare N A Z J fc_builtin_next
      M B I/1 J fc_ok
fc_builtin_next: A I K I I 2 J fc_builtin_loop
fc_builtin_missing: M B -1 J fc_ok

; Parse a decimal-looking token with checked magnitude. B=1 numeric/0 word,
; C=signed value. '+' and '-' alone remain ordinary word names.
fc_decimal:
      M I f_token R K f_token_len R E I M D 1
      ife E 0s_NH M D 1 I I 1 I K -1 end
      ife E 0s_NG M D -1 I I 1 I K -1 end
      E K Z J fc_not_numeric
      R E I ifl E 0s_NN J fc_not_numeric end
      ifg E 0s_NW J fc_not_numeric end
      ; First recognize the whole decimal grammar. Names such as 0= and
      ; 1PLUS remain ordinary words, rather than partially parsed numbers.
      M J I M L K
fc_decimal_recognize:
      R F J ifl F 0s_NN J fc_not_numeric end
      ifg F 0s_NW J fc_not_numeric end
      I J 1 I L -1 N L Z J fc_decimal_recognize
      M C Z
fc_decimal_loop:
      R E I ifl E 0s_NN J fc_syntax end
      ifg E 0s_NW J fc_syntax end
      S E 0s_NN
      ifg C 984 J fc_syntax end
      ife C 984 ifg E 1 J fc_syntax end end
      P C 10 A C E I I 1 I K -1 N K Z J fc_decimal_loop
      P C D M B 1 J fc_ok
fc_not_numeric: M B Z J fc_ok

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

fc_words:
      3 6 "DUP"
      4 7 "DROP"
      4 8 "SWAP"
      4 9 "OVER"
      3 10 "ROT"
      1 11 "+"
      1 12 "-"
      1 13 "*"
      4 14 "/MOD"
      1 15 "="
      1 16 "<"
      1 17 ">"
      2 18 "0="
      6 19 "NEGATE"
      3 20 "ABS"
      1 21 "@"
      1 22 "!"
      6 23 "FIELD@"
      5 24 "TEXT!"
      4 25 "SEND"
      2 26 "GO"
      5 27 "DEPTH"
      1 40 ":"
      1 41 ";"
      2 42 "IF"
      4 43 "ELSE"
      4 44 "THEN"
      5 45 "BEGIN"
      5 46 "UNTIL"
      5 47 "WHILE"
      6 48 "REPEAT"
      7 49 "RECURSE"
      5 50 "DEFER"
      8 51 "VARIABLE"
      1 52 "'"
      2 53 "IS"
      4 54 "EXIT"
      0
