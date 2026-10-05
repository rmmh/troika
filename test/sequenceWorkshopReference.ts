import type { TextSoftware } from '../src/world/software/native';

const row=(s:string)=>s.padEnd(27);
export function suffixIndexReference(input:string):string|undefined {
 if(!/^[A-Za-z]{1,16}$/.test(input))return;
 const suffixes=Array.from(input,(_,i)=>({i,text:input.slice(i)})).sort((a,b)=>a.text<b.text?-1:a.text>b.text?1:0);
 const common=suffixes.map(({text},i)=>{
  if(!i)return 0;let n=0;const prev=suffixes[i-1]!.text;
  while(n<text.length&&n<prev.length&&text[n]===prev[n])n++;return n;
 });
 const longest=Math.max(...common),repeat=longest?suffixes[common.indexOf(longest)]!.text.slice(0,longest):'-';
 const numbers=(ns:number[])=>ns.map(n=>String(n).padStart(2,'0')+' ').join('');
 return row('Suffix positions / LCP')+row('SA '+numbers(suffixes.slice(0,8).map(s=>s.i)))+row('   '+numbers(suffixes.slice(8).map(s=>s.i)))+row('LC '+numbers(common.slice(0,8)))+row('   '+numbers(common.slice(8)))+'Repeat: '+repeat;
}

export function alignmentDetails(a:string,b:string) {
 // Recursive optimal local prefixes, independent of guest's fixed-stride matrix.
 const memo=new Map<string,{score:number,a:string,b:string,ai:number,bi:number}>();
 const visit=(i:number,j:number):{score:number,a:string,b:string,ai:number,bi:number}=>{
  if(!i||!j)return{score:0,a:'',b:'',ai:i,bi:j};
  const key=`${i},${j}`,old=memo.get(key);if(old)return old;
  const diagonal=visit(i-1,j-1),up=visit(i-1,j),left=visit(i,j-1);
  let best={score:0,a:'',b:'',ai:i,bi:j};
  for(const [prefix,x,y,delta] of [[diagonal,a[i-1]!,b[j-1]!,a[i-1]===b[j-1]?2:-1],[up,a[i-1]!,'-',-2],[left,'-',b[j-1]!,-2]] as const){
   const score=prefix.score+delta;if(score>best.score)best={score,a:prefix.a+x,b:prefix.b+y,ai:prefix.ai,bi:prefix.bi};
  }
  memo.set(key,best);return best;
 };
 let best={score:0,a:'',b:'',ai:0,bi:0,ae:0,be:0};
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){const next=visit(i,j);if(next.score>best.score)best={...next,ae:i,be:j};}
 return best;
}
export function localAlignmentReference(input:string):string|undefined {
 if(!/^[A-Za-z]{1,12}\|[A-Za-z]{1,12}$/.test(input))return;
 const[a,b]=input.split('|') as[string,string],r=alignmentDetails(a,b),heading=row(`Score: ${r.score} (+2/-1/-2)`);
 if(!r.score)return heading+'No positive local match';
 const guide=[...r.a].map((c,i)=>c==='-'||r.b[i]==='-'?' ':c===r.b[i]?'|':'.').join('');
 return heading+row(`A:${r.ai}..${r.ae} B:${r.bi}..${r.be}`)+row(r.a)+row(guide)+row(r.b)+'0-based end-exclusive spans';
}

export function sequenceWorkshopVectors(app:TextSoftware):TextSoftware['examples'] {
 const reference=app.id==='suffix-index'?suffixIndexReference:app.id==='local-alignment'?localAlignmentReference:undefined;
 if(!reference)return[];
 const cases:TextSoftware['examples']=[...app.examples];
 const add=(input:string)=>{const output=reference(input);cases.push(output===undefined?{input,error:true}:{input,output});};
 const words=['a','b'];for(let n=2;n<=4;n++)for(let bits=0;bits<2**n;bits++)words.push(Array.from({length:n},(_,i)=>bits&(1<<i)?'a':'b').join(''));
 if(app.id==='suffix-index')for(const input of['banana','mississippi','abcdefghijklmnop','ponmlkjihgfedcba','aaaaaaaaaaaaaaaa','AaAaAaBbBb','abracadabra',...words,'','a b','123','x|y','abcdefghijklmnopq'])add(input);
 else {for(const a of words.slice(0,14))for(const b of words.slice(0,14))add(a+'|'+b);for(const input of['ABCDEF|ABXCDEF','ABXCDEF|ABCDEF','ABCDEF|abCDEF','ACACACTA|AGCACACA','aaaaaaaaaaaa|aaaaaaaaaaaa','|A','A|','A||B','abcdefghijklM|A','1|a','A B|ABC',''])add(input);}
 let seed=9371;const random=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 const word=(n:number)=>Array.from({length:1+random(n)},()=> 'abcABC'[random(6)]!).join('');
 for(let i=0;i<160;i++)add(app.id==='suffix-index'?word(16):word(12)+'|'+word(12));
 return cases;
}
