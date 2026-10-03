; title: Microcorruption 02 - New Orleans


      C S create_password
      M A @prompt
      C S puts
      M A @buf
      M B 24
      C S gets_line
      M A @buf
      C S puts
      M A @buf
      M B @password
      C S streq
      ife A Z
        J fail
      end
      M A @granted
      C S puts
      M A 1
      W _PE A
      H 0sAAA Z

fail:
      M A @denied
      C S puts
      M A 0
      W _PE A
      H 0sAAA Z

#include "include/puts.asm"
#include "include/gets_line.asm"
#include "include/streq.asm"

create_password:
      M B @password
      M A @src
      M C 3
pair_loop:
      R D A
      I A 1
      R E A
      W B E
      I B 1
      W B D
      I B 1
      I A 1
      I C -1
      ifn C Z
        J pair_loop
      end
      R D @hash
      W B D
      I B 1
      M A 0
      W B A
      O S P

prompt: "Enter the password to continue\0"
granted: "Access Granted!\0"
denied: "Invalid password; try again.\0"
password//8
buf//24
src: "H<O+pl"
hash: "#"

@510
0
