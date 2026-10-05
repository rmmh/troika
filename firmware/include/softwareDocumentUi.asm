; Native document editor: twelve length-prefixed 54-character records.
; Application hooks initialize/validate/report, interpret draft commands and
; handle printable browse keys. They must not overwrite framework/staging RAM.
; ABI: live records 3000..3659, each length followed by 54 printable ASCII
; cells (unused cells zero). Draft 2552..2605, report 3700..3807 (108 chars),
; disk staging 4010..4675. App-owned RAM: 3808..4009 and 4700..5224.
; init() runs once before auto-load. validate(A=text,B=len,C=slot) returns
; zero/negative and must not mutate records: it also validates staged loads.
; command(A=draft,B=len,C=slot) returns 0 ordinary edit, 1 handled, -1 error;
; commands run only on Enter, never during load. key(A=ASCII) returns 1 redraw
; or 0 ignored and runs only in browse mode. App mutations set doc_dirty=1.
; report() writes at most 108 ASCII cells and sets doc_report_len. Helpers
; doc_report_put(A), doc_report_text(A=zero-terminated text), doc_report_reset
; provide bounded output; put preserves B..L, text clobbers A/J.
; All hooks may clobber A..L. doc_copy(A=dest,B=src,C=count) clobbers A/B/C/E.
; doc_message points to a zero-terminated message of at most 27 ASCII cells.
; doc_selected is 0..doc_last_record; storage always keeps twelve records.
; command-only views open an empty prompt and never write an ordinary edit.
; doc_mode is browse/edit/exit-confirm/reload-confirm.
; App key hooks never receive reserved S/L. F1 cancels draft or confirms exit.
$doc_input: 2552
$doc_length: 2610
$doc_caret: 2611
$doc_mode: 2612
$doc_selected: 2613
$doc_dirty: 2614
$doc_message: 2615
$doc_report_len: 2616
$doc_report: 3700
$doc_char: 2640
$doc_action: 2641

app_entry:
 M S 5710 W 2532 4 W 2533 software_id W 2504 14 W 26 -9841
 W block_service_vector Z W block_servicing Z W 150 Z
 W Z 0sDMT W -3659 -9841 W -3658 9841 W -3657 9841 W -3656 -9841
 M I 2610 M K 33
 doc_zero_state: W I Z I I 1 I K -1 N K Z J doc_zero_state
 M I doc_data M K 660
 doc_zero_data: W I Z I I 1 I K -1 N K Z J doc_zero_data
 W doc_message @doc_ready C S doc_app_init C S doc_store_load
 ife A Z W doc_dirty Z W doc_message @doc_loaded else ifn A -12 W doc_message @doc_load_error end end
 doc_redraw: W 2514 Z C S doc_render
