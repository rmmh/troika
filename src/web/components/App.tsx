import { useRef, useState } from 'preact/hooks';
import { EmulatorController } from '../emulator';
import { Controls } from './Controls';
import { DisasmPanel } from './DisasmPanel';
import { EditorPanel } from './EditorPanel';
import { Inspector } from './Inspector';
import { MemoryCanvas } from './MemoryCanvas';
import { RegistersPanel } from './RegistersPanel';
import { WorldApp } from '../WorldApp';
import { SerialConsole } from './SerialConsole';

export function App({ emu }: { emu: EmulatorController }) {
  const [worldMode, setWorldMode] = useState(false);
  const [worldOpened, setWorldOpened] = useState(false);
  const [leftWidth, setLeftWidth] = useState(380);
  const [rightWidth, setRightWidth] = useState(420);
  const dragging = useRef<{ which: 'left' | 'right'; pointerId: number; element: HTMLElement } | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerDown = (which: 'left' | 'right') => (e: PointerEvent) => {
    if (e.button !== 0 || dragging.current) return;
    e.preventDefault();
    const element = e.currentTarget as HTMLElement;
    dragging.current = { which, pointerId: e.pointerId, element };
    startX.current = e.clientX;
    startW.current = which === 'left' ? leftWidth : rightWidth;
    element.focus();
    element.setPointerCapture(e.pointerId);
    element.classList.add('dragging');
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current || e.pointerId !== dragging.current.pointerId) return;
    const dx = e.clientX - startX.current;
    const newW = Math.max(200, startW.current + (dragging.current.which === 'left' ? dx : -dx));
    if (dragging.current.which === 'left') setLeftWidth(newW);
    else setRightWidth(newW);
  };

  const onPointerUp = (e: PointerEvent) => {
    const drag = dragging.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragging.current = null;
    drag.element.classList.remove('dragging');
    if (drag.element.hasPointerCapture(e.pointerId)) drag.element.releasePointerCapture(e.pointerId);
  };

  const onResizeKey = (which: 'left' | 'right') => (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault();
    const change = (e.key === 'ArrowRight' ? 1 : -1) * (which === 'left' ? 1 : -1) * (e.shiftKey ? 100 : 20);
    const resize = which === 'left' ? setLeftWidth : setRightWidth;
    resize(width => e.key === 'Home' ? 200 : Math.max(200, width + change));
  };

  return (
    <>
    {worldOpened && <div hidden={!worldMode}><WorldApp onDebugger={() => setWorldMode(false)} /></div>}
    <div class="app" style={worldMode ? "display: none" : undefined}>
      <Controls emu={emu} onWorld={() => { emu.pause(); setWorldOpened(true); setWorldMode(true); }} />
      <main onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp} onLostPointerCapture={onPointerUp}>
        <div id="editor-pane" class="col left" style={`flex: 0 0 ${leftWidth}px`}>
          <EditorPanel emu={emu} />
        </div>
        <div
          class="resize-handle"
          role="separator" tabIndex={0} aria-label="Editor pane width"
          aria-orientation="vertical" aria-controls="editor-pane"
          aria-valuemin={200} aria-valuenow={leftWidth}
          onPointerDown={onPointerDown('left')}
          onKeyDown={onResizeKey('left')}
          onDblClick={() => setLeftWidth(380)}
          title="Drag or use arrow keys to resize; double-click to reset"
        />
        <div class="col center">
          <MemoryCanvas emu={emu} />
          <Inspector emu={emu} />
          <SerialConsole emu={emu} />
        </div>
        <div
          class="resize-handle"
          role="separator" tabIndex={0} aria-label="Registers pane width"
          aria-orientation="vertical" aria-controls="registers-pane"
          aria-valuemin={200} aria-valuenow={rightWidth}
          onPointerDown={onPointerDown('right')}
          onKeyDown={onResizeKey('right')}
          onDblClick={() => setRightWidth(420)}
          title="Drag or use arrow keys to resize; double-click to reset"
        />
        <div id="registers-pane" class="col right" style={`flex: 0 0 ${rightWidth}px`}>
          <RegistersPanel emu={emu} />
          <DisasmPanel emu={emu} />
        </div>
      </main>
    </div>
    </>
  );
}
