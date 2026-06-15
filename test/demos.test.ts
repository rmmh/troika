import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { TextDevice } from '../src/core/textDevice';
import { fromTribbles, fromTrits } from '../src/core/tryte';
import { DISPLAY_BITMAP, DISPLAY_CTRL } from '../src/core/display';
import { DisplayDevice } from '../src/core/displayDevice';

function loadDemo(name: string): string {
  return readFileSync(join(import.meta.dirname, '..', 'demos', name), 'utf8');
}

function demoInclude(path: string, from?: string): string | undefined {
  const base = from ? dirname(resolve(import.meta.dirname, '..', 'demos', from)) : resolve(import.meta.dirname, '..', 'demos');
  try {
    return readFileSync(resolve(base, path), 'utf8');
  } catch {
    return undefined;
  }
}

/** Assemble src, load all chunks, run until sleep-forever or maxCycles. */
function runDemo(src: string, maxCycles = 100_000, expected_result = 'sleep-forever'): Machine {
  const r = assemble(src, { includeResolver: demoInclude, filename: 'demo.asm' });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  expect(r.diagnostics.filter((d) => d.severity === 'warning'), JSON.stringify(r.diagnostics)).toEqual([]);

  const m = new Machine();
  for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, r.chunks[0]!.addr);
  m.poke(REG_S, fromTribbles('_ZZ'));

  const result = m.run(maxCycles);
  expect(result, 'demo should halt with H Z Z').toBe(expected_result);
  return m;
}

function runDemoWithDisplay(src: string, maxCycles = 100_000, expected_result = 'cycles'): Machine {
  const r = assemble(src, { includeResolver: demoInclude, filename: 'demo.asm' });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  expect(r.diagnostics.filter((d) => d.severity === 'warning'), JSON.stringify(r.diagnostics)).toEqual([]);

  const m = new Machine();
  const display = new DisplayDevice(
    (addr) => m.peek(addr),
    (addr, v) => m.poke(addr, v),
  );
  m.attach(display);
  for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, r.chunks[0]!.addr);
  m.poke(REG_S, fromTribbles('_ZZ'));

  const result = m.run(maxCycles);
  expect(result).toBe(expected_result);
  return m;
}

