; title: String length
; String length: counts trytes until null terminator.
; Demonstrates O as a post-increment string load and final pointer subtraction.

$msg: 200

      M A msg      ; A = pointer into string
      M B A        ; B = start (for length calc at end)
loop: O A C        ; C = *A++
      N C Z        ; while C != 0
        J loop
      I A -1       ; back up from one-past-null to the null
      S A B        ; A = length
      H Z Z        ; halt (inspect A)

@200
TEST_STRING_ 0     ; 4 trytes
