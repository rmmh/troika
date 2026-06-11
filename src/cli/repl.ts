// Interactive assembler REPL: each line assembles immediately into a live
// machine; dot-commands inspect and run it.

import * as readline from 'node:readline';
import { DEFAULT_ORG, Session } from '../asm/assemble';
import { disassemble } from '../core/disasm';
import { Machine, REG_P, REG_S } from '../core/machine';
import { DIGITS, fromTribbles, toTribbles, toTrits } from '../core/tryte';

let session = new Session();
let machine = new Machine();

function resetMachine(): void {
  machine.reset();
  machine.poke(REG_P, DEFAULT_ORG);
  machine.poke(REG_S, fromTribbles('_ZZ'));
}

function parseAddr(s: string): number | null {
  if (/^[A-Z_]{3}$/.test(s)) return fromTribbles(s);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function fmt(v: number): string {
  return `${toTribbles(v)} (${v})`;
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
  for (let i = 0; i < count; i++) {
    const d = disassemble(read, addr);
    const raw = Array.from({ length: d.length }, (_, k) => toTribbles(machine.read(addr + k))).join(' ');
    const marker = addr === machine.read(REG_P) ? '=>' : '  ';
    console.log(`${marker} ${toTribbles(addr)}  ${raw.padEnd(12)}  ${d.text}`);
    addr += d.length;
  }
}

function runSteps(n: number): void {
  const before = machine.cycles;
  for (let i = 0; i < n && !machine.sleep; i++) machine.step();
  console.log(`PC=${fmt(machine.read(REG_P))}  +${machine.cycles - before} cycles${machine.sleep ? ' (sleeping)' : ''}`);
}

function handleCommand(line: string): void {
  const [cmd, ...args] = line.split(/\s+/);
  switch (cmd) {
    case '.help':
      console.log(
        [
          'Type assembly to assemble at the cursor and write it into the machine.',
          '  .step [n]        execute n instructions (default 1)',
          '  .run [n]         execute n instructions (default 1000)',
          '  .regs            show registers and cycle count',
          '  .mem <addr> [n]  dump n trytes (addr is decimal or tribbles like _AA)',
          '  .dis [addr] [n]  disassemble (default: around PC)',
          '  .org <addr>      move the assembly cursor (shorthand for @addr)',
          '  .reset           clear the machine and the assembly session',
        ].join('\n'),
      );
      break;
    case '.step':
      runSteps(args[0] ? parseInt(args[0], 10) : 1);
      break;
    case '.run':
      runSteps(args[0] ? parseInt(args[0], 10) : 1000);
      break;
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
    case '.org': {
      const addr = args[0] !== undefined ? parseAddr(args[0]) : null;
      if (addr === null) console.log('usage: .org <addr>');
      else assembleLine(`@${addr}`);
      break;
    }
    case '.reset':
      session = new Session();
      resetMachine();
      console.log('reset.');
      break;
    default:
      console.log(`unknown command ${cmd} (try .help)`);
  }
}

function assembleLine(line: string): void {
  const res = session.feed(line);
  for (const d of res.diagnostics) {
    if (d.severity === 'error' || res.committed) {
      // After a successful commit only new warnings matter; keep it simple
      // and show errors always, warnings on commit.
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
