import { useRef, useState } from 'preact/hooks';
import { EmulatorController } from '../emulator';
import { Controls } from './Controls';
import { DisasmPanel } from './DisasmPanel';
import { EditorPanel } from './EditorPanel';
import { Inspector } from './Inspector';
import { MemoryCanvas } from './MemoryCanvas';
import { RegistersPanel } from './RegistersPanel';

export function App({ emu }: { emu: EmulatorController }) {
  const [leftWidth, setLeftWidth] = useState(380);
  const [rightWidth, setRightWidth] = useState(420);
  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerDown = (which: 'left' | 'right') => (e: PointerEvent) => {
    dragging.current = which;
    startX.current = e.clientX;
    startW.current = which === 'left' ? leftWidth : rightWidth;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    (e.target as HTMLElement).classList.add('dragging');
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const newW = Math.max(200, startW.current + (dragging.current === 'left' ? dx : -dx));
    if (dragging.current === 'left') setLeftWidth(newW);
    else setRightWidth(newW);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = null;
    (e.target as HTMLElement).classList.remove('dragging');
  };

  return (
    <div class="app">
      <Controls emu={emu} />
      <main onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div class="col left" style={`flex: 0 0 ${leftWidth}px`}>
          <EditorPanel emu={emu} />
        </div>
        <div
          class="resize-handle"
          onPointerDown={onPointerDown('left')}
          title="drag to resize"
        />
        <div class="col center">
          <MemoryCanvas emu={emu} />
          <Inspector emu={emu} />
        </div>
        <div
          class="resize-handle"
          onPointerDown={onPointerDown('right')}
          title="drag to resize"
        />
        <div class="col right" style={`flex: 0 0 ${rightWidth}px`}>
          <RegistersPanel emu={emu} />
          <DisasmPanel emu={emu} />
        </div>
      </main>
    </div>
  );
}
