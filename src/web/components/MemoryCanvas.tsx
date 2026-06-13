import { useEffect, useRef, useState } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { REG_P, REG_S } from '../../core/machine';
import { MEM_SIZE, TRYTE_MAX } from '../../core/tryte';
import {
  displayEnabled,
  gameEnabled,
  tribyteColorABGR,
  VRAM_COLS,
  VRAM_ROWS,
  VRAM_SIZE,
} from '../../core/display';
import { renderGameFrame } from '../../core/gameRenderer';
import { GameDisplay } from './GameDisplay';
import { PageZoom } from './PageZoom';

// 27 pages of 27×27 trytes, arranged in a PAGE_ROWS × PAGE_COLS grid.
// Zero page (p=13) is at the center.
const PAGE_COLS = 3;
const PAGE_ROWS = 9;
const PAGE_SIZE = 27; // trytes per row/col within a page
const SCALE = 2;

const BUF_W = PAGE_COLS * PAGE_SIZE; // 81 — back-buffer width in tryte-pixels
const CANVAS_W = BUF_W * SCALE; // 162
const CANVAS_H = PAGE_ROWS * PAGE_SIZE * SCALE; // 486

// The framebuffer (pages 0-8) occupies the top-left VRAM_ROWS rows of the
// canvas; since the back buffer is exactly 81 wide, the framebuffer's
// row-major pixel index is just the memory index itself.
const VRAM_PX_ROWS = VRAM_ROWS; // top 81 rows are the display when raw mode enabled
const VRAM_PAGE_ROWS = 729 / VRAM_COLS; // 9 framebuffer rows per page
const VRAM_PAGE_COUNT = VRAM_PX_ROWS / VRAM_PAGE_ROWS; // 9 pages (0-8)

/** Map a memory address to [canvasX, canvasY] in unscaled tryte-pixel space. */
function addrToXY(addr: number, displayOn: boolean): [number, number] {
  const i = addr + TRYTE_MAX; // 0..19682
  if (displayOn && i < VRAM_SIZE) return [i % VRAM_COLS, Math.floor(i / VRAM_COLS)];
  const p = Math.floor(i / 729); // page index 0..26
  const rem = i % 729;
  const r = Math.floor(rem / PAGE_SIZE); // row within page 0..26
  const c = rem % PAGE_SIZE; // col within page 0..26
  const pgRow = Math.floor(p / PAGE_COLS);
  const pgCol = p % PAGE_COLS;
  return [pgCol * PAGE_SIZE + c, pgRow * PAGE_SIZE + r];
}

/** Convert a memory array index (0..19682) to canvas pixel index for the ImageData buffer. */
function indexToPixel(i: number, displayOn: boolean): number {
  // Framebuffer region renders row-major (i == y*81 + x) when raw mode enabled.
  if (displayOn && i < VRAM_SIZE) return i;
  const p = Math.floor(i / 729);
  const rem = i % 729;
  const r = Math.floor(rem / PAGE_SIZE);
  const c = rem % PAGE_SIZE;
  const pgRow = Math.floor(p / PAGE_COLS);
  const pgCol = p % PAGE_COLS;
  const x = pgCol * PAGE_SIZE + c;
  const y = pgRow * PAGE_SIZE + r;
  return y * BUF_W + x;
}

/** Compute the page index (0..26) for a given memory address. */
function pageOfAddr(addr: number): number {
  return Math.floor((addr + TRYTE_MAX) / 729);
}

