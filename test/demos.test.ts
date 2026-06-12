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
});
