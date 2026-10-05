import type {TextSoftware} from '../src/world/software/native';
export function nativeToolboxReference(id:string,input:string):string|null{
 let output:string;
 if(id==='dictionary-split'){
  const m=/^([a-z]+(?:,[a-z]+){0,5})\|([a-z]*)$/.exec(input);if(!m)return null;
  const words=m[1]!.split(','),text=m[2]!,memo=new Map<number,string[]|null>();
  const solve=(at:number):string[]|null=>{if(at===text.length)return [];if(memo.has(at))return memo.get(at)!;let best:string[]|null=null;for(const word of words)if(text.startsWith(word,at)){const tail=solve(at+word.length);if(tail&&(!best||tail.length+1<best.length))best=[word,...tail];}memo.set(at,best);return best;};
  const answer=solve(0);output=answer?answer.join(' '):'NO SPLIT';
 }else if(id==='sorted-merge'){
  const lists=input.split('|');if(lists.length!==2)return null;
  const a:number[][]=[];for(const list of lists){if(!/^(?:\d{1,2}(?:,\d{1,2}){0,11})?$/.test(list))return null;const v=list===''?[]:list.split(',').map(Number);if(v.some((x,i)=>i>0&&x<v[i-1]!))return null;a.push(v);}
  const merged=[...a[0]!.map((value,at)=>({value,at,source:'L'})),...a[1]!.map((value,at)=>({value,at,source:'R'}))].sort((x,y)=>x.value-y.value||x.source.localeCompare(y.source)||x.at-y.at);
  output=('Values: '+merged.map(x=>x.value).join(',')).padEnd(81)+'Sources: '+merged.map(x=>x.source).join('');
 }else if(id==='parallel-rewrite'){
  const m=/^([a-z]+>[a-z]*(?:,[a-z]+>[a-z]*){0,5})\|([a-z]*)$/.exec(input);if(!m)return null;
  const rules=m[1]!.split(',').map(r=>r.split('>'));let text=m[2]!;output='';
  while(text){const rule=rules.filter(r=>text.startsWith(r[0]!)).sort((a,b)=>b[0]!.length-a[0]!.length)[0];if(rule){output+=rule[1];text=text.slice(rule[0]!.length);}else{output+=text[0];text=text.slice(1);}}
 }else if(id==='csv-project'){
  const m=/^([1-9](?:,[1-9]){0,8})\|([ -~]*)$/.exec(input);if(!m)return null;
  const text=m[2]!,fields:string[]=[];let at=0;
  for(;;){let field='';if(text[at]==='"'){at++;let closed=false;while(at<text.length){if(text[at]==='"'){at++;if(text[at]==='"'){field+='"';at++;}else{closed=true;break;}}else field+=text[at++];}if(!closed)return null;}else{while(at<text.length&&text[at]!==','){if(text[at]==='"')return null;field+=text[at++];}}
   fields.push(field);if(fields.length>9)return null;if(at===text.length)break;if(text[at]!==',')return null;at++;}
  const selected=m[1]!.split(',').map(Number);if(selected.some(i=>i>fields.length))return null;
  output=selected.map(i=>'"'+fields[i-1]!.replaceAll('"','""')+'"').join(',');
 }else return null;
 return output.length>162?null:output;
}
export function nativeToolboxVectors(id:string):TextSoftware['examples']{
 if(!['dictionary-split','sorted-merge','parallel-rewrite','csv-project'].includes(id))return [];
 const inputs=['','|','bad','1?2','a'.repeat(54)];
 if(id==='dictionary-split'){
  inputs.push('a|','a,a|aaaa','ab,a,b|ab','a,aa,aaa|aaaa','aa,aaa|aaaaaaa','a,b,c,d,e,f|fedcba','a,b,c,d,e,f,g|abcdefg','A|a','a|A','a|a a','a,|a','a|'+ 'a'.repeat(52));
  for(const dict of['a,b','a,ab,ba','ab,aba,b','aa,aaa','a,b,ab,ba'])for(let bits=0;bits<64;bits++){const word=bits.toString(2).padStart(6,'0').replaceAll('0','a').replaceAll('1','b');inputs.push(dict+'|'+word);}
 }else if(id==='sorted-merge'){
  inputs.push(Array(12).fill('0').join(',')+'|'+Array(12).fill('0').join(','),'1|','|1','00,01,99|0,1,99','1,|2','1|2,','1||2','|,','100|2','-1|2','2,1|','1|2,1','0,0,0,0,0,0,0,0,0,0,0,0,0|','99,99,99,99,99,99,99,99|99,99,99,99,99,99,99,99');
  for(let seed=0;seed<120;seed++){const left=Array.from({length:seed%7},(_,i)=>(seed*7+i*13)%100).sort((a,b)=>a-b),right=Array.from({length:seed%6},(_,i)=>(seed*11+i*7)%100).sort((a,b)=>a-b);inputs.push(left.join(',')+'|'+right.join(','));}
 }else if(id==='parallel-rewrite'){
  inputs.push('a>abcdef|'+'a'.repeat(27),'a>abcdef|'+'a'.repeat(28),'a>b|','a>x,a>y|aaa','ab>x,a>z|aba','a>,b>|abba','a>aaaaaa|'+'a'.repeat(30),'a>a,a>b,a>c,a>d,a>e,a>f,a>g|a','a>b,|a','a>b>c|a','a>b|A','a>b|a a');
  for(const rules of['a>b,b>a','ab>x,a>y,b>','aba>x,ab>y,ba>z','a>,b>bbb','a>ab,ab>a'])for(let bits=0;bits<32;bits++)inputs.push(rules+'|'+bits.toString(2).padStart(5,'0').replaceAll('0','a').replaceAll('1','b'));
 }else{
  inputs.push('1,1,1,1,1,1,1,1,1|'+'x'.repeat(15),'1,1,1,1,1,1,1,1,1|'+'x'.repeat(16),'1|','1,1|','3,1|a,b,','1|""','1|""""','1|"a"x','1|a"b','1|"oops','0|a','10|a','1,|a','1|a,b,c,d,e,f,g,h,i,j','9|a,b,c,d,e,f,g,h,i','1,1,1,1,1,1,1,1,1|'+'x'.repeat(30),'1|'+'x'.repeat(52));
  const fields=['','tea','a,b','say "hi"',' ','|'];for(const a of fields)for(const b of fields)for(const selectors of['1','2,1','2,1,2']){const csv=[a,b].map(f=>'"'+f.replaceAll('"','""')+'"').join(',');inputs.push(selectors+'|'+csv);}
 }
 return [...new Set(inputs)].filter(input=>input.length<=54).map(input=>{const output=nativeToolboxReference(id,input);return output===null?{input,error:true}:{input,output};});
}
