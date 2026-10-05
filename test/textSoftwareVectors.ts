import { monthCalendarVectors } from './monthCalendarVectors';
import { householdToolVectors } from './householdToolVectors';
import { pointSetVectors } from './pointSetVectors';
import { rationalFormVectors } from './rationalFormVectors';
import { subsequenceTextVectors } from './subsequenceTextVectors';
import { calendarSoftwareVectors } from './calendarSoftwareVectors';
import { wordGameSoftwareVectors } from './wordGameSoftwareVectors';
import { transformSoftwareVectors } from './transformSoftwareVectors';
import { layoutSoftwareVectors } from './layoutSoftwareVectors';
import { allocationSoftwareVectors } from './allocationSoftwareVectors';
import { textAnalysisSoftwareVectors } from './textAnalysisSoftwareVectors';
import { burrowsWheelerSoftwareVectors } from './burrowsWheelerSoftwareVectors';
import { continuedFractionSoftwareVectors } from './continuedFractionSoftwareVectors';
import { permutationSoftwareVectors } from './permutationSoftwareVectors';
import { graphSoftwareVectors } from './graphSoftwareVectors';
import { compressionSoftwareVectors } from './compressionSoftwareVectors';
import { subsetSoftwareVectors } from './subsetSoftwareVectors';
import { planningSoftwareVectors } from './planningSoftwareVectors';
import { geometrySoftwareVectors } from './geometrySoftwareVectors';
import { linearSoftwareVectors } from './linearSoftwareVectors';
import { polynomialSoftwareVectors } from './polynomialSoftwareVectors';
import { orderSoftwareVectors } from './orderSoftwareVectors';
import { patternSoftwareVectors } from './patternSoftwareVectors';
import { sequenceSoftwareVectors } from './sequenceSoftwareVectors';
import { programmingSoftwareVectors } from './programmingSoftwareVectors';
import { statisticsSoftwareVectors } from './statisticsSoftwareVectors';
import { writingSoftwareVectors } from './writingSoftwareVectors';
import type { TextSoftware } from '../src/world/software/native';

/** Format references belong only to tests. Guest algorithms execute assembly. */
export function textSoftwareVectors(app: TextSoftware): TextSoftware['examples'] {
  const cases = [...app.examples,...householdToolVectors(app.id),...monthCalendarVectors(app.id)];
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
  const short = ['', 'a', 'b', 'aa', 'ab', 'ba', 'bb'];
  if (app.id==='edit-distance' || app.id==='lcs-length') {
    for (const first of short) for (const second of short) {
      const memo=new Map<string,number>();
      const solve=(a:number,b:number):number=>{
        const key=`${a},${b}`;
        if (memo.has(key)) return memo.get(key)!;
        let value:number;
        if (a===first.length || b===second.length) value=app.id==='edit-distance' ? first.length-a+second.length-b : 0;
        else if (first[a]===second[b]) value=solve(a+1,b+1)+(app.id==='lcs-length' ? 1 : 0);
        else if (app.id==='edit-distance') value=1+Math.min(solve(a+1,b),solve(a,b+1),solve(a+1,b+1));
        else value=Math.max(solve(a+1,b),solve(a,b+1));
        memo.set(key,value); return value;
      };
      cases.push({input:first+'|'+second,output:String(solve(0,0))});
    }
    cases.push({input:'a'.repeat(26)+'|'+'b'.repeat(27),output:app.id==='edit-distance' ? '27' : '0'});
    cases.push({input:'a'.repeat(26)+'|'+'a'.repeat(27),output:app.id==='edit-distance' ? '1' : '26'});
    cases.push({input:'|'+'x'.repeat(53),output:app.id==='edit-distance' ? '53' : '0'});
  }
  if (app.id==='glob-match') for (const pattern of ['', '*', '?', '**', '*a', 'a*', '?b', '*?*', 'a?*b', 'a*b*a', '??', 'a**b']) for (const input of short) {
    const match=(p:number,t:number):boolean=>p===pattern.length ? t===input.length : pattern[p]==='*' ? match(p+1,t)||(t<input.length && match(p,t+1)) : t<input.length && (pattern[p]==='?'||pattern[p]===input[t]) && match(p+1,t+1);
    cases.push({input:pattern+'|'+input,output:match(0,0) ? 'MATCH' : 'NO MATCH'});
  }
  if (app.id==='find-all') for (const needle of ['a','b','aa','ab','ba']) for (const haystack of [...short,'ababa','aaaab']) {
    const positions:number[]=[];
    for (let i=haystack.indexOf(needle);i>=0;i=haystack.indexOf(needle,i+1)) positions.push(i);
    cases.push({input:needle+'|'+haystack,output:positions.length ? positions.join(' ') : 'NONE'});
  }
  const lists = ['', '  ', 'a', 'a ab aba abb ab a', 'A a A a!', 'z '.repeat(27), 'word-1 word-10 word-2', 'b a c b c a', 'x'.repeat(54), printable.slice(0,54), printable.slice(54)];
  if (['word-sort','unique-words','common-prefix','word-frequency'].includes(app.id)) for (const input of lists) {
    const list=input.split(' ').filter(Boolean); let output='';
    if (app.id==='word-sort') output=[...list].sort().join(' ');
    if (app.id==='unique-words') output=[...new Set(list)].join(' ');
    if (app.id==='common-prefix') {output=list[0]??''; while (!list.every(word=>word.startsWith(output))) output=output.slice(0,-1);}
    if (app.id==='word-frequency') {
      const counts=new Map<string,number>(); for (const word of list) counts.set(word,(counts.get(word)??0)+1);
      const best=[...counts].sort((a,b)=>b[1]-a[1])[0]; output=best ? best[0]+': '+best[1] : 'NONE';
    }
    cases.push({input,output});
  }
  if (app.id==='glob-match') cases.push(
    {input:'*|a|b',output:'MATCH'},
    {input:'?'.repeat(26)+'|'+'x'.repeat(27),output:'NO MATCH'},
    {input:'*'.repeat(26)+'|'+'x'.repeat(27),output:'MATCH'},
  );
  if (app.id==='find-all') cases.push({input:'a|x|a',output:'2'});
  if (app.id==='edit-distance') cases.push({input:'a|a|b',output:'2'});
  if (app.id==='lcs-length') cases.push({input:'a|a|b',output:'1'});
  return [...cases,...writingSoftwareVectors(app),...statisticsSoftwareVectors(app),...programmingSoftwareVectors(app),...sequenceSoftwareVectors(app),...patternSoftwareVectors(app),...orderSoftwareVectors(app),...polynomialSoftwareVectors(app),...linearSoftwareVectors(app),...geometrySoftwareVectors(app),...planningSoftwareVectors(app),...subsetSoftwareVectors(app),...compressionSoftwareVectors(app),...graphSoftwareVectors(app),...permutationSoftwareVectors(app),...continuedFractionSoftwareVectors(app),...burrowsWheelerSoftwareVectors(app),...textAnalysisSoftwareVectors(app),...allocationSoftwareVectors(app),...layoutSoftwareVectors(app),...transformSoftwareVectors(app),...wordGameSoftwareVectors(app),...calendarSoftwareVectors(app),...subsequenceTextVectors(app),...rationalFormVectors(app),...pointSetVectors(app)];
}
