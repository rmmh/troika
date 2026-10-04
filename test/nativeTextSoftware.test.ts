import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { TEXT_SOFTWARE } from '../src/world/software/text';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name:'menu',source:source('programMenu')});

for (const app of TEXT_SOFTWARE) test(`${app.id} processes text through native keyboard input`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  for (const example of app.examples) {
    const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
    for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i) => m.poke(chunk.addr+i,v));
    m.poke(REG_P,built.image.image.labels.get('app_entry')!);
    for (let address = 2862; address < 2900; address++) m.poke(address,733);
    const keyboard = new TextDevice(); m.attach(keyboard); m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    m.run(100_000); keyboard.queueText(example.input); keyboard.queueTrytes([TEXT_KEYS.activate]); m.run(800_000);
    expect(m.peek(2533)).toBe(app.number); expect(m.peek(2514)).toBe(1);
    expect(m.peek(2621),example.input).toBe(example.error ? -1 : 0);
    expect(m.peek(2620)).toBeLessThanOrEqual(162);
    expect(Array.from({length:38},(_,i)=>m.peek(2862+i))).toEqual(Array(38).fill(733));
    expect(String.fromCharCode(...Array.from({length:m.peek(2610)},(_,i)=>m.peek(2552+i)))).toBe(example.input);
    if (example.output !== undefined) {
      expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i))),example.input).toBe(example.output);
      expect(starterScreen(m)).toContain(app.title);
    }
    keyboard.queueTrytes([TEXT_KEYS.activate]); m.run(200_000);
    expect(m.peek(2621)).toBe(example.error ? -1 : 0);
    if (example.output !== undefined) expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
    expect(m.stackHighWater).toBeLessThan(243);
  }
});

test('text input caps at 54 characters, supports editing, and reruns without stale output', () => {
  const app = TEXT_SOFTWARE.find(app=>app.id==='slug')!, built = buildNativeSoftware(core,source,app);
  const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
  for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  m.poke(REG_P,built.image.image.labels.get('app_entry')!);
  const keyboard = new TextDevice(); m.attach(keyboard); m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
  m.run(100_000); keyboard.queueText('A'.repeat(54)+'ignored'); m.run(800_000);
  expect(m.peek(2610)).toBe(54);
  keyboard.queueTrytes([86]); keyboard.queueText('B'); keyboard.queueTrytes([TEXT_KEYS.activate]); m.run(300_000);
  expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe('a'.repeat(53)+'b');
  keyboard.queueTrytes(Array(55).fill(86)); keyboard.queueText('  New---name!'); keyboard.queueTrytes([TEXT_KEYS.activate]); m.run(800_000);
  expect(m.peek(2610)).toBe(13);
  expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe('new-name');
  expect(m.peek(2514)).toBe(1); expect(m.peek(2621)).toBe(0);
});
