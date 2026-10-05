import type {TextSoftware} from '../src/world/software/native';
type V=TextSoftware['examples'][number];
export function booleanTableReference(input:string):V {
 const tokens=[...input].filter(c=>c!==' ');let at=tokens.length-1;
 type Expr=(assignment:number)=>boolean;
 const parse=():Expr=>{
  const c=tokens[at--];if(c==='0'||c==='1')return()=>c==='1';
  if(c==='a'||c==='b'||c==='c'){const bit={a:4,b:2,c:1}[c];return n=>!!(n&bit);}
  if(c==='!'){const sub=parse();return n=>!sub(n);}
  if(c==='&'||c==='|'||c==='^'){const right=parse(),left=parse();return n=>c==='&'?left(n)&&right(n):c==='|'?left(n)||right(n):left(n)!==right(n);}
  throw Error('invalid');
 };
 try{const fn=parse();if(at!==-1)throw Error('extra operands');const values=Array.from({length:8},(_,i)=>Number(fn(i)));let output='abc:result (0=false 1=true)'.padEnd(27);for(let i=0;i<9;i++)output+=(i===8?'':`${i.toString(2).padStart(3,'0')}:${values[i]}`).padEnd(9);output+=values.every(v=>v===0)?'CONTRADICTION':values.every(v=>v===1)?'TAUTOLOGY':'CONTINGENT';return{input,output};}catch{return{input,error:true};}
}
export function booleanTableVectors(id:string):V[]{
 if(id!=='boolean-table')return[];
 const inputs=['',' ','ab','!','a&','ab&|','2','A','a+b','(ab&)','a?b','0'.repeat(54),'1'+'!'.repeat(53),'1'.repeat(27)+'&'.repeat(26),'a a ! &','a b & ! a ! b ! | ^'];
 for(const op of ['&','|','^'])for(const a of ['a','b','c','0','1'])for(const b of ['a','b','c','0','1'])inputs.push(a+b+op,a+b+op+'!');
 let seed=287;const rnd=(n:number)=>{seed=seed*48271%2147483647;return seed%n};const tree=(depth:number):string=>!depth?'abc01'[rnd(5)]!:rnd(4)===0?tree(depth-1)+'!':tree(depth-1)+tree(depth-1)+'&|^'[rnd(3)];
 for(let i=0;i<180;i++)inputs.push(tree(3));
 return inputs.map(booleanTableReference);
}
