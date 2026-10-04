import { expect, test } from 'vitest';
import { BlockDevice, BlockMedium, BLOCK_IO_CYCLES, BLOCK_SIZE } from '../src/core/blockDevice';

const write = (disk: BlockDevice, offset: number, value: number) => disk.write(offset - 13, value);

test('pending disk write replays once at its remaining deadline and retains shared media', () => {
  const medium = new BlockMedium(27), disk = new BlockDevice([medium, medium], true);
  write(disk, 10, 6561); write(disk, 2, 8);
  for (let i = 0; i < BLOCK_SIZE; i++) write(disk, 4, i - 121);
  write(disk, 5, 2); disk.advance(1729);
  const state = disk.captureState([medium]), image = medium.captureState();
  const restoredMedium = new BlockMedium(27), restored = new BlockDevice([], true);
  restoredMedium.restoreState(image); restored.restoreState(state, [restoredMedium]);
  expect(restored.attachedMedia()[0]).toBe(restored.attachedMedia()[1]);
  state.buffer.fill(999); state.operation!.data!.fill(999); image.data.fill(999);
  expect(restored.captureState([restoredMedium])).toEqual(disk.captureState([medium]));
  for (const device of [disk, restored]) device.advance(BLOCK_IO_CYCLES - 1730);
  expect(restoredMedium.read(8)).toEqual(new Int16Array(BLOCK_SIZE));
  for (const device of [disk, restored]) device.advance(1);
  expect(restoredMedium.image()).toEqual(medium.image());
  expect(restoredMedium.read(8)[0]).toBe(-121);
  const interrupts: number[] = [];
  restored.tick(100, line => interrupts.push(line));
  restored.tick(100, line => interrupts.push(line));
  expect(interrupts).toEqual([5]);
  restored.advance(BLOCK_IO_CYCLES);
  expect(restoredMedium.image()).toEqual(medium.image());
});

test('read cursor, generation latch, hotplug cancellation and pending events survive restore', () => {
  const medium = new BlockMedium(27), disk = new BlockDevice([medium]);
  medium.write(2, new Int16Array(BLOCK_SIZE).fill(41));
  write(disk, 2, 2); write(disk, 5, 1); disk.advance(BLOCK_IO_CYCLES);
  disk.read(-9); disk.read(-9);
  const clone = new BlockDevice([]);
  clone.restoreState(disk.captureState([medium]), [medium]);
  expect(clone.read(-9)).toBe(41);
  expect(clone.inspect(-10)).toBe(3);
  write(disk, 10, 2187); write(disk, 5, 2);
  disk.setMedium(0); disk.setMedium(0, medium); disk.read(2);
  const state = disk.captureState([medium]);
  clone.restoreState(state, [medium]);
  expect(clone.captureState([medium])).toEqual(state);
  expect(state.completion).toBe(-2);
  expect(state.generations[0]).toBe(2);
  expect(state.operation).toBeUndefined();
  const interrupts: number[] = [];
  clone.tick(0, line => interrupts.push(line));
  expect(interrupts).toEqual([5]);
});

test('flush with a negative unused address and read-only media can be restored', () => {
  const medium = new BlockMedium(27, true), disk = new BlockDevice([medium]);
  write(disk, 2, -98); write(disk, 5, 3); disk.advance(26);
  const clone = new BlockDevice([]);
  clone.restoreState(disk.captureState([medium]), [medium]);
  clone.advance(1);
  expect(clone.captureState([medium]).completion).toBe(0);
  const state = medium.captureState(); state.data[0] = 18;
  medium.restoreState(state);
  expect(medium.read(0)[0]).toBe(18);
  expect(() => medium.write(0, new Int16Array(BLOCK_SIZE))).toThrow('read-only');
});

test('invalid late fields leave controller and medium unchanged', () => {
  const medium = new BlockMedium(27), disk = new BlockDevice([medium]);
  write(disk, 5, 2);
  const original = disk.captureState([medium]);
  for (const mutate of [
    (s: typeof original) => { s.operation!.remaining = 0; },
    (s: typeof original) => { s.operation!.generation++; },
    (s: typeof original) => { s.operation!.data![242] = 10000; },
    (s: typeof original) => { s.media[26] = 1; },
    (s: typeof original) => { s.changed[2]!.count = 2; },
  ]) {
    const bad = disk.captureState([medium]); bad.buffer.fill(55); mutate(bad);
    expect(() => disk.restoreState(bad, [medium])).toThrow();
    expect(disk.captureState([medium])).toEqual(original);
  }
  const image = medium.captureState(); image.data[0] = 88; image.data[image.data.length - 1] = 10000;
  expect(() => medium.restoreState(image)).toThrow();
  expect(medium.read(0)[0]).toBe(0);
});

test('pending reads sample the restored medium at completion; reset cancels a restored operation', () => {
  const medium = new BlockMedium(27), disk = new BlockDevice([medium], true);
  write(disk, 2, 3); write(disk, 5, 1); disk.advance(2000);
  const cloneMedium = new BlockMedium(27), clone = new BlockDevice([], true);
  cloneMedium.restoreState(medium.captureState());
  clone.restoreState(disk.captureState([medium]), [cloneMedium]);
  cloneMedium.write(3, new Int16Array(BLOCK_SIZE).fill(-17));
  clone.advance(BLOCK_IO_CYCLES - 2000);
  expect(clone.read(-9)).toBe(-17);
  write(clone, 5, 2);
  const pending = clone.captureState([cloneMedium]);
  clone.restoreState(pending, [cloneMedium]);
  write(clone, 5, 4);
  cloneMedium.write(3, new Int16Array(BLOCK_SIZE).fill(99));
  clone.advance(BLOCK_IO_CYCLES);
  expect(cloneMedium.read(3)[0]).toBe(99);
  expect(clone.captureState([cloneMedium]).events.pending).toBe(false);
});
