; Hostname grammar shared by native DNS clients and servers.
; A=source, B=count, C=destination (may equal source).
; dns_normalize folds uppercase and removes one trailing dot (input <=55).
; dns_name requires an already canonical name (input <=54).
; A=0/-50, B=canonical length on success. Clobbers D..L.
dns_normalize:
      M L 1
      ifg B 55 J dns_bad_name end
      J dns_name_start
dns_name:
      M L Z
      ifg B 54 J dns_bad_name end
dns_name_start:
      ifl B 1 J dns_bad_name end
      M I A
      M J C
      ifn L Z
        M E A
        A E B
        I E -1
        R F E
        ife F 0s_NA I B -1 end
      end
      ifl B 1 J dns_bad_name end
      ifg B 54 J dns_bad_name end
      M K B
      M D Z
      M H Z
dns_name_loop:
      R E I
      ifn L Z
        ifge E 0s_MA
          ifle E 0s_MZ
            E E 0s_M_ J dns_bad_name
            A E 27
          end
        end
      end
      E E 0s_NA J dns_name_dot
      E E 0s_NG J dns_name_hyphen
      ifge E 0s__A
        ifle E 0s__Z
          E E Z J dns_bad_name
          J dns_name_letter
        end
      end
      ifl E 0s_NN J dns_bad_name end
      ifg E 0s_NW J dns_bad_name end
dns_name_letter:
      M H Z
      I D 1
      J dns_name_store
dns_name_hyphen:
      E D Z J dns_bad_name
      M H 1
      I D 1
      J dns_name_store
dns_name_dot:
      E D Z J dns_bad_name
      N H Z J dns_bad_name
      M D Z
      M H Z
dns_name_store:
      W J E
      I I 1
      I J 1
      I K -1
      N K Z J dns_name_loop
      E D Z J dns_bad_name
      N H Z J dns_bad_name
      M A Z
      O S P
dns_bad_name: M A -50 O S P
; Compare bounded strings: A/B pointers, C=count; A=0 equal, 1 different.
; Preserves I/K/L for table scans.
dns_equal:
      E C Z J dns_equal_yes
dns_equal_loop:
      R E A
      R F B
      ifn E F M A 1 O S P end
      I A 1
      I B 1
      I C -1
      N C Z J dns_equal_loop
dns_equal_yes: M A Z O S P
