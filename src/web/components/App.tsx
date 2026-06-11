import { EmulatorController } from '../emulator';
import { Controls } from './Controls';
import { DisasmPanel } from './DisasmPanel';
import { EditorPanel } from './EditorPanel';
import { Inspector } from './Inspector';
import { MemoryCanvas } from './MemoryCanvas';
import { RegistersPanel } from './RegistersPanel';

export function App({ emu }: { emu: EmulatorController }) {
  return (
    <div class="app">
      <Controls emu={emu} />
      <main>
        <div class="col left">
          <EditorPanel emu={emu} />
        </div>
        <div class="col center">
          <MemoryCanvas emu={emu} />
          <Inspector emu={emu} />
        </div>
        <div class="col right">
          <RegistersPanel emu={emu} />
          <DisasmPanel emu={emu} />
        </div>
      </main>
    </div>
  );
}
