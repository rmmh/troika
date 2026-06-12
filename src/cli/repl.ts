// Interactive assembler REPL: each line assembles immediately into a live
// machine; dot-commands inspect and run it.

import * as readline from 'node:readline';
import { DEFAULT_ORG, Session } from '../asm/assemble';
import { disassemble } from '../core/disasm';
import { Machine, REG_P, REG_S } from '../core/machine';
import { VRAM_BASE, VRAM_COLS, VRAM_ROWS } from '../core/display';
import { DIGITS, fromTribbles, toTribbles } from '../core/tryte';

let session = new Session();
let machine = new Machine();

const breakpoints = new Set<number>();
const traces: { lo: number; hi: number }[] = [];
const watches = new Set<number>();

function resetMachine(): void {
  machine.reset();
  machine.poke(REG_P, DEFAULT_ORG);
  machine.poke(REG_S, fromTribbles('_ZZ'));
}

// Parse an address token: single register tribble (A), 3-char tribbles (AAA),
// decimal, label, or label±offset.
function parseAddr(s: string): number | null {
  if (/^[A-Z_]{3}$/.test(s)) return fromTribbles(s);
  if (/^[A-Z_]$/.test(s)) return DIGITS.indexOf(s) - 13; // register address
  const dec = parseInt(s, 10);
  if (!Number.isNaN(dec)) return dec;
  const m = s.match(/^([a-z][a-zA-Z0-9_]*)([+-]\d+)?$/);
  if (m) {
    const addr = session.lastResult?.labels.get(m[1]!);
    if (addr === undefined) return null;
    return addr + (m[2] ? parseInt(m[2], 10) : 0);
  }
  return null;
}

function fmt(v: number): string {
  return `${toTribbles(v)} (${v})`;
}

// Reverse label map: address → name (shortest name wins on collision).
function reverseLabels(): Map<number, string> {
  const map = new Map<number, string>();
  const labels = session.lastResult?.labels;
  if (!labels) return map;
  for (const [name, addr] of labels) {
    const existing = map.get(addr);
    if (!existing || name.length < existing.length) map.set(addr, name);
  }
  return map;
}

// Convert a tryte value to an RGB triple (0-255 each).
function tribyteColor(v: number): [number, number, number] {
  const t = v + 9841;
  const r = Math.floor(t / 729);
  const g = Math.floor(t / 27) % 27;
  const b = t % 27;
  return [Math.round((r * 255) / 26), Math.round((g * 255) / 26), Math.round((b * 255) / 26)];
}

function showRegs(): void {
  const rows: string[] = [];
  for (let i = 0; i < 9; i++) {
    const cells = [];
    for (let j = 0; j < 3; j++) {
      const idx = i + j * 9 - 13;
      cells.push(`${DIGITS[idx + 13]}: ${fmt(machine.read(idx)).padEnd(16)}`);
    }
    rows.push(cells.join(' '));
  }
  console.log(rows.join('\n'));
  console.log(`cycles: ${machine.cycles}${machine.sleep ? ' (sleeping)' : ''}`);
}

function showMem(addr: number, len: number): void {
  for (let row = 0; row < len; row += 9) {
    const cells = [];
    for (let i = row; i < Math.min(row + 9, len); i++) cells.push(toTribbles(machine.read(addr + i)));
    console.log(`${toTribbles(addr + row)}: ${cells.join(' ')}`);
  }
}

function showDis(addr: number, count: number): void {
  const read = (a: number) => machine.read(a);
  const lblMap = reverseLabels();
  for (let i = 0; i < count; i++) {
    const lbl = lblMap.get(addr);
    if (lbl) console.log(`${lbl}:`);
    const d = disassemble(read, addr);
    const raw = Array.from({ length: d.length }, (_, k) => toTribbles(machine.read(addr + k))).join(' ');
    const marker = addr === machine.read(REG_P) ? '=>' : '  ';
    console.log(`${marker} ${toTribbles(addr)}  ${raw.padEnd(12)}  ${d.text}`);
    addr += d.length;
  }
}

// Dump one or more rows of VRAM as ANSI 24-bit color using half-block chars.
// Each terminal row shows two pixel rows (▀ = upper fg / lower bg).
function showScreenshot(firstRow: number, lastRow: number): void {
  const HALF = '▀'; // ▀
  const RESET = '\x1b[0m';
  // Clamp to valid display range.
  firstRow = Math.max(0, Math.min(firstRow, VRAM_ROWS - 1));
  lastRow = Math.max(firstRow, Math.min(lastRow, VRAM_ROWS - 1));

  for (let r = firstRow; r <= lastRow; r += 2) {
    let line = '';
    for (let c = 0; c < VRAM_COLS; c++) {
      const [tr, tg, tb] = tribyteColor(machine.read(VRAM_BASE + r * VRAM_COLS + c));
      const hasLower = r + 1 <= lastRow;
      const [br, bg, bb] = hasLower
        ? tribyteColor(machine.read(VRAM_BASE + (r + 1) * VRAM_COLS + c))
        : [0, 0, 0];
      line += `\x1b[38;2;${tr};${tg};${tb}m\x1b[48;2;${br};${bg};${bb}m${HALF}`;
    }
    console.log(line + RESET);
  }
}

