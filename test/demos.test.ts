import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { fromTribbles } from '../src/core/tryte';

function loadDemo(name: string): string {
  return readFileSync(join(import.meta.dirname, '..', 'demos', name), 'utf8');
}

/** Assemble src, load all chunks, run until sleep-forever or maxCycles. */
function runDemo(src: string, maxCycles = 100_000, expected_result = 'sleep-forever'): Machine {
  const r = assemble(src);
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);

  const m = new Machine();
  for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, r.chunks[0]!.addr);
  m.poke(REG_S, fromTribbles('_ZZ'));

  const result = m.run(maxCycles);
  expect(result, 'demo should halt with H Z Z').toBe(expected_result);
  return m;
}

const VRAM_BASE = fromTribbles('AAA'); // -9841
const ZZZ = 9841;

/** Address of display pixel at (row, col). */
function pixelAddr(row: number, col: number): number {
  return VRAM_BASE + row * 81 + col;
}

describe('demo programs', () => {
  test('strlen: "TEST" (4 non-zero trytes before first _ = 0) ends up in A', () => {
    const m = runDemo(loadDemo('strlen.asm'));
    expect(m.read(fromTribbles('__A'))).toBe(4);
  });

  test('gcd: gcd(27, 18) = 9 ends up in A and B', () => {
    const m = runDemo(loadDemo('gcd.asm'));
    expect(m.read(fromTribbles('__A'))).toBe(9);
    expect(m.read(fromTribbles('__B'))).toBe(9);
  });

  test('mandelbrot: just make sure it paints the first pixel (dark gray, escape at iter 1)', () => {
    const m = runDemo(loadDemo('mandelbrot.asm'), 5000, 'cycles');
    expect(m.read(fromTribbles('AAA'))).toBe(-9084);
  });

  // Infinite-running visual demos: verify they assemble cleanly and paint
  // at least one expected pixel within a bounded cycle budget.

  test('conway: paints first cell alive after one LCG step (state 758 > 0)', () => {
    // Init loop: ~12 cycles/iter; pixel(0,0) is painted ZZZ in the first iter.
    const m = runDemo(loadDemo('conway.asm'), 200, 'cycles');
    expect(m.read(pixelAddr(0, 0))).toBe(ZZZ);
  });

  test('maze: paints cell (0,0) white within one K-clear + first draw cycle', () => {
    // K-clear takes ~6564 cycles, then the first cell draw writes ZZZ to pixel(0,0).
    const m = runDemo(loadDemo('maze.asm'), 8000, 'cycles');
    expect(m.read(pixelAddr(0, 0))).toBe(ZZZ);
  });

  test('langton: paints center pixel white on the very first step', () => {
    // K-clear (~6564 cycles) then ant at (40,40) flips gray→ZZZ on step 1.
    // Stop at 6620 — after the first flip (6582→ZZZ) but before the second (6765→0).
    const m = runDemo(loadDemo('langton.asm'), 6620, 'cycles');
    expect(m.read(pixelAddr(40, 40))).toBe(ZZZ);
  });

  test('breakout: compiles and sets up the ball sprite', () => {
    // Runs long enough to pass initialization and verify the ball sprite Y position at -4009.
    const m = runDemo(loadDemo('breakout.asm'), 15000, 'cycles');
    expect(m.read(fromTribbles('IAA'))).toBe(100);
  });
});
