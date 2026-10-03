; title: Microcorruption 01 - Tutorial


      M A @prompt
      C S puts
      M A @buf
      C S get_password
      M A @buf
      C S check_password
      ifn A Z
        J unlock_door
      end
      M A @denied
      C S puts
      M A 0
      W _PE A
      H 0sAAA Z

unlock_door:
      M A @granted
      C S puts
      M A 1
      W _PE A
      H 0sAAA Z

#include "include/puts.asm"
#include "include/gets_line.asm"

get_password:
      M B 100
      C S getsn
      O S P

getsn:
      C S gets_line
      O S P

check_password:
      M B 0
loop: O A C
      I B 1
      ifn C Z
        J loop
      end
      ife B 9
        M A 1
        O S P
      end
      M A 0
      O S P

prompt: "Enter the password to continue\0"
granted: "Access Granted!\0"
denied: "Invalid password; try again.\0"
buf//100

@500
0
