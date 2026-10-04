import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const panel=`classic_copy: M I game_board M J @classic_initial M K game_cells
classic_copy_loop: R E J W I E I J 1 I I 1 I K -1 N K Z J classic_copy_loop O S P
classic_number: M B 1000 C S app_div A A 48 W J A M A C M B 100 C S app_div A A 48 M J/1 A M A C M B 10 C S app_div A A 48 M J/2 A A C 48 M J/3 C O S P
${POSITIVE_DIVISION}`;
export const CLASSIC_GAMES_2:BoardSoftware[]=[
{number:178,kind:'board',id:'acey-deucey',site:'cardtable',title:'Acey-Deucey Table',columns:8,rows:5,counterLabel:'Deals',controls:'Enter:bet or pass R:restart',inputs:['Stake 1/5/9/pass'],outputs:['Bank','Open pair','Last draw'],description:'A card-table probability game inspired by early BASIC Acey-Ducey. Start with 20 coins; finish eight deals with at least 30. LOW and HIGH show the two open ranks (ace=1, jack=11, queen=12, king=13). Bet that the next draw lies strictly between them: equal ranks lose. Choose 1, 5, 9, or P on the bottom row and Enter. P passes free; unavailable stakes do nothing. LAST shows the previous draw, while LOW/HIGH advance to the next pair. Bank zero ends play. The fixed practice shoe repeats with R; F1 exits.',
algorithm:`game_reset: W 3200 20 W 3201 Z C S classic_copy W game_message @acey_prompt C S acey_pair J acey_render
acey_pair: R E game_moves P E 3 M I @acey_shoe A I E R E I W 3202 E I I 1 R E I W 3203 E I I 1 R E I W 3204 E O S P
game_move: R E game_status N E Z O S P ifl A 32 O S P end S A 32 M B 2 C S app_div M I @acey_stakes A I A R H I R G 3200 ifg H G W game_message @acey_poor O S P end R K 3204 W 3201 K W game_message @acey_pass ifn H Z R E 3202 R F 3203 ifg K E ifl K F A G H W game_message @acey_win J acey_settle end end S G H W game_message @acey_loss end
acey_settle: W 3200 G C S game_count_move R E game_moves ife G Z W game_status 2 W game_message @acey_empty else ife E 8 ifge G 30 W game_status 1 W game_message @acey_done else W game_status 2 W game_message @acey_short end else C S acey_pair end end J acey_render
acey_render: R A 3200 M J 2904 C S classic_number R A 3202 M J 2912 C S classic_number R A 3203 M J 2920 C S classic_number R A 3201 M J 2928 C S classic_number O S P
classic_initial: ${text('BANK0020LOW 0003HIGH0010LAST00001 5 9 P ')}
acey_stakes: 1 5 9 0
acey_shoe: 3 10 7 5 6 5 2 12 13 4 11 6 8 13 10 1 9 4 6 7 8 2 11 9
acey_prompt: ${text('Strictly between wins stake')}
acey_poor: ${text('Stake exceeds your bank')}
acey_win: ${text('Inside! Stake added')}
acey_loss: ${text('Outside/equal: stake lost')}
acey_pass: ${text('Passed: no coins risked')}
acey_empty: ${text('Bank empty. R restarts')}
acey_done: ${text('Eight deals: target reached')}
acey_short: ${text('Below 30. Try other stakes')}
${panel}`,
examples:[{moves:[36],board:'BANK0029LOW 0005HIGH0006LAST00071 5 9 P ',status:0,movesMade:1},{moves:[36,38,38,36,36,36,38,36],board:'BANK0065LOW 0002HIGH0011LAST00091 5 9 P ',status:1,movesMade:8}]},
{number:179,kind:'board',id:'pig-bank',site:'scorebook',title:'Pig Dice Bank',columns:8,rows:5,counterLabel:'Rolls',controls:'Enter:roll/hold R:restart',inputs:['Roll or hold'],outputs:['Bank and pot','Die','Turns left'],description:'A push-your-luck dice game inspired by traditional Pig and early computer dice games. Bank 50 points in eight turns. Select ROLL or HOLD on the bottom row, then Enter. Rolls 2..6 add to POT; a one loses that pot and consumes a turn. HOLD banks the pot and consumes a turn. Holding an empty pot does nothing. BANK survives a bad roll. R restarts the same reproducible dice sequence for comparing strategies; F1 exits.',
algorithm:`game_reset: W 3200 Z W 3201 Z W 3202 Z W 3203 8 W 3204 17 C S classic_copy W game_message @pig_prompt J pig_render
game_move: R E game_status N E Z O S P ifl A 32 O S P end ifge A 36 R G 3201 E G Z O S P R H 3200 A H G W 3200 H W 3201 Z W game_message @pig_hold J pig_turn end R A 3204 P A 5 I A 1 M B 97 C S app_div W 3204 C M A C M B 6 C S app_div I C 1 W 3202 C M G C C S game_count_move ife G 1 W 3201 Z W game_message @pig_one J pig_turn end R E 3201 A E G W 3201 E W game_message @pig_roll J pig_render
pig_turn: R E 3203 I E -1 W 3203 E R G 3200 ifge G 50 W game_status 1 W game_message @pig_win else ife E Z W game_status 2 W game_message @pig_lose end end
pig_render: R A 3200 M J 2904 C S classic_number R A 3201 M J 2912 C S classic_number R A 3202 M J 2920 C S classic_number R A 3203 M J 2928 C S classic_number O S P
classic_initial: ${text('BANK0000POT 0000DIE 0000LEFT0008ROLLHOLD')}
pig_prompt: ${text('Bank 50 within eight turns')}
pig_hold: ${text('Pot banked; new turn')}
pig_one: ${text('Rolled one: pot lost')}
pig_roll: ${text('Roll again or bank the pot')}
pig_win: ${text('Fifty banked! R restarts')}
pig_lose: ${text('Eight turns used. R retries')}
${panel}`,
examples:[{moves:[32],board:'BANK0000POT 0003DIE 0003LEFT0008ROLLHOLD',status:0,movesMade:1},{moves:[32,36],board:'BANK0003POT 0000DIE 0003LEFT0007ROLLHOLD',status:0,movesMade:1}]},
{number:180,kind:'board',id:'four-disk-hanoi',site:'puzzlebox',title:'Four-Disk Hanoi',columns:3,rows:5,counterLabel:'Moves',controls:'Enter:source/dest R:restart',inputs:['Source peg','Destination peg'],outputs:['Disk towers','Move count'],description:'Move four disks from peg A to peg C. Select any square in a peg column and Enter to select its top disk; the peg letter becomes lowercase. Select another peg and Enter to place it there. A larger disk may never rest on a smaller one. Selecting the same peg cancels. Empty sources and illegal destinations do not count. Disk 1 is smallest; 4 is largest. Fifteen moves is optimal. R restarts and F1 exits.',
algorithm:`game_reset: C S classic_copy W 3200 -1 W game_message @hanoi_prompt O S P
game_move: R E game_status N E Z O S P M B 3 C S app_div M H C R G 3200 ifl G Z M A H C S hanoi_top ife K 4 O S P end W 3200 H M I 2912 A I H M E 97 A E H W I E W game_message @hanoi_dest O S P end ife G H J hanoi_cancel end M A G C S hanoi_top M L I M J E M A H C S hanoi_top ife K Z W game_message @hanoi_illegal O S P end ifl K 4 ifg J E W game_message @hanoi_illegal O S P end end I I -3 W I J W L 46 C S game_count_move C S hanoi_cancel M I 2902 M E 1
hanoi_check: R F I A E 48 N F E O S P S E 48 I E 1 I I 3 ifle E 4 J hanoi_check end W game_status 1 W game_message @hanoi_win O S P
hanoi_cancel: R G 3200 M I 2912 A I G M E 65 A E G W I E W 3200 -1 W game_message @hanoi_prompt O S P
hanoi_top: M I game_board A I A M K Z
hanoi_scan: R E I ifn E 46 O S P end I I 3 I K 1 ifl K 4 J hanoi_scan end M E 99 O S P
classic_initial: ${text('1..2..3..4..ABC')}
hanoi_prompt: ${text('Move all disks from A to C')}
hanoi_dest: ${text('Choose destination peg')}
hanoi_illegal: ${text('Larger cannot cover smaller')}
hanoi_win: ${text('Tower transferred! R retry')}
${panel}`,
examples:[{moves:[0,1],board:'...2..3..41.ABC',status:0,movesMade:1}]},
{number:181,kind:'board',id:'lantern-word',site:'letters',title:'Lantern Word Guess',columns:8,rows:6,stepKey:'n',counterLabel:'Tries',controls:'Enter:letter N:word R:reset',inputs:['Letter','N: change word'],outputs:['Revealed word','Misses','Solved'],description:'An authored word-guessing game in the spirit of early BASIC Hangman. Select a letter A..Z and Enter; all its occurrences appear in the seven-letter word. Used alphabet letters become dots and repeated selections cost nothing. Six misses lose. A clue stays visible until the game ends. N cycles four Troika-themed puzzles before any guesses; R restarts at the first puzzle. Alphabet occupies the four rows beneath the word; MISS shows wrong guesses. F1 exits.',
algorithm:`game_reset: W 3200 Z J word_init
word_init: C S classic_copy W 3201 Z W 3202 Z W game_moves Z W game_status Z R E 3200 M I @word_clues A I E R E I W game_message E O S P
game_key: E A 1 J word_next E A -26 J word_next M A Z O S P
word_next: R E game_moves ifn E Z M A Z O S P end R E 3200 I E 1 ife E 4 M E Z end W 3200 E C S word_init M A 1 O S P
game_move: R E game_status N E Z O S P ifl A 8 O S P end ifge A 34 O S P end M I game_board A I A R G I E G 46 O S P W I 46 C S game_count_move R E 3200 P E 7 M J @word_words A J E M K Z M L Z
word_scan: R E J ife E G M I game_board A I K W I G I L 1 end I J 1 I K 1 ifl K 7 J word_scan end
 ife L Z R E 3201 I E 1 W 3201 E ife E 6 W game_status 2 W game_message @word_lose R E 3200 P E 7 M J @word_words A J E M I game_board M K 7
word_reveal: R E J W I E I I 1 I J 1 I K -1 N K Z J word_reveal end else R E 3202 A E L W 3202 E ife E 7 W game_status 1 W game_message @word_win end end R A 3201 M J 2944 C S classic_number O S P
classic_initial: ${text('_______ ABCDEFGHIJKLMNOPQRSTUVWXYZ      MISS0000')}
word_words: ${text('TERNARYLANTERNORBITALSEEDBED').split(' ').slice(0,-1).join(' ')}
word_clues: @word_c0 @word_c1 @word_c2 @word_c3
word_c0: ${text('Clue: three-state numbers')}
word_c1: ${text('Clue: a cave explorer light')}
word_c2: ${text('Clue: circling a small moon')}
word_c3: ${text('Clue: young garden starts')}
word_win: ${text('Word found! R restarts')}
word_lose: ${text('Six misses. Word revealed')}
${panel}`,
examples:[{moves:[27],board:'T______ ABCDEFGHIJKLMNOPQRS.UVWXYZ      MISS0000',status:0,movesMade:1}]},
];
