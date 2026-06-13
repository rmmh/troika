// Tests for the opcodes sim.py never implemented: Q, X, D, K, F, H, plus
// trap/interrupt dispatch.

import { describe, expect, test } from 'vitest';
import {
  Machine,
  REG_P,
  VEC_DIV0,
  VEC_IRQ_BASE,
  VEC_RETURN,
  divRound,
  fShift,
} from '../src/core/machine';
import { fromTribbles, fromTrits, norm } from '../src/core/tryte';
import { runTest } from './machine.test';

const ORG = fromTribbles('_AA');

function prep(prog: string, regs: Record<string, number> = {}): Machine {
  const m = new Machine();
  m.loadTribbles(prog, ORG);
  m.poke(REG_P, ORG);
  for (const [r, v] of Object.entries(regs)) m.poke(fromTribbles('__' + r), v);
  return m;
}

describe('Q quotient', () => {
  test('divRound rounds to nearest, ties toward zero', () => {
    const cases: [number, number, number][] = [
      [6, 2, 3],
      [7, 3, 2],
      [8, 3, 3],
      [2, 3, 1],
      [1, 3, 0],
      [3, 2, 1], // tie -> toward zero
      [-3, 2, -1],
      [3, -2, -1],
      [-3, -2, 1],
      [9, 2, 4], // 4.5 -> 4
      [11, 2, 5], // 5.5 -> 5
    ];
    for (const [a, b, q] of cases) expect(divRound(a, b), `${a}/${b}`).toBe(q);
  });

  test('QAB divides registers', () => {
    runTest('QAB', [7, 2], [3]);
    runTest('QAB', [-7, 2], [-3]);
  });

  test('division by zero traps through _OA', () => {
    const m = prep('QAB', { A: 7, B: 0 });
    m.poke(VEC_DIV0, 1000);
    m.step();
    expect(m.read(REG_P)).toBe(1000);
    expect(m.read(VEC_RETURN)).toBe(ORG + 1);
    expect(m.read(fromTribbles('__A'))).toBe(7); // destination unmodified
  });
});

describe('X exchange', () => {
  test('register-register', () => {
    runTest('XAB', [1, 2], [2, 1]);
  });

  test('register-memory', () => {
    const m = prep('XAM' + 'PAA', { A: 5 });
    m.poke(fromTribbles('PAA'), 9);
    m.step();
    expect(m.read(fromTribbles('__A'))).toBe(9);
    expect(m.read(fromTribbles('PAA'))).toBe(5);
  });

  test('immediate side discards its write', () => {
    const m = prep('XA_' + '__C', { A: 5 });
    m.step();
    expect(m.read(fromTribbles('__A'))).toBe(-11); // C tribble = -11
  });
});

describe('D datablast', () => {
  test('copies one tryte and increments both pointers', () => {
    const m = prep('DAB', { A: 100, B: 200 });
    m.poke(200, 42);
    m.step();
    expect(m.read(100)).toBe(42);
    expect(m.read(fromTribbles('__A'))).toBe(101);
    expect(m.read(fromTribbles('__B'))).toBe(201);
  });

  test("'_' operand uses register _ without incrementing", () => {
    const m = prep('D_B', { B: 200 });
    m.poke(0, 150); // register '_' holds the fixed destination
    m.poke(200, 7);
    m.step();
    expect(m.read(150)).toBe(7);
    expect(m.read(0)).toBe(150); // not incremented
    expect(m.read(fromTribbles('__B'))).toBe(201);
  });
});

describe('K klear', () => {
  test('zeroes b trytes from address a', () => {
    const m = prep('KAB', { A: 500, B: 3 });
    for (let i = -1; i < 5; i++) m.poke(500 + i, 9);
    m.step();
    expect(m.read(499)).toBe(9);
    expect(m.read(500)).toBe(0);
    expect(m.read(501)).toBe(0);
    expect(m.read(502)).toBe(0);
    expect(m.read(503)).toBe(9);
  });

  test('zero or negative count writes nothing', () => {
    const m = prep('KAB', { A: 500, B: 0 });
    m.poke(500, 9);
    m.step();
    expect(m.read(500)).toBe(9);
  });
});

describe('F function shift', () => {
  test('fShift unit behavior', () => {
    expect(fShift(4, 1)).toBe(12);
    expect(fShift(4, 2)).toBe(36);
    expect(fShift(5, -1)).toBe(2); // 5/3 rounds to 2
    expect(fShift(4, -1)).toBe(1);
    expect(fShift(-5, -1)).toBe(-2);
    expect(fShift(-7, -13)).toBe(7); // -13 ('A') is ABS
    expect(fShift(fromTrits('T00000001'), 9)).toBe(fromTrits('00000001T')); // rotl 1
    expect(fShift(fromTrits('00000001T'), -9)).toBe(fromTrits('T00000001')); // rotr 1
    expect(fShift(123, 0)).toBe(123);
    // shifted-out trits are lost
    expect(fShift(fromTrits('100000001'), 1)).toBe(fromTrits('000000010'));
  });

  test('F opcode forms', () => {
    runTest('FAN', [4], [12]); // N = +1: shift left 1
    runTest('FAM', [5], [2]); // M = -1: shift right 1
    runTest('FAA', [-5], [5]); // A: absolute value
    runTest('FAV', [fromTrits('T00000001')], [fromTrits('00000001T')]); // V = +9: rotl 1
    runTest('FAE', [fromTrits('00000001T')], [fromTrits('T00000001')]); // E = -9: rotr 1
  });
});

