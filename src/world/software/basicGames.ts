import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const ascii=(s:string)=>[...s].map(c=>c.charCodeAt(0)).join(' ');
const label=(s:string)=>`${ascii(s)} 0`;
const panel=(s:string)=>`M J @basic_initial M I game_board M H ${s.length}
basic_copy: R E J W I E I J 1 I I 1 I H -1 N H Z J basic_copy O S P
basic_initial: ${ascii(s)}`;
// Fixed-width decimal fields preserve the board's spatial layout.
const digits=`basic_digits: M B 100 C S app_div A A 48 W I A I I 1 M A C M B 10 C S app_div A A 48 W I A I I 1 A C 48 W I C O S P
${POSITIVE_DIVISION}`;
export const BASIC_GAMES:BoardSoftware[]=[
 {number:170,kind:'board',id:'fuel-landing',site:'orbit',title:'Fuel Landing',columns:8,rows:3,stepKey:'n',counterLabel:'Ticks',controls:'Enter:burn N:fall R:restart',inputs:['Burn 0..4','N: next tick'],outputs:['Height/speed','Fuel/burn','Landing'],
 description:'A small lunar-landing practice game inspired by early BASIC. H is height, V is downward speed (minus means rising), F is fuel and B is selected burn. Select a digit on the bottom row and press Enter; N advances one tick. Gravity adds two to speed, each fuel unit cancels one, then height falls by the new speed. Fuel caps the actual burn. Touch down at speed 0..3 to land safely. Starting height 40 and fuel 30; R restarts, F1 exits.',
 algorithm:`game_reset: W 3200 40 W 3201 Z W 3202 30 W 3203 Z W game_message @land_prompt C S basic_panel J land_draw
basic_panel: ${panel('H040V000F030B000..01234.')}
game_move: R E game_status N E Z O S P ifl A 18 O S P end ifg A 22 O S P end S A 18 W 3203 A J land_draw
game_key: E A 1 J land_tick E A -26 J land_tick M A Z O S P
land_tick: R E game_status ifn E Z M A Z O S P end R G 3203 R H 3202 ifg G H M G H end S H G W 3202 H R K 3201 I K 2 S K G W 3201 K R L 3200 S L K W 3200 L C S game_count_move ifle L Z W 3200 Z ifle K 3 W game_status 1 W game_message @land_win else W game_status 2 W game_message @land_lose end end C S land_draw M A 1 O S P
land_draw: R A 3200 M I 2901 C S basic_digits R A 3201 ifl A Z F A A W 2904 45 else W 2904 86 end M I 2905 C S basic_digits R A 3202 M I 2909 C S basic_digits R A 3203 M I 2913 C S basic_digits O S P
land_prompt: ${label('H height V speed F fuel')}
land_win: ${label('Soft landing! R to retry')}
land_lose: ${label('Hard landing. R to retry')}
${digits}`,
 examples:[{moves:[],steps:6,board:'H000V012F030B000..01234.',status:2,movesMade:6}]},
 {number:171,kind:'board',id:'cannon-range',site:'scorebook',title:'Cannon Range',columns:8,rows:3,stepKey:'n',counterLabel:'Shots',controls:'Enter:edit N:fire R:restart',inputs:['X speed','Y lift','N: fire'],outputs:['Range/target','Shot feedback'],
 description:'An artillery-range puzzle using a discrete trajectory: horizontal speed X, upward launch speed Y, gravity one, equal launch and target height. Range is 2*X*Y. Enter on the first row cycles X (left half) or Y (right half), each 1..9. N fires; D shows distance and T the target. Hit range 84 in six shots. Below/above target feedback follows each shot; a visible eight-column flight trace marks landing position, with + beyond the range. R restarts and F1 exits.',
 algorithm:`game_reset: W 3200 3 W 3201 3 W 3202 Z W game_message @cannon_prompt C S basic_panel J cannon_draw
basic_panel: ${panel('X003Y003D000T084........')}
game_move: R E game_status N E Z O S P ifge A 8 O S P end M I 3200 ifge A 4 I I 1 end R E I I E 1 ifg E 9 M E 1 end W I E J cannon_draw
game_key: E A 1 J cannon_fire E A -26 J cannon_fire M A Z O S P
cannon_fire: R E game_status ifn E Z M A Z O S P end R G 3200 R H 3201 P G H P G 2 W 3202 G C S game_count_move W game_message @cannon_short ifg G 84 W game_message @cannon_long end ife G 84 W game_status 1 W game_message @cannon_win else R E game_moves ife E 6 W game_status 2 W game_message @cannon_lose end end C S cannon_draw M A 1 O S P
cannon_draw: R A 3200 M I 2901 C S basic_digits R A 3201 M I 2905 C S basic_digits R A 3202 M I 2909 C S basic_digits M I 2916 M E 8
cannon_clear: W I 46 I I 1 I E -1 N E Z J cannon_clear R E game_moves E E Z O S P R A 3202 M B 12 C S app_div M E 42 ifg A 7 M A 7 M E 43 end M I 2916 A I A W I E O S P
cannon_prompt: ${label('Edit X/Y; target is 84')}
cannon_short: ${label('Short: increase X or Y')}
cannon_long: ${label('Long: decrease X or Y')}
cannon_win: ${label('Direct hit! R to retry')}
cannon_lose: ${label('Six shots used. R retries')}
${digits}`,
 examples:[{moves:[],steps:1,board:'X003Y003D018T084.*......',status:0,movesMade:1},{moves:[0,0,0,4,4,4,4],steps:1,board:'X006Y007D084T084.......*',status:1,movesMade:1}]},
 {number:172,kind:'board',id:'hurkle-hunt',site:'moss',title:'Hurkle Hunt',columns:8,rows:8,counterLabel:'Tries',inputs:['Guess square'],outputs:['Compass hint','Found or missed'],
 description:'Find a hiding Hurkle in six guesses on an eight-by-eight meadow. Enter guesses the selected square. Compass hints point from your guess toward the creature; north is up, east is right. Tried squares become dots, initially unknown squares are question marks. Repeated guesses cost nothing. The fixed practice hideout makes R a reproducible replay. F1 exits. Inspired by the early BASIC Hurkle game.',
 algorithm:`game_reset: M I game_board M E 64
hurkle_clear: W I 63 I I 1 I E -1 N E Z J hurkle_clear W game_message @hurkle_prompt O S P
game_move: R E game_status N E Z O S P M G A M I game_board A I G R E I N E 63 O S P W I 46 C S game_count_move ife G 21 W I 72 W game_status 1 W game_message @hurkle_win O S P end R E game_moves ife E 6 W 2921 72 W game_status 2 W game_message @hurkle_lose O S P end M A G M B 8 C S app_div M G Z ifl A 2 M G 6 else ifg A 2 M G 0 else M G 3 end end ifl C 5 I G 2 else ife C 5 I G 1 end end M I @hurkle_hints A I G R E I W game_message E O S P
hurkle_hints: @hurkle_nw @hurkle_n @hurkle_ne @hurkle_w @hurkle_here @hurkle_e @hurkle_sw @hurkle_s @hurkle_se
hurkle_nw: ${label('Look northwest')}
hurkle_n: ${label('Look north')}
hurkle_ne: ${label('Look northeast')}
hurkle_w: ${label('Look west')}
hurkle_here: ${label('Right here')}
hurkle_e: ${label('Look east')}
hurkle_sw: ${label('Look southwest')}
hurkle_s: ${label('Look south')}
hurkle_se: ${label('Look southeast')}
hurkle_prompt: ${label('Find the Hurkle in 6 tries')}
hurkle_win: ${label('Found the Hurkle! R retry')}
hurkle_lose: ${label('Hurkle revealed. R retry')}
${POSITIVE_DIVISION}`,
 examples:[{moves:[0,21],board:'.'+'?'.repeat(20)+'H'+'?'.repeat(42),status:1,movesMade:2}]},
 {number:173,kind:'board',id:'twenty-one',site:'cardtable',title:'Twenty-One Practice',columns:8,rows:4,stepKey:'n',counterLabel:'Plays',controls:'Enter:hit N:stand R:restart',inputs:['Hit or stand'],outputs:['Player cards','Dealer cards','Result'],
 description:'A deterministic blackjack practice deal, inspired by early BASIC card games. P and D show player/dealer cards (A=ace, T=ten); the dealer hole card stays hidden until you stand with N. Enter hits. Aces count eleven until subtracting ten prevents a bust; the dealer draws to 17 and stands on soft 17. Higher non-bust total wins, equal totals push. Bottom row shows player total and dealer total (hidden until stand). Before your first play, select 1, 2, 3 or 4 on the deal row and Enter to choose a different practice hand. No betting or split rules. R repeats the same shoe and F1 exits.',
 algorithm:`game_reset: W 3200 12 W 3201 Z W 3202 16 W 3203 Z W 3204 Z W 3205 3 W 3206 2 W 3207 6 W game_message @card_prompt C S basic_panel J card_draw
basic_panel: ${panel('P75.....DT?.....1234DEALP012D???')}
game_move: R E game_status N E Z O S P R E game_moves ife E Z ifge A 16 ifle A 19 S A 16 P A 5 M J @card_deals A J A R G J M E G C S card_symbol W 2901 E I J 1 R H J M E H C S card_symbol W 2902 E A G H W 3200 G W 3201 Z ife H 11 W 3201 1 end S G H ife G 11 W 3201 1 end I J 1 R G J M E G C S card_symbol W 2909 E I J 1 R H J W 3207 H A G H W 3202 G I J 1 R E J W 3204 E J card_draw end end end C S card_next M H A R G 3200 A G H R K 3201 ife H 11 I K 1 end
card_soft: ifg G 21 ifg K Z S G 10 I K -1 J card_soft end end W 3200 G W 3201 K R I 3205 A I game_board M E H C S card_symbol W I E R E 3205 I E 1 W 3205 E C S game_count_move ifg G 21 W game_status 2 W game_message @card_bust end C S card_draw O S P
game_key: E A 1 J card_stand E A -26 J card_stand M A Z O S P
card_stand: R E game_status ifn E Z M A Z O S P end R E 3207 C S card_symbol W 2910 E
card_dealer: R G 3202 ifge G 17 J card_result end C S card_next R G 3202 A G A R K 3203 ife A 11 I K 1 end
card_dsoft: ifg G 21 ifg K Z S G 10 I K -1 J card_dsoft end end W 3202 G W 3203 K M E A C S card_symbol R I 3206 A I 2909 W I E R E 3206 I E 1 W 3206 E J card_dealer
card_result: C S game_count_move R G 3200 R H 3202 W game_status 1 W game_message @card_win ifle H 21 ifg H G W game_status 2 W game_message @card_lose else ife H G W game_status 3 W game_message @card_push end end end C S card_draw R A 3202 M I 2929 C S basic_digits M A 1 O S P
card_next: R I 3204 A I @card_shoe R A I R E 3204 I E 1 W 3204 E O S P
card_symbol: ife E 11 M E 65 else ife E 10 M E 84 else A E 48 end end O S P
card_draw: R A 3200 M I 2925 C S basic_digits O S P
card_deals: 7 5 10 6 0 11 7 9 7 1 10 6 10 7 2 9 9 10 9 3
card_shoe: 9 2 11 5 10 3 8 4
card_prompt: ${label('Enter hits; N stands')}
card_bust: ${label('Player bust. R to retry')}
card_win: ${label('Player wins! R to retry')}
card_lose: ${label('Dealer wins. R to retry')}
card_push: ${label('Push: equal totals. R retry')}
${digits}`,
 examples:[{moves:[0],steps:1,board:'P759....DT62....1234DEALP021D018',status:1,movesMade:2},{moves:[],steps:1,board:'P75.....DT69....1234DEALP012D025',status:1,movesMade:1}]},
];
