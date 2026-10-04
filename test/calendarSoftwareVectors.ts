import type { TextSoftware } from '../src/world/software/native';

// UTC dates provide an independent reference without daylight-saving changes.
export function calendarSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id!=='date-shift' && app.id!=='date-span')return cases;
  const day=86400000, first=Date.UTC(2000,0,1), last=Date.UTC(2099,11,31);
  const inputDate=(time:number)=>{const d=new Date(time);return `${d.getUTCFullYear()-2000} ${d.getUTCMonth()+1} ${d.getUTCDate()}`;};
  const shift=(time:number,offset:number)=>{
    const input=`${inputDate(time)} ${offset}`, result=time+offset*day;
    cases.push(result<first||result>last?{input,error:true}:{input,output:new Date(result).toISOString().slice(0,10)});
  };
  const span=(a:number,b:number)=>cases.push({input:`${inputDate(a)} ${inputDate(b)}`,output:String((b-a)/day)});
  if(app.id==='date-shift') {
    for(let year=2000;year<2100;year++)for(const offset of [-1,0,1])shift(Date.UTC(year,2,1),offset);
    for(const year of [2000,2001,2099])for(let month=0;month<12;month++)for(const offset of [-99,-1,1,99])shift(Date.UTC(year,month,1),offset);
    for(const offset of [-99,-1,0,1,99]){shift(first,offset);shift(last,offset);}
  } else {
    for(let year=2000;year<2100;year++){span(Date.UTC(year,1,28),Date.UTC(year,2,1));span(Date.UTC(year,2,1),Date.UTC(year,1,28));}
    for(const offset of [0,1,99,100,101,999,9841,9842,36524]){span(first,first+offset*day);span(first+offset*day,first);}
    let seed=1984;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return first+(seed%36525)*day;};
    for(let i=0;i<256;i++)span(next(),next());
  }
  for(const date of ['-1 1 1','0 0 1','0 13 1','0 1 0','0 1 32','1 2 29','0 2 30','0 4 31','99 6 31']) {
    if(app.id==='date-shift')cases.push({input:date+' 0',error:true});
    else {cases.push({input:date+' 0 1 1',error:true});cases.push({input:'0 1 1 '+date,error:true});}
  }
  for(const input of ['', '0 1', '0 1 1','100 1 1 0','0 1 1 0 1','0 1 1 0 1 1 0','x 1 1 0'])cases.push({input,error:true});
  return cases;
}