app_key:
 W 2514 1 R E 68 N E 4 J app_key R E 69 W 2514 Z
 R F doc_mode ife F 1 J doc_edit_key end ifge F 2 J doc_confirm_key end
 E E 91 J doc_request_exit E E 88 J doc_begin_edit E E 27 J doc_begin_edit
 E E 89 J doc_previous_clamp E E 83 J doc_previous_clamp E E 90 J doc_next_clamp E E 84 J doc_next_clamp
 E E 81 J doc_next E E 82 J doc_previous
 M A E C S text_ascii ifl A 32 J app_key end ifg A 126 J app_key end
 E A 83 J doc_save E A 115 J doc_save E A 76 J doc_request_load E A 108 J doc_request_load
 C S doc_app_key N A Z J doc_redraw J app_key
 doc_next_clamp: R E doc_selected ifge E doc_last_record J app_key end I E 1 W doc_selected E J doc_redraw
 doc_previous_clamp: R E doc_selected E E Z J app_key I E -1 W doc_selected E J doc_redraw
 doc_next: R E doc_selected I E 1 ife E doc_visible_records M E Z end W doc_selected E J doc_redraw
 doc_previous: R E doc_selected I E -1 ifl E Z M E doc_last_record end W doc_selected E J doc_redraw
 doc_current: R I doc_selected P I 55 A I doc_data O S P
 doc_begin_edit:
 ifn doc_command_only Z W doc_length Z W doc_caret Z W doc_mode 1 W doc_message @doc_ready J doc_redraw end
 C S doc_current R E I W doc_length E W doc_caret E I I 1
 M A doc_input M B I M C 54 C S doc_copy W doc_mode 1 W doc_message @doc_editing J doc_redraw
 doc_edit_key:
 E E 91 J doc_cancel_edit E E 88 J doc_commit E E 27 J doc_commit
 E E 83 J doc_left E E 84 J doc_right E E 86 J doc_backspace E E 87 J doc_delete
 M A E C S text_ascii ifl A 32 J app_key end ifg A 126 J app_key end
 R G doc_length ifge G 54 J app_key end W doc_char A R H doc_caret M J G
 doc_insert_shift: ifle J H J doc_insert end M I doc_input A I J M F I/-1 W I F I J -1 J doc_insert_shift
 doc_insert: M I doc_input A I H R E doc_char W I E I G 1 W doc_length G I H 1 W doc_caret H J doc_redraw
 doc_left: R E doc_caret E E Z J app_key I E -1 W doc_caret E J doc_redraw
 doc_right: R E doc_caret R F doc_length ifge E F J app_key end I E 1 W doc_caret E J doc_redraw
 doc_backspace: R E doc_caret E E Z J app_key I E -1 W doc_caret E
 doc_delete: R G doc_length R H doc_caret ifge H G J app_key end M J H
 doc_delete_shift: I J 1 ifge J G J doc_delete_end end M I doc_input A I J R E I M I/-1 E J doc_delete_shift
 doc_delete_end: I G -1 W doc_length G M I doc_input A I G W I Z J doc_redraw
 doc_cancel_edit: W doc_mode Z W doc_message @doc_cancelled J doc_redraw
 doc_commit:
 W doc_message @doc_invalid M A doc_input R B doc_length R C doc_selected C S doc_app_command
 ifl A Z J doc_redraw end ifn A Z W doc_mode Z J doc_redraw end
 ifn doc_command_only Z J doc_redraw end
 R B doc_length ifn B Z M A doc_input R C doc_selected C S doc_app_validate N A Z J doc_redraw end
 C S doc_current M J I M K 55
 doc_commit_clear: W J Z I J 1 I K -1 N K Z J doc_commit_clear
 R E doc_length W I E I I 1 M A I M B doc_input M C E C S doc_copy
 W doc_dirty 1 W doc_mode Z W doc_message @doc_changed J doc_redraw
 doc_request_exit: R E doc_dirty E E Z J doc_exit W doc_mode 2 W doc_message @doc_exit_question J doc_redraw
 doc_request_load: R E doc_dirty E E Z J doc_load W doc_mode 3 W doc_message @doc_reload_question J doc_redraw
 doc_confirm_key:
 ife E 91 W doc_mode Z W doc_message @doc_ready J doc_redraw end
 M A E C S text_ascii E A 83 J doc_save E A 115 J doc_save
 ife A 68 J doc_discard end ife A 100 J doc_discard end J app_key
 doc_discard: R E doc_mode E E 2 J doc_exit J doc_load
 doc_save:
 R E doc_mode W doc_action E W doc_message @doc_saving C S doc_render C S doc_store_save
 ifl A Z W doc_mode Z W doc_message @doc_save_error J doc_redraw end
 W doc_dirty Z W doc_mode Z ife A 1 W doc_message @doc_saved_check J doc_redraw else W doc_message @doc_saved end
 R E doc_action E E 2 J doc_exit E E 3 J doc_load J doc_redraw
 doc_load:
 W doc_mode Z W doc_message @doc_loading C S doc_render C S doc_store_load
 ife A Z W doc_dirty Z W doc_message @doc_loaded else ife A -12 W doc_message @doc_no_file else W doc_message @doc_load_error end end J doc_redraw
 doc_exit: C S fs_close J program_menu

