import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { SEQUENCE_WORKSHOP as TEXT_SOFTWARE } from '../src/world/software/sequenceWorkshop';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { sequenceWorkshopVectors as textSoftwareVectors } from './sequenceWorkshopReference';
import { settleSoftwareUi } from './softwareUiDriver';
import { alignmentDetails } from './sequenceWorkshopReference';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name:'menu',source:source('programMenu')});

for (const app of TEXT_SOFTWARE) {
  const vectors = textSoftwareVectors(app);
  // Bound wall-clock work per test as the native input corpus grows. Each
  // individual run retains its existing guest cycle and memory checks.
  for (let offset = 0; offset < vectors.length; offset += 128) test(`${app.id} processes text through native keyboard input ${offset + 1}..${Math.min(offset + 128, vectors.length)}`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  for (const example of vectors.slice(offset, offset + 128)) {
    const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
    for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i) => m.poke(chunk.addr+i,v));
    m.poke(REG_P,built.image.image.labels.get('app_entry')!);
    const keyLoop = built.image.image.labels.get('app_key')!;
    const arenaGuards = app.id === 'suffix-index' ? [2999,3016,3019,3036,3049,3054] : [2999,3169,3199,3369,3399,3424,3429,3454,3499,3510];
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



test('sequence vector helper ignores unrelated app identities and keeps own examples first',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'not-a-sequence-tool'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('local alignment oracle agrees with exhaustive global alignments of every small substring pair',()=>{
 const words=['a','b','aa','ab','ba','bb','aba','bab','aab','bba'];
 // Enumerate edit paths directly, with no local-prefix recurrence or memo table.
 function global(a:string,b:string):number {
  if(!a.length)return -2*b.length;if(!b.length)return -2*a.length;
  return Math.max((a[0]===b[0]?2:-1)+global(a.slice(1),b.slice(1)), -2+global(a.slice(1),b), -2+global(a,b.slice(1)));
 }
 for(const a of words)for(const b of words){
  let best=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<=a.length;j++)for(let k=0;k<b.length;k++)for(let l=k+1;l<=b.length;l++)best=Math.max(best,global(a.slice(i,j),b.slice(k,l)));
  const result=alignmentDetails(a,b);expect(result.score,`${a}|${b}`).toBe(best);
  expect(result.a.replaceAll('-','')).toBe(a.slice(result.ai,result.ae));expect(result.b.replaceAll('-','')).toBe(b.slice(result.bi,result.be));
  expect([...result.a].reduce((score,c,i)=>score+(c==='-'||result.b[i]==='-'?-2:c===result.b[i]?2:-1),0)).toBe(best);
 }
});
