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
const npcEnabled = new URLSearchParams(globalThis.location.search).get('npc') === '1';
let session = createStarterWorld(source, {npc:npcEnabled});
let npcPowered = false;
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
let inspectMachine: string | null = null;

function frame() {
  const pixels = new Uint32Array(DISPLAY_PX * DISPLAY_PX);
  renderTextPixels(pixels, machines.client.mem, address => machines.client.peek(address));
  const state = machines.client.peek(2504);
  const status = error ? 'Stopped' : !running ? 'Paused' : !powered ? 'Starting services' : state === 5 ? 'File console' : state === 4 ? 'Ready' : 'Working';
  const npc = session.npc ? {visits:session.npc.machine.peek(2325), errors:session.npc.machine.peek(2326), status:session.npc.machine.peek(2327), text:starterScreen(session.npc.machine)} : undefined;
  const targets = { ...machines, ...(session.npc ? { npc: session.npc.machine } : {}) };
  const images = { ...session.images, ...(session.npc ? { npc: session.npc.image } : {}) };
  const target = inspectMachine && targets[inspectMachine as keyof typeof targets];
  // inspect() includes MMIO without consuming input or acknowledging interrupts.
  const memory = target ? Int16Array.from({ length: 19683 }, (_, i) => target.inspect(i - 9841)) : undefined;
  const inspection = target && memory ? { machine: inspectMachine!, machines: Object.keys(targets), memory: memory.buffer, cycles: target.cycles, sleep: target.sleep ? { remaining: target.sleep.remaining } : null, labels: [...images[inspectMachine as keyof typeof images]!.image.labels] } : undefined;
  port.postMessage({ type: 'frame', inspection, npc, pixels: pixels.buffer, text: starterScreen(machines.client), cycles: world.cycles, running, powered, status, error }, [pixels.buffer, ...(memory ? [memory.buffer] : [])]);
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
      if (session.npc && !npcPowered && canCheckpoint(session)) {session.npc.keyboard.queueText(' '); npcPowered = true;}
      if (session.npc?.machine.peek(2504) === -2) throw new Error(`NPC stopped: ${session.npc.machine.peek(2505)}`);
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
  if (data.type === 'inspect') {
    inspectMachine = data.machine; frame(); return;
  }
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
        const restored = createStarterWorld(source, {...retained,npc:npcEnabled});
        if (timer !== undefined) clearTimeout(timer);
        session = restored; ({ world, machines, keyboard } = session);
        running = true; powered = false; npcPowered = false; error = undefined;
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
