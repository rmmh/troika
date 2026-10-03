import type { Chunk } from '../asm/assemble';
import { MEM_SIZE, TRYTE_MIN, TRYTE_MAX } from '../core/tryte';

/** Text-mode client allocation; only the 54 live palette cells are reserved.
 * These are ordinary RAM extents, not extra memory or a bitmap/game layout. */
export const CLIENT_LAYOUT = [
  { name: 'screen', start: -9841, size: 729 },
  { name: 'resident.low', start: -9112, size: 5427 },
  { name: 'palette', start: -3685, size: 54 },
  { name: 'resident.middle', start: -3631, size: 3267 },
  { name: 'mmio', start: -364, size: 729 },
  { name: 'resident.high', start: 365, size: 972 },
  { name: 'network.buffers', start: 1337, size: 729 },
  { name: 'network.state', start: 2066, size: 486 },
  { name: 'page.text', start: 2552, size: 1458 },
  { name: 'page.script', start: 4010, size: 729 },
  { name: 'page.records', start: 4739, size: 486 },
  { name: 'forth.state', start: 5225, size: 243 },
  { name: 'native.stack', start: 5468, size: 243 },
  { name: 'scratch', start: 5711, size: 243 },
  { name: 'url.state', start: 5954, size: 486 },
  { name: 'filesystem', start: 6440, size: 567 },
  { name: 'margin', start: 7007, size: 2835 },
] as const;

export type RegionName = typeof CLIENT_LAYOUT[number]['name'];

/** Reject overlap, wrapping, and unaccounted cells before installing firmware. */
export function auditClientImage(chunks: readonly Chunk[], allowed: readonly RegionName[] = [
  'resident.low', 'resident.middle', 'resident.high',
]): { used: number; regions: Record<RegionName, number> } {
  const occupied = new Uint8Array(MEM_SIZE);
  const regions = Object.fromEntries(CLIENT_LAYOUT.map(r => [r.name, 0])) as Record<RegionName, number>;
  let used = 0;
  for (const chunk of chunks) {
    if (!Number.isInteger(chunk.addr) || chunk.addr < TRYTE_MIN || chunk.addr + chunk.data.length - 1 > TRYTE_MAX) {
      throw new Error('firmware chunk crosses the RAM boundary');
    }
    for (let i = 0; i < chunk.data.length; i++) {
      const addr = chunk.addr + i;
      const region = CLIENT_LAYOUT.find(r => addr >= r.start && addr < r.start + r.size)!;
      if (!allowed.includes(region.name)) throw new Error(`firmware writes reserved ${region.name} at ${addr}`);
      if (occupied[addr - TRYTE_MIN]) throw new Error(`overlapping firmware at ${addr}`);
      occupied[addr - TRYTE_MIN] = 1;
      regions[region.name]++;
      used++;
    }
  }
  return { used, regions };
}
