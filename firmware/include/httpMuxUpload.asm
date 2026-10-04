; Serialized raw uploads for httpMux + share_upload. Install both hooks after
; http_files_init, then call http_mux_init. Set au_owner=-1 at startup.
; The generic writer gate drains other readers before this admission hook.
; Only the owner may touch upload state, replacement metadata, or the path at
; 2552. Its partial filesystem block/handle travel with its HTTP context.
$au_owner: 2335
archive_admit:
      R E h_method N E 4 J http_ok
      R E hm_writer R F hm_current N E F J http_mux_defer
      R E au_owner E E F J archive_upload_progress
      N E -1 J http_mux_defer
      M B Z C S share_upload R E hm_current W au_owner E
archive_upload_deadline:
      ; These three HTTP response fields are unused until request EOF. They
      ; travel with this context, so a stalled writer cannot retain admission.
      C S net_now M A net_tick M B 243 M C hs_length J net_add_ticks
archive_upload_progress:
      R E st_rx_left N E Z J archive_upload_deadline
      R E st_eof N E Z J http_ok
      C S net_now M A net_tick M B hs_length C S wide_compare
      E A -1 J http_ok M A -65 O S P
archive_upload:
      R E au_owner R F hm_current N E F J http_ok
      U S B C S share_upload O S B
      E B 1 O S P
      ; Reset, cancel and final EOF finish this ownership interval, including
      ; rejected uploads. Other clients' reset callbacks must never abort it.
      ; hs_left held the deadline middle tryte, not response body length.
      W hs_left Z W au_owner -1 O S P
