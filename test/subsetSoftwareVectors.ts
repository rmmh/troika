import type { TextSoftware } from '../src/world/software/native';
export function subsetSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(app.id!=='subset-target')return [];
  const cases:TextSoftware['examples']=[];
  const lists:number[][]=[];
  for(let code=0;code<81;code++){let k=code;const a:number[]=[];for(let i=0;i<4;i++){a.push(k%3-1);k=Math.floor(k/3);}lists.push(a);}
  for(let n=1;n<=8;n++)lists.push(Array(n).fill(99),Array(n).fill(-99),Array.from({length:n},(_,i)=>i%2?-99:99),Array.from({length:n},(_,i)=>i+1));
  for(const values of lists)for(const target of [-99,-3,-1,0,1,3,99]) {
    // Dynamic programming retains the best index set per reachable sum.
    let sums=new Map<number,number[]>([[0,[]]]);
    const mask=(indices:number[])=>indices.reduce((bits,i)=>bits+2**i,0);
    values.forEach((value,index)=>{
      const next=new Map(sums);
      for(const [sum,indices] of sums){const candidate=[...indices,index],old=next.get(sum+value);
        if(!old||candidate.length<old.length||(candidate.length===old.length&&mask(candidate)<mask(old)))next.set(sum+value,candidate);
      }
      sums=next;
    });
    const best=sums.get(target);cases.push({input:[target,...values].join(' '),output:best?(best.length?best.join(' '):'EMPTY'):'NONE'});
  }
  for(const input of ['', '0','100 1','1 -100','1 1 2 3 4 5 6 7 8 9','1,2','1 +'])cases.push({input,error:true});
  return cases;
}
