import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { unpackAstronomyDigest } from '../src/world/astronomy/digest';

const cache = new Map<string, Int16Array>();

export function readAstronomyDigest(path: string | URL): Int16Array {
  const key = String(path);
  let cells = cache.get(key);
  if (!cells) { cells = unpackAstronomyDigest(gunzipSync(readFileSync(path))); cache.set(key, cells); }
  return cells;
}
