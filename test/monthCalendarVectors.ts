import type {TextSoftware} from '../src/world/software/native';
export function monthCalendarVectors(id:string):TextSoftware['examples']{
 if(id!=='month-calendar')return[];
 const cases:TextSoftware['examples']=[];
 for(let year=2000;year<=2099;year++)for(let month=1;month<=12;month++){
  const start=new Date(Date.UTC(year,month-1,1)).getUTCDay(),length=new Date(Date.UTC(year,month,0)).getUTCDate();
  const rows=Array.from({length:6},(_,r)=>Array.from({length:7},(_,c)=>{
   const d=r*7+c-start+1;return d<1||d>length?'   ':String(d).padStart(2,' ')+' ';
  }).join('')+'      ');
  cases.push({input:`${year}-${String(month).padStart(2,'0')}`,output:rows.join('')});
 }
 for(const input of['','1999-12','2100-01','2000-00','2000-13','2026-1','2026/01','2026-01 ',' 2026-01','20a0-01','2000-a1','2000-1a','2a00-01'])cases.push({input,error:true});
 return cases;
}
