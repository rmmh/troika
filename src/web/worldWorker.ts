import { AstronomyMedia } from './astronomyMedia';
import { astronomyManifestIdentity } from '../world/astronomy/cartridge';
import { decodeSnapshot, encodeSnapshot } from '../world/snapshot';
import { encodeText } from '../core/textEncoding';
import firmware from 'asm-dir:firmware/include';
import { createStarterWorld, starterScreen } from '../world/starter';
import { DISPLAY_PX, DISPLAY_BITMAP, renderBitmapPixels } from '../core/display';
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
let session = createStarterWorld(source, {npc:npcEnabled,chat:true,programs:true});
let astronomyMedia = new AstronomyMedia(session);
let npcPowered = false;
let { world, machines } = session;
const descriptor = clientFirmwareDescriptor(session);
let saving = false, storageBusy = false, saveDeadline = 0, identity = "";
// Includes generated startup code and disk overlays as well as assembly sources.
const liveDescriptor = JSON.stringify({astronomy: astronomyManifestIdentity, sources: [...sources].sort(([a], [b]) => a.localeCompare(b)), initial: world.captureState()},
  (_key, value) => value instanceof Int16Array ? Array.from(value) : value === Infinity ? 'infinity' : value);
let snapshotIdentity = '';
async function liveIdentity() {
  if (!snapshotIdentity) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(liveDescriptor));
    snapshotIdentity = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return snapshotIdentity;
}
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
let audioEnabled = false;

