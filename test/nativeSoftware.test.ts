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

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name: 'menu', source: source('programMenu')});

for (const app of NUMERIC_SOFTWARE) test(`${app.id} executes its examples through the native keyboard UI`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  expect(built.file.length).toBeLessThanOrEqual(9841);
  for (const example of softwareVectors(app)) {
    const m = new FirmwareProbe(['mmio', 'screen', 'palette', 'native.stack', 'page.text', 'scratch', 'network.state']);
    for (const image of [core.image, built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
    m.poke(REG_P, built.image.image.labels.get('app_entry')!);
    const k = new TextDevice(); m.attach(k); m.attach(new DisplayDevice(a => m.peek(a), (a, v) => m.poke(a, v)));
    m.run(100_000);
    example.input.forEach((value, i) => {if (i) k.queueTrytes([TEXT_KEYS.next]); k.queueText(String(value));});
    k.queueTrytes([TEXT_KEYS.activate]); m.run(500_000);
    expect(m.peek(2532)).toBe(4);
    expect(m.peek(2533)).toBe(app.number);
    expect(m.peek(2514)).toBe(1);
    expect(m.peek(2559), `${app.id}: ${example.input}`).toBe(example.error ? -1 : 0);
    if (example.output) {
      expect(example.output.map((_, i) => m.peek(2560 + i)), `${app.id}: ${example.input}`).toEqual(example.output);
      for (const value of example.output) expect(starterScreen(m)).toContain(String(value));
    }
    expect(m.stackHighWater).toBeLessThan(243);
  }
}, 60_000);
