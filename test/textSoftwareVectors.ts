import type { TextSoftware } from '../src/world/software/native';

/** Format references belong only to tests. Guest algorithms execute assembly. */
export function textSoftwareVectors(app: TextSoftware): TextSoftware['examples'] {
  const cases = [...app.examples];
  const printable = Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).join('');
  const samples = ['', 'a b+c/d?x=1&y="two"', '"\\/<>\'&;', printable.slice(0,54), printable.slice(54), 'Ab12-._~'.repeat(6)];
  if (app.id === 'uri-encode') for (const input of samples) cases.push({input,output:encodeURIComponent(input).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())});
  if (app.id === 'uri-decode') for (const byte of [0,9,10,13,31,...Array.from({length:95},(_,i)=>i+32),127,128,255]) {
    const input = '%'+byte.toString(16).padStart(2,'0');
    cases.push(byte>=32 && byte<=126 ? {input,output:String.fromCharCode(byte)} : {input,error:true});
  }
  const entities: Record<string,string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
  if (app.id === 'html-escape') for (const input of samples) {
    const output = input.replace(/[&<>"']/g,c=>entities[c]!);
    cases.push(output.length<=162 ? {input,output} : {input,error:true});
  }
  if (app.id === 'html-unescape') {
    for (const input of ['&amp;&lt;&gt;&quot;&apos;','&amp;amp;','a&copy;b','&','&lt','&&amp;','&lt;;']) {
      const unknown = input.replace(/&(amp|lt|gt|quot|apos);/g,'').includes('&');
      cases.push(unknown ? {input,error:true} : {input,output:input.replace(/&(amp|lt|gt|quot|apos);/g,entity=>Object.keys(entities).find(key=>entities[key]===entity)!)});
    }
  }
  if (app.id === 'json-quote') for (const input of samples) cases.push({input,output:JSON.stringify(input)});
  if (app.id === 'json-unquote') {
    for (let code=32;code<=126;code+=3) {
      const input = '"\\u'+code.toString(16).padStart(4,'0')+'"';
      cases.push({input,output:JSON.parse(input) as string});
    }
    for (const input of ['"\\u00GG"','"\\u004"','"\\u0100"','"\\t"','"\\"','"\\q"','"x" ',' "x"','"x""']) cases.push({input,error:true});
    for (const value of samples.filter(s=>JSON.stringify(s).length<=54)) {
      const input = JSON.stringify(value); cases.push({input,output:JSON.parse(input) as string});
    }
  }
  if (app.id === 'csv-quote') for (const input of samples) cases.push({input,output:'"'+input.replaceAll('"','""')+'"'});
  if (app.id === 'csv-unquote') for (const output of samples.filter(s=>s.length+s.split('"').length+1<=54)) cases.push({input:'"'+output.replaceAll('"','""')+'"',output});
  return cases;
}
