import {expect, test} from 'vitest';
import {assemble} from '../src/asm/assemble';
import {Machine, REG_P} from '../src/core/machine';

function word(source: string) {
  const result = assemble(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.chunks[0]!.data).toHaveLength(1);
  return result.chunks[0]!.data[0]!;
}

test('instruction decoding observes changed code and restored memory at the same PC', () => {
  const m = new Machine();
  m.poke(1000, word('M A 3')); m.poke(REG_P, 1000);
  const initial = m.captureCpuState();
  m.step(); expect(m.peek(-13)).toBe(3);
  m.poke(1000, word('M A 7')); m.poke(REG_P, 1000);
  m.step(); expect(m.peek(-13)).toBe(7);
  m.restoreCpuState(initial);
  m.step(); expect(m.peek(-13)).toBe(3); expect(m.cycles).toBe(1);
});

test('instruction decoding fetches changing MMIO exactly once per instruction', () => {
  const m = new Machine(), words = [word('M A 3'), word('M A 7')];
  let reads = 0;
  m.attach({id: 4, read: () => words[reads++]!});
  m.poke(REG_P, 95); m.step(); expect(m.peek(-13)).toBe(3);
  m.poke(REG_P, 95); m.step(); expect(m.peek(-13)).toBe(7);
  expect(reads).toBe(2); expect(m.cycles).toBe(2);
});
