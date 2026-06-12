// Disassembler. Shares the instruction shapes in decode.ts; the reported
// length always equals instructionLength() for the same address.

import { DIGITS, toTribbles, toTrits, tribblesOf } from './tryte';
import type { ReadFn } from './decode';

export interface Disassembly {
  text: string;
  length: number;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function fModifier(n: number): string {
  if (n === -13) return 'abs';
  if (n >= 1 && n <= 8) return `<<${n}`;
  if (n <= -1 && n >= -8) return `>>${-n}`;
  if (n >= 9) return `rol${n - 8}`;
  if (n <= -9) return `ror${-n - 8}`;
  return 'nop';
}

/** One-line English description of a disassembled instruction text string. */
export function describeInsn(text: string): string {
  const p = text.split(' ');
  const op = p[0]!;
  const a = p[1] ?? '';
  const b = p[2] ?? '';
  switch (op) {
    case 'NOP': return 'No operation';
    case 'J':   return `Relative jump by ${a}`;
    case 'M':   return `Move: ${a} ← ${b}`;
    case 'A':   return `Add: ${a} ← ${a} + ${b}`;
    case 'S':   return `Subtract: ${a} ← ${a} − ${b}`;
    case 'Z':   return `Reverse subtract: ${a} ← ${b} − ${a}`;
    case 'P':   return `Product: ${a} ← ${a} × ${b}`;
    case 'Q':   return `Quotient: ${a} ← ${a} ÷ ${b} (rounded)`;
    case 'B':   return `Trit AND (min): ${a} ← ${a} & ${b}`;
    case 'Y':   return `Trit OR (max): ${a} ← ${a} | ${b}`;
    case 'X':   return `Exchange: ${a} ↔ ${b}`;
    case 'T':   return `Trit-map: ${a} ← table(${a}, ${b})  table: ${p[3] ?? ''}`;
    case 'R':   return `Read indirect: ${a} ← mem[${b}]`;
    case 'W':   return `Write indirect: mem[${a}] ← ${b}`;
    case 'U':   return `Push: mem[--${a}] ← ${b}`;
    case 'O':   return `Pop: ${b} ← mem[${a}++]`;
    case 'C':   return `Call: push PC to ${a}, jump to ${b}`;
    case 'D':   return `Datablast: mem[${a}++] ← mem[${b}++]`;
    case 'K':   return `Klear: zero ${b} trytes starting at ${a}`;
    case 'H':   return `Sleep: interrupt mask=${a}, timer=${b}`;
    case 'G':   return `If ${a} ≥ ${b}: execute next, else skip`;
    case 'L':   return `If ${a} < ${b}: execute next, else skip`;
    case 'E':   return `If ${a} = ${b}: execute next, else skip`;
    case 'N':   return `If ${a} ≠ ${b}: execute next, else skip`;
    case 'V':   return `Set: ${a} ← ${b}`;
    case 'I':   return `Increment: ${a} += ${b}`;
    case 'F':   return `Shift/rotate: ${a} ← ${b}(${a})`;
    default:    return '';
  }
}

export function disassemble(read: ReadFn, addr: number): Disassembly {
  const [op, hi, lo] = tribblesOf(read(addr));
  const opC = DIGITS[op + 13]!;
  let length = 1;

  // Render one value-capable operand slot, consuming operand trytes in order.
  const slot = (t: number): string => {
    if (t === 0) return `#${read(addr + length++)}`; // immediate
    if (t === -1) return `[${toTribbles(read(addr + length++))}]`; // memory
    if (t === 2) {
      const [r, m, l] = tribblesOf(read(addr + length++));
      return `*${DIGITS[r + 13]}${signed(m * 27 + l)}`; // register+offset
    }
    return DIGITS[t + 13]!;
  };

  switch (opC) {
    case '_':
      return { text: 'NOP', length };
    case 'J':
      return { text: `J ${signed(hi * 27 + lo)}`, length };
    case 'D':
      return { text: `D ${DIGITS[hi + 13]} ${DIGITS[lo + 13]}`, length };
    case 'V':
    case 'I':
      return { text: `${opC} ${slot(hi)} ${signed(lo)}`, length };
    case 'F':
      return { text: `F ${slot(hi)} ${fModifier(lo)}`, length };
    case 'T': {
      const a = slot(hi);
      const b = slot(lo);
      const table = read(addr + length++);
      return { text: `T ${a} ${b} ${toTrits(table)}`, length };
    }
    default:
      return { text: `${opC} ${slot(hi)} ${slot(lo)}`, length };
  }
}
