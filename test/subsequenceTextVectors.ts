import type { TextSoftware } from '../src/world/software/native';

const isSubsequence=(part:string,whole:string)=>{let i=0;for(const c of whole)if(c===part[i])i++;return i===part.length;};
function merge(a:string,b:string):string {
  const memo=new Map<string,string>();
  const visit=(a:string,b:string):string=>{
    if(!a)return b;if(!b)return a;
    const key=JSON.stringify([a,b]);if(memo.has(key))return memo.get(key)!;
    let result:string;
    if(a[0]===b[0])result=a[0]+visit(a.slice(1),b.slice(1));
    else {const left=a[0]+visit(a.slice(1),b),right=b[0]+visit(a,b.slice(1));result=left.length<=right.length?left:right;}
    memo.set(key,result);return result;
  };
  const output=visit(a,b);
  if(!isSubsequence(a,output)||!isSubsequence(b,output))throw new Error('Invalid merged sequence');
  if(a.length<=10) {
    let shared=0;
    for(let mask=0;mask<2**a.length;mask++) {
      const candidate=[...a].filter((_,i)=>mask&(1<<i)).join('');
      if(isSubsequence(candidate,b))shared=Math.max(shared,candidate.length);
    }
    if(output.length!==a.length+b.length-shared)throw new Error('Nonoptimal merged sequence');
  }
  return output;
}
function palindrome(text:string):string {
  const memo=new Map<string,string>();
  const visit=(s:string):string=>{
    if(s.length<2)return s;if(memo.has(s))return memo.get(s)!;
    let output:string;
    if(s[0]===s.at(-1))output=s[0]+visit(s.slice(1,-1))+s[0];
    else {const left=visit(s.slice(1)),right=visit(s.slice(0,-1));output=left.length>=right.length?left:right;}
    memo.set(s,output);return output;
  };
  const output=visit(text);
  if(output!==[...output].reverse().join('')||!isSubsequence(output,text))throw new Error('Invalid palindrome');
  // Exhaustive subsets independently establish optimality on small inputs.
  if(text.length<=10)for(let mask=0;mask<2**text.length;mask++){
    const candidate=[...text].filter((_,i)=>mask&(1<<i)).join('');
    if(candidate===[...candidate].reverse().join('')&&candidate.length>output.length)throw new Error('Nonoptimal palindrome');
  }
  return output;
}
export function subsequenceTextVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='shortest-merge') {
    const strings=[''];for(let n=1;n<=4;n++)for(let bits=0;bits<2**n;bits++)strings.push(bits.toString(2).padStart(n,'0'));
    for(const a of strings)for(const b of strings)cases.push({input:a+'|'+b,output:merge(a,b)});
    for(const [a,b] of [['a'.repeat(53),''],['','b'.repeat(53)],['a'.repeat(26),'b'.repeat(27)],['ab'.repeat(13),'ba'.repeat(13)+'a'],['space here','here there'],['Case','case'],['aa','|aa|'],['kitten','sitting']])cases.push({input:a+'|'+b,output:merge(a!,b!)});
    for(const input of ['','missing','a'.repeat(54)])cases.push({input,error:true});
  }
  if(app.id==='pal-subsequence') {
    for(let n=0;n<=8;n++)for(let bits=0;bits<2**n;bits++){const input=n?bits.toString(2).padStart(n,'0'):'';cases.push({input,output:palindrome(input)});}
    for(const input of ['abcdefghijklmnopqrstuvwxyza','abcdefghijklmnopqrstuvwxyz!','a'.repeat(27),'abababababababababababababa','A man, a plan, a canal',' a | A | a ','racecar','agbdba','abcda','abcabcabcabcabcabcabcabcabc'])cases.push({input,output:palindrome(input)});
    for(const input of ['x'.repeat(28),'a'.repeat(54)])cases.push({input,error:true});
  }
  return cases;
}
