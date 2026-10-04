import type {BoardSoftware} from './native';
import {POSITIVE_DIVISION} from './arithmetic';
const t=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const common=`nh_copy: M I game_board M J @nh_initial M K game_cells
nh_copy_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J nh_copy_loop O S P
nh_number: M B 1000 C S app_div A A 48 W J A M A C M B 100 C S app_div A A 48 M J/1 A M A C M B 10 C S app_div A A 48 M J/2 A A C 48 M J/3 C O S P
${POSITIVE_DIVISION}`;
export const NEIGHBORHOOD_SIMULATIONS:BoardSoftware[]=[
{number:202,kind:'board',id:'tide-gate',site:'tide',title:'Tide Gate',columns:8,rows:5,stepKey:'n',counterLabel:'Ticks',controls:'Enter:gate N:tick R:reset',inputs:['Gate open/closed','N: tick'],outputs:['Basin and tide','Boat passages'],description:'Keep BASN between 2 and 5 through eight tides while passing both scheduled boats. Enter on GATE toggles OPEN/CLOS; N advances one tide. An open gate moves basin level toward TIDE by up to two units. A closed gate holds water. DUE=1 means a boat must pass on this tick, requiring an open gate. Tide levels are 1,3,5,7,5,3,1,0, with boats at the third and sixth ticks. Changing the gate costs no time. Missing a boat or leaving the safe basin range loses. R restarts, F1 exits.',
algorithm:`game_reset: C S nh_copy W 3200 3 W 3201 Z W 3202 Z W 3203 1 W 3204 Z W game_message @tide_goal J tide_render
game_move: R E game_status N E Z O S P ifl A 32 O S P end R E 3201 M F 1 S F E W 3201 F J tide_render
game_key: E A 1 J tide_tick E A -26 J tide_tick M A Z O S P
tide_tick: R E game_status ifn E Z M A Z O S P end R G 3200 R H 3201 ifn H Z R E 3203 S E G ifg E 2 M E 2 end ifl E -2 M E -2 end A G E W 3200 G end R E 3204 ifn E Z ife H Z W game_status 2 W game_message @tide_miss else R E 3202 I E 1 W 3202 E end end ifl G 2 W game_status 2 W game_message @tide_low end ifg G 5 W game_status 2 W game_message @tide_high end C S game_count_move R E game_status N E Z J tide_done R E game_moves ife E 8 W game_status 1 W game_message @tide_won W 3203 Z W 3204 Z else M I @tide_levels A I E R F I W 3203 F M F Z ife E 2 M F 1 end ife E 5 M F 1 end W 3204 F end
tide_done: C S tide_render M A 1 O S P
tide_render: R A 3200 M J 2904 C S nh_number R A 3203 M J 2912 C S nh_number R A 3202 M J 2920 C S nh_number R A 3204 M J 2928 C S nh_number R E 3201 ife E Z W 2936 67 W 2937 76 W 2938 79 W 2939 83 else W 2936 79 W 2937 80 W 2938 69 W 2939 78 end O S P
nh_initial: ${t('BASN0003TIDE0001BOAT0000DUE 0000GATECLOS')}
tide_levels: 1 3 5 7 5 3 1 0
tide_goal: ${t('Basin 2..5; pass both boats')}
tide_miss: ${t('Scheduled boat missed gate')}
tide_low: ${t('Basin too low: grounded!')}
tide_high: ${t('Basin too high: flooded!')}
tide_won: ${t('Safe water; both boats home')}
${common}`,
examples:[{moves:[32],steps:1,board:'BASN0001TIDE0001BOAT0000DUE 0000GATEOPEN',status:2,movesMade:1},{moves:[],steps:3,board:'BASN0003TIDE0005BOAT0000DUE 0001GATECLOS',status:2,movesMade:3}]},
{number:203,kind:'board',id:'ferry-timetable',site:'ferry',title:'Ferry Timetable',columns:8,rows:8,stepKey:'n',counterLabel:'Ticks',controls:'Enter:action N:help R:reset',inputs:['Board/sail/wait'],outputs:['Queues and load','Fuel','Delivered'],description:'Deliver at least ten passengers in eight ticks. The ferry starts WEST with capacity three and eight fuel. BOARD takes as many waiting passengers as fit; SAIL spends two fuel, crosses, and delivers everyone aboard; WAIT consumes a tick without moving. Each accepted action costs a tick. Full boarding, empty-queue boarding and unaffordable sailing do nothing. Arrivals at the start of ticks 1..8 are WEST 3,0,2,0,2,0,1,0 and EAST 0,2,0,3,0,2,0,1. The current queues already include current-tick arrivals. N recalls location and goal; R resets, F1 exits.',
algorithm:`game_reset: C S nh_copy W 3200 3 W 3201 Z W 3202 Z W 3203 Z W 3204 8 W 3205 Z C S ferry_message J ferry_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifl A 5 O S P end M L A ife L 5 R H 3202 ife H 3 W game_message @ferry_full O S P end R E 3205 M I 3200 A I E R G I ife G Z W game_message @ferry_empty O S P end M E 3 S E H ifl G E M E G end S G E A H E W I G W 3202 H else ife L 6 R E 3204 ifl E 2 W game_message @ferry_fuel O S P end I E -2 W 3204 E R E 3205 M F 1 S F E W 3205 F R G 3203 R H 3202 A G H W 3203 G W 3202 Z end end C S game_count_move R E game_moves ife E 8 R E 3203 ifge E 10 W game_status 1 W game_message @ferry_won else W game_status 2 W game_message @ferry_lost end else M I @ferry_west A I E R F I R G 3200 A G F W 3200 G M I @ferry_east A I E R F I R G 3201 A G F W 3201 G C S ferry_message end J ferry_render
ferry_message: R E 3205 ife E Z W game_message @ferry_atwest else W game_message @ferry_ateast end O S P
ferry_render: R A 3200 M J 2904 C S nh_number R A 3201 M J 2912 C S nh_number R A 3202 M J 2920 C S nh_number R A 3203 M J 2928 C S nh_number R A 3204 M J 2936 C S nh_number O S P
game_key: E A 1 J ferry_help E A -26 J ferry_help M A Z O S P
ferry_help: R E game_status ifn E Z M A Z O S P end C S ferry_message M A 1 O S P
nh_initial: ${t('WEST0003EAST0000LOAD0000DONE0000FUEL0008BOARD   SAIL    WAIT    ')}
ferry_west: 3 0 2 0 2 0 1 0
ferry_east: 0 2 0 3 0 2 0 1
ferry_atwest: ${t('At WEST; 10 people, 8 ticks')}
ferry_ateast: ${t('At EAST; 10 people, 8 ticks')}
ferry_full: ${t('Boat full: sail or wait')}
ferry_empty: ${t('No passengers at this bank')}
ferry_fuel: ${t('Not enough fuel to cross')}
ferry_won: ${t('Timetable target achieved!')}
ferry_lost: ${t('Eight ticks; need 10 people')}
${common}`,
examples:[{moves:[40,48,40,48,40,48,40,48],board:'WEST0002EAST0003LOAD0000DONE0011FUEL0000BOARD   SAIL    WAIT    ',status:1,movesMade:8},{moves:[40],board:'WEST0000EAST0002LOAD0003DONE0000FUEL0008BOARD   SAIL    WAIT    ',status:0,movesMade:1}]},
{number:204,kind:'board',id:'market-stall',site:'market',title:'Market Stall',columns:8,rows:8,stepKey:'n',counterLabel:'Days',controls:'Enter:choose N:help R:reset',inputs:['Buy/price/close'],outputs:['Coins','Two inventories','Season result'],description:'Finish five market days with fifty coins, starting with thirty. BUY B purchases three bread for six coins; BUY F purchases two fruit for six. Each shelf holds at most nine. PRICE cycles levels 1..3: bread sells at level+1, fruit at level+3. NEXT DAY sells up to each demand then advances time. Base daily demands are bread 3,4,2,5,3 and fruit 2,1,3,2,4; subtract level-1 from each (minimum zero). Unsold bread all spoils; one unsold fruit spoils each night. Buying and repricing take no time; inventory has no final salvage value. N explains the selected row; on NEXT DAY it shows current demand, and on PRICE it shows both selling prices. R resets, F1 exits.',
algorithm:`game_reset: C S nh_copy W 3200 30 W 3201 Z W 3202 Z W 3203 1 W game_message @market_goal J market_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifl A 4 O S P end ife A 6 R E 3203 I E 1 ife E 4 M E 1 end W 3203 E J market_render end ife A 7 J market_day end M L A R G 3200 ifl G 6 W game_message @market_poor O S P end M I 3201 M H 3 ife L 5 M I 3202 M H 2 end R E I A E H ifg E 9 W game_message @market_full O S P end W I E I G -6 W 3200 G W game_message @market_goal J market_render
market_day: R L game_moves R G 3200 R H 3203 M I @market_bread A I L R E I S E H I E 1 ifl E Z M E Z end R K 3201 ifg K E M K E end M E H I E 1 P K E A G K W 3201 Z M I @market_fruit A I L R E I S E H I E 1 ifl E Z M E Z end R K 3202 ifg K E M K E end R E 3202 S E K ifg E Z I E -1 end W 3202 E M E H I E 3 P K E A G K W 3200 G C S game_count_move W game_message @market_goal R E game_moves ife E 5 ifge G 50 W game_status 1 W game_message @market_won else W game_status 2 W game_message @market_lost end end J market_render
market_render: R A 3200 M J 2904 C S nh_number R A 3201 M J 2912 C S nh_number R A 3202 M J 2920 C S nh_number R A 3203 M J 2928 C S nh_number O S P
game_key: E A 1 J market_help E A -26 J market_help M A Z O S P
market_help: R E game_status ifn E Z M A Z O S P end R E board_row E E 7 J market_demand_help E E 3 J market_price_help E E 6 J market_price_help M I @market_helps A I E R E I W game_message E M A 1 O S P
market_price_help: R E 3203 I E -1 M I @market_prices A I E R E I W game_message E M A 1 O S P
market_demand_help: M I 3300 M J @market_demand M K 15
market_demand_copy: R E J W I E I I 1 I J 1 I K -1 N K Z J market_demand_copy R L game_moves R H 3203 M I @market_bread A I L R E I S E H I E 1 ifl E Z M E Z end A E 48 W 3309 E M I @market_fruit A I L R E I S E H I E 1 ifl E Z M E Z end A E 48 W 3313 E W game_message 3300 M A 1 O S P
market_prices: @market_p1 @market_p2 @market_p3
market_p1: ${t('Bread sells 2; fruit 4')}
market_p2: ${t('Bread sells 3; fruit 5')}
market_p3: ${t('Bread sells 4; fruit 6')}
market_demand: ${t('Demand B:0 F:0')}
nh_initial: ${t('CASH0030BRED0000FRUT0000PRIC0001BUY B   BUY F   PRICE+  NEXT DAY')}
market_bread: 3 4 2 5 3
market_fruit: 2 1 3 2 4
market_helps: @market_goal @market_hb @market_hf @market_hp @market_buyb @market_buyf @market_hp @market_hday
market_goal: ${t('Five days; finish with 50')}
market_hb: ${t('Unsold bread all spoils')}
market_hf: ${t('One unsold fruit spoils/day')}
market_hp: ${t('Bread price +1; fruit +3')}
market_buyb: ${t('Buy 3 bread for 6 coins')}
market_buyf: ${t('Buy 2 fruit for 6 coins')}
market_hday: ${t('Sell, spoil, advance a day')}
market_poor: ${t('Need six coins to restock')}
market_full: ${t('Shelf limit is nine')}
market_won: ${t('A profitable market week!')}
market_lost: ${t('Five days; below 50 coins')}
${common}`,
examples:[{moves:[32,40,56],board:'CASH0032BRED0000FRUT0000PRIC0001BUY B   BUY F   PRICE+  NEXT DAY',status:0,movesMade:1}]},
{number:205,kind:'board',id:'irrigation-plan',site:'garden',title:'Irrigation Planner',columns:8,rows:5,stepKey:'n',counterLabel:'Days',controls:'Enter:water N:day R:reset',inputs:['Plot to water','N: next day'],outputs:['Moisture','Reservoir','Crop survival'],description:'Keep all nine plots alive for four dry days using exactly eighteen reservoir units. The first three rows show three moisture digits each; select a digit or the space after it and Enter to add one water, spending one reservoir unit. No plot may exceed six (runoff is rejected). N advances a day, subtracting the displayed EVAP (forecast 1,2,1,1) from every plot; any plot below one dies and ends the game. Initial moisture varies, so allocate water rather than watering evenly. TANK shows remaining water. Selecting TANK or EVAP recalls a rule. R resets, F1 exits.',
algorithm:`game_reset: C S nh_copy M I 3200 M J @water_start M K 9
water_init: R E J W I E I I 1 I J 1 I K -1 N K Z J water_init W 3210 18 W 3211 1 W game_message @water_goal J water_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifge A 3 ife A 3 W game_message @water_tank else W game_message @water_evap end O S P end ifge C 6 O S P end M G A P G 3 M A C M B 2 C S app_div A G A M I 3200 A I G R E I ifge E 6 W game_message @water_full O S P end R F 3210 ife F Z W game_message @water_empty O S P end I E 1 W I E I F -1 W 3210 F W game_message @water_goal J water_render
game_key: E A 1 J water_day E A -26 J water_day M A Z O S P
water_day: R E game_status ifn E Z M A Z O S P end R H 3211 M L Z
water_dry: M I 3200 A I L R E I S E H ifl E 1 W game_status 2 W game_message @water_dead ifl E Z M E Z end end W I E I L 1 ifl L 9 J water_dry end C S game_count_move R E game_status N E Z J water_done R E game_moves ife E 4 W game_status 1 W game_message @water_won W 3211 Z else M I @water_forecast A I E R E I W 3211 E W game_message @water_goal end
water_done: C S water_render M A 1 O S P
water_render: M L Z
water_draw: M A L M B 3 C S app_div M I A P I 8 P C 2 A I C A I game_board M J 3200 A J L R E J A E 48 W I E I L 1 ifl L 9 J water_draw end R A 3210 M J 2928 C S nh_number R A 3211 M J 2936 C S nh_number O S P
nh_initial: ${t('2 3 4   3 4 5   4 5 6   TANK0018EVAP0001')}
water_start: 2 3 4 3 4 5 4 5 6
water_forecast: 1 2 1 1
water_goal: ${t('Keep 1..6 for four dry days')}
water_tank: ${t('Each +1 uses one tank unit')}
water_evap: ${t('N dries every plot by EVAP')}
water_full: ${t('No runoff: plot already six')}
water_empty: ${t('The reservoir is empty')}
water_dead: ${t('A plot dried out. R retries')}
water_won: ${t('Every crop survived!')}
${common}`,
examples:[{moves:[],steps:1,board:'1 2 3   2 3 4   3 4 5   TANK0018EVAP0002',status:0,movesMade:1},{moves:[],steps:2,board:'0 0 1   0 1 2   1 2 3   TANK0018EVAP0002',status:2,movesMade:2}]},
];
