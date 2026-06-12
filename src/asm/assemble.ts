// Statement parser, operand inflection, instruction encoder, and two-pass
// layout with short/long jump relaxation.

import { digitValue, fromTribbles, norm } from '../core/tryte';
import { lex, type Diagnostic, type Token } from './lexer';
import { TokenStream } from './macros';
import { STDLIB } from './stdlib';

export type { Diagnostic } from './lexer';

export const DEFAULT_ORG = fromTribbles('_AA');

export interface Chunk {
  addr: number;
  data: number[];
}

export interface AssembleResult {
  chunks: Chunk[];
  labels: Map<string, number>;
  /** Address of each emitted tryte -> 1-based source line. */
  lineMap: Map<number, number>;
  diagnostics: Diagnostic[];
  /** Labels referenced but not defined (only populated with allowPending). */
  pending: string[];
  /** Address after the last unit in source order. */
  end: number;
}

export interface AssembleOptions {
  /** Include the control-flow macro stdlib (default true). */
  prelude?: boolean;
  /** Treat undefined labels as pending (warning + 0 placeholder) instead of errors. */
  allowPending?: boolean;
}

type Operand =
  | { type: 'reg'; val: number; tok: Token }
  | { type: 'imm'; val: number; tok: Token }
  | { type: 'mem'; label: string; tok: Token }
  // A label's address as an immediate (C call targets resolve like J targets).
  | { type: 'addr'; label: string; tok: Token }
  | { type: 'off'; reg: number; disp: number; tok: Token };

type Unit =
  | { kind: 'code'; trytes: number[]; fixups: { at: number; label: string; tok: Token }[]; line: number; addr: number }
  | { kind: 'jump'; label: string; tok: Token; long: boolean; line: number; addr: number }
  | { kind: 'org'; target: number }
  | { kind: 'buffer'; size: number }
  | { kind: 'label'; name: string; tok: Token };

// Opcodes whose first slot is written (literal destinations warrant a warning).
const WRITES_SLOT1 = new Set('MASZPQBYXTRVIF');
// All generalized two-operand opcodes.
const TWO_OP = new Set('MASZPQBYXDKHUOCRWGLEN');

