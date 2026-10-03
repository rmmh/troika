import { describe, expect, it } from 'vitest';
import { Machine } from '../src/core/machine';
import { digitValue, fromTribbles } from '../src/core/tryte';

describe('raw machine-code loading', () => {
  it.each(['ABC12_', 'ABCZ', 'ABCßA'])('rejects invalid input atomically: %s', (source) => {
    const m = new Machine();
    m.poke(200, 42);
    m.poke(201, 43);
    const before = m.mem.slice();
    expect(() => m.loadTribbles(source, 200)).toThrow();
    expect(m.mem).toEqual(before);
    expect(m.cycles).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid numeric load address %s', (address) => {
    const m = new Machine();
    expect(() => m.loadTribbles('ABC', address)).toThrow('exact integer');
    expect(m.mem.every((v) => v === 0)).toBe(true);
  });

  it('supports lowercase, whitespace, and wrapped addresses without device side effects', () => {
    const m = new Machine();
    m.attach({ id: 3, write: () => { throw new Error('hardware write'); } });
    expect(m.loadTribbles('abc \n def\t', 9841)).toBe(2);
    expect(m.peek(9841)).toBe(fromTribbles('ABC'));
    expect(m.peek(-9841)).toBe(fromTribbles('DEF'));
    expect(m.loadTribbles('ABC', '_PA')).toBe(1);
    expect(m.peek(fromTribbles('_PA'))).toBe(fromTribbles('ABC'));
    expect(m.cycles).toBe(0);
  });

  it('accepts an empty program without changing memory', () => {
    const m = new Machine();
    m.poke(200, 42);
    expect(m.loadTribbles(' \n\t', 200)).toBe(0);
    expect(m.peek(200)).toBe(42);
  });
});

describe('hardware identifier validation', () => {
  it.each([NaN, Infinity, -Infinity, 0, 1.5, -14, 14])('rejects device id %s', (id) => {
    expect(() => new Machine().attach({ id })).toThrow('bad device id');
  });

  it.each([NaN, Infinity, -Infinity, -1, 0.5, 9])('rejects interrupt line %s without changing CPU state', (line) => {
    const m = new Machine();
    expect(() => m.raiseInterrupt(line)).toThrow('bad interrupt line');
    expect(m.cycles).toBe(0);
    expect(m.mem.every((v) => v === 0)).toBe(true);
  });

  it.each(['', 'AB', 'ABC', 'a', '1'])('rejects invalid tribble digit %j', (digit) => {
    expect(() => digitValue(digit)).toThrow('bad tribble digit');
  });
});
