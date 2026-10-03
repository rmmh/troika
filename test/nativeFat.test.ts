import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { auditClientImage } from '../src/firmware/layout';
import { encodeText } from '../src/core/textEncoding';

const driver = readFileSync(new URL('../firmware/include/block.asm', import.meta.url), 'utf8');
const fat = readFileSync(new URL('../firmware/include/fat.asm', import.meta.url), 'utf8');

function boot(image: Int16Array, commands: string, path = '/www/index', stepHook?: (m: Machine, d: BlockDevice) => void) {
  const program = assemble(`@-9112
      J entry
${driver}
${fat}
entry: M S 5710
      M B 0
      C S fs_mount
      N A Z J done
      ${commands}
done: H 0sAAA Z
@5954
path: "${path}"
`);
  expect(program.diagnostics).toEqual([]);
  const report = auditClientImage(program.chunks, ['resident.low', 'url.state']);
  const machine = new Machine();
  const disk = new BlockDevice([new BlockMedium(image.length / 243, false, image)]);
  machine.attach(disk);
  for (const c of program.chunks) c.data.forEach((v, i) => machine.poke(c.addr + i, v));
  machine.poke(REG_P, program.entry!);
  let stackLow = 5710;
  if (stepHook) {
    while (machine.cycles < 3_000_000 && machine.sleep?.remaining !== Infinity) {
      stepHook(machine, disk);
      machine.step();
      // S is initialized by the first instruction at entry.
      if (machine.peek(REG_S) >= 5468) stackLow = Math.min(stackLow, machine.peek(REG_S));
    }
    expect(machine.sleep?.remaining).toBe(Infinity);
  } else expect(machine.run(3_000_000)).toBe('sleep-forever');
  expect(machine.peek(REG_S)).toBe(5710);
  return { machine, disk, report, result: machine.peek(-13), stackUsed: 5710 - stackLow };
}
const lookup = (path: string) => `M A @path\nM B ${path.length}\nC S fs_lookup`;
const open = (path: string) => `${lookup(path)}\nN A Z J done\nC S fs_open\nN A Z J done`;

