import type {TextSoftware} from '../src/world/software/native';
const row=(s:string)=>s.padEnd(27);
function heap(s:string){const m=/^([1-9][0-9]?)\|([+-][a-f][1-9]?(?:,[+-][a-f][1-9]?)*?)$/.exec(s);if(!m)return;const n=Number(m[1]);if(n>54)return;const blocks:{id:string;start:number;size:number}[]=[];let rejected=0;for(const command of m[2]!.split(',')){const op=command[0],id=command[1]!,size=Number(command[2]);if(op==='-'&&command.length!==2||op==='+'&&command.length!==3)return;const index=blocks.findIndex(b=>b.id===id);if(op==='-'){if(index<0)rejected++;else blocks.splice(index,1);continue;}if(index>=0){rejected++;continue;}let start=0;for(const b of [...blocks].sort((a,b)=>a.start-b.start)){if(start+size<=b.start)break;start=b.start+b.size;}if(start+size>n)rejected++;else blocks.push({id,start,size});}const map=Array<string>(n).fill('.');for(const b of blocks)map.fill(b.id,b.start,b.start+b.size);const holes=map.join('').match(/\.+/g)??[];return row(`Free=${holes.reduce((a,h)=>a+h.length,0)} largest hole=${Math.max(0,...holes.map(h=>h.length))}`)+row(`Rejected requests=${rejected}`)+map.join('').padEnd(54)+'Map: one unit/char, base 0';}
function live(s:string){const parts=s.split('|');if(parts.length!==2||! /^[a-f]*$/.test(parts[1]!)||new Set(parts[1]).size!==parts[1]!.length)return;const lines=parts[0]!.split(';');if(lines.length>7||lines.some(l=>! /^[a-f]=[a-f](?:[+*-][a-f])?$/.test(l)))return;let needed=new Set(parts[1]),peak=needed.size;const before:string[]=[],unused:number[]=[];for(let i=lines.length-1;i>=0;i--){const line=lines[i]!;if(!needed.has(line[0]!))unused.unshift(i+1);needed.delete(line[0]!);for(const c of line.slice(2))if(/[a-f]/.test(c))needed.add(c);before[i]=[...needed].sort().join('')||'-';peak=Math.max(peak,needed.size);}return row('Unused: '+(unused.length?unused.map(n=>n+' ').join(''):'none'))+row('Peak live variables='+peak)+before.map((v,i)=>(`${i+1}:${v}`).padEnd(9)).join('');}
function relations(s:string){const m=/^(A(?:B(?:C(?:D(?:E(?:F)?)?)?)?)?)\|(.+)$/.exec(s);if(!m)return;const attributes=[...m[1]!],rules=m[2]!.split(',');if(rules.length>8)return;const dependencies:{left:Set<string>;right:Set<string>}[]=[];for(const rule of rules){const p=rule.split('>');if(p.length!==2||!p[1]||!p[0]||p[0]!== '~'&&[...p[0]!].some(c=>!attributes.includes(c))||[...p[1]!].some(c=>!attributes.includes(c)))return;const l=p[0]==='~'?'':p[0]!,r=p[1]!;if(new Set(l).size!==l.length||new Set(r).size!==r.length)return;dependencies.push({left:new Set(l),right:new Set(r)});}const close=(seed:Set<string>)=>{const result=new Set(seed);for(;;){const size=result.size;for(const d of dependencies)if([...d.left].every(c=>result.has(c)))for(const c of d.right)result.add(c);if(result.size===size)return result;}};const keys:Set<string>[]=[];for(let mask=0;mask<2**attributes.length;mask++){const set=new Set(attributes.filter((_,i)=>mask&2**i));if(close(set).size===attributes.length&&!keys.some(k=>[...k].every(c=>set.has(c))))keys.push(set);}let output=row('Minimal candidate keys='+keys.length);for(const k of keys){const text=([...k].join('')||'~')+' ';if(output.length%27+text.length>27)output=output.padEnd(Math.ceil(output.length/27)*27);output+=text;}output=output.padEnd(135);const bad=dependencies.flatMap((d,i)=>[...d.right].some(c=>!d.left.has(c))&&close(d.left).size<attributes.length?[i+1]:[]);return output+'BCNF bad: '+(bad.length?bad.map(n=>n+' ').join(''):'none');}
function lexer(s:string){let i=0;const tokens:{type:string,start:number,end:number}[]=[];while(i<s.length){if(s[i]===' '){i++;continue;}const start=i,c=s[i]!;let type:string;if(s.startsWith('/*',i)){const end=s.indexOf('*/',i+2);if(end<0)return'LEXICAL ERROR; token at '+start;i=end+2;continue;}if(c==='"'){type='S';i++;let closed=false;while(i<s.length){const ch=s[i++]!;if(ch==='"'){closed=true;break;}if(ch==='\\'){if(i===s.length||! '"\\nrt'.includes(s[i++]!))return'LEXICAL ERROR; token at '+start;}}if(!closed)return'LEXICAL ERROR; token at '+start;}else if(/[A-Za-z_]/.test(c)){type='I';i++;while(i<s.length&&/[A-Za-z_0-9]/.test(s[i]!))i++;}else if(/[0-9]/.test(c)){type='N';const match=/^(?:0x[0-9a-fA-F]+|[0-9]+)/.exec(s.slice(i))!;i+=match[0].length;if(i<s.length&&/[A-Za-z_]/.test(s[i]!))return'LEXICAL ERROR; token at '+start;}else if('(){}[],;:'.includes(c)){type='P';i++;}else if('+-*/=%!<>&|^~'.includes(c)){type='O';i+=['==','!=','<=','>=','&&','||'].includes(s.slice(i,i+2))?2:1;}else return'LEXICAL ERROR; token at '+start;tokens.push({type,start,end:i});}if(tokens.length>12)return'VALID; TOKEN LIMIT (12)';if(!tokens.length)return'No tokens';let output='';tokens.forEach((t,i)=>{output+=`${t.type} ${t.start}:${t.end}`;output=output.padEnd(Math.floor((i+1)/2)*27+((i+1)%2)*13);});return output;}
export function codingWorkbenchReference(id:string,input:string):string|undefined{switch(id){case'structured-query':return query(input);case'three-way-merge':return merge(input);case'heap-workshop':return heap(input);case'live-variables':return live(input);case'relation-keys':return relations(input);case'token-inspector':return lexer(input);}}
export function codingWorkbenchVectors(app:TextSoftware):TextSoftware['examples']{const cases:Record<string,string[]>={
'structured-query':['a.0|{"a":[7,8]}','|{}','|[]','|null','|false','|true','|-0','|99','|-99','|100','|01','|1.5','a|{"a":1,"a":2}','z|{"a":01}','z|{"bad":true}','a|{"a":{"b":2}}','a.b|{"a":{"b":2}}','2|[1,2,3]','9|[0,1,2,3,4,5,6,7,8,9]','0|[0,1,2,3,4,5,6,7,8,9,0]','0.0.0|[[[1]]]','0|[[[[1]]]]','a.|{"a":1}','a|{"a":1,}','a|{"a":true} x','a|{"a":"ok"}','| "x" ','missing|{"a":[1,2]}','a|{"b":0,"a":[1,false,null]}'],
'three-way-merge':['abc|axbc|abcy','abc|axc|ayc','abc|abc|abc','||','|a|b','|a|a','abc||abc','abc||','abc|xbc|ayc','abc|axbc|aybc','abc|ac|abxc','abc|ac|axbc','aaaa|aa|aaa','abcabc|acabc|abcac','012345678901|012345678901|012345678901','a|b','a|b|c|d'],
'heap-workshop':['12|+a4,+b4,+c4,-a,-c,+d5','12|+a4,+b4,+c4,-a,-c,-b,+d9','1|+a1,+b1,-a,+b1','54|+a9,+b9,+c9,+d9,+e9,+f9','1|+a1,-a,-a,+a1','1|+a0','0|+a1','55|+a1','2|','2|+a1,'],
'live-variables':['a=b+c;b=a*d;d=b|d','a=b|','a=a+a|a','a=b;c=d;e=f|ace','a=b;a=c;a=d;a=e;a=f;a=a;a=b|','a=b|aa','g=a|g'],
'relation-keys':['ABC|A>B,B>C','ABC|A>B,B>A','ABCDEF|ABC>DEF,ABD>CEF,ABE>CDF','ABC|~>A,A>BC','ABC|AB>C','A|A>A','AB|A>B,B>A','AC|A>C','ABC|AA>B','ABC|A>'],
 'token-inspector':['sum=0xA+2','a /* hi */ == "x\\n";','0x','0xz','123abc','/*','"unterminated','"bad\\q"','a<=b&&b!=c','(){}[],;:','+++++++++++++','', '/*ok*/']};if(!(app.id in cases))return[];const inputs=[...cases[app.id]!,...generated(app.id)];return[...app.examples,...inputs.map(input=>{const output=codingWorkbenchReference(app.id,input);return output===undefined?{input,error:true as const}:{input,output};})];}

