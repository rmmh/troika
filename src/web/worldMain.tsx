import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DISPLAY_PX } from '../core/display';
import { TEXT_KEYS, textKeyCell } from '../core/textKeyboard';
import { CHECKPOINT_BYTES } from '../world/checkpoint';
import type { WorldFrame, WorldInput, WorldOutput } from './worldProtocol';

function WorldApp() {
  const [generation, restart] = useState(0);
  const [frame, setFrame] = useState<WorldFrame | null>(null);
  const [failure, setFailure] = useState('');
  const [storageBusy, setStorageBusy] = useState(false);
  const [storageError, setStorageError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    setFrame(null); setFailure(''); setStorageBusy(false); setStorageError('');
    const instance = new Worker(new URL('./world-worker.js', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = ({ data }: MessageEvent<WorldOutput>) => {
      if (data.type === 'frame') setFrame(data);
      else if (data.type === 'storage') { setStorageBusy(data.busy); setStorageError(data.error ?? ''); }
      else {
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'application/octet-stream' }));
        const link = document.createElement('a'); link.href = url; link.download = 'troika-world.disks'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    };
    instance.onerror = event => { setFailure(event.message || 'The world worker stopped. Restart to try again.'); setStorageBusy(false); };
    return () => { instance.onmessage = null; instance.onerror = null; instance.terminate(); worker.current = null; };
  }, [generation]);
  useEffect(() => {
    if (!frame || !canvas.current) return;
    const context = canvas.current.getContext('2d');
    context?.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels), DISPLAY_PX, DISPLAY_PX), 0, 0);
  }, [frame]);
  function send(message: WorldInput) { worker.current?.postMessage(message); }
  async function restore(file: File | undefined) {
    if (!file) return;
    const current = worker.current;
    setStorageBusy(true); setStorageError('');
    try {
      if (file.size !== CHECKPOINT_BYTES) throw new Error('Invalid world disk checkpoint size');
      const buffer = await file.arrayBuffer();
      if (worker.current !== current) return;
      current?.postMessage({ type: 'load', buffer } satisfies WorldInput, [buffer]);
    } catch (error) {
      if (worker.current === current) { setStorageError(error instanceof Error ? error.message : String(error)); setStorageBusy(false); }
    }
  }
  function key(cell: number) { send({ type: 'keys', cells: [cell] }); canvas.current?.focus(); }
  const error = failure || frame?.error;
  const enabled = !!frame?.powered && !error && !storageBusy;
  return <div class="world-app">
    <header>
      <div><p class="eyebrow">TROIKA</p><h1>World</h1></div>
      <nav aria-label="World controls">
        <a href="./index.html">Machine debugger</a>
        <button disabled={!frame || !!error || storageBusy} onClick={() => send({ type: 'running', value: !frame?.running })}>{frame?.running ? 'Pause' : 'Resume'}</button>
        <button disabled={storageBusy} onClick={() => restart(value => value + 1)}>Restart with fresh disks</button>
      </nav>
    </header>
    <main>
      <section class="display-panel" aria-label="World display">
        <div class="screen-status"><span role="status">{error ? 'Stopped' : frame?.status ?? 'Assembling world'}</span><span data-testid="world-cycles">{frame?.cycles.toLocaleString() ?? '0'} cycles</span></div>
        <canvas ref={canvas} width={DISPLAY_PX} height={DISPLAY_PX} tabIndex={0} aria-label="World display keyboard input"
          onPointerDown={() => canvas.current?.focus()}
          onKeyDown={event => {
            if (event.key === 'Escape') { canvas.current?.blur(); return; }
            if (!enabled) return;
            const cell = textKeyCell(event);
            if (cell === null) return;
            event.preventDefault(); event.stopPropagation(); key(cell);
          }} />
        {error && <p role="alert">{error}</p>}
        <details><summary>Screen text</summary><pre data-testid="world-screen">{frame?.text ?? ''}</pre></details>
      </section>
      <aside>
        <h2>Explore the network</h2>
        <p>Visit the BBS, reply to forum topics, play a game, or publish and download files.</p>
        <p>Click the display to type. Tab selects a link or field; Enter activates it. Escape releases the keyboard.</p>
        <div class="key-buttons">
          {[[TEXT_KEYS.previous, 'Previous'], [TEXT_KEYS.next, 'Next'], [TEXT_KEYS.activate, 'Enter'], [TEXT_KEYS.backspace, 'Backspace'], [TEXT_KEYS.home, 'F1 · Home'], [TEXT_KEYS.console, 'F2 · Console'], [TEXT_KEYS.download, 'F3 · Download']].map(([cell, label]) =>
            <button key={cell} disabled={!enabled} onClick={() => key(Number(cell))}>{label}</button>)}
        </div>
        <h2>File console</h2>
        <p><code>dir /</code> lists local files. <code>open http://files.world/</code> visits the archive. Press Enter to run a command.</p>
        <p><code>copy /a /b</code> copies a file. <code>ren /a newname</code> renames a file or directory within its parent.</p>
        <p>F3 prepares the selected link for download. Append a destination such as <code>/copy</code>, then press Enter.</p>
        <h2>Keep your disks</h2>
        <div class="key-buttons">
          <button disabled={!enabled} onClick={() => { setStorageBusy(true); setStorageError(''); send({ type: 'save' }); }}>Save disks</button>
          <button disabled={!frame || storageBusy || !!failure} onClick={() => fileInput.current?.click()}>Restore disks</button>
          <input ref={fileInput} type="file" hidden aria-label="Disk checkpoint" accept=".disks" onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restore(file);
          }} />
        </div>
        {storageBusy && <p>Preparing disks…</p>}
        {storageError && <p role="alert">{storageError}</p>}
        <p class="session-note">Save disks keeps local files, forum posts and shared files in one download. Restore replaces this session and cold-boots those disks. Use the same Troika build. Unsaved changes are lost when restarting or closing this page.</p>
      </aside>
    </main>
  </div>;
}
render(<WorldApp />, document.getElementById('app')!);
