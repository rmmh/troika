import type { LinkedFirmware } from './link';
import { CLIENT_LAYOUT } from './layout';
import { norm } from '../core/tryte';
import { fromTribbles } from '../core/tryte';

export const PROGRAM_MAGIC = fromTribbles('PRG');
/** Counted segments in ordinary code RAM. Gaps inside a reservation are zeroed. */
export function buildProgramImage(program: LinkedFirmware, entry: number) {
  const segments = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || r.name === 'margin').flatMap(region => {
    const modules = program.modules.filter(m => m.region === region.name && m.reserved > 0);
    if (!modules.length) return [];
    const start = Math.min(...modules.map(m => m.address));
    const end = Math.max(...modules.map(m => m.address + m.reserved));
    const data = new Array<number>(end - start).fill(0);
    for (const chunk of program.image.chunks) {
      if (chunk.addr >= start && chunk.addr + chunk.data.length <= end) chunk.data.forEach((cell, i) => { data[chunk.addr - start + i] = cell; });
    }
    return [{start, data}];
  }).sort((a, b) => a.start - b.start);
  if (!segments.some(s => entry >= s.start && entry < s.start + s.data.length)) throw new Error('program entry is outside its segments');
  const payload = segments.flatMap(s => [s.start, s.data.length, ...s.data]);
  const checksum = [entry, segments.length, ...payload].reduce((sum, cell) => norm(sum + cell), 0);
  return {segments, file: [PROGRAM_MAGIC, 1, entry, segments.length, checksum, ...payload]};
}
