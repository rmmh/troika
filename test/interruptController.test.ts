import { describe, expect, it } from 'vitest';
import { assemble } from '../src/asm/assemble';
import {
  Machine, REG_P, REG_S, REG_INT_MASK, REG_INT_PENDING, REG_INT_SAVED_MASK,
  VEC_DIV0, VEC_IRQ_BASE, VEC_RETURN,
} from '../src/core/machine';
import { fromTrits, TRYTE_MIN, toTrits } from '../src/core/tryte';

function program(source: string): Machine {
  const result = assemble('@200\n' + source);
  expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const m = new Machine();
  for (const chunk of result.chunks) chunk.data.forEach((value, i) => m.poke(chunk.addr + i, value));
  m.poke(REG_P, result.entry!);
  m.poke(REG_S, 1000);
  return m;
}

describe('memory-mapped interrupt controller', () => {
  it('exposes the live mask and restores controller power-on state on reset', () => {
    const m = new Machine();
    expect(m.read(REG_INT_MASK)).toBe(TRYTE_MIN);
    expect(m.inspect(REG_INT_MASK)).toBe(m.intMask);
    m.write(REG_INT_MASK, fromTrits('1TTTTTTTT'));
    expect(m.intMask).toBe(fromTrits('1TTTTTTTT'));
    m.intMask = fromTrits('T1TTTTTTT');
    expect(m.peek(REG_INT_MASK)).toBe(fromTrits('T1TTTTTTT'));
    m.poke(REG_INT_PENDING, 6561);
    m.poke(REG_INT_SAVED_MASK, 123);
    m.reset();
    expect(m.read(REG_INT_MASK)).toBe(TRYTE_MIN);
    expect(m.read(REG_INT_PENDING)).toBe(0);
    expect(m.read(REG_INT_SAVED_MASK)).toBe(0);
  });

  it('latches masked events, coalesces repeats, and allows software to clear them', () => {
    const m = new Machine();
    expect(m.raiseInterrupt(0)).toBe(false);
    expect(m.raiseInterrupt(0)).toBe(false);
    expect(m.raiseInterrupt(8)).toBe(false);
    expect(toTrits(m.read(REG_INT_PENDING))).toBe('100000001');
    expect(m.cycles).toBe(0);
    m.write(REG_INT_PENDING, fromTrits('000000001'));
    expect(toTrits(m.read(REG_INT_PENDING))).toBe('000000001');
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])('maps line %i to its mask, pending trit, and vector', line => {
    const m = new Machine();
    const mask = fromTrits('T'.repeat(line) + '1' + 'T'.repeat(8 - line));
    m.poke(REG_P, 200);
    m.poke(VEC_IRQ_BASE + line, 500 + line);
    m.intMask = mask;
    let elapsed = 0;
    m.attach({ id: 3, tick: cycles => { elapsed += cycles; } });
    expect(m.raiseInterrupt(line)).toBe(true);
    expect(m.read(REG_P)).toBe(500 + line);
    expect(m.read(VEC_RETURN)).toBe(200);
    expect(m.read(REG_INT_SAVED_MASK)).toBe(mask);
    expect(m.read(REG_INT_PENDING)).toBe(0);
    expect(m.cycles).toBe(2);
    expect(elapsed).toBe(2);
  });

  it.each(['0', '1'])('takes a previously pending event immediately after H arms mask trit %s', trit => {
    const m = program(`H #${trit}TTTTTTTT 0`);
    m.poke(VEC_IRQ_BASE, 500);
    m.raiseInterrupt(0);
    m.step();
    expect(m.sleep).toBeNull();
    expect(m.read(REG_P)).toBe(500);
    expect(m.read(VEC_RETURN)).toBe(trit === '0' ? 200 : 203);
    expect(m.read(REG_INT_SAVED_MASK)).toBe(fromTrits(trit + 'TTTTTTTT'));
    expect(m.intMask).toBe(TRYTE_MIN);
    expect(m.read(REG_INT_PENDING)).toBe(0);
    expect(m.cycles).toBe(5);
  });

  it('services pending events after a software mask write without sleeping', () => {
    const m = program('W _NM #1TTTTTTTT');
    m.poke(VEC_IRQ_BASE, 500);
    m.raiseInterrupt(0);
    m.step();
    expect(m.read(REG_P)).toBe(500);
    expect(m.read(VEC_RETURN)).toBe(203);
    expect(m.read(REG_INT_SAVED_MASK)).toBe(fromTrits('1TTTTTTTT'));
    expect(m.cycles).toBe(6);
  });

  it.each([false, true])('prioritizes the lowest simultaneous device line regardless of attachment order (%s)', reverse => {
    const m = program('___');
    m.intMask = fromTrits('1TTTTTTT1');
    m.poke(VEC_IRQ_BASE, 500);
    m.poke(VEC_IRQ_BASE + 8, 600);
    const elapsed = [0, 0];
    const devices = [8, 0].map((line, index) => {
      let fired = false;
      return { id: 3 + index, tick: (cycles: number, irq: (line: number) => void) => {
        elapsed[index]! += cycles;
        if (!fired) { fired = true; irq(line); }
      } };
    });
    for (const device of reverse ? devices.reverse() : devices) m.attach(device);
    m.step();
    expect(m.read(REG_P)).toBe(500);
    expect(toTrits(m.read(REG_INT_PENDING))).toBe('000000001');
    expect(elapsed).toEqual([3, 3]);
  });

  it('accepts software-raised pending lines and clears only the dispatched trit', () => {
    const m = program('W _NP #1T0000001');
    m.intMask = fromTrits('1TTTTTTTT');
    m.poke(VEC_IRQ_BASE, 500);
    m.step();
    expect(m.read(REG_P)).toBe(500);
    expect(toTrits(m.read(REG_INT_PENDING))).toBe('0T0000001');
  });

  it('preserves stacked return state when restoring the mask dispatches another line', () => {
    const m = program(`W _NM #11TTTTTTT
      @300
      I A 1
      USM_NZ
      MMM_NM_NY
      OSP
      @400
      I B 1
      USM_NZ
      MMM_NM_NY
      OSP`);
    m.poke(VEC_IRQ_BASE, 300);
    m.poke(VEC_IRQ_BASE + 1, 400);
    m.raiseInterrupt(1);
    m.raiseInterrupt(0);
    m.step();
    for (let i = 0; i < 20 && m.read(REG_P) !== 203; i++) m.step();
    expect(m.read(REG_P)).toBe(203);
    expect(m.read(REG_S)).toBe(1000);
    expect(m.read(-13)).toBe(1);
    expect(m.read(-12)).toBe(1);
    expect(m.read(REG_INT_PENDING)).toBe(0);
    expect(m.intMask).toBe(fromTrits('11TTTTTTT'));
  });

  it('saves and masks interrupts on synchronous division traps without consuming pending lines', () => {
    const m = program('Q A Z');
    m.poke(VEC_DIV0, 500);
    m.raiseInterrupt(0);
    m.intMask = fromTrits('1TTTTTTTT');
    m.step();
    expect(m.read(REG_P)).toBe(500);
    expect(m.read(REG_INT_SAVED_MASK)).toBe(fromTrits('1TTTTTTTT'));
    expect(m.intMask).toBe(TRYTE_MIN);
    expect(toTrits(m.read(REG_INT_PENDING))).toBe('100000000');
    expect(m.cycles).toBe(11);
  });

  it('keeps asynchronous interrupts out of instruction timing previews', () => {
    const m = program('___');
    m.raiseInterrupt(0);
    m.intMask = fromTrits('1TTTTTTTT');
    const before = m.mem.slice();
    expect(m.previewCyclesAt(200)).toBe(1);
    expect(m.mem).toEqual(before);
    expect(m.cycles).toBe(0);
    m.step();
    expect(m.cycles).toBe(3);
  });
});
