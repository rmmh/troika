import { expect, test } from 'vitest';
import { NetworkFabric, type NetworkDevice, type NetworkFabricState, NETWORK_TICK_CYCLES } from '../src/core/networkDevice';
import { fromTrits } from '../src/core/tryte';

function topology(reverse = false) {
  const fabric = new NetworkFabric();
  const ids = reverse ? [9, 3, 2, 1] : [1, 2, 3, 9];
  const nics = new Map(ids.map(n => [n, fabric.add(n === 2 ? 5 : 4, [0, 0, n], n === 3 ? 'other' : 'lan')]));
  return {fabric, a: nics.get(1)!, b: nics.get(2)!, isolated: nics.get(3)!, receiver: nics.get(9)!};
}
function packet(tag: number) {
  const frame = new Int16Array(243); frame[0] = 1; frame[1] = 2; frame[7] = 9; frame[14] = 27; frame[26] = 216;
  frame.fill(tag, 27); return frame;
}
function send(nic: NetworkDevice, tag: number) {
  nic.write(-7, 0); for (const cell of packet(tag)) nic.write(-6, cell); nic.write(-3, 1);
}

test('fabric restores in-flight TX, wrapped RX queues and IRQ edges with deterministic equal-time delivery', () => {
  const original = topology(), restored = topology(true);
  const {fabric, a, b, receiver, isolated} = original;
  fabric.advanceTo(20_000 * NETWORK_TICK_CYCLES);
  receiver.write(-1, fromTrits('111110000'));
  for (const tag of [71, 72, 73]) receiver.receive(packet(tag));
  receiver.write(-3, 2); // Queue wraps when the next transmission arrives.
  receiver.write(-5, 40); expect(receiver.read(-4)).toBe(72);
  receiver.read(2); // Clock latch is deliberately older than the snapshot time.
  send(a, 44); send(b, 55);
  a.write(-7, 40); a.write(-6, 99); // TX staging differs from retained in-flight TX.
  isolated.setLink(false);
  fabric.advanceTo(fabric.cycles + 2222);
  const saved = fabric.captureState(); restored.fabric.restoreState(saved);
  expect(restored.fabric.captureState()).toEqual(saved);
  expect(restored.receiver.inspect(-4)).toBe(72);
  expect(restored.receiver.read(3)).toBe(receiver.read(3));
  const originalIrqs: number[] = [], restoredIrqs: number[] = [];
  receiver.tick(0, n => originalIrqs.push(n)); restored.receiver.tick(0, n => restoredIrqs.push(n));
  expect(restoredIrqs).toEqual([4]); expect(restoredIrqs).toEqual(originalIrqs);
  const due = a.completionTime;
  fabric.advanceTo(due - 1); restored.fabric.advanceTo(due - 1);
  expect(restored.receiver.inspect(-9)).toBe(2);
  fabric.advanceTo(due); restored.fabric.advanceTo(due);
  expect(restored.fabric.captureState()).toEqual(fabric.captureState());
  expect(restored.receiver.inspect(-9)).toBe(3); expect(restored.receiver.inspect(1)).toBe(1); // second simultaneous TX dropped
  for (const tag of [72, 73, 44]) {
    restored.receiver.write(-5, 27); expect(restored.receiver.read(-4)).toBe(tag); restored.receiver.write(-3, 2);
  }
  expect(restored.isolated.link).toBe(false); expect(restored.isolated.inspect(-9)).toBe(0);
  expect(restored.a.inspect(-6)).toBe(a.inspect(-6));
  // Neither capturing nor restoring leaves mutable frame arrays shared.
  saved.ports[0]!.device.tx.fill(0); saved.ports[0]!.device.staging.fill(0);
  expect(restored.a.captureState().tx[27]).toBe(44);
  expect(restored.a.captureState().staging[40]).toBe(99);
});

test('restoring a disconnected NIC preserves cancellation without inventing delivery or link events', () => {
  const original = topology(), restored = topology();
  original.a.write(-1, fromTrits('111110000')); send(original.a, 66);
  original.a.setLink(false); original.fabric.advanceTo(100);
  restored.fabric.restoreState(original.fabric.captureState());
  expect(restored.fabric.nextEventTime).toBe(Infinity);
  const irq: number[] = []; restored.a.tick(0, n => irq.push(n)); restored.a.tick(0, n => irq.push(n));
  expect(irq).toEqual([4]);
  restored.fabric.advanceTo(10_000); expect(restored.receiver.inspect(-9)).toBe(0);
  restored.a.setLink(true); send(restored.a, 77); restored.fabric.advanceTo(16_561);
  restored.receiver.write(-5, 27); expect(restored.receiver.read(-4)).toBe(77);
});

test('fabric validates every port and topology before changing any live state', () => {
  const {fabric} = topology(); fabric.advanceTo(10);
  const before = fabric.captureState();
  const invalid = (edit: (s: NetworkFabricState) => void) => {
    const saved = structuredClone(before);
    saved.ports[0]!.device.staging[27] = 123; // Would expose partial restore.
    edit(saved); expect(() => fabric.restoreState(saved)).toThrow(); expect(fabric.captureState()).toEqual(before);
  };
  invalid(s => { s.ports[3]!.device.rxCursor = 243; });
  invalid(s => { s.ports[3]!.device.events.count = 4; });
  invalid(s => { s.ports[3]!.segment = 'different'; });
  invalid(s => { s.ports[3] = s.ports[0]!; });
  invalid(s => { s.ports.pop(); });
  invalid(s => { s.time = NaN; });
  invalid(s => { s.ports[3]!.device.due = 9; });
  invalid(s => { s.ports[3]!.device.clockLatch = [0, 0, 1]; });
  invalid(s => { s.ports[3]!.device.rx[2]![0] = 9842; });
});

test('pending transmissions retain the hardware-stamped source and framing invariants', () => {
  const {fabric, a} = topology(); send(a, 8);
  const before = fabric.captureState();
  for (const offset of [0, 2, 26]) {
    const saved = structuredClone(before); saved.ports[0]!.device.tx[offset] = 999;
    expect(() => fabric.restoreState(saved)).toThrow('retained snapshot transmission');
    expect(fabric.captureState()).toEqual(before);
  }
});
