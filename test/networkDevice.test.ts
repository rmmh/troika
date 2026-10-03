import { describe, expect, test } from 'vitest';
import { NetworkFabric, NetworkDevice, NETWORK_TICK_CYCLES, type NetworkIdentity } from '../src/core/networkDevice';
import { fromTrits } from '../src/core/tryte';
import { decodeWide } from '../src/core/wide';

const R = { link: -10, count: -9, busy: -8, txCursor: -7, tx: -6, rxCursor: -5, rx: -4,
  command: -3, events: -2, enables: -1, result: 0, dropped: 1, high: 2, middle: 3, low: 4 };
function packet(destination: NetworkIdentity = [0, 0, 2], payload = 123): Int16Array {
  const frame = new Int16Array(243).fill(999);
  frame.set([1, 2, -1, -2, -3, ...destination]);
  frame[26] = 1; frame[27] = payload;
  return frame;
}
function stage(d: NetworkDevice, frame = packet()) {
  d.write(R.txCursor, 0);
  for (const v of frame) d.write(R.tx, v);
}
function receive(d: NetworkDevice) {
  d.write(R.rxCursor, 0);
  return Int16Array.from({ length: 243 }, () => d.read(R.rx));
}
function irq(d: NetworkDevice): number[] { const lines: number[] = []; d.tick(0, l => lines.push(l)); return lines; }

