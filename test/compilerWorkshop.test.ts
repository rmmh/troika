import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { COMPILER_WORKSHOP as TEXT_SOFTWARE } from '../src/world/software/compilerWorkshop';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { compilerWorkshopVectors as textSoftwareVectors, compilerWorkshopReference } from './compilerWorkshopReference';
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
    settleSoftwareUi(m,keyboard,keyLoop,3_000_000); keyboard.queueText(example.input); keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,3_000_000);
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
    keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,3_000_000);
    expect(m.peek(2621)).toBe(example.error ? -1 : 0);
    if (example.output !== undefined) expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
    for(const address of arenaGuards) expect(m.peek(address),`arena guard ${address}`).toBe(919);
    keyboard.queueTrytes([TEXT_KEYS.home]); m.run(100_000); expect(m.peek(2504)).toBe(11);
    expect(m.stackHighWater).toBeLessThan(243);
  }
});
}



test('compiler vectors ignore unrelated apps and preserve own example prefix',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'unrelated'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('compiler metadata fits the native page and text geometry',()=>{
 for(const app of TEXT_SOFTWARE){expect(app.id.length).toBeLessThanOrEqual(16);expect(app.title.length).toBeLessThanOrEqual(27);for(const label of app.inputs)expect(label.length).toBeLessThanOrEqual(16);for(const example of textSoftwareVectors(app)){if(example.output!==undefined){expect(example.output.length).toBeLessThanOrEqual(162);expect(example.output).toMatch(/^[ -~]*$/);}}}
});

test('compiler worked examples agree with independent references',()=>{
 for(const app of TEXT_SOFTWARE)for(const example of app.examples){const result=compilerWorkshopReference(app.id,example.input);expect(result,`${app.id}: ${example.input}`).toBe(example.error?undefined:example.output);}
});

test('all three-variable covers meet the independent prime-cover optimum',()=>{
 const patterns=Array.from({length:27},(_,i)=>[Math.floor(i/9),Math.floor(i/3)%3,i%3]);
 for(let on=0;on<256;on++){
  const candidates=patterns.map(ds=>({coverage:Array.from({length:8},(_,m)=>ds.every((d,i)=>!d||((m>>(2-i))&1)===d-1)?1<<m:0).reduce((a,b)=>a|b,0),literals:ds.filter(Boolean).length})).filter(c=>c.coverage&&(c.coverage&~on)===0);
  const primes=candidates.filter(c=>!candidates.some(d=>c!==d&&(c.coverage|d.coverage)===d.coverage&&d.literals<c.literals));
  let optimum=Infinity;
  for(let subset=0;subset<2**primes.length;subset++){let covered=0,score=0;primes.forEach((p,i)=>{if(subset&(1<<i)){covered|=p.coverage;score+=25+p.literals;}});if(covered===on)optimum=Math.min(optimum,score);}
  const input=Array.from({length:8},(_,i)=>on&(1<<i)?String(i):'').join('')+'|';
  const output=compilerWorkshopReference('logic-cover',input)!;const match=/terms=(\d+) literals=(\d+)/.exec(output)!;
  expect(Number(match[1])*25+Number(match[2]),input).toBe(optimum);
  const expression=output.slice(27+5);
  for(let m=0;m<8;m++){const value=expression==='1'||expression!=='0'&&expression.split('+').some(product=>[...product.matchAll(/(!?)([abc])/g)].every(token=>Boolean((m>>(2-'abc'.indexOf(token[2]!)))&1)!==Boolean(token[1])));expect(value,input+':'+m).toBe(Boolean(on&(1<<m)));}
 }
});