export function MemoryCanvas({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const gameInsetRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // null = no page selected (show game display in left slot if game mode active)
  const [pageSelection, setPageSelection] = useState<number | null>(null);

  const isGameMode = gameEnabled((a) => emu.machine.peek(a));
  const displayOn = displayEnabled((a) => emu.machine.peek(a));
  // Show game display in left slot when game mode is active and no page is selected
  const showGameDisplay = isGameMode && pageSelection === null;
  const zoomPage = pageSelection ?? 13;

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
      px[indexToPixel(i, displayOn)] = tribyteColorABGR(mem[i]!);
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backRef.current, 0, 0, CANVAS_W, CANVAS_H);

    // Game display inset: overlay the top 162×162 canvas area with the composited
    // game frame when game mode is active and the user has selected a page to inspect.
    if (isGameMode && !showGameDisplay) {
      if (!gameInsetRef.current) {
        gameInsetRef.current = document.createElement('canvas');
        gameInsetRef.current.width = 162;
        gameInsetRef.current.height = 162;
      }
      renderGameFrame(gameInsetRef.current, emu.machine.mem, (a) => emu.machine.peek(a), emu.displayDevice.scroll);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(gameInsetRef.current, 0, 0, CANVAS_W, CANVAS_W);
    }

    const outline = (addr: number, color: string) => {
      const [x, y] = addrToXY(addr, displayOn);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x * SCALE - 0.5, y * SCALE - 0.5, SCALE + 1, SCALE + 1);
    };

    // Page grid dividers (subtle lines between pages). When the framebuffer
    // is shown, the top VRAM_PX_ROWS rows are a contiguous display, so the
    // page grid only applies below it.
    const gridTop = displayOn ? VRAM_PX_ROWS * SCALE : 0;
    ctx.strokeStyle = '#26263a';
    ctx.lineWidth = 1;
    for (let col = 1; col < PAGE_COLS; col++) {
      const x = col * PAGE_SIZE * SCALE;
      ctx.beginPath();
      ctx.moveTo(x - 0.5, gridTop);
      ctx.lineTo(x - 0.5, CANVAS_H);
      ctx.stroke();
    }
    for (let row = 1; row < PAGE_ROWS; row++) {
      const y = row * PAGE_SIZE * SCALE;
      if (y < gridTop) continue;
      ctx.beginPath();
      ctx.moveTo(0, y - 0.5);
      ctx.lineTo(CANVAS_W, y - 0.5);
      ctx.stroke();
    }

    // Highlight the currently zoomed page. In the framebuffer view a page is
    // a contiguous 9-row, full-width band (page N = rows 9N..9N+8), so the
    // highlight is a wide rectangle rather than a 27×27 square.
    const zp = zoomPage;
    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 2;
    if (displayOn && zp < VRAM_PAGE_COUNT) {
      ctx.strokeRect(
        1,
        zp * VRAM_PAGE_ROWS * SCALE + 1,
        VRAM_COLS * SCALE - 2,
        VRAM_PAGE_ROWS * SCALE - 2,
      );
    } else {
      const zpRow = Math.floor(zp / PAGE_COLS);
      const zpCol = zp % PAGE_COLS;
      ctx.strokeRect(
        zpCol * PAGE_SIZE * SCALE + 1,
        zpRow * PAGE_SIZE * SCALE + 1,
        PAGE_SIZE * SCALE - 2,
        PAGE_SIZE * SCALE - 2,
      );
    }

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
    // In game mode with inset visible, clicking the inset (top 81 rows) returns to display view
    if (isGameMode && !showGameDisplay && py < VRAM_PX_ROWS) {
      setPageSelection(null);
      return;
    }
    // Framebuffer region (top VRAM_PX_ROWS rows) maps row-major when raw mode enabled.
    const i =
      displayOn && py < VRAM_PX_ROWS
        ? py * VRAM_COLS + px
        : (() => {
            const pgCol = Math.floor(px / PAGE_SIZE);
            const pgRow = Math.floor(py / PAGE_SIZE);
            const r = py % PAGE_SIZE;
            const c = px % PAGE_SIZE;
            return (pgRow * PAGE_COLS + pgCol) * 729 + r * PAGE_SIZE + c;
          })();
    if (i >= 0 && i < MEM_SIZE) {
      const addr = i - TRYTE_MAX;
      emu.select(addr);
      setPageSelection(Math.floor(i / 729));
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
      setPageSelection(pageOfAddr(next));
    }
  };

  return (
    <section class="panel memory">
      <h2>
        Memory <span class="hint">white: PC, cyan: S, yellow: selected, red: breakpoints</span>
        {isGameMode && pageSelection !== null && (
          <button
            class="mini"
            style="margin-left:0.5rem"
            onClick={() => setPageSelection(null)}
            title="return to game display view"
          >
            show display
          </button>
        )}
      </h2>
      <div
        class="memory-inner"
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style="display:flex; gap:0.4rem; outline:none"
      >
        {showGameDisplay ? (
          <GameDisplay emu={emu} />
        ) : (
          <PageZoom emu={emu} page={zoomPage} onSelect={() => containerRef.current?.focus()} />
        )}
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
