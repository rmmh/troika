; Static virtual hosts. The firmware table consists of length, canonical name,
; and a three-cell directory name per entry. Host parsing/normalization runs in
; url_parse first. h_host_match retains the matched directory pointer inside
; the HTTP context, so subsequent clients may safely reuse pending URL RAM.
http_virtual_host:
      R E url_kind N E Z J http_ok
      R E url_port N E 80 J http_ok
      M I @virtual_hosts M K virtual_host_count
http_virtual_next:
      R L I I I 1 R E url_host_len
      ife E L
        M A url_host M B I M C L C S dns_equal
        ife A Z A I L W h_host_match I J http_ok end
      end
      A I L I I 3 I K -1 N K Z J http_virtual_next J http_ok

; Return A/B = confined absolute path/count for fs_lookup. The request parser
; has already checked the narrow URL grammar. No user text selects a root.
http_virtual_path:
      M A 5711 M B @virtual_public M C 8 C S net_copy
      M A 5719 R B h_host_match M C 3 C S net_copy
      R E h_path_len
      ife E 1 M A 5722 M B @hs_index M C 6 C S net_copy M B 17
      else M A 5722 M B h_path M C E C S net_copy R B h_path_len A B 11 end
      M A 5711 O S P
virtual_public: "/public/"

; Published software URLs stay flat. A crowded site's disk uses 27-program
; buckets (81 PRG/source/page files). Only exact /[pcs]dddd names may fall back;
; roots always come from the matched host, never from request text. Flat files
; retain precedence. Internal paths use scratch 5711..5736, below the URL arena.
http_virtual_lookup:
      C S http_virtual_path C S fs_lookup E A Z O S P
      N A -12 O S P
      R E h_path_len N E 6 O S P
      M I h_path M E I/1
      E E 0s__P J virtual_software_digits
      E E 0s__C J virtual_software_digits
      N E 0s__S O S P
virtual_software_digits:
      M J h_path A J 2 M D 4 M G Z
virtual_software_digit:
      R E J ifl E 0s_NN J virtual_software_missing end ifg E 0s_NW J virtual_software_missing end
      S E 0s_NN
      ifg G 984 J virtual_software_missing end
      ife G 984 ifg E Z J virtual_software_missing end end
      P G 10 A G E I J 1 I D -1 N D Z J virtual_software_digit
      ; floor(index/27), then split the bucket into two base-27 digits.
      M E G Q E 27 M F E P F 27 ifg F G I E -1 end
      M G E M H E Q H 27 M F H P F 27 ifg F G I H -1 S F 27 end
      S G F
      M I @virtual_bucket_digits A I H R H I
      M I @virtual_bucket_digits A I G R G I
      U S G U S H
      C S http_virtual_path
      M A 5722 M B @virtual_apps M C 6 C S net_copy
      O S H O S G W 5728 H W 5729 0s_NI W 5730 G W 5731 0s_NI
      M A 5732 M B h_path I B 1 M C 5 C S net_copy
      M A 5711 M B 26 J fs_lookup
virtual_software_missing: M A -12 O S P
virtual_apps: "/apps/"
virtual_bucket_digits: "abcdefghijklmnopqrstuvwxyz_"
