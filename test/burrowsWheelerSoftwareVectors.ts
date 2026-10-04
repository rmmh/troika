import type { TextSoftware } from '../src/world/software/native';
function write(text:string):string {
  if(!text.length)return '00|';
  const rows=Array.from({length:text.length},(_,offset)=>({offset,text:text.slice(offset)+text.slice(0,offset)}));
  rows.sort((a,b)=>a.text<b.text?-1:a.text>b.text?1:a.offset-b.offset);
  return String(rows.findIndex(row=>row.offset===0)).padStart(2,'0')+'|'+rows.map(row=>row.text.at(-1)).join('');
}
function read(block:string):string {
  const column=block.slice(3);let rows=Array<string>(column.length).fill('');
  for(let i=0;i<column.length;i++)rows=rows.map((row,j)=>column[j]+row).sort();
  return rows[Number(block.slice(0,2))]??'';
}
export function burrowsWheelerSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['bwt-write','bwt-read'].includes(app.id))return [];
  const cases:TextSoftware['examples']=[],samples=['','banana','mississippi','A a | !','|'.repeat(48),'a'.repeat(47)+'b','b'+'a'.repeat(47),'ab'.repeat(24),'abcd'.repeat(12),'abracadabra'.repeat(4)];
  for(let length=1;length<=8;length++)for(let bits=0;bits<2**length;bits++)samples.push(bits.toString(2).padStart(length,'0'));
  for(let length=1;length<=48;length++)samples.push(Array.from({length},(_,i)=>String.fromCharCode(32+(i*37+length)%95)).join(''));
  for(const input of samples) {
    const block=write(input);
    if(read(block)!==input)throw new Error('BWT reference round trip failed');
    cases.push(app.id==='bwt-write'?{input,output:block}:{input:block,output:input});
  }
  if(app.id==='bwt-write')for(const length of [49,54])cases.push({input:'x'.repeat(length),error:true});
  else {
    for(const input of ['', '0','00','0|x','a0|x','0a|x','-1|x','00:x','01|','01|x','99|abc','00|'+'a'.repeat(49)])cases.push({input,error:true});
  }
  return cases;
}
