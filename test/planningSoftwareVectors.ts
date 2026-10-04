import type { TextSoftware } from '../src/world/software/native';
type Range=[number,number];
export function planningSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['interval-union','interval-plan'].includes(app.id))return [];
  const cases:TextSoftware['examples']=[],lists:Range[][]=[];
  const choices:Range[]=[[-1,0],[0,1],[1,2],[-1,2],[0,0]];
  for(let code=0;code<625;code++) {let k=code;const list:Range[]=[];for(let i=0;i<4;i++){list.push(choices[k%5]!);k=Math.floor(k/5);}lists.push(list);}
  for(let n=1;n<=4;n++)for(let seed=0;seed<20;seed++)lists.push(Array.from({length:n},(_,i)=>{const a=(seed*37+i*19)%199-99,b=(seed*13+i*29)%199-99;return [Math.min(a,b),Math.max(a,b)] as Range;}));
  for(const ranges of lists) {
    const input=ranges.flat().join(' ');let output='';
    if(app.id==='interval-union') {
      // Connected components of intersecting closed ranges, rather than a sweep.
      const pending=new Set(ranges.map((_,i)=>i)),merged:Range[]=[];
      while(pending.size) {
        const first=[...pending][0]!,component=[first];pending.delete(first);
        for(let at=0;at<component.length;at++)for(const j of pending) {
          const a=ranges[component[at]!]!,b=ranges[j]!;
          if(a[0]<=b[1]&&b[0]<=a[1]){component.push(j);pending.delete(j);}
        }
        merged.push([Math.min(...component.map(i=>ranges[i]![0])),Math.max(...component.map(i=>ranges[i]![1]))]);
      }
      merged.sort((a,b)=>a[0]-b[0]);
      let length=0;for(let x=-99;x<99;x++)if(ranges.some(([a,b])=>a<=x&&b>=x+1))length++;
      output=merged.map(([a,b])=>`[${a},${b}]`).join(' ')+` length=${length}`;
    } else {
      if(ranges.some(([a,b])=>a>=b)){cases.push({input,error:true});continue;}
      // Enumerate every subset, maximizing count, then earliest finish/index sequence.
      const options:number[][]=[];
      for(let mask=1;mask<1<<ranges.length;mask++) {
        const selected=ranges.flatMap((_,i)=>mask&(1<<i)?[i]:[]).sort((a,b)=>ranges[a]![1]-ranges[b]![1]||a-b);
        if(selected.every((index,i)=>i===0||ranges[index]![0]>=ranges[selected[i-1]!]![1]))options.push(selected);
      }
      options.sort((a,b)=>{if(a.length!==b.length)return b.length-a.length;for(let i=0;i<a.length;i++){const d=ranges[a[i]!]![1]-ranges[b[i]!]![1]||a[i]!-b[i]!;if(d)return d;}return 0;});
      const best=options[0]!;output=`jobs=${best.join(' ')} count=${best.length}`;
    }
    cases.push({input,output});
  }
  for(const input of ['', '0','0 1 2','0 1 2 3 4','0 1 2 3 4 5 6','0 1 2 3 4 5 6 7 8','2 1','-99 -100','0 100','1,2','0 1 2 3 4 5 6 7 8 9'])cases.push({input,error:true});
  return cases;
}
