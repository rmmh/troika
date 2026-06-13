import { useEffect, useRef } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { renderGameFrame } from '../../core/gameRenderer';
import { norm } from '../../core/tryte';

// 162×162 game pixels at 3× scale = 486×486 px (same physical size as PageZoom)
const GAME_PX = 162;
const SCALE = 3;
const CANVAS_SIZE = GAME_PX * SCALE; // 486

// Keys that are handled by the gamepad; we preventDefault on these to avoid
// scrolling the page or triggering other browser shortcuts during play.
const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'a', 's', 'd', 'w',
  'z', 'x', 'c', 'v',
  'e', 'r', 't', 'y',
  'f', 'g',
]);

function computePad(held: Set<string>): number {
  const axisX =
    (held.has('ArrowRight') || held.has('d') ? 1 : 0) -
    (held.has('ArrowLeft') || held.has('a') ? 1 : 0);
  const axisY =
    (held.has('ArrowDown') || held.has('s') ? 1 : 0) -
    (held.has('ArrowUp') || held.has('w') ? 1 : 0);
  const btnA = held.has('z') || held.has('e') ? 1 : 0;
  const btnB = held.has('x') || held.has('r') ? 1 : 0;
  const btnX = held.has('c') || held.has('t') ? 1 : 0;
  const btnY = held.has('v') || held.has('y') ? 1 : 0;
  const start = held.has('g') ? 1 : 0;
  const select = held.has('f') ? 1 : 0;
  // Gamepad trit layout (see display.txt §8): trit 0 is the most significant
  // trit (3^8), matching tritsRaw order, so axes extract via right shifts
  // (e.g. `F t -8` isolates X). 3^8 = X axis, 3^7 = Y axis, 3^6 = A, 3^5 = B,
  // 3^4 = X, 3^3 = Y, 3^2 = start, 3^1 = select; 3^0 reserved.
  return norm(
    axisX * 6561 + axisY * 2187 + btnA * 729 + btnB * 243 +
    btnX * 81 + btnY * 27 + start * 9 + select * 3,
  );
}

export function GameDisplay({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const heldKeys = useRef(new Set<string>());

  // Auto-focus so arrow keys route to the gamepad immediately
  useEffect(() => {
    canvasRef.current?.focus();
  }, []);

  // Render game frame into offscreen canvas, then blit scaled to display canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!backRef.current) {
      backRef.current = document.createElement('canvas');
      backRef.current.width = GAME_PX;
      backRef.current.height = GAME_PX;
    }
    renderGameFrame(backRef.current, emu.machine.mem, (a) => emu.machine.peek(a));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.key)) e.preventDefault();
    heldKeys.current.add(e.key);
    emu.displayDevice.setGamepadState(0, computePad(heldKeys.current));
  };

  const onKeyUp = (e: KeyboardEvent) => {
    heldKeys.current.delete(e.key);
    emu.displayDevice.setGamepadState(0, computePad(heldKeys.current));
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      style="border:1px solid #26263a; flex-shrink:0; cursor:crosshair; outline:none; image-rendering:pixelated"
      title="game display — click to focus for keyboard/gamepad input"
    />
  );
}
