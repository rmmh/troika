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
