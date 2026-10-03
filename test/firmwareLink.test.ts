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
