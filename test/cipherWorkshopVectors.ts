import type {TextSoftware} from '../src/world/software/native';
const weights:Record<string,number>={E:13,T:9,A:8,O:8,I:7,N:7,S:6,H:6,R:6,D:4,L:4,C:3,U:3,M:2,W:2,F:2,G:2,Y:2,P:2,B:1,V:1,K:1,J:0,X:0,Q:0,Z:0};
const mod=(n:number)=>(n%26+26)%26;
const letter=(n:number)=>String.fromCharCode(65+mod(n));
export function cipherWorkshopReference(id:string,input:string):string|null{
 if(id==='caesar-analysis'){
  if(!/^[a-zA-Z ]+$/.test(input)||!/[a-zA-Z]/.test(input))return null;const text=input.toUpperCase();
  return Array.from({length:26},(_,shift)=>{const decoded=[...text].map(c=>c===' '?c:letter(c.charCodeAt(0)-65-shift)).join('');return{shift,decoded,score:[...decoded].reduce((s,c)=>s+(weights[c]??0),0)};}).sort((a,b)=>b.score-a.score||a.shift-b.shift).slice(0,3).map(({shift,score,decoded})=>`${String(shift).padStart(2,'0')} ${String(score).padStart(3,'0')} ${decoded.slice(0,20)}`.padEnd(27)).join('');
 }
 if(id==='keyed-columns'||id==='vigenere'){
  const m=/^([ED])\|([A-Z]{1,8})\|([A-Z ]*)$/i.exec(input);if(!m)return null;const mode=m[1]!.toUpperCase(),key=m[2]!.toUpperCase(),text=m[3]!.toUpperCase();
  if(id==='vigenere'){let next=0;return [...text].map(c=>{if(c===' ')return c;const k=key.charCodeAt(next++%key.length)-65;return letter(c.charCodeAt(0)-65+(mode==='E'?k:-k));}).join('');}
  const order=[...key].map((c,i)=>({c,i})).sort((a,b)=>a.c<b.c?-1:a.c>b.c?1:a.i-b.i).map(x=>x.i);
  const positions=order.flatMap(col=>Array.from({length:Math.max(0,Math.ceil((text.length-col)/key.length))},(_,row)=>row*key.length+col));
  if(mode==='E')return positions.map(i=>text[i]).join('');const output=Array<string>(text.length);positions.forEach((at,i)=>output[at]=text[i]!);return output.join('');
 }
 if(id==='affine-keys'){
  const m=/^([A-Z])([A-Z]):([A-Z])([A-Z])\|([A-Z ]*)$/i.exec(input);if(!m)return null;
  const[x1,x2,y1,y2]=m.slice(1,5).map(c=>c.toUpperCase().charCodeAt(0)-65);const keys=Array.from({length:26},(_,a)=>a).filter(a=>a%2===1&&a!==13).flatMap(a=>Array.from({length:26},(_,b)=>({a,b}))).filter(({a,b})=>mod(a*x1!+b)===y1&&mod(a*x2!+b)===y2);
  if(!keys.length)return 'NO INVERTIBLE KEY';if(keys.length===1){const{a,b}=keys[0]!;return `a=${String(a).padStart(2,'0')} b=${String(b).padStart(2,'0')}`.padEnd(27)+[...m[5]!.toUpperCase()].map(c=>c===' '?c:letter(a*(c.charCodeAt(0)-65)+b)).join('');}
  let output=`${keys.length} KEYS (a,b)`.padEnd(27);for(let i=0;i<keys.length;i+=4)output+=keys.slice(i,i+4).map(({a,b})=>`${String(a).padStart(2,'0')},${String(b).padStart(2,'0')}`).join(' ').padEnd(27);return output;
 }
 throw new Error(id);
}
export function cipherWorkshopVectors(id:string):TextSoftware['examples']{
 if(!['caesar-analysis','keyed-columns','vigenere','affine-keys'].includes(id))return [];
 const cases:string[]=[];
 if(id==='caesar-analysis')cases.push('',' ','123','KHOOR ZRUOG','ETAOIN SHRDLU','ABCDEFGHIJKLMNOPQRSTUVWXYZ','A'.repeat(54),'abc!');
 if(id==='keyed-columns'||id==='vigenere'){
  for(const key of ['A','CAB','LETTER','ZEBRA','ABCDEFGH'])for(const text of ['', 'A','AB','ABCDEFG',' AB C ','ABCDEFGHIJKLMNOPQRSTUVWXYZ ABCDEFGHI']){if(key.length+text.length+3>54)continue;cases.push(`E|${key}|${text}`);const encrypted=cipherWorkshopReference(id,`E|${key}|${text}`)!;cases.push(`D|${key}|${encrypted}`);}
  cases.push('e|key|mixed case','E|A|'+'a'.repeat(50),'E||HELLO','X|KEY|HELLO','E|ABCDEFGHI|A','E|K3Y|ABC','E|KEY|HI!','E|A','E|A||');
 }
 if(id==='affine-keys')cases.push('AB:FI|ABC','AA:AA|','AN:AN|SAMPLE','AB:AA|TEXT','AA:AB|TEXT','aB:fI|mixed case','AB:FI|'+'Z'.repeat(48),'AB-FI|A','AB:FI','AB:FI|!','A1:FI|TEXT');
 let seed=249;const rand=(n:number)=>{seed=seed*48271%2147483647;return seed%n;};
 for(let n=0;n<64;n++){
  if(id==='caesar-analysis')cases.push(Array.from({length:1+rand(54)},()=>rand(5)===0?' ':letter(rand(26))).join(''));
  else if(id==='affine-keys'){const x1=rand(26),x2=rand(26),a=rand(26),b=rand(26);cases.push(`${letter(x1)}${letter(x2)}:${letter(a*x1+b)}${letter(a*x2+b)}|THE QUICK FOX`);}
  else{const key=Array.from({length:1+rand(8)},()=>letter(rand(26))).join(''),text=Array.from({length:rand(42)},()=>rand(5)===0?' ':letter(rand(26))).join('');cases.push(`E|${key}|${text}`);cases.push(`D|${key}|${cipherWorkshopReference(id,`E|${key}|${text}`)}`);}
 }
 return cases.map(input=>{const output=cipherWorkshopReference(id,input);return output===null?{input,error:true}:{input,output};});
}
