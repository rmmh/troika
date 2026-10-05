import packed from './data/eclipse-cartridge.json';
import { BlockMedium, BLOCK_SIZE } from '../../core/blockDevice';

export const ECLIPSE_CARTRIDGE_UNIT = 22;
let cached: Int16Array | undefined;
/** Decode immutable build output only. All event selection and arithmetic are guest code. */
export function createEclipseCartridge(): BlockMedium {
  if (!cached) {
    const bytes = atob(packed.base64);
    if (packed.schema !== 1 || bytes.length !== packed.blocks * BLOCK_SIZE * 2) throw new Error('Invalid eclipse cartridge artifact');
    cached = new Int16Array(bytes.length / 2);
    for (let i = 0; i < cached.length; i++) {
      const word = bytes.charCodeAt(i * 2) + bytes.charCodeAt(i * 2 + 1) * 256;
      cached[i] = word < 32768 ? word : word - 65536;
    }
  }
  return new BlockMedium(packed.blocks, true, cached);
}
