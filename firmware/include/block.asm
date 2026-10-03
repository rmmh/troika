; Native block I/O. A=command (1 read, 2 write, 3 flush), B=unit,
; C=block, D=243-tryte buffer. Returns A=controller result.
; Clobbers E,F,G,H; B,C,D preserved. Caller owns controller until return.
; S is a downward native stack. IRQ handlers must preserve live registers.
; Optional cooperative service vector in protocol RAM; zero disables it.
; Callback may clobber A..L, must balance S, and must not use private FS helpers.
; Public filesystem calls/refills reject reentry while this callback runs.
$block_service_vector: 2485
$block_servicing: 2486
block_io:
      R E block_servicing
      ifn E Z M A -1 O S P end
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
      E A Z J block_done
      R A block_service_vector
      E A Z J block_wait
      U S B U S C U S D U S E U S F U S G
      U S H U S I U S J U S K U S L
      W block_servicing 1
      C S A
      W block_servicing Z
      O S L O S K O S J O S I O S H O S G
      O S F O S E O S D O S C O S B
      J block_wait
block_done:
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
