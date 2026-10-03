import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { encodeText } from '../src/core/textEncoding';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'fatMutate', 'fatGrow'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
class TracedMedium extends BlockMedium {
  readonly commits: { block: number; image: Int16Array }[] = [];
  override write(block: number, data: Int16Array) { super.write(block, data); this.commits.push({ block, image: this.image() }); }
}
function boot(image: Int16Array | BlockMedium, body: string, path = '/file', checked = true, stepHook?: (m: FirmwareProbe, disk: BlockDevice) => void) {
  const built = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done
      ${checked ? 'C S fs_check N A Z J done' : ''}
      ${body}
done: W 6200 A H 0sAAA Z` }]);
  const m = new FirmwareProbe(['mmio', 'filesystem', 'native.stack', 'url.state', 'page.text']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  encodeText(path).forEach((v, i) => m.poke(5954 + i, v));
  m.poke(REG_P, built.image.entry!);
  const medium = image instanceof BlockMedium ? image : new TracedMedium(image.length / 243, false, image);
  const controller = new BlockDevice([medium]); m.attach(controller);
  if (stepHook) {
    while (m.cycles < 20_000_000 && m.sleep?.remaining !== Infinity) { stepHook(m, controller); m.step(); }
    expect(m.sleep?.remaining).toBe(Infinity);
  } else expect(m.run(20_000_000)).toBe('sleep-forever');
  return { m, medium, result: m.peek(6200) };
}
const args = (path: string) => `M A 5954 M B ${path.length}`;
const begin = (path: string, blocks: number, used: number) => `${args(path)} M C ${blocks} M D ${used} C S fs_replace_begin N A Z J done`;
const fill = (value: number) => `M J fs_buffer M K 243 fill_${value}: W J ${value} I J 1 I K -1 N K Z J fill_${value}`;
function read(image: Int16Array, path: string) {
  const cells: number[] = [];
  const r = boot(image, `${args(path)} C S fs_lookup N A Z J done C S fs_open N A Z J done
      C S fs_read_next N A Z J done W 6201 B`, path, false);
  for (let i = 0; i < r.m.peek(6201); i++) cells.push(r.m.peek(6440 + i));
  return { ...r, cells };
}
function readAll(image: Int16Array, path: string) {
  const r = boot(image, `${args(path)} C S fs_lookup N A Z J done C S fs_open N A Z J done
      W 6203 3000
read_loop: C S fs_read_next N A Z J done E B Z J done
      W 6204 B R E 6201 A E B W 6201 E
      R A 6203 M C B M B fs_buffer C S fm_copy
      R E 6203 R F 6204 A E F W 6203 E
      J read_loop`, path, false);
  return { ...r, cells: Array.from({ length: r.m.peek(6201) }, (_, i) => r.m.peek(3000 + i)) };
}
function disk(files: Record<string, number[]> = {}, directories: string[] = [], blocks = 27) {
  return createDiskImage({ blocks, volumeId: [0, 0, 1], files, directories });
}

describe('native FAT mutations', () => {
  test.each(['/file', '/dir/file'])('creates %s with zeroed tail padding and durable content', path => {
    const r = boot(disk({}, ['/dir']), `${begin(path, 1, 3)} ${fill(7)} C S fs_replace_append N A Z J done C S fs_replace_finish`, path);
    expect(r.result).toBe(0); expect(r.m.peek(6976)).toBe(1); expect(r.m.peek(6960)).toBe(0);
    const got = read(r.medium.image(), path); expect(got.result).toBe(0); expect(got.cells).toEqual([7, 7, 7]);
    expect(boot(r.medium.image(), 'C S fs_check').result).toBe(0);
    expect(r.m.stackHighWater).toBeLessThanOrEqual(24);
  });
  test('replaces a two-block file with a one-block file and frees the old chain', () => {
    const r = boot(disk({ '/file': Array(300).fill(1) }), `${begin('/file', 1, 2)} ${fill(9)} C S fs_replace_append N A Z J done C S fs_replace_finish`);
    expect(r.result).toBe(0); expect(read(r.medium.image(), '/file').cells).toEqual([9, 9]);
    const check = boot(r.medium.image(), 'C S fs_check W 6201 B');
    expect(check.result).toBe(0); expect(check.m.peek(6201)).toBe(0);
  });
  test('creates and replaces an empty file without allocating data blocks', () => {
    for (const files of [{}, { '/file': [1, 2] }] as Record<string, number[]>[]) {
      const r = boot(disk(files), `${begin('/file', 0, 0)} C S fs_replace_finish`);
      expect(r.result).toBe(0); expect(read(r.medium.image(), '/file').cells).toEqual([]);
    }
  });
  test('abort frees its unpublished chain and preserves the old file', () => {
    const r = boot(disk({ '/file': [1] }), `${begin('/file', 2, 3)} ${fill(7)} C S fs_replace_append N A Z J done C S fs_replace_abort`);
    expect(r.result).toBe(0); expect(read(r.medium.image(), '/file').cells).toEqual([1]);
    const check = boot(r.medium.image(), 'C S fs_check W 6201 B'); expect(check.m.peek(6201)).toBe(0);
  });
  test('mkdir, nested creation, delete and empty rmdir preserve the tree', () => {
    const made = boot(disk(), `${args('/dir')} C S fs_mkdir`, '/dir'); expect(made.result).toBe(0);
    const child = boot(made.medium.image(), `${begin('/dir/file', 1, 1)} W fs_buffer 42 C S fs_replace_append N A Z J done C S fs_replace_finish`, '/dir/file');
    expect(child.result).toBe(0); expect(read(child.medium.image(), '/dir/file').cells).toEqual([42]);
    expect(boot(child.medium.image(), `${args('/dir')} C S fs_rmdir`, '/dir').result).toBe(-21);
    const removed = boot(child.medium.image(), `${args('/dir/file')} C S fs_delete`, '/dir/file'); expect(removed.result).toBe(0);
    const empty = boot(removed.medium.image(), `${args('/dir')} C S fs_rmdir`, '/dir'); expect(empty.result).toBe(0);
    const check = boot(empty.medium.image(), 'C S fs_check W 6201 B'); expect(check.result).toBe(0); expect(check.m.peek(6201)).toBe(0);
    expect(read(empty.medium.image(), '/dir').result).toBe(-12);
  });
});

describe('native mutation failure boundaries', () => {
  test('every atomic-write crash snapshot exposes the complete old or new file, and reclaim preserves it', () => {
    const old = Array(300).fill(1), replacement = Array(500).fill(7);
    const initial = disk({ '/file': old });
    const r = boot(initial, `${begin('/file', 3, 14)} W 6205 3
write_loop: ${fill(7)} C S fs_replace_append N A Z J done
      R E 6205 I E -1 W 6205 E N E Z J write_loop
      C S fs_replace_finish`);
    expect(r.result).toBe(0); expect(readAll(r.medium.image(), '/file').cells).toEqual(replacement);
    const commits = (r.medium as TracedMedium).commits; expect(commits.length).toBeGreaterThan(8);
    let published = false;
    for (const image of [initial, ...commits.map(c => c.image)]) {
      const got = readAll(image, '/file'); expect(got.result).toBe(0);
      const expected = got.cells.length === replacement.length ? replacement : old;
      if (expected === replacement) published = true;
      if (published) expect(expected).toBe(replacement);
      expect(got.cells).toEqual(expected);
      const repaired = boot(image, 'C S fs_reclaim N A Z J done C S fs_check W 6201 B');
      expect(repaired.result).toBe(0); expect(repaired.m.peek(6201)).toBe(0);
      expect(readAll(repaired.medium.image(), '/file').cells).toEqual(expected);
    }
  }, 20_000);
  test('media-full leaves the old file visible and explicit abort releases the partial replacement', () => {
    const old = Array(300).fill(1);
    const r = boot(disk({ '/file': old }), `${begin('/file', 17, 243)}
write_loop: ${fill(7)} C S fs_replace_append E A Z J write_loop
      W 6206 A C S fs_replace_abort W 6207 A R A 6206`);
    expect(r.result).toBe(-18); expect(r.m.peek(6207)).toBe(0);
    expect(readAll(r.medium.image(), '/file').cells).toEqual(old);
    const check = boot(r.medium.image(), 'C S fs_check W 6201 B'); expect(check.m.peek(6201)).toBe(0);
  });
  test('requires exactly the announced blocks before publishing and rejects extra append', () => {
    const r = boot(disk({ '/file': [1] }), `${begin('/file', 1, 1)}
      C S fs_replace_finish W 6206 A
      W fs_buffer 9 C S fs_replace_append N A Z J done
      W fs_buffer 8 C S fs_replace_append W 6207 A
      C S fs_replace_finish`);
    expect(r.result).toBe(0); expect(r.m.peek(6206)).toBe(-22); expect(r.m.peek(6207)).toBe(-22);
    expect(read(r.medium.image(), '/file').cells).toEqual([9]);
  });
  test('a second mutation cannot clobber the pending writer descriptor', () => {
    const r = boot(disk(), `${begin('/file', 1, 1)}
      ${args('/file')} M C Z M D Z C S fs_replace_begin W 6206 A
      ${args('/file')} C S fs_mkdir W 6207 A
      W fs_buffer 42 C S fs_replace_append N A Z J done C S fs_replace_finish`);
    expect(r.result).toBe(0); expect(r.m.peek(6206)).toBe(-1); expect(r.m.peek(6207)).toBe(-1);
    expect(read(r.medium.image(), '/file').cells).toEqual([42]);
  });
});

describe('native copy-on-write directory growth', () => {
  test('grows a full child directory, re-resolves the new slot and preserves every child', () => {
    const files = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`/d/f${i}`, [i + 1]]));
    const r = boot(disk(files), `${begin('/d/new', 1, 1)} W fs_buffer 99 C S fs_replace_append N A Z J done C S fs_replace_finish`, '/d/new');
    expect(r.result).toBe(0); expect(read(r.medium.image(), '/d/new').cells).toEqual([99]);
    for (let i = 0; i < 9; i++) expect(read(r.medium.image(), `/d/f${i}`).cells).toEqual([i + 1]);
    const parent = boot(r.medium.image(), `${args('/d')} C S fs_lookup`, '/d', false);
    expect(parent.m.peek(6953)).toBe(2);
    const check = boot(r.medium.image(), 'C S fs_check W 6201 B'); expect(check.result).toBe(0); expect(check.m.peek(6201)).toBe(0);
  });
  test('crashes during growth or insertion leave a valid tree; reclaim never deletes copied children', () => {
    const files = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`/d/f${i}`, [i + 1]]));
    const initial = disk(files);
    const r = boot(initial, `${begin('/d/new', 1, 1)} W fs_buffer 99 C S fs_replace_append N A Z J done C S fs_replace_finish`, '/d/new');
    expect(r.result).toBe(0);
    for (const image of [initial, ...(r.medium as TracedMedium).commits.map(c => c.image)]) {
      const repaired = boot(image, 'C S fs_reclaim N A Z J done C S fs_check W 6201 B');
      expect(repaired.result).toBe(0); expect(repaired.m.peek(6201)).toBe(0);
      for (let i = 0; i < 9; i++) expect(read(repaired.medium.image(), `/d/f${i}`).cells).toEqual([i + 1]);
      const target = read(repaired.medium.image(), '/d/new');
      expect([0, -12]).toContain(target.result);
      if (target.result === 0) expect(target.cells).toEqual([99]);
    }
  }, 30_000);
  test('insufficient space for a directory copy preserves the old directory and releases the temporary chain', () => {
    const files = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`/d/f${i}`, [i + 1]]));
    files['/large'] = Array(243 * 5).fill(8); // 27 blocks: only one free data block remains
    const initial = disk(files);
    const r = boot(initial, `${begin('/d/new', 0, 0)} C S fs_replace_finish`, '/d/new');
    expect(r.result).toBe(-18); expect(r.m.peek(6960)).toBe(0);
    for (let i = 0; i < 9; i++) expect(read(r.medium.image(), `/d/f${i}`).cells).toEqual([i + 1]);
    const check = boot(r.medium.image(), 'C S fs_check W 6201 B'); expect(check.m.peek(6201)).toBe(0);
  });
});

describe('native mutation validation and limits', () => {
  test('allocates and links a replacement across two FAT cache pages', () => {
    const image = disk({}, [], 486);
    for (let block = 12; block < 242; block++) image[243 + block] = -3;
    const r = boot(image, `${begin('/file', 3, 1)} W 6205 3
write_loop: ${fill(7)} C S fs_replace_append N A Z J done
      R E 6205 I E -1 W 6205 E N E Z J write_loop C S fs_replace_finish`);
    expect(r.result).toBe(0); expect(readAll(r.medium.image(), '/file').cells).toEqual(Array(487).fill(7));
    expect(Array.from(r.medium.image().slice(243 + 242, 243 + 245))).toEqual([243, 244, -1]);
    expect(boot(r.medium.image(), 'C S fs_check').result).toBe(0);
  });
  test.each([
    ['/dir', 'M C Z M D Z C S fs_replace_begin', -14],
    ['/dir', 'C S fs_delete', -14], ['/dir', 'C S fs_mkdir', -20],
    ['/file', 'C S fs_rmdir', -13], ['/', 'C S fs_rmdir', -15],
    ['/missing/x', 'M C Z M D Z C S fs_replace_begin', -12],
    ['/dir/missing', 'C S fs_delete', -12],
    ['/a/b/c/d/e/f/g/h/i', 'C S fs_mkdir', -15],
  ] as const)('validates type/path for %s: %s', (path, operation, expected) => {
    const initial = disk({ '/file': [1] }, ['/dir', '/a/b/c/d/e/f/g/h']);
    const r = boot(initial, `${args(path)} ${operation}`, path);
    expect(r.result).toBe(expected); expect(r.medium.image()).toEqual(initial);
  });
  test('rejects unchecked-volume writes and paths aliasing filesystem workspace', () => {
    const initial = disk();
    expect(boot(initial, `${begin('/file', 0, 0)} C S fs_replace_finish`, '/file', false).result).toBe(-17);
    const r = boot(initial, 'M A 6440 M B 5 M C Z M D Z C S fs_replace_begin');
    expect(r.result).toBe(-15); expect(r.medium.image()).toEqual(initial);
  });
  test.each(['create', 'delete', 'mkdir', 'rmdir'])('read-only %s leaves media byte-for-byte unchanged', operation => {
    const image = disk({ '/file': [1] }, ['/dir']); const medium = new BlockMedium(27, true, image);
    const path = operation === 'rmdir' ? '/dir' : operation === 'mkdir' ? '/newdir' : '/file';
    const op = operation === 'create' ? `${begin(path, 1, 1)} W fs_buffer 99 C S fs_replace_append` : `${args(path)} C S fs_${operation}`;
    const r = boot(medium, op, path); expect(r.result).toBe(-4); expect(r.medium.image()).toEqual(image);
  });
  test.each([false, true])('fixed root or nine-block directory cannot grow further, nested=%s', nested => {
    const prefix = nested ? '/d' : '';
    const files = Object.fromEntries(Array.from({ length: 81 }, (_, i) => [`${prefix}/f${i}`, []]));
    const path = `${prefix}/new`; const initial = disk(files, [], 54);
    const r = boot(initial, `${begin(path, 0, 0)} C S fs_replace_finish`, path);
    expect(r.result).toBe(-19); expect(r.medium.image()).toEqual(initial);
  }, 15_000);
  test('grows to the ninth directory block without changing existing empty files', () => {
    const files = Object.fromEntries(Array.from({ length: 72 }, (_, i) => [`/d/f${i}`, []]));
    const r = boot(disk(files, [], 54), `${begin('/d/new', 0, 0)} C S fs_replace_finish`, '/d/new');
    expect(r.result).toBe(0); expect(read(r.medium.image(), '/d/new').result).toBe(0);
    const parent = boot(r.medium.image(), `${args('/d')} C S fs_lookup`, '/d', false);
    expect(parent.m.peek(6953)).toBe(9); expect(read(r.medium.image(), '/d/f71').result).toBe(0);
  }, 15_000);
});

test.each([0, 1])('media replacement on unit %s during a mutation respects captured ownership', unit => {
  const initial = disk({ '/file': [1] }); const otherImage = disk({ '/sentinel': [8] });
  const other = new BlockMedium(27, false, otherImage); let swapped = false;
  const r = boot(initial, `${begin('/file', 1, 2)} W fs_buffer 7 W 6441 9
      C S fs_replace_append N A Z J done W 6209 1 C S fs_replace_finish`, '/file', true, (m, controller) => {
    if (!swapped && m.peek(6209) === 1) { swapped = true; controller.setMedium(unit, other); }
  });
  expect(swapped).toBe(true); expect(other.image()).toEqual(otherImage);
  expect(r.result).toBe(unit === 0 ? -16 : 0);
  expect(read(r.medium.image(), '/file').cells).toEqual(unit === 0 ? [1] : [7, 9]);
  const checked = boot(r.medium.image(), 'C S fs_reclaim'); expect(checked.result).toBe(0);
});