describe('H halt and interrupts', () => {
  test('timer wakes after b cycles', () => {
    const m = prep('HAB', { A: 0, B: 5 });
    m.step(); // executes H, enters sleep
    expect(m.sleep).not.toBeNull();
    m.run(5);
    expect(m.sleep).toBeNull();
    expect(m.read(REG_P)).toBe(ORG + 1);
  });

  test('negative timer means 9841 * |b| cycles (one-second example)', () => {
    const m = prep('HAB', { A: 0, B: -54 });
    m.step();
    expect(m.sleep!.remaining).toBe(9841 * 54); // 531414 ~ one second at 3^12 Hz
  });

  test('timer 0 sleeps forever; run reports it', () => {
    const m = prep('HAB', { A: 0, B: 0 });
    m.step();
    expect(m.run(100)).toBe('sleep-forever');
    expect(m.sleep).not.toBeNull();
  });

  test('mask trit T ignores the line', () => {
    const m = prep('HAB', { A: fromTrits('TTTTTTTTT'), B: 0 });
    m.step();
    expect(m.raiseInterrupt(0)).toBe(false);
    expect(m.sleep).not.toBeNull();
  });

  test('mask trit 1: handler returns past the H (wake)', () => {
    const m = prep('HAB', { A: fromTrits('1TTTTTTTT'), B: 0 });
    m.poke(VEC_IRQ_BASE + 0, 1234);
    m.step();
    expect(m.raiseInterrupt(0)).toBe(true);
    expect(m.sleep).toBeNull();
    expect(m.read(REG_P)).toBe(1234);
    expect(m.read(VEC_RETURN)).toBe(ORG + 1); // past the H: woken
  });

  test('mask trit 0: handler returns to the H itself (resume sleep)', () => {
    const m = prep('HAB', { A: fromTrits('0TTTTTTTT'), B: 0 });
    m.poke(VEC_IRQ_BASE + 0, 1234);
    m.step();
    expect(m.raiseInterrupt(0)).toBe(true);
    expect(m.read(REG_P)).toBe(1234);
    expect(m.read(VEC_RETURN)).toBe(ORG); // the H instruction: re-sleeps on return
  });

  test('interrupt while awake uses the latest mask', () => {
    const m = prep('HAB ___', { A: fromTrits('1TTTTTTTT'), B: 1 });
    m.poke(VEC_IRQ_BASE + 0, 1234);
    m.step(); // H
    m.run(1); // timer expires, awake at ORG+1
    expect(m.sleep).toBeNull();
    expect(m.raiseInterrupt(0)).toBe(true);
    expect(m.read(VEC_RETURN)).toBe(ORG + 1);
    expect(m.read(REG_P)).toBe(1234);
  });

  test('per-scanline interrupts: a device firing every boundary is delivered each time during one sleep', () => {
    // Regression for the batched-sleep bug: tickSleep used to advance the whole
    // run() budget in one device tick, so only the first IRQ of the batch
    // survived raiseInterrupt's mask-clear and the rest were dropped — making
    // per-scanline (hblank) handlers impossible. The machine now caps a sleep
    // advance to the device's nextEventCycles, so each boundary's IRQ runs.
    const PERIOD = 73; // ~one scanline
    const dev = {
      id: 3,
      acc: 0,
      nextEventCycles() {
        return PERIOD - this.acc;
      },
      tick(dc: number, irq: (line: number) => void) {
        this.acc += dc;
        while (this.acc >= PERIOD) {
          this.acc -= PERIOD;
          irq(1); // raise line 1 every boundary
        }
      },
    };
    const m = new Machine();
    m.attach(dev);
    // main: H with mask "line 1 = resume, all else ignore" (DAA), timer 0 (forever)
    m.loadTribbles('H__' + 'DAA' + '___', ORG);
    // handler at ORG+10: counter (reg Q) += 1, then return to the H (resume)
    const HANDLER = ORG + 10;
    m.loadTribbles('IQN' + 'RP_' + '_NZ', HANDLER);
    m.poke(VEC_IRQ_BASE + 1, HANDLER);
    m.poke(REG_P, ORG);

    m.step(); // execute H → asleep
    expect(m.sleep).not.toBeNull();
    m.run(800); // ~10 scanline boundaries within this one budget

    const counter = m.read(fromTribbles('__Q'));
    expect(counter).toBeGreaterThanOrEqual(8); // not 1 — every boundary fired
    expect(m.sleep).not.toBeNull(); // line 1 resumes, so it never wakes
  });
});

describe('V/I literal operands', () => {
  test('V and I take a literal tribble, not an operand tryte', () => {
    runTest('VANIAN', [], [2]); // A = +1, then A += 1
    runTest('VAZIAA', [], [0]); // A = +13, then A += -13
  });
});

describe('writes to immediate destinations are NOPs', () => {
  test('M__ with literal destination discards cleanly', () => {
    // M with hi='_': consumes the immediate tryte, discards the write,
    // and execution continues correctly aligned.
    runTest('M_B' + '__C' + 'VAN', [0, 7], [1, 7]);
  });
});
