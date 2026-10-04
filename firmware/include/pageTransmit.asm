; Advance a prepared page action on an already-established stream.
; page_request_send(): A=1 pending, 0 request sent, negative error.
; GET keeps TX open until the response FIN; mutations still send request FIN.
; Caller services networking between calls. Header and body each fit one DATA.
; Scratch remains owned until accepted; would-block never repeats preparation.
; Errors retain the action/stage. Abort the stream before clearing a failed send.
$pt_phase: 5455
$pt_header_length: 5456
page_request_send:
      C S pr_ready N A Z O S P
      R E pt_phase
      ife E Z
        C S page_request_header N A Z O S P
        W pt_header_length B W pt_phase 1
      end
      R E pt_phase
      ife E 1
        M A 5711 R B pt_header_length C S stream_send
        E A -1 J pt_wait N A Z O S P W pt_phase 2
      end
      R E pt_phase
      ife E 2
        C S page_request_body N A Z O S P W pt_phase 3
      end
      R E pt_phase
      ife E 3
        R B pr_length
        ifn B Z
          M A 5711 C S stream_send E A -1 J pt_wait N A Z O S P
        end
        W pt_phase 4
      end
      R E f_action E E 2 J page_request_clear
      C S stream_shutdown E A -1 J pt_wait N A Z O S P
      J page_request_clear
pt_wait: M A 1 O S P
