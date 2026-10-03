; Deliberate guest-only template flaw/fix fixture. Source remains confined to
; the browser's bounded Forth VM. Never used by normal forums or uploads.
; Optional noticeboard dispatcher result -138 means route not handled.
$xp_source: 2526
$xp_length: 2527
$xp_unsafe: 2528
xss_preview_post:
      W xp_unsafe Z R E h_path_len
      ife E 12 M A h_path M B @xp_bad_route M C 12 C S dns_equal ife A Z W xp_unsafe 1 J xp_input end end
      ife E 10 M A h_path M B @xp_safe_route M C 10 C S dns_equal E A Z J xp_input end
      M A -138 O S P
xp_input:
      R E hf_count N E 1 J nb_bad M A @xp_field M B 3 C S http_form_find N A Z J nb_bad
      W xp_source B W xp_length C
      M I 2552 R E xp_unsafe
      ifn E Z M B @xp_bad_head M C 117 W nb_target @xp_bad_file W nb_target_len 15
      else M B @xp_safe_head M C 116 W nb_target @xp_safe_file W nb_target_len 13 end
      C S xp_copy C S xp_value M B @xp_tail M C 37 C S xp_copy
      R E xp_unsafe ifn E Z M B @xp_code else M B @xp_text end M C 5 C S xp_copy
      C S xp_value W I 27 I I 1 S I 2552 W nb_total I J nb_replace
xp_value:
      M J I M K 54
xp_pad: W J -27 I J 1 I K -1 N K Z J xp_pad
      U S I M A I R B xp_source R C xp_length C S net_copy O S I A I 54 O S P
xp_copy: M A I C S net_copy M I A O S P
xp_field: "src"
xp_bad_route: "/app/xunsafe"
xp_safe_route: "/app/xsafe"
xp_bad_file: "/public/xunsafe"
xp_safe_file: "/public/xsafe"
xp_code: "C 54:"
xp_text: "T 54:"
xp_bad_head: "PAGE 1\nH 15:Unsafe template\nT 54:unchanged                                             \nF 12:/app/xunsafe\nI 3:src 54:"
xp_safe_head: "PAGE 1\nH 16:Literal template\nT 54:unchanged                                             \nF 10:/app/xsafe\nI 3:src 54:"
xp_tail: "\nS 7:Preview\nL 9:Lab index 7:/xsslab\n"
