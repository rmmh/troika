import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, VEC_IRQ_BASE } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { NetworkDevice } from '../src/core/networkDevice';
import { fromTrits, fromTribbles } from '../src/core/tryte';
import { DisplayDevice } from '../src/core/displayDevice';

function load(source: string) {
  const result = assemble(source);
  expect(result.diagnostics).toEqual([]);
  const m = new Machine();
  for (const c of result.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, result.entry!);
  return m;
}
function frame() { const p = new Int16Array(243); p[0] = 1; p[1] = 2; p[7] = 2; return p; }
function stage(nic: NetworkDevice) { nic.write(-7, 0); for (const v of frame()) nic.write(-6, v); nic.write(-3, 1); }

describe('shared world scheduler', () => {
  test('network and disk time advance once, independent of the number of CPUs', () => {
    for (const count of [1, 3, 9]) {
      const w = new World();
      for (let i = 0; i < count; i++) w.addMachine(String(i), load('@500\nH 0sAAA Z'));
      const sender = w.addInterface('0', 4, [0, 0, 1], 'lan');
      const receiver = w.addInterface('0', 5, [0, 0, 2], 'lan');
      const medium = new BlockMedium(27); const disk = w.addDisk('0', [medium]);
      disk.write(-9, 123); disk.write(-8, 2);
      stage(sender);
      w.advanceTo(6560);
      expect(receiver.read(-9)).toBe(0); expect(medium.read(0)[0]).toBe(0);
      w.advanceTo(6561);
      expect(receiver.read(-9)).toBe(1); expect(medium.read(0)[0]).toBe(123);
      expect(w.cycles).toBe(6561); expect(w.network.cycles).toBe(6561);
    }
  });

  test('an IRQ arriving during division waits for instruction completion, then charges entry time', () => {
    const w = new World();
    const m = load('@500\nQ A B\nH 0sAAA Z\n@1000\nW 400 1\nH 0sAAA Z');
    m.poke(-13, 81); m.poke(-12, 9);
    m.poke(VEC_IRQ_BASE + 4, 1000); m.intMask = fromTrits('TTTT1TTTT');
    w.addMachine('cpu', m); const nic = w.addInterface('cpu', 4, [0, 0, 2], 'lan');
    nic.write(-1, fromTrits('100000000'));
    w.advanceTo(4); nic.receive(frame());
    w.advanceTo(8); expect(m.peek(REG_P)).toBe(501); expect(m.peek(400)).toBe(0);
    w.advanceTo(9); expect(m.peek(REG_P)).toBe(1000); expect(m.peek(400)).toBe(0);
    w.advanceTo(10); expect(m.peek(400)).toBe(0);
    w.advanceTo(11); expect(m.peek(400)).toBe(1);
  });

  test('local and externally clocked IRQs join the same boundary priority decision', () => {
    const w = new World(); const m = load('@500\nQ A B\nH 0sAAA Z');
    m.poke(-13, 81); m.poke(-12, 9);
    m.poke(VEC_IRQ_BASE, 1000); m.poke(VEC_IRQ_BASE + 4, 2000);
    m.intMask = fromTrits('1TTT1TTTT');
    let raised = false;
    m.attach({ id: 3, tick: (cycles, irq) => { if (cycles && !raised) { raised = true; irq(0); } } });
    w.addMachine('cpu', m); const nic = w.addInterface('cpu', 4, [0, 0, 2], 'lan');
    nic.write(-1, fromTrits('100000000'));
    w.advanceTo(4); nic.receive(frame()); w.advanceTo(9);
    expect(m.peek(REG_P)).toBe(1000);
    expect(m.inspect(fromTribbles('_NP'))).not.toBe(0);
  });

  test('delivery at a sleep deadline is processed before the CPU continues', () => {
    const w = new World();
    const m = load('@500\nH A B\nW 400 2\nH 0sAAA Z\n@1000\nW 400 1\nH 0sAAA Z');
    m.poke(-13, fromTrits('TTTT1TTTT')); m.poke(-12, 6560); m.poke(VEC_IRQ_BASE + 4, 1000);
    w.addMachine('cpu', m);
    const sender = w.addInterface('cpu', 4, [0, 0, 1], 'lan');
    const receiver = w.addInterface('cpu', 5, [0, 0, 2], 'lan');
    receiver.write(-1, fromTrits('100000000')); stage(sender);
    w.advanceTo(6561); expect(m.peek(REG_P)).toBe(1000); expect(m.peek(400)).toBe(0);
    w.advanceTo(6563); expect(m.peek(400)).toBe(1);
  });

  test('chunking world advancement does not change CPU/device results', () => {
    function scenario() {
      const w = new World();
      const m = load('@500\nM A 1\nloop: I A 1\nQ A 2\nJ loop');
      const idle = load('@500\nH 0sAAA Z');
      const display = new DisplayDevice(a => idle.peek(a), (a, v) => idle.poke(a, v));
      idle.attach(display);
      w.addMachine('a', m); w.addMachine('b', idle);
      const a = w.addInterface('a', 4, [0, 0, 1], 'lan');
      const b = w.addInterface('b', 4, [0, 0, 2], 'lan'); stage(a);
      return { w, m, idle, b };
    }
    const one = scenario(); const many = scenario();
    one.w.advanceTo(20000);
    for (let at = 137; at < 20000; at += 137) many.w.advanceTo(at);
    many.w.advanceTo(20000);
    expect(many.m.mem).toEqual(one.m.mem);
    expect(many.m.cycles).toBe(one.m.cycles);
    expect(many.idle.mem).toEqual(one.idle.mem);
    expect(many.idle.cycles).toBe(one.idle.cycles);
    expect(many.idle.inspect(45)).toBe(one.idle.inspect(45));
    expect(many.b.read(-9)).toBe(one.b.read(-9));
  });

  test('hotplug while paused wakes a sleeping CPU at the current world boundary', () => {
    const w = new World(); const m = load('@500\nH A Z\nH 0sAAA Z\n@1000\nW 400 1\nH 0sAAA Z');
    m.poke(-13, fromTrits('TTTT1TTTT')); m.poke(VEC_IRQ_BASE + 4, 1000);
    w.addMachine('cpu', m); const nic = w.addInterface('cpu', 4, [0, 0, 1], 'lan');
    nic.write(-1, fromTrits('000100000'));
    w.advanceTo(1000); nic.setLink(false);
    expect(w.cycles).toBe(1000);
    w.advanceTo(1000); expect(m.peek(REG_P)).toBe(1000);
    w.advanceTo(1002); expect(m.peek(400)).toBe(1);
  });

  test('rejects duplicate resources, late topology changes and invalid time', () => {
    const w = new World(); const m = w.addMachine('a', load('@500\nH 0sAAA Z'));
    expect(() => w.addMachine('b', m)).toThrow();
    w.addInterface('a', 4, [0, 0, 1], 'lan');
    expect(() => w.addInterface('a', 4, [0, 0, 2], 'lan')).toThrow();
    w.runCycles(100);
    expect(() => w.advanceTo(99)).toThrow(); expect(() => w.runCycles(-1)).toThrow();
    expect(() => w.addMachine('b')).toThrow();
  });
});
