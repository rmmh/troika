import { BlockMedium } from '../../core/blockDevice';
import manifest from './data/de441-manifest.json';

/** Only decodes storage bytes. All astronomical evaluation runs on the guest. */
export async function decodeAstronomyCartridge(unit: number, bytes: ArrayBuffer): Promise<BlockMedium> {
  if (!Number.isInteger(unit) || unit < 1 || unit > manifest.volumes.length) throw new Error('Unknown astronomy cartridge');
  const entry = manifest.volumes[unit - 1]!;
  if (bytes.byteLength !== entry.bytes) throw new Error('Incomplete astronomy cartridge');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== entry.sha256) throw new Error('Astronomy cartridge checksum mismatch');
  const view = new DataView(bytes), cells = new Int16Array(bytes.byteLength / 2);
  for (let i = 0; i < cells.length; i++) cells[i] = view.getInt16(i * 2, true);
  return new BlockMedium(entry.blocks, true, cells);
}

export const astronomyManifestIdentity = JSON.stringify(manifest);