describe('native FAT v2', () => {
  test('mounts nested directories and streams a multi-block file using only the allocated caches', () => {
    const content = Int16Array.from({ length: 600 }, (_, i) => i - 300);
    const image = createDiskImage({ blocks: 729, volumeId: [0, 0, 1], files: { '/www/index': content } });
    const { machine: m, result, report } = boot(image, `${open('/www/index')}
      C S fs_read_next
      N A Z J done
      W 7000 B
      R J fs_buffer
      W 7001 J
      C S fs_read_next
      N A Z J done
      W 7002 B
      R J fs_buffer
      W 7003 J
      C S fs_read_next
      N A Z J done
      W 7004 B
      R J fs_buffer
      W 7005 J
      C S fs_read_next
      W 7006 B`);
    expect(result).toBe(0);
    expect(Array.from({ length: 7 }, (_, i) => m.peek(7000 + i))).toEqual([243, -300, 243, -57, 114, 186, 0]);
    expect(report.regions['resident.low']).toBeLessThan(1600);
    expect(m.peek(6935)).toBe(0);
    expect(m.peek(6937)).toBe(1);
  });

  test('finds files beyond the first directory block and distinguishes same basenames', () => {
    const files: Record<string, number[]> = {};
    for (let i = 0; i < 18; i++) files[`/a/f${String(i).padStart(2, '0')}`] = [i];
    files['/b/f17'] = [999];
    const image = createDiskImage({ volumeId: [1, 0, 0], files });
    for (const [path, value] of [['/a/f17', 17], ['/b/f17', 999]] as const) {
      const { result, machine } = boot(image, `${open(path)}\nC S fs_read_next`, path);
      expect(result).toBe(0);
      expect(machine.peek(6440)).toBe(value);
      expect(machine.peek(-12)).toBe(1);
    }
  });

  test.each(['/missing', '/www/missing'])('returns missing for %s', path => {
    const image = createDiskImage({ volumeId: [0, 0, 1], directories: ['/www'] });
    expect(boot(image, lookup(path), path).result).toBe(-12);
  });

  test.each(['', 'www', '//x', '/www/', '/.', '/..', '/A', '/abcdefghijklmnopqrs'])('rejects invalid path %j', path => {
    const image = createDiskImage({ volumeId: [0, 0, 1], directories: ['/www'] });
    expect(boot(image, lookup(path), path).result).toBe(-15);
  });

  test('empty file has immediate EOF and directories cannot be read as files', () => {
    const image = createDiskImage({ volumeId: [0, 0, 1], files: { '/empty': [] }, directories: ['/www'] });
    const empty = boot(image, `${open('/empty')}\nC S fs_read_next`, '/empty');
    expect(empty.result).toBe(0); expect(empty.machine.peek(-12)).toBe(0);
    expect(boot(image, `${lookup('/www')}\nC S fs_open`, '/www').result).toBe(-14);
    expect(boot(image, lookup('/empty/x'), '/empty/x').result).toBe(-13);
  });

  test.each([0, 3, 4, 5, 6, 7, 8, 9, 13, 242])('rejects corrupt geometry/reserved cell %i', offset => {
    const image = createDiskImage({ volumeId: [0, 0, 1] });
    image[offset] = 999;
    expect(boot(image, '').result).toBe(-10);
  });

  test('rejects inconsistent chains and nonzero data tail padding', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/x': encodeText('hello') } });
    const first = image[2 * 243 + 20]!;
    const corrupted = image.slice(); corrupted[243 + first] = first;
    expect(boot(corrupted, open('/x'), '/x').result).toBe(-11);
    const padded = image.slice(); padded[first * 243 + 5] = 1;
    expect(boot(padded, `${open('/x')}\nC S fs_read_next`, '/x').result).toBe(-11);
  });

  test('supports eight directory components plus a file, with bounded native stack', () => {
    const path = '/a/b/c/d/e/f/g/h/leaf';
    const image = createDiskImage({ volumeId: [0, 0, 1], files: { [path]: [123] } });
    const run = boot(image, `${open(path)}\nC S fs_read_next`, path, () => {});
    expect(run.result).toBe(0);
    expect(run.machine.peek(6440)).toBe(123);
    expect(run.stackUsed).toBeGreaterThan(0);
    expect(run.stackUsed).toBeLessThanOrEqual(6);
  });

  test('handles FAT cache page transitions and maximum volume geometry', () => {
    const image = createDiskImage({ blocks: 9841, volumeId: [-1, 2, -3], files: {
      '/a': new Int16Array(250 * 243), '/www/index': [321],
    } });
    const run = boot(image, `${open('/www/index')}\nC S fs_read_next`);
    expect(run.result).toBe(0);
    expect(run.machine.peek(6440)).toBe(321);
    expect(run.machine.peek(6932)).toBe(41);
  });

  test('a live handle owns the mount until explicitly closed', () => {
    const image = createDiskImage({ volumeId: [0, 0, 1], files: { '/x': [1] } });
    expect(boot(image, `${open('/x')}\nM B 0\nC S fs_mount`, '/x').result).toBe(-1);
    expect(boot(image, `${open('/x')}\n${lookup('/x')}`, '/x').result).toBe(-1);
    expect(boot(image, `${open('/x')}\nC S fs_close\nM B 0\nC S fs_mount`, '/x').result).toBe(0);
  });

  test('replacement during a file read aborts the operation and invalidates the mount', () => {
    const image = createDiskImage({ volumeId: [0, 0, 1], files: { '/x': [123] } });
    let replaced = false;
    const run = boot(image, `${open('/x')}\nC S fs_read_next`, '/x', (m, disk) => {
      if (!replaced && m.peek(6960) === 1 && disk.inspect(-7)) {
        disk.setMedium(0, new BlockMedium(729, false, image));
        replaced = true;
      }
    });
    expect(replaced).toBe(true);
    expect(run.result).toBe(-2);
    expect(run.machine.peek(6927)).toBe(0);
    expect(run.machine.peek(6960)).toBe(0);
  });
});
