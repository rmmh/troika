import type { TextSoftware } from '../src/world/software/native';
function wrap(width:number,words:string[]):string|undefined {
  if(words.some(w=>w.length>width))return;
  // Enumerate every legal line partition. Longer first lines win equal costs.
  let bestCost=Infinity,best:string[]=[];
  const visit=(at:number,lines:string[],cost:number)=>{
    if(at===words.length){if(cost<bestCost){bestCost=cost;best=[...lines];}return;}
    for(let end=words.length;end>at;end--){const line=words.slice(at,end).join(' ');if(line.length<=width)visit(end,[...lines,line],cost+(end===words.length?0:(width-line.length)**2));}
  };visit(0,[],0);
  const output=best.map((line,i)=>i===best.length-1?line:line.padEnd(27)).join('');
  return output.length>162?undefined:output;
}
function tabs(width:number,text:string):string|undefined {
  let out='';for(let i=0;i<text.length;i++) {
    let c=text[i]!;if(c==='\\'){c=text[++i]!;if(c==='t'){const col=out.length%27;out+=' '.repeat(Math.min(width-col%width,27-col));}
      else if(c==='n')out+=' '.repeat(27-out.length%27);else if(c==='\\')out+='\\';else return;
    }else out+=c;
    if(out.length>162)return;
  }return out;
}
export function layoutSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='paragraph-wrap') {
    for(let width=1;width<=10;width++)for(let code=0;code<81;code++) {
      let value=code;const words=Array.from({length:4},(_,i)=>{const word=String.fromCharCode(97+i).repeat(value%3+1);value=Math.floor(value/3);return word;}),output=wrap(width,words);
      cases.push(output===undefined?{input:width+'|'+words.join(' '),error:true}:{input:width+'|'+words.join(' '),output});
    }
    cases.push({input:'27|'+'a '.repeat(25)+'a',output:('a '.repeat(13)+'a')+('a '.repeat(11)+'a')},
      {input:'1|'+'a '.repeat(25)+'a',error:true},{input:'1|a b c d e f',output:['a','b','c','d','e'].map(s=>s.padEnd(27)).join('')+'f'},
      {input:'1|a b c d e f g',error:true},{input:'27|'+'x'.repeat(27),output:'x'.repeat(27)},
      {input:'06|  a   b  ',output:'a b'},{input:'5|a|b c',output:'a|b c'});
    for(const input of ['', '0|a','28|a','123|a','|a','x|a','5','-1|a'])cases.push({input,error:true});
  }
  if(app.id==='tab-preview') {
    for(let width=1;width<=9;width++)for(let col=0;col<28;col++)for(const suffix of ['\\tb','\\nb']) {
      const text='a'.repeat(col)+suffix,output=tabs(width,text);cases.push({input:width+'|'+text,output:output!});
    }
    for(const text of ['\\n'.repeat(6),'\\n'.repeat(6)+'x','\\n'.repeat(7),'\\t'.repeat(20),'x\\\\y\\tz','\\','\\q']) {
      const output=tabs(9,text);cases.push(output===undefined?{input:'9|'+text,error:true}:{input:'9|'+text,output});
    }
    for(const input of ['', '0|x','10|x','1x','x|a','1'])cases.push({input,error:true});
  }
  return cases;
}
