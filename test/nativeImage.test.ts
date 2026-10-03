import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildNativeImage } from '../src/firmware/nativeImage';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { fromTribbles, norm } from '../src/core/tryte';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { FirmwareProbe } from './firmwareProbe';
const capacity = 1906;
const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'image'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
const built = linkFirmware([{ name: 'config', source: `$image_capacity: ${capacity}` }, ...modules,
  { name: 'slot', source: `image_slot//${capacity}` }, { name: 'app', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check J done
load: M A 5954 R B 2201 C S image_load J done
call: R A 2202 C S image_call J done
service: M A 5954 M B 2 C S image_load W 2207 A M A Z C S image_call W 2208 A O S P
resident_answer: M A 99 O S P
done: W 2200 A H 0sAAA Z` }]);
const slot = built.image.labels.get('image_slot')!;
function code(source = 'M A 42 O S P', length?: number) {
  const content = buildNativeImage({ source, base: slot, capacity }).file.slice(4);
  return length === undefined ? content : content.concat(Array(Math.max(0, length - content.length)).fill(0));
}
function file(payload: number[], count = payload.length, checksum = payload.reduce((a, b) => norm(a + b), 0)) {
  return [fromTribbles('IMG'), 1, count, checksum, ...payload];
}
function loader(files: Record<string, number[]>) {
  class Probe extends FirmwareProbe {
    override write(address: number, value: number) {
      const region = CLIENT_LAYOUT.find(r => address >= r.start && address < r.start + r.size);
      if (region?.name.startsWith('resident.') && (address < slot || address >= slot + capacity)) throw new Error('loader overwrote resident code');
      super.write(address, value);
    }
  }
  const m = new Probe(['mmio', 'filesystem', 'native.stack', 'url.state', 'network.state', 'resident.low', 'resident.middle', 'resident.high']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  const medium = new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files }));
  const disk = new BlockDevice([medium]); m.attach(disk);
  const asleep = () => m.sleep?.remaining === Infinity;
  function execute(label: string, hook?: () => void) {
    m.poke(REG_P, built.image.labels.get(label)!); m.sleep = null;
    if (hook) { const end = m.cycles + 5_000_000; while (m.cycles < end && !asleep()) { hook(); m.step(); } expect(asleep()).toBe(true); }
    else expect(m.run(5_000_000)).toBe('sleep-forever');
    expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(48); return m.peek(2200);
  }
  expect(execute('entry')).toBe(0);
  function load(path = '/a', hook?: () => void) { encodeText(path).forEach((v, i) => m.poke(5954 + i, v)); m.poke(2201, path.length); return execute('load', hook); }
  function call(offset = 0) { m.poke(2202, offset); return execute('call'); }
  return { m, disk, medium, execute, load, call };
}
test.each([3, 239, 240, 243, 500, 729, 1906])('native disk loader validates and executes a %i-cell image', length => {
  const payload = code('M A 42 O S P', length), r = loader({ '/a': file(payload) });
  expect(r.call()).toBe(-118); expect(r.load()).toBe(0); expect(r.m.peek(2487)).toBe(1); expect(r.m.peek(6960)).toBe(0);
  expect(Array.from({ length: payload.length }, (_, i) => r.m.peek(slot + i))).toEqual(payload); expect(r.call()).toBe(42);
  expect(r.m.peek(2488)).toBe(0); expect(r.call(-1)).toBe(-118); expect(r.call(payload.length)).toBe(-118);
});
test('a shorter replacement runs new code and clears the previous image tail', () => {
  const r = loader({ '/a': file(code('M A 41 O S P', 500)), '/b': file(code('M A 73 O S P')) });
  expect(r.load()).toBe(0); expect(r.call()).toBe(41); expect(r.load('/b')).toBe(0); expect(r.call()).toBe(73);
  expect(Array.from({ length: capacity - code().length }, (_, i) => r.m.peek(slot + code().length + i))).toEqual(Array(capacity - code().length).fill(0));
});
test.each([
  [], [fromTribbles('IMG'), 1, 3], [0, 1, 3, 0, 0, 0, 0],
  [fromTribbles('IMG'), 2, 1, 0, 0], file([], 0), file([1], -1),
  file([1], capacity + 1), file([1], 2), file([1, 2], 1), file([1, 2], 2, 0),
].map(contents => [contents]))('rejects invalid header, length, checksum or truncation: %j', contents => {
  const r = loader({ '/a': file(code()), '/b': contents }); expect(r.load()).toBe(0); expect(r.call()).toBe(42);
  expect(r.load('/b')).toBe(-116); expect(r.call()).toBe(-118); expect(r.m.peek(2487)).toBe(0); expect(r.m.peek(2488)).toBe(0); expect(r.m.peek(6960)).toBe(0);
});
test('wrapping checksum covers signed code cells across block boundaries', () => {
  const payload = code('M A -9841 O S P', 500); payload[300] = 9841; payload[301] = 9841;
  const r = loader({ '/a': file(payload) }); expect(r.load()).toBe(0); expect(r.call()).toBe(-9841);
});
test('missing files invalidate old entrypoints without claiming a successful replacement', () => {
  const r = loader({ '/a': file(code()) }); expect(r.load()).toBe(0); expect(r.load('/missing')).toBe(-12); expect(r.call()).toBe(-118);
});
test('an active image cannot recursively call or replace itself', () => {
  const recursive = code(`M A Z C S ${built.image.labels.get('image_call')} O S P`);
  const replace = code(`M A 5954 M B 2 C S ${built.image.labels.get('image_load')} O S P`);
  const r = loader({ '/a': file(recursive), '/b': file(replace) });
  expect(r.load()).toBe(0); expect(r.call()).toBe(-117); expect(r.m.peek(2487)).toBe(1);
  expect(r.load('/b')).toBe(0); expect(r.call()).toBe(-117); expect(r.m.peek(2487)).toBe(1);
});
test('disk service callbacks cannot load or execute a partial image', () => {
  const r = loader({ '/a': file(code('M A 42 O S P', 500)) }); r.m.poke(2485, built.image.labels.get('service')!);
  expect(r.load()).toBe(0); expect(r.m.peek(2207)).toBe(-117); expect(r.m.peek(2208)).toBe(-117); expect(r.call()).toBe(42);
});
test('media removal during replacement leaves the partial slot uncallable and releases the handle', () => {
  const r = loader({ '/a': file(code('M A 42 O S P', 500)) }); let removed = false;
  const status = r.load('/a', () => { if (!removed && r.m.peek(2490) > 0) { removed = true; r.disk.setMedium(0); } });
  expect(removed).toBe(true); expect(status).toBeLessThan(0); expect(r.call()).toBe(-118); expect(r.m.peek(6960)).toBe(0); expect(r.m.peek(2488)).toBe(0);
});
test('busy filesystems and unchecked mounts are rejected before invalidating a loaded image', () => {
  const r = loader({ '/a': file(code()) }); expect(r.load()).toBe(0);
  r.m.poke(6960, 1); expect(r.load()).toBe(-117); expect(r.m.peek(2487)).toBe(1); r.m.poke(6960, 0);
  r.m.poke(6927, 1); expect(r.load()).toBe(-17); expect(r.m.peek(2487)).toBe(1); expect(r.call()).toBe(42);
});

test('a build-time image artifact calls a linked resident routine after native disk loading', () => {
  const artifact = buildNativeImage({ source: 'C S answer O S P', base: slot, capacity,
    externals: { answer: built.image.labels.get('resident_answer')! } });
  const r = loader({ '/a': artifact.file }); expect(r.load()).toBe(0); expect(r.call()).toBe(99);
});
