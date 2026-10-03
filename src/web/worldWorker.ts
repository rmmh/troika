import firmware from 'asm-dir:firmware/include';
import { createStarterWorld, starterScreen } from '../world/starter';
import { DISPLAY_PX } from '../core/display';
import { renderTextPixels } from '../core/textDisplay';
import type { WorldFrame, WorldInput } from './worldProtocol';

const port = globalThis as unknown as {
  onmessage: (event: MessageEvent<WorldInput>) => void;
  postMessage(message: WorldFrame, transfer: Transferable[]): void;
};
const sources = new Map(firmware.map(item => [item.id, item.src]));
const session = createStarterWorld(name => {
  const source = sources.get(name);
  if (source === undefined) throw new Error(`Missing firmware: ${name}`);
  return source;
});
const { world, machines, keyboard } = session;
let running = true, powered = false, error: string | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastFrame = -Infinity;

function frame() {
  const pixels = new Uint32Array(DISPLAY_PX * DISPLAY_PX);
  renderTextPixels(pixels, machines.client.mem, address => machines.client.peek(address));
  const state = machines.client.peek(2504);
  const status = error ? 'Stopped' : !running ? 'Paused' : !powered ? 'Starting services' : state === 5 ? 'File console' : state === 4 ? 'Ready' : 'Working';
  port.postMessage({ type: 'frame', pixels: pixels.buffer, text: starterScreen(machines.client), cycles: world.cycles, running, powered, status, error }, [pixels.buffer]);
  lastFrame = performance.now();
}
function tick() {
  timer = undefined;
  if (!running || error) return;
  try {
    const end = performance.now() + 12;
    do {
      world.runCycles(6561);
      for (const name of ['server', 'archive'] as const) {
        if (machines[name].peek(2199)) throw new Error(`${name} stopped: ${machines[name].peek(2199)}`);
      }
      if (!powered && machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80) {
        keyboard.queueText(' '); powered = true;
      }
      if (machines.client.peek(2504) === -2) throw new Error(`Browser stopped: ${machines.client.peek(2505)}`);
    } while (performance.now() < end);
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure); running = false;
  }
  if (error || performance.now() - lastFrame >= 50) frame();
  if (running) timer = setTimeout(tick, 0);
}
port.onmessage = ({ data }) => {
  if (data.type === 'keys') {
    if (powered && !error && data.cells.length <= 256 && data.cells.every(cell => Number.isInteger(cell) && cell >= -9841 && cell <= 9841)) keyboard.queueTrytes(data.cells);
  } else if (data.type === 'running' && !error) {
    running = data.value;
    if (timer !== undefined) clearTimeout(timer);
    timer = running ? setTimeout(tick, 0) : undefined;
    frame();
  }
};
frame(); timer = setTimeout(tick, 0);
