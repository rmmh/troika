import type {BoardReference} from './simulationSoftwareReference';
export const WALK_EDGES=[[0,1,1],[1,2,3],[3,4,11],[4,5,13],[6,7,21],[7,8,23],[0,3,5],[1,4,7],[2,5,9],[3,6,15],[4,7,17],[5,8,19],[1,3,6],[5,7,18]];
export const WALK_SQUARES=[0,2,4,10,12,14,20,22,24];
export const WALK_SOLUTION=[0,2,4,14,12,10,20,22,24,14,22,12,2,10,0];
export const SKY_SOLUTION=[2,1,4,3,3,4,1,2,4,2,3,1,1,3,2,4];
const seen=(line:number[])=>line.filter((v,i)=>line.slice(0,i).every(previous=>v>previous)).length;
const gridInitial='#3212#2....22....21....33....1#2231#';
const cos=[3,3,2,1,0,-1,-2,-3,-3,-3,-2,-1,0,1,2,3];
const sin=[0,1,2,3,3,3,2,1,0,-1,-2,-3,-3,-3,-2,-1];
export function spiroReference(step:number,radius:number):string {
 const pixels=Array<string>(64).fill('.');
 const points=Array.from({length:17},(_,n)=>{const i=n%16,j=i*step%16;return [3+Math.round(((3-radius)*cos[i]!+radius*cos[j]!)/3),3+Math.round(((3-radius)*sin[i]!-radius*sin[j]!)/3)];});
 // Independent major-axis rasterization with exact half-step tie direction.
 for(let i=1;i<points.length;i++){
  const [x0,y0]=points[i-1]!,[x1,y1]=points[i]!;
  const dx=x1!-x0!,dy=y1!-y0!,count=Math.max(Math.abs(dx),Math.abs(dy));
  if(!count){pixels[y0!*8+x0!]='*';continue;}
  for(let t=0;t<=count;t++){
   const round=(distance:number)=>Math.sign(distance)*Math.floor((2*Math.abs(distance)*t+count-1)/(2*count));
   // Strict Bresenham tests choose the near endpoint on an exact half cell.
   const x=x0!+round(dx),y=y0!+round(dy);pixels[y*8+x]='*';
  }
 }
 return pixels.join('');
}
export function neighborhoodCreativeReference(id:string):BoardReference|undefined {
 if(!['three-ink-print','one-stroke-walk','cardboard-sky','spiro-notebook'].includes(id))return;
 let moves=0,status=0,view=0,current=-1,step=3,radius=1;
 const layers=Array.from({length:3},()=>Array<boolean>(64).fill(false));
 let cells=[...(id==='one-stroke-walk'?'A-B-C|/| |D-E-F| |/|G-H-I':id==='cardboard-sky'?gridInitial:'.'.repeat(64))];
 const used=new Set<number>();
 return {
 get board(){if(id==='three-ink-print')return Array.from({length:64},(_,i)=>view<3?(layers[view]![i]?'YMC'[view]:'.'):'.YMRCGBK'[(layers[0]![i]?1:0)+(layers[1]![i]?2:0)+(layers[2]![i]?4:0)]).join('');return cells.join('');},
 get moves(){return moves;},get status(){return status;},
 play(square:number){if(status)return;
  if(id==='three-ink-print'){if(view<3){layers[view]![square]=!layers[view]![square];moves++;}return;}
  if(id==='spiro-notebook'){if(square<8){step=step%7+1;cells=Array<string>(64).fill('.');}else if(square>=56){radius=radius%3+1;cells=Array<string>(64).fill('.');}return;}
  if(id==='cardboard-sky'){const row=Math.floor(square/6),col=square%6;if(row>=1&&row<=4&&col>=1&&col<=4){const old=cells[square]!;cells[square]=old==='.'?'1':old==='4'?'.':String(Number(old)+1);moves++;}return;}
  const next=WALK_SQUARES.indexOf(square);if(next<0)return;if(current<0){current=next;cells[square]='@';return;}
  const edge=WALK_EDGES.findIndex(([a,b],i)=>!used.has(i)&&((a===current&&b===next)||(b===current&&a===next)));
  if(edge<0)return;used.add(edge);cells[WALK_EDGES[edge]![2]!]='.';cells[WALK_SQUARES[current]!]=String.fromCharCode(97+current);cells[square]='@';current=next;moves++;
  if(moves===14)status=1;else if(!WALK_EDGES.some(([a,b],i)=>!used.has(i)&&(a===current||b===current)))status=2;
 },
 step(){if(status)return;
  if(id==='three-ink-print'){view=(view+1)%4;return;}
  if(id==='spiro-notebook'){cells=[...spiroReference(step,radius)];moves++;return;}
  if(id==='cardboard-sky'){
   const rows=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>Number(cells[(r+1)*6+c+1])));
   const columns=Array.from({length:4},(_,c)=>rows.map(row=>row[c]!));
   if([...rows,...columns].some(line=>new Set(line).size!==4||line.some(v=>v<1||v>4||!Number.isFinite(v))))return;
   if(rows.some((line,r)=>seen(line)!==Number(cells[(r+1)*6])||seen([...line].reverse())!==Number(cells[(r+1)*6+5])))return;
   if(columns.some((line,c)=>seen(line)!==Number(cells[c+1])||seen([...line].reverse())!==Number(cells[31+c])))return;
   status=1;
  }
 },
 };
}
