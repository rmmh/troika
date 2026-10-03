; Native disk phase for atomic download publication. Entry through image_call.
; B=0 begin (C=stable path,D=length,F=block count,G=last used),
; B=1 append one logical block from fs_buffer, B=2 finish, B=3 abort.
; Caller owns HTTP validation, partial-block assembly and cancellation order.
; Keep this image installed until finish/abort; checker/mutation scratch overlaps.
phase_entry:
      E B Z J dp_begin E B 1 J fs_replace_append
      E B 2 J fs_replace_finish E B 3 J fs_replace_abort
      M A -119 O S P
dp_begin: M A C M B D M C F M D G J fs_replace_begin