function inTrace(pc: number): boolean {
  return traces.some((t) => pc >= t.lo && pc <= t.hi);
}

function runSteps(n: number, stopAt?: number): void {
  const before = machine.cycles;
  // Snapshot watch addresses before run.
  const watchSnap = new Map<number, number>();
  for (const a of watches) watchSnap.set(a, machine.read(a));

  for (let i = 0; i < n && !machine.sleep; i++) {
    const pc = machine.read(REG_P);
    if (i > 0 && breakpoints.has(pc)) {
      console.log(`breakpoint hit at ${fmt(pc)}`);
      showDis(pc, 1);
      break;
    }
    if (stopAt !== undefined && i > 0 && pc === stopAt) {
      console.log(`reached ${fmt(pc)}`);
      showDis(pc, 1);
      break;
    }
    if (inTrace(pc)) {
      process.stdout.write(`[${machine.cycles}] `);
      showDis(pc, 1);
    }
    machine.step();

    // Report watch changes after each step.
    for (const [a, prev] of watchSnap) {
      const cur = machine.read(a);
      if (cur !== prev) {
        console.log(`watch ${fmt(a)}: ${fmt(prev)} → ${fmt(cur)}  (cycle ${machine.cycles})`);
        watchSnap.set(a, cur);
      }
    }
  }
  console.log(`PC=${fmt(machine.read(REG_P))}  +${machine.cycles - before} cycles${machine.sleep ? ' (sleeping)' : ''}`);
}

function listBreakpoints(): void {
  if (breakpoints.size === 0) { console.log('no breakpoints'); return; }
  for (const a of breakpoints) console.log(`  break ${fmt(a)}`);
}

function listTraces(): void {
  if (traces.length === 0) { console.log('no traces'); return; }
  for (const t of traces) {
    if (t.lo === t.hi) console.log(`  trace ${fmt(t.lo)}`);
    else console.log(`  trace ${fmt(t.lo)} .. ${fmt(t.hi)}`);
  }
}

function listWatches(): void {
  if (watches.size === 0) { console.log('no watches'); return; }
  for (const a of watches) console.log(`  watch ${fmt(a)} = ${fmt(machine.read(a))}`);
}

