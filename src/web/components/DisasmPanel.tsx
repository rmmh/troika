import { useRef } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { disassemble } from '../../core/disasm';
import { REG_P } from '../../core/machine';
import { norm, toTribbles } from '../../core/tryte';

const ROWS = 20;

interface Row {
  addr: number;
  raw: string;
  text: string;
}

export function DisasmPanel({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const m = emu.machine;
  const pc = m.read(REG_P);
  const anchor = useRef(pc);
  const read = (a: number) => m.read(a);

  const listing = (start: number): Row[] => {
    const rows: Row[] = [];
    let a = start;
    for (let i = 0; i < ROWS; i++) {
      const d = disassemble(read, a);
      const raw = Array.from({ length: d.length }, (_, k) => toTribbles(m.read(a + k))).join(' ');
      rows.push({ addr: a, raw, text: d.text });
      a = norm(a + d.length);
    }
    return rows;
  };

  // Keep the window stable while PC moves within it; otherwise re-anchor.
  let rows = listing(anchor.current);
  if (!rows.some((r) => r.addr === pc)) {
    anchor.current = pc;
    rows = listing(pc);
  }

  const labelAt = (addr: number): string | null => {
    for (const [name, a] of emu.labels) if (a === addr) return name;
    return null;
  };

  return (
    <section class="panel disasm">
      <h2>Disassembly</h2>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.addr}
              class={(r.addr === pc ? 'current ' : '') + (emu.breakpoints.has(r.addr) ? 'bp' : '')}
              onClick={() => emu.toggleBreakpoint(r.addr)}
              title="click to toggle breakpoint"
            >
              <td class="gutter">{emu.breakpoints.has(r.addr) ? '●' : r.addr === pc ? '▶' : ''}</td>
              <td class="addr">{toTribbles(r.addr)}</td>
              <td class="raw">{r.raw}</td>
              <td class="text">
                {r.text}
                {labelAt(r.addr) ? <span class="label-tag"> {labelAt(r.addr)}:</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
