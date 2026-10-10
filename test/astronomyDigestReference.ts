import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { unpackAstronomyDigest } from '../src/world/astronomy/digest';

export function readAstronomyDigest(path: string | URL): Int16Array {
  return unpackAstronomyDigest(gunzipSync(readFileSync(path)));
}
