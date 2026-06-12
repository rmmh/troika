; Euclidean GCD by subtraction: gcd(27, 18) = 9.
; Demonstrates nested ifl/else/end control flow.

      M A 27
      M B 18
loop: ifn A B
        ifl A B
          S B A    ; B -= A  (when A < B)
        else
          S A B    ; A -= B  (when A > B)
        end
        J loop
      end
      H Z Z        ; halt: A = gcd = 9
