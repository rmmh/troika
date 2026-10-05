import type {BoardReference} from './simulationSoftwareReference';
export interface ArcadeReference extends BoardReference {key(key:string):void;}
export function robotsReference(start={hero:27,robots:[0,1,6,7,56,63],scrap:[]as number[],charge:1}){
 let hero=start.hero,robots=start.robots.slice(),charge=start.charge,moves=0,status=0;const scrap=new Set(start.scrap);
 const tick=()=>{if(status)return;moves++;robots=robots.map(p=>{const r=Math.floor(p/8),c=p%8;return (r+Math.sign(Math.floor(hero/8)-r))*8+c+Math.sign(hero%8-c);});if(robots.includes(hero))status=2;const collisions=robots.filter((p,i)=>robots.indexOf(p)!==i);collisions.forEach(p=>scrap.add(p));robots=robots.filter(p=>!scrap.has(p));if(!status&&!robots.length)status=1;};
 return {get state(){return {hero,robots:robots.slice(),scrap:[...scrap],charge};},get board(){return Array.from({length:64},(_,i)=>i===hero?'@':robots.includes(i)?'R':scrap.has(i)?'#':'.').join('');},get moves(){return moves;},get status(){return status;},play(i:number){if(status||Math.abs(Math.floor(i/8)-Math.floor(hero/8))>1||Math.abs(i%8-hero%8)>1)return;hero=i;if(scrap.has(i)||robots.includes(i)){status=2;return;}tick();},step:tick,key(k:string){if(k!=='t'||status||!charge)return;const landing=Array.from({length:64},(_,i)=>i).find(i=>!scrap.has(i)&&robots.every(p=>Math.max(Math.abs(Math.floor(i/8)-Math.floor(p/8)),Math.abs(i%8-p%8))>1));if(landing===undefined)return;hero=landing;charge=0;tick();}};
}
/** Cell 64 denotes the one-charge teleport action. */
export function robotsSolution():number[]{
 const queue=[{state:robotsReference().state,path:[]as number[]}],seen=new Set<string>();
 for(let at=0;at<queue.length&&at<100_000;at++){
  const {state,path}=queue[at]!;if(path.length>=16)continue;
  const r=Math.floor(state.hero/8),c=state.hero%8,choices=[64];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(r+dr>=0&&r+dr<8&&c+dc>=0&&c+dc<8)choices.push((r+dr)*8+c+dc);
  for(const square of choices){const model=robotsReference(state);if(square===64)model.key('t');else model.play(square);if(model.status===1)return [...path,square];if(model.status)continue;const next=model.state,key=JSON.stringify(next);if(!seen.has(key)){seen.add(key);queue.push({state:next,path:[...path,square]});}}
 }
 throw new Error('No robot escape found');
}
export function snakeReference(start={body:[27,26,25],direction:1,fruit:29}){
 const body=start.body.slice();let direction=start.direction,next=direction,fruit=start.fruit,moves=0,status=0;
 return {get body(){return body.slice();},get direction(){return direction;},get fruit(){return fruit;},get board(){const b=Array<string>(64).fill('.');if(body.length<64)b[fruit]='*';body.forEach(p=>b[p]='o');b[body[0]!] = '^>v<'[next]!;return b.join('');},get moves(){return moves;},get status(){return status;},play(_i:number){},key(k:string){const d='wdsa'.indexOf(k);if(d>=0&&!status&&Math.abs(d-direction)!==2)next=d;},step(){if(status)return;direction=next;moves++;const h=body[0]!,r=Math.floor(h/8)+[-1,0,1,0][direction]!,c=h%8+[0,1,0,-1][direction]!;if(r<0||r>7||c<0||c>7){status=2;return;}const target=r*8+c,grows=target===fruit;if(body.slice(0,grows?body.length:-1).includes(target)){status=2;return;}body.unshift(target);if(!grows)body.pop();if(body.length===64){status=1;return;}if(grows){fruit=(fruit+17)%64;while(body.includes(fruit))fruit=(fruit+1)%64;}}};
}
export const MORRIS_CELLS=[0,3,6,8,10,12,16,17,18,21,22,23,25,26,27,30,31,32,36,38,40,42,45,48];
const lines=[[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const neighbors=(p:number)=>lines.flatMap(line=>{const i=line.indexOf(p);return i<0?[]:[line[i-1],line[i+1]].filter((v):v is number=>v!==undefined);});
export function morrisReference(start={pieces:Array<number>(24).fill(0),placed:[0,0],turn:1,quiet:0}){
 const pieces=start.pieces.slice(),placed=start.placed.slice();let turn=start.turn,quiet=start.quiet,selected=-1,remove=false,moves=0,status=0;
 const count=(side:number)=>pieces.filter(v=>v===side).length,mill=(point:number,side:number)=>lines.some(line=>line.includes(point)&&line.every(p=>pieces[p]===side));
 const finish=()=>{selected=-1;turn=3-turn;if(placed[0]===9&&placed[1]===9){if(count(turn)<3||(count(turn)>3&&!pieces.some((v,p)=>v===turn&&neighbors(p).some(n=>pieces[n]===0))))status=3-turn;else if(quiet>=50)status=3;}};
 return {get state(){return {pieces:pieces.slice(),placed:placed.slice(),turn,quiet,remove,selected};},get turn(){return turn;},get pendingRemoval(){return remove;},get board(){const b=[...'.--.--.'+'|.-.-.|'+'||...||'+'... ...'+'||...||'+'|.-.-.|'+'.--.--.'];pieces.forEach((v,p)=>b[MORRIS_CELLS[p]!]=selected===p?'@':v===1?'A':v===2?'B':'.');return b.join('');},get moves(){return moves;},get status(){return status;},options(){if(status)return [];if(remove){const opponent=3-turn,unprotected=pieces.map((v,p)=>v===opponent&&!mill(p,opponent)?p:-1).filter(p=>p>=0);return(unprotected.length?unprotected:pieces.map((v,p)=>v===opponent?p:-1).filter(p=>p>=0)).map(p=>[p]);}if(placed[turn-1]!<9)return pieces.flatMap((v,p)=>v===0?[[p]]:[]);return pieces.flatMap((v,p)=>v===turn?(count(turn)===3?pieces.flatMap((v,n)=>v===0?[n]:[]):neighbors(p).filter(n=>pieces[n]===0)).map(n=>[p,n]):[]);},play(square:number){if(status)return;const p=MORRIS_CELLS.indexOf(square);if(p<0)return;if(remove){if(pieces[p]!==3-turn)return;if(mill(p,3-turn)&&pieces.some((v,i)=>v===3-turn&&!mill(i,3-turn)))return;pieces[p]=0;quiet=0;remove=false;finish();return;}if(pieces[p]===turn){selected=p;return;}if(pieces[p])return;if(placed[turn-1]!<9)placed[turn-1]=placed[turn-1]!+1;else{if(selected<0||(count(turn)!==3&&!neighbors(selected).includes(p)))return;pieces[selected]=0;quiet++;}pieces[p]=turn;selected=-1;moves++;if(mill(p,turn))remove=true;else finish();},key(_k:string){}};
}
export const BOWLING_CELLS=[24,16,18,8,10,12,0,2,4,6];
export function bowlingReference(){
 let pins=Array<boolean>(10).fill(true),frame=1,ball=0,aim=3,spin=0,score=0,frameScore=0,moves=0,status=0;
 const bowl=()=>{if(status)return;moves++;let x=aim+[-1,0,1,0,-1][frame-1]!,fallen=0;for(let row=3;row>=0;row--){if(row===1)x+=spin;if(x<0||x>6)break;const cell=row*7+x,index=BOWLING_CELLS.indexOf(cell);if(index<0||!pins[index])continue;pins[index]=false;fallen++;if(row>0)for(const offset of spin<0?[-8]:spin>0?[-6]:[-8,-6]){const other=BOWLING_CELLS.indexOf(cell+offset);if(other>=0&&pins[other]){pins[other]=false;fallen++;}}}score+=fallen;frameScore+=fallen;ball++;if(ball===2||frameScore===10){if(frame===5){status=score>=35?1:2;return;}frame++;ball=frameScore=0;pins=Array<boolean>(10).fill(true);}};
 return {get frame(){return frame;},get score(){return score;},get aim(){return aim;},get spin(){return spin;},get board(){const b=[...'.......'.repeat(5)+'L..S..R'+'0123456'];pins.forEach((v,i)=>b[BOWLING_CELLS[i]!]=v?'X':'.');b[42+aim]='^';const s=spin<0?35:spin>0?41:38;b[s]=b[s]!.toLowerCase();return b.join('');},get moves(){return moves;},get status(){return status;},play(i:number){if(status)return;if(i>=42)aim=i-42;else if(i>=35)spin=i-35<3?-1:i-35>3?1:0;},step:bowl,key(_k:string){}};
}
export function retroArcadeReference(id:string):ArcadeReference|undefined {
 if(id==='robots')return robotsReference();if(id==='snake')return snakeReference();if(id==='nine-morris')return morrisReference();if(id==='pin-bowling')return bowlingReference();
}