export function assemble(src: string, opts: AssembleOptions = {}): AssembleResult {
  const diagnostics: Diagnostic[] = [];
  const tokens: Token[] = [];
  if (opts.prelude !== false) tokens.push(...lex(STDLIB).tokens.map((t) => ({ ...t, line: 0 })));
  const lexed = lex(src);
  diagnostics.push(...lexed.diagnostics);
  tokens.push(...lexed.tokens);

  const stream = new TokenStream(tokens, diagnostics);
  const units: Unit[] = [];

  const diag = (tok: Token, severity: 'error' | 'warning', message: string) =>
    diagnostics.push({ severity, message, line: tok.line, col: tok.col });

  // --- statement parsing ---

  function parseOrigin(at: Token): void {
    const a = stream.nextRaw();
    if (a?.kind === 'numeric') units.push({ kind: 'org', target: norm(a.value) });
    else if (a?.kind === 'tribble' && a.text.length === 3)
      units.push({ kind: 'org', target: fromTribbles(a.text) });
    else diag(at, 'error', '@ requires a numeric address or 3-tribble address');
  }

  function parseIdentStatement(t: Token): void {
    const n1 = stream.peekRaw();
    if (n1?.kind === 'symbol' && n1.text === ':') {
      stream.nextRaw();
      units.push({ kind: 'label', name: t.text, tok: t });
      return;
    }
    if (n1?.kind === 'symbol' && n1.text === '/') {
      const n2 = stream.peekRaw(1);
      if (n2?.kind === 'symbol' && n2.text === '/') {
        stream.nextRaw();
        stream.nextRaw();
        const sz = stream.nextRaw();
        if (sz?.kind === 'numeric' && sz.value >= 0) {
          units.push({ kind: 'label', name: t.text, tok: t });
          units.push({ kind: 'buffer', size: sz.value });
        } else {
          diag(t, 'error', 'expected a non-negative size after //');
        }
        return;
      }
    }
    diag(t, 'error', `'${t.text}' is not a macro, label declaration (name:), or buffer (name//size)`);
  }

  function parseInstruction(t: Token): void {
    const opC = t.text[0]!;
    let pending = t.text.slice(1); // remaining chars of the opcode's tribble run

    const offsetOperand = (ch: string, tok: Token): Operand => {
      stream.nextRaw(); // '/'
      const n = stream.nextRaw()!; // numeric, guaranteed by caller's peek
      if (Math.abs(n.value) > 364) diag(n, 'error', 'offset out of range (-364..364)');
      return { type: 'off', reg: digitValue(ch), disp: norm(n.value), tok };
    };

    const isOffsetAhead = () =>
      stream.peekRaw()?.kind === 'symbol' &&
      stream.peekRaw()!.text === '/' &&
      stream.peekRaw(1)?.kind === 'numeric';

    const nextOperand = (): Operand | null => {
      if (pending) {
        const ch = pending[0]!;
        pending = pending.slice(1);
        if (!pending && isOffsetAhead()) return offsetOperand(ch, t);
        return { type: 'reg', val: digitValue(ch), tok: t };
      }
      const o = stream.next();
      if (!o) {
        diag(t, 'error', `missing operand for '${opC}'`);
        return null;
      }
      if (o.kind === 'numeric') return { type: 'imm', val: o.value, tok: o };
      if (o.kind === 'ident') return { type: 'mem', label: o.text, tok: o };
      if (o.kind === 'tribble') {
        // A full 3-tribble run is a tryte literal (e.g. NNN = 757); shorter
        // runs are register designators, possibly filling several slots.
        if (o.text.length === 3) return { type: 'imm', val: fromTribbles(o.text), tok: o };
        pending = o.text.slice(1);
        const ch = o.text[0]!;
        if (!pending && isOffsetAhead()) return offsetOperand(ch, o);
        return { type: 'reg', val: digitValue(ch), tok: o };
      }
      diag(o, 'error', `unexpected ${o.kind} '${o.text}' in operand position`);
      return null;
    };

    // Encode an operand as (mode tribble, optional extra tryte).
    const slotMode = (op: Operand): number =>
      op.type === 'reg' ? op.val : op.type === 'imm' || op.type === 'addr' ? 0 : op.type === 'mem' ? -1 : 2;

    const checkReg = (op: Operand): void => {
      if (op.type === 'reg' && (op.val === 0 || op.val === -1 || op.val === 2))
        diag(op.tok, 'error', `'${op.val === -1 ? 'M' : op.val === 0 ? '_' : 'O'}' is an addressing mode, not a register operand`);
    };

    const finish = () => {
      if (pending) diag(t, 'error', `trailing operand characters '${pending}'`);
    };

    const emit2 = (op: string, o1: Operand, o2: Operand, table?: number) => {
      const trytes = [digitValue(op) * 729 + slotMode(o1) * 27 + slotMode(o2)];
      const fixups: { at: number; label: string; tok: Token }[] = [];
      for (const o of [o1, o2]) {
        if (o.type === 'imm') trytes.push(norm(o.val));
        else if (o.type === 'mem' || o.type === 'addr') {
          fixups.push({ at: trytes.length, label: o.label, tok: o.tok });
          trytes.push(0);
        } else if (o.type === 'off') trytes.push(norm(o.reg * 729 + o.disp));
      }
      if (table !== undefined) trytes.push(norm(table));
      units.push({ kind: 'code', trytes, fixups, line: t.line, addr: 0 });
    };

    // Class 2 second slot: a literal tribble (-13..13).
    const literalTribble = (o: Operand | null): number => {
      if (!o) return 0;
      if (o.type === 'reg') return o.val;
      if (o.type === 'imm') {
        if (o.val >= -13 && o.val <= 13) return o.val;
        diag(o.tok, 'warning', `literal ${o.val} truncated to a tribble (-13..13)`);
        return ((((o.val + 13) % 27) + 27) % 27) - 13;
      }
      diag(o.tok, 'error', 'expected a tribble or small literal (-13..13)');
      return 0;
    };

    const emitClass2 = (op: string, o1: Operand, lit: number) => {
      if (o1.type === 'imm') diag(o1.tok, 'warning', 'destination operand is literal; write has no effect');
      emit2(op, o1, { type: 'reg', val: lit, tok: t });
    };

    if (opC === '_') {
      // Bare NOP written as a 1- or 2-character run (___ is the verbatim form).
      finish();
      units.push({ kind: 'code', trytes: [0], fixups: [], line: t.line, addr: 0 });
      return;
    }

    if (opC === 'J') {
      const o = pending ? null : stream.next();
      if (o?.kind === 'ident') {
        units.push({ kind: 'jump', label: o.text, tok: o, long: false, line: t.line, addr: 0 });
      } else if (o?.kind === 'numeric') {
        if (Math.abs(o.value) > 364) diag(o, 'error', 'relative jump offset out of range (-364..364)');
        units.push({ kind: 'code', trytes: [norm(digitValue('J') * 729 + norm(o.value))], fixups: [], line: t.line, addr: 0 });
      } else {
        diag(o ?? t, 'error', 'J requires a label or numeric offset (use verbatim J__ forms for register tricks)');
      }
      return;
    }

    if (opC === 'V' || opC === 'I' || opC === 'F') {
      const o1 = nextOperand();
      const o2 = nextOperand();
      if (!o1) return;
      checkReg(o1);
      emitClass2(opC, o1, literalTribble(o2));
      finish();
      return;
    }

    if (opC === 'T') {
      const o1 = nextOperand();
      const o2 = nextOperand();
      const o3 = nextOperand();
      if (!o1 || !o2 || !o3) return;
      if (o3.type !== 'imm') {
        diag(o3.tok, 'error', 'T requires a numeric truth table as its third operand');
        return;
      }
      if (o1.type === 'imm') diag(o1.tok, 'warning', 'destination operand is literal; write has no effect');
      checkReg(o1);
      checkReg(o2);
      emit2(opC, o1, o2, o3.val);
      finish();
      return;
    }

    if (TWO_OP.has(opC)) {
      const o1 = nextOperand();
      let o2 = nextOperand();
      if (!o1 || !o2) return;
      // C call targets: an ident names the routine, so resolve it to the
      // label's address as an immediate (like J targets), not a memory read.
      if (opC === 'C' && o2.type === 'mem') o2 = { type: 'addr', label: o2.label, tok: o2.tok };
      if (opC === 'D') {
        // D operands are raw register designators; no addressing modes exist.
        for (const o of [o1, o2])
          if (o.type !== 'reg') diag(o.tok, 'error', 'D operands must be registers (or _)');
        if (o1.type === 'reg' && o2.type === 'reg')
          units.push({ kind: 'code', trytes: [norm(digitValue('D') * 729 + o1.val * 27 + o2.val)], fixups: [], line: t.line, addr: 0 });
        finish();
        return;
      }
      // Small-literal compression: M a n -> V a n; A a n -> I a n.
      if ((opC === 'M' || opC === 'A') && o2.type === 'imm' && Math.abs(o2.val) <= 13) {
        emitClass2(opC === 'M' ? 'V' : 'I', o1, o2.val);
        finish();
        return;
      }
      if (o1.type === 'imm' && WRITES_SLOT1.has(opC))
        diag(o1.tok, 'warning', 'destination operand is literal; write has no effect');
      checkReg(o1);
      checkReg(o2);
      emit2(opC, o1, o2);
      finish();
      return;
    }

    diag(t, 'error', `unknown opcode '${opC}'`);
  }

  // --- main statement loop ---

  for (;;) {
    const t = stream.next();
    if (!t) break;
    if (t.kind === 'symbol') {
      if (t.text === '@') parseOrigin(t);
      else if (t.text === '$') stream.parseDeclaration(t);
      else diag(t, 'error', `unexpected '${t.text}'`);
    } else if (t.kind === 'ident') {
      parseIdentStatement(t);
    } else if (t.kind === 'numeric') {
      // Bare numerics emit data trytes.
      units.push({ kind: 'code', trytes: [norm(t.value)], fixups: [], line: t.line, addr: 0 });
    } else if (t.kind === 'tribble') {
      if (t.text.length >= 3) {
        if (t.text.length % 3 !== 0) {
          diag(t, 'error', 'verbatim tribble run length must be a multiple of 3');
        } else {
          const trytes = [];
          for (let i = 0; i < t.text.length; i += 3) trytes.push(fromTribbles(t.text.slice(i, i + 3)));
          units.push({ kind: 'code', trytes, fixups: [], line: t.line, addr: 0 });
        }
      } else {
        parseInstruction(t);
      }
    } else {
      diag(t, 'error', `unexpected ${t.kind} '${t.text}'`);
    }
  }

  // --- duplicate label check ---

  const seen = new Set<string>();
  for (const u of units) {
    if (u.kind !== 'label') continue;
    if (seen.has(u.name)) diag(u.tok, 'error', `duplicate label '${u.name}'`);
    seen.add(u.name);
  }

  // --- layout with jump relaxation (short jumps grow monotonically to long) ---

  const labels = new Map<string, number>();
  let end = DEFAULT_ORG;
  for (let iter = 0; ; iter++) {
    labels.clear();
    let addr = DEFAULT_ORG;
    for (const u of units) {
      if (u.kind === 'org') addr = u.target;
      else if (u.kind === 'buffer') addr = norm(addr + u.size);
      else if (u.kind === 'label') labels.set(u.name, addr);
      else if (u.kind === 'code') {
        u.addr = addr;
        addr = norm(addr + u.trytes.length);
      } else {
        u.addr = addr;
        addr = norm(addr + (u.long ? 2 : 1));
      }
    }
    end = addr;
    let changed = false;
    for (const u of units) {
      if (u.kind !== 'jump' || u.long) continue;
      const target = labels.get(u.label);
      if (target === undefined) continue;
      if (Math.abs(norm(target - u.addr - 1)) > 364) {
        u.long = true;
        changed = true;
      }
    }
    if (!changed || iter > units.length) break;
  }

  // --- emission ---

  const cells = new Map<number, number>();
  const lineMap = new Map<number, number>();
  const pendingSet = new Set<string>();

  const resolve = (label: string, tok: Token): number => {
    const v = labels.get(label);
    if (v !== undefined) return v;
    if (opts.allowPending) {
      pendingSet.add(label);
      diag(tok, 'warning', `unresolved label '${label}' (pending)`);
    } else {
      diag(tok, 'error', `undefined label '${label}'`);
    }
    return 0;
  };

  const writeCell = (addr: number, v: number, line: number) => {
    addr = norm(addr);
    if (cells.has(addr))
      diagnostics.push({ severity: 'warning', message: `overlapping emission at address ${addr}`, line, col: 1 });
    cells.set(addr, norm(v));
    if (line > 0) lineMap.set(addr, line);
  };

  for (const u of units) {
    if (u.kind === 'code') {
      const trytes = [...u.trytes];
      for (const f of u.fixups) trytes[f.at] = resolve(f.label, f.tok);
      trytes.forEach((v, i) => writeCell(u.addr + i, v, u.line));
    } else if (u.kind === 'jump') {
      const target = resolve(u.label, u.tok);
      if (u.long) {
        writeCell(u.addr, fromTribbles('MP_'), u.line);
        writeCell(u.addr + 1, target, u.line);
      } else {
        writeCell(u.addr, norm(digitValue('J') * 729 + norm(target - u.addr - 1)), u.line);
      }
    }
  }

  // --- coalesce contiguous cells into chunks ---

  const chunks: Chunk[] = [];
  for (const addr of [...cells.keys()].sort((a, b) => a - b)) {
    const last = chunks[chunks.length - 1];
    if (last && last.addr + last.data.length === addr) last.data.push(cells.get(addr)!);
    else chunks.push({ addr, data: [cells.get(addr)!] });
  }

  return { chunks, labels, lineMap, diagnostics, pending: [...pendingSet], end };
}

