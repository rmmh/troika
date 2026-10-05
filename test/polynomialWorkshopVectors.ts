import type {TextSoftware} from '../src/world/software/native';
type Vector=TextSoftware['examples'][number];
const field=(prefix:string,a:number[],start=0)=>{const s=a.map((n,i)=>`${prefix}${i+start}=${n}`.padEnd(9)).join('');return s.padEnd(Math.ceil(s.length/27)*27)};
const checked=(n:number)=>{if(Math.abs(n)>9841)throw Error('overflow');return n};
const trim=(a:number[])=>{while(a.length>1&&a.at(-1)===0)a.pop();return a};
const det=(a:number[][]):number=>a.length===1?a[0]![0]!:a[0]!.reduce((sum,x,j)=>sum+(-1)**j*x*det(a.slice(1).map(r=>r.filter((_,i)=>i!==j))),0);
const choose=(n:number,k:number)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v};
const frac=(a:number,b:number)=>{if(b<0){a=-a;b=-b}let x=Math.abs(a),y=b;while(y)[x,y]=[y,x%y];a/=x;b/=x;return b===1?`${a}`:`${a}/${b}`};
export function polynomialWorkshopReference(id:string,input:string):Vector{
 const error:Vector={input,error:true};if(!/^ *[+-]?\d+(?: +[+-]?\d+)* *$/.test(input))return error;
 const a=input.trim().split(/ +/).map(Number);if(a.length>9||a.some(v=>Math.abs(v)>99))return error;
 try{let output='';if(id==='quad-resultant'){
  if(a.length!==6||a.some(v=>Math.abs(v)>3)||!a[2]||!a[5])return error;
  const [c,b,x,f,e,d]=a as [number,number,number,number,number,number];const r=det([[x,b,c,0],[0,x,b,c],[d,e,f,0],[0,d,e,f]]);output=`R=${r}`.padEnd(27)+(r===0?'SHARED FACTOR':'COPRIME');
 }else{
 if(a.some(v=>Math.abs(v)>9))return error;
 if(id==='poly-division'){
 const n=a[0]!,m=a.length-n-1;if(n<1||n>4||m<1||m>4)return error;
 const r=trim(a.slice(1,n+1)),b=trim(a.slice(n+1));if(b.length===1&&b[0]===0)return error;const q=Array(4).fill(0);
 while(r.length>=b.length&&!(r.length===1&&r[0]===0)){
 const k=r.length-b.length,v=r.at(-1)!/b.at(-1)!;if(!Number.isInteger(v))return error;q[k]=v;
 for(let j=0;j<b.length;j++)r[k+j]=checked(r[k+j]!-v*b[j]!);trim(r);
 }output=field('q',trim(q))+field('r',r);
 }else if(id==='integral-fit'){
 if(a.length<4||a.length>8||a.length%2)return error;const x=a.filter((_,i)=>i%2===0),y=a.filter((_,i)=>i%2===1);if(x.some(v=>Math.abs(v)>3)||new Set(x).size!==x.length)return error;
 const matrix=x.map(v=>Array.from({length:x.length},(_,i)=>v**i)),den=det(matrix);const c=x.map((_,j)=>det(matrix.map((r,i)=>r.map((v,k)=>k===j?y[i]!:v)))/den);if(c.some(v=>!Number.isInteger(v)))return error;output=field('c',c.map(checked));
 }else if(id==='quadratic-roots'){
 if(a.length!==3)return error;const [x,b,c]=a as [number,number,number];if(!x){output=!b?(c?'NONE':'ALL REAL'):`x=${frac(-c,b)}`}
 else{const d=b*b-4*x*c,s=Math.sqrt(d);if(d<0)output='COMPLEX';else if(!Number.isInteger(s))output=`IRRATIONAL D=${d}`;else if(!s)output=`x=${frac(-b,2*x)}`;else{const nums=x>0?[-b-s,-b+s]:[b-s,b+s];output=`x1=${frac(nums[0]!,Math.abs(2*x))}`.padEnd(27)+`x2=${frac(nums[1]!,Math.abs(2*x))}`}}
 }else if(id==='poly-translate'){
 if(a.length<2||a.length>8||Math.abs(a[0]!)>3)return error;const h=a[0]!,c=a.slice(1),v=c.map((_,j)=>checked(c.reduce((s,x,i)=>i<j?s:s+x*choose(i,j)*h**(i-j),0)));
 // The native contract also checks Horner intermediates, independently emulate only that bound.
 let p=[c.at(-1)!];for(let i=c.length-2;i>=0;i--){p=Array.from({length:p.length+1},(_,j)=>checked((j?p[j-1]!:c[i]!)+(p[j]??0)*h))}output=field('c',v);
 }else if(id==='newton-sums'){
 if(a.length<2||a.length>7||a[0]!<1)return error;const k=a[0]!,y=a.slice(1),b=y.map((_,j)=>y.slice(0,j+1).reduce((s,v,i)=>s+(-1)**(j-i)*choose(j,i)*v,0));
 const totals=Array.from({length:k},(_,i)=>checked(b.reduce((s,v,j)=>s+v*choose(i+1,j+1),0)));
 // Contract checks the finite difference state needed for each requested prefix as well.
 for(let i=0;i<k;i++)for(let j=0;j<b.length;j++)checked(b.slice(j).reduce((s,v,r)=>s+choose(i,r)*v,0));
 output=field('B',b,1)+field('Q',totals,1);
 }else throw Error('unknown app');}
 return {input,output};}catch{return error}
}
export function polynomialWorkshopVectors(id:string):Vector[]{
 if(!['quad-resultant','poly-division','integral-fit','quadratic-roots','poly-translate','newton-sums'].includes(id))return []; 
 const inputs=['','1,2','100','1 2 3 4 5 6 7 8 9 0','-99','1.5','++1','1?2'];
 let seed=729;const rand=(n:number)=>{seed=(seed*48271)%2147483647;return seed%n};
 if(id==='quad-resultant'){
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)for(const c of[-1,1])inputs.push(`${a} ${b} ${c} ${b} ${a} 1`);
  inputs.push('3 3 3 -3 -3 -3','4 0 1 1 0 1');
 }else if(id==='poly-division'){
  inputs.push('1 0 0','4 0 0 0 0 0 1','4 1 2 0 0 1 0 0','4 9 9 9 9 -9 1','4 9 9 9 9 9 1','3 1 0 1 2 2','1 2 1','1 -2 -1','2 1 1 0 0 1');
  for(let i=0;i<100;i++){const n=1+rand(4),m=1+rand(4);inputs.push([n,...Array.from({length:n+m},()=>rand(7)-3)].join(' '))}
 }else if(id==='integral-fit'){
  inputs.push('0 0 0 1','-3 -9 0 0 3 9','0 1 1 2 2 5 3 10','3 9 2 4 1 1 0 0');
  for(let c0=-2;c0<=2;c0++)for(let c1=-2;c1<=2;c1++)for(let c2=-1;c2<=1;c2++)inputs.push([2,0,-1,1].flatMap(x=>[x,c0+c1*x+c2*x*x]).join(' '));
  for(let i=0;i<100;i++){const n=2+rand(3),x=[-3,-2,-1,0,1,2,3].sort(()=>rand(3)-1).slice(0,n);inputs.push(x.flatMap(v=>[v,rand(19)-9]).join(' '))}
 }else if(id==='quadratic-roots'){
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)for(let c=-3;c<=3;c++)inputs.push(`${a} ${b} ${c}`);
  inputs.push('9 9 -9','-9 9 9','0 -9 8','0 9 -8');
 }else if(id==='poly-translate'){
  inputs.push('3 9 9 9 9 9 9 9','-3 -9 9 -9 9 -9 9 -9','0 0 0 0 0 0 0 0','4 1','3 9 9 9 9 9 9','3 1 -9 9 -9 9 -9 9');
  for(let i=0;i<120;i++)inputs.push([rand(7)-3,...Array.from({length:1+rand(7)},()=>rand(19)-9)].join(' '));
 }else{
  inputs.push('9 -9 9 -9 9 -9 9','9 9 -9 9 -9 9 -9','1 9 -9 9 -9 9 -9','9 9','0 1','9 0 1 4 9','1 -9');
  for(let i=0;i<120;i++)inputs.push([1+rand(9),...Array.from({length:1+rand(6)},()=>rand(19)-9)].join(' '));
 }
 inputs.push(' '.repeat(25)+'1'+' '.repeat(28));return inputs.map(input=>polynomialWorkshopReference(id,input));
}
