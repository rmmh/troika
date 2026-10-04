import { MAX_SNAPSHOT_BYTES } from '../world/snapshot';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DISPLAY_PX } from '../core/display';
import { TEXT_KEYS, textKeyCell } from '../core/textKeyboard';
import { CHECKPOINT_BYTES, PROGRAM_CHECKPOINT_BYTES } from '../world/checkpoint';
import { WorldChat } from './components/WorldChat';
import { WorldDebugPanel } from './components/WorldDebugPanel';
import type { WorldFrame, WorldInput, WorldOutput } from './worldProtocol';

export function WorldApp({ onDebugger }: { onDebugger?: () => void }) {
  const [generation, restart] = useState(0);
  const [frame, setFrame] = useState<WorldFrame | null>(null);
  const [failure, setFailure] = useState('');
  const [storageBusy, setStorageBusy] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [machine, setMachine] = useState('client');
  const focusDisplay = useRef<HTMLButtonElement>(null);
  const snapshotInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    setFrame(null); setFailure(''); setStorageBusy(false); setStorageError('');
    const workerUrl = new URL('./world-worker.js', import.meta.url);
    if (new URLSearchParams(location.search).get('npc') === '1') workerUrl.searchParams.set('npc','1');
    const instance = new Worker(workerUrl, { type: 'module' });
    worker.current = instance;
    instance.onmessage = ({ data }: MessageEvent<WorldOutput>) => {
      if (data.type === 'frame') setFrame(data);
      else if (data.type === 'storage') { setStorageBusy(data.busy); setStorageError(data.error ?? ''); }
      else {
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'application/octet-stream' }));
        const link = document.createElement('a'); link.href = url; link.download = data.type === 'snapshot' ? 'troika-world.snapshot' : 'troika-world.disks'; link.click();
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
  useEffect(() => { send({ type: 'inspect', machine: inspecting ? machine : null }); }, [inspecting, machine, generation]);
  async function restore(file: File | undefined, snapshot = false) {
    if (!file) return;
    const current = worker.current;
    setStorageBusy(true); setStorageError('');
    try {
      if (snapshot ? (!file.size || file.size > MAX_SNAPSHOT_BYTES) : file.size !== CHECKPOINT_BYTES && file.size !== PROGRAM_CHECKPOINT_BYTES) throw new Error(snapshot ? 'Invalid snapshot file size' : 'Invalid world disk checkpoint size');
      const buffer = await file.arrayBuffer();
      if (worker.current !== current) return;
      current?.postMessage({ type: snapshot ? 'load-snapshot' : 'load', buffer } satisfies WorldInput, [buffer]);
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
        <a href="./index.html" onClick={onDebugger ? event => { event.preventDefault(); onDebugger(); } : undefined}>Machine debugger</a>
        <a href={new URLSearchParams(location.search).get('npc') === '1' ? './world.html' : './world.html?npc=1'}>Fresh world {new URLSearchParams(location.search).get('npc') === '1' ? 'without' : 'with'} NPC</a>
        <button disabled={!frame || !!error || storageBusy} onClick={() => send({ type: 'running', value: !frame?.running })}>{frame?.running ? 'Pause' : 'Resume'}</button>
        <button disabled={storageBusy} onClick={() => restart(value => value + 1)}>Restart with fresh disks</button>
      </nav>
    </header>
    <main>
      <section class="display-panel" aria-label="World display">
        <div class="screen-status"><span role="status">{error ? 'Stopped' : frame?.status ?? 'Assembling world'}</span><span data-testid="world-cycles">{frame?.cycles.toLocaleString() ?? '0'} cycles</span></div>
        <button ref={focusDisplay} disabled={!enabled} onClick={() => canvas.current?.focus()}>Focus display</button>
        <p id="world-keyboard-help">Tab and Shift+Tab select guest controls. Enter activates them. Escape returns to Focus display.</p>
        <canvas ref={canvas} width={DISPLAY_PX} height={DISPLAY_PX} tabIndex={-1} aria-label="World display keyboard input" aria-describedby="world-keyboard-help"
          onPointerDown={() => canvas.current?.focus()}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); focusDisplay.current?.focus(); return; }
            if (!enabled) return;
            const cell = textKeyCell(event);
            if (cell === null) return;
            event.preventDefault(); event.stopPropagation(); key(cell);
          }} />
        {error && <p role="alert">{error}</p>}
        {frame?.npc && <details open><summary>NPC visitor: {frame.npc.visits} visits</summary><p>Failed visits: {frame.npc.errors}; latest status: {frame.npc.status}</p><pre tabIndex={0} data-testid="npc-screen">{frame.npc.text}</pre></details>}
        <details><summary>Screen text</summary><pre tabIndex={0} data-testid="world-screen">{frame?.text ?? ''}</pre></details>
      </section>
      <aside>
        <h2>Explore the network</h2>
        <p>Visit the BBS, reply to forum topics, play a game, or publish and download files.</p>
        <p>Follow <strong>Small Web: 100 sites</strong> from the home page for ten webrings of stories, recipes, workshops and personal pages. From the console, use <code>open http://atlas.world/index</code>.</p>
        <p>Tab to Focus display and press Enter to type. Tab selects a link or field; Enter activates it. Escape returns to the page controls.</p>
        <div class="key-buttons">
          {[[TEXT_KEYS.previous, 'Previous'], [TEXT_KEYS.next, 'Next'], [TEXT_KEYS.activate, 'Enter'], [TEXT_KEYS.backspace, 'Backspace'], [TEXT_KEYS.home, 'F1 · Home'], [TEXT_KEYS.console, 'F2 · Console'], [TEXT_KEYS.download, 'F3 · Download']].map(([cell, label]) =>
            <button key={cell} disabled={!enabled} onClick={() => key(Number(cell))}>{label}</button>)}
        </div>
        <h2>File console</h2>
        <p><code>dir /</code> lists local files. <code>open http://files.world/</code> visits the archive. Press Enter to run a command.</p>
        <p><code>free</code> reports free and total disk blocks. Each block holds 243 cells.</p>
        <p><code>programs</code> opens the native program selector. Press 1 for Web, 2 for Terminal, or 3 for IRC. Terminal and IRC use separate firmware without Forth.</p>
        <p>In Terminal, enter <code>echo.world</code>. Enter sends a line; F1 disconnects, then F2 returns to Programs. IRC accepts <code>/join 2</code> and <code>/say hello</code>; F2 leaves IRC.</p>
        <p><code>ping bbs.world</code> checks a host; <code>trace bbs.world</code> shows router hops. Enter returns to the console; F1 cancels a probe.</p>
        <p><code>write /note Hello World</code> creates or replaces a short text file. Text case is preserved; no text makes an empty file.</p>
        <p><code>sum /a</code> reports a checksum and file size for comparing copies. It does not verify authenticity.</p>
        <p><code>copy /a /b</code> copies a file. <code>ren /a newname</code> renames a file or directory within its parent.</p>
        <p><code>put /a http://files.world/shared/name</code> uploads a file to the public archive.</p>
        <p>F3 prepares the selected link for download. Append a destination such as <code>/copy</code>, then press Enter.</p>
        <h2>Keep your disks</h2>
        <div class="key-buttons">
          <button disabled={!enabled} onClick={() => { setStorageBusy(true); setStorageError(''); send({ type: 'save' }); }}>Save disks</button>
          <button disabled={!frame || storageBusy || !!failure} onClick={() => fileInput.current?.click()}>Restore disks</button>
          <input ref={fileInput} type="file" hidden aria-label="Disk checkpoint" accept=".disks" onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restore(file);
          }} />
        </div>
        <h2>Save the live world</h2>
        <div class="key-buttons">
          <button disabled={!frame || storageBusy || !!failure} onClick={() => { setStorageBusy(true); setStorageError(''); send({type: 'save-snapshot'}); }}>Save snapshot</button>
          <button disabled={!frame || storageBusy || !!failure} onClick={() => snapshotInput.current?.click()}>Restore snapshot</button>
          <input ref={snapshotInput} type="file" hidden aria-label="World snapshot" accept=".snapshot" onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restore(file, true);
          }} />
        </div>
        <p>Snapshots keep every machine, disk, pending operation and queued input. Restore returns to that instant and pauses. Use the same build and NPC option.</p>
        {storageBusy && <p>Preparing save or restore…</p>}
        {storageError && <p role="alert">{storageError}</p>}
        <p class="session-note">Save disks keeps local files, forum posts and shared files in one download. Restore replaces this session and cold-boots those disks. Use the same Troika build. Unsaved changes are lost when restarting or closing this page.</p>
      </aside>
      {frame?.chat && <WorldChat clients={frame.chat} send={send} disabled={!frame.running || !!error || storageBusy} />}
      <section class="world-inspection" aria-label="World debugger">
        <label><input type="checkbox" checked={inspecting} onChange={event => setInspecting(event.currentTarget.checked)} /> Inspect machines</label>
        {inspecting && <WorldDebugPanel frame={frame} machine={machine} onMachine={setMachine} />}
      </section>
    </main>
  </div>;
}
