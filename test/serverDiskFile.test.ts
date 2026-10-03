import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { ServerDiskFile } from '../src/cli/serverDiskFile';

function temporary(run: (path: string, directory: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'troika-disk-test-'));
  try { run(join(directory, 'server.disk'), directory); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}
test('physical disk checkpoints round-trip signed cells and replace the prior image', () => temporary((path, directory) => {
  const image = new Int16Array(81 * 243); image[0] = -9841; image[10] = 9841; image[image.length - 1] = -54;
  const first = new ServerDiskFile(path);
  try {
    expect(first.image).toBeUndefined(); first.checkpoint(image);
    expect(readFileSync(path).readInt16LE(0)).toBe(-9841);
    expect(() => new ServerDiskFile(path)).toThrow('locked');
    image[1] = 1234; first.checkpoint(image);
    expect(readdirSync(directory).sort()).toEqual(['server.disk','server.disk.lock']);
  } finally { first.close(); }
  const reopened = new ServerDiskFile(path);
  try { expect(reopened.image).toEqual(image); } finally { reopened.close(); }
  first.close(); expect(() => first.checkpoint(image)).toThrow('closed');
  expect(readdirSync(directory)).toEqual(['server.disk']);
}));
test('invalid checkpoint data preserves the previous file', () => temporary(path => {
  const store = new ServerDiskFile(path);
  try {
    const valid = new Int16Array(81 * 243); store.checkpoint(valid); const before = readFileSync(path);
    expect(() => store.checkpoint(new Int16Array(1))).toThrow('size');
    const invalid = valid.slice(); invalid[100] = 9842;
    expect(() => store.checkpoint(invalid)).toThrow('invalid tryte'); expect(readFileSync(path)).toEqual(before);
  } finally { store.close(); }
}));
test.each(['short', 'out-of-range'])('invalid stored images release their lock and remain untouched: %s', kind => temporary((path, directory) => {
  const bytes = Buffer.alloc(kind === 'short' ? 1 : 81 * 243 * 2);
  if (kind !== 'short') bytes.writeInt16LE(-9842, 20);
  writeFileSync(path, bytes);
  expect(() => new ServerDiskFile(path)).toThrow(kind === 'short' ? 'exactly 81 blocks' : 'invalid tryte');
  expect(readFileSync(path)).toEqual(bytes); expect(readdirSync(directory)).toEqual(['server.disk']);
}));
