; Exact membership for /pNNNN and /cNNNN software paths (indices 0..9840).
; Each immutable bitmap tryte holds nine base-three digits, each 0 or 1.
; A=request path, B=count. Return MIME 1 for a member, 2 otherwise.
; I/K retain the original pointer/count for an optional literal-table fallback.
; All decoding and membership checks execute in the guest; no path is written.
http_software_type:
      M I A M K B N K 6 J hsoft_page
      R E I N E 0s_NI J hsoft_page
      M E I/1
      ife E 0s__P M H @software_p_bits M L software_p_count
      else ife E 0s__C M H @software_c_bits M L software_c_count
      else J hsoft_page end end
      M J I I J 2 M D 4 M G Z
hsoft_digit:
      R E J ifl E 0s_NN J hsoft_page end ifg E 0s_NW J hsoft_page end
      S E 0s_NN
      ; Check before multiplying so a four-digit index cannot wrap a tryte.
      ifg G 984 J hsoft_page end ife G 984 ifg E Z J hsoft_page end end
      P G 10 A G E I J 1 I D -1 N D Z J hsoft_digit
      M A G M B 9 C S hsoft_div
      ifge A L J hsoft_page end A H A R G H E G Z J hsoft_page
      M J @software_places A J C R B J M A G C S hsoft_div
      M B 3 C S hsoft_div E C 1 J hsoft_plain
hsoft_page: M A 2 O S P
hsoft_plain: M A 1 O S P
hsoft_div:
      M C A M E A Q E B M F E P F B S C F
      ifl C Z I E -1 A C B end M A E O S P
software_places: 1 3 9 27 81 243 729 2187 6561
