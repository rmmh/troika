import type {TextSoftware} from '../src/world/software/native';
const row=(s:string)=>s.padEnd(27),mod=(n:number)=>(n%3+3)%3;
export function reduceTernaryMatrix(input:number[][]){
 const a=input.map(r=>[...r]),pivots:number[]=[];let rank=0;
 for(let col=0;col<a[0]!.length&&rank<a.length;col++){
  const pivot=a.findIndex((r,i)=>i>=rank&&r[col]!==0);if(pivot<0)continue;
  [a[rank],a[pivot]]=[a[pivot]!,a[rank]!];const scale=a[rank]![col]!;
  a[rank]=a[rank]!.map(x=>mod(x*scale));
  for(let i=0;i<a.length;i++)if(i!==rank){const factor=a[i]![col]!;a[i]=a[i]!.map((x,j)=>mod(x-factor*a[rank]![j]!));}
  pivots.push(col);rank++;
 }
 const basis=Array.from({length:a[0]!.length},(_,i)=>i).filter(i=>!pivots.includes(i)).map(free=>Array.from({length:a[0]!.length},(_,col)=>col===free?1:pivots.includes(col)?mod(-a[pivots.indexOf(col)]![free]!):0));
 return{a,pivots,rank,basis};
}
export function ternaryMatrixReference(input:string):string|undefined {
 const match=/^([RN]) ([1-4]) ([1-5])\|([012]+)$/.exec(input);if(!match)return;
 const[,mode,rs,cs,digits]=match,r=Number(rs),c=Number(cs);if(digits!.length!==r*c)return;
 const matrix=Array.from({length:r},(_,i)=>[...digits!.slice(i*c,(i+1)*c)].map(Number)),result=reduceTernaryMatrix(matrix);
 const heading=row(`Rank ${result.rank}; nullity ${c-result.rank}`);
 if(mode==='R')return heading+row('Pivot columns: '+result.pivots.map(i=>`${i+1} `).join(''))+result.a.map((r,i)=>row(`${i+1}: ${r.map(x=>`${x} `).join('')}`)).join('');
 return heading+(result.basis.length?result.basis.map((v,i)=>row(`v${i+1}: ${v.map(x=>`${x} `).join('')}`)).join(''):'Only the zero vector');
}
export function ternaryRecurrenceDetails(input:string){
 const sequence=[...input].map(Number);let connection=new Map([[0,1]]),previous=new Map([[0,1]]),order=0,shift=1,oldDiscrepancy=1;
 for(let n=0;n<sequence.length;n++){
  const discrepancy=mod(sequence[n]!+Array.from({length:order},(_,i)=>(connection.get(i+1)??0)*sequence[n-i-1]!).reduce((a,b)=>a+b,0));
  if(discrepancy===0){shift++;continue;}
  const saved=connection,ratio=mod(discrepancy*oldDiscrepancy);connection=new Map(connection);
  for(const[index,value]of previous)connection.set(index+shift,mod((connection.get(index+shift)??0)-ratio*value));
  if(2*order<=n){order=n+1-order;previous=saved;oldDiscrepancy=discrepancy;shift=1;}else shift++;
 }
 const coefficients=Array.from({length:order+1},(_,i)=>connection.get(i)??0),future=[...sequence];
 for(let step=0;step<6;step++)future.push(mod(-coefficients.slice(1).reduce((sum,c,i)=>sum+c*future[future.length-i-1]!,0)));
 return{order,coefficients,next:future.slice(sequence.length)};
}
export function ternaryRecurrenceReference(input:string):string|undefined {
 if(!/^[012]{1,24}$/.test(input))return;
 const r=ternaryRecurrenceDetails(input);
 return row(`Order: ${r.order}`)+row('C:'+r.coefficients.join(''))+row('Next 6: '+r.next.join(''))+row('Rule: s+sum(Ci*past)=0')+row('Finite prefix; not a law')+'C0=1; oldest lag last';
}
export function ternaryLinearVectors(app:TextSoftware):TextSoftware['examples'] {
 const reference=app.id==='ternary-matrix'?ternaryMatrixReference:app.id==='ternary-recur'?ternaryRecurrenceReference:undefined;if(!reference)return[];
 const out:TextSoftware['examples']=[...app.examples],add=(input:string)=>{const output=reference(input);out.push(output===undefined?{input,error:true}:{input,output});};
 let seed=402;const random=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 if(app.id==='ternary-matrix'){
  for(let encoded=0;encoded<81;encoded++)for(const mode of['R','N'])add(`${mode} 2 2|${encoded.toString(3).padStart(4,'0')}`);
  for(let r=1;r<=4;r++)for(let c=1;c<=5;c++)for(const mode of['R','N']){add(`${mode} ${r} ${c}|${'0'.repeat(r*c)}`);for(let t=0;t<4;t++)add(`${mode} ${r} ${c}|${Array.from({length:r*c},()=>random(3)).join('')}`);}
  for(const input of['','R 0 1|0','N 5 1|00000','R 1 6|000000','R 2 2|000','R 1 1|3','X 1 1|1','R2 2|0000','N 1 1|00'])add(input);
 }else{
  for(let n=1;n<=5;n++)for(let x=0;x<3**n;x++)add(x.toString(3).padStart(n,'0'));
  for(let n=6;n<=24;n++){add('0'.repeat(n));add('1'.repeat(n));add('0'.repeat(n-1)+'1');add('1'+'0'.repeat(n-1));for(let t=0;t<5;t++)add(Array.from({length:n},()=>random(3)).join(''));}
  for(const input of['','3','-1','1 2','0'.repeat(25)])add(input);
 }
 return out;
}
