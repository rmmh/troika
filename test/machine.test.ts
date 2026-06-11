// Conformance corpus ported from sim_test.py. Programs load at _AA with
// P=_AA and S=_ZZ; inputs fill registers A.. (strings load into memory with
// the register holding a pointer); outputs assert registers A.. afterwards.

import { describe, expect, test } from 'vitest';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { fromTribbles, fromTrits, norm } from '../src/core/tryte';

export function runTest(
  prog: string,
  inputs: (number | string)[] = [],
  outputs: number[] = [],
  mem: Record<string, string> = {},
): Machine {
  const m = new Machine();
  const len = m.loadTribbles(prog, '_AA');
  m.poke(REG_P, fromTribbles('_AA'));
  m.poke(REG_S, fromTribbles('_ZZ'));
  for (const [loc, val] of Object.entries(mem)) m.loadTribbles(val, loc);

  let dataPtr = 14;
  inputs.forEach((arg, i) => {
    if (typeof arg === 'number') {
      m.poke(i - 13, arg);
    } else {
      const n = m.loadTribbles(arg, dataPtr);
      m.poke(i - 13, dataPtr);
      dataPtr += n + 1; // leave a null terminator
    }
  });

  const end = fromTribbles('_AA') + len;
  for (let i = 0; i < 1000 && m.read(REG_P) !== end; i++) m.step();
  expect(m.read(REG_P), 'program should run to completion').toBe(end);

  outputs.forEach((out, i) => {
    expect(m.read(i - 13), `output #${i} (register ${'ABCDEFGHIJKLM'[i]})`).toBe(norm(out));
  });
  return m;
}

describe('ported sim_test.py programs', () => {
  test('add', () => {
    runTest('AABAACAAD', [1, 2, 3, 4], [1 + 2 + 3 + 4]);
  });

  test('arithmetic', () => {
    runTest('AABSCDPEFAACAAE', [1, 2, 3, 4, 5, 6], [1 + 2 + (3 - 4) + 5 * 6]);
  });

  test('strlen', () => {
    runTest('MBARCAECZJ_OIANJ_ISAB', ['TEST_STRING_', 'foo'], ['TEST_STRING_'.length / 3]);
    runTest('MBAOACNCZJ_KIAMSAB', ['TEST_STRING_', 'foo'], ['TEST_STRING_'.length / 3]);
  });

  test('push and pop', () => {
    runTest('USAUSBUSCUSD OSAOSBOSCOSD', [1, 2, 3, 4], [4, 3, 2, 1]);
  });

  test('call and return', () => {
    runTest('VAOVBPCS__BA', [], [5], { _BA: 'AABOSP' });
  });

  test('write then read back', () => {
    runTest('MC__NA WCA RBC', [8, -1], [8, 8]);
  });

  test('zero register stays zero', () => {
    runTest('MZAMBZ', [8, -1], [8, 0]);
  });

  test('zero register write', () => {
    runTest('MBA W_A__Z RB___Z MCM__Z', [8], [8, 0, 0]);
  });

  test('both (and)', () => {
    runTest('BAB', [fromTrits('T01T01T01'), fromTrits('T0101T1T0')], [fromTrits('T01T0TTT0')]);
  });

  test('any (or)', () => {
    runTest('YAB', [fromTrits('T01T01T01'), fromTrits('T0101T1T0')], [fromTrits('T01011101')]);
  });

  test('false predicate skips the whole instruction', () => {
    // Replaces sim_test's skip-one-tryte test: per the current spec a false
    // predicate skips the entire following instruction including its operand
    // trytes. NAA is false, so MAO and its offset tryte VBM are both skipped.
    runTest('NAA MAOVBM VCP', [], [0, 0, 3]);
  });

  test('read-modify-write through memory mode', () => {
    runTest('IMN_ZA MAM_ZA', [], [5], { _ZA: '__Q' });
  });

  test('tritwise logic table', () => {
    runTest(
      'TABBKD',
      [fromTrits('TTT000111'), fromTrits('T01T01T01')],
      [fromTrits('TT00T0T0T')],
    );
  });
});
