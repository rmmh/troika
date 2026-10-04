import type { TextSoftware } from '../src/world/software/native';
function huffman(text:string):string {
  if(!text)return 'EMPTY';
  const counts=new Map<string,number>();for(const c of text)counts.set(c,(counts.get(c)??0)+1);
  type Node={weight:number,id:number,char?:string,children?:Node[]};
  const symbols=[...counts.keys()],queue:Node[]=[...counts].map(([char,weight],id)=>({char,weight,id}));let id=queue.length;
  while(queue.length>1){queue.sort((a,b)=>a.weight-b.weight||a.id-b.id);const children=queue.splice(0,2);queue.push({weight:children.reduce((s,n)=>s+n.weight,0),id:id++,children});}
  const lengths=new Map<string,number>();
  const visit=(node:Node,depth:number)=>{if(node.char!==undefined)lengths.set(node.char,Math.max(1,depth));else node.children!.forEach(child=>visit(child,depth+1));};visit(queue[0]!,0);
  return symbols.map(c=>c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')+':'+lengths.get(c)).join(' ')+' bits='+symbols.reduce((sum,c)=>sum+counts.get(c)!*lengths.get(c)!,0);
}
function diff(old:string,next:string):string {
  const memo=new Map<string,number>();
  const cost=(a:number,b:number):number=>{if(!a)return b;if(!b)return a;const key=a+','+b;if(memo.has(key))return memo.get(key)!;const v=Math.min(cost(a-1,b-1)+(old[a-1]===next[b-1]?0:1),cost(a-1,b)+1,cost(a,b-1)+1);memo.set(key,v);return v;};
  const records:string[]=[];let a=old.length,b=next.length;
  while(a||b){const value=cost(a,b);if(a&&b&&cost(a-1,b-1)+(old[a-1]===next[b-1]?0:1)===value){records.push(old[a-1]===next[b-1]?'='+old[a-1]:'~'+old[a-1]+next[b-1]);a--;b--;}
    else if(a&&cost(a-1,b)+1===value){records.push('-'+old[--a]);}else records.push('+'+next[--b]);}
  records.reverse();let input='',output='',edits=0;
  for(const r of records){if(r[0]!=='=')edits++;if(r[0]!=='+')input+=r[1];if(r[0]!=='-')output+=r[0]==='~'?r[2]:r[1];}
  if(input!==old||output!==next||edits!==cost(old.length,next.length))throw new Error('Invalid edit reference');
  return records.join(' ');
}
export function textAnalysisSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='huffman-lengths') {
    const samples=['','a'.repeat(54),'abcdefghi','abcdefghi'.repeat(6),'aabbbbccccccccdddddddddddddddd',' | ! |','987654321'];
    for(let bits=0;bits<256;bits++)samples.push(bits.toString(2).padStart(8,'0'));
    for(let a=1;a<=5;a++)for(let b=1;b<=5;b++)for(let c=1;c<=5;c++)samples.push('a'.repeat(a)+'b'.repeat(b)+'c'.repeat(c));
    for(const input of samples)cases.push({input,output:huffman(input)});
    for(const weights of [[1,1,2,3,5,8,13,21],[1,1,1,2,3,5,8,13,20]]) {
      const input=weights.map((weight,i)=>String.fromCharCode(97+i).repeat(weight)).join('');
      cases.push({input,output:huffman(input)});
    }
    for(const input of ['0123456789','a'.repeat(44)+'0123456789'])cases.push({input,error:true});
  }
  if(app.id==='text-diff') {
    const strings=[''];for(let length=1;length<=4;length++)for(let bits=0;bits<2**length;bits++)strings.push(bits.toString(2).padStart(length,'0'));
    for(const old of strings)for(const next of strings)cases.push({input:old+'|'+next,output:diff(old,next)});
    for(const [old,next] of [['a'.repeat(53),''],['','b'.repeat(53)],['a'.repeat(26),'b'.repeat(27)],['ab'.repeat(13),'ba'.repeat(13)],['hello, world','hello world!'],[' a~+-=','|a +=~'],['kitten','sitting']])cases.push({input:old+'|'+next,output:diff(old!,next!)});
    cases.push({input:'missing',error:true});
  }
  return cases;
}
