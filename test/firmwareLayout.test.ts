import { describe, expect, test } from 'vitest';
import { CLIENT_LAYOUT, auditClientImage } from '../src/firmware/layout';
import { PALETTE_BASE, VRAM_BASE } from '../src/core/display';

describe('native client RAM contract', () => {
  test('covers exactly one machine, with the real display and MMIO addresses reserved', () => {
    let end = -9841;
    for (const region of CLIENT_LAYOUT) {
      expect(region.start).toBe(end);
      end += region.size;
    }
    expect(end).toBe(9842);
    expect(CLIENT_LAYOUT[0]).toMatchObject({ start: VRAM_BASE, size: 729 });
    const palette = CLIENT_LAYOUT.find(r => r.name === 'palette')!;
    expect(PALETTE_BASE).toBeGreaterThanOrEqual(palette.start);
    expect(PALETTE_BASE + 54).toBeLessThanOrEqual(palette.start + palette.size);
    expect(CLIENT_LAYOUT.find(r => r.name === 'mmio')).toMatchObject({ start: -364, size: 729 });
    expect(CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.')).reduce((sum, r) => sum + r.size, 0)).toBe(9477);
  });

  test('charges emitted zero cells, rejects collisions and requires explicit use of margin', () => {
    expect(auditClientImage([{ addr: -9112, data: [0, 1, 2] }]).used).toBe(3);
    expect(() => auditClientImage([{ addr: -3767, data: [0, 0] }])).toThrow('palette');
    expect(() => auditClientImage([{ addr: 364, data: [0] }])).toThrow('mmio');
    expect(() => auditClientImage([{ addr: 7007, data: [0] }])).toThrow('margin');
    expect(auditClientImage([{ addr: 7007, data: [0] }], ['margin']).used).toBe(1);
    expect(() => auditClientImage([{ addr: -9112, data: [0, 0] }, { addr: -9111, data: [0] }])).toThrow('overlapping');
    expect(() => auditClientImage([{ addr: 9841, data: [0, 0] }])).toThrow('boundary');
  });
});
