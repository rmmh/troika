; Native disk phase for atomic download publication. Entry through image_call.
; B=0 begin (C=stable path,D=length,F=block count,G=last used),
; B=1 append one logical block from fs_buffer, B=2 finish, B=3 abort.
; B=4 initialize HTTP destination C/length D, 5 body cell C, 6 publish, 7 cancel.
; B=8 service durable control-serial reservation while download is open.
; Caller owns HTTP framing/EOF validation and cancellation ordering.
; Keep this image installed until finish/abort; checker/mutation scratch overlaps.
phase_entry:
      E B Z J dp_begin E B 1 J fs_replace_append
      E B 2 J fs_replace_finish E B 3 J fs_replace_abort
      E B 4 J dp_init E B 5 J dp_char E B 6 J download_finish
      E B 7 J download_cancel E B 8 J download_service M A -119 O S P
dp_begin: M A C M B D M C F M D G J fs_replace_begin

dp_init: M A C M B D J download_init
dp_char: M A C J download_char
