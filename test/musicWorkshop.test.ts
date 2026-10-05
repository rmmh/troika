import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { MUSIC_WORKSHOP as TEXT_SOFTWARE } from '../src/world/software/musicWorkshop';
import { FirmwareProbe } from './firmwareProbe';
import {SoundDevice} from '../src/core/soundDevice';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { musicWorkshopVectors as textSoftwareVectors, musicWorkshopReference } from './musicWorkshopReference';
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



test('music vectors ignore unrelated apps and preserve own example prefix',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'unrelated'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('music metadata fits the native page and text geometry',()=>{
 for(const app of TEXT_SOFTWARE){expect(app.id.length).toBeLessThanOrEqual(16);expect(app.title.length).toBeLessThanOrEqual(27);for(const label of app.inputs)expect(label.length).toBeLessThanOrEqual(16);for(const example of textSoftwareVectors(app)){if(example.output!==undefined){expect(example.output.length).toBeLessThanOrEqual(162);expect(example.output).toMatch(/^[ -~]*$/);}}}
});

test('music worked examples agree with independent references',()=>{
 for(const app of TEXT_SOFTWARE)for(const example of app.examples){const result=musicWorkshopReference(app.id,example.input);expect(result,`${app.id}: ${example.input}`).toBe(example.error?undefined:example.output);}
});


test('all bounded Euclidean rhythms are rotations of maximally-even mechanical words',()=>{
 for(let n=1;n<=24;n++)for(let k=0;k<=n;k++){
  const result=musicWorkshopReference('euclidean-beat',`${n} ${k} 0`)!;
  const bits=result.slice(27,27+n).replaceAll('x','1').replaceAll('.','0');
  const mechanical=Array.from({length:n},(_,i)=>Math.floor((i+1)*k/n)-Math.floor(i*k/n)).join('');
  expect((mechanical+mechanical).includes(bits),`${n},${k}`).toBe(true);
  expect([...bits].filter(b=>b==='1')).toHaveLength(k);
 }
});

for(const app of TEXT_SOFTWARE.filter(app=>app.audio))test(`${app.id} auditions guest APU, preserves whitespace, and cancels safely`,()=>{
 const built=buildNativeSoftware(core,source,app),m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of [core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 const keyboard=new TextDevice(),sound=new SoundDevice(a=>m.peek(a),(a,v)=>m.poke(a,v));m.attach(keyboard);m.attach(sound);m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!,3_000_000);
 const inputs:Record<string,string>={'chord-finder':'60 64 67','voice-leading':'48 52 55|0 5 9','euclidean-beat':'8 3 0','melody-transform':'T 2|60 62 64'};
 settle();keyboard.queueText(inputs[app.id]!);keyboard.queueTrytes([TEXT_KEYS.activate]);settle();expect(m.peek(2621)).toBe(0);const length=m.peek(2610);
 keyboard.queueText(' ');settle();expect(m.peek(2610)).toBe(length+1);expect(m.peek(2552+length)).toBe(32);
 sound.drainSamples();keyboard.queueText('P');settle();const samples=sound.drainSamples();expect(samples.some(v=>v>0)).toBe(true);expect(samples.some(v=>v<0)).toBe(true);expect(m.peek(150)).toBe(0);expect(m.peek(2610)).toBe(length+1);
 keyboard.queueText('p ');settle();expect(m.peek(150)).toBe(0);expect(m.peek(2610)).toBe(length+1);
 keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));keyboard.queueText('bad');keyboard.queueTrytes([TEXT_KEYS.activate]);settle();expect(m.peek(2621)).toBe(-1);expect(m.peek(3830)).toBe(0);sound.drainSamples();keyboard.queueText('p');settle();expect(sound.drainSamples().every(v=>v===0)).toBe(true);
 keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));keyboard.queueText(inputs[app.id]!);keyboard.queueTrytes([TEXT_KEYS.activate]);settle();keyboard.queueText('p');keyboard.queueTrytes([TEXT_KEYS.home]);m.run(800_000);expect(m.peek(2504)).toBe(11);expect(m.peek(150)).toBe(0);expect(m.stackHighWater).toBeLessThan(243);
});
