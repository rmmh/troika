import { EmulatorController, useEmulator } from '../emulator';
import { REG_P } from '../../core/machine';
import { CLOCK_HZ, toTribbles } from '../../core/tryte';

export function Controls({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const m = emu.machine;
  const pc = m.read(REG_P);
  const exp = Math.log10(emu.speed);

  const setSpeed = (e: Event) => {
    emu.speed = Math.round(10 ** Number((e.target as HTMLInputElement).value));
    emu.notify();
  };

  return (
    <header class="controls">
      <button class="primary" onClick={() => (emu.running ? emu.pause() : emu.start())}>
        {emu.running ? '⏸ Pause' : '▶ Run'}
      </button>
      <button onClick={() => emu.step()} disabled={emu.running}>
        Step
      </button>
      <button onClick={() => emu.reset()}>Reset</button>
      <span class="speed">
        <input
          type="range"
          min="0"
          max="6.5"
          step="0.01"
          value={exp}
          onInput={setSpeed}
          title="emulation speed"
        />
        <button class="mini" onClick={() => ((emu.speed = CLOCK_HZ), emu.notify())} title="real time: 3^12 Hz">
          1×
        </button>
        <span class="speed-label">
          {emu.speed === CLOCK_HZ ? '3¹² Hz (real-time)' : `${emu.speed.toLocaleString()} Hz`}
        </span>
      </span>
      <span class="readout">
        PC <b>{toTribbles(pc)}</b> ({pc})
      </span>
      <span class="readout">
        cycles <b>{m.cycles.toLocaleString()}</b> ({(m.cycles / CLOCK_HZ).toFixed(3)}s)
      </span>
      <span class="status">{emu.status}</span>
    </header>
  );
}
