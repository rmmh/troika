import { TRYTE_MAX, TRYTE_MIN } from './tryte';

/** Validate snapshot fields before changing live hardware. */
export function stateInteger(value: number, min: number, max = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError('invalid snapshot integer');
}
export function stateBoolean(value: boolean): void {
  if (typeof value !== 'boolean') throw new TypeError('invalid snapshot boolean');
}
export function stateTrytes(value: readonly number[] | Int16Array, length?: number): void {
  if (!Array.isArray(value) && !(value instanceof Int16Array)) throw new TypeError('invalid snapshot tryte array');
  if (length !== undefined && value.length !== length) throw new RangeError('invalid snapshot array length');
  for (const cell of value) stateInteger(cell, TRYTE_MIN, TRYTE_MAX);
}
