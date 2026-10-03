import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { encodeText } from '../src/core/textEncoding';
import { FirmwareProbe } from './firmwareProbe';

const built = linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','fatCopy'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'test', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check J done
copy: M A 5954 R B 2210 M C 6130 R D 2211 C S fs_copy J done
open_file: M A 5954 R B 2210 C S fs_lookup N A Z J done C S fs_open J done
read_file: C S fs_read_next W 2201 B J done
close_file: C S fs_close J done
check: C S fs_check W 2201 B J done
reclaim: C S fs_reclaim J done
done: W 2200 A H 0sAAA Z` }]));
class TracedMedium extends BlockMedium {
  commits: Int16Array[] = [];
  override write(block: number, data: Int16Array) { super.write(block, data); this.commits.push(this.image()); }
}
function driver(image: Int16Array, readOnly = false) {
  const m = new FirmwareProbe(['mmio','filesystem','native.stack','network.state','forth.state']);
  for (const chunk of built.image.chunks) chunk.data.forEach((cell, i) => m.poke(chunk.addr + i, cell));
  const disk = new TracedMedium(image.length / 243, readOnly, image); m.attach(new BlockDevice([disk]));
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(100_000_000)).toBe('sleep-forever');
    expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(30);
    return m.peek(2200);
  }
  function path(value: string, address: number, length: number) { encodeText(value).forEach((cell, i) => m.poke(address + i, cell)); m.poke(length, value.length); }
  expect(run('entry')).toBe(0);
  return { m, disk, run,
    copy(source: string, destination: string) { path(source, 5954, 2210); path(destination, 6130, 2211); return run('copy'); },
    read(source: string) {
      path(source, 5954, 2210); expect(run('open_file')).toBe(0);
      const cells: number[] = [];
      for (;;) { expect(run('read_file')).toBe(0); const count = m.peek(2201); if (!count) break; for (let i = 0; i < count; i++) cells.push(m.peek(6440 + i)); }
      expect(run('close_file')).toBe(0); return cells;
    },
  };
}
const disk = (files: Record<string, number[]>, blocks = 81) => createDiskImage({ blocks, volumeId: [0,0,1], files });
const contents = (length: number) => Array.from({ length }, (_, i) => i % 3 === 0 ? -9841 : i % 3 === 1 ? 9841 : i % 9842);

test.each([0, 243, 487, 9721])('native copy preserves all signed cells across blocks, length=%i', length => {
  const source = contents(length), r = driver(disk({ '/source': source, '/dest': [1,2,3] }, 108));
  expect(r.copy('/source', '/dest')).toBe(0);
  expect(r.read('/source')).toEqual(source); expect(r.read('/dest')).toEqual(source);
  expect(r.run('check')).toBe(0); expect(r.m.peek(2201)).toBe(0);
});
test('self-copy and directory growth preserve reachable source chains', () => {
  const source = contents(500);
  const r = driver(disk({ '/box/source': source, ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`/box/f${i}`, []])) }));
  expect(r.copy('/box/source', '/box/new')).toBe(0);
  expect(r.read('/box/source')).toEqual(source); expect(r.read('/box/new')).toEqual(source);
  expect(r.copy('/box/source', '/box/source')).toBe(0); expect(r.read('/box/source')).toEqual(source);
  expect(r.run('check')).toBe(0); expect(r.m.peek(2201)).toBe(0);
});
test('full and read-only disks preserve the old destination and release owned handles', () => {
  const source = contents(8 * 243), initial = disk({ '/source': source, '/dest': [7], '/fill': contents(6 * 243) }, 27);
  for (const [image, readOnly, error] of [[initial, false, -18], [disk({ '/source': source, '/dest': [7] }), true, -4]] as const) {
    const r = driver(image, readOnly); expect(r.copy('/source', '/dest')).toBe(error);
    expect(r.m.peek(6960)).toBe(0);
    if (readOnly) expect(r.disk.image()).toEqual(image);
    const cold = driver(r.disk.image());
    expect(cold.read('/dest')).toEqual([7]); expect(cold.read('/source')).toEqual(source);
    expect(cold.run('check')).toBe(0); expect(cold.m.peek(2201)).toBe(0);
  }
});
test('copy rejects missing sources, directories and invalid destination paths', () => {
  const initial = disk({ '/source': [1], '/box/item': [2], '/dest': [7] });
  for (const [source, destination, error] of [['/missing','/dest',-12], ['/box','/dest',-14], ['/source','/box',-14], ['/source','relative',-15], ['/source','/absent/new',-12]] as const) {
    const r = driver(initial); expect(r.copy(source, destination)).toBe(error);
    expect(r.disk.image()).toEqual(initial); expect(r.m.peek(6960)).toBe(0);
  }
});
test('each copy publication boundary cold-boots with the intact source and complete old or new destination', () => {
  const source = contents(500), old = [7,8], initial = disk({ '/source': source, '/dest': old }, 27);
  const r = driver(initial); expect(r.copy('/source', '/dest')).toBe(0);
  expect(r.disk.commits.length).toBeGreaterThan(6);
  let published = false;
  for (const image of [initial, ...r.disk.commits]) {
    const cold = driver(image); expect(cold.read('/source')).toEqual(source);
    const got = cold.read('/dest'); if (got.length === source.length) published = true;
    expect(got).toEqual(published ? source : old);
    expect(cold.run('reclaim')).toBe(0); expect(cold.run('check')).toBe(0); expect(cold.m.peek(2201)).toBe(0);
    expect(cold.read('/source')).toEqual(source); expect(cold.read('/dest')).toEqual(got);
  }
}, 30_000);

test('source corruption aborts unpublished copy blocks and revokes checked-mount status', () => {
  const initial = disk({ '/source': contents(300), '/dest': [7] });
  const r = driver(initial);
  expect(r.read('/source')).toEqual(contents(300));
  const first = r.m.peek(6952), last = initial[243 + first]!;
  const corrupted = r.disk.read(last); corrupted[100] = 1; r.disk.write(last, corrupted);
  expect(r.copy('/source', '/dest')).toBe(-11);
  expect(r.m.peek(6960)).toBe(0); expect(r.m.peek(6927)).toBe(1);
  expect(r.read('/dest')).toEqual([7]);
});
