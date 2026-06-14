decrypt_payload:
      M F B
decrypt_payload_loop:
      R D A
decrypt_payload_key:
      R E B
      ife E Z
        M B F
        J decrypt_payload_key
      end
      T D E #10T0T1T10
      W A D
      I A 1
      I B 1
      I C -1
      ifn C Z
        J decrypt_payload_loop
      end
      O S P
