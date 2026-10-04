import type { BoardReference } from './simulationSoftwareReference';
const digits=(n:number)=>String(n).padStart(4,'0');
export function classicSimulations2Reference(id:string):BoardReference|undefined {
 if(!['ferry-crossing','forest-firebreak','fishing-season','crop-rotation'].includes(id))return;
 let moves=0,status=0;
 const banks=[0,0,0,0],stocks=[12,8,4],soil=Array<number>(8).fill(3),crops=Array<string>(8).fill('G');
 let cells=[...'*TT#TTTTT#TTTTTTTTTTT#TTTTT#TTTTT#TH'],port=0,catchTotal=0,food=0;
 const neighbors=(i:number,width:number,size:number)=>Array.from({length:size},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/width)-Math.floor(j/width))+Math.abs(i%width-j%width)===1);
 const fire=()=>{
  if(status)return;
  cells=cells.map((c,i)=>c==='*'?'.':(c==='T'||c==='H')&&neighbors(i,6,36).some(j=>cells[j]==='*')?'*':c);moves++;
  if(cells[35]!=='H')status=2;
  else if(!cells.includes('*'))status=cells.filter(c=>c==='T').length>=10?1:2;
 };
 const harvest=()=>{
  if(status)return;
  for(let i=0;i<8;i++){
   if(crops[i]==='G'){food+=soil[i]!*(neighbors(i,4,8).some(j=>crops[j]==='G')?1:2);soil[i]=Math.max(0,soil[i]!-2);}
   else if(crops[i]==='B'){food++;soil[i]=Math.min(5,soil[i]!+1);}
   else soil[i]=Math.min(5,soil[i]!+2);
  }moves++;if(moves===4)status=food>=60?1:2;
 };
 return {
  get moves(){return moves;},get status(){return status;},
  get board(){
   if(id==='ferry-crossing')return 'WESTEAST'+banks.map((bank,i)=>bank?'...~~..'+'WGCF'[i]:'WGCF'[i]+'..~~...').join('');
   if(id==='forest-firebreak')return cells.join('');
   if(id==='fishing-season')return `FISH${digits(catchTotal)}PORT${digits(port+1)}SEA1${digits(stocks[0]!)}SEA2${digits(stocks[1]!)}SEA3${digits(stocks[2]!)}NET 3   NET 6   SAIL    `;
   return crops.map((crop,i)=>crop+soil[i]).join('')+`FOOD${digits(food)}`;
  },
  step(){if(id==='forest-firebreak')fire();else if(id==='crop-rotation')harvest();},
  play(square:number){
   if(status)return;
   if(id==='ferry-crossing'){
    const row=Math.floor(square/8)-1;if(row<0)return;
    if(row<3){if(banks[row]!==banks[3])return;banks[row]=1-banks[row]!;}banks[3]=1-banks[3]!;moves++;
    if(banks[1]!==banks[3]&&(banks[0]===banks[1]||banks[1]===banks[2]))status=2;
    else if(banks.every(n=>n===1))status=1;
   }else if(id==='forest-firebreak'){
    if(cells[square]!=='T')return;cells[square]='#';fire();
   }else if(id==='fishing-season'){
    const row=Math.floor(square/8);if(row<5)return;
    if(row===7)port=(port+1)%3;
    else{const amount=Math.min(stocks[port]!,row===5?3:6);catchTotal+=amount;stocks[port]!-=amount;}
    stocks.forEach((n,i)=>{if(row===7||i!==port)stocks[i]=Math.min(16,n+2);});moves++;
    if(moves===12)status=catchTotal>=40&&stocks.every(n=>n>=4)?1:2;
   }else{
    if(square>=16)return;const plot=Math.floor(square/2);crops[plot]=crops[plot]==='G'?'B':crops[plot]==='B'?'R':'G';
   }
  }
 };
}
