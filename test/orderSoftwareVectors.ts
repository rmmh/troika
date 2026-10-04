import type { TextSoftware } from '../src/world/software/native';

export function orderSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['sample-ranks','inversion-count','majority-value','nearest-readings'].includes(app.id)) return [];
  const cases:TextSoftware['examples']=[];
  const lists:number[][]=[];
  for(let n=1;n<=9;n++) {
    lists.push(Array(n).fill(0),Array(n).fill(-99),Array(n).fill(99),Array.from({length:n},(_,i)=>i%2 ? -99:99));
    for(let seed=0;seed<5;seed++) lists.push(Array.from({length:n},(_,i)=>(seed*37+i*i*13+i*seed*19)%199-99));
  }
  for(let code=0;code<243;code++) {
    let k=code;const a:number[]=[];
    for(let i=0;i<5;i++) {a.push(k%3-1);k=Math.floor(k/3);} lists.push(a);
  }
  for(const a of lists) {
    const input=a.join(' ');let output='';
    if(app.id==='sample-ranks') {
      const sorted=[...a].sort((x,y)=>x-y);output=a.map(x=>sorted.indexOf(x)+1).join(' ');
    } else if(app.id==='inversion-count') {
      const sorted=[...a];let swaps=0;
      for(let end=sorted.length;end>1;end--) for(let i=1;i<end;i++) if(sorted[i-1]!>sorted[i]!) {
        [sorted[i-1],sorted[i]]=[sorted[i]!,sorted[i-1]!];swaps++;
      }
      output=String(swaps);
    } else if(app.id==='majority-value') {
      const counts=new Map<number,number>();for(const x of a) counts.set(x,(counts.get(x)??0)+1);
      const winner=[...counts].find(([,n])=>n>a.length/2);output=winner?String(winner[0]):'NONE';
    } else {
      if(a.length<2) {cases.push({input,error:true});continue;}
      // Adjacent sorted value groups suffice, including duplicates within a group.
      const groups=[...new Set(a)].sort((x,y)=>x-y).map(x=>({x,indices:a.flatMap((v,i)=>v===x?[i]:[])}));
      const candidates:{gap:number;first:number;second:number}[]=[];
      for(let i=0;i<groups.length;i++) {
        const g=groups[i]!;
        if(g.indices.length>1) candidates.push({gap:0,first:g.indices[0]!,second:g.indices[1]!});
        if(i) {
          const prev=groups[i-1]!,pair=[prev.indices[0]!,g.indices[0]!].sort((x,y)=>x-y);
          candidates.push({gap:g.x-prev.x,first:pair[0]!,second:pair[1]!});
        }
      }
      candidates.sort((x,y)=>x.gap-y.gap||x.first-y.first||x.second-y.second);
      const c=candidates[0]!;output=`gap=${c.gap} first=${c.first} second=${c.second}`;
    }
    cases.push({input,output});
  }
  for(const input of ['', ' ', '+', '-', '100', '-100', '1.5', '1,2', '1 2 3 4 5 6 7 8 9 0']) cases.push({input,error:true});
  return cases;
}
