import { expect, test } from 'vitest';
import { World } from '../src/core/world';
import { TextDevice } from '../src/core/textDevice';
import { BlockMedium } from '../src/core/blockDevice';
import { decodeSnapshot, encodeSnapshot } from '../src/world/snapshot';
const identity = 'a'.repeat(64);
function fixture() {
  const world = new World(), cpu = world.addMachine('cpu');
  cpu.attach(new TextDevice());
  world.addInterface('cpu', 4, [0, 0, 1], 'lan');
  const medium = new BlockMedium(27);
  const disk = world.addDisk('cpu', [medium]);
  return {world, medium, disk};
}
test('snapshot file round trips typed memory, infinite deadlines and queued input for deterministic replay', () => {
  const a = fixture(), b = fixture();
  a.disk.write(-9, -9841); a.disk.write(-8, 2);
  a.world.queueAction({kind: 'text', host: 'cpu', cells: [9841, -9841]}, 100);
  a.world.advanceTo(17);
  const snapshot = {world: a.world.captureState(), driver: {powered: true, npcPowered: false, npc: false}};
  const decoded = decodeSnapshot(encodeSnapshot(snapshot, identity), identity);
  expect(decoded).toEqual(snapshot);
  expect(decoded.world.hosts[0]!.cpu.memory).toBeInstanceOf(Int16Array);
  b.world.restoreState(decoded.world);
  a.world.advanceTo(6561); b.world.advanceTo(6561);
  expect(b.world.captureState()).toEqual(a.world.captureState());
  expect(b.medium.read(0)[0]).toBe(-9841);
});
test('snapshot decoder rejects incompatible metadata, malformed tagged values and cells before narrowing', () => {
  const f = fixture();
  const bytes = encodeSnapshot({world: f.world.captureState(), driver: {powered: false, npcPowered: false, npc: false}}, identity);
  const json = new TextDecoder().decode(bytes);
  expect(() => decodeSnapshot(bytes, 'b'.repeat(64))).toThrow('mismatch');
  for (const change of [
    (s: any) => { s.version = 2; },
    (s: any) => { s.driver.powered = 1; },
    (s: any) => { s.driver.npcPowered = true; },
    (s: any) => { s.world.hosts[0].cpu.memory.cells[0] = 65536; },
    (s: any) => { s.world.network.ports[0].device.due.$troika = 'unknown'; },
  ]) {
    const saved = JSON.parse(json); change(saved);
    expect(() => decodeSnapshot(new TextEncoder().encode(JSON.stringify(saved)).buffer, identity)).toThrow();
  }
  expect(() => decodeSnapshot(bytes.slice(0, -1), identity)).toThrow();
  expect(() => decodeSnapshot(new Uint8Array([255]).buffer, identity)).toThrow();
});

test('large cartridge bytes use compact little-endian storage and validate every decoded tryte', () => {
  const f = fixture();
  const cells = Int16Array.from({length: 100 * 243}, (_, i) => i % 19683 - 9841);
  const medium = new BlockMedium(100, true, cells);
  f.disk.setMedium(1, medium);
  const snapshot = {world: f.world.captureState(), driver: {powered: false, npcPowered: false, npc: false}};
  const encoded = encodeSnapshot(snapshot, identity);
  expect(decodeSnapshot(encoded, identity)).toEqual(snapshot);
  const json = JSON.parse(new TextDecoder().decode(encoded));
  const packed = json.world.media[1].data;
  expect(packed.$troika).toBe('trytes-le');
  expect(packed.bytes.length).toBe(cells.byteLength / 3 * 4);
  for (const bytes of ['/38=', 'AAA', '???=', 'AA==', '//8=AA==']) {
    packed.bytes = bytes;
    expect(() => decodeSnapshot(new TextEncoder().encode(JSON.stringify(json)).buffer, identity)).toThrow();
  }
});
