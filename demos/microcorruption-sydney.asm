; title: Microcorruption 03 - Sydney


      M A @prompt
      C S puts
      M A @buf
      M B 16
      C S gets_line
      M A @buf
      C S puts
      M A @buf
      C S check_password
      ifn A Z
        M A @granted
        C S puts
        M A 1
        W _PE A
        H Z Z
      end
      M A @denied
      C S puts
      M A 0
      W _PE A
      H Z Z

#include "include/puts.asm"
#include "include/gets_line.asm"
#include "include/strneq.asm"

check_password:
      M F A
      M A F
      M B @word0
      M C 2
      C S strneq
      ife A Z
        J fail
      end
      M A F
      I A 2
      M B @word1
      M C 2
      C S strneq
      ife A Z
        J fail
      end
      M A F
      I A 4
      M B @word2
      M C 2
      C S strneq
      ife A Z
        J fail
      end
      M A F
      I A 6
      M B @word3
      M C 2
      C S strneq
      ife A Z
        J fail
      end
      M A 1
      O S P

fail:
      M A 0
      O S P

prompt: "Enter the password to continue.\0"
granted: "Access Granted!\0"
denied: "Invalid password; try again.\0"
word0: "8z\0"
word1: "-W\0"
word2: "Mg\0"
word3: "=_\0"
buf//16

@502
0
