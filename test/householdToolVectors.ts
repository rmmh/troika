import type { TextSoftware } from '../src/world/software/native';
export function householdToolVectors(id:string):TextSoftware['examples'] {
 if(!['receipt-total','portion-shares'].includes(id))return [];
 const cases:TextSoftware['examples']=[];
 const receipt=(input:string)=>{
  const tokens=input.trim().split(/ +/);let sum=0;
  for(const token of tokens){
   if(!/^[+-]?\d{1,2}\.\d{2}$/.test(token)){cases.push({input,error:true});return;}
   const value=Number(token.replace('.',''));sum+=value;
   if(Math.abs(value)>9841||Math.abs(sum)>9841){cases.push({input,error:true});return;}
  }
  const magnitude=Math.abs(sum);cases.push({input,output:`items=${tokens.length} total=${sum<0?'-':''}${Math.floor(magnitude/100)}.${String(magnitude%100).padStart(2,'0')}`});
 };
 const shares=(seats:number,weights:number[])=>{
  const input=[seats,...weights].join(' '),sum=weights.reduce((a,b)=>a+b,0);
  if(!sum||seats<1||seats>99||weights.length>8||!weights.length||weights.some(w=>w<0||w>99)){cases.push({input,error:true});return;}
  const result=weights.map(w=>Math.floor(seats*w/sum));
  const ranking=weights.map((w,i)=>({i,r:seats*w%sum})).sort((a,b)=>b.r-a.r||a.i-b.i);
  const spare=seats-result.reduce((a,b)=>a+b,0);for(const {i} of ranking.slice(0,spare))result[i]!++;
  cases.push({input,output:result.join(' ')});
 };
 let seed=211;const rand=(n:number)=>{seed=seed*48271%2147483647;return seed%n;};
 if(id==='receipt-total'){
  for(const input of ['', ' ','.50','1.','1.0','1.000','1.00x','1.00,2.00','100.00','99.99','98.42','-98.42','98.41','-98.41','98.41 0.01','-98.41 -0.01','98.41 -98.41','-98.41 98.41','00.00','-0.00','+0.01','  1.00  2.00  ','+-1.00','1.00 -','01.23','000.00','1.00 2.00x'])receipt(input);
  for(let n=0;n<160;n++){const values=Array.from({length:1+rand(6)},()=>rand(19683)-9841);receipt(values.map(v=>`${v<0?'-':''}${Math.floor(Math.abs(v)/100)}.${String(Math.abs(v)%100).padStart(2,'0')}`).join(' '));}
 }else{
  for(let n=1;n<=8;n++)for(const seats of[1,2,7,27,99]){shares(seats,Array(n).fill(1));shares(seats,Array.from({length:n},(_,i)=>i?99:0));}
  for(let n=0;n<160;n++)shares(1+rand(99),Array.from({length:1+rand(8)},()=>rand(100)));
  for(const[seats,weights]of[[0,[1]],[100,[1]],[4,[]],[4,[0,0]],[4,[-1,2]],[4,[100]],[4,Array(9).fill(1)]]as[number,number[]][])shares(seats,weights);
  for(const input of['','3.0 1','3 1,2','3 +','3 --1'])cases.push({input,error:true});
 }
 return cases;
}
