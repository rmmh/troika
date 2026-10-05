import type {TextSoftware} from '../src/world/software/native';
export function editorialReference(id:string,input:string):string|null{
 if(id==='sentence-format'){
  if(/[^A-Za-z0-9 .,!?;:]/.test(input)||/^[ .,!?;:]*[.,!?;:]/.test(input.trimStart()))return null;
  let start=true;return input.trim().toLowerCase().replace(/ +/g,' ').replace(/ *([.,!?;:]) */g,'$1').replace(/([.,!?;:]+)(?=[a-z0-9])/g,'$1 ').split('').map(c=>{if(/[.!?]/.test(c)){start=true;return c;}if(/[a-z0-9]/.test(c)){const out=start?c.toUpperCase():c;start=false;return out;}return c;}).join('');
 }
 if(id==='context-search'){
  const match=/^([A-Za-z]{1,8})\|([A-Za-z ]*)$/.exec(input);if(!match)return null;
  const key=match[1]!.toLowerCase(),text=match[2]!.toLowerCase(),hits=[...text.matchAll(/[a-z]+/g)].filter(m=>m[0]===key);
  if(hits.length>6)return null;if(!hits.length)return 'NO MATCH';
  return hits.map(m=>{const at=m.index;return `${String(at+1).padStart(2,'0')}:${text.slice(Math.max(0,at-6),at).padStart(6)}[${key}]${text.slice(at+key.length,at+key.length+6)}`.padEnd(27);}).join('');
 }
 if(id==='concordance'){
  if(/[^a-zA-Z ]/.test(input))return null;const words=input.toLowerCase().match(/[a-z]+/g)??[];
  return [...new Set(words)].sort().map(word=>`${word}:${words.flatMap((w,i)=>w===word?[i+1]:[]).join(',')}`).join('; ');
 }
 if(id==='word-columns'){
  const m=/^(\d{1,2})\|([a-zA-Z ]*)$/.exec(input);if(!m)return null;const width=Number(m[1]);if(width<1||width>12)return null;
  const words=(m[2]!.toLowerCase().match(/[a-z]+/g)??[]).sort();if(words.some(w=>w.length>width))return null;
  const cols=Math.floor(28/(width+1)),rows=Math.ceil(words.length/cols);if(rows>6)return null;
  return Array.from({length:rows},(_,row)=>Array.from({length:cols},(_,col)=>(words[col*rows+row]??'').padEnd(width)).join(' ').padEnd(27).slice(0,27)).join('');
 }
 throw new Error(id);
}
export function editorialToolVectors(id:string):TextSoftware['examples']{
 if(!['concordance','context-search','sentence-format','word-columns'].includes(id))return [];
 const inputs:string[]=[];
 if(id==='concordance')inputs.push('','  ','red blue red','A a B','z y x w v u t s r q p o n m l k j i h g f e d c b a','a '.repeat(27),'x'.repeat(54),'word!','a1','a|b');
 if(id==='sentence-format')inputs.push('',' ','HELLO ,WORLD!how ARE you?','FIRST: SECOND; THIRD.','hi!?!there','12ABC.2 HELLO','a   , ;  B','...hello',"can't",'a-b','a|b','a!'.repeat(27),'A'.repeat(54));
 if(id==='context-search')inputs.push('cat|the cat sat by cat','a|a a a a a a','a|a a a a a a a','cat|catapult cat catfish','AT|at AT at','a|','|a','abcdefghi|abcdefghi','a|a!','a|   a   ');
 if(id==='word-columns')inputs.push('3|fig yam pea tea oat','1|'+'z '.repeat(25),'12|'+'a '.repeat(13),'0|a','13|a','2|long','1|','01|A b','2|a!');
 let seed=237;const rand=(n:number)=>{seed=seed*48271%2147483647;return seed%n;},pool=['a','blue','red','oak','at','tea','soft','a'];
 for(let n=0;n<80;n++){
  const words=Array.from({length:1+rand(9)},()=>pool[rand(pool.length)]!);let input=words.join(' ');
  if(id==='context-search')input=pool[rand(pool.length)]+'|'+input;
  if(id==='word-columns')input=(1+rand(12))+'|'+input;
  if(id==='sentence-format')input=words.map((w,i)=>i%2?w.toUpperCase():w).join(['  ',' , ','!','?  ',':'][rand(5)]!);
  if(input.length<=54)inputs.push(input);
 }
 return inputs.map(input=>{const output=editorialReference(id,input);return output===null?{input,error:true}:{input,output};});
}