/**
 * Incremental assembly session for the REPL: lines accumulate, the whole
 * source is re-assembled per line, and the diff against the previous state is
 * reported (so forward references patch when their label is later defined).
 * Lines that introduce errors are not committed.
 */
export class Session {
  private lines: string[] = [];
  private cells = new Map<number, number>();
  lastResult: AssembleResult | null = null;

  feed(line: string): {
    committed: boolean;
    writes: { addr: number; value: number }[];
    diagnostics: Diagnostic[];
    result: AssembleResult;
  } {
    const result = assemble([...this.lines, line].join('\n'), { allowPending: true });
    const hasErrors = result.diagnostics.some((d) => d.severity === 'error');
    if (hasErrors) return { committed: false, writes: [], diagnostics: result.diagnostics, result };

    const newCells = new Map<number, number>();
    for (const c of result.chunks) c.data.forEach((v, i) => newCells.set(norm(c.addr + i), v));
    const writes: { addr: number; value: number }[] = [];
    for (const [a, v] of newCells) if (this.cells.get(a) !== v) writes.push({ addr: a, value: v });
    writes.sort((x, y) => x.addr - y.addr);

    this.lines.push(line);
    this.cells = newCells;
    this.lastResult = result;
    return { committed: true, writes, diagnostics: result.diagnostics, result };
  }
}
