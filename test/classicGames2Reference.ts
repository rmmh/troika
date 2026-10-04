import type {BoardReference} from './simulationSoftwareReference';
const four=(n:number)=>String(n).padStart(4,'0');
export const HANOI_SOLUTION:number[]=(()=>{const result:number[]=[];const move=(n:number,a:number,b:number,c:number)=>{if(!n)return;move(n-1,a,c,b);result.push(a,b);move(n-1,c,b,a);};move(4,0,2,1);return result;})();
export function classicGames2Reference(id:string):BoardReference|undefined {
 if(!['acey-deucey','pig-bank','four-disk-hanoi','lantern-word'].includes(id))return;
 let moves=0,status=0,bank=id==='acey-deucey'?20:0,pot=0,die=0,left=8,seed=17,last=0,selected=-1,puzzle=0,misses=0;
 const hands=[[3,10,7],[5,6,5],[2,12,13],[4,11,6],[8,13,10],[1,9,4],[6,7,8],[2,11,9]],pegs=[[4,3,2,1],[],[]] as number[][],guessed=new Set<string>(),words=['TERNARY','LANTERN','ORBITAL','SEEDBED'];
 return {get board(){
 if(id==='acey-deucey'){const hand=hands[status?moves-1:moves]!;return `BANK${four(bank)}LOW ${four(hand[0]!)}HIGH${four(hand[1]!)}LAST${four(last)}1 5 9 P `;}
 if(id==='pig-bank')return `BANK${four(bank)}POT ${four(pot)}DIE ${four(die)}LEFT${four(left)}ROLLHOLD`;
 if(id==='four-disk-hanoi')return Array.from({length:4},(_,r)=>pegs.map(p=>p[3-r]??'.').join('')).join('')+[...'ABC'].map((v,i)=>selected===i?v.toLowerCase():v).join('');
 return [...words[puzzle]!].map(c=>guessed.has(c)||status===2?c:'_').join('')+' '+[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(c=>guessed.has(c)?'.':c).join('')+'      MISS'+four(misses);
 },get moves(){return moves;},get status(){return status;},play(square:number){if(status)return;
 if(id==='acey-deucey'){if(square<32)return;const stake=[1,5,9,0][Math.floor((square-32)/2)]!;if(stake>bank)return;const hand=hands[moves]!;last=hand[2]!;bank+=last>hand[0]!&&last<hand[1]!?stake:-stake;moves++;if(bank===0)status=2;else if(moves===8)status=bank>=30?1:2;return;}
 if(id==='pig-bank'){if(square<32)return;if(square<36){seed=(seed*5+1)%97;die=seed%6+1;moves++;if(die===1){pot=0;left--;}else pot+=die;}else{if(!pot)return;bank+=pot;pot=0;left--;}if(bank>=50)status=1;else if(!left)status=2;return;}
 if(id==='four-disk-hanoi'){const peg=square%3;if(selected<0){if(pegs[peg]!.length)selected=peg;return;}if(selected===peg){selected=-1;return;}const source=pegs[selected]!,target=pegs[peg]!,disk=source.at(-1)!;if(target.length&&target.at(-1)!<disk)return;source.pop();target.push(disk);selected=-1;moves++;if(pegs[2]!.length===4)status=1;return;}
 if(square<8||square>=34)return;const c=String.fromCharCode(square-8+65);if(guessed.has(c))return;guessed.add(c);moves++;if(!words[puzzle]!.includes(c))misses++;if(misses===6)status=2;else if([...words[puzzle]!].every(c=>guessed.has(c)))status=1;
 },step(){if(id==='lantern-word'&&!moves){puzzle=(puzzle+1)%4;misses=0;status=0;guessed.clear();}}};
}
