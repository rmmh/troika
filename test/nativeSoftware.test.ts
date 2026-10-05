import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware, NUMERIC_SOFTWARE } from '../src/world/software/native';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { softwareVectors } from './softwareVectors';
import { settleSoftwareUi } from './softwareUiDriver';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name: 'menu', source: source('programMenu')});

for (const app of NUMERIC_SOFTWARE) test(`${app.id} executes its examples through the native keyboard UI`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  expect(built.file.length).toBeLessThanOrEqual(9841);
  for (const [index, example] of softwareVectors(app).entries()) {
    const m = new FirmwareProbe(['mmio', 'screen', 'palette', 'native.stack', 'page.text', 'scratch', 'network.state']);
    for (const image of [core.image, built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
    m.poke(REG_P, built.image.image.labels.get('app_entry')!);
    const keyLoop = built.image.image.labels.get('app_key')!;
    m.poke(3900, 713); m.poke(4009, 317);
    if(app.id==='aliquot-chain'){m.poke(2899,919);m.poke(2928,919);}
    const k = new TextDevice(); m.attach(k); m.attach(new DisplayDevice(a => m.peek(a), (a, v) => m.poke(a, v)));
    settleSoftwareUi(m,k,keyLoop,100_000);
    example.input.forEach((value, i) => {if (i) k.queueTrytes([TEXT_KEYS.next]); k.queueText(String(value));});
    k.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,k,keyLoop,500_000);
    expect(m.peek(2532)).toBe(4);
    expect(m.peek(2533)).toBe(app.number);
    expect(m.peek(2514)).toBe(1);
    expect(m.peek(2559), `${app.id}: ${example.input}`).toBe(example.error ? -1 : 0);
    if (example.output) {
      expect(example.output.map((_, i) => m.peek(2560 + i)), `${app.id}: ${example.input}`).toEqual(example.output);
      for (const value of example.output) expect(starterScreen(m)).toContain(String(value));
    }
    expect(example.input.map((_, i) => m.peek(2552+i))).toEqual(example.input.map(Math.abs));
    expect(m.peek(3900)).toBe(713); expect(m.peek(4009)).toBe(317);
    if(app.id==='aliquot-chain'){expect(m.peek(2899)).toBe(919);expect(m.peek(2928)).toBe(919);}
    if (index === 0 && app.number >= 27) {
      k.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,k,keyLoop,500_000);
      expect(m.peek(2559)).toBe(example.error ? -1 : 0);
      if (example.output) expect(example.output.map((_,i)=>m.peek(2560+i))).toEqual(example.output);
    }
    expect(m.stackHighWater).toBeLessThan(243);
  }
}, 60_000);

test('software UI driver reports a wedged native algorithm within its cycle budget', () => {
  const app = {...NUMERIC_SOFTWARE[0]!,algorithm:'app_compute: J app_compute'};
  const built = buildNativeSoftware(core,source,app);
  const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
  for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  m.poke(REG_P,built.image.image.labels.get('app_entry')!);
  const keyboard = new TextDevice(); m.attach(keyboard);
  expect(()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!,10_000))
    .toThrow(/Native software did not settle: PC=.*app=1.*budget=10000/);
  expect(m.cycles).toBeGreaterThanOrEqual(10_000);
  expect(m.cycles).toBeLessThan(10_020);
});
