// Instruction shape tables shared by the executor, the predicate-skip logic,
// and the disassembler.

import { DIGITS, tribblesOf } from './tryte';

export type ReadFn = (addr: number) => number;

// Mode tribbles in a value-capable operand slot that consume one extra
// operand tryte: '_' immediate, 'M' memory, 'O' register+offset.
export function modeExtra(t: number): number {
  return t === 0 || t === -1 || t === 2 ? 1 : 0;
}

/**
 * Total length in trytes of the instruction at addr, including operand and
 * truth-table trytes. Conditional predicates skip exactly this many trytes
 * when false.
 */
export function instructionLength(read: ReadFn, addr: number): number {
  const [op, hi, lo] = tribblesOf(read(addr));
  const opC = DIGITS[op + 13]!;
  if (opC === '_' || opC === 'J' || opC === 'D') return 1;
  if (opC === 'V' || opC === 'I' || opC === 'F') return 1 + modeExtra(hi);
  let len = 1 + modeExtra(hi) + modeExtra(lo);
  if (opC === 'T') len += 1; // trailing truth-table tryte
  return len;
}
