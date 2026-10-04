import type { BoardSoftware } from './native';
import { POSITIVE_DIVISION } from './arithmetic';
const text=(s:string)=>[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ');
const common=`
game_key: E A 1 J sim_help_key E A -26 J sim_help_key M A Z O S P
sim_help_key: R E game_status ifn E Z M A Z O S P end R E board_row M I @sim_help A I E R E I W game_message E M A 1 O S P

sim_copy: M I game_board M J @sim_initial M K game_cells
sim_copy_loop: R E J W I E I I 1 I J 1 I K -1 N K Z J sim_copy_loop O S P
; Four decimal digits, value A in 0..9999, destination J. Preserve G/H/J/K/L.
sim_number: M B 1000 C S app_div A A 48 W J A M A C M B 100 C S app_div A A 48 M J/1 A M A C M B 10 C S app_div A A 48 M J/2 A A C 48 M J/3 C O S P
${POSITIVE_DIVISION}`;
const base={kind:'board' as const,columns:8,stepKey:'n' as const,controls:'Enter:choose N:help R:reset',inputs:['Selected action'],outputs:['Resources','Outcome']};
export const BASIC_SIMULATIONS:BoardSoftware[]=[
 {...base,number:174,id:'seed-steward',site:'seedbank',title:'Seedbank Steward',rows:6,counterLabel:'Years',
 description:'An eight-year stewardship game inspired by early resource-management BASIC games. FOOD is grain, FOLK population, LAND planted plots. Choose any cell on FEAST (feed three grain per person, gain four people), EXPAND (feed two per person, add three plots), or RATION (feed one per person, lose three people). Each plot also costs one grain to plant. You must pay before harvesting. Harvest yields repeat 3, 2, 5, 1, 4, 2, 3, 4 grain per plot. Survive eight years with at least thirty people to win. A shortage ends the game. N explains the selected row. R restarts; F1 exits.',
 algorithm:`game_reset: C S sim_copy W 3200 180 W 3201 30 W 3202 20 W game_message @sim_prompt J sim_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifl A 3 O S P end M L A R G 3200 R H 3201 R K 3202 M E H
 ife L 3 P E 3 else ife L 4 P E 2 I K 3 end end A E K
 ifl G E W game_status 2 W game_message @sim_empty O S P end S G E
 ife L 3 I H 4 else ife L 5 I H -3 end end
 R E game_moves M I @sim_yields A I E R E I P E K A G E
 W 3200 G W 3201 H W 3202 K C S game_count_move R E game_moves
 ife E 8 ifge H 30 W game_status 1 W game_message @sim_won else W game_status 2 W game_message @sim_small end end
 J sim_render
sim_render: R A 3200 M J 2904 C S sim_number R A 3201 M J 2912 C S sim_number R A 3202 M J 2920 C S sim_number O S P
sim_initial: ${text('FOOD0180FOLK0030LAND0020FEAST   EXPAND  RATION  ')}
sim_yields: 3 2 5 1 4 2 3 4
sim_prompt: ${text('Eight years; keep 30 folk')}
sim_empty: ${text('No grain to feed and sow')}
sim_won: ${text('The seedbank thrives!')}
sim_small: ${text('Survived; village too small')}
sim_help: @sim_h0 @sim_h1 @sim_h2 @sim_h3 @sim_h4 @sim_h5
sim_h0: ${text('Grain pays feed and seed')}
sim_h1: ${text('Keep at least 30 people')}
sim_h2: ${text('Each plot costs one grain')}
sim_h3: ${text('Feed 3 each; gain 4 people')}
sim_h4: ${text('Feed 2 each; add 3 plots')}
sim_h5: ${text('Feed 1 each; lose 3 people')}
${common}`,
 examples:[{moves:[24],board:'FOOD0130FOLK0034LAND0020FEAST   EXPAND  RATION  ',status:0,movesMade:1},{moves:[24,24,24],board:'FOOD0048FOLK0038LAND0020FEAST   EXPAND  RATION  ',status:2,movesMade:2}]},
 {...base,number:175,id:'roof-lemonade',site:'menus',title:'Rooftop Lemonade',rows:6,counterLabel:'Days',
 description:'Run a lemonade stall for eight market days. CASH starts at 60 coins. SKY is today\'s base demand and SOLD is yesterday\'s sales. Pick PRICE 1, 2, or 3: each day you make twenty cups for ten coins. Demand is SKY minus five for each coin above price one; sell up to twenty cups and discard leftovers. Forecasts are visible before you choose. Finish with at least 170 coins to earn the market ribbon. An unaffordable batch closes the stall. N explains the selected row. R restarts the same weather; F1 exits.',
 algorithm:`game_reset: C S sim_copy W 3200 60 W 3201 18 W 3202 Z W game_message @sim_prompt J sim_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifl A 3 O S P end I A -2 M L A R G 3200 ifl G 10 W game_status 2 W game_message @sim_empty O S P end R H 3201 M E L I E -1 P E 5 S H E ifl H Z M H Z end ifg H 20 M H 20 end W 3202 H P H L A G H I G -10 W 3200 G C S game_count_move R E game_moves
 ife E 8 W 3201 Z ifge G 170 W game_status 1 W game_message @sim_won else W game_status 2 W game_message @sim_small end else M I @sim_forecast A I E R E I W 3201 E end J sim_render
sim_render: R A 3200 M J 2904 C S sim_number R A 3201 M J 2912 C S sim_number R A 3202 M J 2920 C S sim_number O S P
sim_initial: ${text('CASH0060SKY 0018SOLD0000PRICE 1 PRICE 2 PRICE 3 ')}
sim_forecast: 18 10 25 14 22 8 20 16
sim_prompt: ${text('Eight days; aim for 170')}
sim_empty: ${text('Cannot afford a fresh batch')}
sim_won: ${text('You earned the ribbon!')}
sim_small: ${text('Season over; try new prices')}
sim_help: @sim_h0 @sim_h1 @sim_h2 @sim_h3 @sim_h4 @sim_h5
sim_h0: ${text('Batch costs 10 coins')}
sim_h1: ${text('Base demand before price')}
sim_h2: ${text('Cups sold the previous day')}
sim_h3: ${text('Price 1: demand = SKY')}
sim_h4: ${text('Price 2: demand = SKY - 5')}
sim_h5: ${text('Price 3: demand = SKY - 10')}
${common}`,
 examples:[{moves:[40],board:'CASH0074SKY 0010SOLD0008PRICE 1 PRICE 2 PRICE 3 ',status:0,movesMade:1},{moves:[24],board:'CASH0068SKY 0010SOLD0018PRICE 1 PRICE 2 PRICE 3 ',status:0,movesMade:1}]},
 {...base,number:176,id:'canal-trader',site:'station',title:'Canal Star Trader',rows:8,counterLabel:'Trips',
 description:'Trade seed cargo among three canal ports. Start with 50 coins, an empty nine-crate hold, and six voyages. PORT cycles 1, 2, 3; their fixed prices are 3, 8, and 5 coins per crate. BUY and SELL trade one crate at the displayed RATE. SAIL costs two coins and moves to the next port. The sixth voyage automatically sells remaining cargo at the arrival price; finish with at least 100 coins to win. Failed purchases, empty sales, and unaffordable voyages consume nothing. The counter counts voyages, not transactions. N explains the selected row. R restarts; F1 exits.',
 algorithm:`game_reset: C S sim_copy W 3200 50 W 3201 Z W 3202 1 W 3203 3 W 3204 6 W game_message @sim_prompt J sim_render
game_move: R E game_status N E Z O S P M B 8 C S app_div M L A R G 3200 R H 3201 R K 3203
 ife L 5 ifge H 9 W game_message @sim_full O S P end ifl G K W game_message @sim_poor O S P end S G K I H 1 J sim_trade end
 ife L 6 ife H Z W game_message @sim_none O S P end A G K I H -1 J sim_trade end
 ifn L 7 O S P end ifl G 2 W game_message @sim_poor O S P end I G -2 R E 3202 I E 1 ifg E 3 M E 1 end W 3202 E I E -1 M I @sim_prices A I E R K I W 3203 K R E 3204 I E -1 W 3204 E C S game_count_move
 R E 3204 ife E Z P K H A G K M H Z ifge G 100 W game_status 1 W game_message @sim_won else W game_status 2 W game_message @sim_small end J sim_store end
sim_trade: W game_message @sim_prompt
sim_store: W 3200 G W 3201 H J sim_render
sim_render: R A 3200 M J 2904 C S sim_number R A 3201 M J 2912 C S sim_number R A 3202 M J 2920 C S sim_number R A 3203 M J 2928 C S sim_number R A 3204 M J 2936 C S sim_number O S P
sim_initial: ${text('CASH0050LOAD0000PORT0001RATE0003LEFT0006BUY     SELL    SAIL    ')}
sim_prices: 3 8 5
sim_prompt: ${text('Trade; six trips, aim 100')}
sim_full: ${text('Hold full: sell or sail')}
sim_poor: ${text('Not enough coins')}
sim_none: ${text('Hold empty: buy or sail')}
sim_won: ${text('A profitable trading season')}
sim_small: ${text('Season settled; try again')}
sim_help: @sim_h0 @sim_h1 @sim_h2 @sim_h3 @sim_h4 @sim_h5 @sim_h6 @sim_h7
sim_h0: ${text('Your spendable trade coins')}
sim_h1: ${text('Nine crates fit in the hold')}
sim_h2: ${text('Ports cycle 1 > 2 > 3 > 1')}
sim_h3: ${text('Coin price per seed crate')}
sim_h4: ${text('Last trip sells all cargo')}
sim_h5: ${text('Buy one crate at RATE')}
sim_h6: ${text('Sell one crate at RATE')}
sim_h7: ${text('Pay 2 coins; next port')}
${common}`,
 examples:[{moves:[40,56,48],board:'CASH0053LOAD0000PORT0002RATE0008LEFT0005BUY     SELL    SAIL    ',status:0,movesMade:1},{moves:[48],board:'CASH0050LOAD0000PORT0001RATE0003LEFT0006BUY     SELL    SAIL    ',status:0,movesMade:0}]},
 {...base,number:177,id:'cave-lantern',site:'maze',title:'Cave Lantern Hunt',rows:8,counterLabel:'Turns',
 description:'Explore eight connected caves and hit the lurking moth-beast with a lantern bolt. ROOM is your cave and BOLT your three remaining shots. Three GO rows and three FIRE rows show adjacent destinations. The message warns of nearby beast smell, a pit draft, or bat wings. Walking into the beast or pit loses; bats carry you to cave 2. A missed shot consumes a bolt, and three misses lose. Every restart uses the same map: learn it, or draw it. Any cell in an action row selects it. N explains the selected row. R restarts; F1 exits.',
 algorithm:`game_reset: C S sim_copy W 3200 1 W 3201 3 W 3202 Z J sim_render
game_move: R E game_status N E Z O S P M B 8 C S app_div ifl A 2 O S P end W 3202 Z M L A I A -2 ifge A 3 I A -3 end M J A R E 3200 I E -1 P E 3 A E J M I @sim_map A I E R G I C S game_count_move
 ifge L 5 W 3202 1 R E 3201 I E -1 W 3201 E ife G 6 W game_status 1 W game_message @sim_won else ife E Z W game_status 2 W game_message @sim_empty end end J sim_render end
 W 3200 G ife G 6 W game_status 2 W game_message @sim_beast end ife G 4 W game_status 2 W game_message @sim_pit end ife G 8 W 3200 2 W 3202 2 end J sim_render
sim_render: R A 3200 M J 2904 C S sim_number R A 3201 M J 2912 C S sim_number
 R E 3200 I E -1 P E 3 M K @sim_map A K E M L Z M H Z
sim_exits: R A K M G A M J L P J 8 A J 2920 C S sim_number M A G A J 24 C S sim_number
 ife G 6 I H 1 end ife G 4 I H 2 end ife G 8 I H 4 end I K 1 I L 1 ifl L 3 J sim_exits end
 R E game_status N E Z O S P R E 3202 ife E 2 W game_message @sim_bats O S P end ife E 1 I H 8 end M I @sim_warnings A I H R E I W game_message E O S P
sim_initial: ${text('ROOM0001BOLT0003GO  0002GO  0008GO  0005FIRE0002FIRE0008FIRE0005')}
sim_map: 2 8 5 1 3 6 2 4 7 3 5 8 4 6 1 5 7 2 6 8 3 7 1 4
sim_warnings: @sim_w0 @sim_w1 @sim_w2 @sim_w3 @sim_w4 @sim_w5 @sim_w6 @sim_w7 @sim_m0 @sim_m1 @sim_m2 @sim_m3 @sim_m4 @sim_m5 @sim_m6 @sim_m7
sim_w0: ${text('Quiet tunnels')}
sim_w1: ${text('A beast smell nearby')}
sim_w2: ${text('A pit draft nearby')}
sim_w3: ${text('Beast smell and pit draft')}
sim_w4: ${text('Bat wings nearby')}
sim_w5: ${text('Beast smell and bat wings')}
sim_w6: ${text('Pit draft and bat wings')}
sim_w7: ${text('Smell, draft and bat wings')}
sim_bats: ${text('Bats to 2; beast smell!')}
sim_m0: ${text('Miss; quiet tunnels')}
sim_m1: ${text('Miss; beast smell nearby')}
sim_m2: ${text('Miss; pit draft nearby')}
sim_m3: ${text('Miss; smell and pit draft')}
sim_m4: ${text('Miss; bat wings nearby')}
sim_m5: ${text('Miss; smell and bat wings')}
sim_m6: ${text('Miss; draft and bat wings')}
sim_m7: ${text('Miss; smell, draft, wings')}
sim_won: ${text('Your bolt found the beast!')}
sim_empty: ${text('No bolts left. R retries')}
sim_beast: ${text('The beast caught you!')}
sim_pit: ${text('You fell into the pit!')}
sim_help: @sim_h0 @sim_h1 @sim_h2 @sim_h3 @sim_h4 @sim_h5 @sim_h6 @sim_h7
sim_h0: ${text('Your current cave number')}
sim_h1: ${text('Three bolts; use them well')}
sim_h2: ${text('Walk to this cave')}
sim_h3: ${text('Walk to this cave')}
sim_h4: ${text('Walk to this cave')}
sim_h5: ${text('Fire into this cave')}
sim_h6: ${text('Fire into this cave')}
sim_h7: ${text('Fire into this cave')}
${common}`,
 examples:[{moves:[16,56],board:'ROOM0002BOLT0002GO  0001GO  0003GO  0006FIRE0001FIRE0003FIRE0006',status:1,movesMade:2},{moves:[24],board:'ROOM0002BOLT0003GO  0001GO  0003GO  0006FIRE0001FIRE0003FIRE0006',status:0,movesMade:1}]},
];
