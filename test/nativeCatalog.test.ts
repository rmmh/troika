import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built = linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','dns','url','http','httpRequest','catalog'].map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'app', source: `
entry: M B Z C S fs_mount N A Z J done C S fs_check J done
list: C S share_catalog W 2201 B W 2202 C W 2203 D J done
http_body: M A Z O S P
done: W 2200 A H 0sAAA Z` }]));
function driver(count: number) {
  const m = new FirmwareProbe(['mmio','native.stack','filesystem','network.state','network.buffers','scratch','url.state','page.text']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  const disk = new BlockMedium(81, false, createDiskImage({ blocks: 81, volumeId: [0,0,5], directories: ['/public/shared/child'], files: {
    '/public/shared/toolongfilename': [], ...Object.fromEntries(Array.from({ length: count }, (_, i) => [`/public/shared/f${String(i).padStart(2, '0')}`, []])),
  } })); m.attach(new BlockDevice([disk]));
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(20_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(48); return m.peek(2200);
  }
  expect(run('entry')).toBe(0);
  const before = disk.image();
  function list(path: string) {
    encodeText(path).forEach((v, i) => m.poke(6196 + i, v)); m.poke(6226, path.length);
    const status = run('list'); expect(m.peek(6960)).toBe(0); expect(disk.image()).toEqual(before);
    if (status !== 1) return { status, body: '' };
    expect(m.peek(2201)).toBe(2552); expect(m.peek(2203)).toBe(2); expect(m.peek(2202)).toBeLessThanOrEqual(1458);
    return { status, body: decodeText(Array.from({ length: m.peek(2202) }, (_, i) => m.peek(2552 + i))) };
  }
  return { list };
}
test('native catalog enumerates multiple bounded pages without modifying media', () => {
  const r = driver(40), bodies: string[] = [];
  for (const path of ['/catalog', '/catalog2', '/catalog3']) {
    const result = r.list(path); expect(result.status).toBe(1); bodies.push(result.body);
    expect(result.body.startsWith('PAGE 1\nT 12:Shared files\n')).toBe(true);
    expect(result.body).toContain('L 4:Home 6:/index\n');
  }
  expect(bodies[0]).toContain('L 4:Next 9:/catalog2\n'); expect(bodies[1]).toContain('L 4:Next 9:/catalog3\n');
  expect(bodies[2]).not.toContain('Next');
  const names = bodies.flatMap(body => [...body.matchAll(/L 3:(f\d\d) 11:\/shared\/f\d\d\n/g)].map(match => match[1]));
  expect(names.sort()).toEqual(Array.from({ length: 40 }, (_, i) => `f${String(i).padStart(2, '0')}`));
  expect(r.list('/catalog5').body).not.toContain('/shared/');
  expect(r.list('/catalog0').status).toBe(404); expect(r.list('/catalog6').status).toBe(404);
  expect(r.list('/readme').status).toBe(0);
});


test.each([0, 18, 79])('native catalog handles an empty directory, an exact page, or maximum directory capacity: %i files', count => {
  const r = driver(count), names: string[] = [];
  for (let page = 1; page <= 5; page++) {
    const { status, body } = r.list(`/catalog${page}`); expect(status).toBe(1);
    names.push(...[...body.matchAll(/L 3:(f\d\d) 11:\/shared\/f\d\d\n/g)].map(match => match[1]!));
    expect(body.includes('L 4:Next')).toBe(count > page * 18);
    expect(body).not.toContain('toolongfilename'); expect(body).not.toContain('/shared/child');
  }
  expect(names).toEqual(Array.from({ length: count }, (_, i) => `f${String(i).padStart(2, '0')}`));
});
