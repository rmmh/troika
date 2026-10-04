import type { TextSoftware } from '../src/world/software/native';
export function graphSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['graph-hops','dependency-order'].includes(app.id))return [];
  const cases:TextSoftware['examples']=[];
  const permutations=(xs:number[]):number[][]=>xs.length ? xs.flatMap(x=>permutations(xs.filter(y=>y!==x)).map(rest=>[x,...rest])) : [[]];
  const orders=permutations([0,1,2]);
  // All directed three-vertex graphs with at most four edges, including loops.
  for(let mask=0;mask<512;mask++) {
    const edges=Array.from({length:9},(_,i)=>[Math.floor(i/3),i%3] as const).filter((_,i)=>mask&(1<<i));
    if(edges.length>4)continue;
    const input=[3,...edges.flat()].join(' ');
    if(app.id==='dependency-order') {
      const order=orders.find(order=>edges.every(([a,b])=>order.indexOf(a)<order.indexOf(b)));
      cases.push({input,output:order?.join(' ')??'CYCLE'});
    } else {
      const distance=[0,-1,-1],queue=[0];
      while(queue.length) {const from=queue.shift()!;for(const [a,b] of edges)if(a===from&&distance[b]===-1){distance[b]=distance[a]!+1;queue.push(b);}}
      cases.push({input,output:distance.join(' ')});
    }
  }
  for(const input of ['', '0','10','-1','3 0','3 0 3','3 -1 0','3 1 99','3 0 1 1','3 x 1','3 0 1 0 1 0 1 0 1 0 1'])cases.push({input,error:true});
  cases.push({input:'9',output:app.id==='graph-hops'?'0 -1 -1 -1 -1 -1 -1 -1 -1':'0 1 2 3 4 5 6 7 8'},
    {input:'9 0 8 8 7 7 6 6 5',output:app.id==='graph-hops'?'0 -1 -1 -1 -1 4 3 2 1':'0 1 2 3 4 8 7 6 5'},
    {input:'  +3 0 1 0 1 ',output:app.id==='graph-hops'?'0 1 -1':'0 1 2'});
  return cases;
}
