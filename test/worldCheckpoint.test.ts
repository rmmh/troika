import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeAll, expect, test } from 'vitest';
import { createStarterWorld } from '../src/world/starter';
import { canCheckpoint, clientFirmwareDescriptor, decodeCheckpoint, encodeCheckpoint, CHECKPOINT_BYTES, type StarterSession } from '../src/world/checkpoint';

let session: StarterSession, identity: string;
beforeAll(() => {
  session = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  identity = createHash('sha256').update(clientFirmwareDescriptor(session)).digest('hex');
  session.machines.client.poke(2504, 5); session.machines.client.poke(2505, 1);
});
test('bundled checkpoints preserve every signed cell of all three disks independently', () => {
  const encoded = encodeCheckpoint(session, identity);
  expect(encoded.byteLength).toBe(CHECKPOINT_BYTES);
  const decoded = decodeCheckpoint(encoded, identity);
  for (const role of ['client', 'server', 'archive'] as const) expect(decoded[`${role}Disk`]).toEqual(session.disks[role].image());
  decoded.clientDisk.fill(0);
  expect(decodeCheckpoint(encoded, identity).clientDisk).toEqual(session.disks.client.image());
  expect(() => decodeCheckpoint(encoded.slice(1), identity)).toThrow('size');
  expect(() => decodeCheckpoint(encoded, '0'.repeat(64))).toThrow('mismatch');
  const invalid = encoded.slice(0); new DataView(invalid).setInt16(invalid.byteLength - 2, 9842, true);
  expect(() => decodeCheckpoint(invalid, identity)).toThrow('invalid tryte');
  expect(() => encodeCheckpoint(session, 'bad')).toThrow('identity');
});
test('safe-point gate rejects active client actions, phase loading, keyboard input and open server handles', () => {
  expect(canCheckpoint(session)).toBe(true);
  for (const [role, address, value] of [['client', 2505, 0], ['client', 6960, 3], ['client', 2488, 1], ['client', 2504, 3], ['server', 6960, 3], ['server', 5130, 1], ['server', -9219, 1], ['archive', 6960, 1], ['archive', 5130, 3], ['archive', -9219, 3]] as const) {
    const machine = session.machines[role], prior = machine.peek(address);
    machine.poke(address, value); expect(canCheckpoint(session)).toBe(false);
    expect(() => encodeCheckpoint(session, identity)).toThrow('busy'); machine.poke(address, prior);
  }
  session.machines.client.poke(2504, 4); session.machines.client.poke(5446, 1);
  expect(canCheckpoint(session)).toBe(true);
  session.machines.client.poke(5368, 2); expect(canCheckpoint(session)).toBe(false);
  session.machines.client.poke(5368, 0); session.keyboard.queueText('x'); expect(canCheckpoint(session)).toBe(false);
  session.machines.client.read(69); session.machines.client.poke(2504, 5); session.machines.client.poke(2505, 1);
  for (const role of ['client', 'server', 'archive'] as const) {
    session.controllers[role].write(-8, 3); // FLUSH is still an active disk operation.
    expect(canCheckpoint(session)).toBe(false);
    session.controllers[role].write(-8, 4); // RESET cancels it without modifying media.
    expect(canCheckpoint(session)).toBe(true);
  }
});
