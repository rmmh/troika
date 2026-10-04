import { describe, expect, test } from 'vitest';
import { linkFirmware } from '../src/firmware/link';
import { REG_P } from '../src/core/machine';
import { FirmwareProbe } from './firmwareProbe';
import { CLIENT_LAYOUT } from '../src/firmware/layout';

describe('native firmware relocation', () => {
  test('places reservations across all three RAM extents and executes cross-region calls', () => {
    const linked = linkFirmware([
      { name: 'boot', source: 'J main' },
      { name: 'large', source: 'large_pad//5000\nanswer: M A 42\nO S P' },
      { name: 'medium', source: 'medium_pad//3000' },
      { name: 'small', source: 'small_pad//900' },
      { name: 'main', source: 'main: M S 5710\nC S answer\nH 0sAAA Z' },
    ]);
    expect(new Set(linked.modules.map(m => m.region)).size).toBe(3);
    expect(linked.reserved).toBeGreaterThan(8900);
    expect(linked.emitted).toBeLessThan(30);
    expect(linked.marginReserved).toBe(0);
    expect(linked.modules.find(m => m.name === 'boot')!.address).not.toBe(-9112);
    for (const module of linked.modules) {
      const region = CLIENT_LAYOUT.find(r => r.name === module.region)!;
      expect(module.address).toBeGreaterThanOrEqual(region.start);
      expect(module.address + module.reserved).toBeLessThanOrEqual(region.start + region.size);
    }
    const m = new FirmwareProbe(['mmio', 'native.stack']);
    for (const chunk of linked.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
    m.poke(REG_P, linked.image.entry!);
    expect(m.run(100)).toBe('sleep-forever');
    expect(m.peek(-13)).toBe(42);
  });

  test('requires explicit margin use and includes un-emitted buffers in the budget', () => {
    const modules = [
      { name: 'a', source: 'a_pad//5300' },
      { name: 'b', source: 'b_pad//3100' },
      { name: 'c', source: 'c_pad//1100' },
    ];
    expect(() => linkFirmware(modules)).toThrow('budget');
    const linked = linkFirmware(modules, { allowMargin: true });
    expect(linked.reserved).toBe(9500);
    expect(linked.emitted).toBe(0);
    expect(linked.marginReserved).toBe(1100);
  });

  test('reports fragmentation instead of silently crossing the palette or MMIO', () => {
    expect(() => linkFirmware([{ name: 'oversized', source: 'padding//6000' }])).toThrow('contiguous');
  });

  test('rejects fixed origins, unresolved includes, label collisions and undefined targets', () => {
    expect(() => linkFirmware([{ name: 'fixed', source: '@100\n___' }])).toThrow('fixed origins');
    expect(() => linkFirmware([{ name: 'include', source: '#include "other.asm"' }])).toThrow('resolve includes');
    expect(() => linkFirmware([{ name: 'collision', source: 'firmware_link_begin_0: ___' }])).toThrow('reserved linker');
    expect(() => linkFirmware([{ name: 'missing', source: 'J nowhere' }])).toThrow('undefined');
  });
});

test('backtracks when greedy placement strands a module despite an exact fit', () => {
  // Greedy puts 3258 in the 3267-cell extent, stranding 1267 after allocating
  // 2169 and 2000 in the 5427-cell extent. Swapping the partition fills both.
  const sizes = [3258, 2835, 2169, 2000, 1267, 972];
  const linked = linkFirmware(sizes.map((size, i) => ({ name: `part${i}`, source: '0 '.repeat(size) })), { allowMargin: true });
  expect(linked.emitted).toBe(12501); expect(linked.reserved).toBe(12501);
  expect(linked.marginReserved).toBe(2835);
  expect(linked.modules[0]!.region).toBe('resident.low');
  expect(linked.modules[2]!.region).toBe('resident.low');
  expect(linked.modules[3]!.region).toBe('resident.middle');
  expect(linked.modules[4]!.region).toBe('resident.middle');
});

test('executes in reclaimed text-mode RAM on both sides of the live palette', () => {
  const linked = linkFirmware([
    { name: 'boot', source: 'M S 5710 C S low_code C S middle_code H 0sAAA Z' },
    { name: 'low', source: 'low_padding//5346\nlow_code: M A 11 O S P' },
    { name: 'middle', source: 'middle_code: I A 1 O S P\nmiddle_padding//3200' },
  ]);
  expect(linked.image.labels.get('low_code')).toBe(-3766);
  expect(linked.image.labels.get('middle_code')).toBe(-3631);
  const m = new FirmwareProbe(['mmio', 'native.stack']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  const palette = Array.from({ length: 54 }, (_, i) => i - 27);
  palette.forEach((v, i) => m.poke(-3685 + i, v));
  m.poke(REG_P, linked.image.entry!);
  expect(m.run(1000)).toBe('sleep-forever'); expect(m.peek(-13)).toBe(12);
  expect(Array.from({ length: 54 }, (_, i) => m.peek(-3685 + i))).toEqual(palette);
});


test('program linking respects a protected core and rejects overlapping or non-code extents', () => {
  const linked = linkFirmware([{name:'app',source:'entry: C S kernel H 0sAAA Z'}], {
    regions:[{start:365,size:972}], externals:{kernel:-3631},
  });
  expect(linked.modules[0]!.address).toBeGreaterThanOrEqual(365);
  expect(linked.modules[0]!.address + linked.modules[0]!.reserved).toBeLessThanOrEqual(1337);
  expect(linked.image.labels.get('kernel')).toBe(-3631);
  expect(() => linkFirmware([{name:'app',source:'H 0sAAA Z'}], {regions:[{start:365,size:100},{start:400,size:100}]})).toThrow('overlapping');
  expect(() => linkFirmware([{name:'app',source:'H 0sAAA Z'}], {regions:[{start:1337,size:100}]})).toThrow('extent');
  expect(() => linkFirmware([{name:'app',source:'J kernel'}], {regions:[{start:365,size:100}],externals:{kernel:400}})).toThrow('external');
});
