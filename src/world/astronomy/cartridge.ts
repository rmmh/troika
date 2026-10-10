import { BlockMedium } from '../../core/blockDevice';
import manifest from './data/de441-manifest.json';
import { unpackAstronomyDigest } from './digest';

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
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const payload = new Uint8Array(await new Response(stream).arrayBuffer());
  if (payload.length !== entry.payloadBytes) throw new Error('Incomplete astronomy digest');
  const cells = unpackAstronomyDigest(payload);
  if (cells.byteLength !== entry.nativeBytes) throw new Error('Incomplete native astronomy cartridge');
  const native = new Uint8Array(cells.length * 2), view = new DataView(native.buffer);
  for (let i = 0; i < cells.length; i++) view.setInt16(i * 2, cells[i]!, true);
  const nativeDigest = await crypto.subtle.digest('SHA-256', native);
  const nativeHash = Array.from(new Uint8Array(nativeDigest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (nativeHash !== entry.nativeSha256) throw new Error('Native astronomy checksum mismatch');
  return new BlockMedium(entry.blocks, true, cells);
}

export const astronomyManifestIdentity = JSON.stringify(manifest);
