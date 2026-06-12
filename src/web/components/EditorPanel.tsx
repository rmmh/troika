import { useEffect, useMemo, useState } from 'preact/hooks';
import { EmulatorController } from '../emulator';
import { assemble, type AssembleResult } from '../../asm/assemble';
import { toTribbles } from '../../core/tryte';
import DEMOS from 'asm-dir:demos';

const DEFAULT_IDX = Math.max(0, DEMOS.findIndex((d) => d.name === 'Mandelbrot'));

export function EditorPanel({ emu }: { emu: EmulatorController }) {
  const [demoIdx, setDemoIdx] = useState(DEFAULT_IDX);
  const [src, setSrc] = useState(DEMOS[DEFAULT_IDX]!.src);
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

  const loadDemo = (idx: number) => {
    const demo = DEMOS[idx]!;
    setDemoIdx(idx);
    setSrc(demo.src);
    setDebounced(demo.src);
    const r = assemble(demo.src);
    if (!r.diagnostics.some((d) => d.severity === 'error')) emu.load(r);
  };

  return (
    <section class="panel editor">
      <h2>
        Assembler
        <select
          value={demoIdx}
          onChange={(e) => loadDemo(Number((e.target as HTMLSelectElement).value))}
          title="load a demo program"
        >
          {DEMOS.map((d, i) => (
            <option key={i} value={i}>
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
