; title: Microcorruption 04 - Hanoi


      C S create_password
      M A @prompt
      C S puts
      M A @remember
      C S puts
      M A @buf
      C S get_password
      M A @buf
      C S check_password
      ife A Z
        J fail
      end
      M A @testing
      C S puts
      M A @granted
      C S puts
      M A 1
      W _PE A
      H Z Z

fail:
      M A @denied
      C S puts
      M A 0
      W _PE A
      H Z Z

#include "include/puts.asm"
#include "include/gets_line.asm"

create_password:
      M A @password
      M B @src
      M C 8
copy_loop:
      R D B
      W A D
      I A 1
      I B 1
      I C -1
      ifn C Z
        J copy_loop
      end
      R D @hash
      W A D
      I A 1
      M D 0
      W A D
      O S P

get_password:
      M B 100
      C S getsn
      O S P

getsn:
      C S gets_line
      O S P

check_password:
      M B 0
      M C @password
loop:
      R D A
      R E C
      ifn D E
        M A 0
        O S P
      end
      I A 1
      I C 1
      I B 1
      ifn B 8
        J loop
      end
      M A 1
      O S P

prompt: "Enter the password to continue.\0"
remember: "Remember: passwords are between 8 and 16 characters.\0"
testing: "Testing if password is valid.\0"
granted: "Access granted.\0"
denied: "That password is not correct.\0"
@_QA
password//18
src: "01234567"
hash: "89abcdef-"
buf//100
