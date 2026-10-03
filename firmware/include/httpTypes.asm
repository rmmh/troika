; Trusted page-route allowlist. A=request path, B=count, C=table.
; Each table entry is a positive count followed by exact text, ending in 0.
; Return MIME 2 for a match, 1 otherwise. No content sniffing or path writes.
; Tables are native immutable literals, not supplied by a request or a file.
http_page_type:
      M I A M K B M L C
hpt_next:
      R E L E E Z J hpt_plain I L 1
      ife E K
        M A I M B L M C K C S dns_equal E A Z J hpt_page
      end
      M J L I J -1 R E J A L E J hpt_next
hpt_plain: M A 1 O S P
hpt_page: M A 2 O S P
