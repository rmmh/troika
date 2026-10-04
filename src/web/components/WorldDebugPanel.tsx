import { useEffect, useState } from 'preact/hooks';
import { EmulatorController } from '../emulator';
import type { WorldFrame } from '../worldProtocol';
import { MemoryCanvas } from './MemoryCanvas';
import { Inspector } from './Inspector';
import { RegistersPanel } from './RegistersPanel';
import { DisasmPanel } from './DisasmPanel';

/** A view of worker-owned memory; this controller never executes instructions. */
export function WorldDebugPanel({ frame, machine, onMachine }: {
  frame: WorldFrame | null; machine: string; onMachine: (machine: string) => void;
}) {
  const [emu] = useState(() => new EmulatorController(false));
  const snapshot = frame?.inspection;
  useEffect(() => {
    if (!snapshot || snapshot.machine !== machine) return;
    emu.machine.mem.set(new Int16Array(snapshot.memory));
    emu.machine.cycles = snapshot.cycles;
    emu.labels = new Map(snapshot.labels);
    emu.notify();
  }, [snapshot, machine, emu]);
  const names = snapshot?.machines ?? ['client', 'server', 'archive', 'door', 'telnet', 'dhcp', 'dns', 'router'];
  return <>
    <p><label>World machine <select value={machine} onChange={event => onMachine(event.currentTarget.value)}>
      {names.map(name => <option key={name} value={name}>{name}</option>)}
    </select></label></p>
    <p>Read-only live memory, registers and disassembly. Pause the world for a stable snapshot.
      {' '}Machine cycles: <span data-testid="inspection-cycles">{snapshot?.machine === machine ? snapshot.cycles.toLocaleString() : 'Waiting…'}</span>.</p>
    {snapshot?.machine === machine && <p>CPU state: {snapshot.sleep
      ? snapshot.sleep.remaining === Infinity ? 'waiting for an interrupt' : 'sleeping with a timer'
      : 'ready to execute'}.</p>}
    {snapshot?.machine === machine && <div class="world-debug-grid">
      <div><MemoryCanvas emu={emu} memoryOnly /><Inspector emu={emu} readOnly /></div>
      <div><RegistersPanel emu={emu} /><DisasmPanel emu={emu} readOnly /></div>
    </div>}
  </>;
}
