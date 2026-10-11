import type {DocumentSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const starter=(records:string[])=>`mk_seed: ${records.map((r,i)=>`M A ${3000+i*55} M B @mk_seed${i} M C ${r.length+1} C S doc_copy`).join(' ')} O S P\n${records.map((r,i)=>`mk_seed${i}: ${r.length} ${[...r].map(c=>c.charCodeAt(0)).join(' ')}`).join('\n')}`;
// Scratch3808..4000; collected columns4700..4771; algorithm tables4790..5099.
// Validation only parses; every mutation is explicit in a browse-key hook.
const common=`
mk_bad: M A -1 O S P
mk_record: P A 55 A A 3000 R B A I A 1 O S P
mk_fields: M J A M K B E K Z J mk_bad R E J E E 58 J mk_bad M G Z M H Z W 3810 J
mk_field_loop: E K Z J mk_field_end R E J ifl E 32 J mk_bad end ifg E 126 J mk_bad end ife E 124 E H Z J mk_bad M I 3820 A I G W I H I G 1 ifge G 4 J mk_bad end I J 1 I K -1 M I 3810 A I G W I J M H Z J mk_field_loop end I J 1 I K -1 I H 1 J mk_field_loop
mk_field_end: E H Z J mk_bad M I 3820 A I G W I H I G 1 W 3830 G M A Z O S P
mk_name: R J 3810 R K 3820 ifg K 16 J mk_bad end M H Z
mk_name_loop: R E J ifn E 32 M H 1 end I J 1 I K -1 N K Z J mk_name_loop E H Z J mk_bad M A Z O S P
mk_numfield: M I 3810 A I A R J I M I 3820 A I A R K I
mk_uint: E K Z J mk_bad ifg K 3 J mk_bad end M G Z
mk_uint_loop: R E J ifl E 48 J mk_bad end ifg E 57 J mk_bad end P G 10 S E 48 A G E I J 1 I K -1 N K Z J mk_uint_loop M A Z O S P
mk_collect: W 3860 Z W 3861 Z
mk_collect_loop: R A 3860 C S mk_record ife B Z M G Z else C S doc_app_validate N A Z J mk_bad M G 1 end R H 3860 M I 4700 A I H W I G ifn G Z R E 3861 I E 1 W 3861 E M I 4720 A I H R E 3840 W I E M I 4740 A I H R E 3841 W I E M I 4760 A I H R E 3842 W I E end I H 1 W 3860 H ifl H 12 J mk_collect_loop end M A Z O S P
mk_plain: E B Z M A Z E B Z O S P R E A E E 58 J mk_bad M A Z O S P
mk_help: W doc_message @mk_format M A 1 O S P
mk_pad: R E doc_report_len ifge E B O S P end M A 32 C S doc_report_put J mk_pad
mk_int: ifl F Z M A 45 C S doc_report_put F F A end M D 1000 M I Z
mk_int_loop: M A F M B D C S app_div M F C ifn A Z M I 1 end ife D 1 M I 1 end ifn I Z A A 48 C S doc_report_put end E D 1 O S P Q D 10 J mk_int_loop
mk_two: ifl F 10 M A 48 C S doc_report_put end J mk_int
mk_three: ifl F 100 M A 48 C S doc_report_put end J mk_two
mk_span: E K Z O S P R A J C S doc_report_put I J 1 I K -1 J mk_span
mk_name_out: R A doc_selected C S mk_record E B Z O S P C S doc_app_validate R J 3810 R K 3820 J mk_span
mk_session: W doc_message @mk_session_hint M A 1 O S P
mk_session_hint: ${text('Session settings updated')}
mk_changed: W doc_dirty 1 W doc_message @mk_saved_hint M A 1 O S P
mk_saved_hint: ${text('Changed; S saves to disk')}
${POSITIVE_DIVISION}`;
// All tables stay in application RAM4700..5224. The persisted document is untouched.
const lit=(label:string,s:string)=>`${label}: ${text(s)}\n`;
const emit=(label:string)=>`M A @${label} C S doc_report_text `;
const num=(address:number)=>`R F ${address} C S mk_int `;
const row=(n:number)=>`M B ${27*n} C S mk_pad `;
const field=(i:number,dst:number,min:number,max:number)=>`M A ${i} C S mk_numfield N A Z O S P ifl G ${min} J mk_bad end ifg G ${max} J mk_bad end W ${dst} G `;
const letter=(i:number,dst:number,last='F')=>`R E ${3820+i} N E 1 J mk_bad R J ${3810+i} R G J ifl G 65 J mk_bad end ifg G ${last.charCodeAt(0)} J mk_bad end S G 65 W ${dst} G `;
const keyHelp=`E A 104 J mk_help E A 72 J mk_help `;
const finish=(records:string[],format:string)=>`${lit('mk_format',format)}${starter(records)}\n${common}`;
const commandNumber=(prefix:string,address:number,min:number,max:number)=>`doc_app_command: R E A ifn E 58 M A Z O S P end ifle B ${prefix.length} J mk_bad end M J A M K @mk_cmd M H ${prefix.length}
mk_cmd_loop: R E J R F K N E F J mk_bad I J 1 I K 1 I H -1 N H Z J mk_cmd_loop M K B S K ${prefix.length} C S mk_uint N A Z O S P ifl G ${min} J mk_bad end ifg G ${max} J mk_bad end W ${address} G J mk_session
${lit('mk_cmd',prefix)}`;
// Imposition: at most 12*99 = 1188 pages, rounded to at most 1200.
const signatureRecords=['Opening|6','Canal walk|9','Kitchen notes|5'];
const signature=`
doc_app_init: W 3808 8 W 3809 Z W 4000 Z J mk_seed
doc_app_validate: C S mk_fields N A Z O S P R E 3830 N E 2 J mk_bad C S mk_name N A Z O S P ${field(1,3840,1,99)}M A Z O S P
doc_app_command: J mk_plain
doc_app_key: ifge A 65 ifle A 90 A A 32 end end ${keyHelp} ife A 98 R E 3808 A E 4 ifg E 16 M E 4 end W 3808 E W 3809 Z J mk_session end ife A 118 R E 4000 M F 1 S F E W 4000 F M A 1 O S P end ife A 110 R E 3809 I E 1 R F 3873 ifge E F M E Z end W 3809 E M A 1 O S P end ife A 112 R E 3809 I E -1 ifl E Z R E 3873 I E -1 ifl E Z M E Z end end W 3809 E M A 1 O S P end M A Z O S P
doc_app_report: C S mk_collect W 3870 Z W 3871 Z W 3872 Z M H Z
sg_chapters: M I 4700 A I H R E I ifn E Z R E 3870 M I 4800 A I H I E 1 W I E I E -1 M I 4720 A I H R F I A E F W 3870 E M I 4820 A I H W I E end I H 1 ifl H 12 J sg_chapters end R A 3870 R B 3808 C S app_div ifn C Z I A 1 end P A B W 3871 A R E 3870 S A E W 3872 A R A 3871 M B 4 C S app_div W 3873 A R E 3809 ifge E A W 3809 Z end
 ${emit('sg_pages')}${num(3870)}${emit('sg_blank')}${num(3872)}${row(1)}R E 4000 ifn E Z J sg_chapter_report end R E 3873 ife E Z ${emit('sg_empty')}J sg_footer end
 ${emit('sg_sheet')}R F 3809 I F 1 C S mk_int M A 47 C S doc_report_put ${num(3873)}${emit('sg_size')}${num(3808)}${row(2)}
 R A 3808 M B 4 C S app_div M B A R A 3809 C S app_div R E 3808 P A E W 3880 A P C 2 W 3881 C M F A A F E S F C ${emit('sg_front')}C S sg_page M A 32 C S doc_report_put R F 3880 R E 3881 A F E I F 1 C S sg_page ${row(3)}${emit('sg_back')}R F 3880 R E 3881 A F E I F 2 C S sg_page M A 32 C S doc_report_put R F 3880 R E 3808 A F E R E 3881 S F E I F -1 C S sg_page ${emit('sg_view')}O S P
sg_chapter_report: ${emit('sg_chapter')}R F doc_selected I F 1 C S mk_two ${row(2)}R H doc_selected M I 4700 A I H R E I ife E Z ${emit('sg_empty')}else ${emit('sg_range')}M I 4800 R H doc_selected A I H R F I C S mk_int M A 45 C S doc_report_put R H doc_selected M I 4820 A I H R F I C S mk_int end
sg_footer: ${row(3)}${emit('sg_keys')}O S P
sg_page: R E 3870 ifg F E M A 45 C S doc_report_put M A 45 J doc_report_put end J mk_int
${lit('sg_pages','Pages ')}${lit('sg_blank',' Blanks ')}${lit('sg_sheet','N/P sheet ')}${lit('sg_size',' Bsize')}${lit('sg_front','Front L/R ')}${lit('sg_back','Back  L/R ')}${lit('sg_view',' V:view')}${lit('sg_chapter','Chapter ')}${lit('sg_range','Pages ')}${lit('sg_empty','No pages in selected view')}${lit('sg_keys','N/P:sheet B:size V:chapter')}
${finish(signatureRecords,'CHAPTER|PAGES1-99')}`;
// Clip lengths cap the complete timeline at 12*81 = 972 seconds.
const spliceRecords=['Canal|0|20|4','Bells|5|21|3','Footsteps|2|14|0'];
const splice=`
doc_app_init: W 3808 18 J mk_seed
doc_app_validate: C S mk_fields N A Z O S P R E 3830 N E 4 J mk_bad C S mk_name N A Z O S P ${field(1,3840,0,998)}${field(2,3841,1,999)}R E 3841 R F 3840 S E F ifl E 1 J mk_bad end ifg E 81 J mk_bad end W 3843 E ${field(3,3842,0,80)}R E 3843 ifg G E J mk_bad end M A Z O S P
${commandNumber(':at ',3808,0,999)}
doc_app_key: ifge A 65 ifle A 90 A A 32 end end ${keyHelp} ife A 110 R E 3808 ifl E 999 I E 1 W 3808 E end J mk_session end ife A 112 R E 3808 ifg E Z I E -1 W 3808 E end J mk_session end M A Z O S P
doc_app_report: C S mk_collect W 3870 Z W 3871 Z W 3872 Z W 3880 Z W 3881 Z W 3882 -1
sp_build: R H 3880 ifge H 12 J sp_last end M I 4700 A I H R E I E E Z J sp_build_next M I 4740 A I H R E I M I 4720 A I H R F I S E F M I 4760 A I H R G I R F 3881 A F G ifg F E W 3871 1 J sp_output end R F 3870 R G 3881 S F G M I 4800 A I H W I F A F E M I 4820 A I H W I F W 3870 F M I 4840 A I H R E 3881 W I E M I 4760 A I H R E I W 3881 E W 3882 H
sp_build_next: R E 3880 I E 1 W 3880 E J sp_build
sp_last: R E 3881 ifn E Z W 3871 2 J sp_output end W 3880 Z
sp_query: R H 3880 ifge H 12 J sp_output end M I 4700 A I H R E I E E Z J sp_query_next M I 4800 A I H R E I R G 3808 ifl G E J sp_query_next end M I 4820 A I H R F I ifge G F J sp_query_next end R K 3872 M I 4860 A I K W I H M I 4720 A I H R F I A F G S F E M I 4880 A I K W I F M J 1 M L 1 M I 4840 A I H R F I ifn F Z M D G S D E ifl D F M J D M L F J sp_gain end end M I 4760 A I H R F I ifn F Z M I 4820 A I H R E I S E G ifle E F M J E M L F end end
sp_gain: M I 4900 A I K W I J M I 4920 A I K W I L I K 1 W 3872 K
sp_query_next: R E 3880 I E 1 W 3880 E J sp_query
sp_output: ${emit('sp_duration')}${num(3870)}${emit('sp_at')}${num(3808)}${row(1)}R E 3871 ife E 1 ${emit('sp_overlap')}J sp_hint end ife E 2 ${emit('sp_lastfade')}J sp_hint end
 R H doc_selected M I 4700 A I H R E I ifn E Z ${emit('sp_selected')}R H doc_selected M I 4800 A I H R F I C S mk_int M A 45 C S doc_report_put R H doc_selected M I 4820 A I H R F I C S mk_int end ${row(2)}R E 3872 ife E Z ${emit('sp_silence')}O S P end W 3880 Z
sp_active: R H 3880 ifge H 2 O S P end R E 3872 ifge H E O S P end ifn H Z ${row(3)}end M I 4860 R H 3880 A I H R F I I F 1 C S mk_two ${emit('sp_source')}M I 4880 R H 3880 A I H R F I C S mk_int ${emit('sp_gain_text')}M I 4900 R H 3880 A I H R F I C S mk_int M A 47 C S doc_report_put M I 4920 R H 3880 A I H R F I C S mk_int R E 3880 I E 1 W 3880 E J sp_active
sp_hint: ${row(3)}${emit('sp_command')}O S P
${lit('sp_duration','Length ')}${lit('sp_at',' N/P at ')}${lit('sp_selected','Selected span ')}${lit('sp_source',' src ')}${lit('sp_gain_text',' gain ')}${lit('sp_silence','No active clip at this time')}${lit('sp_overlap','Incoming+outgoing > length')}${lit('sp_lastfade','Last clip must have fade 0')}${lit('sp_command',':at 18  N/P:second H:fields')}
${finish(spliceRecords,'REEL|IN|OUT|OUTGOING FADE')}`;
function doc(number:number,id:string,site:string,title:string,algorithm:string,records:string[],description:string):DocumentSoftware{return{number,id,site,title,dataPath:`/maker-${number}`,algorithm,kind:'document',inputs:['Saved records'],outputs:['Native report'],examples:[{records}],description:description+' Names and chapter/reel labels have 1..16 printable characters without | or a leading colon. Enter edits; an empty draft deletes. H recalls fields. S saves, L reloads, F1 cancels or confirms leaving unsaved changes. Authored examples appear until a saved document is loaded.'};}
export const SIGNATURE_PLANNER=doc(415,'signature-plan','gazette','Signature Planner',signature,signatureRecords,'Save CHAPTER|PAGES with 1..99 pages per chapter. Chapters follow slot order, blank slots skipped. B cycles signature sizes 4/8/12/16 pages, initially 8. Pad only the end of the complete book to a full signature. N/P browses physical sheets from each signature outside to inside. Front/back L/R are page numbers seen while looking directly at that printed side, top edges kept upright; turn the sheet around its vertical edge to inspect the back. Fold each sheet down its vertical center and nest sheets within each signature. -- marks blank padding. V toggles the selected chapter page range. This is a page-placement plan, not printer-specific duplex instructions. View settings reset on launch.');
export const TAPE_SPLICE=doc(417,'tape-splice','cassettes','Tape Splice Planner',splice,spliceRecords,'Save REEL|IN|OUT|FADE with source offsets 0..999 seconds, IN below OUT, clip length 1..81 seconds, and outgoing fade 0..80 no longer than the clip. Slot order is playback order, blanks skipped. A fade overlaps this clip end with the next clip start. Incoming plus outgoing fades may not exceed a clip length; the last clip must have fade 0. Invalid timelines remain editable but are diagnosed. Enter :at 18 or N/P to inspect session time 0..999, initially 18. Clips use start-inclusive/end-exclusive intervals. Reports active slot, source offset and exact linear gain fractions; a newly starting faded clip has gain 0 at that instant. Source metadata is saved; no audio files are played.');
export const MAKER_NOTEBOOKS=[SIGNATURE_PLANNER,TAPE_SPLICE];
// Proposed credits remain within +/-4203; extrema sums fit a tryte.
// Normalize into scratch first, then publish every validated record together.
const dutyRecords=['Ari|3|+0000','Bo|2|+0000','Cy|1|+0000'];
const duty=`
doc_app_init: J mk_seed
doc_app_validate: C S mk_fields N A Z O S P R E 3830 N E 3 J mk_bad C S mk_name N A Z O S P ${field(1,3840,1,9)}R K 3822 N K 5 J mk_bad R J 3812 R E J M H 1 ife E 45 M H -1 else N E 43 J mk_bad end I J 1 M K 4 M G Z
du_credit_parse: R E J ifl E 48 J mk_bad end ifg E 57 J mk_bad end ifg G 409 J mk_bad end P G 10 S E 48 A G E I J 1 I K -1 N K Z J du_credit_parse ifg G 4095 J mk_bad end P G H W 3841 G M A Z O S P
doc_app_command: J mk_plain
doc_app_key: ifge A 65 ifle A 90 A A 32 end end ${keyHelp} E A 110 J du_assign E A 99 J du_zero M A Z O S P
du_build: C S mk_collect W 3870 Z W 3871 -9841 W 3872 -1 M H Z
du_scores: M I 4700 A I H R E I ifn E Z M I 4720 A I H R E I R F 3870 A F E W 3870 F M I 4740 A I H R F I A E F M I 4800 A I H W I E R F 3871 ifg E F W 3871 E W 3872 H end end I H 1 ifl H 12 J du_scores end O S P
du_assign: C S du_build R H 3872 ifl H Z W doc_message @du_empty M A 1 O S P end M I 4800 A I H R E I R F 3870 S E F W I E W 3880 Z W 3881 9841 W 3882 -9841
 du_extrema: R H 3880 M I 4700 A I H R E I ifn E Z M I 4800 A I H R E I R F 3881 ifl E F W 3881 E end R F 3882 ifg E F W 3882 E end end I H 1 W 3880 H ifl H 12 J du_extrema end R A 3881 R E 3882 A A E M G A F A A M B 2 C S app_div ifl G Z P A -1 end W 3883 A M H Z
du_normalize: M I 4700 A I H R E I ifn E Z M I 4800 A I H R E I R F 3883 S E F ifl E -4095 J du_range end ifg E 4095 J du_range end W I E end I H 1 ifl H 12 J du_normalize end R E 3872 W doc_selected E J du_publish
du_zero: C S mk_collect M H Z
du_zero_loop: M I 4800 A I H W I Z I H 1 ifl H 12 J du_zero_loop end
du_publish: W 3880 Z
du_publish_loop: R H 3880 M I 4700 A I H R E I E E Z J du_publish_next M A H C S mk_record C S doc_app_validate R J 3812 R H 3880 M I 4800 A I H R F I M E 43 ifl F Z M E 45 F F A end W J E I J 1 W 3884 J W 3885 F M D 1000
du_digits: R A 3885 M B D C S app_div W 3885 C A A 48 R J 3884 W J A I J 1 W 3884 J E D 1 J du_publish_next Q D 10 J du_digits
du_publish_next: R E 3880 I E 1 W 3880 E ifl E 12 J du_publish_loop end J mk_changed
du_range: W doc_message @du_overflow M A 1 O S P
doc_app_report: C S du_build ${emit('du_total')}${num(3870)}${row(1)}R E 3872 ifl E Z ${emit('du_empty')}else ${emit('du_next')}R F 3872 I F 1 C S mk_two end ${row(2)}${emit('du_selected')}R H doc_selected M I 4700 A I H R E I ifn E Z M I 4740 A I H R F I C S mk_int else M A 45 C S doc_report_put end ${row(3)}${emit('du_keys')}O S P
${lit('du_total','Total weight ')}${lit('du_next','Next assignment slot ')}${lit('du_selected','Selected credit ')}${lit('du_empty','No participants to assign')}${lit('du_overflow','Credit spread: C resets all')}${lit('du_keys','N:assign C:zero H:fields')}
${finish(dutyRecords,'NAME|WEIGHT1-9|CREDIT+0000')}`;
export const FAIR_DUTY=doc(416,'fair-duty','jun','Fair Duty Wheel',duty,dutyRecords,'Save NAME|WEIGHT|CREDIT with weight 1..9 and credit written as a sign plus four digits, -4095..+4095. N adds each weight to its credit, assigns the greatest resulting credit (earlier slot wins ties), then subtracts total weight from the chosen person. It centers every credit by a common integer offset, which preserves all future choices and keeps long-running state bounded. All proposed credits are checked before any record changes; an extreme manually edited spread can be refused, with C resetting all credits to zero. Credits and weights persist together when saved. This is smooth weighted turn allocation, not a round-robin match schedule.');
MAKER_NOTEBOOKS.push(FAIR_DUTY);
// Literal pattern and padded-word buffers hold at most 22 cells plus gap scores.
const hyphenRecords=['ba1na','na1na','ti1on','con1','2ment'];
const hyphen=`
doc_app_init: W 3808 6 M B @hp_initial M A 5000 M C 6 C S doc_copy J mk_seed
doc_app_validate: ifl B 1 J mk_bad end ifg B 40 J mk_bad end M J A M K B W 3840 Z W 3841 Z W 3842 Z M A 4830 M B 23 K A B
hp_parse: R E J ifge E 48 ifle E 57 R F 3841 N F Z J mk_bad S E 48 R F 3840 M I 4830 A I F W I E W 3841 1 J hp_parse_next end end
 ifn E 46 ifl E 97 J mk_bad end ifg E 122 J mk_bad end W 3842 1 else R F 3840 ifn F Z ifg K 2 J mk_bad end ife K 2 M F J/1 ifl F 48 J mk_bad end ifg F 57 J mk_bad end end end end R F 3840 ifge F 22 J mk_bad end M I 4800 A I F W I E I F 1 W 3840 F W 3841 Z
hp_parse_next: I J 1 I K -1 N K Z J hp_parse R E 3842 E E Z J mk_bad M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end ifl B 7 J mk_bad end ifg B 26 J mk_bad end M J A M K @hp_command M H 6
hp_command_loop: R E J R F K N E F J mk_bad I J 1 I K 1 I H -1 N H Z J hp_command_loop M K B S K 6 M H K
hp_word_check: R E J ifl E 97 J mk_bad end ifg E 122 J mk_bad end I J 1 I K -1 N K Z J hp_word_check W 3808 H R A doc_length S A 6 M C A M B doc_input A B 6 M A 5000 C S doc_copy J mk_session
doc_app_key: ifge A 65 ifle A 90 A A 32 end end ${keyHelp} ife A 63 W doc_message @hp_hint M A 1 O S P end M A Z O S P
doc_app_report: M A 4930 M B 24 K A B W 4900 46 R A 3808 M C A M B 5000 M A 4901 C S doc_copy R E 3808 M I 4901 A I E W I 46 I E 2 W 3860 E W 3861 Z
hp_record_loop: R A 3861 ifge A 12 J hp_output end C S mk_record ife B Z J hp_next_record end C S doc_app_validate N A Z J hp_next_record W 3862 Z
hp_match_start: R E 3862 R F 3840 A E F R G 3860 ifg E G J hp_next_record end M H Z
hp_match_loop: R J 3862 A J H A J 4900 R E J M I 4800 A I H R F I N E F J hp_match_next I H 1 R F 3840 ifl H F J hp_match_loop end M H Z
hp_overlay: M I 4830 A I H R E I R J 3862 A J H A J 4930 R F J ifg E F W J E end I H 1 R F 3840 ifle H F J hp_overlay end
hp_match_next: R E 3862 I E 1 W 3862 E J hp_match_start
hp_next_record: R E 3861 I E 1 W 3861 E J hp_record_loop
hp_output: ${emit('hp_word')}M J 5000 R K 3808
hp_word_out: R A J C S doc_report_put I J 1 I K -1 N K Z J hp_word_out ${row(1)}${emit('hp_result')}${row(2)}W 3861 Z
hp_break_out: R H 3861 R E 3808 ifge H E O S P end ifge H 2 I E -2 ifle H E M I 4931 A I H R A I M B 2 C S app_div ifn C Z M A 45 C S doc_report_put end end end R H 3861 M I 5000 A I H R A I C S doc_report_put I H 1 W 3861 H J hp_break_out
${lit('hp_initial','banana')}${lit('hp_command',':word ')}${lit('hp_word','Word ')}${lit('hp_result','?:word H:fields Odd=break')}${lit('hp_hint',':word banana (1-20 letters)')}
${finish(hyphenRecords,'lowercase patterns: ba1na')}`;
export const HYPHEN_DESK=doc(418,'hyphen-patterns','letters','Hyphen Pattern Desk',hyphen,hyphenRecords,'Save up to 12 weighted patterns, for example ba1na, na1na or ba2na. Lowercase letters match literally; digits 0..9 score the gaps between letters, including either end. A dot anchors only the beginning or end of a word. Adjacent digits are invalid; patterns have at most 22 literal characters and 40 total characters. Enter :word banana to try 1..20 lowercase letters; ? recalls this command. Every matching pattern contributes its scores, and the greatest score at each gap wins. Odd maxima allow breaks, even maxima forbid them; at least two letters must remain on either side of a break. This is a small editable pattern workshop, not a complete dictionary. The trial word is session-only and resets to banana on launch.');
MAKER_NOTEBOOKS.push(HYPHEN_DESK);
// Reduced ratios use cross-cancellation before every multiply. Products are
// checked against floor(9841/factor), so overflow is never a cycle diagnosis.
const unitRecords=['A|B|3|1','B|C|2|1','C|H|1|4'];
const unitWeb=`
doc_app_init: W 3808 Z W 3809 7 W 4000 3 J mk_seed
doc_app_validate: C S mk_fields N A Z O S P R E 3830 N E 4 J mk_bad ${letter(0,3840,'H')}${letter(1,3841,'H')}${field(2,3842,1,9)}${field(3,3843,1,9)}M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end N B 14 J mk_bad M J A M K @uw_command M H 9
uw_command_check: R E J R F K N E F J mk_bad I J 1 I K 1 I H -1 N H Z J uw_command_check R E J ifl E 65 J mk_bad end ifg E 72 J mk_bad end M F J/1 N F 32 J mk_bad M F J/2 ifl F 65 J mk_bad end ifg F 72 J mk_bad end M G J/3 N G 32 J mk_bad M G J/4 ifl G 49 J mk_bad end ifg G 57 J mk_bad end S E 65 S F 65 S G 48 W 3808 E W 3809 F W 4000 G J mk_session
doc_app_key: ifge A 65 ifle A 90 A A 32 end end ${keyHelp} ife A 63 W doc_message @uw_hint M A 1 O S P end M A Z O S P
doc_app_report: C S mk_collect W 3870 Z W 3862 Z
uw_denominators: R A 3862 ifge A 12 J uw_begin end C S mk_record ifn B Z C S doc_app_validate R H 3862 M I 4780 A I H R E 3843 W I E end R E 3862 I E 1 W 3862 E J uw_denominators
uw_begin: M A 4800 M B 8 K A B M A 4820 M B 8 K A B R H 3808 M I 4800 A I H W I 1 M I 4820 A I H W I 1 W 3860 Z
uw_pass: W 3861 Z W 3862 Z
uw_edge: R H 3862 ifge H 12 J uw_pass_done end M I 4700 A I H R E I E E Z J uw_next M I 4720 A I H R E I W 3874 E M I 4740 A I H R E I W 3875 E M I 4760 A I H R E I W 3876 E M I 4780 A I H R E I W 3877 E C S uw_visit R E 3870 N E Z J uw_output R E 3874 R F 3875 W 3874 F W 3875 E R E 3876 R F 3877 W 3876 F W 3877 E C S uw_visit R E 3870 N E Z J uw_output
uw_next: R E 3862 I E 1 W 3862 E J uw_edge
uw_pass_done: R E 3861 E E Z J uw_result R E 3860 I E 1 W 3860 E ifl E 8 J uw_pass end
uw_result: R H 3809 M I 4800 A I H R E I ife E Z W 3870 3 J uw_output end W 3878 E M I 4820 A I H R E I W 3879 E R E 4000 W 3880 E W 3881 1 C S uw_ratio ifn A Z W 3870 2 end J uw_output
uw_visit: R H 3874 M I 4800 A I H R E I E E Z O S P W 3878 E M I 4820 A I H R E I W 3879 E R E 3876 W 3880 E R E 3877 W 3881 E C S uw_ratio ifn A Z W 3870 2 O S P end R H 3875 M I 4800 A I H R E I R F 3882 ife E Z W I F M I 4820 A I H R E 3883 W I E W 3861 1 O S P end ifn E F W 3870 1 O S P end M I 4820 A I H R E I R F 3883 ifn E F W 3870 1 end O S P
uw_gcd: E B Z O S P C S app_div M A B M B C J uw_gcd
uw_ratio: R A 3880 R B 3881 C S uw_gcd M G A R A 3880 M B G C S app_div W 3880 A R A 3881 M B G C S app_div W 3881 A
 R A 3878 R B 3881 C S uw_gcd M G A R A 3878 M B G C S app_div W 3878 A R A 3881 M B G C S app_div W 3881 A
 R A 3879 R B 3880 C S uw_gcd M G A R A 3879 M B G C S app_div W 3879 A R A 3880 M B G C S app_div W 3880 A
 M A 9841 R B 3880 C S app_div R E 3878 ifg E A M A -1 O S P end P E B W 3882 E M A 9841 R B 3881 C S app_div R E 3879 ifg E A M A -1 O S P end P E B W 3883 E M A Z O S P
uw_output: ${emit('uw_query')}${num(4000)}M A 32 C S doc_report_put R A 3808 A A 65 C S doc_report_put ${emit('uw_to')}R A 3809 A A 65 C S doc_report_put ${row(1)}R E 3870 ife E 1 ${emit('uw_conflict')}J uw_footer end ife E 2 ${emit('uw_overflow')}J uw_footer end ife E 3 ${emit('uw_missing')}J uw_footer end ${emit('uw_exact')}${num(3882)}M A 47 C S doc_report_put ${num(3883)}M A 32 C S doc_report_put R A 3809 A A 65 C S doc_report_put ${row(2)}${emit('uw_consistent')}
uw_footer: ${row(3)}${emit('uw_hint')}O S P
${lit('uw_command',':convert ')}${lit('uw_query','Convert ')}${lit('uw_to',' to ')}${lit('uw_exact','Exact ')}${lit('uw_conflict','Contradictory component')}${lit('uw_overflow','Exact ratio exceeds 9841')}${lit('uw_missing','No path between these units')}${lit('uw_consistent','Source component consistent')}${lit('uw_hint',':convert A H 3  ?:query')}
${finish(unitRecords,'A|B|P|Q means 1 A = P/Q B')}`;
export const UNIT_DEFINITION_WEB=doc(419,'unit-web','toolshed','Unit Definition Web',unitWeb,unitRecords,'Save A|B|P|Q: unit letters A..H, P,Q=1..9; 1 A equals P/Q B. Links work both ways. Enter :convert A H 3 (amount 1..9); ? recalls it. Exact fractions propagate through the source component, checking every reachable definition, including self-links. Conflicts report a contradiction; reduced numerators or denominators above 9841 report overflow. Disconnected components are not checked; a missing path is reported. Letters are local unit names, not built-in units. Definitions persist; launch resets the query to 3 A into H.');
MAKER_NOTEBOOKS.push(UNIT_DEFINITION_WEB);
// 13*13 capped-demand states; a feasible optimum needs at most 24 bundles.
// Costs <=2376, encoded predecessor (state*13 + slot+1) <=2196.
const bundleRecords=['Small crate|2|1|5','Canal basket|1|3|6','Mixed box|3|2|8'];
const bundles=`
doc_app_init: W 3808 5 W 3809 4 J mk_seed
doc_app_validate: C S mk_fields N A Z O S P R E 3830 N E 4 J mk_bad C S mk_name N A Z O S P ${field(1,3840,0,9)}${field(2,3841,0,9)}R E 3840 A E G E E Z J mk_bad ${field(3,3842,1,99)}M A Z O S P
doc_app_command: R E A ifn E 58 M A Z O S P end ifl B 9 J mk_bad end M J A M K @mb_command M H 6
mb_command_check: R E J R F K N E F J mk_bad I J 1 I K 1 I H -1 N H Z J mb_command_check M A J S B 6 C S mk_fields N A Z O S P R E 3830 N E 2 J mk_bad ${field(0,3840,0,12)}${field(1,3841,0,12)}R E 3840 W 3808 E W 3809 G J mk_session
doc_app_key: ifge A 65 ifle A 90 A A 32 end end ${keyHelp} ife A 63 W doc_message @mb_hint M A 1 O S P end ife A 106 R H doc_selected M K 12
mb_jump: I H 1 ifge H 12 M H Z end M I 4780 A I H R E I ifg E Z W doc_selected H M A 1 O S P end I K -1 N K Z J mb_jump end M A Z O S P
doc_app_report: C S mk_collect M A 4780 M B 12 K A B M A 5000 M B 169 K A B M H Z
mb_initialize: M I 4800 A I H W I 9841 I H 1 ifl H 169 J mb_initialize end W 4800 Z W 3880 Z
mb_state: R E 3880 ifge E 169 J mb_done end R A 3880 M B 13 C S app_div W 3881 A W 3882 C R E 3808 ifg A E J mb_next_state end R E 3809 ifg C E J mb_next_state end M I 4800 R E 3880 A I E R E I W 3883 E E E 9841 J mb_next_state W 3884 Z
mb_offer: R H 3884 ifge H 12 J mb_next_state end M I 4700 A I H R E I E E Z J mb_next_offer M I 4720 A I H R E I R F 3881 A E F R F 3808 ifg E F M E F end P E 13 M I 4740 A I H R G I R F 3882 A G F R F 3809 ifg G F M G F end A E G R F 3880 E E F J mb_next_offer M I 4760 A I H R G I R F 3883 A G F M I 4800 A I E R F I ifge G F J mb_next_offer end W I G M I 5000 A I E R F 3880 P F 13 A F H I F 1 W I F
mb_next_offer: R E 3884 I E 1 W 3884 E J mb_offer
mb_next_state: R E 3880 I E 1 W 3880 E J mb_state
mb_done: R E 3808 P E 13 R F 3809 A E F W 3880 E M I 4800 A I E R E I W 3870 E W 3872 Z W 3873 Z E E 9841 J mb_output
mb_trace: R E 3880 E E Z J mb_types M I 5000 A I E R A I M B 13 C S app_div W 3880 A I C -1 M I 4780 A I C R E I I E 1 W I E R E 3873 I E 1 W 3873 E J mb_trace
mb_types: M H Z
mb_count: M I 4780 A I H R E I ifn E Z R E 3872 I E 1 W 3872 E end I H 1 ifl H 12 J mb_count end
mb_output: ${emit('mb_need')}${num(3808)}M A 47 C S doc_report_put ${num(3809)}${row(1)}R E 3870 ife E 9841 ${emit('mb_none')}else ${emit('mb_cost')}${num(3870)}${emit('mb_count_text')}${num(3873)}end ${row(2)}${emit('mb_selected')}R F doc_selected I F 1 C S mk_two ${emit('mb_quantity')}R H doc_selected M I 4780 A I H R F I C S mk_int ${row(3)}${emit('mb_keys')}O S P
${lit('mb_command',':need ')}${lit('mb_need','Required A/B ')}${lit('mb_cost','Cost ')}${lit('mb_count_text',' Bundles ')}${lit('mb_none','Demand cannot be covered')}${lit('mb_selected','Slot ')}${lit('mb_quantity',' buy ')}${lit('mb_keys','J:next buy ?:query H:fields')}${lit('mb_hint',':need 5|4 (each 0..12)')}
${finish(bundleRecords,'NAME|A0-9|B0-9|COST1-99')}`;
export const MARKET_BUNDLES=doc(420,'market-bundles','market','Market Bundle Planner',bundles,bundleRecords,'Save NAME|A|B|COST for unlimited bundles containing 0..9 of each of two resources, with at least one nonzero quantity and cost 1..99 tokens. Enter :need 5|4 for demands 0..12 each; ? recalls this command. Native dynamic programming finds minimum cost to meet or exceed both demands; buying extra is allowed. J selects the next bundle used by the plan; each selected slot reports its purchase count. Equal-cost plans keep the first discovered transition, processing capped A then B totals in increasing order and bundles in slot order. This is unlimited two-resource covering, not a fixed-inventory packing problem. Demands are session-only and reset to 5 and 4 after launch; bundle definitions persist.');
MAKER_NOTEBOOKS.push(MARKET_BUNDLES);
MAKER_NOTEBOOKS.sort((a,b)=>a.number-b.number);
