import { fromTribbles, toTribbles } from './tryte';

const SYMBOLS = ['.', ',', ':', ';', '!', '?', '-', '+', '/', '(', ')', "'", '#'];
const EXTRA_PRINTABLE = ['$', '%', '&', '*', '<', '=', '>', '[', '\\', ']', '^', '`', '{', '|', '}', '~'];

const charToTryte = new Map<string, number>();
const tryteToChar = new Map<number, string>();

function define(ch: string, tribbles: string): void {
  const v = fromTribbles(tribbles);
  charToTryte.set(ch, v);
  tryteToChar.set(v, ch);
}

for (const ch of 'abcdefghijklmnopqrstuvwxyz') define(ch, '__' + ch.toUpperCase());
for (const ch of 'ABCDEFGHIJKLM NOPQRSTUVWXYZ') {
  const digit = ch === ' ' ? '_' : ch;
  define(ch, '_M' + digit);
}
SYMBOLS.forEach((ch, i) => define(ch, '_N' + 'ABCDEFGHIJKLM'[i]));
define('\n', '_N_');
for (let i = 0; i <= 9; i++) define(String(i), '_N' + 'NOPQRSTUVW'[i]);
define('@', '_NX');
define('_', '_NY');
define('"', '_NZ');
EXTRA_PRINTABLE.forEach((ch, i) => define(ch, '_O' + 'ABCDEFGHIJKLMNOP'[i]));

export const TEXT_REPLACEMENT = fromTribbles('_NF'); // '?'

export function encodeChar(ch: string): number {
  return charToTryte.get(ch) ?? TEXT_REPLACEMENT;
}

export function decodeChar(v: number): string {
  return tryteToChar.get(v) ?? `<?>`;
}

export function encodeText(s: string): number[] {
  return Array.from(s, encodeChar);
}

export function decodeText(values: Iterable<number>): string {
  let out = '';
  for (const v of values) out += decodeChar(v);
  return out;
}

export function textEncodingEntries(): { char: string; tribbles: string; value: number }[] {
  return [...charToTryte.entries()].map(([char, value]) => ({ char, value, tribbles: toTribbles(value) }));
}
