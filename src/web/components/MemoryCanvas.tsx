import { useEffect, useRef } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { REG_P, REG_S } from '../../core/machine';
import { MEM_SIZE, TRYTE_MAX, toTribbles } from '../../core/tryte';

// 19683 trytes as a 243x81 grid, scaled up 4x.
const COLS = 243;
const GRID_ROWS = 81;
const SCALE = 4;

export function MemoryCanvas({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!backRef.current) {
      backRef.current = document.createElement('canvas');
      backRef.current.width = COLS;
      backRef.current.height = GRID_ROWS;
    }
    const bctx = backRef.current.getContext('2d')!;
    if (!imgRef.current) imgRef.current = bctx.createImageData(COLS, GRID_ROWS);
    const img = imgRef.current;
    const px = new Uint32Array(img.data.buffer);

    const mem = emu.machine.mem;
    for (let i = 0; i < MEM_SIZE; i++) {
      const v = mem[i]!;
      if (v === 0) {
        px[i] = 0xff181418; // ABGR: near-black
      } else {
        const mag = Math.abs(v) / TRYTE_MAX;
        const lum = 70 + Math.round(185 * mag);
        // positive: green-cyan, negative: orange-red
        const r = v > 0 ? 24 : lum;
        const g = v > 0 ? lum : Math.round(lum * 0.45);
        const b = v > 0 ? Math.round(lum * 0.6) : 28;
        px[i] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backRef.current, 0, 0, COLS * SCALE, GRID_ROWS * SCALE);

    const cell = (addr: number): [number, number] => {
      const i = addr + TRYTE_MAX;
      return [(i % COLS) * SCALE, Math.floor(i / COLS) * SCALE];
    };
    const outline = (addr: number, color: string) => {
      const [x, y] = cell(addr);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 0.5, y - 0.5, SCALE + 1, SCALE + 1);
    };

    // Register band (-13..13) sits in a single row.
    const [rx, ry] = cell(-13);
    ctx.strokeStyle = '#557';
    ctx.strokeRect(rx - 0.5, ry - 0.5, 27 * SCALE + 1, SCALE + 1);

    for (const bp of emu.breakpoints) outline(bp, '#f33');
    outline(emu.machine.read(REG_S), '#3cf');
    outline(emu.machine.read(REG_P), '#fff');
    if (emu.selected !== null) outline(emu.selected, '#ff0');
  });

  const onClick = (e: MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) * canvas.width) / rect.width / SCALE);
    const y = Math.floor(((e.clientY - rect.top) * canvas.height) / rect.height / SCALE);
    const i = y * COLS + x;
    if (i >= 0 && i < MEM_SIZE) emu.select(i - TRYTE_MAX);
  };

  return (
    <section class="panel memory">
      <h2>
        Memory <span class="hint">19,683 trytes — white: PC, cyan: S, yellow: selected, red: breakpoints</span>
      </h2>
      <canvas
        ref={canvasRef}
        width={COLS * SCALE}
        height={GRID_ROWS * SCALE}
        onClick={onClick}
        title="click a cell to inspect"
      />
    </section>
  );
}
