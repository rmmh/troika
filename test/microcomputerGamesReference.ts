import type {BoardReference} from './simulationSoftwareReference';
export interface MicrocomputerReference extends BoardReference {key(key:string):void;}
export const BUS_SOLUTION='FFFRJ';
// Authored independently as ingredient sets, rather than native table offsets.
export const PANTRY_RECIPES=[['AB','CD','EF','ACE','BDF','AF','BCD','BE'],['ABC','DE','F','AD','BE','CF','AE','BCD'],['A','BC','DEF','AB','CE','DF','ACF','BDE']];
export function pantrySolutions(puzzle:number):number[][] {
 const out:number[][]=[];for(let subset=0;subset<256;subset++){const selected=PANTRY_RECIPES[puzzle]!.filter((_,i)=>(subset&(1<<i))!==0).join('');if([...'ABCDEF'].every(c=>[...selected].filter(v=>v===c).length===1))out.push(Array.from({length:8},(_,i)=>i).filter(i=>(subset&(1<<i))!==0));}return out;
}
export function microcomputerGamesReference(id:string):MicrocomputerReference|undefined {
 if(id==='bus-pilot'){
 const instructions=Array<string>(12).fill('.');let x=1,y=1,facing=1,pc=0,ticks=0,status=0;const visited=new Set<string>();
 const reset=()=>{x=y=1;facing=1;pc=ticks=status=0;visited.clear();};
 const tick=()=>{if(status)return;if(pc===12){status=2;return;}const op=instructions[pc++]!;ticks++;if(op==='.'||op==='S'){status=2;return;}if(op==='J')pc=0;else if(op==='L')facing=(facing+3)%4;else if(op==='R')facing=(facing+1)%4;else{const nx=x+[0,1,0,-1][facing]!,ny=y+[-1,0,1,0][facing]!;if(nx<1||nx>4||ny<1||ny>4||(nx>1&&nx<4&&ny>1&&ny<4)){status=2;return;}x=nx;y=ny;if(x===4&&y===1)visited.add('A');if(x===4&&y===4)visited.add('B');if(x===1&&y===4)visited.add('C');if(x===1&&y===1&&visited.size===3){status=1;return;}}if(ticks>=64)status=2;};
 return {get board(){const b=[...'######'+'#G..A#'+'#.##.#'+'#.##.#'+'#C..B#'+'######'];for(const [name,pos]of [['A',10],['B',28],['C',25]]as const)if(visited.has(name))b[pos]=name.toLowerCase();b[y*6+x]='^>v<'[facing]!;return b.join('')+instructions.map((v,i)=>i===pc?v.toLowerCase():v).join('');},get moves(){return ticks;},get status(){return status;},play(square){if(square<36)return;const i=square-36,cycle='.FLRJS';instructions[i]=cycle[(cycle.indexOf(instructions[i]!)+1)%6]!;reset();},step:tick,key(key){if(key==='b')reset();if(key==='g')while(!status)tick();if(key==='r'){instructions.fill('.');reset();}}};
 }
 if(id==='pantry-cover'){
 let puzzle=0,moves=0,status=0;const selected=new Set<number>();const clear=()=>{moves=status=0;selected.clear();};
 return {get board(){return PANTRY_RECIPES[puzzle]!.map((ingredients,row)=>String(row+1)+(selected.has(row)?'*':'.')+[...'ABCDEF'].map(c=>ingredients.includes(c)?c:'.').join('')).join('');},get moves(){return moves;},get status(){return status;},play(square){if(status)return;const row=Math.floor(square/8);if(selected.has(row))selected.delete(row);else selected.add(row);moves++;},step(){if(status)return;const used=[...selected].map(row=>PANTRY_RECIPES[puzzle]![row]!).join('');if([...'ABCDEF'].every(c=>[...used].filter(v=>v===c).length===1))status=1;},key(key){if(key==='p'){puzzle=(puzzle+1)%3;clear();}if(key==='r'){puzzle=0;clear();}}};
 }
}
