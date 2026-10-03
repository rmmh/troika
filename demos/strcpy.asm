; title: String copy
; strcpy: copies a null-terminated tryte string with DATABLAST.

$src: 400
$dst: 440

      M A dst      ; A = destination cursor
      M B src      ; B = source cursor
      M C A        ; C = original destination (return value)
loop: R D B        ; D = *B
      D A B        ; *A++ = *B++
      E D Z        ; stop after copying the null terminator
        J done
      J loop
done: M A C        ; A = destination start
      H 0sAAA Z    ; mask all interrupts and halt

@400
TEST_STRING_ 0

@440
dstbuf//16
