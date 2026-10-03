import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const linked = linkFirmware(['block','fat','fatCheck','fatWrite','fatSpace'].map(name=>({name,source:readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8')})).concat([{name:'app',source:`
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check J done
space: C S fs_space W 2201 B W 2202 C
done: W 2200 A H 0sAAA Z`} ]));
function driver(blocks:number, readOnly=false, full=false) {
  const initial=createDiskImage({blocks,volumeId:[0,0,1],files:{'/docs/a':Array(244).fill(1),'/empty':[],...(full?{'/fill':Array((blocks-Math.ceil(blocks/243)-13)*243).fill(1)}:{})}});
  const disk=new BlockMedium(blocks,readOnly,initial);
  let reads=0;
  const read=disk.read.bind(disk);
  disk.read=block=>{reads++;return read(block);};
  const m=new FirmwareProbe(['mmio','native.stack','filesystem','network.state','forth.state']);
  for(const c of linked.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));
  m.attach(new BlockDevice([disk]));
  function run(label:string) {m.sleep=null;m.poke(REG_P,linked.image.labels.get(label)!);expect(m.run(100_000_000)).toBe('sleep-forever');expect(m.peek(REG_S)).toBe(5710);return m.peek(2200);}
  expect(run('entry')).toBe(0);return{m,disk,initial,run,bootReads:reads};
}
test.each([27,243,244,729,9841])('native space accounting scans %i blocks without changing the disk or FAT cache',blocks=>{
  const r=driver(blocks,true);const cache=Array.from({length:244},(_,i)=>r.m.peek(i===243?6938:6683+i));
  // Sparse capacity must not trigger a directory-tree walk for every empty batch.
  expect(r.bootReads).toBeLessThan(500);
  expect(r.run('space')).toBe(0);
  expect(r.m.peek(2201)).toBe(blocks-Math.ceil(blocks/243)-10-3);
  expect(r.m.peek(2202)).toBe(blocks);expect(r.m.peek(6960)).toBe(0);
  expect(Array.from({length:244},(_,i)=>r.m.peek(i===243?6938:6683+i))).toEqual(cache);
  expect(r.disk.image()).toEqual(r.initial);
});
test('space accounting rejects unchecked mounts, open handles and callback reentry',()=>{
  const r=driver(27);
  r.m.poke(6927,1);expect(r.run('space')).toBe(-17);r.m.poke(6927,2);
  for(const kind of [1,2,3]) {r.m.poke(6960,kind);expect(r.run('space')).toBe(-1);expect(r.m.peek(6960)).toBe(kind);}
  r.m.poke(6960,0);r.m.poke(2486,1);expect(r.run('space')).toBe(-1);
  expect(r.disk.image()).toEqual(r.initial);
});

test('a completely allocated medium reports zero free blocks',()=>{
  const r=driver(81,false,true);expect(r.run('space')).toBe(0);expect(r.m.peek(2201)).toBe(0);expect(r.m.peek(2202)).toBe(81);
});
