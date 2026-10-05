import { AudioOutput, AudioSampleQueue } from './audioOutput';
import { MAX_SNAPSHOT_BYTES } from '../world/snapshot';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DISPLAY_PX } from '../core/display';
import { TEXT_KEYS, textKeyCell } from '../core/textKeyboard';
import { CHECKPOINT_BYTES, PROGRAM_CHECKPOINT_BYTES } from '../world/checkpoint';
import { WorldChat } from './components/WorldChat';
import { WorldDebugPanel } from './components/WorldDebugPanel';
import type { WorldFrame, WorldInput, WorldOutput } from './worldProtocol';

export function WorldApp({ onDebugger }: { onDebugger?: () => void }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audio = useRef<AudioOutput>(new AudioOutput());
  const samples = useRef<AudioSampleQueue>(new AudioSampleQueue());
  const soundOn = useRef(false);
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
    instance.postMessage({type: 'audio', enabled: soundOn.current} satisfies WorldInput);
    instance.onmessage = ({ data }: MessageEvent<WorldOutput>) => {
      if (data.type === 'frame') {
        if (soundOn.current && data.audio) samples.current.push(new Int16Array(data.audio));
        setFrame(data);
      }
      else if (data.type === 'storage') { setStorageBusy(data.busy); setStorageError(data.error ?? ''); }
      else {
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'application/octet-stream' }));
        const link = document.createElement('a'); link.href = url; link.download = data.type === 'snapshot' ? 'troika-world.snapshot' : 'troika-world.disks'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    };
    instance.onerror = event => { setFailure(event.message || 'The world worker stopped. Restart to try again.'); setStorageBusy(false); };
    return () => { instance.onmessage = null; instance.onerror = null; instance.terminate(); worker.current = null; audio.current.dispose(); samples.current.reset(); };
  }, [generation]);
  useEffect(() => {
    if (!frame || !canvas.current) return;
    const context = canvas.current.getContext('2d');
    context?.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels), DISPLAY_PX, DISPLAY_PX), 0, 0);
  }, [frame]);
  function send(message: WorldInput) { worker.current?.postMessage(message); }
  useEffect(() => { send({ type: 'inspect', machine: inspecting ? machine : null }); }, [inspecting, machine, generation]);
  useEffect(() => {
    if (soundEnabled && frame?.running && !frame.error && !failure && !storageBusy) audio.current.start(samples.current);
    else { audio.current.pause(); audio.current.reset(); samples.current.reset(); }
  }, [soundEnabled, frame?.running, frame?.error, failure, storageBusy, generation]);
  function toggleSound() {
    const value = !soundEnabled;
    samples.current.reset(); audio.current.reset(); soundOn.current = value;
    if (value) audio.current.start(samples.current); else audio.current.pause();
    setSoundEnabled(value); send({type: 'audio', enabled: value});
  }
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
  const programScreen = frame?.status === 'Disk program' || frame?.status === 'Program path';
  const terminal = frame?.status === 'Terminal';
  const terminalPrompt = terminal && frame.text.includes('Host (Enter):');
  const remoteScreen = terminal || frame?.status === 'IRC';
  return <div class="world-app">
    <header>
      <div><p class="eyebrow">TROIKA</p><h1>World</h1></div>
      <nav aria-label="World controls">
        <a href="./index.html" onClick={onDebugger ? event => { event.preventDefault(); onDebugger(); } : undefined}>Machine debugger</a>
        <a href={new URLSearchParams(location.search).get('npc') === '1' ? './world.html' : './world.html?npc=1'}>Fresh world {new URLSearchParams(location.search).get('npc') === '1' ? 'without' : 'with'} NPC</a>
        <button disabled={!frame || !!error || storageBusy} onClick={() => send({ type: 'running', value: !frame?.running })}>{frame?.running ? 'Pause' : 'Resume'}</button>
        <button aria-pressed={soundEnabled} disabled={!frame || !!error || storageBusy} onClick={toggleSound}>{soundEnabled ? 'Mute sound' : 'Enable sound'}</button>
        <button disabled={storageBusy} onClick={() => restart(value => value + 1)}>Restart with fresh disks</button>
      </nav>
    </header>
    <main>
      <section class="display-panel" aria-label="World display">
        <div class="screen-status"><span role="status">{error ? 'Stopped' : frame?.status ?? 'Assembling world'}</span><span class="screen-caption">A small computer on a small web</span></div>
        <button ref={focusDisplay} disabled={!enabled} onClick={() => canvas.current?.focus()}>Focus display</button>
        <p id="world-keyboard-help">Up / Down select. Enter opens. Page Up / Down scroll. Escape returns to page controls.</p>
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
        {soundEnabled && audio.current.error && <p role="alert">Sound: {audio.current.error}</p>}
        {frame?.npc && <details open><summary>NPC visitor: {frame.npc.visits} visits</summary><p>Failed visits: {frame.npc.errors}; latest status: {frame.npc.status}</p><pre tabIndex={0} data-testid="npc-screen">{frame.npc.text}</pre></details>}
        <details><summary>Screen text and timing</summary><p data-testid="world-cycles">{frame?.cycles.toLocaleString() ?? '0'} cycles</p><pre tabIndex={0} data-testid="world-screen">{frame?.text ?? ''}</pre></details>
      </section>
      <aside aria-label="Using your computer">
        <section class="desk-guide">
          <p class="eyebrow">START HERE</p>
          <h2>Browse, play, make things.</h2>
          <p>Follow <strong>Small Web: 100 sites</strong> for stories, workshops, games, and tools made by its residents.</p>
          <ol>
            <li><strong>Explore.</strong> Up/Down selects a link; Enter opens it.</li>
            <li><strong>Run a program.</strong> Choose a <strong>Run</strong> link on a software shelf. It downloads and starts on your computer.</li>
            <li><strong>Switch tasks.</strong> F1 returns from a program to the launcher. Arrows and Enter choose what runs next.</li>
          </ol>
          <p class="quiet">Click the screen to type, or choose Focus display. Escape brings you back to these controls.</p>
        </section>
        <div class="key-buttons" aria-label="Computer keys">
          {[[TEXT_KEYS.previous, 'Previous'], [TEXT_KEYS.next, 'Next'], [TEXT_KEYS.activate, 'Enter'], [TEXT_KEYS.backspace, 'Backspace'], [TEXT_KEYS.home, programScreen ? 'F1 · Programs' : frame?.status === 'Terminal' ? 'F1 · Disconnect' : 'F1 · Home'], [TEXT_KEYS.console, remoteScreen ? 'F2 · Programs' : 'F2 · Console'], [TEXT_KEYS.download, 'F3 · Download']].filter(([cell]) => frame?.status !== 'IRC' || cell !== TEXT_KEYS.home).map(([cell, label]) =>
            <button key={cell} disabled={!enabled || (frame?.status === 'Programs' && Number(cell) >= TEXT_KEYS.home) || ((programScreen || remoteScreen) && cell === TEXT_KEYS.download) || (programScreen && cell === TEXT_KEYS.console) || (terminal && ((cell === TEXT_KEYS.console && !terminalPrompt) || (cell === TEXT_KEYS.home && terminalPrompt)))} onClick={() => key(Number(cell))}>{label}</button>)}
        </div>
        <details class="reference-guide">
          <summary>Files and console commands</summary>
          <p>F2 opens the file console while browsing. Left/Right move the caret; Delete and Backspace edit. Up/Down recall recent commands and return to your draft.</p>
          <dl>
            <dt><code>programs</code></dt><dd>Open the native launcher. Choose Run disk program to enter a saved program's path.</dd>
            <dt><code>open http://atlas.world/software</code></dt><dd>Browse the native software directory.</dd>
            <dt><code>dir /</code> · <code>type /note</code></dt><dd>List your files or read a text file.</dd>
            <dt><code>write /note Hello World</code></dt><dd>Create or replace a short note; text case is preserved.</dd>
            <dt><code>get URL /copy</code> · <code>put /copy URL</code></dt><dd>Download a file, or upload one to a public archive.</dd>
            <dt><code>copy /a /b</code> · <code>ren /a newname</code></dt><dd>Copy a file, or rename it within its directory.</dd>
            <dt><code>free</code> · <code>sum /note</code></dt><dd>Check available disk space, or compare a file's checksum and size.</dd>
            <dt><code>ping bbs.world</code> · <code>trace bbs.world</code></dt><dd>Check a host or see its router hops. F1 cancels a probe.</dd>
          </dl>
          <p>F3 prepares the selected link for download; append a destination and press Enter. Run links replace the launch copy at <code>/launch</code>; documents saved by programs stay in their own files.</p>
        </details>
        <details class="reference-guide">
          <summary>Terminal and chat</summary>
          <p>From the launcher, choose Terminal and enter <code>echo.world</code>. Enter sends a line. F1 disconnects; F2 returns from the host prompt to Programs.</p>
          <p>Choose IRC to chat over the network. Type a message and press Enter to speak. Use <code>/join 2</code> to change rooms. F2 returns to Programs.</p>
        </details>
        <h2 class="storage-title">Keep your work</h2>
        <div class="key-buttons">
          <button disabled={!enabled} onClick={() => { setStorageBusy(true); setStorageError(''); send({ type: 'save' }); }}>Save disks</button>
          <button disabled={!frame || storageBusy || !!failure} onClick={() => fileInput.current?.click()}>Restore disks</button>
          <input ref={fileInput} type="file" hidden aria-label="Disk checkpoint" accept=".disks" onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restore(file);
          }} />
        </div>
        <h3>Resume this exact moment</h3>
        <div class="key-buttons">
          <button disabled={!frame || storageBusy || !!failure} onClick={() => { setStorageBusy(true); setStorageError(''); send({type: 'save-snapshot'}); }}>Save snapshot</button>
          <button disabled={!frame || storageBusy || !!failure} onClick={() => snapshotInput.current?.click()}>Restore snapshot</button>
          <input ref={snapshotInput} type="file" hidden aria-label="World snapshot" accept=".snapshot" onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restore(file, true);
          }} />
        </div>
        <p>A snapshot keeps the whole running world. Restore returns to that moment and pauses; Resume continues. Use the same build and NPC option.</p>
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
