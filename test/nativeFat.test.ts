import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { auditClientImage } from '../src/firmware/layout';
import { encodeText } from '../src/core/textEncoding';
import { FirmwareProbe } from './firmwareProbe';

const driver = readFileSync(new URL('../firmware/include/block.asm', import.meta.url), 'utf8');
const fat = readFileSync(new URL('../firmware/include/fat.asm', import.meta.url), 'utf8');
const writer = readFileSync(new URL('../firmware/include/fatWrite.asm', import.meta.url), 'utf8');
const checker = readFileSync(new URL('../firmware/include/fatCheck.asm', import.meta.url), 'utf8');

function boot(image: Int16Array | BlockMedium, commands: string, path = '/www/index', stepHook?: (m: Machine, d: BlockDevice) => void, maxCycles = 3_000_000) {
  const program = assemble(`@-9112
      J entry
${driver}
${fat}
${checker}
${writer}
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
  const machine = new FirmwareProbe(['mmio', 'filesystem', 'native.stack', 'url.state']);
  const medium = image instanceof BlockMedium ? image : new BlockMedium(image.length / 243, false, image);
  const disk = new BlockDevice([medium]);
  machine.attach(disk);
  for (const c of program.chunks) c.data.forEach((v, i) => machine.poke(c.addr + i, v));
  machine.poke(REG_P, program.entry!);
  let stackLow = 5710;
  if (stepHook) {
    while (machine.cycles < maxCycles && machine.sleep?.remaining !== Infinity) {
      stepHook(machine, disk);
      machine.step();
      // S is initialized by the first instruction at entry.
      if (machine.peek(REG_S) >= 5468) stackLow = Math.min(stackLow, machine.peek(REG_S));
    }
    expect(machine.sleep?.remaining).toBe(Infinity);
  } else expect(machine.run(maxCycles)).toBe('sleep-forever');
  expect(machine.peek(REG_S)).toBe(5710);
  return { machine, disk, medium, report, result: machine.peek(-13), stackUsed: 5710 - stackLow };
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
    expect(report.regions['resident.low']).toBeLessThan(2400);
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

  test('enumerates sparse directory slots past an empty entry and across blocks', () => {
    const files: Record<string, number[]> = {};
    for (let i = 0; i < 18; i++) files[`/f${String(i).padStart(2, '0')}`] = [i];
    const image = createDiskImage({ blocks: 81, volumeId: [0, 0, 1], files });
    // Remove an entry from this fixture; its orphaned data must not stop enumeration.
    image.fill(0, 2 * 243 + 27, 2 * 243 + 54);
    const run = boot(image, `${lookup('/')}\nN A Z J done\nC S fs_enum_open\nN A Z J done
      W 7000 Z
enum_loop: C S fs_enum_next
      N A Z J done
      E B Z J done
      R J 7000
      I J 1
      W 7000 J
      J enum_loop`, '/');
    expect(run.result).toBe(0);
    expect(run.machine.peek(7000)).toBe(17);
  });

  test.each([1, 2, 19, 23, 26])('rejects nonzero unused-entry cell %i rather than treating the directory as empty', offset => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1] });
    image[2 * 243 + offset] = 1;
    expect(boot(image, lookup('/x'), '/x').result).toBe(-11);
  });

  test('rejects invalid names in other occupied directory entries', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/a': [], '/x': [] } });
    image[2 * 243 + 2] = 0;
    expect(boot(image, lookup('/x'), '/x').result).toBe(-11);
  });

  test('offline checker walks the tree and reports orphaned blocks without freeing them', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/a/file': [123], '/b/file': [456] } });
    image[243 + 26] = -1;
    const run = boot(image, 'C S fs_check', '/', undefined, 30_000_000);
    expect(run.result).toBe(0);
    expect(run.machine.peek(-12)).toBe(1);
  });

  test('offline checker rejects duplicate siblings', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/a': [], '/b': [] } });
    image[2 * 243 + 27 + 2] = image[2 * 243 + 2]!;
    expect(boot(image, 'C S fs_check', '/', undefined, 30_000_000).result).toBe(-11);
  });

  test('offline checker rejects file and directory cross-links', () => {
    for (const directories of [false, true]) {
      const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1],
        files: directories ? {} : { '/a': [1], '/b': [2] }, directories: directories ? ['/a', '/b'] : [] });
      image[2 * 243 + 27 + 20] = image[2 * 243 + 20]!;
      expect(boot(image, 'C S fs_check', '/', undefined, 30_000_000).result).toBe(-11);
    }
  });

  test.each([11, 28, 29, 46, 47, 80])('batched checker detects a shared block at %i', block => {
    const image = createDiskImage({ blocks: 81, volumeId: [0, 0, 1], files: { '/a': [1], '/b': [1] } });
    const a = 2 * 243 + 20, b = a + 27;
    image[243 + image[a]!] = 0; image[243 + image[b]!] = 0;
    image[a] = block; image[b] = block; image[243 + block] = -1;
    image[243 + 13] = -1; // Earlier orphan must survive a later cross-link failure.
    image.fill(0, block * 243, (block + 1) * 243); image[block * 243] = 1;
    const run = boot(image, 'C S fs_reclaim', '/', undefined, 30_000_000);
    expect(run.result).toBe(-11);
    expect(run.medium.image()).toEqual(image); // No repair before complete validation.
    expect(run.machine.peek(6960)).toBe(0);
  });

  test('batched orphan counting and repair cross FAT pages and preserve live data', () => {
    const image = createDiskImage({ blocks: 270, volumeId: [0, 0, 1], files: { '/kept': [789] } });
    const orphans = [29, 30, 241, 242, 243, 244, 269];
    for (const block of orphans) image[243 + block] = -1;
    const checked = boot(image, 'C S fs_check', '/', undefined, 30_000_000);
    expect(checked.result).toBe(0);
    expect(checked.machine.peek(-12)).toBe(orphans.length);
    expect(checked.medium.image()).toEqual(image);
    const repaired = boot(image, 'C S fs_reclaim', '/', undefined, 30_000_000);
    expect(repaired.result).toBe(0);
    expect(repaired.machine.peek(-12)).toBe(orphans.length);
    const retained = repaired.medium.image();
    for (const block of orphans) expect(retained[243 + block]).toBe(0);
    const kept = boot(retained, `${open('/kept')}\nC S fs_read_next`, '/kept');
    expect(kept.result).toBe(0);
    expect(kept.machine.peek(6440)).toBe(789);
  });

  test.each([0, 10, 27, 242])('offline checker validates reserved FAT cell %i', cell => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1] });
    image[243 + cell] = 0;
    expect(boot(image, 'C S fs_check', '/', undefined, 30_000_000).result).toBe(-11);
  });

  test('offline checker rejects invalid data links and nonzero final file padding', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/a': [123] } });
    const first = image[2 * 243 + 20]!;
    for (const invalid of [-4, 1, 27]) {
      const corrupt = image.slice(); corrupt[243 + first] = invalid;
      expect(boot(corrupt, 'C S fs_check', '/').result).toBe(-11);
    }
    image[first * 243 + 1] = 99;
    expect(boot(image, 'C S fs_check', '/').result).toBe(-11);
  });

  test('explicit orphan repair preserves children referenced by an old directory copy', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/dir/file': [789] } });
    const dir = image[2 * 243 + 20]!;
    const child = image[dir * 243 + 20]!;
    image.set(image.slice(dir * 243, (dir + 1) * 243), 26 * 243);
    image[243 + 26] = -1;
    const run = boot(image, 'C S fs_reclaim', '/', undefined, 30_000_000);
    expect(run.result).toBe(0);
    expect(run.machine.peek(-12)).toBe(1);
    expect(run.medium.read(1)[26]).toBe(0);
    expect(run.medium.read(1)[child]).toBe(-1);
    expect(run.medium.read(child)[0]).toBe(789);
  });

  test('repair refuses a cross-linked volume without writing any block', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/a': [1], '/b': [2] } });
    image[2 * 243 + 27 + 20] = image[2 * 243 + 20]!;
    const run = boot(image, 'C S fs_reclaim', '/', undefined, 30_000_000);
    expect(run.result).toBe(-11);
    expect(run.medium.image()).toEqual(image);
  });

  test('directory ancestry cycles fail at bounded depth without overflowing the native stack', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], directories: ['/a/b'] });
    const a = image[2 * 243 + 20]!;
    image[a * 243 + 20] = a;
    const run = boot(image, 'C S fs_check', '/', () => {}, 30_000_000);
    expect(run.result).toBe(-11);
    expect(run.stackUsed).toBeLessThan(16);
    expect(run.machine.peek(6960)).toBe(0);
  });

  test('orphan repair on read-only media reports the failure and unwinds its native stack', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1] });
    image[243 + 26] = -1;
    const medium = new BlockMedium(27, true, image);
    const run = boot(medium, 'C S fs_reclaim', '/', undefined, 30_000_000);
    expect(run.result).toBe(-4);
    expect(medium.image()).toEqual(image);
    expect(run.machine.peek(6927)).toBe(0);
  });

  test.each([0, 1, 2])('same-size overwrite updates logical block %i and preserves geometry', index => {
    const data = Int16Array.from({ length: 600 }, (_, i) => i);
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/x': data } });
    const run = boot(image, `C S fs_check\nN A Z J done\n${open('/x')}
      M J fs_buffer
      M K 243
fill: W J 777
      I J 1
      I K -1
      N K Z J fill
      M A ${index}
      C S fs_overwrite`, '/x', undefined, 30_000_000);
    expect(run.result).toBe(0);
    const first = image[2 * 243 + 20]!;
    expect(run.medium.read(2)).toEqual(image.slice(2 * 243, 3 * 243));
    expect(run.medium.read(1)).toEqual(image.slice(243, 486));
    const expected = new Int16Array(243);
    expected.fill(777, 0, index === 2 ? 114 : 243);
    expect(run.medium.read(first + index)).toEqual(expected);
    const checked = boot(run.medium.image(), 'C S fs_check', '/', undefined, 30_000_000);
    expect(checked.result).toBe(0);
    expect(checked.machine.peek(-12)).toBe(0);
  });

  test('overwriting requires volume validation and respects read-only media', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/x': [1] } });
    const unchecked = boot(image, `${open('/x')}\nM A 0\nC S fs_overwrite`, '/x');
    expect(unchecked.result).toBe(-17);
    expect(unchecked.medium.image()).toEqual(image);
    const readonly = boot(new BlockMedium(27, true, image), `C S fs_check\nN A Z J done\n${open('/x')}\nM A 0\nC S fs_overwrite`, '/x');
    expect(readonly.result).toBe(-4);
    expect(readonly.medium.image()).toEqual(image);
  });

  test('power loss during native overwrite restores the old complete block; completed writes survive reboot', () => {
    const image = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/x': [123] } });
    const medium = new BlockMedium(27, false, image);
    let interruptedImage: Int16Array | undefined;
    const run = boot(medium, `C S fs_check\nN A Z J done\n${open('/x')}
      W fs_buffer 456
      W 5980 1
      M A Z
      C S fs_overwrite`, '/x', (m, d) => {
      if (!interruptedImage && m.peek(5980) === 1 && d.inspect(-7)) interruptedImage = medium.image();
    });
    expect(run.result).toBe(0);
    expect(interruptedImage).toBeDefined();
    for (const [snapshot, expected] of [[interruptedImage!, 123], [medium.image(), 456]] as const) {
      const rebooted = boot(snapshot, `${open('/x')}\nC S fs_read_next`, '/x');
      expect(rebooted.result).toBe(0);
      expect(rebooted.machine.peek(6440)).toBe(expected);
    }
  });
});

test('remounting different units invalidates FAT and data caches at identical block addresses', () => {
  const first = createDiskImage({blocks: 27, volumeId: [0,0,1], files: {'/x': [...Array(243).fill(17), 18]}});
  const second = createDiskImage({blocks: 27, volumeId: [0,0,2], files: {'/x': [91]}});
  const other = new BlockMedium(27, false, second);
  const commands = [0, 1, 0].map((unit, index) => `
    M B ${unit} C S fs_mount N A Z J done
    ${open('/x')}
    C S fs_read_next N A Z J done
    W ${6200 + index * 4} B R E fs_buffer W ${6201 + index * 4} E
    C S fs_read_next N A Z J done
    W ${6202 + index * 4} B R E fs_buffer W ${6203 + index * 4} E
    C S fs_close N A Z J done`).join('\n');
  let inserted = false;
  const run = boot(first, commands, '/x', (_m, disk) => {
    if (!inserted) { disk.setMedium(1, other); inserted = true; }
  });
  expect(run.result).toBe(0);
  expect([run.machine.peek(6200), run.machine.peek(6201), run.machine.peek(6202), run.machine.peek(6203)]).toEqual([243, 17, 1, 18]);
  expect([run.machine.peek(6204), run.machine.peek(6205), run.machine.peek(6206)]).toEqual([1, 91, 0]);
  expect([run.machine.peek(6208), run.machine.peek(6209), run.machine.peek(6210), run.machine.peek(6211)]).toEqual([243, 17, 1, 18]);
  expect(run.medium.image()).toEqual(first); expect(other.image()).toEqual(second);
});
