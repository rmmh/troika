; title: String length
; String length: counts trytes until null terminator.
; Demonstrates R (memory read), ifn/end, and immediate add.

$msg: 200

      M A msg      ; A = pointer into string
      M B A        ; B = start (for length calc at end)
loop: R C A        ; C = *A
      ifn C Z      ; while C != 0
        I A 1
        J loop
      end
      S A B        ; A = length
      H Z Z        ; halt (inspect A)

@200
TEST_STRING_ 0     ; 4 trytes
