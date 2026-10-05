import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const txt=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const hexapawn=`game_reset: M I 3300 M J @hp_initial M K 9
hp_init: R E J W I E I I 1 I J 1 I K -1 N K Z J hp_init W 3200 -1 W game_message @hp_prompt J hp_render
game_move: R E game_status N E Z O S P M K A M I 3300 A I K R E I ife E 1 R F 3200 ife F K W 3200 -1 else W 3200 K end W game_message @hp_prompt J hp_render end R A 3200 ifl A Z W game_message @hp_select O S P end M B K M C 1 C S hp_legal ife A Z W game_message @hp_bad O S P end R I 3200 A I 3300 W I Z M I 3300 A I K W I 1 W 3200 -1 C S game_count_move ifl K 3 W game_status 1 W game_message @hp_win J hp_render end
 W 3201 -1 W 3202 -1 M L Z
hp_ai_from: M K Z
hp_ai_to: M A L M B K M C 2 C S hp_legal ife A Z J hp_ai_next end M E 1 M I 3300 A I K R F I ifn F Z M E 2 end ifge K 6 M E 3 end R F 3201 ifg E F W 3201 E W 3202 K W 3203 L end
hp_ai_next: I K 1 ifl K 9 J hp_ai_to end I L 1 ifl L 9 J hp_ai_from end R K 3202 ifl K Z W game_status 1 W game_message @hp_block_win J hp_render end R I 3203 A I 3300 W I Z M I 3300 A I K W I 2 C S game_count_move ifge K 6 W game_status 2 W game_message @hp_lose J hp_render end M L Z
hp_white_from: M K Z
hp_white_to: M A L M B K M C 1 C S hp_legal ifn A Z W game_message @hp_prompt J hp_render end I K 1 ifl K 9 J hp_white_to end I L 1 ifl L 9 J hp_white_from end W game_status 2 W game_message @hp_block_lose J hp_render
; Preserve K/L for caller scans.
hp_legal: W 3210 C W 3211 A W 3212 B M I 3300 A I A R E I ifn E C M A Z O S P end M B 3 C S app_div M G A M H C R A 3212 M B 3 C S app_div S A G R E 3210 ife E 1 ifn A -1 M A Z O S P end else ifn A 1 M A Z O S P end end S C H F C A ifg C 1 M A Z O S P end R I 3212 A I 3300 R F I ife C Z ifn F Z M A Z O S P end else R E 3210 M G 3 S G E ifn F G M A Z O S P end end M A 1 O S P
hp_render: M L Z
hp_cell: M I 3300 A I L R E I ife E Z R A 3200 ifge A Z M B L M C 1 C S hp_legal ifn A Z M E 43 else M E 46 end else M E 46 end else ife E 1 M E 87 else M E 66 end R F 3200 ife F L A E 32 end end M I game_board A I L W I E I L 1 ifl L 9 J hp_cell end O S P
hp_initial: 2 2 2 0 0 0 1 1 1
hp_prompt: ${txt('Select W; + step, B capture')}
hp_select: ${txt('Select a white pawn first')}
hp_bad: ${txt('Forward empty; capture diag')}
hp_win: ${txt('Your pawn reached the top!')}
hp_lose: ${txt('Black promoted; you lose')}
hp_block_win: ${txt('Black cannot move; you win')}
hp_block_lose: ${txt('No white move; black wins')}
${POSITIVE_DIVISION}`;
const fox=`game_reset: M I 3300 M K 64
fh_init: W I Z I I 1 I K -1 N K Z J fh_init W 3301 2 W 3303 2 W 3305 2 W 3307 2 W 3356 1 W 3200 1 W 3201 -1 W game_message @fh_fox J fh_render
game_move: R E game_status N E Z O S P M K A M I 3300 A I K R E I R F 3200 ife E F R E 3201 ife E K W 3201 -1 else W 3201 K end C S fh_prompt J fh_render end R A 3201 ifl A Z W game_message @fh_select O S P end M B K C S fh_legal ife A Z W game_message @fh_bad O S P end R I 3201 A I 3300 W I Z R E 3200 M I 3300 A I K W I E W 3201 -1 C S game_count_move R E 3200 ife E 1 ifl K 8 W game_status 1 W game_message @fh_fox_win J fh_render end end M F 3 S F E W 3200 F M L Z
fh_has_from: M K Z
fh_has_to: M A L M B K C S fh_legal ifn A Z C S fh_prompt J fh_render end I K 1 ifl K 64 J fh_has_to end I L 1 ifl L 64 J fh_has_from end R E 3200 ife E 1 W game_status 2 W game_message @fh_hound_win else W game_status 1 W game_message @fh_fox_win end J fh_render
fh_legal: W 3210 B R E 3200 M I 3300 A I A R F I ifn F E M A Z O S P end M I 3300 A I B R F I ifn F Z M A Z O S P end M B 8 C S app_div M G A M H C R A 3210 M B 8 C S app_div S A G R E 3200 ife E 2 ifn A 1 M A Z O S P end else F A A ifn A 1 M A Z O S P end end S C H F C A ifn C 1 M A Z O S P end M A 1 O S P
fh_prompt: R E 3200 ife E 1 W game_message @fh_fox else W game_message @fh_hounds end O S P
fh_render: M L Z
fh_cell: M I 3300 A I L R E I ife E Z R A 3201 ifge A Z M B L C S fh_legal ifn A Z M E 43 else M E 46 end else M E 46 end else ife E 1 M E 70 else M E 72 end R F 3201 ife F L A E 32 end end M I game_board A I L W I E I L 1 ifl L 64 J fh_cell end O S P
fh_fox: ${txt('Fox turn: reach the top row')}
fh_hounds: ${txt('Hounds turn: trap the fox')}
fh_select: ${txt('Select your side first')}
fh_bad: ${txt('Diagonal empty; H only down')}
fh_fox_win: ${txt('Fox escapes! F wins')}
fh_hound_win: ${txt('Fox trapped! Hounds win')}
${POSITIVE_DIVISION}`;
const pokerDeals=[
[2,0,2,1,5,2,8,3,13,0,2,2,7,1,9,0,11,3,4,2],
[5,0,6,1,7,2,8,3,2,0,9,2,3,1,12,0,14,3,4,2],
[2,2,5,2,8,2,11,2,3,0,13,2,6,3,9,1,14,0,4,0],
];
const poker=`game_reset: W 3200 Z W 3201 Z W 3202 Z J pk_deal
pk_deal: R E 3200 P E 20 M J @pk_deals A J E M L Z
pk_deal_card: R E J M I 3300 A I L W I E M E J/1 M I 3310 A I L W I E M I 3320 A I L W I Z A J 2 I L 1 ifl L 5 J pk_deal_card end W 3202 Z W game_message @pk_prompt J pk_render
game_move: R E game_status N E Z O S P R E 3202 ifn E Z W game_message @pk_next O S P end ifge A 15 O S P end M B 5 C S app_div M I 3320 A I C R E I M F 1 S F E W I F W game_message @pk_prompt J pk_render
game_key: E A 1 J pk_n E A -26 J pk_n M A Z O S P
pk_n: R E game_status ifn E Z M A Z O S P end R E 3202 ifn E Z R E 3200 I E 1 W 3200 E C S pk_deal M A 1 O S P end R E 3200 P E 20 A E 10 M J @pk_deals A J E M L Z
pk_draw: M I 3320 A I L R E I ife E Z R E J M I 3300 A I L W I E M E J/1 M I 3310 A I L W I E A J 2 end I L 1 ifl L 5 J pk_draw end C S game_count_move C S pk_rank R E 3201 A E A W 3201 E W 3202 1 R F 3200 ife F 2 ifge E 10 W game_status 1 W game_message @pk_win else W game_status 2 W game_message @pk_lose end else P A 2 M I @pk_names A I A R E I W game_message E end C S pk_render M A 1 O S P
pk_rank: M I 3400 M K 24
pk_zero: W I Z I I 1 I K -1 N K Z J pk_zero W 3206 Z W 3207 Z W 3208 Z W 3209 15 W 3210 Z W 3211 Z W 3212 Z M L Z
pk_count: M I 3300 A I L R E I M I 3400 A I E R F I I F 1 W I F M I 3310 A I L R E I M I 3420 A I E R F I I F 1 W I F ife F 5 W 3212 1 end I L 1 ifl L 5 J pk_count end M L 2
pk_groups: M I 3400 A I L R E I ife E Z J pk_group_next end R F 3211 I F 1 W 3211 F R F 3209 ifl L F W 3209 L end W 3210 L ife E 2 R F 3206 I F 1 W 3206 F end ife E 3 W 3207 1 end ife E 4 W 3208 1 end
pk_group_next: I L 1 ifl L 15 J pk_groups end M A Z R E 3206 ife E 1 M A 1 end ife E 2 M A 2 end R E 3207 ifn E Z M A 3 end R E 3211 ife E 5 R E 3210 R F 3209 S E F ife E 4 M A 4 else R E 3402 R F 3403 A E F R F 3404 A E F R F 3405 A E F R F 3414 A E F ife E 5 M A 4 end end end R E 3212 ifn E Z ife A 4 M A 8 O S P end M A 5 end R E 3207 R F 3206 ifn E Z ifn F Z M A 6 end end R E 3208 ifn E Z M A 7 end O S P
pk_render: M L Z
pk_render_card: M I 3300 A I L R E I M J @pk_ranks A J E R F J M I game_board A I L W I F M I 3310 A I L R E I M J @pk_suits A J E R F J M I 2905 A I L W I F M I 3320 A I L R E I ife E Z M E 46 else M E 94 end M I 2910 A I L W I E I L 1 ifl L 5 J pk_render_card end W 2915 68 R E 3200 A E 49 W 2916 E W 2917 47 W 2918 51 W 2919 32 W 2920 83 R A 3201 M B 10 C S app_div A A 48 A C 48 W 2921 A W 2922 C W 2923 32 W 2924 32 O S P
pk_deals: ${pokerDeals.flat().join(' ')}
pk_ranks: ${[...'..23456789TJQKA'].map(c=>c.charCodeAt(0)).join(' ')}
pk_suits: 67 68 72 83
pk_names: @pk_high 0 @pk_pair 0 @pk_two 0 @pk_three 0 @pk_straight 0 @pk_flush 0 @pk_full 0 @pk_four 0 @pk_sf 0
pk_prompt: ${txt('Hold cards; N draws others')}
pk_next: ${txt('N starts the next deal')}
pk_high: ${txt('High card +0; N next')}
pk_pair: ${txt('One pair +1; N next')}
pk_two: ${txt('Two pairs +2; N next')}
pk_three: ${txt('Three of a kind +3; N next')}
pk_straight: ${txt('Straight +4; N next')}
pk_flush: ${txt('Flush +5; N next')}
pk_full: ${txt('Full house +6; N next')}
pk_four: ${txt('Four of a kind +7; N next')}
pk_sf: ${txt('Straight flush +8; N next')}
pk_win: ${txt('Ten points in three: win!')}
pk_lose: ${txt('Below ten points; R replays')}
${POSITIVE_DIVISION}`;
const shapes=[
[[0,0],[1,0],[0,1],[1,1]],
[[0,0],[1,0],[2,0],[3,0]],
[[1,0],[0,1],[1,1],[2,1]],
[[0,0],[0,1],[1,1],[2,1]],
[[2,0],[0,1],[1,1],[2,1]],
[[1,0],[2,0],[0,1],[1,1]],
[[0,0],[1,0],[1,1],[2,1]],
];
const rotations=shapes.map(shape=>{let p=shape.map(v=>v.slice());return Array.from({length:4},()=>{const minX=Math.min(...p.map(v=>v[0]!)),minY=Math.min(...p.map(v=>v[1]!));p=p.map(([x,y])=>[x!-minX,y!-minY]);const result=p.flat();p=p.map(([x,y])=>[-y!,x!]);return result;});});
const blockSequence=[0,0,0,1,2,3,4,5,6,1,0,2];
const blocks=`game_reset: M I 3300 M K 48
fb_init: W I Z I I 1 I K -1 N K Z J fb_init W 3200 Z W 3204 Z W 3205 Z J fb_spawn
fb_spawn: W 3201 Z W 3202 1 W 3203 Z C S fb_candidate C S fb_valid ife A Z W game_status 2 W game_message @fb_top else C S fb_message end J fb_render
game_move: R E game_status N E Z O S P M B 6 C S app_div C S fb_candidate W 3206 C C S fb_try J fb_render
game_key: E A -13 J fb_left E A -40 J fb_left E A -10 J fb_right E A -37 J fb_right E A -8 J fb_rotate E A -35 J fb_rotate E A 1 J fb_tick E A -26 J fb_tick E A -7 J fb_drop E A -34 J fb_drop M A Z O S P
fb_left: M F -1 J fb_shift
fb_right: M F 1
fb_shift: R E game_status ifn E Z M A Z O S P end C S fb_candidate R E 3206 A E F W 3206 E C S fb_try J fb_redraw
fb_rotate: R E game_status ifn E Z M A Z O S P end C S fb_candidate R E 3208 I E 1 ifge E 4 M E Z end W 3208 E C S fb_try J fb_redraw
fb_tick: R E game_status ifn E Z M A Z O S P end C S fb_candidate R E 3207 I E 1 W 3207 E C S fb_valid ife A Z C S fb_lock else C S fb_accept C S fb_message C S fb_render end M A 1 O S P
fb_drop: R E game_status ifn E Z M A Z O S P end
fb_fall: C S fb_candidate R E 3207 I E 1 W 3207 E C S fb_valid ife A Z C S fb_lock M A 1 O S P end C S fb_accept J fb_fall
fb_candidate: R E 3202 W 3206 E R E 3203 W 3207 E R E 3201 W 3208 E O S P
fb_accept: R E 3206 W 3202 E R E 3207 W 3203 E R E 3208 W 3201 E O S P
fb_try: C S fb_valid ife A Z W game_message @fb_blocked O S P end C S fb_accept J fb_message
fb_redraw: C S fb_render M A 1 O S P
fb_shape: R E 3200 M I @fb_sequence A I E R E I P E 32 R F 3208 P F 8 A E F M J @fb_shapes A J E O S P
fb_valid: C S fb_shape M K 4
fb_valid_cell: R E J R F 3206 A E F ifl E Z M A Z O S P end ifge E 6 M A Z O S P end M F J/1 R G 3207 A F G ifl F Z M A Z O S P end ifge F 8 M A Z O S P end P F 6 A F E M I 3300 A I F R E I ifn E Z M A Z O S P end A J 2 I K -1 N K Z J fb_valid_cell M A 1 O S P
fb_lock: C S fb_candidate C S fb_shape M K 4
fb_set: R E J R F 3206 A E F M F J/1 R G 3207 A F G P F 6 A F E M I 3300 A I F W I 1 A J 2 I K -1 N K Z J fb_set C S game_count_move R E 3205 I E 1 W 3205 E M L 7
fb_row: M I L P I 6 A I 3300 M K 6
fb_full: R E I ife E Z J fb_previous end I I 1 I K -1 N K Z J fb_full R E 3204 I E 1 W 3204 E M I L P I 6 A I 3305
fb_collapse: ifl I 3306 J fb_clear_top end M E I/-6 W I E I I -1 J fb_collapse
fb_clear_top: M I 3300 M K 6
fb_blank: W I Z I I 1 I K -1 N K Z J fb_blank J fb_row
fb_previous: I L -1 ifge L Z J fb_row end R E 3205 ifge E 12 R E 3204 ifge E 4 W game_status 1 W game_message @fb_win else W game_status 2 W game_message @fb_short end J fb_render end R E 3200 I E 1 W 3200 E J fb_spawn
fb_message: M I 3500 M J @fb_template M K 26
fb_msg_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J fb_msg_copy R E 3204 A E 48 W 3506 E R A 3205 I A 1 M B 10 C S app_div A A 48 A C 48 W 3516 A W 3517 C W game_message 3500 O S P
fb_render: M L Z
fb_ground: M I 3300 A I L R E I ife E Z M E 46 else M E 35 end M I game_board A I L W I E I L 1 ifl L 48 J fb_ground end R E game_status ifn E Z O S P end C S fb_candidate C S fb_shape M K 4
fb_active: R E J R F 3206 A E F M F J/1 R G 3207 A F G P F 6 A F E M I game_board A I F W I 64 A J 2 I K -1 N K Z J fb_active O S P
fb_sequence: ${blockSequence.join(' ')}
fb_shapes: ${rotations.flat(2).join(' ')}
fb_template: ${txt('Lines 0/4 Piece 01/12    ')}
fb_blocked: ${txt('Blocked: move or rotate')}
fb_top: ${txt('Stack reached the top')}
fb_win: ${txt('12 pieces, four lines: win!')}
fb_short: ${txt('12 pieces; need four lines')}
${POSITIVE_DIVISION}`;
export const PARLOR_ARCADE:BoardSoftware[]=[
{number:288,kind:'board',id:'falling-blocks',site:'puzzlebox',title:'Falling Blocks',columns:6,rows:8,stepKey:'n',counterLabel:'Locks',controls:'A/D F:turn N:tick G:drop',inputs:['Piece position','Rotation/drop'],outputs:['Cleared lines','Stack'],description:'Place twelve falling tetrominoes and clear at least four complete rows. @ is the active piece; # is settled. A/D shift, F rotates clockwise without wall kicks, N advances one row and G drops until it locks. Enter aims the piece left edge at the selected column. Full rows vanish and higher rows fall. All seven piece types appear in the fixed sequence; no clock pressure. A blocked spawn loses. R replays; F1 exits.',algorithm:blocks,examples:[{"moves":[],"steps":1,"board":".......@@....@@.................................","status":0,"movesMade":0}]},
{number:289,kind:'board',id:'draw-poker',site:'cardtable',title:'Draw Poker',columns:5,rows:5,stepKey:'n',counterLabel:'Draws',controls:'Enter:hold N:draw/next',inputs:['Held cards','Draw once'],outputs:['Hand category','Three-deal score'],description:'Score ten points over three authored five-card deals. Top rows show rank and suit C/D/H/S; T,J,Q,K,A mean ten through ace. Enter on a card column toggles its hold marker ^. N exchanges unheld cards from the next unseen stock cards, left to right, then classifies the hand. N again starts the next deal. Categories score 0 high card, 1 pair, 2 two pairs, 3 trips, 4 straight, 5 flush, 6 full house, 7 four of a kind, 8 straight flush. Ace may be low in A2345. D shows deal and S total points. R replays the same deals; F1 exits.',algorithm:poker,examples:[{"moves":[0,1],"steps":1,"board":"22279CDHDC^^...D1/3 S03  ","status":0,"movesMade":1}]},
{number:290,kind:'board',id:'hexapawn',site:'chess',title:'Hexapawn',columns:3,rows:3,counterLabel:'Plies',controls:'Enter:pawn/dest R:reset',inputs:['White pawn','Destination'],outputs:['Native reply','Promote/blockade'],description:'You control W pawns moving upward against native B pawns moving down. Enter selects a white pawn. A + marks an empty forward step; a diagonal B can be captured. Move one square straight forward into empty space, or capture an enemy one square diagonally forward. Reach the opposite edge or leave the opponent no legal move to win. Black replies immediately, preferring promotion, then capture, then a forward step; ties use first source/destination in reading order. No double steps or sideways moves. R resets; F1 exits.',algorithm:hexapawn,examples:[{"moves":[7,4,6,4,8,4],"steps":0,"board":".B..W....","status":1,"movesMade":5}]},
{number:291,kind:'board',id:'fox-hounds',site:'orchard',title:'Fox and Hounds',columns:8,rows:8,counterLabel:'Turns',controls:'Enter:piece/dest R:reset',inputs:['Side to move','Diagonal step'],outputs:['Escape/blockade','Turn order'],description:'Two local players share the keyboard. Fox F moves first and may step one empty diagonal square up or down. Four H hounds may only step diagonally down. Select a piece, then a + destination; there are no captures or jumps. Fox wins on reaching the top row or if hounds cannot move. Hounds win by leaving fox no legal move. Turns alternate after each step; select the same piece to cancel. R restores the hunt; F1 exits.',algorithm:fox,examples:[{"moves":[56,49,1,8,49,56,3,12,56,49,12,19,49,42,19,28,42,51,28,37,51,60,37,46,60,53,46,55,53,46,55,62,46,39,7,14,39,46,14,23,46,37,5,14,37,28,23,30,28,21,8,17,21,12,14,21,12,3],"steps":0,"board":"...F.............H...H........H...............................H.","status":1,"movesMade":29}]},
];