function handleCommand(line: string): void {
  const [cmd, ...args] = line.split(/\s+/);
  switch (cmd) {
    case '.help':
      console.log(
        [
          'Type assembly to assemble at the cursor and write it into the machine.',
          '  .step [n]               execute n instructions (default 1)',
          '  .run [n]                execute n instructions (default 1000)',
          '  .until <addr>           run until PC reaches addr (label±offset ok)',
          '  .regs                   show registers and cycle count',
          '  .mem <addr> [n]         dump n trytes (addr is decimal, tribbles, or label)',
          '  .dis [addr] [n]         disassemble with label markers (default: around PC)',
          '  .labels                 list all assembled labels',
          '  .org <addr>             move the assembly cursor (shorthand for @addr)',
          '  .reset                  clear machine, session, and all debug state',
          '  .break [addr | clear]   toggle/list/clear breakpoints (label±offset ok)',
          '  .trace [addr[,addr2] | clear]',
          '                          add/list/clear trace ranges; prints each',
          '                          instruction as it executes (label±offset ok)',
          '  .watch [addr | clear]   toggle/list/clear memory watches; reports',
          '                          changes during .run/.step (label±offset ok)',
          '  .screenshot [page]      ANSI color dump of display VRAM (page 0-8,',
          '                          9 rows each; default: all 81 rows)',
        ].join('\n'),
      );
      break;
    case '.step':
      runSteps(args[0] ? parseInt(args[0], 10) : 1);
      break;
    case '.run':
      runSteps(args[0] ? parseInt(args[0], 10) : 1000);
      break;
    case '.until': {
      if (!args[0]) { console.log('usage: .until <addr>'); break; }
      const addr = parseAddr(args[0]);
      if (addr === null) { console.log(`unknown label or bad address: ${args[0]}`); break; }
      runSteps(10_000_000, addr);
      break;
    }
    case '.regs':
      showRegs();
      break;
    case '.mem': {
      const addr = args[0] !== undefined ? parseAddr(args[0]) : null;
      if (addr === null) console.log('usage: .mem <addr> [len]');
      else showMem(addr, args[1] ? parseInt(args[1], 10) : 27);
      break;
    }
    case '.dis': {
      const addr = args[0] !== undefined ? parseAddr(args[0]) : machine.read(REG_P);
      if (addr === null) console.log('bad address');
      else showDis(addr, args[1] ? parseInt(args[1], 10) : 8);
      break;
    }
    case '.labels': {
      const labels = session.lastResult?.labels;
      if (!labels || labels.size === 0) { console.log('no labels'); break; }
      const sorted = [...labels.entries()].sort((a, b) => a[1] - b[1]);
      for (const [name, addr] of sorted) console.log(`  ${toTribbles(addr).padEnd(6)} ${addr.toString().padStart(6)}  ${name}`);
      break;
    }
    case '.org': {
      const addr = args[0] !== undefined ? parseAddr(args[0]) : null;
      if (addr === null) console.log('usage: .org <addr>');
      else assembleLine(`@${addr}`);
      break;
    }
    case '.reset':
      session = new Session();
      resetMachine();
      breakpoints.clear();
      traces.length = 0;
      watches.clear();
      console.log('reset.');
      break;
    case '.break': {
      if (!args[0]) { listBreakpoints(); break; }
      if (args[0] === 'clear') { breakpoints.clear(); console.log('breakpoints cleared.'); break; }
      const addr = parseAddr(args[0]);
      if (addr === null) { console.log(`unknown label or bad address: ${args[0]}`); break; }
      if (breakpoints.has(addr)) { breakpoints.delete(addr); console.log(`breakpoint removed at ${fmt(addr)}`); }
      else { breakpoints.add(addr); console.log(`breakpoint set at ${fmt(addr)}`); }
      break;
    }
    case '.trace': {
      if (!args[0]) { listTraces(); break; }
      if (args[0] === 'clear') { traces.length = 0; console.log('traces cleared.'); break; }
      const parts = args[0].split(',');
      const lo = parseAddr(parts[0]!);
      if (lo === null) { console.log(`unknown label or bad address: ${parts[0]}`); break; }
      const hi = parts[1] !== undefined ? parseAddr(parts[1]) : lo;
      if (hi === null) { console.log(`unknown label or bad address: ${parts[1]}`); break; }
      traces.push({ lo: Math.min(lo, hi), hi: Math.max(lo, hi) });
      if (lo === hi) console.log(`trace set at ${fmt(lo)}`);
      else console.log(`trace set ${fmt(Math.min(lo, hi))} .. ${fmt(Math.max(lo, hi))}`);
      break;
    }
    case '.watch': {
      if (!args[0]) { listWatches(); break; }
      if (args[0] === 'clear') { watches.clear(); console.log('watches cleared.'); break; }
      const addr = parseAddr(args[0]);
      if (addr === null) { console.log(`unknown label or bad address: ${args[0]}`); break; }
      if (watches.has(addr)) { watches.delete(addr); console.log(`watch removed at ${fmt(addr)}`); }
      else { watches.add(addr); console.log(`watch set at ${fmt(addr)} = ${fmt(machine.read(addr))}`); }
      break;
    }
    case '.screenshot': {
      if (args[0] !== undefined) {
        const page = parseInt(args[0], 10);
        if (Number.isNaN(page) || page < 0 || page > 8) { console.log('usage: .screenshot [page 0-8]'); break; }
        showScreenshot(page * 9, page * 9 + 8);
      } else {
        showScreenshot(0, VRAM_ROWS - 1);
      }
      break;
    }
    default:
      console.log(`unknown command ${cmd} (try .help)`);
  }
}

function assembleLine(line: string): void {
  const res = session.feed(line);
  for (const d of res.diagnostics) {
    if (d.severity === 'error' || res.committed) {
      console.log(`${d.severity}: ${d.message} (line ${d.line})`);
    }
  }
  if (!res.committed) {
    console.log('(line not committed)');
    return;
  }
  for (const w of res.writes) machine.poke(w.addr, w.value);
  // Print contiguous runs of written trytes.
  let i = 0;
  while (i < res.writes.length) {
    let j = i;
    while (j + 1 < res.writes.length && res.writes[j + 1]!.addr === res.writes[j]!.addr + 1) j++;
    const run = res.writes.slice(i, j + 1);
    console.log(`${toTribbles(run[0]!.addr)}: ${run.map((w) => toTribbles(w.value)).join(' ')}`);
    i = j + 1;
  }
}

resetMachine();
console.log('Troika interactive assembler. Type .help for commands.');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'troika> ' });
rl.prompt();
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed === 'quit' || trimmed === 'exit') {
    rl.close();
    return;
  }
  try {
    if (trimmed.startsWith('.')) handleCommand(trimmed);
    else if (trimmed) assembleLine(trimmed);
  } catch (e) {
    console.log(`error: ${e instanceof Error ? e.message : e}`);
  }
  rl.prompt();
});
rl.on('close', () => process.exit(0));
