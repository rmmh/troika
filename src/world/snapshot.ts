import type { WorldState } from '../core/world';
import { stateBoolean, stateTrytes } from '../core/stateValidation';

export const MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024;
const FORMAT = 'TROIKA WORLD SNAPSHOT';
export interface SnapshotDriverState { powered: boolean; npcPowered: boolean; npc: boolean; }
export interface WorldSnapshot { world: WorldState; driver: SnapshotDriverState; }

function validateIdentity(identity: string): void {
  if (!/^[a-f0-9]{64}$/.test(identity)) throw new Error('Invalid snapshot firmware identity');
}
function validateDriver(driver: SnapshotDriverState): void {
  stateBoolean(driver.powered); stateBoolean(driver.npcPowered); stateBoolean(driver.npc);
  if (!driver.npc && driver.npcPowered) throw new Error('Invalid snapshot NPC state');
}

/** Typed arrays and infinite hardware deadlines must survive JSON losslessly. */
export function encodeSnapshot(snapshot: WorldSnapshot, identity: string): ArrayBuffer {
  validateIdentity(identity); validateDriver(snapshot.driver);
  const json = JSON.stringify({format: FORMAT, version: 1, identity, ...snapshot}, (_key, value) => {
    if (value instanceof Int16Array) return {$troika: 'trytes', cells: Array.from(value)};
    if (value === Infinity) return {$troika: 'infinity'};
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Invalid snapshot number');
    return value;
  });
  const bytes = new TextEncoder().encode(json);
  if (bytes.byteLength > MAX_SNAPSHOT_BYTES) throw new Error('Snapshot exceeds file size limit');
  return bytes.buffer;
}

/** Decoding does not change hardware. World.restoreState performs full atomic validation. */
export function decodeSnapshot(buffer: ArrayBuffer, identity: string): WorldSnapshot {
  validateIdentity(identity);
  if (!buffer.byteLength || buffer.byteLength > MAX_SNAPSHOT_BYTES) throw new Error('Invalid snapshot file size');
  const saved = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(buffer), (_key, value) => {
    if (value && typeof value === 'object' && '$troika' in value) {
      if (value.$troika === 'infinity' && Object.keys(value).length === 1) return Infinity;
      if (value.$troika === 'trytes' && Object.keys(value).length === 2) {
        // Validate before narrowing: Int16Array would silently wrap malformed cells.
        stateTrytes(value.cells);
        return Int16Array.from(value.cells);
      }
      throw new Error('Invalid snapshot encoding');
    }
    return value;
  });
  if (!saved || saved.format !== FORMAT || saved.version !== 1) throw new Error('Unsupported snapshot format');
  if (saved.identity !== identity) throw new Error('Snapshot firmware mismatch; use the same Troika build');
  validateDriver(saved.driver);
  if (!saved.world || typeof saved.world !== 'object') throw new Error('Missing snapshot world');
  return {world: saved.world, driver: saved.driver};
}
