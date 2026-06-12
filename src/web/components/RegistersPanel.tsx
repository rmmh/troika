import { useEffect, useRef } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { DIGITS, toTribbles, toTrits } from '../../core/tryte';

export function RegistersPanel({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const m = emu.machine;
  const prev = useRef(new Int16Array(27));

  const rows = [];
  for (let idx = -13; idx <= 13; idx++) {
    const v = m.read(idx);
    const changed = v !== prev.current[idx + 13];
    rows.push(
      <tr
        key={idx}
        class={changed ? 'changed' : ''}
        onClick={() => emu.select(idx)}
        title="click to inspect"
      >
        <td class="reg-name">{DIGITS[idx + 13]}</td>
        <td class="tribbles">{toTribbles(v)}</td>
        <td class="num">{v}</td>
        <td class="trits">{toTrits(v)}</td>
      </tr>,
    );
  }

  useEffect(() => {
    for (let idx = -13; idx <= 13; idx++) prev.current[idx + 13] = m.read(idx);
  });

  return (
    <section class="panel registers">
      <h2>Registers</h2>
      <table>
        <thead>
          <tr>
            <th class="reg-name"></th>
            <th class="tribbles">0s</th>
            <th class="num">dec</th>
            <th class="trits">trits</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </section>
  );
}
