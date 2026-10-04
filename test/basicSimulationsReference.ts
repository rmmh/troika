import type { BoardReference } from './simulationSoftwareReference';
const digits=(n:number)=>String(n).padStart(4,'0');
/** Independent state machines; never imported by guest software. */
export function basicSimulationsReference(id:string):BoardReference|undefined {
 if(!['seed-steward','roof-lemonade','canal-trader','cave-lantern'].includes(id))return;
 let moves=0,status=0,food=180,folk=30,land=20,cash=id==='canal-trader'?50:60,sky=18,sold=0,load=0,port=1,left=6,room=1,bolts=3;
 const prices=[3,8,5],forecast=[18,10,25,14,22,8,20,16];
 const routes=[[2,8,5],[1,3,6],[2,4,7],[3,5,8],[4,6,1],[5,7,2],[6,8,3],[7,1,4]];
 return {
 step(){},
 get moves(){return moves;},get status(){return status;},
 get board(){
  if(id==='seed-steward')return `FOOD${digits(food)}FOLK${digits(folk)}LAND${digits(land)}FEAST   EXPAND  RATION  `;
  if(id==='roof-lemonade')return `CASH${digits(cash)}SKY ${digits(sky)}SOLD${digits(sold)}PRICE 1 PRICE 2 PRICE 3 `;
  if(id==='canal-trader')return `CASH${digits(cash)}LOAD${digits(load)}PORT${digits(port)}RATE${digits(prices[port-1]!)}LEFT${digits(left)}BUY     SELL    SAIL    `;
  return `ROOM${digits(room)}BOLT${digits(bolts)}`+routes[room-1]!.map(n=>`GO  ${digits(n)}`).join('')+routes[room-1]!.map(n=>`FIRE${digits(n)}`).join('');
 },
 play(square:number){
  if(status)return;
  const row=Math.floor(square/8);
  if(id==='seed-steward'){
   if(row<3)return;
   const planted=land+(row===4?3:0),cost=folk*(row===3?3:row===4?2:1)+planted;
   if(food<cost){status=2;return;}
   food=food-cost+planted*[3,2,5,1,4,2,3,4][moves]!;land=planted;folk+=row===3?4:row===5?-3:0;moves++;
   if(moves===8)status=folk>=30?1:2;
  }else if(id==='roof-lemonade'){
   if(row<3)return;
   if(cash<10){status=2;return;}
   const price=row-2;sold=Math.min(20,Math.max(0,sky-5*(price-1)));cash+=sold*price-10;moves++;sky=forecast[moves]??0;
   if(moves===8)status=cash>=170?1:2;
  }else if(id==='canal-trader'){
   const rate=prices[port-1]!;
   if(row===5&&load<9&&cash>=rate){load++;cash-=rate;}
   if(row===6&&load>0){load--;cash+=rate;}
   if(row===7&&cash>=2){cash-=2;port=port%3+1;left--;moves++;if(!left){cash+=load*prices[port-1]!;load=0;status=cash>=100?1:2;}}
  }else{
   if(row<2)return;
   const target=routes[room-1]![(row-2)%3]!;moves++;
   if(row>=5){bolts--;if(target===6)status=1;else if(!bolts)status=2;}
   else{room=target===8?2:target;if(target===4||target===6)status=2;}
  }
 }
 };
}
