import { useEffect, useRef } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { REG_P, REG_S } from '../../core/machine';
import { TRYTE_MAX, toTribbles } from '../../core/tryte';

const PAGE_SIZE = 27;
const CELL = 18; // px per cell
const CANVAS_W = PAGE_SIZE * CELL;
const CANVAS_H = PAGE_SIZE * CELL;

/** Same RGB color function as MemoryCanvas. */
function tribyteColor(v: number): [number, number, number] {
  const t = v + TRYTE_MAX;
  const b = t % 27;
  const g = Math.floor(t / 27) % 27;
  const r = Math.floor(t / 729);
  const u = (x: number) => Math.round((x * 255) / 26);
  return [u(r), u(g), u(b)];
}

/** Luminance of an RGB triplet (0..1). */
function luma(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function PageZoom({
  emu,
  page,
  onSelect,
}: {
  emu: EmulatorController;
  page: number;
  onSelect?: (addr: number) => void;
}) {
  useEmulator(emu);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const baseIndex = page * 729; // memory array index of first tryte in this page
    const mem = emu.machine.mem;

    const pc = emu.machine.read(REG_P);
    const sp = emu.machine.read(REG_S);

    ctx.font = `bold ${Math.round(CELL * 0.44)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < PAGE_SIZE; r++) {
      for (let c = 0; c < PAGE_SIZE; c++) {
        const memIdx = baseIndex + r * PAGE_SIZE + c;
        const addr = memIdx - TRYTE_MAX;
        const v = mem[memIdx]!;
        const [cr, cg, cb] = tribyteColor(v);

        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);

        // Draw tribble label; color for contrast
        const fg = luma(cr, cg, cb) > 0.45 ? '#000' : '#fff';
        ctx.fillStyle = fg;
        ctx.fillText(toTribbles(v), c * CELL + CELL / 2, r * CELL + CELL / 2);
      }
    }

    // Outlines: breakpoints, SP, PC, selected
    const outline = (addr: number, color: string, lw = 1.5) => {
      const i = addr + TRYTE_MAX;
      const p = Math.floor(i / 729);
      if (p !== page) return;
      const rem = i % 729;
      const r = Math.floor(rem / PAGE_SIZE);
      const c = rem % PAGE_SIZE;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.strokeRect(c * CELL + lw / 2, r * CELL + lw / 2, CELL - lw, CELL - lw);
    };

    for (const bp of emu.breakpoints) outline(bp, '#f33');
    outline(sp, '#3cf');
    outline(pc, '#fff', 2);
    if (emu.selected !== null) outline(emu.selected, '#ff0', 2);
  });

  const onClick = (e: MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) * CANVAS_W) / rect.width / CELL);
    const r = Math.floor(((e.clientY - rect.top) * CANVAS_H) / rect.height / CELL);
    if (c >= 0 && c < PAGE_SIZE && r >= 0 && r < PAGE_SIZE) {
      const addr = page * 729 + r * PAGE_SIZE + c - TRYTE_MAX;
      emu.select(addr);
      onSelect?.(addr);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={onClick}
      style="border:1px solid #26263a; flex-shrink:0; cursor:crosshair"
      title={`page ${page} (addresses ${(page * 729 - TRYTE_MAX).toString()}..${(page * 729 + 728 - TRYTE_MAX).toString()})`}
    />
  );
}
