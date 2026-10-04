import type { createStarterWorld } from './starter';

export type StarterSession = ReturnType<typeof createStarterWorld>;
const ROLES = ['client', 'server', 'archive'] as const;
const CELLS = 81 * 243;
const PREFIX = 'TROIKA WORLD DISKS 1 ';
const PROGRAM_PREFIX = 'TROIKA WORLD DISKS 2 ';
const HEADER = PREFIX.length + 65;
export const CHECKPOINT_BYTES = HEADER + ROLES.length * CELLS * 2;
export const PROGRAM_CHECKPOINT_BYTES = HEADER + (243 + 81 + 81) * 243 * 2;

/** Use only on fresh initial client media, before guest execution. */
export function clientFirmwareDescriptor(session: StarterSession): string {
  return JSON.stringify([session.images.client.image.chunks, Array.from(session.disks.client.image())]);
}

/** No active guest mutation or physical write may straddle the copy. */
export function canCheckpoint(session: StarterSession): boolean {
  const { machines, controllers } = session;
  const client = machines.client;
  const state = client.peek(2504);
  const programIdle = !!session.programs && client.peek(2505) === 1 && client.peek(6960) === 0 &&
    ((state === 11 && client.peek(2514) === 1) || (state === 10 && client.peek(2514) === 1) || state === 12);
  const idle = (programIdle || ((client.peek(2504) === 5 && client.peek(2505) === 1) || (client.peek(2504) === 4 && client.peek(5446) === 1 && client.peek(5368) === 0)))
    && client.peek(2488) === 0 && client.read(68) !== 4;
  // Both file servers park readers (and the archive's active upload handle).
  return idle && ['server', 'archive'].every(role =>
    [6960, 4751 + 379, -9598 + 379].every(address => machines[role as 'server' | 'archive'].peek(address) === 0))
    && client.peek(6960) !== 3
    && ROLES.every(role => controllers[role].cyclesUntilCompletion() === Infinity);
}

function header(identity: string, programs = false): Uint8Array {
  if (!/^[a-f0-9]{64}$/.test(identity)) throw new Error('Invalid firmware identity');
  return new TextEncoder().encode(`${programs ? PROGRAM_PREFIX : PREFIX}${identity}\n`);
}
export function encodeCheckpoint(session: StarterSession, identity: string): ArrayBuffer {
  if (!canCheckpoint(session)) throw new Error('World is busy; wait for the current operation to finish');
  const bytes = new Uint8Array(session.programs ? PROGRAM_CHECKPOINT_BYTES : CHECKPOINT_BYTES);
  bytes.set(header(identity, !!session.programs));
  const view = new DataView(bytes.buffer);
  let offset = HEADER;
  for (const role of ROLES) {
    const disk = session.disks[role].image();
    if (disk.length !== (role === 'client' && session.programs ? 243 * 243 : CELLS)) throw new Error('Disk size changed');
    for (const cell of disk) {
      if (cell < -9841 || cell > 9841) throw new Error('Disk contains an invalid tryte');
      view.setInt16(offset, cell, true); offset += 2;
    }
  }
  return bytes.buffer;
}
export function decodeCheckpoint(buffer: ArrayBuffer, identity: string): { clientDisk: Int16Array; serverDisk: Int16Array; archiveDisk: Int16Array } {
  const programs = buffer.byteLength === PROGRAM_CHECKPOINT_BYTES;
  if (!programs && buffer.byteLength !== CHECKPOINT_BYTES) throw new Error('Invalid world disk checkpoint size');
  const expected = header(identity, programs), bytes = new Uint8Array(buffer);
  if (expected.some((value, i) => bytes[i] !== value)) throw new Error('Checkpoint format or firmware mismatch; use the matching Troika build');
  const view = new DataView(buffer);
  let offset = HEADER;
  const disks = ROLES.map(role => {
    const cells = role === 'client' && programs ? 243 * 243 : CELLS;
    const image = new Int16Array(cells);
    for (let i = 0; i < cells; i++) {
      const cell = view.getInt16(offset, true); offset += 2;
      if (cell < -9841 || cell > 9841) throw new Error('Checkpoint contains an invalid tryte');
      image[i] = cell;
    }
    return image;
  });
  return { clientDisk: disks[0]!, serverDisk: disks[1]!, archiveDisk: disks[2]! };
}
