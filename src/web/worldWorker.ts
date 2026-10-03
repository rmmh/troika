import firmware from 'asm-dir:firmware/include';
import { createStarterWorld, starterScreen } from '../world/starter';
import { DISPLAY_PX } from '../core/display';
import { renderTextPixels } from '../core/textDisplay';
import { canCheckpoint, clientFirmwareDescriptor, decodeCheckpoint, encodeCheckpoint } from '../world/checkpoint';
import type { WorldOutput, WorldInput } from './worldProtocol';

const port = globalThis as unknown as {
  onmessage: (event: MessageEvent<WorldInput>) => void;
  postMessage(message: WorldOutput, transfer?: Transferable[]): void;
};
const sources = new Map(firmware.map(item => [item.id, item.src]));
const source = (name: string) => {
  const source = sources.get(name);
  if (source === undefined) throw new Error(`Missing firmware: ${name}`);
  return source;
};
let session = createStarterWorld(source);
let { world, machines, keyboard } = session;
const descriptor = clientFirmwareDescriptor(session);
let saving = false, storageBusy = false, saveDeadline = 0, identity = "";
async function firmwareIdentity() {
  if (!identity) {
    if (!crypto.subtle) throw new Error('Disk checkpoints require localhost or an HTTPS connection.');
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(descriptor));
    identity = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return identity;
}
function storageDone(error?: string) {
  saving = false; storageBusy = false; port.postMessage({ type: "storage", busy: false, error });
}
function saveIfReady() {
  if (!saving) return;
  try {
    if (canCheckpoint(session)) {
      const buffer = encodeCheckpoint(session, identity);
      port.postMessage({ type: "checkpoint", buffer }, [buffer]); storageDone();
    } else if (!running || world.cycles >= saveDeadline) storageDone("World is busy. Resume or finish the current operation before saving.");
  } catch (failure) { storageDone(failure instanceof Error ? failure.message : String(failure)); }
}
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
      for (const name of ['server', 'archive', 'door'] as const) {
        if (machines[name].peek(2199)) throw new Error(`${name} stopped: ${machines[name].peek(2199)}`);
      }
      if (!powered && machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80 && machines.door.peek(2381) === 80) {
        keyboard.queueText(' '); powered = true;
      }
      if (machines.client.peek(2504) === -2) throw new Error(`Browser stopped: ${machines.client.peek(2505)}`);
    } while (performance.now() < end);
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure); running = false;
  }
  if (error && storageBusy) storageDone(error);
  saveIfReady();
  if (error || performance.now() - lastFrame >= 50) frame();
  if (running) timer = setTimeout(tick, 0);
}
port.onmessage = async ({ data }) => {
  if (data.type === "save" || data.type === "load") {
    if (storageBusy) return;
    storageBusy = true; port.postMessage({ type: "storage", busy: true });
    try {
      const hash = await firmwareIdentity();
      if (data.type === "save") {
        if (error) throw new Error(error);
        saving = true; saveDeadline = world.cycles + 100_000_000; saveIfReady();
      } else {
        const retained = decodeCheckpoint(data.buffer, hash);
        const restored = createStarterWorld(source, retained);
        if (timer !== undefined) clearTimeout(timer);
        session = restored; ({ world, machines, keyboard } = session);
        running = true; powered = false; error = undefined;
        storageDone(); frame(); timer = setTimeout(tick, 0);
      }
    } catch (failure) { storageDone(failure instanceof Error ? failure.message : String(failure)); }
    return;
  }
  if (storageBusy) return;
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
