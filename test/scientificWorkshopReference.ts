import type {TextSoftware}from'../src/world/software/native';
const ids=['resistor-stack','thin-lens','spring-stepper','mixing-tanks','reaction-balance','simpson-bench'];
type Rat=[bigint,bigint];const gcd=(a:bigint,b:bigint):bigint=>b?gcd(b,a%b):a<0n?-a:a;const rat=(n:bigint,d=1n):Rat=>{const g=gcd(n,d);return d<0n?[-n/g,-d/g]:[n/g,d/g];};const add=(a:Rat,b:Rat)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);const mul=(a:Rat,b:Rat)=>rat(a[0]*b[0],a[1]*b[1]);const div=(a:Rat,b:Rat)=>rat(a[0]*b[1],a[1]*b[0]);const neg=(a:Rat):Rat=>[-a[0],a[1]];const text=(r:Rat)=>r[1]===1n?String(r[0]):`${r[0]}/${r[1]}`;const frac=(a:number,b:number)=>text(rat(BigInt(a),BigInt(b)));const rows=(s:string[])=>s.map((v,i)=>i===s.length-1?v:v.padEnd(27)).join('');
export function scientificWorkshopReference(id:string,input:string):string|undefined{
 if(!ids.includes(id))return;
 if(id==='resistor-stack'){
  const stack:Rat[]=[];if(!input)return;for(const ch of input){if(/^[1-9]$/.test(ch)){if(stack.length===8)return;stack.push([BigInt(ch),1n]);}else{if(!'SP'.includes(ch)||stack.length<2)return;const b=stack.pop()!,a=stack.pop()!,cross=a[0]*b[1]+b[0]*a[1],product=ch==='S'?a[1]*b[1]:a[0]*b[0];if(cross>9841n||product>9841n)return;stack.push(ch==='S'?rat(cross,product):rat(product,cross));}}return stack.length===1?`R=${text(stack[0]!)} ohms`:undefined;
 }
 if(id==='reaction-balance'){
  if(!/^\d{12}$/.test(input))return;const m=Array.from({length:3},(_,r)=>Array.from({length:4},(_,c)=>rat(BigInt(Number(input[3*c+r])*(c<2?1:-1)))));let row=0;const pivots:number[]=[];
  for(let col=0;col<4&&row<3;col++){const pivot=m.findIndex((r,i)=>i>=row&&r[col]![0]!==0n);if(pivot<0)continue;[m[row],m[pivot]]=[m[pivot]!,m[row]!];const divisor=m[row]![col]!;m[row]=m[row]!.map(x=>div(x,divisor));for(let r=0;r<3;r++)if(r!==row){const factor=m[r]![col]!;m[r]=m[r]!.map((x,c)=>add(x,neg(mul(factor,m[row]![c]!))));}pivots.push(col);row++;}
  if(row<3)return'UNDERDETERMINED';const free=[0,1,2,3].find(c=>!pivots.includes(c))!,v:Array<Rat>=Array.from({length:4},()=>rat(0n));v[free]=rat(1n);pivots.forEach((p,r)=>v[p]=neg(m[r]![free]!));if(v.some(x=>x[0]<=0n))return'NO POSITIVE BALANCE';const denominator=v.reduce((a,b)=>a*b[1]/gcd(a,b[1]),1n),nums=v.map(x=>x[0]*denominator/x[1]),g=nums.reduce((a,b)=>gcd(a,b));const a=nums.map(n=>n/g);return rows([`reactants: ${a[0]} ${a[1]}`,`products: ${a[2]} ${a[3]}`,'C/H/O atoms conserved']);
 }
 if(!/^ *[+-]?\d{1,2}(?: +[+-]?\d{1,2})* *$/.test(input))return;const a=input.trim().split(/ +/).map(Number);
 if(id==='thin-lens'){
  const[f,u]=a as[number,number];if(a.length!==2||!f||u<1)return;if(u===f)return'AT INFINITY (u=f)';return rows([`v=${frac(f*u,u-f)}`,`M=${frac(-f,u-f)}`,f*u/(u-f)>0?'REAL inverted':'VIRTUAL upright']);
 }
 if(id==='spring-stepper'){
  let[x,v,k,d,n]=a as[number,number,number,number,number];if(a.length!==5||Math.abs(x)>9||Math.abs(v)>9||k<0||k>9||d<0||d>9||n<0||n>4)return;const out:string[]=[];for(let t=0;t<=n;t++){out.push(`t${t} x=${x} v=${v}`);const force=Math.trunc(k*x/10),drag=Math.trunc(d*v/10);v-=force+drag;x+=v;}return rows(out);
 }
 if(id==='mixing-tanks'){
  const[V,A,B,n]=a as[number,number,number,number];if(a.length!==4||V<1||V>9||A<0||A>9||B<0||B>9||n<0||n>3)return;
  // Closed-form symmetric/difference modes, independent of the guest's update.
  const out=[`conserved total=${A+B}`];for(let t=0;t<=n;t++){const factor=rat(BigInt((V-2)**t),BigInt(V**t)),difference=mul(rat(BigInt(A-B)),factor),sum=rat(BigInt(A+B));out.push(`t${t} A=${text(div(add(sum,difference),rat(2n)))} B=${text(div(add(sum,neg(difference)),rat(2n)))}`);}return rows(out);
 }
 const h=a[0]!,y=a.slice(1);if(![3,5,7].includes(y.length)||h<1||h>9||y.some(v=>Math.abs(v)>9))return;let simpson:Rat=rat(0n),trap:Rat=rat(0n);for(let i=0;i<y.length-2;i+=2)simpson=add(simpson,rat(BigInt(h*(y[i]!+4*y[i+1]!+y[i+2]!)),3n));for(let i=0;i<y.length-1;i++)trap=add(trap,rat(BigInt(h*(y[i]!+y[i+1]!)),2n));return rows([`Simpson=${text(simpson)}`,`trapezoid=${text(trap)}`,`difference=${text(add(simpson,neg(trap)))}`]);
}
export function scientificWorkshopVectors(app:TextSoftware){if(!ids.includes(app.id))return[];const inputs=['','invalid','100','-99','1,2','1 2 3 4 5 6 7 8 9 0'];let seed=307;const rnd=(n:number)=>(seed=seed*48271%2147483647)%n;
 if(app.id==='resistor-stack'){
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(const op of['S','P'])inputs.push(`${a}${b}${op}`);for(let i=0;i<120;i++){let s=String(rnd(9)+1);for(let j=0;j<7;j++)s+=`${rnd(9)+1}${rnd(2)?'S':'P'}`;inputs.push(s);}inputs.push('123456789SSSSSSSS','12345678SSSSSSS','0','2S','23','23s','2 3S','999999999S','898P7S6P5S4P3S2P1S');
 }else if(app.id==='thin-lens'){
  for(const f of[-99,-10,-1,1,2,10,99])for(const u of[1,2,9,10,11,15,98,99])inputs.push(`${f} ${u}`);inputs.push('0 1','1 0','1 -1');
 }else if(app.id==='spring-stepper'){
  for(let i=0;i<160;i++)inputs.push(`${rnd(19)-9} ${rnd(19)-9} ${rnd(10)} ${rnd(10)} ${rnd(5)}`);inputs.push('9 9 0 0 4','-9 -9 9 9 4','10 0 1 1 1','0 10 1 1 1','0 0 10 1 1','0 0 1 10 1','0 0 1 1 5');
 }else if(app.id==='mixing-tanks'){
  for(let v=1;v<=9;v++)for(const a of[0,1,9])for(const b of[0,2,9])for(let n=0;n<=3;n++)inputs.push(`${v} ${a} ${b} ${n}`);inputs.push('0 1 1 1','10 1 1 1','1 10 1 1','1 1 -1 1','1 1 1 4');
 }else if(app.id==='reaction-balance'){
  inputs.push('140002102021','000000000000','100010001111','111222333444','999999999999','100010110000','100010001001','1'.repeat(11),'1'.repeat(13));for(let i=0;i<160;i++)inputs.push(Array.from({length:12},()=>String(rnd(10))).join(''));
 }else{
  for(let i=0;i<160;i++)inputs.push([rnd(9)+1,...Array.from({length:[3,5,7][rnd(3)]!},()=>rnd(19)-9)].join(' '));inputs.push('1 0 1 4','9 -9 9 -9 9 -9 9 -9','0 1 2 3','1 1 2','1 1 2 3 4','1 10 0 0');
 }
 return[...app.examples,...inputs.map(input=>{const output=scientificWorkshopReference(app.id,input);return output===undefined?{input,error:true as const}:{input,output};})];}