; Header, twelve browse rows, four application report rows, full selected text,
; and a mode-specific command bar. A real inverse-video insertion caret remains
; visible without stealing a character from the two-line draft.
 doc_render:
 C S doc_report_reset C S doc_app_report
 M I -9841 M K 729
 doc_clear_screen: W I 32 I I 1 I K -1 N K Z J doc_clear_screen
 M I -9841 M J @app_title C S doc_draw
 M I -9814 R E doc_dirty ife E Z M J @doc_clean else M J @doc_unsaved end C S doc_draw
 M I -9787 M J @doc_list_help C S doc_draw M G Z M H -9760
 doc_render_record:
 M E 32 R F doc_selected ife G F M E 62 end W H E M E 48 M F G I F 1 ifge F 10 M E 49 S F 10 end
 M H/1 E A F 48 M H/2 F
 M J G P J 55 A J doc_data R K J ifg K 23 M K 23 end I J 1 M I H I I 4 C S doc_span
 I G 1 A H 27 ifl G doc_visible_records J doc_render_record end
 M I -9409 M J doc_report R K doc_report_len ifl K Z M K Z end ifg K 108 M K 108 end C S doc_span
 M I -9301 R J doc_message C S doc_draw
 R E doc_mode ife E 1 M J doc_input R K doc_length else C S doc_current R K I M J I I J 1 end
 M I -9274 C S doc_span
 R E doc_mode ife E 1 R E doc_caret M I -9274 A I E R F I A F 729 W I F end
 M I -9193 R E doc_mode ife E 1 M J @doc_edit_help else ifge E 2 M J @doc_confirm_help else M J @doc_browse_help end end C S doc_draw
 M I -9166 R E doc_mode ife E 1 M J @doc_caret_help else M J @doc_exit_help end C S doc_draw O S P
 doc_draw: M K 27
 doc_draw_loop: E K Z O S P R E J E E Z O S P W I E I I 1 I J 1 I K -1 J doc_draw_loop
 doc_span: E K Z O S P R E J W I E I I 1 I J 1 I K -1 J doc_span
 doc_copy: E C Z O S P R E B W A E I A 1 I B 1 I C -1 J doc_copy
 doc_report_reset: W doc_report_len Z O S P
 doc_report_put:
 U S E U S I R E doc_report_len ifge E 108 O S I O S E M A -1 O S P end
 M I doc_report A I E W I A I E 1 W doc_report_len E O S I O S E M A Z O S P
 doc_report_text: M J A
 doc_report_text_loop: R A J E A Z O S P C S doc_report_put ifl A Z O S P end I J 1 J doc_report_text_loop
doc_loaded: 76 111 97 100 101 100 32 102 114 111 109 32 100 105 115 107 0
doc_load_error: 76 111 97 100 32 102 97 105 108 101 100 59 32 100 97 116 97 32 107 101 112 116 0
doc_editing: 69 100 105 116 105 110 103 32 100 114 97 102 116 32 40 53 52 32 109 97 120 105 109 117 109 41 0
doc_cancelled: 68 114 97 102 116 32 99 97 110 99 101 108 108 101 100 0
doc_invalid: 73 110 118 97 108 105 100 32 114 101 99 111 114 100 32 111 114 32 99 111 109 109 97 110 100 0
doc_changed: 82 101 99 111 114 100 32 99 104 97 110 103 101 100 59 32 83 32 115 97 118 101 115 0
doc_exit_question: 85 110 115 97 118 101 100 32 99 104 97 110 103 101 115 58 32 101 120 105 116 63 0
doc_reload_question: 82 101 112 108 97 99 101 32 117 110 115 97 118 101 100 32 99 104 97 110 103 101 115 63 0
doc_saving: 83 97 118 105 110 103 32 116 111 32 100 105 115 107 46 46 46 0
doc_save_error: 83 97 118 101 32 102 97 105 108 101 100 59 32 99 104 97 110 103 101 115 32 107 101 112 116 0
doc_saved_check: 83 97 118 101 100 59 32 100 105 115 107 32 99 104 101 99 107 32 110 101 101 100 101 100 0
doc_saved: 83 97 118 101 100 32 116 111 32 100 105 115 107 0
doc_loading: 76 111 97 100 105 110 103 32 102 114 111 109 32 100 105 115 107 46 46 46 0
doc_no_file: 78 111 32 115 97 118 101 100 32 102 105 108 101 59 32 100 97 116 97 32 107 101 112 116 0
doc_clean: 83 97 118 101 100 32 47 32 117 110 99 104 97 110 103 101 100 0
doc_unsaved: 85 78 83 65 86 69 68 32 99 104 97 110 103 101 115 0
doc_confirm_help: 83 58 115 97 118 101 32 68 58 100 105 115 99 97 114 100 32 70 49 58 98 97 99 107 0
doc_caret_help: 76 101 102 116 47 82 105 103 104 116 32 109 111 118 101 59 32 66 107 115 112 47 68 101 108 0
doc_exit_help: 65 114 114 111 119 115 47 84 97 98 58 114 101 99 111 114 100 32 70 49 58 101 120 105 116 0