function runTextDemo(src: string, input: string, maxCycles = 100_000): { machine: Machine; text: TextDevice } {
  const r = assemble(src, { includeResolver: demoInclude, filename: 'demo.asm' });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  expect(r.diagnostics.filter((d) => d.severity === 'warning'), JSON.stringify(r.diagnostics)).toEqual([]);

  const m = new Machine();
  const text = new TextDevice();
  m.attach(text);
  for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, r.chunks[0]!.addr);
  m.poke(REG_S, fromTribbles('_ZZ'));
  text.queueText(input);

  const result = m.run(maxCycles);
  expect(result, 'demo should halt after console input').toBe('sleep-forever');
  return { machine: m, text };
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

  test('strcpy: copies through the null terminator and returns destination in A', () => {
    const m = runDemo(loadDemo('strcpy.asm'));
    expect(m.read(fromTribbles('__A'))).toBe(440);
    for (let i = 0; i < 5; i++) expect(m.read(440 + i)).toBe(m.read(400 + i));
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

  test('conway: reaches first generation copy loop within cycle budget', () => {
    const r = assemble(loadDemo('conway.asm'), { includeResolver: demoInclude, filename: 'demo.asm' });
    const errors = r.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, JSON.stringify(errors)).toEqual([]);
    expect(r.diagnostics.filter((d) => d.severity === 'warning'), JSON.stringify(r.diagnostics)).toEqual([]);

    const cploop = r.labels.get('cploop');
    expect(cploop).toBeDefined();

    const m = new Machine();
    for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    m.poke(REG_P, r.chunks[0]!.addr);
    m.poke(REG_S, fromTribbles('_ZZ'));

    const result = m.run(370_000, new Set([cploop!]));
    expect(result).toBe('breakpoint');
    expect(m.read(REG_P)).toBe(cploop);
    expect(m.cycles).toBeLessThan(370_000);
  });

  test('maze: enters hi-res bitmap mode and marks the top-left entry pixel', () => {
    // The first 3x3 maze solves quickly, so the entry pixel is already green (trit T).
    const m = runDemo(loadDemo('maze-complex.asm'), 8000, 'cycles');
    expect(m.read(DISPLAY_CTRL)).toBe(DISPLAY_BITMAP);
    expect(m.read(fromTribbles('AAA') + 78 * 18 + 8)).toBe(fromTrits('0000000T0'));
  });

  test('maze: simple raw demo paints cell (0,0) white', () => {
    const m = runDemo(loadDemo('maze.asm'), 8000, 'cycles');
    expect(m.read(DISPLAY_CTRL)).toBe(fromTribbles('DPN'));
    expect(m.read(pixelAddr(0, 0))).toBe(ZZZ);
  });

  test('maze: keeps running without corrupting the mode latch', () => {
    const m = runDemo(loadDemo('maze-complex.asm'), 2_000_000, 'cycles');
    expect(m.read(DISPLAY_CTRL)).toBe(DISPLAY_BITMAP);
    expect(m.read(fromTribbles('AAA') + 78 * 18 + 8)).not.toBe(0);
  });

  test('maze: ignores display interrupts during animation sleeps', () => {
    const m = runDemoWithDisplay(loadDemo('maze-complex.asm'), 2_000_000);
    expect(m.read(DISPLAY_CTRL)).toBe(DISPLAY_BITMAP);
    const pc = m.read(REG_P);
    expect(pc < -13 || pc > 13).toBe(true);
  });

  test('langton: paints center pixel white on the very first step', () => {
    // K-clear (~6564 cycles) then ant at (40,40) flips gray→ZZZ on step 1.
    // Stop at 6620 — after the first flip (6582→ZZZ) but before the second (6765→0).
    const m = runDemo(loadDemo('langton.asm'), 6620, 'cycles');
    expect(m.read(pixelAddr(40, 40))).toBe(ZZZ);
  });

  test('breakout: compiles and sets up the ball sprite', () => {
    // Runs long enough to pass initialization and verify the ball sprite Y position at -4009.
    const m = runDemo(loadDemo('breakout.asm'), 15000, 'sleep-forever');
    expect(m.read(fromTribbles('IAA'))).toBe(100);
  });

  test('microcorruption tutorial: valid password unlocks', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-tutorial.asm'), 'password\n');
    expect(text.isUnlocked()).toBe(true);
    expect(text.outputText()).toContain('Access Granted!');
  });

  test('microcorruption new orleans: valid password unlocks', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-new-orleans.asm'), '<H+Olp#\n');
    expect(text.isUnlocked()).toBe(true);
    expect(text.outputText()).toContain('Access Granted!');
  });

  test('microcorruption sydney: real compare path unlocks', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-sydney.asm'), '8z-WMg=_\n');
    expect(text.isUnlocked()).toBe(true);
    expect(text.outputText()).toContain('Access Granted!');
  });

  test('microcorruption hanoi: valid password unlocks', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-hanoi.asm'), '01234567\n');
    expect(text.isUnlocked()).toBe(true);
    expect(text.outputText()).toContain('Access granted.');
  });

  test('microcorruption cusco: valid password unlocks', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-cusco.asm'), '01234567\n');
    expect(text.isUnlocked()).toBe(true);
    expect(text.outputText()).toContain('Access granted.');
  });

  test('microcorruption reykjavik: printable password unlocks', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-reykjavik.asm'), '87a7\n');
    expect(text.isUnlocked()).toBe(true);
    expect(text.outputText()).toContain("what's the password?");
  });

  test('microcorruption reykjavik: invalid password is rejected', () => {
    const { text } = runTextDemo(loadDemo('microcorruption-reykjavik.asm'), 'AAAA\n');
    expect(text.isUnlocked()).toBe(false);
    expect(text.outputText()).toContain('Invalid password; try again.');
  });
});
