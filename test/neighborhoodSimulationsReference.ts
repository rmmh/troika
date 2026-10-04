import type {BoardReference} from './simulationSoftwareReference';
const d=(n:number)=>String(n).padStart(4,'0');
export function neighborhoodSimulationsReference(id:string):BoardReference|undefined{
 if(!['tide-gate','ferry-timetable','market-stall','irrigation-plan'].includes(id))return;
 let moves=0,status=0,basin=3,open=false,boats=0,tide=1,due=0,west=3,east=0,load=0,done=0,fuel=8,bank=0,cash=30,bread=0,fruit=0,price=1,tank=18,evap=1;
 const moisture=[2,3,4,3,4,5,4,5,6],tides=[1,3,5,7,5,3,1,0];
 return{get moves(){return moves;},get status(){return status;},get board(){
  if(id==='tide-gate')return `BASN${d(basin)}TIDE${d(tide)}BOAT${d(boats)}DUE ${d(due)}GATE${open?'OPEN':'CLOS'}`;
  if(id==='ferry-timetable')return `WEST${d(west)}EAST${d(east)}LOAD${d(load)}DONE${d(done)}FUEL${d(fuel)}BOARD   SAIL    WAIT    `;
  if(id==='market-stall')return `CASH${d(cash)}BRED${d(bread)}FRUT${d(fruit)}PRIC${d(price)}BUY B   BUY F   PRICE+  NEXT DAY`;
  return [0,1,2].map(r=>moisture.slice(r*3,r*3+3).join(' ')+'   ').join('')+`TANK${d(tank)}EVAP${d(evap)}`;
 },play(square:number){
  if(status)return;const row=Math.floor(square/8);
  if(id==='tide-gate'){if(row===4)open=!open;}
  else if(id==='ferry-timetable'){
   if(row<5)return;
   if(row===5){const n=Math.min(3-load,bank?east:west);if(!n)return;load+=n;if(bank)east-=n;else west-=n;}
   if(row===6){if(fuel<2)return;fuel-=2;bank=1-bank;done+=load;load=0;}
   moves++;if(moves===8)status=done>=10?1:2;else{west+=[3,0,2,0,2,0,1,0][moves]!;east+=[0,2,0,3,0,2,0,1][moves]!;}
  }else if(id==='market-stall'){
   if(row<4)return;
   if(row===4){if(cash>=6&&bread<=6){cash-=6;bread+=3;}}
   if(row===5){if(cash>=6&&fruit<=7){cash-=6;fruit+=2;}}
   if(row===6)price=price%3+1;
   if(row===7){const sb=Math.min(bread,Math.max(0,[3,4,2,5,3][moves]!-price+1)),sf=Math.min(fruit,Math.max(0,[2,1,3,2,4][moves]!-price+1));cash+=sb*(price+1)+sf*(price+3);bread=0;fruit=Math.max(0,fruit-sf-1);moves++;if(moves===5)status=cash>=50?1:2;}
  }else if(row<3&&square%8<6){const plot=row*3+Math.floor(square%8/2);if(tank&&moisture[plot]!<6){moisture[plot]!++;tank--;}}
 },step(){
  if(status)return;
  if(id==='tide-gate'){
   if(open)basin+=Math.max(-2,Math.min(2,tide-basin));if(due){if(open)boats++;else status=2;}if(basin<2||basin>5)status=2;moves++;
   if(!status){if(moves===8){status=1;tide=0;due=0;}else{tide=tides[moves]!;due=moves===2||moves===5?1:0;}}
  }else if(id==='irrigation-plan'){
   moisture.forEach((n,i)=>moisture[i]=Math.max(0,n-evap));moves++;
   if(moisture.some(n=>n<1))status=2;else if(moves===4){status=1;evap=0;}else evap=[1,2,1,1][moves]!;
  }
 }};
}
