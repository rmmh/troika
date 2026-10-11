import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { CODING_WORKBENCH as TEXT_SOFTWARE } from '../src/world/software/codingWorkbench';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { codingWorkbenchVectors as textSoftwareVectors, codingWorkbenchReference } from './codingWorkbenchReference';
import { settleSoftwareUi } from './softwareUiDriver';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name:'menu',source:source('programMenu')});

for (const app of TEXT_SOFTWARE) {
  const vectors = textSoftwareVectors(app);
  // Bound wall-clock work per test as the native input corpus grows. Each
  // individual run retains its existing guest cycle and memory checks.
  for (let offset = 0; offset < vectors.length; offset += 32) test(`${app.id} processes text through native keyboard input ${offset + 1}..${Math.min(offset + 32, vectors.length)}`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  for (const example of vectors.slice(offset, offset + 32)) {
    const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
    for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i) => m.poke(chunk.addr+i,v));
    m.poke(REG_P,built.image.image.labels.get('app_entry')!);
    const keyLoop = built.image.image.labels.get('app_key')!;
    const arenaGuards = [3990,4000,4009];
    for(const address of arenaGuards) m.poke(address,919);
    for (let address = 2862; address < 2900; address++) m.poke(address,733);
    const keyboard = new TextDevice(); m.attach(keyboard); m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    settleSoftwareUi(m,keyboard,keyLoop,8_000_000); keyboard.queueText(example.input); keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,8_000_000);
    expect(m.peek(2533)).toBe(app.number); expect(m.peek(2514)).toBe(1);
    expect(starterScreen(m)).toContain(app.inputs[0]+' (max 54)');
    expect(starterScreen(m)).toContain(app.outputs[0]!);
    expect(m.peek(2621),example.input).toBe(example.error ? -1 : 0);
    expect(m.peek(2620)).toBeLessThanOrEqual(162);
    expect(Array.from({length:38},(_,i)=>m.peek(2862+i))).toEqual(Array(38).fill(733));
    expect(String.fromCharCode(...Array.from({length:m.peek(2610)},(_,i)=>m.peek(2552+i)))).toBe(example.input);
    if (example.output !== undefined) {
      expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i))),example.input).toBe(example.output);
      expect(starterScreen(m)).toContain(app.title);
    }
    keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,8_000_000);
    expect(m.peek(2621)).toBe(example.error ? -1 : 0);
    if (example.output !== undefined) expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
    for(const address of arenaGuards) expect(m.peek(address),`arena guard ${address}`).toBe(919);
    keyboard.queueTrytes([TEXT_KEYS.home]); m.run(100_000); expect(m.peek(2504)).toBe(11);
    expect(m.stackHighWater).toBeLessThan(243);
  }
});
}



test('coding vectors ignore unrelated apps and preserve own example prefix',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'unrelated'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('coding metadata fits the native page and text geometry',()=>{
 for(const app of TEXT_SOFTWARE){expect(app.id.length).toBeLessThanOrEqual(16);expect(app.title.length).toBeLessThanOrEqual(27);for(const label of app.inputs)expect(label.length).toBeLessThanOrEqual(16);for(const label of app.outputs)expect(label.length).toBeLessThanOrEqual(27);for(const example of textSoftwareVectors(app)){if(example.output!==undefined){expect(example.output.length).toBeLessThanOrEqual(162);expect(example.output).toMatch(/^[ -~]*$/);}}}
});

test('coding worked examples agree with independent references',()=>{
 for(const app of TEXT_SOFTWARE)for(const example of app.examples){const result=codingWorkbenchReference(app.id,example.input);expect(result,`${app.id}: ${example.input}`).toBe(example.error?undefined:example.output);}
});



test('coding descriptions and worked examples fit actual native catalog pages',async()=>{
 const {buildWebCatalog}=await import('../src/world/catalog/pages');
 const distribution=TEXT_SOFTWARE.map(app=>({...app,publishedSource:app.algorithm,path:`/p${String(app.number-1).padStart(4,'0')}`,sourcePath:`/c${String(app.number-1).padStart(4,'0')}`,pagePath:`/s${String(app.number-1).padStart(4,'0')}`,program:buildNativeSoftware(core,source,app)}));
 expect(()=>buildWebCatalog(distribution)).not.toThrow();
});

test('JSON oracle distinguishes escaped backslashes from unsupported control escapes',()=>{
 expect(codingWorkbenchReference('structured-query','a|{"a":"x\\\\y"}')).toBe('STRING (JSON spelling)'.padEnd(27)+'"x\\\\y"');
 expect(codingWorkbenchReference('structured-query','a|{"a":"x\\ny"}')).toBeUndefined();
});

test('candidate keys agree with exhaustive two-tuple dependency counterexamples',()=>{
 const rules=['A>B','A>C','B>A','B>C','C>A','C>B','AB>C','AC>B','BC>A','~>A'];
 const mask=(s:string)=>[...s].reduce((m,c)=>c==='~'?m:m|1<<(c.charCodeAt(0)-65),0);
 for(const a of rules)for(const b of rules){
  const fds=[a,b].map(r=>r.split('>').map(mask) as[number,number]);
  // A mask records columns on which two tuples agree. Such a tuple pair
  // satisfies every FD precisely when each satisfied antecedent entails its RHS.
  const allowed=Array.from({length:8},(_,m)=>m).filter(m=>fds.every(([l,r])=>(m&l)!==l||(m&r)===r));
  const keys:number[]=[];for(let k=0;k<8;k++)if(allowed.every(m=>(m&k)!==k||m===7)&&!keys.some(j=>(j&k)===j))keys.push(k);
  const expected=keys.map(k=>k?[...'ABC'].filter((_,i)=>k&1<<i).join(''):'~');
  const actual=codingWorkbenchReference('relation-keys','ABC|'+a+','+b)!.slice(27,135).trim().split(/\s+/);
  expect(actual,a+','+b).toEqual(expected);
 }
});

test('liveness agrees with first future use before redefinition',()=>{
 for(const example of textSoftwareVectors(TEXT_SOFTWARE.find(a=>a.id==='live-variables')!)){
  if(example.error)continue;const[code,observed]=example.input.split('|'),lines=code!.split(';');
  const before=lines.map((_,start)=>[...'abcdef'].filter(v=>{
   for(const line of lines.slice(start)){if(line.slice(2).includes(v))return true;if(line[0]===v)return false;}
   return observed!.includes(v);
  }).join('')||'-');
  expect(example.output!.slice(54),example.input).toBe(before.map((set,i)=>(`${i+1}:${set}`).padEnd(9)).join(''));
 }
});

test('unilateral and identical branch edits always reconstruct that branch',()=>{
 const words=['','a','b','aa','ab','ba','bb','aba','bab','aaaa','abba'];
 for(const base of words)for(const branch of words)for(const input of[`${base}|${base}|${branch}`,`${base}|${branch}|${base}`,`${base}|${branch}|${branch}`]){
  const output=codingWorkbenchReference('three-way-merge',input)!;
  expect(output.slice(0,27).trim(),input).toBe('MERGED');expect(output.slice(27,81).trim(),input).toBe(branch);
 }
});
