import { describe, expect, test } from 'vitest';
import {
  TRYTE_MAX,
  TRYTE_MIN,
  fromTribbles,
  fromTrits,
  fromTritsRaw,
  norm,
  toTribbles,
  toTrits,
  tritAnd,
  tritMap,
  tritOr,
  tritsRaw,
} from '../src/core/tryte';

describe('norm', () => {
  test('identity in range', () => {
    expect(norm(0)).toBe(0);
    expect(norm(TRYTE_MAX)).toBe(TRYTE_MAX);
    expect(norm(TRYTE_MIN)).toBe(TRYTE_MIN);
  });

  test('wraps', () => {
    expect(norm(TRYTE_MAX + 1)).toBe(TRYTE_MIN);
    expect(norm(TRYTE_MIN - 1)).toBe(TRYTE_MAX);
    expect(norm(19683)).toBe(0);
    expect(norm(-19683)).toBe(0);
    expect(norm(2 * 19683 + 5)).toBe(5);
    expect(norm(-2 * 19683 - 5)).toBe(-5);
  });
});

describe('tribbles', () => {
  test('spec examples', () => {
    expect(fromTrits('00010T001')).toBe(217);
    expect(fromTribbles('__A')).toBe(-13);
    expect(fromTribbles('__Z')).toBe(13);
    expect(fromTribbles('___')).toBe(0);
    expect(fromTribbles('_AA')).toBe(-364);
    expect(fromTribbles('_ZZ')).toBe(364);
    expect(fromTribbles('_OA')).toBe(41);
    expect(fromTribbles('_OZ')).toBe(67);
  });

  test('full-range round trip', () => {
    for (let n = TRYTE_MIN; n <= TRYTE_MAX; n++) {
      expect(fromTribbles(toTribbles(n))).toBe(n);
    }
  });
});

describe('trits', () => {
  test('full-range round trip', () => {
    for (let n = TRYTE_MIN; n <= TRYTE_MAX; n++) {
      expect(fromTrits(toTrits(n))).toBe(n);
      expect(fromTritsRaw(tritsRaw(n))).toBe(n);
    }
  });

  test('ordering is most-significant first', () => {
    expect(toTrits(1)).toBe('00000000 1'.replace(' ', ''));
    expect(toTrits(-1)).toBe('00000000T');
    expect(toTrits(TRYTE_MAX)).toBe('111111111');
  });
});

describe('trit logic', () => {
  test('and / or (sim_test values)', () => {
    const a = fromTrits('T01T01T01');
    const b = fromTrits('T0101T1T0');
    expect(tritAnd(a, b)).toBe(fromTrits('T01T0TTT0'));
    expect(tritOr(a, b)).toBe(fromTrits('T01011101'));
  });

  test('tritMap with identity-revealing table', () => {
    // Table trits: index 0 (T op T) is the most significant table trit.
    const table = tritsRaw(fromTrits('TT00T0T0T'));
    const a = fromTrits('TTT000111'); // selects table row
    const b = fromTrits('T01T01T01'); // selects table column
    // a_i*3 + b_i === i, so the result replays the table itself.
    expect(tritMap(a, b, table)).toBe(fromTrits('TT00T0T0T'));
  });
});
