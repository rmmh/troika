import type { DocumentSoftware } from './native';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
export const CUE_CARDS:DocumentSoftware={
 number:214,kind:'document',id:'rehearsal-cards',site:'rainroom',title:'Rehearsal Cue Cards',dataPath:'/cues',
 inputs:['Twelve cue cards'],outputs:['Rehearsal','Saved cards'],
 description:'Write twelve cue cards of up to 54 characters each. Enter edits the selected card. U moves it up and D moves it down, keeping its text intact. P starts rehearsal at the selected card; the report shows that cue. N and B advance or go back to the next nonempty cue without wrapping. P stops rehearsal. Cards remain editable during rehearsal; U/D reorder only outside rehearsal. S saves all cards to /cues on your Troika disk; L reloads them. F1 cancels an edit or returns to Programs, asking before discarding unsaved cards.',
 algorithm:`doc_app_init: W 3850 Z W 3851 Z W 3000 26 M A 3001 M B @cue_seed1 M C 26 C S doc_copy W 3055 28 M A 3056 M B @cue_seed2 M C 28 C S doc_copy W 3110 24 M A 3111 M B @cue_seed3 M C 24 C S doc_copy O S P
doc_app_validate: M A Z O S P
doc_app_command: M A Z O S P
doc_app_key: ifge A 65 ifle A 90 A A 32 end end E A 112 J cue_toggle R E 3850 ifn E Z E A 110 J cue_forward E A 98 J cue_backward M A Z O S P end E A 117 J cue_up E A 100 J cue_down M A Z O S P
cue_toggle: R E 3850 ife E Z W 3850 1 R E doc_selected W 3851 E W doc_message @cue_play else W 3850 Z R E 3851 W doc_selected E W doc_message @cue_browse end M A 1 O S P
cue_forward: M H 1 J cue_seek
cue_backward: M H -1
cue_seek: R G 3851
cue_seek_next: A G H ifl G Z J cue_boundary end ifge G 12 J cue_boundary end M I 3000 M E G P E 55 A I E R E I E E Z J cue_seek_next W 3851 G W doc_message @cue_play M A 1 O S P
cue_boundary: W doc_message @cue_end M A 1 O S P
cue_up: R G doc_selected E G Z J cue_no_move M H G I H -1 J cue_swap
cue_down: R G doc_selected E G 11 J cue_no_move M H G I H 1
cue_swap: W 3852 G W 3853 H M B G P B 55 A B 3000 M A 3900 M C 55 C S doc_copy R A 3852 P A 55 A A 3000 R B 3853 P B 55 A B 3000 M C 55 C S doc_copy R A 3853 P A 55 A A 3000 M B 3900 M C 55 C S doc_copy R E 3853 W doc_selected E W doc_dirty 1 W doc_message @cue_moved M A 1 O S P
cue_no_move: W doc_message @cue_edge M A 1 O S P
doc_app_report: C S doc_report_reset R E 3850 ife E Z M A @cue_edit_help C S doc_report_text R G doc_selected else M A @cue_run_help C S doc_report_text R G 3851 end W 3854 G M A 67 C S doc_report_put M A 117 C S doc_report_put M A 101 C S doc_report_put M A 32 C S doc_report_put M A G I A 1 ifge A 10 M A 49 C S doc_report_put M A G I A -9 else M A 48 C S doc_report_put M A G I A 1 end A A 48 C S doc_report_put M A 58 C S doc_report_put M A 32 C S doc_report_put
cue_pad: R E doc_report_len ifge E 54 J cue_text end M A 32 C S doc_report_put J cue_pad
cue_text: R E 3854 P E 55 M I 3000 A I E R H I I I 1 ife H Z M A @cue_empty J doc_report_text end
cue_letters: R A I C S doc_report_put I I 1 I H -1 N H Z J cue_letters O S P
cue_seed1: ${ascii('FIRST: It only rains here.')}
cue_seed2: ${ascii('SECOND: Move the chairs now.')}
cue_seed3: ${ascii('[Pause. Listen to rain.]')}
cue_edit_help: ${ascii('U/D:move card P:rehearse'.padEnd(27))}
cue_run_help: ${ascii('N/B:next/back P:stop'.padEnd(27))}
cue_play: ${ascii('Rehearsal: N/B advance')}
cue_browse: ${ascii('Choose a cue to edit')}
cue_end: ${ascii('No more nonempty cues')}
cue_moved: ${ascii('Card moved; S saves')}
cue_edge: ${ascii('Already at the end')}
cue_empty: ${ascii('(empty cue)')}`,
 examples:[{records:['FIRST: It only rains here.','SECOND: Then move the chairs.','[A long silence.]']}],
};
