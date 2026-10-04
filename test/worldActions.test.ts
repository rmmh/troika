import { expect, test } from 'vitest';
import { World } from '../src/core/world';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { BlockMedium } from '../src/core/blockDevice';

function fixture() {
  const world = new World(), cpu = world.addMachine('cpu');
  const text = new TextDevice(); cpu.attach(text);
  const display = new DisplayDevice(a => cpu.peek(a), (a, v) => cpu.poke(a, v)); cpu.attach(display);
  const nic = world.addInterface('cpu', 4, [0, 0, 1], 'lan');
  const medium = new BlockMedium(27), disk = world.addDisk('cpu', [medium]);
  return {world, text, display, nic, medium, disk};
}

test('queued actions preserve timestamp and insertion ordering across restore and chunking', () => {
  const a = fixture(), b = fixture();
  const cells = [11, 12];
  a.world.queueAction({kind: 'text', host: 'cpu', cells}, 19);
  cells[0] = 99;
  a.world.queueAction({kind: 'text', host: 'cpu', cells: [13]}, 19);
  a.world.queueAction({kind: 'link', host: 'cpu', slot: 4, connected: false}, 17);
  a.world.queueAction({kind: 'link', host: 'cpu', slot: 4, connected: true}, 17);
  a.world.queueAction({kind: 'pad', host: 'cpu', pad: 1, value: 6561}, 23);
  const id = a.world.registerMedium(new BlockMedium(81));
  a.world.queueAction({kind: 'mount', host: 'cpu', unit: 1, medium: id}, 29);
  a.world.advanceTo(11);
  const state = a.world.captureState(); b.world.restoreState(state);
  expect(b.disk.attachedMedia()[0]).toBe(b.medium);
  state.actions[0]!.at = 999;
  a.world.advanceTo(30);
  for (const at of [17, 19, 23, 29, 30]) b.world.advanceTo(at);
  expect(b.world.captureState()).toEqual(a.world.captureState());
  expect(b.text.captureState().input).toEqual([11, 12, 13]);
  expect(b.nic.link).toBe(true);
  expect(b.disk.attachedMedia()[1]!.blocks).toBe(81);
  expect(b.display.captureState().padState[1]).toBe(6561);
  expect(b.world.captureState().actions).toEqual([]);
});

test('disk completion precedes removal queued at exactly its deadline', () => {
  const f = fixture(); f.disk.write(-9, 42); f.disk.write(-8, 2);
  f.world.queueAction({kind: 'mount', host: 'cpu', unit: 0, medium: null}, 6561);
  const saved = f.world.captureState();
  f.world.advanceTo(6561);
  expect(f.medium.read(0)[0]).toBe(42);
  expect(f.disk.attachedMedia()[0]).toBeUndefined();
  expect(f.disk.captureState([]).completion).toBe(0);
  f.world.restoreState(saved);
  f.world.advanceTo(6561);
  expect(f.medium.read(0)[0]).toBe(42);
});

test('invalid pending action rejects a snapshot before any live mutations', () => {
  const f = fixture(); f.world.queueAction({kind: 'text', host: 'cpu', cells: [1]}, 10);
  f.world.queueAction({kind: 'text', host: 'cpu', cells: [2]}, 10);
  const original = f.world.captureState();
  for (const corrupt of [
    (s: typeof original) => { s.actions[1]!.sequence = 0; },
    (s: typeof original) => { s.actions[1]!.at = 9; },
    (s: typeof original) => { s.actions[1]!.action.host = 'missing'; },
    (s: typeof original) => { s.nextAction = 1; },
  ]) {
    const bad = f.world.captureState(); bad.media[0]!.data[0] = 99; corrupt(bad);
    expect(() => f.world.restoreState(bad)).toThrow();
    expect(f.world.captureState()).toEqual(original);
  }
  expect(() => f.world.queueAction({kind: 'text', host: 'cpu', cells: [10000]})).toThrow();
  expect(f.world.captureState()).toEqual(original);
});
