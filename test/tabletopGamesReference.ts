import type {BoardReference} from './simulationSoftwareReference';
export interface TabletopReference extends BoardReference {readonly turn:number;key(key:string):void;}
export const DRAUGHTS_INITIAL:number[]=Array.from({length:36},(_,i)=>(Math.floor(i/6)+i%6)%2===1?(i<12?2:i>=24?1:0):0);
export function draughtsReference(initial= DRAUGHTS_INITIAL,first=1,quietStart=0){
 const pieces=initial.slice();let turn=first,selected=-1,chain=false,moves=0,status=0,quiet=quietStart;
 const owner=(p:number)=>p>2?p-2:p;
 const legal=(from:number,to:number)=>{if(to<0||to>=36||owner(pieces[from]!)!==turn||pieces[to])return 0;const dr=Math.floor(to/6)-Math.floor(from/6),dc=to%6-from%6;if(Math.abs(dr)!==Math.abs(dc)||Math.abs(dr)<1||Math.abs(dr)>2)return 0;if(pieces[from]===1&&dr>=0||pieces[from]===2&&dr<=0)return 0;if(Math.abs(dr)===1)return 1;const victim=pieces[(from+to)/2]!;return victim&&owner(victim)!==turn?2:0;};
 const all=()=>pieces.flatMap((_,from)=>pieces.flatMap((_,to)=>legal(from,to)?[[from,to]as[number,number]]:[]));
 return {get pieces(){return pieces.slice();},get selection(){return selected;},get quiet(){return quiet;},get turn(){return turn;},get moves(){return moves;},get status(){return status;},get board(){return pieces.map((p,i)=>selected===i?'@':p?'.abAB'[p]!:(Math.floor(i/6)+i%6)%2===1?'.':' ').join('');},options(){const choices=all(),captures=choices.filter(([f,t])=>legal(f,t)===2);return chain?captures.filter(([f])=>f===selected):captures.length?captures:choices;},play(to:number){if(status)return;const kind=selected<0?0:legal(selected,to);if(!kind){if(!chain&&owner(pieces[to]!)===turn)selected=to;return;}if(kind===1&&all().some(([f,t])=>legal(f,t)===2))return;const from=selected;let p=pieces[from]!;pieces[from]=0;pieces[to]=p;moves++;if(kind===2){pieces[(from+to)/2]=0;quiet=0;}else quiet++;let crowned=false;if(p===1&&to<6||p===2&&to>=30){p+=2;pieces[to]=p;crowned=true;}if(kind===2&&!crowned&&pieces.some((_,dest)=>legal(to,dest)===2)){selected=to;chain=true;return;}selected=-1;chain=false;turn=3-turn;if(all().length===0)status=3-turn;else if(quiet>=80)status=3;},key(_key:string){}};
}
export const SEA_ENEMY=[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,2,0];
export const SEA_OWN=[0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0];
export function tabletopGamesReference(id:string):TabletopReference|undefined {
 if(id==='draughts')return draughtsReference();
 if(id==='hex-connection'){
 const cells=Array<string>(25).fill('.');let turn=1,moves=0,status=0;
 const won=()=>{const mark=turn===1?'X':'O',seen=new Set<number>(),pending=Array.from({length:5},(_,i)=>turn===1?i:i*5).filter(i=>cells[i]===mark);while(pending.length){const i=pending.pop()!;if(seen.has(i))continue;seen.add(i);if(turn===1?i>=20:i%5===4)return true;const r=Math.floor(i/5),c=i%5;for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1],[-1,1],[1,-1]]){const nr=r+dr!,nc=c+dc!;if(nr>=0&&nr<5&&nc>=0&&nc<5&&cells[nr*5+nc]===mark)pending.push(nr*5+nc);}}return false;};
 return {get board(){return cells.join('');},get moves(){return moves;},get turn(){return turn;},get status(){return status;},play(i){if(status||cells[i]!=='.')return;cells[i]=turn===1?'X':'O';moves++;if(won())status=turn;else turn=3-turn;},key(_key){}};
 }
 if(id==='dots-boxes'){
 const cells:string[]=Array.from({length:49},(_,i)=>Math.floor(i/7)%2?i%7%2?' ':'.':i%7%2?'.':'+');let turn=1,moves=0,status=0;const scores=[0,0];
 return {get board(){return cells.join('');},get moves(){return moves;},get turn(){return turn;},get status(){return status;},play(i){if(status||cells[i]!=='.')return;cells[i]=Math.floor(i/7)%2?'|':'-';moves++;let scored=false;for(const box of[8,10,12,22,24,26,36,38,40])if(cells[box]===' '&&[-7,7,-1,1].every(d=>cells[box+d]!=='.')){cells[box]=turn===1?'A':'B';scores[turn-1]=scores[turn-1]!+1;scored=true;}if(!scored)turn=3-turn;if(moves===24)status=scores[0]!>scores[1]!?1:2;},key(_key){}};
 }
 if(id==='sea-battle'){
 const own=Array<number>(25).fill(0),enemy=Array<number>(25).fill(0);let view=false,moves=0,status=0;
 const shoot=(marks:number[],fleet:number[],i:number)=>{marks[i]=fleet[i]?2:1;if(fleet[i]&&fleet.every((p,j)=>p!==fleet[i]||marks[j]!==0))fleet.forEach((p,j)=>{if(p===fleet[i])marks[j]=3;});};
 const defeated=(marks:number[],fleet:number[])=>fleet.every((p,i)=>!p||marks[i]!==0);
 const pick=()=>{for(let i=0;i<25;i++)if(own[i]===2){const r=Math.floor(i/5),c=i%5;for(const[dr,dc]of[[-1,0],[0,1],[1,0],[0,-1]]){const nr=r+dr!,nc=c+dc!;if(nr>=0&&nr<5&&nc>=0&&nc<5&&own[nr*5+nc]===0)return nr*5+nc;}}return own.findIndex((v,i)=>v===0&&(Math.floor(i/5)+i%5)%2===0)>=0?own.findIndex((v,i)=>v===0&&(Math.floor(i/5)+i%5)%2===0):own.indexOf(0);};
 return {get board(){const marks=view?own:enemy;return marks.map((v,i)=>view&&!v&&SEA_OWN[i]?String.fromCharCode(64+SEA_OWN[i]!):'.oX#'[v]!).join('')+(view?'YOURS':'ENEMY');},get moves(){return moves;},get turn(){return 1;},get status(){return status;},play(i){if(status||view||i>=25||enemy[i])return;shoot(enemy,SEA_ENEMY,i);moves++;if(defeated(enemy,SEA_ENEMY)){status=1;return;}shoot(own,SEA_OWN,pick());if(defeated(own,SEA_OWN))status=2;},step(){view=!view;},key(key){if(key==='n')view=!view;}};
 }
}