type JsonNode={start:number;end:number;kind:string;children:Map<string,JsonNode>};
function query(input:string):string|undefined {
 const split=input.indexOf('|');if(split<0||split>12)return;
 const path=input.slice(0,split),json=input.slice(split+1);
 if(path&&!/^(?:[a-z]{1,8}|[0-9])(?:\.(?:[a-z]{1,8}|[0-9]))*$/.test(path))return;
 try {JSON.parse(json);}catch{return;}
 const pattern=/"(?:[^"\\]|\\.)*"|-?(?:0|[1-9][0-9]*)|true|false|null|[{}\[\],:]/gy;
 const tokens:{text:string;start:number;end:number}[]=[];
 for(let p=0;p<json.length;){if(json[p]===' '){p++;continue;}pattern.lastIndex=p;const m=pattern.exec(json);if(!m)return;tokens.push({text:m[0],start:p,end:pattern.lastIndex});p=pattern.lastIndex;}
 let index=0,count=0;
 function node(depth:number):JsonNode {
  if(depth>4||++count>16)throw 0;
  const token=tokens[index++]!;const children=new Map<string,JsonNode>();let kind:string,end=token.end;
  if(token.text==='{'||token.text==='['){const object=token.text==='{',close=object?'}':']';kind=object?'OBJECT':'ARRAY';let n=0;
   if(tokens[index]!.text!==close)for(;;){let key:string;
    if(object){const keyToken=tokens[index++]!;if(!/^"[a-z]{1,8}"$/.test(keyToken.text))throw 0;key=JSON.parse(keyToken.text) as string;if(children.has(key))throw 0;index++;}
    else{if(n===10)throw 0;key=String(n++);}
    children.set(key,node(depth+1));if(tokens[index]!.text===close)break;index++;
   }
   end=tokens[index++]!.end;
  }else if(token.text[0]==='"'){for(let j=1;j<token.text.length-1;j++)if(token.text[j]==='\\'&&!['\"','\\','/'].includes(token.text[++j]!))throw 0;kind='STRING (JSON spelling)';}
  else if(token.text==='null')kind='NULL';
  else if(token.text==='true'||token.text==='false')kind='BOOLEAN';
  else{if(!/^-?(?:0|[1-9][0-9]?)$/.test(token.text))throw 0;kind='INTEGER';}
  return{start:token.start,end,kind,children};
 }
 try{let selected:JsonNode|undefined=node(1);if(index!==tokens.length)return;for(const segment of path?path.split('.'):[])selected=selected?.children.get(segment);return selected?row(selected.kind)+json.slice(selected.start,selected.end):'PATH NOT FOUND';}catch{return;}
}
type Hunk={start:number;end:number;replacement:string};
// Independent combinatorial LCS length: enumerate subsequences, not a DP table.
function canonicalHunks(base:string,branch:string):Hunk[]{
 const cache=new Map<string,number>();
 const length=(a:string,b:string)=>{const key=a+'|'+b;if(cache.has(key))return cache.get(key)!;let best=0;for(let mask=0;mask<2**a.length;mask++){let cursor=0,size=0,valid=true;for(let i=0;i<a.length;i++)if(mask&2**i){cursor=b.indexOf(a[i]!,cursor);if(cursor<0){valid=false;break;}cursor++;size++;}if(valid)best=Math.max(best,size);}cache.set(key,best);return best;};
 let i=0,j=0,open:{i:number;j:number}|undefined;const hunks:Hunk[]=[];
 const flush=()=>{if(open){hunks.push({start:open.i,end:i,replacement:branch.slice(open.j,j)});open=undefined;}};
 while(i<base.length||j<branch.length){if(i<base.length&&j<branch.length&&base[i]===branch[j]){flush();i++;j++;continue;}open??={i,j};if(i===base.length)j++;else if(j===branch.length||length(base.slice(i+1),branch.slice(j))>=length(base.slice(i),branch.slice(j+1)))i++;else j++;}flush();return hunks;
}
function merge(input:string):string|undefined {
 const fields=input.split('|');if(fields.length!==3||fields.some(s=>s.length>12))return;const[base,left,right]=fields as[string,string,string],l=canonicalHunks(base,left),r=canonicalHunks(base,right),duplicates=new Set<number>();
 for(const a of l)for(const[bIndex,b]of r.entries()){
  if(a.start===b.start&&a.end===b.end&&a.replacement===b.replacement){duplicates.add(bIndex);continue;}
  const overlap=a.start===a.end?a.start>=b.start&&a.start<=b.end:b.start===b.end?b.start>=a.start&&b.start<=a.end:a.start<b.end&&b.start<a.end;
  if(overlap)return row(`CONFLICT base ${Math.min(a.start,b.start)}:${Math.max(a.end,b.end)}`)+row('LEFT: '+(a.replacement||'-'))+row('RIGHT: '+(b.replacement||'-'))+'0-based spans; end excluded';
 }
 let position=0,result='';for(const h of[...l,...r.filter((_,i)=>!duplicates.has(i))].sort((a,b)=>a.start-b.start)){result+=base.slice(position,h.start)+h.replacement;position=h.end;}result+=base.slice(position);
 return(row('MERGED')+result).padEnd(81)+row(`Edit hunks L=${l.length} R=${r.length}`)+'Identical edits appear once';
}

