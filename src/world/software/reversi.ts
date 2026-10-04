import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const initial=Array.from({length:64},(_,i)=>i===27||i===36?'O':i===28||i===35?'X':'.');
const first=[...initial];first[19]='X';first[27]='X';

export const REVERSI_SOFTWARE: BoardSoftware = {
  number:127,kind:'board',id:'reversi',site:'hexclub',title:'Reversi',columns:8,rows:8,
  description:'Two players share the keyboard on a standard 8x8 board. X starts. A legal move brackets one or more opposing disks in any of eight directions and flips every bracketed line. Occupied and noncapturing squares are ignored. A player with no legal move passes automatically; when neither can move, the game displays both scores and the winner. Arrows or Tab select, Enter/Space plays, R resets, F1 exits.',
  inputs:['Selected square'],outputs:['Board','Turn or winner','Moves'],
  algorithm:`game_reset: M I game_board M E 64
rev_clear: W I 46 I I 1 I E -1 N E Z J rev_clear
 W 2927 79 W 2928 88 W 2935 88 W 2936 79 W 3200 88 W game_message @rev_x O S P
game_move: R E game_status N E Z O S P M B 1 C S rev_probe E A Z O S P
 R E 3201 M I game_board A I E R E 3200 W I E C S game_count_move
 C S rev_switch C S rev_has_move ifn A Z J rev_prompt end
 C S rev_switch C S rev_has_move ife A Z J rev_finish end
 R E 3200 ife E 88 W game_message @rev_xpass else W game_message @rev_opass end O S P
rev_switch: M E 167 R F 3200 S E F W 3200 E O S P
rev_prompt: R E 3200 ife E 88 W game_message @rev_x else W game_message @rev_o end O S P
; A square, B apply=1 or inspect=0. Count every captured disk, without wrapping edges.
; 3201..3209 are bounded probe scratch; no board writes on an illegal move.
rev_probe: W 3201 A W 3202 B M I game_board A I A R E I ifn E 46 M A Z O S P end
 M B 8 C S app_div W 3205 A W 3206 C W 3207 @rev_directions W 3208 8 W 3209 Z
rev_direction: R I 3207 R G I M K I/1 R H 3205 R J 3206 M L Z R D 3200 M E 167 S E D
rev_ray: A H G A J K ifl H Z J rev_next end ifg H 7 J rev_next end ifl J Z J rev_next end ifg J 7 J rev_next end
 M I H P I 8 A I J A I game_board R F I ife F E I L 1 J rev_ray end N F D J rev_next E L Z J rev_next
 R F 3209 A F L W 3209 F R F 3202 E F Z J rev_next R H 3205 R J 3206
rev_flip: A H G A J K M I H P I 8 A I J A I game_board W I D I L -1 N L Z J rev_flip
rev_next: R I 3207 I I 2 W 3207 I R E 3208 I E -1 W 3208 E N E Z J rev_direction R A 3209 O S P
rev_has_move: W 3210 Z
rev_find: R A 3210 M B Z C S rev_probe ifg A Z M A 1 O S P end R E 3210 I E 1 W 3210 E ifl E 64 J rev_find end M A Z O S P
rev_finish: M I game_board M J 64 M G Z M H Z
rev_score: R E I ife E 88 I G 1 end ife E 79 I H 1 end I I 1 I J -1 N J Z J rev_score W 3203 G W 3204 H
 M J @rev_winner W game_status 1 ifl G H W game_status 2 end ife G H M J @rev_draw W game_status 3 end M I 3300 M E 18
rev_copy: R F J W I F I I 1 I J 1 I E -1 N E Z J rev_copy
 ifl G H W 3300 79 end M A G M B 3310 C S rev_digits R A 3204 M B 3315 C S rev_digits W game_message 3300 O S P
rev_digits: M J B M B 10 C S app_div A A 48 W J A A C 48 M J/1 C O S P
rev_directions: -1 -1 -1 0 -1 1 0 -1 0 1 1 -1 1 0 1 1
rev_x: ${text('X to play')}
rev_o: ${text('O to play')}
rev_xpass: ${text('X plays; O passes')}
rev_opass: ${text('O plays; X passes')}
rev_winner: ${text('X wins  X=00 O=00')}
rev_draw: ${text('Draw    X=00 O=00')}
${POSITIVE_DIVISION}`,
  examples:[{moves:[19],board:first.join(''),status:0,movesMade:1},{moves:[0,27,19,19],board:first.join(''),status:0,movesMade:1}],
};
