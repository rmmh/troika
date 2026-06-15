import { useEffect, useMemo, useState } from 'preact/hooks';
import { EmulatorController } from '../emulator';
import { assemble, type AssembleResult } from '../../asm/assemble';
import { toTribbles } from '../../core/tryte';
import DEMOS from 'asm-dir:demos';

const DEFAULT_IDX = Math.max(0, DEMOS.findIndex((d) => d.name === 'Mandelbrot'));
const DEMO_ID_BY_NAME: Record<string, string> = {
  'Maze Generator': 'maze',
  'Maze Generator + Wall-Follower': 'maze-complex',
};

function demoId(demo: { id?: string; name: string }): string {
  return demo.id ?? DEMO_ID_BY_NAME[demo.name] ?? demo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function demoIdFromHash(): string | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash).get('d');
}

function demoIdxFromHash(): number {
  const id = demoIdFromHash();
  if (!id) return DEFAULT_IDX;
  const idx = DEMOS.findIndex((d) => demoId(d) === id);
  return idx >= 0 ? idx : DEFAULT_IDX;
}

function setDemoHash(id: string): void {
  const url = new URL(window.location.href);
  url.hash = new URLSearchParams({ d: id }).toString();
  window.history.replaceState(null, '', url);
}

export function EditorPanel({ emu }: { emu: EmulatorController }) {
  const initialDemoIdx = demoIdxFromHash();
  const [demoIdx, setDemoIdx] = useState(initialDemoIdx);
  const [src, setSrc] = useState(DEMOS[initialDemoIdx]!.src);
  const [debounced, setDebounced] = useState(src);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(src), 200);
    return () => clearTimeout(t);
  }, [src]);

  const result: AssembleResult = useMemo(() => assemble(debounced), [debounced]);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  const emitted = result.chunks.reduce((n, c) => n + c.data.length, 0);

  // Auto-load on first render.
  useEffect(() => {
    if (!errors.length) emu.load(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDemo = (idx: number, updateHash = true) => {
    const demo = DEMOS[idx]!;
    setDemoIdx(idx);
    setSrc(demo.src);
    setDebounced(demo.src);
    if (updateHash) setDemoHash(demoId(demo));
    const r = assemble(demo.src);
    if (!r.diagnostics.some((d) => d.severity === 'error')) emu.load(r);
  };

  useEffect(() => {
    const onHashChange = () => {
      const idx = demoIdxFromHash();
      if (idx !== demoIdx) loadDemo(idx, false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [demoIdx]);

  return (
    <section class="panel editor">
      <h2>
        Assembler
        <select
          class="demo-select"
          value={demoId(DEMOS[demoIdx]!)}
          onChange={(e) => {
            const id = (e.target as HTMLSelectElement).value;
            const idx = DEMOS.findIndex((d) => demoId(d) === id);
            if (idx >= 0) loadDemo(idx);
          }}
          title="load a demo program"
        >
          {DEMOS.map((d, i) => (
            <option key={i} value={demoId(d)}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          class="primary load"
          disabled={errors.length > 0}
          onClick={() => emu.load(result)}
          title="write the program into memory and point PC at it"
        >
          ⬇ Load
        </button>
      </h2>
      <textarea
        spellcheck={false}
        value={src}
        onInput={(e) => setSrc((e.target as HTMLTextAreaElement).value)}
      />
      <div class="asm-status">
        {errors.length === 0 ? (
          <span class="ok">
            ✓ {emitted} trytes in {result.chunks.length} chunk{result.chunks.length === 1 ? '' : 's'}
            {result.chunks.map((c) => ` · ${toTribbles(c.addr)}+${c.data.length}`)}
          </span>
        ) : null}
        <ul class="diagnostics">
          {result.diagnostics.map((d, i) => (
            <li key={i} class={d.severity}>
              {d.line}:{d.col} {d.severity}: {d.message}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