function generated(id:string):string[]{
 const inputs:string[]=[];let seed=421;const rnd=(n:number)=>{seed=seed*48271%2147483647;return seed%n;},letters='abcdef';
 if(id==='structured-query'){
  const values=['null','true','false','0','-99','99','"a\\\\b"','"a\\/b"','"a\\\"b"','[]','{}'];
  for(const v of values)for(const path of['','a','b.0','a.x'])inputs.push(path+'|{"a":'+v+',"b":[1,2]}');
  inputs.push('|[[0,0,0,0,0,0,0],[0,0,0,0,0,0]]','z|[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]','x|{"a":{"b":{"c":{"d":0}}}}','x|{"a":"bad\\n"}','a|{"a":1,"bad":1.5}','a|{"a":1,"bad":100}','a|{"a":1,"b":{"c":2,"c":3}}','a|{"a":1,"b":[2,]}');
  for(let t=0;t<64;t++)inputs.push((rnd(2)?'a.':'b.')+rnd(5)+'|{"a":['+[rnd(99),-rnd(99)].join(',')+'],"b":[true,null]}');
 }else if(id==='three-way-merge'){
  const words=['','a','b','aa','ab','ba','bb'];for(const a of words)for(const b of words)for(const c of words)inputs.push([a,b,c].join('|'));
  for(let t=0;t<64;t++)inputs.push(Array.from({length:3},()=>Array.from({length:rnd(9)},()=>letters[rnd(3)]).join('')).join('|'));
  inputs.push('abcdefghijkl|axcxexgxixkx|aycyeygyiyky','abcdefghijkl|xbcdefghijkl|abcdefghijkx','aaaaaaaaaaaa|bbbbbbbbbbbb|cccccccccccc');
 }else if(id==='heap-workshop'){
  const commands=['+a1','+b2','-a','-b'];for(let n=1;n<=5;n++)for(let a=0;a<64;a++)inputs.push(n+'|'+[commands[a%4],commands[Math.floor(a/4)%4],commands[Math.floor(a/16)]].join(','));
  for(let t=0;t<64;t++)inputs.push((1+rnd(54))+'|'+Array.from({length:8},()=>rnd(3)?'+'+letters[rnd(6)]+(1+rnd(9)):'-'+letters[rnd(6)]).join(','));
 }else if(id==='live-variables'){
  for(let t=0;t<160;t++){const lines=Array.from({length:1+rnd(7)},()=>letters[rnd(6)]+'='+letters[rnd(6)]+(rnd(2)?'+-*'[rnd(3)]!+letters[rnd(6)]:''));inputs.push(lines.join(';')+'|'+[...letters].filter(()=>rnd(2)).join(''));}
 }else if(id==='relation-keys'){
  const rules=['A>B','A>C','B>A','B>C','C>A','C>B','AB>C','AC>B','BC>A','~>A'];for(const a of rules)for(const b of rules)inputs.push('ABC|'+a+','+b);
  for(let t=0;t<160;t++){const n=1+rnd(6),attrs='ABCDEF'.slice(0,n);let rules=Array.from({length:1+rnd(8)},()=>{const lhs=[...attrs].filter(()=>rnd(2)).join('')||'~',rhs=[...attrs].filter(()=>rnd(2)).join('')||attrs[0]!;return lhs+'>'+rhs;});while((attrs+'|'+rules.join(',')).length>54)rules=rules.slice(0,-1);inputs.push(attrs+'|'+rules.join(','));}
  inputs.push('ABCDEF|AB>C,AC>B,AD>E,AE>D,BC>A,BD>F,BE>F,CF>AB','ABC|~>ABC','ABC|A>B,B>C,C>A,A>BC,B>AC,C>AB,A>A,B>B');
 }else if(id==='token-inspector'){
  for(let c=32;c<=126;c++)inputs.push(String.fromCharCode(c));
  const chunks=['abc','0xAF','42','"x"','/*x*/','+','==',';','(',')','&&'];for(let t=0;t<96;t++)inputs.push(Array.from({length:1+rnd(8)},()=>chunks[rnd(chunks.length)]).join(' ').slice(0,54));
  inputs.push('x'.repeat(54),'1'.repeat(54),'+'.repeat(54),'0x'+'A'.repeat(52),'/*'+'x'.repeat(50)+'*/','"'+'a'.repeat(52)+'"',' '.repeat(53)+'@');
 }
 return inputs.filter(s=>s.length<=54);
}
