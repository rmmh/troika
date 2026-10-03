import { describe, expect, it } from 'vitest';
import { parseAddress } from '../src/core/address';

describe('debugger address parsing', () => {
  const labels = new Map([['start', 200], ['edge', 9841]]);
  it.each([
    ['A', -13], ['P', 3], ['ZZZ', 9841], ['_AA', -364],
    ['  +200  ', 200], ['19683', 0], ['-9842', 9841],
    ['start', 200], ['start-2', 198], ['edge+1', -9841],
  ])('parses %s as %i', (source, expected) => {
    expect(parseAddress(source, labels)).toBe(expected);
  });
  it.each(['', '12junk', '1.5', 'Infinity', 'unknown', 'start+', 'start+9007199254740992', '9007199254740992'])('rejects %j', (source) => {
    expect(parseAddress(source, labels)).toBeNull();
  });
});
