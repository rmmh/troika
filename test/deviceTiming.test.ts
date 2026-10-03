import { describe, expect, it } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, VEC_IRQ_BASE } from '../src/core/machine';
import { fromTribbles, fromTrits } from '../src/core/tryte';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_SCANLINE } from '../src/core/display';
import { SoundDevice } from '../src/core/soundDevice';
import { APU_CYCLES_PER_SAMPLE } from '../src/core/sound';

function program(source: string): Machine {
  const result = assemble(source);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const m = new Machine();
  for (const chunk of result.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
  m.poke(REG_P, result.chunks[0]!.addr);
  m.poke(fromTribbles('__A'), 200);
  m.poke(fromTribbles('__B'), 4);
  return m;
}

describe('shared CPU and device clock', () => {
  it.each([
    ['M A 83', 2],
    ['Q A B', 9],
    ['D A B', 3],
    ['K A B', 5],
    ['E A B\nM C 83', 3],
  ])('ticks all cycles consumed by %s', (source, expected) => {
    const m = program(source);
    let elapsed = 0;
    m.attach({ id: 3, tick: (cycles) => { elapsed += cycles; } });
    m.step();
    expect(m.cycles).toBe(expected);
    expect(elapsed).toBe(m.cycles);
  });

  it.each([false, true])('includes IRQ entry cycles for every device (sleeping: %s)', (sleeping) => {
    const m = program(sleeping ? 'H A Z' : 'Q A B');
    m.poke(VEC_IRQ_BASE, 1000);
    m.intMask = fromTrits('1TTTTTTTT');
    if (sleeping) {
      m.poke(fromTribbles('__A'), m.intMask);
      m.step();
    }
    const before = m.cycles;
    const seen = [0, 0];
    let fired = false;
    m.attach({ id: 2, tick: (cycles) => { seen[0]! += cycles; } });
    m.attach({ id: 3, tick: (cycles, irq) => {
      seen[1]! += cycles;
      if (!fired) { fired = true; irq(0); }
    } });
    m.step();
    expect(m.read(REG_P)).toBe(1000);
    expect(m.cycles - before).toBe(sleeping ? 3 : 11);
    expect(seen).toEqual([m.cycles - before, m.cycles - before]);
  });

  it('keeps display scanlines and APU samples synchronized during division-heavy code', () => {
    const m = program('loop: Q A B\nJ loop');
    const display = new DisplayDevice((a) => m.peek(a), (a, v) => m.poke(a, v));
    const sound = new SoundDevice((a) => m.peek(a), (a, v) => m.poke(a, v));
    m.attach(display);
    m.attach(sound);
    m.run(1000);
    expect(m.inspect(REG_SCANLINE)).toBe(Math.floor((m.cycles * 10 + 9) / 729) % 243);
    expect(sound.bufferedSamples).toBe(Math.floor(m.cycles / APU_CYCLES_PER_SAMPLE));
  });
});
