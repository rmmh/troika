import type {DocumentSoftware} from './native';
/** Guest-only lending record parser. The document UI supplies ASCII A/B.
 * Scratch 3810..3815: title pointer/length, borrower pointer/length, due day,
 * and record length. Live documents and draft are never modified here. */
export const LENDING_RECORD_PARSE = `ledger_parse:
 W 3810 A W 3815 B W 3811 Z W 3813 Z W 3814 Z
 ifl B 4 J ledger_bad end ifg B 48 J ledger_bad end R E A E E 58 J ledger_bad
 M J A M K B M G Z M D Z
ledger_title:
 E K Z J ledger_bad R E J E E 124 J ledger_title_end
 ifl E 32 J ledger_bad end ifg E 126 J ledger_bad end
 ifn E 32 M D 1 end I G 1 ifg G 24 J ledger_bad end I J 1 I K -1 J ledger_title
ledger_title_end:
 E G Z J ledger_bad E D Z J ledger_bad W 3811 G I J 1 I K -1 W 3812 J M H Z M D Z
ledger_borrower:
 E K Z J ledger_bad R E J E E 124 J ledger_borrower_end
 ifl E 32 J ledger_bad end ifg E 126 J ledger_bad end
 ifn E 32 M D 1 end I H 1 ifg H 20 J ledger_bad end I J 1 I K -1 J ledger_borrower
ledger_borrower_end:
 ifn H Z E D Z J ledger_bad end W 3813 H I J 1 I K -1 ifl K 1 J ledger_bad end ifg K 2 J ledger_bad end M G Z
ledger_due:
 R E J ifl E 48 J ledger_bad end ifg E 57 J ledger_bad end P G 10 S E 48 A G E I J 1 I K -1 N K Z J ledger_due
 ife H Z ifn G Z J ledger_bad end else ife G Z J ledger_bad end end W 3814 G M A Z O S P
ledger_bad: M A -1 O S P`;

