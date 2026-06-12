import { useState } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { REG_P } from '../../core/machine';
import { disassemble, describeInsn } from '../../core/disasm';
import { fromTribbles, fromTrits, norm, toTribbles, toTrits } from '../../core/tryte';

function parseValue(s: string): number | null {
  s = s.trim();
  if (/^[A-Z_]{3}$/.test(s)) return fromTribbles(s);
  if (/^#[T01]+$/.test(s)) return fromTrits(s.slice(1));
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : norm(n);
}

export function Inspector({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const [text, setText] = useState('');
  const addr = emu.selected;
  if (addr === null) {
    return (
      <section class="panel inspector">
        <h2>Inspector</h2>
        <p class="hint">Click a memory cell or register to inspect it.</p>
      </section>
    );
  }
  const v = emu.machine.read(addr);
  const insn = disassemble((a) => emu.machine.read(a), addr);
  const meaning = describeInsn(insn.text);

  const commit = () => {
    const nv = parseValue(text);
    if (nv !== null) {
      emu.machine.poke(addr, nv);
      setText('');
      emu.notify();
    }
  };

  return (
    <section class="panel inspector">
      <h2>Inspector</h2>
      <div class="inspector-body">
        <table class="kv">
          <tbody>
            <tr>
              <td>address</td>
              <td><b>{toTribbles(addr)}</b> ({addr})</td>
            </tr>
            <tr>
              <td>value</td>
              <td><b>{toTribbles(v)}</b> ({v})</td>
            </tr>
            <tr>
              <td>trits</td>
              <td>{toTrits(v)}</td>
            </tr>
          </tbody>
        </table>
        {meaning && (
          <div class="insn-meaning">
            <div class="insn-raw">{insn.text}</div>
            <div class="insn-desc">{meaning}</div>
          </div>
        )}
      </div>
      <div class="row">
        <input
          type="text"
          placeholder="new value: 42, #T01, or ABC"
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <button onClick={commit}>Write</button>
      </div>
      <div class="row">
        <button onClick={() => (emu.machine.poke(REG_P, addr), emu.notify())}>Set PC here</button>
        <button onClick={() => emu.toggleBreakpoint(addr)}>
          {emu.breakpoints.has(addr) ? 'Clear breakpoint' : 'Set breakpoint'}
        </button>
        <button onClick={() => emu.select(null)}>Close</button>
      </div>
    </section>
  );
}