describe('packet NIC and link fabric', () => {
  test('SEND snapshots staging, stamps only link source and zeroes padding at exact completion', () => {
    const f = new NetworkFabric();
    const a = f.add(4, [0, 0, 1], 'lan'); const b = f.add(4, [0, 0, 2], 'lan');
    stage(a); a.write(R.command, 1);
    a.write(R.command, 3); // CLEAR cannot change the immutable in-flight frame
    a.tick(999999, () => {}); // per-machine ticking does not advance world time
    expect(b.read(R.count)).toBe(0);
    f.advanceTo(6560); expect(b.read(R.count)).toBe(0);
    f.advanceTo(6561); expect(b.read(R.count)).toBe(1);
    expect(a.read(R.busy)).toBe(0);
    const frame = receive(b);
    expect(Array.from(frame.slice(2, 5))).toEqual([0, 0, 1]);
    expect(frame[8]).toBe(999); // hardware does not rewrite network addresses
    expect(frame[27]).toBe(123);
    expect(frame.slice(28).every(v => v === 0)).toBe(true);
    expect(a.read(R.tx)).toBe(0);
  });

  test('broadcast stays local, unicast to self works and unknown destinations still complete', () => {
    const f = new NetworkFabric();
    const a = f.add(4, [0, 0, 1], 'one'); const b = f.add(4, [0, 0, 2], 'one');
    const c = f.add(4, [0, 0, 3], 'two');
    stage(a, packet([0, 0, 0])); a.write(R.command, 1); f.advanceTo(6561);
    expect(a.read(R.count)).toBe(0); expect(b.read(R.count)).toBe(1); expect(c.read(R.count)).toBe(0);
    stage(a, packet([0, 0, 1], 42)); a.write(R.command, 1); f.advanceTo(13122);
    expect(receive(a)[27]).toBe(42);
    stage(a, packet([0, 0, 3])); a.write(R.command, 1); f.advanceTo(19683);
    expect(c.read(R.count)).toBe(0); expect(a.read(R.busy)).toBe(0);
  });

  test('simultaneous deliveries use full identity order, not registration order', () => {
    const f = new NetworkFabric();
    const b = f.add(4, [0, 1, 1], 'lan'); const a = f.add(4, [0, 0, 2], 'lan');
    const receiver = f.add(5, [1, 0, 0], 'lan');
    stage(b, packet([1, 0, 0], 2)); stage(a, packet([1, 0, 0], 1));
    b.write(R.command, 1); a.write(R.command, 1); f.advanceTo(6561);
    expect(receive(receiver)[27]).toBe(1); receiver.write(R.command, 2);
    expect(receive(receiver)[27]).toBe(2);
  });

  test('RX has exactly three slots, drops new frames, preserves queued data, and saturates loss count', () => {
    const f = new NetworkFabric(); const d = f.add(4, [0, 0, 1], 'lan');
    for (let i = 1; i <= 9845; i++) d.receive(packet([0, 0, 1], i % 9841));
    expect(d.read(R.count)).toBe(3); expect(d.read(R.dropped)).toBe(9841);
    for (let i = 1; i <= 3; i++) {
      expect(receive(d)[27]).toBe(i);
      d.write(R.command, 2); expect(d.read(R.rxCursor)).toBe(0);
    }
    d.write(R.rxCursor, 242);
    expect(d.read(R.rx)).toBe(0); expect(d.read(R.rxCursor)).toBe(242);
    d.write(R.command, 2); expect(d.read(R.result)).toBe(-4);
  });

  test('cursor accesses wrap, inspection never consumes, and read-only/reserved writes are ignored', () => {
    const f = new NetworkFabric(); const d = f.add(4, [1, 2, 3], 'lan');
    d.write(R.txCursor, 242); d.write(R.tx, 55); expect(d.read(R.txCursor)).toBe(0);
    d.write(R.txCursor, 242); d.write(R.txCursor, -1); d.write(R.txCursor, 243);
    expect(d.inspect(R.tx)).toBe(55); expect(d.inspect(R.tx)).toBe(55);
    expect(d.read(R.tx)).toBe(55); expect(d.read(R.txCursor)).toBe(0);
    d.receive(packet([1, 2, 3]));
    expect(d.inspect(R.rx)).toBe(1); expect(d.inspect(R.rx)).toBe(1);
    expect(d.read(R.rxCursor)).toBe(0);
    d.write(-13, 999); expect(d.read(-13)).toBe(1);
    d.write(13, 999); expect(d.read(13)).toBe(0);
  });

  test('command rejection checks link then busy then framing, without losing queues or staging', () => {
    const f = new NetworkFabric(); const d = f.add(4, [0, 0, 1], 'lan');
    d.setLink(false); d.write(R.command, 1); expect(d.read(R.result)).toBe(-2);
    d.setLink(true); d.write(R.command, 1); expect(d.read(R.result)).toBe(-3);
    stage(d); d.write(R.command, 1); expect(d.read(R.result)).toBe(0);
    d.write(R.command, 3); d.write(R.command, 1); expect(d.read(R.result)).toBe(-1);
    d.write(R.command, 8); expect(d.read(R.result)).toBe(-5);
    expect(d.read(R.busy)).toBe(1);
    for (const [offset, value] of [[0, 2], [1, 0], [1, 5], [26, -1], [26, 217]]) {
      d.reset(); const frame = packet(); frame[offset!] = value!; stage(d, frame);
      d.write(R.command, 1); expect(d.read(R.result)).toBe(-3);
      d.write(R.txCursor, offset!); expect(d.read(R.tx)).toBe(value);
    }
  });

  test('link loss cancels TX but preserves RX/staging; RESET retains physical identity and link', () => {
    const f = new NetworkFabric(); const a = f.add(4, [0, 0, 1], 'lan'); const b = f.add(4, [0, 0, 2], 'lan');
    stage(a); a.receive(packet()); a.write(R.command, 1); f.advanceTo(6560);
    a.setLink(false); f.advanceTo(6561);
    expect(b.read(R.count)).toBe(0); expect(a.read(R.busy)).toBe(0); expect(a.read(R.count)).toBe(1);
    a.write(R.txCursor, 27); expect(a.read(R.tx)).toBe(123);
    a.reset(); expect(a.read(-11)).toBe(1); expect(a.read(R.link)).toBe(0);
    expect(a.read(R.count)).toBe(0); expect(a.read(R.events)).toBe(0);
  });

  test('sticky events signal enabled occurrences, not every tick', () => {
    const f = new NetworkFabric(); const d = f.add(4, [0, 0, 1], 'lan');
    d.receive(packet()); expect(irq(d)).toEqual([]);
    d.write(R.enables, fromTrits('100000000')); expect(irq(d)).toEqual([4]); expect(irq(d)).toEqual([]);
    d.receive(packet()); expect(irq(d)).toEqual([]); // RX was already nonempty
    d.write(R.events, fromTrits('T00000000')); expect(d.read(R.events)).toBe(0);
    d.write(R.enables, fromTrits('001000000')); d.receive(packet()); d.receive(packet());
    expect(irq(d)).toEqual([4]); d.receive(packet()); expect(irq(d)).toEqual([4]);
  });

  test('clock snapshots use shared world ticks and inspection does not relatch', () => {
    const f = new NetworkFabric(); const a = f.add(4, [0, 0, 1], 'lan'); const b = f.add(5, [0, 0, 2], 'lan');
    a.read(R.high); f.advanceTo(9842 * NETWORK_TICK_CYCLES);
    a.inspect(R.high); expect(a.read(R.middle)).toBe(0); expect(a.read(R.low)).toBe(0);
    const now = [a.read(R.high), a.read(R.middle), a.read(R.low)] as const;
    expect(decodeWide(now)).toBe(9842);
    expect([b.read(R.high), b.read(R.middle), b.read(R.low)]).toEqual(now);
    expect(() => f.advanceTo(f.cycles - 1)).toThrow();
    expect(() => f.add(4, [0, 0, 1], 'other')).toThrow('duplicate');
    expect(() => f.add(4, [0, 0, 0], 'lan')).toThrow();
  });
});
