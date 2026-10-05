import type {BoardReference} from './simulationSoftwareReference';
export function ruleLoomReference():BoardReference {
 let rule=30, rows=Array.from({length:7},()=>Array<number>(8).fill(0)), moves=0;
 rows[6]![4]=1;
 return {
  get board(){return Array.from({length:8},(_,i)=>String((rule>>i)&1)).join('')+rows.flat().map(v=>v?'*':'.').join('');},
  get moves(){return moves;},get status(){return 0;},
  play(square:number){
   if(square<8)rule^=1<<square;
   else if(square>=56)rows[6]![square-56]=rows[6]![square-56]!^1;
   else return;
   rows=rows.map((row,i)=>i===6?row:Array<number>(8).fill(0));moves=0;
  },
  step(){const old=rows[6]!;rows.shift();rows.push(old.map((v,i)=>(rule>>(old[(i+7)%8]!*4+v*2+old[(i+1)%8]!))&1));moves=Math.min(9841,moves+1);},
 };
}
