import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { decodeAstronomyCartridge } from '../src/world/astronomy/cartridge';
import manifest from '../src/world/astronomy/data/de441-manifest.json';
import { gunzipSync } from 'node:zlib';
import { unpackAstronomyDigest } from '../src/world/astronomy/digest';

test('all immutable JPL cartridges validate their pinned bytes and hardware geometry', async () => {
  for (const [index, entry] of manifest.volumes.entries()) {
    const bytes = Uint8Array.from(readFileSync(new URL(`../src/world/astronomy/data/${entry.file}`, import.meta.url))).buffer;
    const medium = await decodeAstronomyCartridge(entry.firstYear / 100 + 21, bytes);
    expect(medium.blocks).toBe(entry.blocks);
    expect(medium.readOnly).toBe(true);
    expect([...medium.read(0).slice(0, 4)]).toEqual([441, 1, entry.firstYear, entry.lastYear - entry.firstYear + 1]);
    expect(() => medium.write(0, new Int16Array(243))).toThrow('read-only');
  }
}, 300_000);

test('malformed digest payloads cannot produce native media', () => {
  const entry = manifest.volumes.at(-1)!;
  const payload = gunzipSync(readFileSync(new URL(`../src/world/astronomy/data/${entry.file}`, import.meta.url)));
  expect(() => unpackAstronomyDigest(payload.subarray(0, -1))).toThrow('Truncated');
  expect(() => unpackAstronomyDigest(Buffer.concat([payload, Buffer.from([0])]))).toThrow('Trailing');
  const malformed = Buffer.from(payload);
  malformed.writeUInt32LE(0, 5);
  expect(() => unpackAstronomyDigest(malformed)).toThrow('quantum');
  malformed.writeUInt32LE(400, 5);
  malformed.writeInt16LE(0, 17);
  expect(() => unpackAstronomyDigest(malformed)).toThrow('header');
});

test('bad unit, truncated transfer and corrupted coefficients never become mounted media', async () => {
  const entry = manifest.volumes.at(-1)!;
  const bytes = Uint8Array.from(readFileSync(new URL(`../src/world/astronomy/data/${entry.file}`, import.meta.url)));
  await expect(decodeAstronomyCartridge(0, bytes.buffer)).rejects.toThrow('Unknown');
  await expect(decodeAstronomyCartridge(51, bytes.buffer.slice(0, -1))).rejects.toThrow('Incomplete');
  bytes[500]! ^= 1;
  await expect(decodeAstronomyCartridge(51, bytes.buffer)).rejects.toThrow('checksum');
});


test('v2 predictor revision, geometry and coefficient streams are validated before mounting', () => {
  const entry = manifest.volumes[0]!;
  const payload = gunzipSync(readFileSync(new URL(`../src/world/astronomy/data/${entry.file}`, import.meta.url)));
  expect(payload[4]).toBe(2);
  expect(() => unpackAstronomyDigest(payload.subarray(0, 496))).toThrow('Truncated');
  expect(() => unpackAstronomyDigest(payload.subarray(0, 500))).toThrow('Truncated');
  const malformed = Buffer.from(payload);
  malformed.writeUInt32LE(0, 5);
  expect(() => unpackAstronomyDigest(malformed)).toThrow('quantum');
  malformed.writeUInt32LE(1, 5);
  malformed.writeUInt16LE(0, 495);
  expect(() => unpackAstronomyDigest(malformed)).toThrow('bounds');
});