const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const LENDING_LEDGER_ALGORITHM = `
doc_app_init: W 3808 1 O S P
doc_app_validate: J ledger_parse
doc_app_key: E A 63 J ledger_help E A 104 J ledger_format E A 72 J ledger_format M A Z O S P
ledger_help: W doc_message @ledger_command_args M A 1 O S P
ledger_format: W doc_message @ledger_record_help M A 1 O S P
; No normal record is changed here: commands either validate a complete
; replacement in private scratch, or only adjust the ephemeral report day.
doc_app_command:
 W 3825 A W 3826 B W 3827 C E B Z J ledger_normal
 R E A N E 58 J ledger_normal
 ife B 3 M I A M E I/1 M F I/2 ife E 105 ife F 110 J ledger_return end end end
 ifge B 6 M I A M E I/1 M F I/2 M G I/3 M H I/4
 ife E 100 ife F 97 ife G 121 ife H 32 J ledger_day end end end end
 ife E 111 ife F 117 ife G 116 ife H 32 J ledger_checkout end end end end end
 J ledger_command_bad
ledger_normal: M A Z O S P
ledger_day:
 ifg B 7 J ledger_command_bad end M J A A J 5 M K B I K -5 M G Z
ledger_day_digit: R E J ifl E 48 J ledger_command_bad end ifg E 57 J ledger_command_bad end P G 10 S E 48 A G E I J 1 I K -1 N K Z J ledger_day_digit
 ife G Z J ledger_command_bad end W 3808 G W doc_message @ledger_day_set M A 1 O S P
ledger_selected:
 R E 3827 P E 55 A E 3000 W 3828 E R B E E B Z J ledger_bad M A E I A 1 J ledger_parse
ledger_return:
 C S ledger_selected N A Z J ledger_no_book R E 3813 ife E Z W doc_message @ledger_already M A 1 O S P end
 C S ledger_start_record M I 4701 R E 3811 A I E W I 124 M I/1 124 M I/2 48 I E 3 W 4700 E J ledger_publish
ledger_checkout:
 R E 3826 ifg E 28 J ledger_command_bad end
 C S ledger_selected N A Z J ledger_no_book R E 3813 ifn E Z W doc_message @ledger_is_out M A -1 O S P end
 C S ledger_start_record M I 4701 R E 3811 A I E W I 124 I I 1 R J 3825 A J 5 R K 3826 I K -5
ledger_copy_checkout: E K Z J ledger_checkout_check R E J W I E I I 1 I J 1 I K -1 J ledger_copy_checkout
ledger_checkout_check:
 M E I S E 4701 W 4700 E M A 4701 M B E C S ledger_parse N A Z J ledger_command_bad R E 3813 E E Z J ledger_command_bad J ledger_publish
; Start a zero-padded private record containing only the validated old title.
ledger_start_record:
 M I 4700 M K 55
ledger_clear_record: W I Z I I 1 I K -1 N K Z J ledger_clear_record
 R J 3810 R K 3811 M I 4701
ledger_copy_title: R E J W I E I I 1 I J 1 I K -1 N K Z J ledger_copy_title O S P
ledger_publish:
 M J 4700 R I 3828 M K 55
ledger_commit_record: R E J W I E I I 1 I J 1 I K -1 N K Z J ledger_commit_record W doc_dirty 1 W doc_message @ledger_changed M A 1 O S P
ledger_no_book: W doc_message @ledger_no_title M A -1 O S P
ledger_command_bad: W doc_message @ledger_command_help M A -1 O S P
; Report recomputes circulation from the live records, never from stale caches.
doc_app_report:
 W doc_report_len Z W 3820 Z W 3821 Z W 3822 Z W 3823 Z
ledger_count_record:
 R E 3820 P E 55 A E 3000 R B E ife B Z J ledger_count_next end M A E I A 1 C S ledger_parse N A Z J ledger_count_next
 R E 3821 I E 1 W 3821 E R E 3813 ife E Z J ledger_count_next end R E 3822 I E 1 W 3822 E R E 3814 R F 3808 ifge E F J ledger_count_next end
 R E 3823 M I 3900 A I E R F 3820 I F 1 W I F I E 1 W 3823 E
ledger_count_next: R E 3820 I E 1 W 3820 E ifl E 12 J ledger_count_record end
 M A @ledger_rday C S ledger_emit R F 3808 C S ledger_number M A @ledger_rbooks C S ledger_emit R F 3821 C S ledger_number M A @ledger_rout C S ledger_emit R F 3822 C S ledger_number M B 27 C S ledger_pad
 M A @ledger_rlate C S ledger_emit R F 3823 C S ledger_number M A @ledger_colon C S ledger_emit W 3820 Z R E 3823 ife E Z M A @ledger_none C S ledger_emit end
ledger_list_late:
 R E 3820 R F 3823 ifge E F J ledger_late_done end ife E 6 M B 54 C S ledger_pad M A @ledger_indent C S ledger_emit end R E 3820 M I 3900 A I E R F I C S ledger_number M A 32 C S ledger_put R E 3820 I E 1 W 3820 E J ledger_list_late
ledger_late_done:
 M B 81 C S ledger_pad R E doc_selected P E 55 A E 3000 R B E ife B Z M A @ledger_empty_slot J ledger_report_end end M A E I A 1 C S ledger_parse ifn A Z M A @ledger_invalid J ledger_report_end end R E 3813 ife E Z M A @ledger_on_shelf J ledger_report_end end M A @ledger_due_label C S ledger_emit R F 3814 C S ledger_number R E 3814 R F 3808 ifl E F M A @ledger_overdue else M A @ledger_current end
ledger_report_end: C S ledger_emit O S P
ledger_put: U S E U S I R E doc_report_len ifge E 108 O S I O S E O S P end M I 3700 A I E W I A I E 1 W doc_report_len E O S I O S E O S P
ledger_emit: M J A
ledger_emit_loop: R A J E A Z O S P C S ledger_put I J 1 J ledger_emit_loop
ledger_number: M E F Q E 10 M A E P A 10 ifg A F I E -1 S A 10 end S F A M A E A A 48 C S ledger_put M A F A A 48 J ledger_put
ledger_pad: R E doc_report_len ifge E B O S P end M A 32 C S ledger_put J ledger_pad
ledger_day_set: ${ascii('Report day set for session')}
ledger_already: ${ascii('Book is already on shelf')}
ledger_is_out: ${ascii('Return book before checkout')}
ledger_changed: ${ascii('Loan updated; save to disk')}
ledger_no_title: ${ascii('Select an existing book')}
ledger_command_help: ${ascii('Commands: :day / :out / :in')}
ledger_command_args: ${ascii(':out NAME|DAY :in :day DAY')}
ledger_record_help: ${ascii('TITLE|BORROWER|DUE (0=in)')}
ledger_rday: ${ascii('Day ')}
ledger_rbooks: ${ascii(' Books ')}
ledger_rout: ${ascii(' Out ')}
ledger_rlate: ${ascii('Late ')}
ledger_colon: ${ascii(': ')}
ledger_none: ${ascii('none')}
ledger_indent: ${ascii('         ')}
ledger_empty_slot: ${ascii('New: TITLE||0 (H: format)')}
ledger_invalid: ${ascii('Selected record is invalid')}
ledger_on_shelf: ${ascii('On shelf. ?: loan commands')}
ledger_due_label: ${ascii('Due ')}
ledger_overdue: ${ascii(' LATE; ?: commands')}
ledger_current: ${ascii(' current; ?: commands')}
${LENDING_RECORD_PARSE}`;


export const LENDING_LEDGER:DocumentSoftware = {
 number:212,kind:'document',id:'lending-ledger',site:'library',title:'Lending Ledger',dataPath:'/lending',
 inputs:['Book/reader/due','Loan command'],outputs:['Circulation','Overdue slots'],
 description:'Keep twelve editable book records on the Troika disk. Enter TITLE|BORROWER|DUE: titles have 1..24 characters, cannot start with :, and borrower names have up to 20. An available book uses an empty borrower and due 0, such as Moon Atlas||0; checked-out books require a borrower and due day 1..99. Select a book and edit a draft command: :out Iris|20 checks it out, :in returns it, and :day 21 changes the report day. Checkout refuses an already-loaned book. A due day strictly before today is overdue. The report lists late slot numbers. Empty drafts delete records. In browse mode H recalls the format and ? lists commands. Save/Load persists books and loans at /lending; the report day starts at 1 each launch. F1 returns to programs with an unsaved-change prompt.',
 algorithm:LENDING_LEDGER_ALGORITHM,
 examples:[{records:['Moon Atlas||0','Garden Notes|Iris|12'],commands:[':day 13']}],
};
