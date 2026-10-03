import { norm, TRYTE_COUNT, TRYTE_MAX, TRYTE_MIN } from './tryte';

/** Exact nonnegative three-tryte peripheral counter (27 trits, < 2**42). */
export const WIDE_MAX = (TRYTE_COUNT ** 3 - 1) / 2;
export type Wide = readonly [number, number, number];

export function encodeWide(value: number): Wide {
  if (!Number.isSafeInteger(value) || value < 0 || value > WIDE_MAX) throw new RangeError('wide counter exhausted or invalid');
  const low = norm(value);
  const rest = (value - low) / TRYTE_COUNT;
  const middle = norm(rest);
  return [(rest - middle) / TRYTE_COUNT, middle, low];
}

export function decodeWide(value: Wide): number {
  for (const v of value) if (!Number.isInteger(v) || v < TRYTE_MIN || v > TRYTE_MAX) throw new RangeError('invalid wide digit');
  const n = (value[0] * TRYTE_COUNT + value[1]) * TRYTE_COUNT + value[2];
  if (n < 0) throw new RangeError('negative counter');
  return n;
}
