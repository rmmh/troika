import type { TextSoftware } from '../src/world/software/native';

export function patternSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['palindrome-span','repeat-unit','rotation-offset','common-span'].includes(app.id)) return [];
  const cases:TextSoftware['examples']=[];
  const short=['','a','b','aa','ab','ba','bb','aba','aab','baa','aaa'];
  if(app.id==='palindrome-span'||app.id==='repeat-unit') {
    const inputs=[...short,'a'.repeat(54),'ab'.repeat(27),'abc'.repeat(18),'abcdefghijklmnopqrstuvwxyzz yxwvutsrqponmlkjihgfedcba','a b a','AbBA','abacdc'];
    inputs.push('a'.repeat(26)+'bc'+'a'.repeat(26));
    for(let bits=0;bits<128;bits++) inputs.push(Array.from({length:7},(_,i)=>bits&(1<<i)?'a':'b').join(''));
    for(const input of inputs) {
      let output='';
      if(app.id==='palindrome-span') {
        for(let i=0;i<input.length;i++) for(let j=i+1;j<=input.length;j++) {
          const span=input.slice(i,j);
          if(span.length>output.length&&span===[...span].reverse().join('')) output=span;
        }
      } else {
        for(let n=1;n<=input.length;n++) if(input.length%n===0&&input.slice(0,n).repeat(input.length/n)===input) {output=input.slice(0,n);break;}
      }
      cases.push({input,output});
    }
  } else {
    const pairs=short.flatMap(a=>short.map(b=>[a,b] as const));
    pairs.push(['a'.repeat(26),'a'.repeat(27)],['ab'.repeat(13),'ba'.repeat(13)],['a'.repeat(26),'a'.repeat(26)],['abc','|abc']);
    const alphabet='abcdefghijklmnopqrstuvwxyz';
    pairs.push([alphabet,'z'+alphabet.slice(0,-1)],['a'.repeat(25)+'b','a'.repeat(25)+'c']);
    for(const [a,b] of pairs) {
      let output='';
      if(app.id==='rotation-offset') {
        const rotations=Array.from({length:Math.max(1,a.length)},(_,n)=>a.slice(n)+a.slice(0,n));
        const index=rotations.indexOf(b);output=index<0?'NONE':String(index);
      } else {
        for(let i=0;i<a.length;i++) for(let j=i+1;j<=a.length;j++) {
          const span=a.slice(i,j);if(span.length>output.length&&b.includes(span)) output=span;
        }
      }
      cases.push({input:a+'|'+b,output});
    }
    cases.push({input:'no separator',error:true});
  }
  return cases;
}
