import { useEffect, useState } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { REG_P } from '../../core/machine';
import { disassemble, describeInsn } from '../../core/disasm';
import { fromTribbles, fromTrits, norm, toTribbles, toTrits } from '../../core/tryte';

function parseValue(s: string): number | null {
  s = s.trim();
  if (/^[A-Z_]{3}$/.test(s)) return fromTribbles(s);
  if (/^#[T01]{1,9}$/.test(s)) return fromTrits(s.slice(1));
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? norm(n) : null;
}

export function Inspector({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const [text, setText] = useState('');
  const addr = emu.selected;
  useEffect(() => setText(''), [addr]);
  const parsed = parseValue(text);
  const invalid = text.trim() !== '' && parsed === null;
  if (addr === null) {
    return (
      <section class="panel inspector">
        <h2>Inspector</h2>
        <p class="hint">Click a memory cell or register to inspect it.</p>
      </section>
    );
  }
  const v = emu.machine.inspect(addr);
  const insn = disassemble((a) => emu.machine.inspect(a), addr);
  const meaning = describeInsn(insn.text);
  const cycles = emu.machine.cycleBoundsAt(addr);
  const cyclesText = cycles.min === cycles.max ? cycles.min.toLocaleString() : `${cycles.min.toLocaleString()}-${cycles.max.toLocaleString()}`;

  const commit = () => {
    if (parsed !== null) {
      emu.machine.poke(addr, parsed);
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
        <div class="insn-meaning">
          <div class="insn-raw">{insn.text}</div>
          {meaning && <div class="insn-desc">{meaning}</div>}
          <div class="insn-cycles">Cycles: {cyclesText}</div>
        </div>
      </div>
      <div class="row">
        <input
          type="text"
          placeholder="new value: 42, #T01, or ABC"
          aria-label="New memory value"
          aria-invalid={invalid}
          aria-describedby={invalid ? 'memory-value-error' : undefined}
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <button onClick={commit} disabled={parsed === null}>Write</button>
      </div>
      {invalid && (
        <p class="hint" id="memory-value-error" role="alert">
          Enter a safe decimal integer, 1–9 trits prefixed with #, or three tribbles (ABC).
        </p>
      )}
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
