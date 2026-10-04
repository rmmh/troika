import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P } from '../src/core/machine';
import { DISPLAY_CTRL, DISPLAY_TEXT, PALETTE_BASE, textEnabled, tribyteColorABGR } from '../src/core/display';
import { renderTextPixels } from '../src/core/textDisplay';
import { fromTribbles } from '../src/core/tryte';

function setup() {
  const m = new Machine();
  for (let p = 0; p < 27; p++) { m.poke(PALETTE_BASE + p * 2, -9841 + p); m.poke(PALETTE_BASE + p * 2 + 1, 9841 - p); }
  const out = new Uint32Array(162 * 162);
  const render = () => { renderTextPixels(out, m.mem, a => m.peek(a)); return out; };
  return { m, out, render };
}

describe('mode T character-ROM display', () => {
  test('native code latches text mode and writes ASCII cells without font data in guest RAM', () => {
    const r = setup(); expect(textEnabled(a => r.m.peek(a))).toBe(false);
    const image = assemble('W Z 0sDMT\nW -9841 65\nH 0sAAA Z');
    expect(image.diagnostics).toEqual([]);
    for (const c of image.chunks) c.data.forEach((v, i) => r.m.poke(c.addr + i, v));
    r.m.poke(REG_P, image.entry!); expect(r.m.run(1000)).toBe('sleep-forever');
    expect(DISPLAY_TEXT).toBe(fromTribbles('DMT')); expect(r.m.peek(DISPLAY_CTRL)).toBe(DISPLAY_TEXT);
    expect(textEnabled(a => r.m.peek(a))).toBe(true); const before = r.m.mem.slice(); r.render(); expect(r.m.mem).toEqual(before);
    const background = tribyteColorABGR(r.m.peek(PALETTE_BASE + 26));
    const foreground = tribyteColorABGR(r.m.peek(PALETTE_BASE + 27));
    const pattern = ['.###..', '#...#.', '#####.', '#...#.', '#...#.', '......'];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) expect(r.out[y * 162 + x]).toBe(pattern[y]![x] === '#' ? foreground : background);
  });
  test('every printable ASCII glyph except space has ink, with a blank sixth row and column', () => {
    const r = setup(); for (let code = 32; code <= 126; code++) r.m.poke(-9841 + code - 32, code); r.render();
    const fg = tribyteColorABGR(r.m.peek(PALETTE_BASE + 27));
    for (let code = 32; code <= 126; code++) {
      const cell = code - 32, left = (cell % 27) * 6, top = Math.floor(cell / 27) * 6;
      let ink = 0;
      for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
        const on = r.out[(top + y) * 162 + left + x] === fg;
        if (x === 5 || y === 5) expect(on, `ASCII ${code} spacing`).toBe(false);
        if (on) ink++;
      }
      expect(ink > 0, `ASCII ${code}`).toBe(code !== 32);
    }
  });
  test('signed attributes select all 27 palettes and cell codes are balanced low pairs', () => {
    const r = setup();
    for (let attr = -13; attr <= 13; attr++) r.m.poke(-9841 + attr + 13, attr * 729 + 65);
    r.render();
    for (let p = 0; p < 27; p++) {
      expect(r.out[p * 6]).toBe(tribyteColorABGR(r.m.peek(PALETTE_BASE + p * 2)));
      expect(r.out[p * 6 + 1]).toBe(tribyteColorABGR(r.m.peek(PALETTE_BASE + p * 2 + 1)));
    }
    for (const code of [-364, -1, 0, 31, 127, 144, 364]) {
      r.m.poke(-9841, -13 * 729 + code); r.render();
      for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) expect(r.out[y * 162 + x]).toBe(tribyteColorABGR(r.m.peek(PALETTE_BASE)));
    }
  });
  test('quadrant ROM glyphs fill four independent 3x3 blocks with no spacing gaps', () => {
    const r = setup();
    for (let pattern = 0; pattern < 16; pattern++) r.m.poke(-9841 + pattern, 3 * 729 + 128 + pattern);
    const before = r.m.mem.slice(); r.render(); expect(r.m.mem).toEqual(before);
    const background = tribyteColorABGR(r.m.peek(PALETTE_BASE + 32));
    const foreground = tribyteColorABGR(r.m.peek(PALETTE_BASE + 33));
    for (let pattern = 0; pattern < 16; pattern++) for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const bit = (y < 3 ? 0 : 2) + (x < 3 ? 0 : 1);
      expect(r.out[y * 162 + pattern * 6 + x]).toBe((pattern & (1 << bit)) ? foreground : background);
    }
  });
  test('last cell renders at bottom right and rendering never reads code pages after page zero', () => {
    const r = setup(); r.m.poke(-9113, 65);
    const guarded = new Proxy(r.m.mem, { get(target, key) {
      if (typeof key === 'string' && /^\d+$/.test(key)) { expect(Number(key)).toBeLessThan(729); return target[Number(key)]; }
      return Reflect.get(target, key);
    } });
    renderTextPixels(r.out, guarded, a => { expect(a).toBeGreaterThanOrEqual(PALETTE_BASE); expect(a).toBeLessThan(PALETTE_BASE + 54); return r.m.peek(a); });
    expect(r.out[156 * 162 + 157]).toBe(tribyteColorABGR(r.m.peek(PALETTE_BASE + 27)));
    expect(r.out[161 * 162 + 161]).toBe(tribyteColorABGR(r.m.peek(PALETTE_BASE + 26)));
  });
});
