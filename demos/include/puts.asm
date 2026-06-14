puts:
      M C 0
puts_loop:
      O A B
      N B Z
        W _PC B
      M C B
      N B Z
        J puts_loop
      ife C _N_
        J puts_done
      end
      M B _N_
      W _PC B
puts_done:
      O S P
