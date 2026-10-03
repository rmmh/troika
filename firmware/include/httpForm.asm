; Native compact-form validation and name lookup. Requires dns_equal.
; parse(A=stable source,B=1..208) returns 0/-134. Source must remain unchanged
; while descriptors are used. Positive RAM spans only; metadata cannot overlap.
; find(A=trusted name,B=length) returns 0,B=value pointer,C=value length, or -135.
; Descriptor table: three [name pointer,name length,value pointer,value length].
$hf_records: 4739
$hf_count: 2500
$hf_pointer: 2501
$hf_left: 2502
$hf_index: 2503
$hf_name: 2504
$hf_length: 2505
$hf_fields: 2506
$hf_record: 2507
http_form_parse:
      W hf_count Z
      ifl B 1 J hf_bad end ifg B 208 J hf_bad end
      ifl A 365 J hf_bad end
      M E 9841 S E B ifg A E J hf_bad end
      M E A A E B
      ifl A 2508 ifg E 2500 J hf_bad end end
      ifl A 4751 ifg E 4739 J hf_bad end end
      W hf_pointer A W hf_left B W hf_index Z
      C S hf_take N A Z O S P
      ifl B Z J hf_bad end ifg B 3 J hf_bad end W hf_fields B
hf_field:
      R E hf_index R F hf_fields E E F J hf_done
      C S hf_take N A Z O S P
      ifl B 1 J hf_bad end ifg B 13 J hf_bad end
      W hf_length B R E hf_pointer W hf_name E M K B
hf_name_loop:
      C S hf_take N A Z O S P
      E B 0s_NY J hf_name_next
      ifge B -13 ifle B 13 E B Z J hf_bad J hf_name_next end end
      ifl B 28 J hf_bad end ifg B 37 J hf_bad end
hf_name_next: I K -1 N K Z J hf_name_loop
      M I hf_records R L hf_index
hf_duplicate:
      E L Z J hf_value
      M E I/1 R F hf_length
      ife E F
        M A I/0 R B hf_name M C F C S dns_equal E A Z J hf_bad
      end
      I I 4 I L -1 J hf_duplicate
hf_value:
      W hf_record I R E hf_name M I/0 E R E hf_length M I/1 E
      C S hf_take N A Z O S P
      ifl B Z J hf_bad end ifg B 54 J hf_bad end
      R I hf_record R E hf_pointer M I/2 E M I/3 B M K B
hf_text_loop:
      E K Z J hf_next_field C S hf_take N A Z O S P
      ifl B -40 J hf_bad end ifg B 57 J hf_bad end E B Z J hf_bad E B 54 J hf_bad
      I K -1 J hf_text_loop
hf_next_field:
      R E hf_index I E 1 W hf_index E J hf_field
hf_done:
      R E hf_left N E Z J hf_bad R E hf_fields W hf_count E J hf_ok
hf_take:
      R E hf_left E E Z J hf_bad I E -1 W hf_left E
      R E hf_pointer R B E I E 1 W hf_pointer E J hf_ok
hf_bad: W hf_count Z M A -134 O S P
hf_ok: M A Z O S P
http_form_find:
      ifl B 1 J hf_missing end ifg B 13 J hf_missing end
      M J A M K B M I hf_records R L hf_count
hf_find_loop:
      E L Z J hf_missing M E I/1
      ife E K
        M A I/0 M B J M C K C S dns_equal
        ife A Z M B I/2 M C I/3 O S P end
      end
      I I 4 I L -1 J hf_find_loop
hf_missing: M A -135 O S P
