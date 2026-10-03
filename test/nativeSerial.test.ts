import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { decodeWide, encodeWide, WIDE_MAX, type Wide } from '../src/core/wide';
import { auditClientImage } from '../src/firmware/layout';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial'].map(name =>
  readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8')).join('\n');
const program = assemble(`@-9112
      J entry
${modules}
entry: M S 5710
      W serial_unit Z
      W serial_volume Z
      W 2544 Z
      W 2545 1
next: C S serial_alloc
      H 0sAAA Z
hold: M A @held_path
      M B 5
      C S fs_lookup
      N A Z J hold_done
      C S fs_open
hold_done: H 0sAAA Z
service_probe: R E 2189 I E 1 W 2189 E O S P
held_path: "/held"
`);

function image(next = 1, volumeId: Wide = [0, 0, 1]): Int16Array {
  return createDiskImage({ blocks: 27, volumeId, files: { '/held': [9], '/net.seq': encodeWide(next) } });
}

function setup(medium = new BlockMedium(27, false, image())) {
  expect(program.diagnostics).toEqual([]);
  expect(auditClientImage(program.chunks).used).toBeLessThan(2200);
  const m = new FirmwareProbe(['mmio', 'filesystem', 'native.stack', 'network.state']);
  const d = new BlockDevice([medium]); m.attach(d);
  for (const c of program.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, program.entry!);
  function execute(label?: string, hook?: () => void) {
    if (label) { m.poke(REG_P, program.labels.get(label)!); m.sleep = null; }
    const end = m.cycles + 10_000_000;
    if (hook) {
      while (m.cycles < end && m.sleep?.remaining !== Infinity) { hook(); m.step(); }
      expect(m.sleep?.remaining).toBe(Infinity);
    } else expect(m.run(10_000_000)).toBe('sleep-forever');
    expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(16);
    const status = m.peek(-10);
    const tuple: Wide = [m.peek(-13), m.peek(-12), m.peek(-11)];
    return { status, tuple, serial: status === 0 ? decodeWide(tuple) : undefined };
  }
  function stored() {
    const block = medium.read(2)[27 + 20]!; // sorted /held then /net.seq
    const values = medium.read(block);
    return decodeWide([values[0]!, values[1]!, values[2]!]);
  }
  return { m, d, medium, execute, stored };
}

