import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
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
  useEmulator(emu);
  const initialDemoIdx = demoIdxFromHash();
  const [demoIdx, setDemoIdx] = useState(initialDemoIdx);
  const [src, setSrc] = useState(DEMOS[initialDemoIdx]!.src);
  const [debounced, setDebounced] = useState(src);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [profileView, setProfileView] = useState<'percent' | 'cycles'>('percent');
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(src), 200);
    return () => clearTimeout(t);
  }, [src]);

  const result: AssembleResult = useMemo(() => assemble(debounced), [debounced]);
  const pending = src !== debounced;
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  const emitted = result.chunks.reduce((n, c) => n + c.data.length, 0);
  const sourceRows = useMemo(() => src.split('\n'), [src]);
  const numberedLineCount = src.endsWith('\n') ? sourceRows.length - 1 : sourceRows.length;
  const sourceLines = useMemo(() => sourceRows.slice(0, numberedLineCount), [sourceRows, numberedLineCount]);
  const bareLabelLines = useMemo(() => {
    const lines: number[] = [];
    sourceLines.forEach((line, i) => {
      if (/^\s*[a-z][A-Za-z0-9_]*:\s*(?:;.*)?$/.test(line)) lines.push(i + 1);
    });
    return lines;
  }, [sourceLines]);
  const { lineToAddrs, addrToLine } = useMemo(() => {
    const byLine = new Map<number, number[]>();
    const byAddr = new Map<number, number>();
    if (pending || errors.length > 0) return { lineToAddrs: byLine, addrToLine: byAddr };
    for (const [addr, line] of result.lineMap) {
      byAddr.set(addr, line);
      const addrs = byLine.get(line);
      if (addrs) addrs.push(addr);
      else byLine.set(line, [addr]);
    }
    for (const addrs of byLine.values()) addrs.sort((a, b) => a - b);
    return { lineToAddrs: byLine, addrToLine: byAddr };
  }, [result, pending]);
  const labelBlockLines = useMemo(() => {
    const blocks = new Map<number, number[]>();
    for (let i = 0; i < bareLabelLines.length; i++) {
      const line = bareLabelLines[i]!;
      const next = bareLabelLines[i + 1] ?? sourceLines.length + 1;
      const blockLines: number[] = [];
      for (let n = line + 1; n < next; n++) blockLines.push(n);
      blocks.set(line, blockLines);
    }
    return blocks;
  }, [bareLabelLines, sourceLines.length]);
  const selectedLine = emu.selected === null ? null : addrToLine.get(emu.selected) ?? null;
  const sourceMatchesLoaded = src === loadedSource;
  const hasProfileData = sourceMatchesLoaded && emu.profileTotalCycles > 0;
  const profileCyclesForLine = (line: number): number =>
    (lineToAddrs.get(line) ?? []).reduce(
      (sum, addr) => sum + (emu.profileCycles.get(addr) ?? 0),
      0,
    );
  const profileCyclesForBlock = (line: number): number =>
    (labelBlockLines.get(line) ?? []).reduce((sum, blockLine) => sum + profileCyclesForLine(blockLine), 0);
  const isBlockMetric = (line: number): boolean => labelBlockLines.has(line);
  const profileCyclesForMetric = (line: number): number =>
    isBlockMetric(line) ? profileCyclesForBlock(line) : profileCyclesForLine(line);
  const profileText = (line: number): string => {
    if (!hasProfileData) return '';
    const cycles = profileCyclesForMetric(line);
    if (cycles <= 0) return '';
    if (profileView === 'cycles') return cycles.toLocaleString();
    const percent = ((cycles / emu.profileTotalCycles) * 100).toFixed(3);
    return percent === '0.000' ? '' : `${percent}%`;
  };
  const toggleProfileView = (e: MouseEvent): void => {
    e.stopPropagation();
    if (!hasProfileData) return;
    setProfileView((view) => (view === 'percent' ? 'cycles' : 'percent'));
  };
  const profileTitle = (line: number): string => {
    if (!hasProfileData) return '';
    const cycles = profileCyclesForMetric(line);
    const scope = isBlockMetric(line) ? 'basic-block' : 'line';
    return cycles > 0
      ? `${scope}: ${cycles.toLocaleString()} cycles; click column to show ${profileView === 'percent' ? 'cycles' : 'percentages'}`
      : `click column to show ${profileView === 'percent' ? 'cycles' : 'percentages'}`;
  };

  const selectLine = (line: number): void => {
    const addr = lineToAddrs.get(line)?.[0];
    if (addr !== undefined) emu.select(addr);
  };

  const toggleLineBreakpoint = (line: number): void => {
    const addr = lineToAddrs.get(line)?.[0];
    if (addr !== undefined) {
      emu.select(addr);
      emu.toggleBreakpoint(addr);
    }
  };

  const lineForCaret = (textarea: HTMLTextAreaElement): number =>
    textarea.value.slice(0, textarea.selectionStart).split('\n').length;

  useEffect(() => {
    if (selectedLine === null) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
    const target =
      (selectedLine - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight / 2;
    textarea.scrollTop = Math.max(0, target);
    if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop;
  }, [selectedLine]);

  // Auto-load on first render.
  useEffect(() => {
    if (!errors.length) {
      emu.load(result);
      setLoadedSource(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDemo = (idx: number, updateHash = true) => {
    const demo = DEMOS[idx]!;
    setDemoIdx(idx);
    setSrc(demo.src);
    setDebounced(demo.src);
    if (updateHash) setDemoHash(demoId(demo));
    const r = assemble(demo.src);
    if (!r.diagnostics.some((d) => d.severity === 'error')) {
      emu.load(r);
      setLoadedSource(demo.src);
    }
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
          disabled={pending || errors.length > 0}
          onClick={() => {
            emu.load(result);
            setLoadedSource(debounced);
          }}
          title="write the program into memory and point PC at it"
        >
          ⬇ Load
        </button>
      </h2>
      <div class={`source-editor ${hasProfileData ? 'has-profile' : ''}`}>
        <div
          class="line-gutter"
          ref={gutterRef}
          onWheel={(e) => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.scrollTop += e.deltaY;
            if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop;
          }}
        >
          {sourceRows.map((_, i) => {
            const line = i + 1;
            const numbered = line <= numberedLineCount;
            const addr = lineToAddrs.get(line)?.[0];
            const hasBlockMetric = hasProfileData && isBlockMetric(line) && profileCyclesForBlock(line) > 0;
            const hasBreakpoint = addr !== undefined && emu.breakpoints.has(addr);
            return (
              <button
                key={line}
                type="button"
                class={[
                  'line-number',
                  numbered ? 'numbered' : 'trailing',
                  addr === undefined ? 'empty' : '',
                  hasBreakpoint ? 'bp' : '',
                  selectedLine === line ? 'selected' : '',
                  hasBlockMetric ? 'block-profile' : '',
                ].join(' ')}
                disabled={!numbered || (addr === undefined && !hasBlockMetric)}
                onClick={() => numbered && toggleLineBreakpoint(line)}
                title={!numbered ? '' : addr === undefined ? `line ${line}` : `toggle breakpoint at ${toTribbles(addr)}`}
              >
                <span class="bp-dot">{hasBreakpoint ? '●' : ''}</span>
                <span>{numbered ? line : ''}</span>
                {numbered && hasProfileData && (
                  <span
                    class={`profile-metric ${isBlockMetric(line) ? 'block' : ''}`}
                    onClick={toggleProfileView}
                    title={profileTitle(line)}
                  >
                    {profileText(line)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          spellcheck={false}
          value={src}
          onInput={(e) => setSrc((e.target as HTMLTextAreaElement).value)}
          onClick={(e) => selectLine(lineForCaret(e.currentTarget as HTMLTextAreaElement))}
          onKeyUp={(e) => selectLine(lineForCaret(e.currentTarget as HTMLTextAreaElement))}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = (e.currentTarget as HTMLTextAreaElement).scrollTop;
          }}
        />
      </div>
      <div class="asm-status">
        {!sourceMatchesLoaded && <span class="unloaded">Changes not loaded. </span>}
        {pending ? <span>Assembling…</span> : errors.length === 0 ? (
          <span class="ok">
            ✓ {emitted} trytes in {result.chunks.length} chunk{result.chunks.length === 1 ? '' : 's'}
            {result.chunks.map((c) => ` · ${toTribbles(c.addr)}+${c.data.length}`)}
          </span>
        ) : null}
        <ul class="diagnostics">
          {!pending && result.diagnostics.map((d, i) => (
            <li key={i} class={d.severity}>
              {d.line}:{d.col} {d.severity}: {d.message}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
