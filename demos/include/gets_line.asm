#include "getc.asm"

gets_line:
      M C A
      M D B
gets_line_loop:
      C S getc
      ife A _N_
        M A 0
        W C A
        O S P
      end
      ife D 1
        M A 0
        W C A
        O S P
      end
      W C A
      I C 1
      I D -1
      J gets_line_loop
