import type {BoardReference} from './simulationSoftwareReference';
const two=(n:number)=>String(n).padStart(2,'0');
export const SCRAP_SOLUTION=[25,28,29,8,26,32,12,14,15,16,17];
export const MASK_SOLUTION='ABCDBCDACDABDABC';
export const HOTEL_SOLUTION=[28,30,32,32,32,4,6,36,36,20,36,32,32,32];
export function neighborhoodGamesReference(id:string):BoardReference|undefined {
 if(!['scrap-slider','mask-logic','pebble-mancala','hotel-elevator'].includes(id))return;
 let moves=0,status=0,selected=-1,player=0,floor=1;
 const crates=[12,8,25],lengths=[2,3,3],steps=[1,6,1],masks=[...'a..d.c....a.d...'],pits=[3,3,3,0,3,3,3,0],guests=[0,0,0,0,0],origins=[1,1,2,4,4],destinations=[4,3,4,1,2],guestCells=[28,30,20,4,6];
 const scrapBoard=()=>{const b=Array<string>(36).fill('.');crates.forEach((start,i)=>{for(let n=0;n<lengths[i]!;n++)b[start+n*steps[i]!]=String.fromCharCode((selected===i?97:65)+i);});return b;};
 return {get board(){
 if(id==='scrap-slider')return scrapBoard().join('');
 if(id==='mask-logic')return masks.join('');
 if(id==='pebble-mancala')return 'B'+[6,5,4].map(i=>two(pits[i]!)).join('')+'.S'+two(pits[7]!)+'..S'+two(pits[3]!)+'A'+[0,1,2].map(i=>two(pits[i]!)).join('')+'.TURN'+(player?'B':'A')+'...';
 const board=[...'4...d1e23.......2...c4..1...a4b3UP  DOWNCAB.....'];board[(4-floor)*8+2]='@';let slot=43;guests.forEach((state,i)=>{if(state){board[guestCells[i]!]='.';board[guestCells[i]!+1]='.';}if(state===1){board[slot++]=String.fromCharCode(97+i);board[slot++]=String(destinations[i]);}});return board.join('');
 },get moves(){return moves;},get status(){return status;},play(square:number){if(status)return;
 if(id==='scrap-slider'){const b=scrapBoard(),letter=b[square]!.toUpperCase();if('ABC'.includes(letter)){selected=letter.charCodeAt(0)-65;return;}if(selected<0||b[square]!=='.')return;const start=crates[selected]!,length=lengths[selected]!,step=steps[selected]!;let delta=0;if(square===start-step)delta=-step;else if(square===start+length*step)delta=step;else return;if(step===1&&(delta<0&&start%6===0||delta>0&&start%6+length>=6))return;crates[selected]!+=delta;moves++;if(crates[0]===16)status=1;return;}
 if(id==='mask-logic'){if(masks[square]!>='a')return;const next='.ABCD'[('.ABCD'.indexOf(masks[square]!)+1)%5]!;masks[square]=next;moves++;return;}
 if(id==='pebble-mancala'){const row=Math.floor(square/8),col=square%8;if(col<1||col>6||row!==(player?0:2))return;let pit=player?6-Math.floor((col-1)/2):Math.floor((col-1)/2);let stones=pits[pit]!;if(!stones)return;pits[pit]=0;const store=player?7:3,enemy=player?3:7;while(stones){pit=(pit+1)%8;if(pit===enemy)continue;pits[pit]!++;stones--;}
 if((player?pit>=4&&pit<=6:pit<=2)&&pits[pit]===1&&pits[6-pit]!>0){pits[store]!+=pits[pit]!+pits[6-pit]!;pits[pit]=pits[6-pit]=0;}
 moves++;if(pit!==store)player=1-player;const a=pits.slice(0,3).reduce((x,y)=>x+y,0),b=pits.slice(4,7).reduce((x,y)=>x+y,0);if(!a||!b){pits[3]!+=a;pits[7]!+=b;for(const i of[0,1,2,4,5,6])pits[i]=0;status=pits[3]!>pits[7]!?1:pits[3]!<pits[7]!?2:3;}return;}
 if(square>=32){if(square>=40)return;const next=floor+(square<36?1:-1);if(next<1||next>4)return;floor=next;moves++;guests.forEach((state,i)=>{if(state===1&&destinations[i]===floor)guests[i]=2;});if(guests.every(s=>s===2))status=1;else if(moves===10)status=2;return;}
 const guest=guestCells.findIndex(n=>square===n||square===n+1);if(guest<0||guests[guest]!==0||origins[guest]!==floor||guests.filter(s=>s===1).length===2)return;guests[guest]=1;
 },step(){if(id!=='mask-logic'||status)return;const b=masks.map(c=>c.toUpperCase());if(b.includes('.'))return;for(let i=0;i<4;i++)if(new Set(b.slice(i*4,i*4+4)).size!==4||new Set([b[i],b[i+4],b[i+8],b[i+12]]).size!==4)return;status=1;}};
}
