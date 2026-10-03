import { expect, test } from 'vitest';
import { buildNativeImage, NATIVE_IMAGE_MAGIC } from '../src/firmware/nativeImage';
import { norm } from '../src/core/tryte';

test('builds a disk image with linked resident calls, exact reservation length and a wrapping checksum', () => {
  const image = buildNativeImage({ base: 7007, capacity: 243, externals: { resident: -9112 }, source: 'C S resident O S P\nvalues: 9841 9841 -9841\nwork//27' });
  expect(image.file.slice(0, 3)).toEqual([NATIVE_IMAGE_MAGIC, 1, image.length]);
  expect(image.file[3]).toBe(image.file.slice(4).reduce((sum, cell) => norm(sum + cell), 0));
  expect(image.file.slice(-27)).toEqual(Array(27).fill(0));
  expect(image.assembly.labels.get('resident')).toBe(-9112);
  expect(image.assembly.labels.get('values')).toBeGreaterThanOrEqual(7007);
});
test('allows a reserved image to end exactly at the last RAM cell', () => {
  const image = buildNativeImage({ base: 9832, capacity: 10, source: 'last//10' });
  expect(image.length).toBe(10); expect(image.file.slice(4)).toEqual(Array(10).fill(0));
});
const invalid: Parameters<typeof buildNativeImage>[0][] = [
  { base: -3686, capacity: 2, source: '0 0' },
  { base: 5954, capacity: 2, source: '0 0' },
  { base: 7007, capacity: 0, source: '0' },
  { base: 7007, capacity: 1, source: '0 0' },
  { base: 7007, capacity: 27, source: '@7008\n0' },
  { base: 7007, capacity: 27, source: '' },
  { base: 7007, capacity: 27, source: 'J missing' },
  { base: 7007, capacity: 27, source: '0', externals: { inside: 7008 } },
  { base: 7007, capacity: 27, source: '0', externals: { 'invalid:name': -9112 } },
];
test.each(invalid)('rejects invalid image boundaries or source: %j', options => {
  expect(() => buildNativeImage(options)).toThrow();
});
