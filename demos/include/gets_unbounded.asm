#include "getc.asm"

gets_unbounded:
      M C A
gets_unbounded_loop:
      C S getc
      ife A _N_
        M A 0
        W C A
        O S P
      end
      W C A
      I C 1
      J gets_unbounded_loop
