// Cycle-timing assertions for every row of the spec's operation timing chart.
// The model: 1 cycle per memory access (instruction fetches included), +8
// for Q, +1/skipped tryte for false predicates. Encoded register operands are
// free; memory accesses to register addresses are still memory accesses.

import { describe, expect, test } from 'vitest';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { CLOCK_HZ, fromTribbles } from '../src/core/tryte';

const ORG = fromTribbles('_AA');

function cyclesFor(prog: string, regs: Record<string, number> = {}, steps = 1): number {
  const m = new Machine();
  m.loadTribbles(prog, ORG);
  m.poke(REG_P, ORG);
  m.poke(REG_S, fromTribbles('_ZZ'));
  for (const [r, v] of Object.entries(regs)) m.poke(fromTribbles('__' + r), v);
  for (let i = 0; i < steps; i++) m.step();
  return m.cycles;
}

describe('operation timing chart', () => {
  test('clock constant', () => {
    expect(CLOCK_HZ).toBe(3 ** 12);
  });

  test('register-to-register: 1 cycle', () => {
    expect(cyclesFor('AAB')).toBe(1);
  });

  test('immediate mode: 2 cycles', () => {
    expect(cyclesFor('MA_' + '__N')).toBe(2);
  });

  test('memory mode: 3 cycles', () => {
    expect(cyclesFor('MAM' + 'PAA')).toBe(3);
  });

  test('offset mode reads like memory mode: 3 cycles', () => {
    expect(cyclesFor('MAO' + 'S_N')).toBe(3);
  });

  test('division: 9 cycles base + addressing overhead', () => {
    expect(cyclesFor('QAB', { A: 7, B: 2 })).toBe(9);
    expect(cyclesFor('QA_' + '__C', { A: 7 })).toBe(10);
  });

  test('DATABLAST: 3 cycles per tryte transferred', () => {
    expect(cyclesFor('DAB', { A: 100, B: 200 })).toBe(3);
  });

  test('Klear: 1 cycle setup + 1 per zero written', () => {
    expect(cyclesFor('KAB', { A: 500, B: 4 })).toBe(5);
  });

  test('NOP: 1 cycle', () => {
    expect(cyclesFor('___')).toBe(1);
  });

  test('subroutine call (CS_ form): 3 cycles', () => {
    expect(cyclesFor('CS_' + 'ABC')).toBe(3);
  });

  test('relative jump: 1 cycle', () => {
    expect(cyclesFor('J_N')).toBe(1);
  });

  test('predicate true: 1 cycle', () => {
    expect(cyclesFor('EAA')).toBe(1);
  });

  test('predicate false: 1 cycle per skipped tryte', () => {
    // NAA is false; skips the 2-tryte MA_ instruction: 1 (fetch) + 2 (skip).
    expect(cyclesFor('NAA' + 'MA_' + '__N')).toBe(3);
    // Skipping a 1-tryte instruction: 1 + 1.
    expect(cyclesFor('NAA' + 'AAB')).toBe(2);
    // Skipping a T instruction (operand + table trytes): 1 + 3? T A _ imm table = 3 trytes.
    expect(cyclesFor('NAA' + 'TA_' + '__N' + '__C')).toBe(4);
  });

  test('one-second deep sleep example sleeps 531414 cycles', () => {
    const m = new Machine();
    m.loadTribbles('HAB', ORG);
    m.poke(REG_P, ORG);
    m.poke(fromTribbles('__B'), -54);
    m.step(); // 1 fetch cycle, then asleep
    m.run(9841 * 54);
    expect(m.sleep).toBeNull();
    expect(m.cycles).toBe(1 + 9841 * 54);
    expect(m.read(REG_P)).toBe(ORG + 1);
  });

  test('run can report per-instruction cycle deltas', () => {
    const m = new Machine();
    m.loadTribbles('MA_' + '__N' + 'AAB', ORG);
    m.poke(REG_P, ORG);
    const samples: { pc: number; cycles: number }[] = [];
    m.run(3, undefined, (pc, cycles) => samples.push({ pc, cycles }));
    expect(samples).toEqual([
      { pc: ORG, cycles: 2 },
      { pc: ORG + 2, cycles: 1 },
    ]);
  });

  test('previewCyclesAt matches the interpreter step cost', () => {
    const m1 = new Machine();
    m1.loadTribbles('MA_', ORG);
    m1.poke(REG_P, ORG);
    expect(m1.previewCyclesAt(ORG)).toBe(2);

    const m2 = new Machine();
    m2.loadTribbles('AAB', ORG);
    m2.poke(REG_P, ORG);
    expect(m2.previewCyclesAt(ORG)).toBe(1);

    const m3 = new Machine();
    m3.loadTribbles('QAB', ORG);
    m3.poke(REG_P, ORG);
    m3.poke(fromTribbles('__A'), 7);
    m3.poke(fromTribbles('__B'), 2);
    expect(m3.previewCyclesAt(ORG)).toBe(9);
    expect(m3.cycles).toBe(0);
  });

  test('cycleBoundsAt reports both predicate outcomes', () => {
    const m = new Machine();
    m.loadTribbles('EAB' + 'MA_', ORG);
    m.poke(REG_P, ORG);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 1, max: 3 });
    expect(m.cycleBoundsAt(ORG + 1)).toEqual({ min: 2, max: 2 });
  });

  test('direct register predicates keep encoded register operands free', () => {
    const m = new Machine();
    m.loadTribbles('LXY' + 'MA_' + '__N', ORG);
    m.poke(REG_P, ORG);

    // Default X=0, Y=0 makes L false, so the exact current path includes the
    // two skipped trytes. The bounds still expose the true-path base cost.
    expect(m.previewCyclesAt(ORG)).toBe(3);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 1, max: 3 });

    m.poke(fromTribbles('__X'), -1);
    expect(m.previewCyclesAt(ORG)).toBe(1);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 1, max: 3 });
  });

  test('immediate predicate operands charge only the operand fetch', () => {
    const m = new Machine();
    m.loadTribbles('LX_' + '__P' + 'MA_' + '__N', ORG);
    m.poke(REG_P, ORG);

    expect(m.previewCyclesAt(ORG)).toBe(2);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 2, max: 4 });

    m.poke(fromTribbles('__X'), 3);
    expect(m.previewCyclesAt(ORG)).toBe(4);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 2, max: 4 });
  });

  test('cycleBoundsAt charges offset predicates for resolved memory access', () => {
    const m = new Machine();
    m.loadTribbles('LXO' + 'Y_C' + 'MA_' + '__N', ORG);
    m.poke(REG_P, ORG);

    expect(m.previewCyclesAt(ORG)).toBe(5);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 3, max: 5 });

    m.poke(fromTribbles('__X'), -500);
    expect(m.previewCyclesAt(ORG)).toBe(3);
    expect(m.cycleBoundsAt(ORG)).toEqual({ min: 3, max: 5 });
  });
});
