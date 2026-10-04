import type { BoardReference } from './simulationSoftwareReference';
export const SEARCH_GRID='RELRNANOTMORTINIORTRCEAOTROIKATMEPEDISAEDSMRIREROOAASSRENLNELTKI';
export const SEARCH_WORDS=['TROIKA','MERE','DISK','NIC','ROM','NODE','LAMP','PORT'];
export const SEARCH_SOLUTION=[[24,29],[31,55],[35,62],[6,20],[11,9],[56,32],[60,33],[33,12]];
export const BEACON_SEQUENCE=(()=>{let seed=17;return Array.from({length:8},()=>{seed=(seed*5+1)%97;return seed%4+1;});})();
const roomInitial='TURN0##....##....##....##....###D###';
export function villageCreativeReference(id:string):BoardReference|undefined {
 if(!['matchbox-room','beacon-echo','gazette-search','pocket-sequencer'].includes(id))return;
 let moves=0,status=0,rotation=0,phase=0,answered=0,start=-1,tempo=2,played=false;
 let cells=[...(id==='matchbox-room'?roomInitial:id==='gazette-search'?SEARCH_GRID:'C.E.G.c.')];
 const found=new Set<string>();
 return {
 get board(){
  if(id==='beacon-echo')return (phase===1?BEACON_SEQUENCE.slice(0,Math.min(moves+1,8)).join(''):'').padEnd(8,'.')+'*'.repeat(answered).padEnd(8,'.')+'1234....';
  if(id==='pocket-sequencer')return cells.join('')+`T${tempo}..123.`+(played?'.......*':'........');
  return cells.join('');
 },get moves(){return moves;},get status(){return status;},
 play(square:number){
  if(status)return;
  if(id==='beacon-echo'){
   if(phase!==2||square<16||square>19)return;
   if(square-15!==BEACON_SEQUENCE[answered]){status=2;phase=1;return;}
   answered++;if(answered===moves+1){moves++;if(moves===8){status=1;phase=1;}else{phase=0;answered=0;}}return;
  }
  if(id==='pocket-sequencer'){
   if(square<8){const notes='.CDEFGABc';cells[square]=notes[(notes.indexOf(cells[square]!)+1)%9]!;}
   else if(square>=12&&square<=14)tempo=square-11;
   return;
  }
  if(id==='gazette-search'){
   if(start===-1){start=square;return;}
   const from=start;start=-1;if(from===square)return;
   const dy=Math.floor(square/8)-Math.floor(from/8),dx=square%8-from%8;
   if(dx&&dy&&Math.abs(dx)!==Math.abs(dy))return;
   const length=Math.max(Math.abs(dx),Math.abs(dy))+1,dr=Math.sign(dy),dc=Math.sign(dx);
   const positions=Array.from({length},(_,i)=>(Math.floor(from/8)+i*dr)*8+from%8+i*dc);
   const word=positions.map(i=>cells[i]).join('').toUpperCase();
   if(!SEARCH_WORDS.includes(word)||found.has(word))return;
   found.add(word);for(const i of positions)cells[i]=cells[i]!.toLowerCase();moves++;if(moves===8)status=1;return;
  }
  // Rotate coordinates geometrically; the firmware uses offset tables instead.
  let shape=moves===0?[[0,0],[0,1]]:moves===1?[[0,0],[1,0],[1,1]]:[[0,0],[0,1],[1,0],[1,1]];
  for(let n=0;n<rotation;n++)shape=shape.map(([r,c])=>[c!,-r!]);
  const minR=Math.min(...shape.map(p=>p[0]!)),minC=Math.min(...shape.map(p=>p[1]!));
  const positions=shape.map(([r,c])=>[Math.floor(square/6)+r!-minR,square%6+c!-minC]);
  if(positions.some(([r,c])=>r!<0||r!>=6||c!<0||c!>=6||cells[r!*6+c!]!=='.'))return;
  const next=[...cells];for(const[r,c]of positions)next[r!*6+c!]='BCT'[moves]!;
  // Independent repeated closure over coordinates, rather than the guest queue.
  const reachable=new Set([32]);let changed=true;
  while(changed){changed=false;for(let i=0;i<36;i++)if((next[i]==='.'||next[i]==='D')&&!reachable.has(i)){
   const r=Math.floor(i/6),c=i%6;
   if([[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([y,x])=>y!>=0&&y!<6&&x!>=0&&x!<6&&reachable.has(y!*6+x!))){reachable.add(i);changed=true;}
  }}
  if(next.some((c,i)=>(c==='.'||c==='D')&&!reachable.has(i)))return;
  cells=next;rotation=0;cells[4]='0';moves++;if(moves===3)status=1;
 },
 step(){if(status)return;if(id==='matchbox-room'){rotation=(rotation+1)%4;cells[4]=String(rotation);}else if(id==='beacon-echo'){phase=phase===1?2:1;answered=0;}else if(id==='gazette-search'){start=-1;}else{moves++;played=true;}},
 };
}
