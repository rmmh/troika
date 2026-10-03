import { describe, expect, test } from 'vitest';
import { BlockDevice, BlockMedium, BLOCK_IO_CYCLES } from '../src/core/blockDevice';
import { fromTrits } from '../src/core/tryte';
import { decodeWide, encodeWide, WIDE_MAX } from '../src/core/wide';

const regs = { present: -13, capacity: -12, block: -11, cursor: -10, data: -9, command: -8,
  busy: -7, result: -6, completion: -5, events: -4, enables: -3, unit: -2,
  changed0: -1, changed1: 0, changed2: 1, high: 2, middle: 3, low: 4, completedUnit: 5 };
const event0 = fromTrits('100000000');
const event1 = fromTrits('010000000');
function finish(d: BlockDevice): number[] {
  const irqs: number[] = [];
  d.tick(BLOCK_IO_CYCLES, line => irqs.push(line));
  return irqs;
}

describe('block controller', () => {
  test('captures writes, commits only at completion and reads exactly one block', () => {
    const medium = new BlockMedium(27);
    const d = new BlockDevice([medium]);
    expect(d.read(regs.capacity)).toBe(27);
    d.write(regs.block, 26);
    for (let i = 0; i < 243; i++) d.write(regs.data, i - 121);
    expect(d.read(regs.cursor)).toBe(0);
    d.write(regs.enables, event0);
    d.write(regs.command, 2);
    d.write(regs.data, 999);
    d.write(regs.block, 0);
    d.write(regs.unit, 1);
    d.write(regs.cursor, 77);
    expect(d.read(regs.data)).toBe(0);
    expect(d.read(regs.cursor)).toBe(0);
    expect(d.read(regs.unit)).toBe(0);
    d.tick(6560, () => { throw new Error('early IRQ'); });
    expect(medium.read(26).every(v => v === 0)).toBe(true);
    expect(d.read(regs.busy)).toBe(1);
    const irqs: number[] = [];
    d.tick(1, line => irqs.push(line));
    expect(irqs).toEqual([5]);
    expect(medium.read(26)).toEqual(Int16Array.from({ length: 243 }, (_, i) => i - 121));
    expect(d.read(regs.completedUnit)).toBe(0);
    expect(d.read(regs.events)).toBe(event0);
    expect(finish(d)).toEqual([]);
    d.write(regs.cursor, 10);
    d.write(regs.command, 1);
    finish(d);
    expect(d.read(regs.cursor)).toBe(0);
    expect(d.inspect(regs.data)).toBe(-121);
    expect(d.inspect(regs.data)).toBe(-121);
    expect(d.read(regs.data)).toBe(-121);
    expect(d.read(regs.data)).toBe(-120);
  });

  test('raw copy preserves buffer, selection is sparse and capacities/read-only state belong to each unit', () => {
    const a = new BlockMedium(27);
    const b = new BlockMedium(81);
    a.write(26, new Int16Array(243).fill(123));
    const d = new BlockDevice([a, undefined, b, new BlockMedium(729, true)]);
    d.write(regs.block, 26); d.write(regs.command, 1); finish(d);
    d.write(regs.unit, 2); d.write(regs.block, 80); d.write(regs.command, 2); finish(d);
    expect(b.read(80).every(v => v === 123)).toBe(true);
    expect(d.read(regs.completedUnit)).toBe(2);
    expect(d.read(regs.capacity)).toBe(81);
    d.write(regs.unit, 1);
    expect(d.read(regs.present)).toBe(0);
    expect(d.read(regs.capacity)).toBe(0);
    d.write(regs.command, 1); expect(d.read(regs.result)).toBe(-2);
    d.write(regs.unit, 3); d.write(regs.command, 2); expect(d.read(regs.result)).toBe(-4);
    d.write(regs.unit, 27); expect(d.read(regs.unit)).toBe(3);
    d.write(regs.unit, -1); expect(d.read(regs.result)).toBe(-4);
    expect(d.read(regs.completion)).toBe(0);
    expect(d.read(regs.completedUnit)).toBe(2);
  });

  test('command validation order, busy rejection, idle, invalid cursors and FLUSH', () => {
    const d = new BlockDevice([new BlockMedium(27, true)]);
    d.write(regs.cursor, 242); d.write(regs.cursor, 243);
    expect(d.read(regs.cursor)).toBe(242);
    d.write(regs.data, 5); expect(d.read(regs.cursor)).toBe(0);
    d.write(regs.block, 27); d.write(regs.command, 2);
    expect(d.read(regs.result)).toBe(-3); // range before read-only
    d.write(regs.command, 3); expect(d.read(regs.result)).toBe(0); // no range check
    expect(d.cyclesUntilCompletion()).toBe(27);
    d.write(regs.command, 9); expect(d.read(regs.result)).toBe(-5);
    d.write(regs.command, 1); expect(d.read(regs.result)).toBe(-1);
    d.write(regs.command, 0); expect(d.read(regs.result)).toBe(0);
    expect(d.read(regs.busy)).toBe(1);
    d.tick(26, () => {}); expect(d.read(regs.busy)).toBe(1);
    d.tick(1, () => {}); expect(d.read(regs.busy)).toBe(0);
    expect(d.read(regs.completedUnit)).toBe(0);
  });

  test('reset before completion never changes durable media', () => {
    const medium = new BlockMedium(27);
    const d = new BlockDevice([medium]);
    d.write(regs.data, 999); d.write(regs.command, 2);
    d.tick(6560, () => {}); d.write(regs.command, 4); finish(d);
    expect(medium.read(0)[0]).toBe(0);
    expect(d.read(regs.completedUnit)).toBe(-1);
    expect(d.read(regs.data)).toBe(0);
    expect(d.read(regs.enables)).toBe(0);
    d.write(regs.cursor, 0); d.write(regs.data, 888); d.write(regs.command, 2); finish(d);
    d.reset();
    const restarted = new BlockDevice([new BlockMedium(27, false, medium.image())]);
    restarted.write(regs.command, 1); finish(restarted);
    expect(restarted.read(regs.data)).toBe(888);
  });

  test('hotplug cancels only the affected operation and snapshots generations across selection', () => {
    const d = new BlockDevice([new BlockMedium(27)]);
    d.write(regs.enables, event0 + event1);
    d.write(regs.data, 456); d.write(regs.cursor, 0); d.write(regs.command, 2);
    d.setMedium(26, new BlockMedium(81));
    expect(d.read(regs.busy)).toBe(1);
    expect(d.read(regs.changed2)).toBe(1);
    d.setMedium(0, new BlockMedium(27));
    expect(d.read(regs.busy)).toBe(0);
    expect(d.read(regs.completion)).toBe(-2);
    expect(d.read(regs.completedUnit)).toBe(0);
    expect(d.read(regs.data)).toBe(456);
    expect(finish(d)).toEqual([5]);
    expect(d.read(regs.events)).toBe(event0 + event1);
    expect(d.read(regs.high)).toBe(0);
    d.write(regs.unit, 26);
    expect(d.read(regs.low)).toBe(2); // latched unit 0
    d.inspect(regs.high);
    expect(d.read(regs.low)).toBe(2); // inspection does not relatch
    d.read(regs.high); expect(d.read(regs.low)).toBe(1);
    d.write(regs.events, -event1);
    expect(d.read(regs.events)).toBe(event0);
    expect(d.read(regs.changed0)).toBe(event0);
    d.write(regs.changed0, -event0); expect(d.read(regs.changed0)).toBe(0);
    d.reset(); d.read(regs.high); expect(d.read(regs.low)).toBe(2);
  });

  test('enabling sticky events signals once and external time is advanced only by the world', () => {
    const d = new BlockDevice([new BlockMedium(27)], true);
    d.write(regs.command, 1);
    expect(finish(d)).toEqual([]);
    expect(d.read(regs.busy)).toBe(1);
    d.advance(6561);
    expect(d.read(regs.busy)).toBe(0);
    d.write(regs.enables, event0);
    expect(finish(d)).toEqual([5]);
    d.write(regs.enables, event0);
    expect(finish(d)).toEqual([]);
    d.write(regs.enables, 0); d.write(regs.enables, event0);
    expect(finish(d)).toEqual([5]);
    d.write(regs.enables, -event0);
    expect(d.read(regs.enables)).toBe(0);
    expect(d.read(13)).toBe(0);
  });
});

test('three-tryte counters round-trip carry boundaries and never wrap', () => {
  for (const n of [0, 1, 9841, 9842, 19682, 19683, 19683 ** 2, WIDE_MAX]) expect(decodeWide(encodeWide(n))).toBe(n);
  for (const n of [-1, 1.1, Infinity, WIDE_MAX + 1]) expect(() => encodeWide(n)).toThrow();
  expect(() => decodeWide([0, 0, -1])).toThrow();
  expect(() => decodeWide([0, 0, 9842])).toThrow();
});
