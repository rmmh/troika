import { BlockMedium } from '../../core/blockDevice';
import manifest from './data/de441-manifest.json';

/** Only decodes storage bytes. All astronomical evaluation runs on the guest. */
export function astronomyVolume(archive: number) {
  if (!Number.isInteger(archive) || archive < 1 || archive > 51) throw new Error('Unknown astronomy cartridge');
  const entry = manifest.volumes.find(volume => volume.firstYear === (archive - 21) * 100);
  if (!entry) throw new Error('Unknown astronomy cartridge');
  return entry;
}

export async function decodeAstronomyCartridge(archive: number, bytes: ArrayBuffer): Promise<BlockMedium> {
  const entry = astronomyVolume(archive);
  if (bytes.byteLength !== entry.bytes) throw new Error('Incomplete astronomy cartridge');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== entry.sha256) throw new Error('Astronomy cartridge checksum mismatch');
  const view = new DataView(bytes), cells = new Int16Array(bytes.byteLength / 2);
  for (let i = 0; i < cells.length; i++) cells[i] = view.getInt16(i * 2, true);
  return new BlockMedium(entry.blocks, true, cells);
}

export const astronomyManifestIdentity = JSON.stringify(manifest);
