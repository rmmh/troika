import type {NativeSoftware} from '../src/world/software/native';
export function numberExplorerReference(id:string,input:number[]):number[]|undefined{
 const [a=0,b=0,c=0]=input;
 if(id==='discrete-log'){
  if(c<2||c>99||a<0||a>=c||b<0||b>=c)return;
  const seen=new Set<number>();let value=1,k=0;
  while(!seen.has(value)){if(value===b)return[1,k];seen.add(value);value=value*a%c;k++;}return[0,0];
 }
 if(id==='farey-next'){
  if(a<0||b<1||a>=b||c<b||c>99)return;
  const gcd=(x:number,y:number):number=>y?gcd(y,x%y):x;
  let bestN=1,bestD=1;
  for(let d=1;d<=c;d++)for(let n=1;n<=d;n++)if(gcd(n,d)===1&&n*b>a*d&&n*bestD<bestN*d){bestN=n;bestD=d;}
  return[bestN,bestD];
 }
 if(id==='pell-explorer'){
  if(a<2||a>99)return;
  for(let x=2;x<=99;x++){const y=Math.sqrt((x*x-1)/a);if(Number.isInteger(y))return[1,x,y];}return[0,0,0];
 }
 if(id==='aliquot-chain'){
  if(a<1||a>9841||b<1||b>27)return;
  const seen=new Set([a]);let value=a;
  for(let steps=0;steps<b;steps++){
   let next=0;for(let d=1;d<value;d++)if(value%d===0)next+=d;
   if(next>9841)return[value,steps,3];value=next;
   if(!value)return[value,steps+1,1];if(seen.has(value))return[value,steps+1,2];seen.add(value);
  }return[value,b,0];
 }
}
export function numberExplorerVectors(app:NativeSoftware):NativeSoftware['examples']{
 const inputs:number[][]=[];
 if(app.id==='discrete-log'){
  for(let m=2;m<=12;m++)for(let a=0;a<m;a++)for(let b=0;b<m;b++)inputs.push([a,b,m]);
  for(const m of[2,3,4,5,8,9,16,27,49,97,99])for(const a of[0,1,2,m-1])if(a<m)for(const b of[0,1,2,m-1])if(b<m)inputs.push([a,b,m]);
  inputs.push([-1,0,9],[9,0,9],[1,-1,9],[1,9,9],[1,1,1],[1,1,100]);
 }
 if(app.id==='farey-next'){
  for(let n=1;n<=10;n++)for(let b=1;b<=n;b++)for(let a=0;a<b;a++)inputs.push([a,b,n]);
  for(const n of[1,2,3,8,16,27,55,99])for(const b of[1,2,3,Math.floor(n/2),n])if(b>0&&b<=n)for(const a of[0,1,b-1])if(a<b)inputs.push([a,b,n]);
  inputs.push([-1,3,9],[1,0,9],[3,3,9],[1,3,2],[1,3,100]);
 }
 if(app.id==='pell-explorer'){for(let d=0;d<=101;d++)inputs.push([d]);inputs.push([-1],[9841]);}
 if(app.id==='aliquot-chain'){
  for(let n=1;n<=128;n++)inputs.push([n,27]);
  for(const n of[1,2,3,4,6,10,12,28,96,120,220,284,496,562,1184,1210,2620,2924,5020,5564,8128,9240,9841])for(const limit of[1,2,7,27])inputs.push([n,limit]);
  inputs.push([0,1],[-1,27],[6,0],[6,28]);
 }
 return inputs.map(input=>{const output=numberExplorerReference(app.id,input);return output?{input,output}:{input,error:true};});
}