function frame() {
  const pixels = new Uint32Array(DISPLAY_PX * DISPLAY_PX);
  const render = machines.client.peek(0) === DISPLAY_BITMAP ? renderBitmapPixels : renderTextPixels;
  render(pixels, machines.client.mem, address => machines.client.peek(address));
  const state = machines.client.peek(2504);
  const status = error ? 'Stopped' : !running ? 'Paused' : !powered ? 'Starting services' : state === 11 ? 'Programs' : state === 15 ? 'Program path' : state === 14 ? 'Disk program' : state === 10 ? 'Terminal' : state === 12 ? 'IRC' : state === 5 ? 'File console' : state === 4 ? 'Ready' : 'Working';
  const npc = session.npc ? {visits:session.npc.machine.peek(2325), errors:session.npc.machine.peek(2326), status:session.npc.machine.peek(2327), text:starterScreen(session.npc.machine)} : undefined;
  const targets = { ...machines, ...Object.fromEntries(session.web?.servers.map(server => [server.id, server.machine]) ?? []), ...(session.chat ? { chat: session.chat.machine, ...Object.fromEntries(session.chat.clients.map(c=>[c.id,c.machine])) } : {}), ...(session.npc ? { npc: session.npc.machine } : {}) };
  const images = { ...session.images, ...Object.fromEntries(session.web?.servers.map(server => [server.id, server.image]) ?? []), ...(session.chat ? { chat: session.chat.image, ...Object.fromEntries(session.chat.clients.map(c=>[c.id,c.image])) } : {}), ...(session.npc ? { npc: session.npc.image } : {}) };
  if (session.programs) {
    const programs=session.programs, active=machines.client.peek(2532);
    const downloaded = active === 4 ? session.web?.catalog.software.find(app => app.number === machines.client.peek(2533))?.program.image : undefined;
    const program=active===1?programs.web.resident:active===2?programs.terminal.image:active===3?programs.irc.image:downloaded??programs.core.image;
    const phase=active===1&&machines.client.peek(2487)===1 ? Object.values(programs.web.phases).find(p=>
      p.length===machines.client.peek(2489)&&p.file[3]===machines.client.peek(2492)) : undefined;
    images.client={...program,image:{...program.image,labels:new Map([...programs.core.image.image.labels,...program.image.labels,...(phase?.assembly.labels??[])])}};
  }
  const target = inspectMachine && targets[inspectMachine as keyof typeof targets];
  // inspect() includes MMIO without consuming input or acknowledging interrupts.
  const memory = target ? Int16Array.from({ length: 19683 }, (_, i) => target.inspect(i - 9841)) : undefined;
  const inspection = target && memory ? { machine: inspectMachine!, machines: Object.keys(targets), memory: memory.buffer, cycles: target.cycles, sleep: target.sleep ? { remaining: target.sleep.remaining } : null, labels: [...images[inspectMachine as keyof typeof images]!.image.labels] } : undefined;
  const samples = session.sound?.drainSamples() ?? [];
  const audio = audioEnabled && running && !error && !storageBusy ? Int16Array.from(samples).buffer : undefined;
  port.postMessage({ type: 'frame', audio, inspection, npc, chat:session.chat?.clients.map(c=>c.snapshot()), pixels: pixels.buffer, text: starterScreen(machines.client), cycles: world.cycles, running, powered, status, error }, [pixels.buffer, ...(audio ? [audio] : []), ...(memory ? [memory.buffer] : [])]);
  lastFrame = performance.now();
}
function tick() {
  timer = undefined;
  if (!running || error) return;
  try {
    const end = performance.now() + 12;
    do {
      world.runCycles(6561);
      astronomyMedia.poll();
      for (const name of ['server', 'archive', 'door', 'security', 'telnet'] as const) {
        if (machines[name].peek(2199)) throw new Error(`${name} stopped: ${machines[name].peek(2199)}`);
      }
      for (const server of session.web?.servers ?? []) {
        if (server.machine.peek(2199)) throw new Error(`${server.id} stopped: ${server.machine.peek(2199)}`);
      }
      if (!powered && machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80 && machines.door.peek(2381) === 80 && machines.security.peek(2381) === 80 && (session.web?.servers.every(server => server.machine.peek(2198) === 1) ?? true)) {
        world.queueAction({kind: 'text', host: 'client', cells: encodeText(' ')}); powered = true;
      }
      if (session.npc && !npcPowered && canCheckpoint(session)) {world.queueAction({kind: 'text', host: 'npc', cells: encodeText(' ')}); npcPowered = true;}
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
  if (data.type === 'audio') {
    audioEnabled = data.enabled; session.sound?.drainSamples(); return;
  }
  if (data.type === 'inspect') {
    inspectMachine = data.machine; frame(); return;
  }
  if (data.type === 'save-snapshot' || data.type === 'load-snapshot') {
    if (storageBusy) return;
    storageBusy = true; port.postMessage({type: 'storage', busy: true});
    // Freeze before hashing/decoding so asynchronous work cannot advance the source.
    const wasRunning = running;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined; running = false;
    try {
      const hash = await liveIdentity();
      if (data.type === 'save-snapshot') {
        const buffer = encodeSnapshot({world: world.captureState(), driver: {powered, npcPowered, npc: npcEnabled}}, hash);
        port.postMessage({type: 'snapshot', buffer}, [buffer]);
        running = wasRunning;
      } else {
        const saved = decodeSnapshot(data.buffer, hash);
        if (saved.driver.npc !== npcEnabled) throw new Error('Snapshot NPC configuration mismatch');
        astronomyMedia.cancel();
        world.restoreState(saved.world);
        powered = saved.driver.powered; npcPowered = saved.driver.npcPowered; error = undefined;
        for (const client of session.chat?.clients ?? []) client.inputError = undefined;
        // Stay paused so the restored instant can be inspected before resuming.
      }
      storageDone();
    } catch (failure) {
      running = wasRunning;
      storageDone(failure instanceof Error ? failure.message : String(failure));
    }
    frame(); if (running && !error) timer = setTimeout(tick, 0);
    return;
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
        const restored = createStarterWorld(source, {...retained,npc:npcEnabled,chat:true,programs:true});
        if (timer !== undefined) clearTimeout(timer);
        astronomyMedia.cancel();
        session = restored; astronomyMedia = new AstronomyMedia(session); ({ world, machines } = session);
        running = true; powered = false; npcPowered = false; error = undefined;
        storageDone(); frame(); timer = setTimeout(tick, 0);
      }
    } catch (failure) { storageDone(failure instanceof Error ? failure.message : String(failure)); }
    return;
  }
  if (storageBusy) return;
  if (data.type === 'chat') {
    const client=session.chat?.clients[data.client];
    if (client) {
      try {
        if(data.action==='join') client.join(data.room ?? 1);
        else if(data.action==='say') client.say(data.text ?? '');
        else if(data.action==='retry') client.retry();
        else if(data.action==='leave') client.leave();
      } catch (failure) { client.inputError=failure instanceof Error ? failure.message : String(failure); }
      frame();
    }
  } else if (data.type === 'keys') {
    if (powered && !error && data.cells.length <= 256 && data.cells.every(cell => Number.isInteger(cell) && cell >= -9841 && cell <= 9841)) world.queueAction({kind: 'text', host: 'client', cells: data.cells});
  } else if (data.type === 'running' && !error) {
    running = data.value;
    if (timer !== undefined) clearTimeout(timer);
    timer = running ? setTimeout(tick, 0) : undefined;
    frame();
  }
};
frame(); timer = setTimeout(tick, 0);
