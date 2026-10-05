import type {TextSoftware} from '../src/world/software/native';
export function automatonLabReference(input:string):string|null {
 const sections=input.split('|');if(sections.length!==3)return null;
 const [rules,word,final]=sections as [string,string,string];
 if(!/^[ab]*$/.test(word)||!/^[0-5]+$/.test(final)||new Set(final).size!==final.length)return null;
 const edges=new Map<string,string>();
 for(const rule of rules.split(',')){if(!/^[0-5][ab][0-5]$/.test(rule))return null;const key=rule.slice(0,2);if(edges.has(key))return null;edges.set(key,rule[2]!);}
 let state='0',reason='';const path=[state];
 for(const letter of word){const next=edges.get(state+letter);if(next===undefined){reason='REJECT: missing transition';break;}state=next;path.push(state);}
 reason ||= final.includes(state)?'ACCEPT: final state reached':'REJECT: not a final state';
 return reason.padEnd(27)+'Path: '+path.join(' ');
}
export function automatonLabVectors(id:string):TextSoftware['examples'] {
 if(id!=='automaton-lab')return[];
 const input=['','|a|0','0a1|a|','0a1|a|00','0a6|a|1','6a0|a|0','0c1|a|1','0a1,|a|1','0a1|A|1','0a1|a|6','0a1|a|1|','0a1,0a2|a|2','0a0|'+'a'.repeat(48)+'|0','0a0|'+'a'.repeat(47)+'b|0','0a1,1a2,2a3,3a4,4a5,5a0|aaaaaa|0'];
 for(let bits=0;bits<16;bits++){
  const rules=['0a','0b','1a','1b'].map((prefix,i)=>prefix+((bits>>i)&1)).join(',');
  for(const final of['0','1','01'])for(let n=0;n<31;n++){
   const word=(n+1).toString(2).slice(1).replaceAll('0','a').replaceAll('1','b');input.push(`${rules}|${word}|${final}`);
  }
 }
 input.push('0a1,0b2,1a2,1b3,2a3,2b4,3a4,3b5,4a5,4b0,5a0,5b1|abba|5');
 return input.map(input=>{const output=automatonLabReference(input);return output===null?{input,error:true}:{input,output};});
}
