import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { encodeText } from '../src/core/textEncoding';
import { FirmwareProbe } from './firmwareProbe';

const built = linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','fatRename'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'test', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check W 2202 B J done
rename: M A 5954 R B 2210 M C 6130 R D 2211 C S fs_rename J done
lookup: M A 5954 R B 2210 C S fs_lookup J done
read: C S fs_open N A Z J done C S fs_read_next W 2201 B U S A C S fs_close O S A J done
done: W 2200 A H 0sAAA Z` }]));
class TracedMedium extends BlockMedium {
  writes: number[] = [];
  override write(block: number, cells: Int16Array) { super.write(block, cells); this.writes.push(block); }
}
function driver(image: Int16Array, readOnly = false) {
  const m = new FirmwareProbe(['mmio','filesystem','native.stack','network.state','forth.state','page.script']);
  for (const chunk of built.image.chunks) chunk.data.forEach((cell, i) => m.poke(chunk.addr + i, cell));
  const medium = new TracedMedium(image.length / 243, readOnly, image); m.attach(new BlockDevice([medium]));
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(50_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(30); return m.peek(2200);
  }
  function path(text: string, address: number, length: number) { encodeText(text).forEach((cell, i) => m.poke(address + i, cell)); m.poke(length, text.length); }
  expect(run('entry')).toBe(0); expect(m.peek(2202)).toBe(0);
  return { m, medium, run,
    rename(from: string, to: string) { path(from, 5954, 2210); path(to, 6130, 2211); return run('rename'); },
    lookup(value: string) { path(value, 5954, 2210); return run('lookup'); },
  };
}
const disk = (files: Record<string, number[]>, blocks = 27) => createDiskImage({ blocks, volumeId: [0,0,1], files });

test('rename on a full volume changes exactly one directory block and preserves the file chain', () => {
  const initial = disk({ '/longname': Array.from({ length: 16 * 243 }, (_, i) => i % 2 ? -9841 : 9841) });
  const r = driver(initial); expect(r.lookup('/longname')).toBe(0);
  const chain = [r.m.peek(6952), r.m.peek(6953), r.m.peek(6954)];
  expect(r.rename('/longname', 'x')).toBe(0); expect(r.medium.writes).toEqual([2]);
  const after = r.medium.image();
  for (let block = 0; block < 27; block++) if (block !== 2) expect(after.slice(block * 243, (block + 1) * 243)).toEqual(initial.slice(block * 243, (block + 1) * 243));
  const cold = driver(after); expect(cold.lookup('/longname')).toBe(-12); expect(cold.lookup('/x')).toBe(0);
  expect([cold.m.peek(6952), cold.m.peek(6953), cold.m.peek(6954)]).toEqual(chain);
  expect(cold.run('read')).toBe(0); expect(cold.m.peek(2201)).toBe(243);
  expect(cold.m.peek(6440)).toBe(9841); expect(cold.m.peek(6441)).toBe(-9841);
  expect(driver(initial).lookup('/longname')).toBe(0); // Before the single atomic commit.
});
test('renaming a nonempty directory preserves all children and their data', () => {
  const r = driver(disk({ '/box/old/sub/file': [-9841, 0, 9841], '/box/other': [] }));
  expect(r.rename('/box/old', 'new')).toBe(0); expect(r.medium.writes).toHaveLength(1);
  const cold = driver(r.medium.image());
  expect(cold.lookup('/box/old')).toBe(-12); expect(cold.lookup('/box/new/sub/file')).toBe(0);
  expect(cold.run('read')).toBe(0); expect(cold.m.peek(2201)).toBe(3);
  expect([cold.m.peek(6440), cold.m.peek(6441), cold.m.peek(6442)]).toEqual([-9841,0,9841]);
});
test('invalid names, root, missing source and existing destinations leave the medium untouched', () => {
  const initial = disk({ '/source': [1], '/existing': [2], '/dir/child': [] });
  const r = driver(initial);
  for (const [from, to, status] of [['/source','existing',-20], ['/source','source',-20], ['/source','dir',-20],
    ['/missing','new',-12], ['/','root',-15], ['/source','',-15], ['/source','.',-15], ['/source','..',-15],
    ['/source','other/name',-15], ['/source','/new',-15], ['/source','a'.repeat(19),-15], ['/source','bad name',-15]] as const) {
    expect(r.rename(from, to), `${from} -> ${to}`).toBe(status);
    expect(r.medium.image()).toEqual(initial); expect(r.m.peek(6960)).toBe(0);
  }
});
test('read-only rename preserves the old name and invalidates the mount on write failure', () => {
  const initial = disk({ '/source': [1] }), r = driver(initial, true);
  expect(r.rename('/source', 'new')).toBe(-4); expect(r.m.peek(6927)).toBe(0);
  expect(r.medium.image()).toEqual(initial); expect(r.medium.writes).toHaveLength(0);
  const cold = driver(r.medium.image()); expect(cold.lookup('/source')).toBe(0); expect(cold.lookup('/new')).toBe(-12);
});

test('a full root directory can rename an empty file to an eighteen-cell basename', () => {
  const r = driver(disk(Object.fromEntries(Array.from({ length: 81 }, (_, i) => [`/f${i}`, []]))));
  const name = 'a'.repeat(18);
  expect(r.rename('/f0', name)).toBe(0); expect(r.medium.writes).toHaveLength(1);
  const cold = driver(r.medium.image()); expect(cold.lookup('/f0')).toBe(-12); expect(cold.lookup('/' + name)).toBe(0);
  expect(cold.m.peek(6953)).toBe(0); expect(cold.lookup('/f80')).toBe(0);
});
