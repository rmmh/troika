import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { SCIENTIFIC_DESK as TEXT_SOFTWARE } from '../src/world/software/scientificDesk';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import {scientificDeskVectors as textSoftwareVectors,scientificDeskReference} from './scientificDeskReference';
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
    settleSoftwareUi(m,keyboard,keyLoop,800_000); keyboard.queueText(example.input); keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,800_000);
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
    keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,800_000);
    expect(m.peek(2621)).toBe(example.error ? -1 : 0);
    if (example.output !== undefined) expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
    for(const address of arenaGuards) expect(m.peek(address),`arena guard ${address}`).toBe(919);
    keyboard.queueTrytes([TEXT_KEYS.home]); m.run(100_000); expect(m.peek(2504)).toBe(11);
    expect(m.stackHighWater).toBeLessThan(243);
  }
});
}




test('scientific metadata, examples and vector isolation are coherent',()=>{for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'unrelated'})).toEqual([]);for(const example of app.examples)expect(scientificDeskReference(app.id,example.input)).toEqual(example);expect(app.id.length).toBeLessThanOrEqual(16);expect(app.title.length).toBeLessThanOrEqual(27);expect(app.inputs[0]!.length).toBeLessThanOrEqual(16);for(const v of textSoftwareVectors(app))if(v.output!==undefined){expect(v.output.length,v.input).toBeLessThanOrEqual(162);expect(v.output).toMatch(/^[ -~]*$/);}}});

import {buildWebCatalog} from '../src/world/catalog/pages';
test('scientific descriptions and examples fit actual native page arenas',()=>{const distribution=TEXT_SOFTWARE.map(app=>({...app,publishedSource:app.algorithm,path:`/p${String(app.number-1).padStart(4,'0')}`,sourcePath:`/c${String(app.number-1).padStart(4,'0')}`,pagePath:`/s${String(app.number-1).padStart(4,'0')}`,program:buildNativeSoftware(core,source,app)}));const catalog=buildWebCatalog(distribution);for(const app of distribution){const page=catalog.pages.find(p=>p.host===app.site+'.world'&&p.path===app.pagePath)!;expect(page.retained,app.id).toBeLessThanOrEqual(1458);expect(page.records,app.id).toBeLessThanOrEqual(24);}});
