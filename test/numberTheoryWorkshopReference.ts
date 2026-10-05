import type {TextSoftware} from '../src/world/software/native';
const ids=['congruence-pair','diophantine-line','mod-square-roots','primitive-roots','mobius-sieve','jacobi-symbol'];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const mod=(a:number,m:number)=>(a%m+m)%m;
const list=(header:string,values:number[])=>header.padEnd(27)+(values.length?values.map(v=>String(v).padEnd(3)).join(''):'NONE');
export function numberTheoryWorkshopReference(id:string,input:string):string|undefined{
 if(!ids.includes(id)||!/^ *[+-]?\d{1,2}(?: +[+-]?\d{1,2})* *$/.test(input))return;
 const v=input.trim().split(/ +/).map(Number),a=v[0]!,b=v[1]!,c=v[2]!,d=v[3]!;
 if(id==='congruence-pair'){
  if(v.length!==4||b<1||b>99||d<1||d>99||a<0||a>=b||c<0||c>=d)return;
  const period=b*d/gcd(b,d);for(let x=0;x<period;x++)if(x%b===a&&x%d===c)return `x=${x}`.padEnd(27)+`period=${period}`;return'NONE';
 }
 if(id==='diophantine-line'){
  if(v.length!==3||a<1||a>99||b<1||b>99)return;const g=gcd(a,b);if(c%g)return'NONE';
  const eg=(x:number,y:number):[number,number]=>{if(!y)return[1,0];const [u,w]=eg(y,x%y);return[w,u-Math.floor(x/y)*w];};
  const dx=b/g,dy=-a/g,x=mod(eg(a,b)[0]*c/g,dx),y=(c-a*x)/b;
  return `x0=${x} y0=${y}`.padEnd(27)+`dx=${dx} dy=${dy}`.padEnd(27)+'x=x0+dx*t; y=y0+dy*t';
 }
 if(id==='mod-square-roots'){
  if(v.length!==2||b<2||b>99||a<0||a>=b)return;const roots=Array.from({length:b},(_,x)=>x).filter(x=>x*x%b===a);return list(`solutions=${roots.length}`,roots);
 }
 if(id==='primitive-roots'){
  if(v.length!==1||a<2||a>99)return;const units=Array.from({length:a-1},(_,i)=>i+1).filter(x=>gcd(x,a)===1),roots=units.filter(x=>{const orbit=new Set<number>();let value=1;while(!orbit.has(value)){orbit.add(value);value=value*x%a;}return orbit.size===units.length;});return list(`phi=${units.length} generators=${roots.length}`,roots);
 }
 if(id==='mobius-sieve'){
  if(v.length!==1||a<1||a>99)return;const mu=(n:number)=>{let factors=0;for(let p=2;p<=n;p++)if(n%p===0){n/=p;factors++;if(n%p===0)return 0;}return factors%2?-1:1;};let total=0,free=0;for(let n=1;n<=a;n++){const m=mu(n);total+=m;if(m)free++;}return `mu(n)=${mu(a)}`.padEnd(27)+`Mertens=${total}`.padEnd(27)+`squarefree=${free}`;
 }
 if(v.length!==2||b<1||b>99||b%2===0)return;
 let n=b,result=1;for(let p=3;p<=n;p+=2){let exponent=0;while(n%p===0){exponent++;n/=p;}if(exponent){const residue=mod(a,p);if(!residue){result=0;break;}let value=1;for(let i=0;i<(p-1)/2;i++)value=value*residue%p;if(exponent%2&&value===p-1)result=-result;}}
 return `Jacobi=${result}`.padEnd(27)+(result===0?'Shared factor (n>1)':result===1?'1 is not a square proof':'Not a square residue');
}
export function numberTheoryWorkshopVectors(app:TextSoftware){
 if(!ids.includes(app.id))return[];const inputs=['','invalid','100','1,2','1 2 3 4 5','-99 -99','  +1  +1  '];
 if(app.id==='congruence-pair'){
 for(let m=1;m<=12;m++)for(let n=1;n<=12;n++){inputs.push(`${m-1} ${m} 0 ${n}`);if((m+n)%3===0)inputs.push(`0 ${m} ${n-1} ${n}`);}inputs.push('98 99 97 98','0 99 0 99','1 0 1 2','2 2 1 3','0 2 3 3');
 }else if(app.id==='diophantine-line'){
 for(let a=1;a<=12;a++)for(let b=1;b<=12;b++)inputs.push(`${a} ${b} ${(a*7+b*11)%31-15}`);for(const a of[1,2,98,99])for(const b of[1,2,98,99])for(const c of[-99,0,99])inputs.push(`${a} ${b} ${c}`);inputs.push('0 2 1','2 0 1','-1 2 1');
 }else if(app.id==='mod-square-roots'){
 for(let n=2;n<=25;n++)for(let a=0;a<n;a++)inputs.push(`${a} ${n}`);for(const n of[64,72,81,97,98,99])for(let a=0;a<n;a++)inputs.push(`${a} ${n}`);inputs.push('0 1','1 1','-1 9','9 9');
 }else if(app.id==='primitive-roots'||app.id==='mobius-sieve'){
 for(let n=0;n<=99;n++)inputs.push(String(n));
 }else{
 for(let n=1;n<=99;n+=2)for(const a of[-99,-7,-1,0,1,2,3,7,99])inputs.push(`${a} ${n}`);inputs.push('1 0','1 2','1 -3');
 }
 return [...app.examples,...inputs.map(input=>{const output=numberTheoryWorkshopReference(app.id,input);return output===undefined?{input,error:true as const}:{input,output};})];
}
