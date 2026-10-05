import type {TextSoftware} from '../src/world/software/native';
const row=(s:string)=>s.padEnd(27);
export function groupTableReference(input:string):string|undefined {
 if(!/^[1-6]\|[0-5]+$/.test(input))return;
 const n=Number(input[0]),digits=[...input.slice(2)].map(Number);
 if(digits.length!==n*n||digits.some(x=>x>=n))return;
 const elements=Array.from({length:n},(_,i)=>i),op=(a:number,b:number)=>digits[a*n+b]!;
 for(const a of elements)for(const b of elements)for(const c of elements)if(op(op(a,b),c)!==op(a,op(b,c)))return row('NOT A GROUP')+row('Associativity fails')+row(`a,b,c = ${a},${b},${c}`)+`(a*b)*c=${op(op(a,b),c)}  a*(b*c)=${op(a,op(b,c))}`;
 const identity=elements.find(e=>elements.every(x=>op(e,x)===x&&op(x,e)===x));
 if(identity===undefined)return row('NOT A GROUP')+'No two-sided identity';
 const inverse:number[]=[];
 for(const a of elements){const b=elements.find(b=>op(a,b)===identity&&op(b,a)===identity);if(b===undefined)return row('NOT A GROUP')+`No inverse for element ${a}`;inverse.push(b);}
 const center=elements.filter(a=>elements.every(b=>op(a,b)===op(b,a)));
 return row(`${center.length===n?'ABELIAN GROUP':'GROUP'}; order=${n}`)+row(`Identity: ${identity}`)+row('Inverses by element:')+row(inverse.map((b,a)=>`${a}:${b} `).join(''))+row('Center: '+center.map(x=>`${x} `).join(''))+'Table: row * column';
}

// Build a polynomial multiplication sieve, not a division algorithm. Every
// composite remembers an actual pair whose convolution generated it; recursively
// expanding those pairs gives the irreducible factorization without long division.
const multiply=(a:string,b:string)=>{
 const result=Array<number>(a.length+b.length-1).fill(0);
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)result[i+j]=(result[i+j]!+Number(a[i])*Number(b[j]))%3;
 return result.join('');
};
const monic=(degree:number)=>Array.from({length:3**degree},(_,i)=>degree?'1'+i.toString(3).padStart(degree,'0'):'1');
let factorPairs:Map<string,[string,string]>|undefined;
function factors(input:string):string[]{
 if(!factorPairs){
  factorPairs=new Map();
  for(let d=1;d<=7;d++)for(const candidate of monic(d))if(!factorPairs.has(candidate))for(let e=1;e<=7-d;e++)for(const q of monic(e)){
   const product=multiply(candidate,q);if(!factorPairs.has(product))factorPairs.set(product,[candidate,q]);
  }
 }
 const pair=factorPairs.get(input);return pair?[...factors(pair[0]),...factors(pair[1])]:[input];
}
export function ternaryFactorsReference(input:string):string|undefined {
 if(!/^(?:0|[12][012]{0,7})$/.test(input))return;
 if(input==='0')return'Zero has no factorization';
 const unit=Number(input[0]),normalized=[...input].map(c=>(Number(c)*unit)%3).join('');
 const fs=input.length===1?[]:factors(normalized).sort((a,b)=>a.length-b.length||(a<b?-1:a>b?1:0));
 return row(`Unit: ${unit}`)+row('Monic irreducible factors:')+row(fs.length?fs.join('*'):'(none; constant)')+row('Digits: high degree first')+'Arithmetic modulo 3';
}
export function finiteAlgebraVectors(app:TextSoftware):TextSoftware['examples'] {
 const reference=app.id==='group-table'?groupTableReference:app.id==='ternary-factors'?ternaryFactorsReference:undefined;if(!reference)return[];
 const out:TextSoftware['examples']=[...app.examples],add=(input:string)=>{const output=reference(input);out.push(output===undefined?{input,error:true}:{input,output});};
 let seed=383;const random=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 if(app.id==='group-table'){
  for(let bits=0;bits<16;bits++)add('2|'+bits.toString(2).padStart(4,'0'));
  for(let n=1;n<=6;n++)for(let trial=0;trial<12;trial++){
   const labels=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=random(i+1);[labels[i],labels[j]]=[labels[j]!,labels[i]!];}
   add(n+'|'+Array.from({length:n*n},(_,i)=>labels[(labels.indexOf(Math.floor(i/n))+labels.indexOf(i%n))%n]).join(''));
  }
  // S3 as permutation composition: a nonabelian group of order six.
  const ps=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  add('6|'+ps.flatMap(a=>ps.map(b=>ps.findIndex(c=>c.every((v,i)=>v===a[b[i]!]!)))).join(''));
  for(let t=0;t<90;t++){const n=2+random(5);add(n+'|'+Array.from({length:n*n},()=>random(n)).join(''));}
  for(const input of['','0|','7|0','2|0123','2|000','2|00000','1|1','2 0000','3|01212020x'])add(input);
 }else{
  for(let n=0;n<729;n++)add(n.toString(3));
  for(let t=0;t<150;t++)add((729+random(5832)).toString(3));
  for(const input of['10000000','22222222','11111111','10000001','20000002','', '01','3','-1','1 0','100000000'])add(input);
 }
 return out;
}

export {multiply as multiplyTernaryPolynomials};
