import type {TextSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
/** All search, cartridge reads, validation, selection and formatting execute on Troika. */
export const ECLIPSE_EXPLORER: TextSoftware = {
 number:318,id:'eclipse-explorer',site:'observatory',kind:'text',keyHandler:true,
 title:'Eclipse Explorer',inputs:['S/L year'],outputs:['NASA eclipse catalog'],
 description:'Browse NASA solar (S2024 or S-1999) or lunar (L2025) eclipses, astronomical years -1999..3000 (2000 BCE through 3000 CE; year 0 is 1 BCE). Enter loads a year; Left/Right select an eclipse, D cycles details, H explains time and calendar. Dates use Julian before 1582-10-15 and Gregorian thereafter. Greatest-eclipse clocks are TD, not UTC; DeltaT is the source model in seconds. Coordinates are rounded source degrees, not a local visibility forecast. Lunar Magnitude means penumbral magnitude; D also shows umbral magnitude and durations. Types: solar P partial, A annular, T total, H hybrid; lunar N penumbral, P partial, T total. Source model precision is not observational certainty.',
 examples:[{input:'S2024',output:['Date 2024-04-08 Gregorian','18:18:29 TD Solar T','Event 1/2','Magnitude 1.0566','Gamma 0.3431'].map(line=>line.padEnd(27)).join('')+'Arrows:event D:more H:help'},{input:'L2025'},{input:'S-2000',error:true}],
 algorithm:`
; Eclipse cartridge state3200..3224, selected-year records3300..3461;
; one physical block4000..4242; wide decimal scratch3250..3254.
app_text_init: W 3200 Z W 3201 Z W 3202 Z W 2485 Z C S ec_help O S P
app_text_key:
 W 3224 A C S text_ascii
 E A 72 J ec_key_help E A 104 J ec_key_help
 R A 3224 E A 83 J ec_left E A 84 J ec_right
 C S text_ascii E A 68 J ec_more E A 100 J ec_more M A Z O S P
ec_key_help: C S ec_help M A 1 O S P
ec_left: R A 3200 E A Z J ec_unhandled R A 3201 I A -1 ifl A Z R A 3200 I A -1 end W 3201 A J ec_key_draw
ec_right: R A 3200 E A Z J ec_unhandled R A 3201 I A 1 R B 3200 ifge A B M A Z end W 3201 A J ec_key_draw
ec_more: R A 3200 E A Z J ec_unhandled R A 3202 I A 1 ifge A 4 M A Z end W 3202 A
ec_key_draw: C S ec_draw M A 1 O S P
ec_unhandled: M A Z O S P
app_compute:
 W 3200 Z W 3201 Z W 3202 Z R A 2610 E A 5 J ec_input_size N A 6 J ec_invalid
ec_input_size:
 R A 2552 M B Z E A 83 J ec_kind E A 115 J ec_kind M B 1 E A 76 J ec_kind N A 108 J ec_invalid
ec_kind: W 3203 B M G 2553 W 3223 1 R A 2610 ife A 6 R A G N A 45 J ec_invalid I G 1 W 3223 -1 end M H 4 M L Z
ec_year: R A G ifl A 48 J ec_invalid end ifg A 57 J ec_invalid end S A 48 P L 10 A L A I G 1 I H -1 N H Z J ec_year
 R A 3223 ifl A Z E L Z J ec_invalid P L -1 end ifl L -1999 J ec_invalid end ifg L 3000 J ec_invalid end W 3204 L
 M A L A A 2000 M B 100 C S app_div W 3205 C R B 3203 P B 51 A A B P A 2 A A 4004 W 3206 A
 M C Z C S ec_block ifn A Z J ec_missing end
 R A 4000 N A 69 J ec_bad R A 4001 N A 67 J ec_bad R A 4002 N A 2 J ec_bad R A 4003 N A 102 J ec_bad
 R I 3206 R A I W 3207 A I I 1 R A I ifl A 117 J ec_bad end ifg A 9841 J ec_bad end W 3208 A
 R C 3207 ifl C 1 J ec_bad end C S ec_block ifn A Z J ec_missing end
 R A 4000 N A 69 J ec_bad R A 4001 N A 67 J ec_bad R A 4002 N A 76 J ec_bad R A 4003 N A 2 J ec_bad
 R A 4004 R B 3203 N A B J ec_bad
 R A 3204 R B 3205 S A B R B 4005 N A B J ec_bad
 R A 4007 R B 3203 P B 2 A B 25 N A B J ec_bad W 3209 A
 R A 4008 P A B A A 117 R B 3208 N A B J ec_bad
 R A 4009 N A 16 J ec_bad R A 4010 N A 117 J ec_bad R A 4011 N A 1 J ec_bad R A 4012 N A 1 J ec_bad
 R A 4013 W 3210 A
 R I 3205 A I 4016 R A I I I 1 R B I ifl A Z J ec_bad end ifl B A J ec_bad end R C 4008 ifg B C J ec_bad end
 S B A ifg B 6 J ec_bad end W 3211 B R B 3209 P A B A A 117 W 3212 A
 R A 3211 P A B R B 3212 A A B W 3213 A
 W 3214 Z W 3215 Z W 3216 Z
; Scan exact logical file, checksumming every cell before exposing selected records.
ec_scan_block: M I 4000 W 3217 I M A 243 R B 3208 R C 3214 S B C ifl B A M A B end W 3218 A
ec_scan_cell: R I 3217 R A I R B 3214
 ifn B 13 R C 3215 P C 2 A C A W 3215 C else R C 3215 P C 2 W 3215 C end
 R C 3212 ifge B C R C 3213 ifl B C R I 3216 A I 3300 W I A R I 3216 I I 1 W 3216 I end end
 I B 1 W 3214 B R I 3217 I I 1 W 3217 I R A 3218 I A -1 W 3218 A N A Z J ec_scan_cell
 R A 3214 R B 3208 E A B J ec_checked
 R C 3207 I C 1 W 3207 C C S ec_block ifn A Z J ec_missing end J ec_scan_block
ec_checked: R A 3215 R B 3210 N A B J ec_bad R A 3211 W 3200 A C S ec_draw M A Z O S P
; Restore the mounted client volume before any loader/FAT generation check.
ec_block: M A 1 M B 22 M D 4000 C S block_io W 0s_BL Z O S P
ec_invalid: M A -1 O S P
ec_missing: W 2620 Z M G @ec_missing_text C S ec_text J ec_problem
ec_bad: W 2620 Z M G @ec_bad_text C S ec_text
ec_problem: W 3200 Z W 2621 Z M A Z O S P
ec_help: W 2620 Z W 2621 Z
 M G @ec_help1 C S ec_text C S ec_row
 M G @ec_help2 C S ec_text C S ec_row
 M G @ec_help3 C S ec_text C S ec_row
 M G @ec_help4 C S ec_text C S ec_row
 M G @ec_help5 C S ec_text C S ec_row
 M G @ec_help6 C S ec_text C S ec_row
 M A Z O S P
ec_draw: W 2620 Z W 2621 Z R A 3200 E A Z O S P
 R A 3201 R B 3209 P A B A A 3300 W 3220 A
 M G @ec_date C S ec_text R F 3204 C S ec_year_number M A 45 C S app_put M A 1 C S ec_field C S ec_two M A 45 C S app_put M A 2 C S ec_field C S ec_two
 M A 6 C S ec_field M G @ec_jul ifn F Z M G @ec_greg end C S ec_text C S ec_row
 M A 3 C S ec_field C S ec_two M A 58 C S app_put M A 4 C S ec_field C S ec_two M A 58 C S app_put M A 5 C S ec_field C S ec_two
 M G @ec_td C S ec_text R A 3203 M G @ec_solar ifn A Z M G @ec_lunar end C S ec_text
 M A 13 C S ec_field M G @ec_stypes R A 3203 ifn A Z M G @ec_ltypes end A G F R A G C S app_put C S ec_row
 R A 3202 E A 1 J ec_details E A 2 J ec_durations E A 3 J ec_extra
 M G @ec_event C S ec_text R F 3201 I F 1 C S ec_num M A 47 C S app_put R F 3200 C S ec_num C S ec_row
 M G @ec_mag R A 3203 ifn A Z M G @ec_penmag end C S ec_text M A 19 C S ec_fixed C S ec_row
 M G @ec_gamma C S ec_text M A 15 C S ec_fixed C S ec_row J ec_footer
ec_details:
 M G @ec_saros C S ec_text M A 12 C S ec_field C S ec_num M G @ec_cat C S ec_text M A 7 M B Z C S ec_wide C S ec_row
 M G @ec_dt C S ec_text M A 9 C S ec_field W 3250 F R A 3209 I A -1 C S ec_field W 3251 F W 3254 Z C S ec_wide_loaded M G @ec_seconds C S ec_text C S ec_row
 M G @ec_lat C S ec_text M A 17 C S ec_field C S ec_num M G @ec_lon C S ec_text M A 18 C S ec_field C S ec_num C S ec_row J ec_footer
ec_durations: R A 3203 N A Z J ec_lunar_detail
 M G @ec_width C S ec_text M A 22 C S ec_field C S ec_nullable C S ec_row
 M G @ec_alt C S ec_text M A 21 C S ec_field C S ec_nullable C S ec_row
 M G @ec_dur C S ec_text M A 23 C S ec_field C S ec_nullable C S ec_row J ec_footer
ec_lunar_detail:
 M G @ec_umb C S ec_text M A 21 C S ec_fixed C S ec_row
 M G @ec_udur C S ec_text M A 24 C S ec_field C S ec_tenths C S ec_row
 M G @ec_tdur C S ec_text M A 25 C S ec_field C S ec_tenths C S ec_row
ec_extra:
 R A 3203 ifn A Z M G @ec_pdur C S ec_text M A 23 C S ec_field C S ec_tenths else M G @ec_source C S ec_text end C S ec_row
 M G @ec_lunation C S ec_text M A 10 M B Z C S ec_wide C S ec_row
 M G @ec_exact_type C S ec_text M A 13 C S ec_field P F 3 M G @ec_sfull R A 3203 ifn A Z M G @ec_lfull end A G F C S ec_text
 M G @ec_class C S ec_text M A 14 C S ec_field P F 3 M G @ec_sclass R A 3203 ifn A Z M G @ec_lclass end A G F C S ec_text C S ec_row
 ec_footer: M G @ec_keys C S ec_text M A Z O S P
ec_field: R I 3220 A I A R F I O S P
ec_nullable: E F -9841 M G @ec_unknown E F -9841 J ec_text J ec_num
ec_tenths: E F -9841 M G @ec_unknown E F -9841 J ec_text M A F M B 10 C S app_div U S C M F A C S ec_num M A 46 C S app_put O S A A A 48 J app_put
ec_two: ifl F 10 U S F M A 48 C S app_put O S F end J ec_num
ec_year_number:
 ifl F Z M A 45 C S app_put F F A end
 ifl F 1000 M A 48 C S app_put end ifl F 100 M A 48 C S app_put end ifl F 10 M A 48 C S app_put end
 ec_num: M B Z M A F ifl A Z M A 45 C S app_put M A F F A A end M F A M H Z
ec_num_loop: M A F M B 10 C S app_div U S C I H 1 M F A N F Z J ec_num_loop
ec_num_digits: O S A A A 48 C S app_put I H -1 N H Z J ec_num_digits O S P
ec_fixed: M B 1
ec_wide: W 3254 B R I 3220 A I A R A I W 3250 A I I 1 R A I W 3251 A
ec_wide_loaded: R A 3251
 ifl A Z M A 45 C S app_put R A 3250 R B 3251 F B A ifn A Z M C 729 S C A M A C I B -1 end W 3250 A W 3251 B end
 W 3252 Z
ec_wide_loop: R A 3251 M B 10 C S app_div W 3251 A M A C P A 729 R B 3250 A A B M B 10 C S app_div W 3250 A U S C R A 3252 I A 1 W 3252 A R A 3250 R B 3251 A A B N A Z J ec_wide_loop
 R A 3254 E A Z J ec_wide_digits
 ec_wide_pad: R A 3252 ifge A 5 J ec_wide_digits end U S Z I A 1 W 3252 A J ec_wide_pad
ec_wide_digits: R A 3252 E A Z O S P R B 3254 ifn B Z ife A 4 M A 46 C S app_put end end O S A A A 48 C S app_put R A 3252 I A -1 W 3252 A J ec_wide_digits
ec_text: R A G E A Z O S P C S app_put I G 1 J ec_text
ec_row: R A 2620 M B 27 C S app_div E C Z O S P M H 27 S H C
ec_row_loop: M A 32 C S app_put I H -1 N H Z J ec_row_loop O S P

ec_stypes: 80 65 84 72 80 80 84 65 65 65 65 72 72 65 84 84 72 84 84
ec_ltypes: 80 78 84 84 84 78 78 78
ec_help1: 83 45 49 57 57 57 32 111 114 32 76 50 48 50 53 59 32 69 110 116 101 114 0
ec_help2: 89 101 97 114 115 32 45 49 57 57 57 46 46 51 48 48 48 32 40 48 61 49 66 67 69 41 0
ec_help3: 76 101 102 116 47 82 105 103 104 116 32 101 118 101 110 116 59 32 68 32 100 101 116 97 105 108 115 0
ec_help4: 84 68 32 99 108 111 99 107 59 32 85 84 61 84 68 32 109 105 110 117 115 32 100 84 0
ec_help5: 74 117 108 105 97 110 32 98 101 102 111 114 101 32 49 53 56 50 45 49 48 45 49 53 0
ec_help6: 65 110 99 105 101 110 116 32 85 84 32 105 115 32 117 110 99 101 114 116 97 105 110 0
ec_missing_text: 69 99 108 105 112 115 101 32 99 97 114 116 114 105 100 103 101 32 109 105 115 115 105 110 103 0
ec_bad_text: 69 99 108 105 112 115 101 32 99 97 114 116 114 105 100 103 101 32 100 97 109 97 103 101 100 0
ec_date: 68 97 116 101 32 0
ec_jul: 32 74 117 108 105 97 110 0
ec_greg: 32 71 114 101 103 111 114 105 97 110 0
ec_td: 32 84 68 32 0
ec_solar: 83 111 108 97 114 32 0
ec_lunar: 76 117 110 97 114 32 0
ec_event: 69 118 101 110 116 32 0
ec_of: 47 0
ec_keys: 65 114 114 111 119 115 58 101 118 101 110 116 32 68 58 109 111 114 101 32 72 58 104 101 108 112 0
ec_mag: 77 97 103 110 105 116 117 100 101 32 0
ec_gamma: 71 97 109 109 97 32 0
ec_lat: 76 97 116 32 0
ec_lon: 32 76 111 110 32 0
ec_dt: 68 101 108 116 97 84 32 0
ec_seconds: 32 115 101 99 111 110 100 115 0
ec_saros: 83 97 114 111 115 32 0
ec_cat: 32 67 97 116 97 108 111 103 32 0
ec_width: 80 97 116 104 32 107 109 32 0
ec_alt: 32 83 117 110 32 100 101 103 32 0
ec_dur: 67 101 110 116 114 97 108 32 115 101 99 111 110 100 115 32 0
ec_pen: 80 101 110 32 109 97 103 32 0
ec_umb: 85 109 98 32 109 97 103 32 0
ec_pdur: 80 101 110 117 109 98 114 97 108 32 109 105 110 32 0
ec_udur: 80 97 114 116 105 97 108 32 109 105 110 32 0
ec_tdur: 84 111 116 97 108 32 109 105 110 32 0
ec_source: 78 65 83 65 32 99 97 116 97 108 111 103 59 32 72 58 116 105 109 101 32 110 111 116 101 115 0
ec_unknown: 110 47 97 0
ec_blank: 32 0
ec_clock: 58 0
ec_dash: 45 0

ec_lunation: 76 117 110 97 116 105 111 110 32 0
ec_exact_type: 84 121 112 101 32 0
ec_class: 32 67 108 97 115 115 32 0
ec_sfull: 80 0 0 65 0 0 84 0 0 72 0 0 80 98 0 80 101 0 84 109 0 65 109 0 65 110 0 65 45 0 65 43 0 72 50 0 72 51 0 65 115 0 84 45 0 84 115 0 72 109 0 84 110 0 84 43 0
ec_lfull: 80 0 0 78 0 0 84 0 0 84 43 0 84 45 0 78 120 0 78 98 0 78 101 0
ec_sclass: 45 110 0 45 112 0 45 116 0 110 45 0 110 110 0 110 112 0 112 45 0 112 110 0 116 45 0
ec_lclass: 45 97 0 45 104 0 45 112 0 45 116 0 97 45 0 104 45 0 112 45 0 112 112 0 112 116 0 116 45 0 116 112 0
ec_penmag: 80 101 110 32 109 97 103 110 105 116 117 100 101 32 0
${POSITIVE_DIVISION}`
};
