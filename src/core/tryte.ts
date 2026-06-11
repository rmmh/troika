// Balanced-ternary tryte arithmetic. A tryte is 9 trits, valued -9841..9841.
// Trytes are represented as plain numbers; memory is an Int16Array of them.

// Balanced septemvigesimal digits: A=-13 .. _=0 .. Z=+13.
export const DIGITS = 'ABCDEFGHIJKLM_NOPQRSTUVWXYZ';

export const TRYTE_MIN = -9841;
export const TRYTE_MAX = 9841;
export const TRYTE_COUNT = 19683; // 3^9
export const MEM_SIZE = TRYTE_COUNT;
export const CLOCK_HZ = 531441; // 3^12

/** Wrap an integer into the tryte range -9841..9841. */
export function norm(v: number): number {
  return ((((v + TRYTE_MAX) % TRYTE_COUNT) + TRYTE_COUNT) % TRYTE_COUNT) - TRYTE_MAX;
}

/** Value of a single tribble character (A=-13 .. Z=+13). */
export function digitValue(c: string): number {
  const i = DIGITS.indexOf(c);
  if (i < 0) throw new Error(`bad tribble digit: ${JSON.stringify(c)}`);
  return i - 13;
}

/** Tribble values (hi, mid, lo), each -13..13. */
export function tribblesOf(v: number): [number, number, number] {
  let u = norm(v) + TRYTE_MAX;
  const lo = u % 27;
  u = (u - lo) / 27;
  const mid = u % 27;
  const hi = (u - mid) / 27;
  return [hi - 13, mid - 13, lo - 13];
}

/** 3-character septemvigesimal string, e.g. toTribbles(217) === '_IA'. */
export function toTribbles(v: number): string {
  const [h, m, l] = tribblesOf(v);
  return DIGITS[h + 13]! + DIGITS[m + 13]! + DIGITS[l + 13]!;
}

export function fromTribbles(s: string): number {
  if (s.length !== 3) throw new Error(`tribble string must be 3 chars: ${JSON.stringify(s)}`);
  return digitValue(s[0]!) * 729 + digitValue(s[1]!) * 27 + digitValue(s[2]!);
}

/**
 * The 9 trits of a tryte as unbalanced digits 0|1|2 (= trit value + 1),
 * most significant first. Index i matches the spec's "Trit i" numbering
 * for T-operator truth tables and H interrupt masks.
 */
export function tritsRaw(v: number): number[] {
  let u = norm(v) + TRYTE_MAX;
  const ret = new Array<number>(9);
  for (let i = 8; i >= 0; i--) {
    ret[i] = u % 3;
    u = (u - ret[i]!) / 3;
  }
  return ret;
}

/** Inverse of tritsRaw: 9 unbalanced digits (MSB first) to a tryte value. */
export function fromTritsRaw(trits: ArrayLike<number>): number {
  let u = 0;
  for (let i = 0; i < trits.length; i++) u = u * 3 + trits[i]!;
  return u - (3 ** trits.length - 1) / 2;
}

/** Balanced-ternary string, e.g. toTrits(217) === '00010T001'. */
export function toTrits(v: number): string {
  return tritsRaw(v)
    .map((t) => 'T01'[t])
    .join('');
}

export function fromTrits(s: string): number {
  let val = 0;
  for (const c of s) {
    const t = 'T01'.indexOf(c);
    if (t < 0) throw new Error(`bad trit: ${JSON.stringify(c)}`);
    val = val * 3 + (t - 1);
  }
  return val;
}

/**
 * Tritwise binary operation: result trit i = table[a_i * 3 + b_i], where the
 * table holds 9 unbalanced result digits ordered per the spec (index 0 = T op T,
 * index 8 = 1 op 1). This is the hardware behavior of the T opcode.
 */
export function tritMap(a: number, b: number, table: ArrayLike<number>): number {
  const ta = tritsRaw(a);
  const tb = tritsRaw(b);
  const out = new Array<number>(9);
  for (let i = 0; i < 9; i++) out[i] = table[ta[i]! * 3 + tb[i]!]!;
  return fromTritsRaw(out);
}

/** Tritwise minimum (the B "Both"/AND operation). */
export function tritAnd(a: number, b: number): number {
  const ta = tritsRaw(a);
  const tb = tritsRaw(b);
  const out = new Array<number>(9);
  for (let i = 0; i < 9; i++) out[i] = Math.min(ta[i]!, tb[i]!);
  return fromTritsRaw(out);
}

/** Tritwise maximum (the Y "anY"/OR operation). */
export function tritOr(a: number, b: number): number {
  const ta = tritsRaw(a);
  const tb = tritsRaw(b);
  const out = new Array<number>(9);
  for (let i = 0; i < 9; i++) out[i] = Math.max(ta[i]!, tb[i]!);
  return fromTritsRaw(out);
}
