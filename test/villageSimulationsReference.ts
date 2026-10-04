import type {BoardReference} from './simulationSoftwareReference';
export function villageSimulationsReference(id:string):BoardReference|undefined{
 if(!['tram-dispatch','pipe-workshop','parcel-round','star-alignment'].includes(id))return;
 let moves=0,status=0,a=16,b=23,runA=true,runB=true,fork=false,pos=0,origin=0,rotation=0;
 const pipes=[1,4,4,3,2,4,4,0,1,4,4,3,4,4,4,0],ports=[[0,1],[1,2],[2,3],[3,0],[0,2],[1,3]],names=['NE','ES','SW','WN','NS','EW'];
 const picked=[false,false,false],bag=[false,false,false],delivered=[false,false,false],pick=[8,16,26],homes=[5,30,35];
 const shape=[[0,0],[0,1],[1,1],[2,1]];
 const stars=()=>shape.map(([r,c])=>{let x=r!,y=c!;for(let n=0;n<rotation;n++){[x,y]=[y,2-x];}return origin+x*6+y;});
 const align=()=>{if(stars().every(i=>[20,21,22,26].includes(i)))status=1;};
 return {get moves(){return moves;},get status(){return status;},get board(){
  if(id==='tram-dispatch'){const s=[...(runA?'A GO    ':'A STOP  ')+'..----..--------'+(fork?'FORKSIDE':'FORKMAIN')+(runB?'B GO    ':'B STOP  ')];if(a>=0)s[a]='A';if(b>=0)s[b]='B';return s.join('');}
  if(id==='pipe-workshop')return pipes.map(n=>names[n]).join('');
  if(id==='parcel-round'){const s=[...'.....A..a.......b.........c...B....C'];picked.forEach((v,i)=>{if(v)s[pick[i]!] ='.';});delivered.forEach((v,i)=>{if(v)s[homes[i]!] ='+';});s[pos]='@';return s.join('');}
  const s=Array<string>(36).fill('.');[20,21,22,26].forEach(i=>s[i]='*');stars().forEach(i=>s[i]=s[i]==='*'?'O':'+');return s.join('');
 },play(square:number){
  if(status)return;
  if(id==='tram-dispatch'){const row=Math.floor(square/8);if(row===0)runA=!runA;if(row===4)runB=!runB;if(row===3)fork=!fork;}
  else if(id==='pipe-workshop'){const i=Math.floor(square/2);pipes[i]=pipes[i]!<4?(pipes[i]!+1)%4:9-pipes[i]!;moves++;}
  else if(id==='parcel-round'){
   if(Math.abs(Math.floor(pos/6)-Math.floor(square/6))+Math.abs(pos%6-square%6)!==1)return;pos=square;moves++;
   pick.forEach((n,i)=>{if(n===pos&&!picked[i]&&bag.filter(Boolean).length<2){picked[i]=true;bag[i]=true;}});
   homes.forEach((n,i)=>{if(n===pos&&bag[i]){bag[i]=false;delivered[i]=true;}});
   if(delivered.every(Boolean))status=1;else if(moves===24)status=2;
  }else{if(Math.floor(square/6)>3||square%6>3||square===origin)return;origin=square;moves++;align();}
 },step(){
  if(status)return;
  if(id==='tram-dispatch'){const oldA=a,oldB=b;if(runA&&a>=0)a=a===23?-1:a===18&&fork?10:a===13?21:a+1;if(runB&&b>=0)b=b===16?-1:b-1;moves++;if(a>=0&&(a===b||(a===oldB&&b===oldA)))status=2;else if(a<0&&b<0)status=1;else if(moves===12)status=2;}
  else if(id==='pipe-workshop'){
   let cell=0,inlet=0;for(let count=1;count<=16;count++){const pair=ports[pipes[cell]!]!;if(!pair.includes(inlet))return;const out=pair.find(n=>n!==inlet)!;const row=Math.floor(cell/4),col=cell%4;if(out===3&&cell===12){if(count===16)status=1;return;}const nr=row+[-1,0,1,0][out]!,nc=col+[0,1,0,-1][out]!;if(nr<0||nr>3||nc<0||nc>3)return;cell=nr*4+nc;inlet=(out+2)%4;}
  }else if(id==='star-alignment'){rotation=(rotation+1)%4;moves++;align();}
 }};
}
