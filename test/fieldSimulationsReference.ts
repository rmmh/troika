import type {BoardReference} from './simulationSoftwareReference';
export interface FieldReference extends BoardReference {adjustLevel(delta:number):void;}
export function fieldSimulationsReference(id:string):FieldReference|undefined{
 if(!['orbit-bench','contour-notebook'].includes(id))return;
 let moves=0,status=0,x=18,y=0,vx=0,vy=7,mode=0,level=3,profile=0,selected=0;
 const trail=Array<string>(49).fill('.'),heights=[0,1,2,2,1,0,1,3,4,4,3,1,2,4,7,7,4,2,2,4,7,9,5,2,1,3,4,5,3,1,0,1,2,2,1,0];
 const rounded=(n:number)=>Math.sign(n)*Math.floor((Math.abs(n)+4)/10);
 const position=()=> (3-rounded(y))*7+3+rounded(x);
 let marker=position();trail[marker]='*';
 return {adjustLevel(delta:number){if(id==='contour-notebook')level=Math.max(1,Math.min(9,level+delta));},get moves(){return moves;},get status(){return status;},get board(){
  if(id==='orbit-bench'){const s=[...trail];s[24]='O';if(marker>=0)s[marker]='@';return s.join('');}
  const s=Array<string>(64).fill(' ');
  if(mode===2){for(let c=0;c<6;c++){const h=heights[profile*6+c]!;for(let r=6-Math.ceil(h*6/9);r<6;r++)s[r*8+c]='#';s[48+c]=String(h);}[...`ROW ${profile+1}   `].forEach((v,i)=>s[56+i]=v);}
  else{
   heights.forEach((h,i)=>{const r=Math.floor(i/6),c=i%6;const adjacent=heights.filter((_,j)=>Math.abs(Math.floor(j/6)-r)+Math.abs(j%6-c)===1);s[r*8+c]=mode===0?String(h):h<level?'.':adjacent.some(n=>n<level)?'+':'#';});
   [...`LEVEL ${level} ${mode===0?'HEIGHTS ':'CONTOUR '}`].forEach((v,i)=>s[48+i]=v);
  }return s.join('');
 },play(square:number){
  selected=square;
  if(id==='orbit-bench'){vx=(square%7-3)*3;vy=(3-Math.floor(square/7))*3;x=18;y=0;moves=0;status=0;trail.fill('.');marker=position();trail[marker]='*';}
  else{const r=Math.floor(square/8),c=square%8;if(mode===2){if(r<6)profile=r;}else if(r===6)level=level%9+1;else if(r<6&&c<6){const i=r*6+c;heights[i]=(heights[i]!+1)%10;moves++;}}
 },step(){
  if(id==='orbit-bench'){
   if(status)return;const den=x*x+y*y+9;vx+=Math.trunc(-54*x/den);vy+=Math.trunc(-54*y/den);x+=vx;y+=vy;moves++;
   if(Math.abs(x)>30||Math.abs(y)>30){status=2;marker=-1;return;}
   marker=position();trail[marker]='*';if(x*x+y*y<9)status=2;else if(moves===64)status=1;
  }else{mode=(mode+1)%3;if(mode===2&&Math.floor(selected/8)<6)profile=Math.floor(selected/8);}
 },
 };
}
