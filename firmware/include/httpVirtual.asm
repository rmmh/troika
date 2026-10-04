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
