import { DIGITS, fromTribbles, norm } from './tryte';

/** Debugger address: register, tribble tryte, decimal, or loaded label±offset. */
export function parseAddress(text: string, labels?: ReadonlyMap<string, number>): number | null {
  const s = text.trim();
  if (/^[A-Z_]{3}$/.test(s)) return fromTribbles(s);
  if (/^[A-Z_]$/.test(s)) return DIGITS.indexOf(s) - 13;
  if (/^[+-]?\d+$/.test(s)) {
    const value = Number(s);
    return Number.isSafeInteger(value) ? norm(value) : null;
  }
  const match = /^([a-z][a-zA-Z0-9_]*)([+-]\d+)?$/.exec(s);
  if (!match) return null;
  const address = labels?.get(match[1]!);
  if (address === undefined) return null;
  const offset = match[2] ? Number(match[2]) : 0;
  return Number.isSafeInteger(offset) ? norm(address + norm(offset)) : null;
}
