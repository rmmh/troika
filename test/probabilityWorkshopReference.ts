import type {TextSoftware} from '../src/world/software/native';
const ids=['dice-counts','urn-draw','run-probability','gambler-walk','coupon-collector','cycle-counts'];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const fraction=(a:number,b:number)=>{const g=gcd(a,b);return b/g===1?String(a/g):`${a/g}/${b/g}`;};
const histogram=(total:number,counts:number[],start:number,group:number,width:number)=>{const rows=[`total=${total}`];for(let i=start;i<counts.length;i+=group)rows.push(`${i}: `+counts.slice(i,i+group).map(n=>String(n).padEnd(width)).join(''));return rows.map(s=>s.padEnd(27)).join('');};
export function probabilityWorkshopReference(id:string,input:string):string|undefined{
 if(!ids.includes(id)||!/^ *[+-]?\d{1,2}(?: +[+-]?\d{1,2})* *$/.test(input))return;
 const a=input.trim().split(/ +/).map(Number),n=a[0]!;
 if(id==='dice-counts'){
 const s=a[1]!;if(a.length!==2||n<1||n>4||s<2||s>6)return;
 const counts=Array<number>(n*s+1).fill(0);const visit=(remaining:number,sum:number)=>{if(!remaining){counts[sum]!++;return;}for(let face=1;face<=s;face++)visit(remaining-1,sum+face);};visit(n,0);return histogram(s**n,counts,n,5,4);
 }
 if(id==='urn-draw'){
 const k=a[1]!,d=a[2]!;if(a.length!==3||n<1||n>12||k<0||k>n||d<0||d>n)return;
 const counts=Array<number>(d+1).fill(0);let total=0;for(let mask=0;mask<2**n;mask++){let bits=0,success=0;for(let i=0;i<n;i++)if(mask&(1<<i)){bits++;if(i<k)success++;}if(bits===d){counts[success]!++;total++;}}return histogram(total,counts,0,5,4);
 }
 if(id==='run-probability'){
 const k=a[1]!,b=a[2]!;if(a.length!==3||n<1||n>13||k<1||k>n||(b!==0&&b!==1))return;
 let match=0;for(let mask=0;mask<2**n;mask++)if(mask.toString(2).padStart(n,'0').includes(String(b).repeat(k)))match++;
 return `matching=${match}`.padEnd(27)+`total=${2**n}`.padEnd(27)+`probability=${fraction(match,2**n)}`;
 }
 if(id==='gambler-walk'){
 const start=a[1]!,steps=a[2]!;if(a.length!==3||n<2||n>8||start<0||start>n||steps<0||steps>12)return;
 const counts=Array<number>(n+1).fill(0);for(let mask=0;mask<2**steps;mask++){let pos=start;for(let i=0;i<steps;i++)if(pos!==0&&pos!==n)pos+=(mask&(1<<i))?1:-1;counts[pos]!++;}return histogram(2**steps,counts,0,4,5);
 }
 if(id==='coupon-collector'){
 if(a.length!==1||n<1||n>8)return;let numerator=0,denominator=1; // Sum with common n! denominator, independent of guest incremental reduction.
 for(let i=1;i<=n;i++)denominator*=i;for(let i=1;i<=n;i++)numerator+=n*denominator/i;
 return `kinds=${n}`.padEnd(27)+`expected draws=${fraction(numerator,denominator)}`;
 }
 if(a.length!==1||n<1||n>7)return;const counts=Array<number>(n+1).fill(0),p:number[]=[];let total=0;
 const visit=()=>{if(p.length<n){for(let i=0;i<n;i++)if(!p.includes(i)){p.push(i);visit();p.pop();}return;}let cycles=0;const seen=new Set<number>();for(let i=0;i<n;i++)if(!seen.has(i)){cycles++;let j=i;while(!seen.has(j)){seen.add(j);j=p[j]!;}}counts[cycles]!++;total++;};visit();return histogram(total,counts,1,4,5);
}
export function probabilityWorkshopVectors(app:TextSoftware){
 if(!ids.includes(app.id))return[];const inputs:string[]=['','invalid','0','99','-1','1,2','1 2 3 4','1 2 3 4 5 6 7 8 9 0'];
 switch(app.id){
 case'dice-counts':for(let n=1;n<=4;n++)for(let s=2;s<=6;s++)inputs.push(`${n} ${s}`);inputs.push('0 6','5 6','1 1','1 7','  +2 +6  ');break;
 case'urn-draw':for(let n=1;n<=12;n++)for(let k=0;k<=n;k++)for(const d of new Set([0,1,Math.floor(n/2),n]))inputs.push(`${n} ${k} ${d}`);inputs.push('13 1 1','4 5 1','4 1 5','4 -1 2','4 2 -1');break;
 case'run-probability':for(let n=1;n<=13;n++)for(let k=1;k<=n;k++)for(let b=0;b<2;b++)inputs.push(`${n} ${k} ${b}`);inputs.push('14 2 0','2 3 0','2 0 0','2 1 2');break;
 case'gambler-walk':for(let n=2;n<=8;n++)for(let start=0;start<=n;start++)for(const steps of [0,1,4,12])inputs.push(`${n} ${start} ${steps}`);inputs.push('1 0 1','9 0 1','4 5 1','4 1 13','4 1 -1');break;
 case'coupon-collector':for(let n=1;n<=9;n++)inputs.push(String(n));break;
 case'cycle-counts':for(let n=1;n<=8;n++)inputs.push(String(n));break;
 }
 return [...app.examples,...inputs.map(input=>{const output=probabilityWorkshopReference(app.id,input);return output===undefined?{input,error:true as const}:{input,output};})];
}
