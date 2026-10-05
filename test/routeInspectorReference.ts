import type {TextSoftware} from '../src/world/software/native';
const row=(s:string)=>s.padEnd(27);
export function routeInspectorReference(input:string):string|undefined {
 if(!/^[1-6]\|[0-5]*$/.test(input)||input.length>54||(input.length-2)%2)return;
 const n=Number(input[0]),edges:Array<[number,number]>=[];
 const adj=Array.from({length:n},()=>new Set<number>()),degree=Array<number>(n).fill(0);
 for(let i=2;i<input.length;i+=2){const a=Number(input[i]),b=Number(input[i+1]);if(a>=n||b>=n)return;edges.push([a,b]);adj[a]!.add(b);adj[b]!.add(a);degree[a]!++;degree[b]!++;}
 const paths=Array.from({length:n},(_,start)=>{
  const found:Array<number[]|undefined>=Array(n);found[start]=[start];const queue=[start];
  for(const v of queue)for(const w of [...adj[v]!].sort((a,b)=>a-b))if(!found[w]){found[w]=[...found[v]!,w];queue.push(w);}
  return found;
 });
 const active=degree.flatMap((d,i)=>d?[i]:[]);
 if(active.some(v=>!paths[active[0]!]![v]))return 'IMPOSSIBLE: separate edges';
 const odd=degree.flatMap((d,i)=>d%2?[i]:[]);
 type Plan={cost:number;pairs:Array<[number,number]>};const memo=new Map<number,Plan>();
 function solve(mask:number):Plan{if(!mask)return {cost:0,pairs:[]};const cached=memo.get(mask);if(cached)return cached;let a=0;while(!(mask&(1<<a)))a++;let best:Plan={cost:Infinity,pairs:[]};for(let b=a+1;b<odd.length;b++)if(mask&(1<<b)){const tail=solve(mask^(1<<a)^(1<<b)),cost=paths[odd[a]!]![odd[b]!]!.length-1+tail.cost;if(cost<best.cost)best={cost,pairs:[[odd[a]!,odd[b]!],...tail.pairs]};}memo.set(mask,best);return best;}
 const plan=solve((1<<odd.length)-1);
 return row(`extra=${plan.cost} total=${edges.length+plan.cost}`)+(plan.pairs.length?plan.pairs.map(([a,b])=>row('repeat '+paths[a]![b]!.join('-'))).join(''):row('No repeated paths needed'))+'Closed tour is now possible';
}
export function routeInspectorVectors(app:TextSoftware):Array<{input:string;output?:string;error?:boolean}>{
 if(app.id!=='route-inspector')return [];
 const inputs=new Set<string>(['6|0102030405','6|010203040512131415232425343545','6|001122334455','6|010123234545','1|'+'00'.repeat(26),'2|'+'01'.repeat(26),'6|010112233445','6|00010112','6|0000','4|01122330']);
 for(let n=1;n<=4;n++){const pairs:string[]=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)pairs.push(`${a}${b}`);for(let bits=0;bits<2**pairs.length;bits++)inputs.add(`${n}|`+pairs.filter((_,i)=>bits&(1<<i)).join(''));}
 let seed=92713;const rand=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let k=0;k<256;k++){const n=5+k%2,count=rand(27);let text=`${n}|`;for(let j=0;j<count;j++)text+=`${rand(n)}${rand(n)}`;inputs.add(text);}
 for(const bad of ['', '0|','7|','2','2|0','2|02','2|10a','2| 01','2||','-1|','3|001234','2|010','1|11'])inputs.add(bad);
 return [...app.examples,...[...inputs].map(input=>{const output=routeInspectorReference(input);return output===undefined?{input,error:true}:{input,output};})];
}
