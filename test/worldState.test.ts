import { expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { fromTrits } from '../src/core/tryte';
import { World } from '../src/core/world';
import { Machine, REG_P, VEC_IRQ_BASE } from '../src/core/machine';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';

function fixture() {
  const world = new World();
  const result = assemble('@500\nloop: Q A 7\nJ loop');
  expect(result.diagnostics).toEqual([]);
  const cpu = world.addMachine('active', new Machine());
  for (const chunk of result.chunks) chunk.data.forEach((v, i) => cpu.poke(chunk.addr + i, v));
  cpu.poke(REG_P, 500);
  const sleeper = world.addMachine('sleeper');
  const sleep = assemble('@500\nH 0sAAA Z');
  for (const chunk of sleep.chunks) chunk.data.forEach((v, i) => sleeper.poke(chunk.addr + i, v));
  sleeper.poke(REG_P, 500);
  const text = new TextDevice(); cpu.attach(text);
  const display = new DisplayDevice(a => cpu.peek(a), (a, v) => cpu.poke(a, v)); cpu.attach(display);
  const sender = world.addInterface('active', 4, [0, 0, 1], 'lan');
  const receiver = world.addInterface('sleeper', 4, [0, 0, 2], 'lan');
  const medium = new BlockMedium(27), disk = world.addDisk('active', [medium, medium]);
  return {world, cpu, text, display, sender, receiver, medium, disk};
}

test('whole hardware replay preserves reserved instructions, sleep, display and pending disk/network IO', () => {
  const original = fixture(), clone = fixture();
  original.disk.write(-9, 123); original.disk.write(-8, 2);
  const frame = new Int16Array(243); frame[0] = 1; frame[1] = 2; frame[7] = 2;
  for (const cell of frame) original.sender.write(-6, cell);
  original.sender.write(-3, 1);
  original.display.setGamepadState(0, 6561);
  original.world.advanceTo(13);
  const snapshot = original.world.captureState();
  expect(snapshot.hosts[0]!.phase).toBe('instruction');
  expect(snapshot.hosts[1]!.phase).toBe('sleep');
  clone.world.restoreState(snapshot);
  expect(clone.world.captureState()).toEqual(snapshot);
  expect(clone.disk.attachedMedia()[0]).toBe(clone.medium);
  expect(clone.disk.attachedMedia()[0]).toBe(clone.disk.attachedMedia()[1]);
  for (const horizon of [14, 728, 729, 6560, 6561, 9000]) {
    original.world.advanceTo(horizon); clone.world.advanceTo(horizon);
    expect(clone.world.captureState()).toEqual(original.world.captureState());
  }
  expect(clone.medium.read(0)[0]).toBe(123);
  expect(clone.receiver.inspect(-9)).toBe(1);
  // Restoring earlier state also rewinds existing scenario-owned disk objects.
  original.world.restoreState(snapshot);
  expect(original.medium.read(0)[0]).toBe(0);
  original.world.advanceTo(9000);
  expect(original.world.captureState()).toEqual(clone.world.captureState());
});

test('invalid late host data rejects the entire restore before media or CPU mutations', () => {
  const f = fixture(); f.world.advanceTo(13);
  const before = f.world.captureState();
  for (const corrupt of [
    (s: typeof before) => { s.hosts[1]!.cpu.memory[100] = 10000; },
    (s: typeof before) => { s.hosts[1]!.phase = 'instruction'; },
    (s: typeof before) => { s.hosts[1]!.id = 'wrong'; },
    (s: typeof before) => { s.network.time++; },
  ]) {
    const bad = f.world.captureState(); bad.media[0]!.data[0] = 99;
    bad.hosts[0]!.cpu.memory[100] = 99; corrupt(bad);
    expect(() => f.world.restoreState(bad)).toThrow();
    expect(f.world.captureState()).toEqual(before);
  }
});

test('hotplugged media restore preserves pool aliases and generation state', () => {
  const f = fixture(); f.world.advanceTo(100);
  const before = f.world.captureState();
  f.disk.setMedium(0, new BlockMedium(81));
  const after = f.world.captureState();
  f.world.restoreState(before);
  expect(f.disk.attachedMedia()[0]).toBe(f.medium);
  f.world.restoreState(after);
  expect(f.disk.attachedMedia()[0]!.blocks).toBe(81);
  expect(f.disk.attachedMedia()[1]).toBe(f.medium);
  expect(f.world.captureState()).toEqual(after);
});

test('unsupported or replaced attached devices fail explicitly', () => {
  const f = fixture();
  f.cpu.attach({id: -1});
  expect(() => f.world.captureState()).toThrow('unsupported');
  const g = fixture(); g.cpu.attach(new TextDevice());
  // Replacing a supported local device is valid; replacing coordinated hardware is not.
  g.cpu.attach({id: 4});
  expect(() => g.world.captureState()).toThrow('unsupported');
});


test('interrupt entry reservations restore without dispatching or executing the handler twice', () => {
  const f = fixture();
  f.cpu.poke(VEC_IRQ_BASE + 4, 1000); f.cpu.intMask = fromTrits('TTTT1TTTT');
  f.sender.write(-1, fromTrits('100000000'));
  f.world.advanceTo(4);
  const frame = new Int16Array(243); frame[0] = 1; frame[1] = 2;
  f.sender.receive(frame);
  const deadline = f.world.captureState().hosts[0]!.readyAt;
  f.world.advanceTo(deadline);
  const state = f.world.captureState();
  expect(state.hosts[0]!.phase).toBe('interrupt');
  const clone = fixture(); clone.world.restoreState(state);
  f.world.advanceTo(deadline + 15); clone.world.advanceTo(deadline + 15);
  expect(clone.world.captureState()).toEqual(f.world.captureState());
});