describe('native durable serial allocation', () => {
  test('reserves one range before use, refills at its boundary and skips unused values after reboot', () => {
    const run = setup();
    expect(run.execute()).toMatchObject({ status: 0, serial: 1 });
    expect(run.stored()).toBe(28);
    for (let n = 2; n <= 27; n++) expect(run.execute('next')).toMatchObject({ status: 0, serial: n });
    expect(run.stored()).toBe(28);
    expect(run.execute('next')).toMatchObject({ status: 0, serial: 28 });
    expect(run.stored()).toBe(55);
    expect(setup(new BlockMedium(27, false, run.medium.image())).execute()).toMatchObject({ status: 0, serial: 55 });
  });

  test('callback context can spend a reserved serial but cannot refill or disturb filesystem state', () => {
    const run = setup();
    const vector = program.labels.get('service_probe')!; run.m.poke(2485, vector);
    expect(run.execute().serial).toBe(1);
    expect(run.m.peek(2485)).toBe(vector); expect(run.m.peek(2189)).toBe(0);
    run.m.poke(2486, 1);
    expect(run.execute('next')).toMatchObject({ status: 0, serial: 2 });
    for (let n = 3; n <= 27; n++) expect(run.execute('next').serial).toBe(n);
    const before = Array.from({ length: 567 }, (_, i) => run.m.peek(6440 + i));
    expect(run.execute('next').status).toBe(-1);
    expect(Array.from({ length: 567 }, (_, i) => run.m.peek(6440 + i))).toEqual(before);
    expect(run.stored()).toBe(28);
    run.m.poke(2486, 0); expect(run.execute('next').serial).toBe(28);
    expect(run.m.peek(2485)).toBe(vector); expect(run.m.peek(2189)).toBe(0);
  });

  test.each([9840, 9841 * 19683 + 9840])('carries all three balanced digits from %i without truncation', start => {
    const run = setup(new BlockMedium(27, false, image(start)));
    expect(run.execute()).toMatchObject({ status: 0, serial: start });
    for (let n = 1; n < 30; n++) expect(run.execute('next')).toMatchObject({ status: 0, serial: start + n });
    expect(run.stored()).toBe(start + 54);
  });

  test('reserves the final partial range and never issues or wraps the exhausted sentinel', () => {
    const run = setup(new BlockMedium(27, false, image(WIDE_MAX - 1)));
    expect(run.execute()).toMatchObject({ status: 0, serial: WIDE_MAX - 1 });
    expect(run.stored()).toBe(WIDE_MAX);
    expect(run.execute('next').status).toBe(-32);
    expect(run.stored()).toBe(WIDE_MAX);
  });

  test('rejects the wrong system volume, zero counters, read-only media and missing counter files', () => {
    expect(setup(new BlockMedium(27, false, image(1, [0, 0, 2]))).execute().status).toBe(-30);
    expect(setup(new BlockMedium(27, false, image(0))).execute().status).toBe(-31);
    expect(setup(new BlockMedium(27, true, image())).execute().status).toBe(-4);
    const missing = createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/held': [] } });
    expect(setup(new BlockMedium(27, false, missing)).execute().status).toBe(-12);
  });

  test('rejects a counter rollback relative to the greatest durable bound observed this boot', () => {
    const run = setup();
    expect(run.execute().serial).toBe(1);
    const block = run.medium.read(2)[27 + 20]!;
    const content = new Int16Array(243); content.set(encodeWide(1));
    run.medium.write(block, content);
    run.m.poke(2547, 0); // request refill rather than spending the existing range
    expect(run.execute('next').status).toBe(-31);
  });

  test('spends durable reservations while a file handle is held, then returns busy without closing that handle', () => {
    const run = setup();
    expect(run.execute().serial).toBe(1);
    run.execute('hold'); expect(run.m.peek(-13)).toBe(0);
    expect(run.m.peek(6960)).toBe(1);
    for (let n = 2; n <= 27; n++) expect(run.execute('next').serial).toBe(n);
    expect(run.execute('next').status).toBe(-1);
    expect(run.m.peek(6960)).toBe(1);
    expect(run.stored()).toBe(28);
  });

  test('crash snapshots before/after the durable reservation cannot reuse an issued serial', () => {
    const run = setup();
    let armed = false;
    let before: Int16Array | undefined;
    let after: Int16Array | undefined;
    const result = run.execute(undefined, () => {
      if (run.m.peek(REG_P) === program.labels.get('fs_overwrite_commit')) armed = true;
      if (armed && !before && run.d.inspect(-7)) before = run.medium.image();
      if (before && !after && !run.d.inspect(-7)) after = run.medium.image();
    });
    expect(result.serial).toBe(1);
    expect(before).toBeDefined(); expect(after).toBeDefined();
    // In the precommit branch no serial was exposed before the crash.
    expect(setup(new BlockMedium(27, false, before!)).execute().serial).toBe(1);
    // A completed reservation skips the whole range even before RAM publication.
    expect(setup(new BlockMedium(27, false, after!)).execute().serial).toBe(28);
  });

  test('media absence permits spending an owned range but never refills from another volume', () => {
    const run = setup();
    expect(run.execute().serial).toBe(1);
    run.d.setMedium(0);
    expect(run.execute('next').serial).toBe(2);
    run.m.poke(2547, 0);
    expect(run.execute('next').status).toBe(-16);
    run.d.setMedium(0, new BlockMedium(27, false, image(1, [0, 0, 2])));
    expect(run.execute('next').status).toBe(-30);
    run.d.setMedium(0, run.medium);
    expect(run.execute('next').serial).toBe(28);
  });
});
