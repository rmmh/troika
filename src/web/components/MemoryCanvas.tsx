import { useEffect, useRef, useState } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { REG_P, REG_S } from '../../core/machine';
import { MEM_SIZE, TRYTE_MAX } from '../../core/tryte';
import { PageZoom } from './PageZoom';

// 27 pages of 27×27 trytes, arranged in a PAGE_ROWS × PAGE_COLS grid.
// Zero page (p=13) is at the center.
const PAGE_COLS = 3;
const PAGE_ROWS = 9;
const PAGE_SIZE = 27; // trytes per row/col within a page
const SCALE = 2;

const CANVAS_W = PAGE_COLS * PAGE_SIZE * SCALE; // 972
const CANVAS_H = PAGE_ROWS * PAGE_SIZE * SCALE; // 324

/** Map a memory address to [canvasX, canvasY] in unscaled tryte-pixel space. */
function addrToXY(addr: number): [number, number] {
  const i = addr + TRYTE_MAX; // 0..19682
  const p = Math.floor(i / 729); // page index 0..26
  const rem = i % 729;
  const r = Math.floor(rem / PAGE_SIZE); // row within page 0..26
  const c = rem % PAGE_SIZE; // col within page 0..26
  const pgRow = Math.floor(p / PAGE_COLS);
  const pgCol = p % PAGE_COLS;
  return [pgCol * PAGE_SIZE + c, pgRow * PAGE_SIZE + r];
}

/** Convert a memory array index (0..19682) to canvas pixel index for the ImageData buffer. */
function indexToPixel(i: number): number {
  const p = Math.floor(i / 729);
  const rem = i % 729;
  const r = Math.floor(rem / PAGE_SIZE);
  const c = rem % PAGE_SIZE;
  const pgRow = Math.floor(p / PAGE_COLS);
  const pgCol = p % PAGE_COLS;
  const x = pgCol * PAGE_SIZE + c;
  const y = pgRow * PAGE_SIZE + r;
  return y * (PAGE_COLS * PAGE_SIZE) + x;
}

/** Compute the page index (0..26) for a given memory address. */
function pageOfAddr(addr: number): number {
  return Math.floor((addr + TRYTE_MAX) / 729);
}

/** Interpret a tryte value as packed RGB from its three tribbles.
 *  Each tribble (3 trits) maps [-13..13] → [0..26] → [0..255]. */
function tribyteColor(v: number): number {
  const t = v + TRYTE_MAX; // 0..19682
  const b = t % 27;
  const g = Math.floor(t / 27) % 27;
  const r = Math.floor(t / 729);
  const u = (x: number) => Math.round((x * 255) / 26);
  // ABGR format for Uint32Array on little-endian
  return 0xff000000 | (u(b) << 16) | (u(g) << 8) | u(r);
}

export function MemoryCanvas({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomPage, setZoomPage] = useState(13); // zero page by default

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    if (!backRef.current) {
      backRef.current = document.createElement('canvas');
      backRef.current.width = PAGE_COLS * PAGE_SIZE;
      backRef.current.height = PAGE_ROWS * PAGE_SIZE;
    }
    const bctx = backRef.current.getContext('2d')!;
    if (!imgRef.current)
      imgRef.current = bctx.createImageData(PAGE_COLS * PAGE_SIZE, PAGE_ROWS * PAGE_SIZE);

    const img = imgRef.current;
    const px = new Uint32Array(img.data.buffer);

    const mem = emu.machine.mem;
    for (let i = 0; i < MEM_SIZE; i++) {
      px[indexToPixel(i)] = tribyteColor(mem[i]!);
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backRef.current, 0, 0, CANVAS_W, CANVAS_H);

    const outline = (addr: number, color: string) => {
      const [x, y] = addrToXY(addr);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x * SCALE - 0.5, y * SCALE - 0.5, SCALE + 1, SCALE + 1);
    };

    // Page grid dividers (subtle lines between pages)
    ctx.strokeStyle = '#26263a';
    ctx.lineWidth = 1;
    for (let col = 1; col < PAGE_COLS; col++) {
      const x = col * PAGE_SIZE * SCALE;
      ctx.beginPath();
      ctx.moveTo(x - 0.5, 0);
      ctx.lineTo(x - 0.5, CANVAS_H);
      ctx.stroke();
    }
    for (let row = 1; row < PAGE_ROWS; row++) {
      const y = row * PAGE_SIZE * SCALE;
      ctx.beginPath();
      ctx.moveTo(0, y - 0.5);
      ctx.lineTo(CANVAS_W, y - 0.5);
      ctx.stroke();
    }

    // Highlight the currently zoomed page
    const zp = zoomPage;
    const zpRow = Math.floor(zp / PAGE_COLS);
    const zpCol = zp % PAGE_COLS;
    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      zpCol * PAGE_SIZE * SCALE + 1,
      zpRow * PAGE_SIZE * SCALE + 1,
      PAGE_SIZE * SCALE - 2,
      PAGE_SIZE * SCALE - 2,
    );

    for (const bp of emu.breakpoints) outline(bp, '#f33');
    outline(emu.machine.read(REG_S), '#3cf');
    outline(emu.machine.read(REG_P), '#fff');
    if (emu.selected !== null) outline(emu.selected, '#ff0');
  });

  const onClick = (e: MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor(((e.clientX - rect.left) * CANVAS_W) / rect.width / SCALE);
    const py = Math.floor(((e.clientY - rect.top) * CANVAS_H) / rect.height / SCALE);
    const pgCol = Math.floor(px / PAGE_SIZE);
    const pgRow = Math.floor(py / PAGE_SIZE);
    const p = pgRow * PAGE_COLS + pgCol;
    const r = py % PAGE_SIZE;
    const c = px % PAGE_SIZE;
    const i = p * 729 + r * PAGE_SIZE + c;
    if (i >= 0 && i < MEM_SIZE) {
      const addr = i - TRYTE_MAX;
      emu.select(addr);
      setZoomPage(p);
      containerRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const addr = emu.selected;
    if (addr === null) return;
    const TRYTE_MIN = -TRYTE_MAX;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = addr + 1;
    else if (e.key === 'ArrowLeft') next = addr - 1;
    else if (e.key === 'ArrowDown') next = addr + PAGE_SIZE;
    else if (e.key === 'ArrowUp') next = addr - PAGE_SIZE;
    if (next !== null) {
      e.preventDefault();
      next = Math.max(TRYTE_MIN, Math.min(TRYTE_MAX, next));
      emu.select(next);
      setZoomPage(pageOfAddr(next));
    }
  };

  return (
    <section class="panel memory">
      <h2>
        Memory <span class="hint">white: PC, cyan: S, yellow: selected, red: breakpoints</span>
      </h2>
      <div
        class="memory-inner"
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style="display:flex; gap:0.4rem; outline:none"
      >
        <PageZoom
          emu={emu}
          page={zoomPage}
          onSelect={() => containerRef.current?.focus()}
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={onClick}
          title="click a cell to inspect; arrow keys navigate"
        />
      </div>
    </section>
  );
}
