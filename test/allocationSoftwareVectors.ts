import type { TextSoftware } from '../src/world/software/native';
function packing(capacity:number,items:number[]):string {
  // Separate exhaustive placement search proves the minimum bin count.
  let optimum=items.length;const loads:number[]=[];
  const place=(at:number)=>{if(at===items.length){optimum=Math.min(optimum,loads.length);return;}if(loads.length>=optimum)return;
    const tried=new Set<number>();for(let i=0;i<loads.length;i++)if(loads[i]!+items[at]!<=capacity&&!tried.has(loads[i]!)){tried.add(loads[i]!);loads[i]!+=items[at]!;place(at+1);loads[i]!-=items[at]!;}
    loads.push(items[at]!);place(at+1);loads.pop();};place(0);
  // Reproduce the documented deterministic tie policy, then validate its plan.
  const states=1<<items.length,dp=Array.from({length:states},()=>({bins:99,last:99,item:-1}));dp[0]={bins:1,last:0,item:-1};
  for(let mask=1;mask<states;mask++)for(let item=0;item<items.length;item++)if(mask&(1<<item)) {
    const before=dp[mask^(1<<item)]!,fits=before.last+items[item]!<=capacity;
    const candidate={bins:before.bins+(fits?0:1),last:fits?before.last+items[item]!:items[item]!,item};
    if(candidate.bins<dp[mask]!.bins||candidate.bins===dp[mask]!.bins&&candidate.last<dp[mask]!.last)dp[mask]=candidate;
  }
  const assignments=Array<number>(items.length);let mask=states-1,bin=dp[mask]!.bins-1;
  while(mask){const item=dp[mask]!.item,prior=mask^(1<<item);assignments[item]=bin;if(dp[prior]!.bins<dp[mask]!.bins)bin--;mask=prior;}
  const used=Array<number>(optimum).fill(0);items.forEach((size,i)=>{const b=assignments[i]!;if(b<0||b>=optimum)throw new Error('Invalid packing bin');used[b]!+=size;});
  if(dp[states-1]!.bins!==optimum||used.some(size=>size<1||size>capacity))throw new Error('Nonoptimal packing reference');
  return 'bins='+optimum+' assignment='+assignments.join(' ');
}
export function allocationSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='bin-pack') {
    const add=(capacity:number,items:number[])=>cases.push({input:[capacity,...items].join(' '),output:packing(capacity,items)});
    for(let code=0;code<256;code++){let bits=code;const items:number[]=[];for(let i=0;i<4;i++){items.push(bits%4+1);bits=Math.floor(bits/4);}add(4,items);}
    for(let n=1;n<=8;n++){add(99,Array(n).fill(99));add(99,Array(n).fill(1));add(99,Array.from({length:n},(_,i)=>i%2?49:50));}
    let seed=31;for(let run=0;run<48;run++){const items=Array.from({length:8},()=>{seed=(seed*48271)%2147483647;return seed%20+1;});add(20,items);}
    add(10,[6,5,3,2,2,2]);
    for(const input of ['','5','0 1','-1 1','5 0','5 -1','5 6','100 1','5 1 1 1 1 1 1 1 1 1'])cases.push({input,error:true});
  }
  if(app.id==='assignment-plan') {
    const add=(values:number[])=>{const n=values.length===4?2:3,orders=n===2?[[0,1],[1,0]]:[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
      const scored=orders.map(columns=>({columns,cost:columns.reduce((sum,c,r)=>sum+values[r*n+c]!,0)})).sort((a,b)=>a.cost-b.cost);
      cases.push({input:values.join(' '),output:'cost='+scored[0]!.cost+' columns='+scored[0]!.columns.join(' ')});};
    for(let code=0;code<81;code++){let bits=code;add(Array.from({length:4},()=>{const v=[-99,0,99][bits%3]!;bits=Math.floor(bits/3);return v;}));}
    for(let mask=0;mask<512;mask++)add(Array.from({length:9},(_,i)=>mask&(1<<i)?99:-99));
    for(const input of ['','1','1 2 3','1 2 3 4 5','100 0 0 0','0 0 0 x'])cases.push({input,error:true});
  }
  return cases;
}
