import type { TextSoftware } from '../src/world/software/native';
export function unpackReference(input:string):string|undefined {
  let output='';
  while(input.length) {
    if(input[0]!=='~'){output+=input[0];input=input.slice(1);}
    else if(input.startsWith('~~')){output+='~';input=input.slice(2);}
    else {
      const token=/^~([0-9]{2})([0-9]{2})/.exec(input);if(!token)return;
      const distance=Number(token[1]),length=Number(token[2]);
      if(!distance||distance>output.length||length<3)return;
      const period=output.slice(-distance);output+=period.repeat(Math.ceil(length/distance)).slice(0,length);input=input.slice(5);
    }
    if(output.length>162)return;
  }
  return output;
}
function packReference(input:string):string {
  let output='',position=0;
  while(position<input.length) {
    const tail=input.slice(position),options:{distance:number;length:number}[]=[];
    for(let distance=1;distance<=position;distance++) {
      const period=input.slice(position-distance,position).repeat(Math.ceil(tail.length/distance)).slice(0,tail.length);
      const mismatch=[...tail].findIndex((c,i)=>c!==period[i]);options.push({distance,length:mismatch<0?tail.length:mismatch});
    }
    options.sort((a,b)=>b.length-a.length||a.distance-b.distance);const best=options[0];
    if(best&&best.length>=6){output+='~'+String(best.distance).padStart(2,'0')+String(best.length).padStart(2,'0');position+=best.length;}
    else {output+=input[position]==='~'?'~~':input[position];position++;}
  }
  return output;
}
export function compressionSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(app.id!=='lz-pack'&&app.id!=='lz-unpack')return [];
  const cases:TextSoftware['examples']=[];
  const samples=['','~','~~','abcabcabc','abracadabra abracadabra','~0123~0123~0123','a'.repeat(54),'~'.repeat(54),'ab'.repeat(27),'abc'.repeat(18),Array.from({length:27},(_,i)=>'~'+String.fromCharCode(65+i)).join('')];
  for(let bits=0;bits<512;bits++)samples.push(Array.from({length:9},(_,i)=>bits&(1<<i)?'a':'b').join(''));
  for(let seed=0;seed<24;seed++)samples.push(Array.from({length:54},(_,i)=>String.fromCharCode(32+(i*i*7+seed*13+i*seed)%95)).join(''));
  for(const input of samples){const packed=packReference(input);
    if(unpackReference(packed)!==input)throw new Error('Compression test reference round trip failed');
    if(app.id==='lz-pack')cases.push(packed.length<=54?{input,output:packed}:{input,error:true});
    else if(packed.length<=54)cases.push({input:packed,output:input});
  }
  if(app.id==='lz-unpack') {
    for(const input of ['~','~0','~01','~010','~0103','a~0003','a~0203','a~0100','a~0101','a~0102','a~01x3','a~x103','a~0199~0163','a~0199~0162','ab~0299','a~0103~','~~~0103','abc~0303','ab~0103','a~0198~9903','ab~0299~9903']) {
      const output=unpackReference(input);cases.push(output===undefined?{input,error:true}:{input,output});
    }
  }
  return cases;
}
