; Entry at offset zero, called through image_call. B=operation:
; 0 initialize page (C=1 plain/2 page), 1 feed (C=source,D=count), 2 finish.
phase_entry:
      E B Z J pc_init E B 1 J pc_feed E B 2 J page_finish M A -119 O S P
pc_init: M A C J page_init
pc_feed: M A C M B D J page_feed
