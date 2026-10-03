; Native block I/O. A=command (1 read, 2 write, 3 flush), B=unit,
; C=block, D=243-tryte buffer. Returns A=controller result.
; Clobbers E,F,G,H; B,C,D preserved. Caller owns controller until return.
; S is a downward native stack. IRQ handlers must preserve live registers.
; Bounded polling here will become a cooperative yield in the network loop.
block_io:
      R E 0s_BG
      ifn E Z
        M A -1
        O S P
      end
      ; Validate selector before a hardware write that would ignore it.
      ifl B Z
        M A -6
        O S P
      end
      ifg B 26
        M A -6
        O S P
      end
      ifl A 1
        M A -5
        O S P
      end
      ifg A 3
        M A -5
        O S P
      end
      M E A
      W 0s_BL B
      W 0s_BC C
      W 0s_BD Z
      ife E 2
        M F D
        M G 243
block_write_buffer:
        R H F
        W 0s_BE H
        I F 1
        I G -1
        N G Z J block_write_buffer
      end
      W 0s_BF E
      R A 0s_BH
      N A Z O S P
block_wait:
      R A 0s_BG
      N A Z J block_wait
      R A 0s_BI
      N A Z O S P
      ife E 1
        M F D
        M G 243
block_read_buffer:
        R H 0s_BE
        W F H
        I F 1
        I G -1
        N G Z J block_read_buffer
      end
      O S P
