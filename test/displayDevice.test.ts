import { describe, expect, it } from 'vitest';
import { DisplayDevice } from '../src/core/displayDevice';
import { Machine } from '../src/core/machine';
import { REG_BG0_SCX, REG_PAD1, REG_PAD2, REG_SCANLINE, REG_SCANLINE_CMP } from '../src/core/display';

function fixture() {
  const m = new Machine();
  const d = new DisplayDevice((a) => m.peek(a), (a, v) => m.poke(a, v));
  m.attach(d);
  return { m, d };
}

describe('display timing and input', () => {
  it('begins each scanline at floor(729*k/10), including fractional frame boundaries', () => {
    const { m, d } = fixture();
    let cycle = 0;
    for (let line = 1; line <= 2430; line++) {
      const boundary = Math.floor(729 * line / 10);
      expect(d.nextEventCycles()).toBe(boundary - cycle);
      d.tick(boundary - cycle - 1, () => {});
      expect(m.inspect(REG_SCANLINE)).toBe((line - 1) % 243);
      d.tick(1, () => {});
      expect(m.inspect(REG_SCANLINE)).toBe(line % 243);
      cycle = boundary;
    }
    expect(cycle).toBe(177147);
  });

  it('latches gamepads and scroll before raising boundary interrupts', () => {
    const { m, d } = fixture();
    m.poke(REG_BG0_SCX, 42);
    m.poke(REG_SCANLINE_CMP, 1);
    d.setGamepadState(0, 6561);
    d.setGamepadState(1, -2187);
    expect(m.inspect(REG_PAD1)).toBe(0);
    const irqs: number[] = [];
    d.tick(72, (line) => {
      irqs.push(line);
      expect(m.inspect(REG_PAD1)).toBe(6561);
      expect(m.inspect(REG_PAD2)).toBe(-2187);
      expect(m.peek(REG_PAD1)).toBe(6561);
      expect(d.scroll.bg0x[1]).toBe(42);
    });
    expect(irqs).toEqual([2, 1]);
    d.setGamepadState(0, 0);
    d.tick(73, (line) => irqs.push(line));
    expect(m.inspect(REG_PAD1)).toBe(0);
    expect(irqs).toEqual([2, 1]); // release is not a press edge
  });

  it('raises vblank once per frame at the first non-visible scanline', () => {
    const { m, d } = fixture();
    let vblanks = 0;
    for (let frame = 0; frame < 3; frame++) {
      while (m.inspect(REG_SCANLINE) !== 161) d.tick(d.nextEventCycles(), () => {});
      d.tick(d.nextEventCycles(), (line) => { if (line === 0) vblanks++; });
      expect(m.inspect(REG_SCANLINE)).toBe(162);
    }
    expect(vblanks).toBe(3);
  });

  it('reset clears latched input, pending edges, and fractional timing', () => {
    const { m, d } = fixture();
    d.setGamepadState(0, 1);
    d.tick(100, () => {});
    d.setGamepadState(1, 1);
    d.reset();
    expect(m.inspect(REG_SCANLINE)).toBe(0);
    expect(m.peek(REG_SCANLINE)).toBe(0);
    expect(m.peek(REG_PAD1)).toBe(0);
    expect(m.inspect(REG_PAD2)).toBe(0);
    expect(d.nextEventCycles()).toBe(72);
    const irqs: number[] = [];
    d.tick(72, (line) => irqs.push(line));
    expect(irqs).toEqual([]);
  });
});
