; Native world-only HTTP URL normalization. Requires dns.asm.
; Input A=counted URL/path, B=1..108. Returns A=0/-100, B=canonical length.
; Canonical output at 5954; parsing uses existing scratch 5711..5818.
; Current origin changes only through explicit url_commit after page acceptance.
$url_text: 5954
$url_current_host: 6062
$url_current_kind: 6116
$url_current_len: 6117
$url_current_port: 6118
$url_current_address: 6119
$url_current_valid: 6122
$url_host: 6123
$url_kind: 6177
$url_host_len: 6178
$url_port: 6179
$url_address: 6180
$url_path: 6183
$url_path_len: 6184
$url_valid: 6185
$url_input: 6186
$url_length: 6187
$url_scan: 6188
$url_left: 6189
$url_host_start: 6190
$url_host_count: 6191
$url_port_digits: 6192
$url_path_start: 6193
$url_path_count: 6194
$url_write: 6195

f_validate_navigation:
url_parse:
      ifl B 1 J url_bad end
      ifg B 108 J url_bad end
      M E A A E B I E -1 ifl E A J url_bad end
      M C B M B A M A 5711 C S url_copy
      W url_valid Z W url_input 5711 W url_length C
      W url_scan 5711 W url_left C W url_kind Z W url_port 80
      W url_address Z W 6181 Z W 6182 Z
      M E url_host M F 54
url_clear_host: W E Z I E 1 I F -1 N F Z J url_clear_host
      R E 5711 E E 0s_NI J url_relative
      ifl C 9 J url_bad end
      M I 5711 M J @url_scheme M K 7
url_scheme_loop:
      R E I
      ifge E -40 ifle E -14 E E -27 J url_bad A E 27 end end
      R F J N E F J url_bad
      I I 1 I J 1 I K -1 N K Z J url_scheme_loop
      W url_scan I R E url_left I E -7 W url_left E
      W url_host_start I W url_host_count Z
      R E I E E 0s_OH J url_numeric
url_dns_scan:
      R I url_scan R K url_left E K Z J url_bad
      R E I E E 0s_NC J url_dns_done
      E E 0s_NI J url_dns_done
      R F url_host_count I F 1 ifg F 55 J url_bad end
      W url_host_count F I I 1 I K -1 W url_scan I W url_left K J url_dns_scan
url_dns_done:
      R A url_host_start R B url_host_count M C url_host C S dns_normalize
      N A Z J url_bad W url_host_len B J url_after_host
url_numeric:
      W url_kind 1 W url_host_len 13
      R K url_left ifl K 14 J url_bad end
      R B url_host_start M A url_host M C 13 C S url_copy
      R I url_scan I I 1 M J url_address M K 3
url_numeric_group:
      M A Z M L 3
url_numeric_digit:
      R E I
      ife E 0s_NY M E Z else
        ifl E -40 J url_bad end
        ifg E -14 J url_bad end
        E E -27 J url_bad A E 27
      end
      P A 27 A A E I I 1 I L -1 N L Z J url_numeric_digit
      W J A I J 1 I K -1
      ifn K Z R E I N E 0s_NA J url_bad I I 1 J url_numeric_group end
      R E I N E 0s_OJ J url_bad I I 1 W url_scan I
      R E url_left I E -13 W url_left E
url_after_host:
      R I url_scan R K url_left E K Z J url_bad
      R E I E E 0s_NI J url_got_path
      N E 0s_NC J url_bad I I 1 I K -1 M D Z M L Z
url_port_loop:
      E K Z J url_bad R E I
      E E 0s_NI J url_port_done
      ifl E 0s_NN J url_bad end
      ifg E 0s_NW J url_bad end
      S E 0s_NN ifg D 984 J url_bad end
      ife D 984 ifg E 1 J url_bad end end
      P D 10 A D E I L 1 I I 1 I K -1 J url_port_loop
url_port_done:
      E L Z J url_bad E D Z J url_bad
      W url_port D W url_scan I W url_left K J url_got_path
url_relative:
      R E url_current_valid N E 1 J url_bad
      M A url_host M B url_current_host M C 60 C S url_copy
      ; The contiguous origin fields are host[54], kind, length, port, address[3].
url_got_path:
      R A url_scan R B url_left W url_path_start A W url_path_count B
      C S url_check_path N A Z O S P
      W url_write url_text
      M A url_text M B @url_scheme M C 7 C S url_copy
      W url_write 5961
      R A url_write M B url_host R C url_host_len C S url_copy
      A A C W url_write A
      R D url_port E D 80 J url_emit_path
      R E url_write W E 0s_NC I E 1
      M F 1
      ifge D 10 M F 10 end
      ifge D 100 M F 100 end
      ifge D 1000 M F 1000 end
url_port_emit:
      M G D Q G F ifg G 9 I G -1 end M H G P H F
      ifg H D I G -1 S H F end
      S D H A G 0s_NN W E G I E 1
      ifn F 1 Q F 10 J url_port_emit end
      W url_write E
url_emit_path:
      R A url_write W url_path A R B url_path_start R C url_path_count
      W url_path_len C C S url_copy A A C S A url_text
      W url_length A M B A W url_valid 1 M A Z O S P
url_bad: W url_valid Z M A -100 O S P

; A=counted path B=length. C=1 '/app/name', C=0 other accepted path.
url_check_path:
      ifl B 1 J url_bad end
      ifg B 18 J url_bad end
      M I A M K B M C Z R E I N E 0s_NI J url_bad
      E K 1 J url_ok
      ifge K 5
        M E I/1 M F I/2 M G I/3 M H I/4
        ife E 0s__A
          ife F 0s__P
            ife G 0s__P
              ife H 0s_NI I I 4 I K -4 M C 1 end
            end
          end
        end
      end
      I I 1 I K -1 ifl K 1 J url_bad end
      ifg K 13 J url_bad end
      ifle K 2
        R E I
        ife E 0s_NA
          E K 1 J url_bad M E I/1 E E 0s_NA J url_bad
        end
      end
url_name_loop:
      R E I
      E E 0s_NA J url_name_next
      E E 0s_NG J url_name_next
      E E 0s_NY J url_name_next
      ifge E -13 ifle E 13 E E Z J url_bad J url_name_next end end
      ifl E 0s_NN J url_bad end
      ifg E 0s_NW J url_bad end
url_name_next: I I 1 I K -1 N K Z J url_name_loop
url_ok: M A Z O S P

url_form:
      U S A U S B C S url_check_path O S B O S D
      N A Z O S P N C 1 J url_bad M A D J url_parse
url_same_origin:
      R E url_valid N E 1 J url_bad
      R E url_current_valid N E 1 J url_bad
      M I url_host M J url_current_host M K 60
url_origin_loop:
      R E I R F J ifn E F M A 1 O S P end
      I I 1 I J 1 I K -1 N K Z J url_origin_loop J url_ok
url_commit:
      R E url_valid N E 1 J url_bad
      M A url_current_host M B url_host M C 60 C S url_copy
      W url_current_valid 1 J url_ok
; A=destination B=source C=count. memmove; preserve A/B/C/D/I/J/K/L.
url_copy:
      M E A M F B M G C E G Z O S P
      ifg E F
        A E G A F G
url_copy_reverse: I E -1 I F -1 R H F W E H I G -1 N G Z J url_copy_reverse O S P
      end
url_copy_forward: R H F W E H I E 1 I F 1 I G -1 N G Z J url_copy_forward O S P
url_scheme: "http://"
