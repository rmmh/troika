import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { encodeText } from '../src/core/textEncoding';
import { FirmwareProbe } from './firmwareProbe';

const built = linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','fatAppend'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'test', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check J done
append: M A 5954 R B 2210 M C 1337 R D 2211 C S fs_append J done
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
    append(source: string, suffix: number[]) { path(source, 5954, 2210); suffix.forEach((v,i)=>m.poke(1337+i,v));m.poke(2211,suffix.length);return run('append'); },
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

test.each([0,1,182,183,184,242,243,244,486,1200,9721])('streaming atomic append preserves old bytes and block geometry, length=%i',length=>{
  const old=contents(length), suffix=contents(60),r=driver(disk({'/page':old},108));
  expect(r.append('/page',suffix)).toBe(0);expect(r.read('/page')).toEqual([...old,...suffix]);
  expect(r.run('check')).toBe(0);expect(r.m.peek(2201)).toBe(0);
});
test('maximum suffix spans one new block; invalid calls leave disk unchanged',()=>{
  const initial=disk({'/page':contents(242),'/box/file':[]});
  const r=driver(initial);expect(r.append('/page',contents(243))).toBe(0);expect(r.read('/page')).toEqual([...contents(242),...contents(243)]);
  for(const [path,suffix,error] of [['/missing',[1],-12],['/box',[1],-14],['/page',[],-22],['/page',contents(244),-22]] as const){
    const d=driver(initial);expect(d.append(path,[...suffix])).toBe(error);expect(d.disk.image()).toEqual(initial);expect(d.m.peek(6960)).toBe(0);
  }
});
test('every append publication boundary exposes the complete old or new file after cold boot',()=>{
  const old=contents(500),suffix=contents(60),initial=disk({'/page':old},27),r=driver(initial);
  expect(r.append('/page',suffix)).toBe(0);expect(r.disk.commits.length).toBeGreaterThan(6);
  let published=false;
  for(const image of [initial,...r.disk.commits]){
    const cold=driver(image),got=cold.read('/page');if(got.length===560)published=true;
    expect(got).toEqual(published?[...old,...suffix]:old);
    expect(cold.run('reclaim')).toBe(0);expect(cold.run('check')).toBe(0);expect(cold.m.peek(2201)).toBe(0);
  }
},30_000);
test('full/read-only media and corrupted tail padding cannot publish a partial append',()=>{
  const old=contents(8*243),full=disk({'/page':old,'/fill':contents(6*243)},27);
  for(const [image,readOnly,error] of [[full,false,-18],[disk({'/page':old}),true,-4]] as const){
    const r=driver(image,readOnly);expect(r.append('/page',[1])).toBe(error);expect(r.m.peek(6960)).toBe(0);
    expect(driver(r.disk.image()).read('/page')).toEqual(old);
  }
  const r=driver(disk({'/page':contents(300)}));r.read('/page');
  const first=r.m.peek(6952),last=r.disk.image()[243+first]!,block=r.disk.read(last);block[100]=1;r.disk.write(last,block);
  expect(r.append('/page',[1])).toBe(-11);expect(r.m.peek(6960)).toBe(0);expect(r.m.peek(6927)).toBe(1);
});
