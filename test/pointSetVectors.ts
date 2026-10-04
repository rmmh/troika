import type { TextSoftware } from '../src/world/software/native';
type Point=[number,number];
const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points:Point[]):string {
  const p=[...new Map(points.map(v=>[v.join(','),v])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(p.length===1)return p[0]!.join(',');
  const half=(points:Point[])=>{const stack:Point[]=[];for(const point of points){while(stack.length>1&&cross(stack.at(-2)!,stack.at(-1)!,point)<=0)stack.pop();stack.push(point);}return stack.slice(0,-1);};
  return [...half(p),...half([...p].reverse())].map(v=>v.join(',')).join(' ');
}
function closest(points:Point[]):string {
  const candidates=points.flatMap((a,i)=>points.slice(i+1).map((b,j)=>({d:(a[0]-b[0])**2+(a[1]-b[1])**2,i:i+1,j:i+j+2})));
  candidates.sort((a,b)=>a.d-b.d||a.i-b.i||a.j-b.j);const best=candidates[0]!;
  return `d2=${best.d} pair=${best.i},${best.j}`;
}
export function pointSetVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(!['closest-points','convex-hull'].includes(app.id))return cases;
  const add=(points:Point[])=>cases.push({input:points.flat().join(' '),output:app.id==='convex-hull'?hull(points):closest(points)});
  const corners:Point[]=[[-9,-9],[9,-9],[9,9],[-9,9]];
  for(const n of [2,3,4])for(let code=0;code<4**n;code++){let digits=code;add(Array.from({length:n},()=>{const p=corners[digits%4]!;digits=Math.floor(digits/4);return p;}));}
  let seed=309;for(let sample=0;sample<256;sample++){const points:Point[]=[];for(let i=0;i<2+sample%3;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%19-9;seed=(Math.imul(seed,1664525)+1013904223)>>>0;points.push([x,seed%19-9]);}add(points);}
  for(const points of [[[0,0],[1,1],[2,2],[3,3]],[[1,1],[0,3],[3,0],[0,0]],[[2,2],[2,2],[2,2],[2,2]]] as Point[][])add(points);
  if(app.id==='convex-hull')for(const p of corners)add([p]);
  for(const input of ['', '1','0 0 1','0 0 1 1 2','0 0 1 1 2 2 3 3 4','10 0 1 1','0 -10 1 1','a 0 1 1'])cases.push({input,error:true});
  return cases;
}
