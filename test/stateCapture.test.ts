import { expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, VEC_IRQ_BASE } from '../src/core/machine';
import { DeviceEvents } from '../src/core/deviceEvents';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { fromTrits } from '../src/core/tryte';
import { REG_BG0_SCX, REG_PAD1, REG_SCANLINE_CMP } from '../src/core/display';

function cpu(source: string) {
  const image = assemble(source); expect(image.diagnostics).toEqual([]);
  const m = new Machine();
  for (const c of image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, image.entry!); return m;
}

test('CPU restore completes a reserved instruction without repeating its MMIO write', () => {
  const m = cpu('@500\nW 70 7\nH 0sAAA Z'), text = new TextDevice(); m.attach(text);
  const duration = m.startWorldInstruction(); expect(duration).toBeGreaterThan(0);
  expect(text.outputTrytes()).toEqual([7]);
  const saved = m.captureCpuState(), savedText = text.captureState();
  const copy = new Machine(), copyText = new TextDevice(); copy.attach(copyText);
  copy.restoreCpuState(saved); copyText.restoreState(savedText);
  expect(() => copy.run(1)).toThrow('in flight');
  expect(copy.finishWorldInstruction()).toBe(m.finishWorldInstruction());
  expect(copy.run(100)).toBe(m.run(100));
  expect(copy.captureCpuState()).toEqual(m.captureCpuState());
  expect(copyText.captureState()).toEqual(text.captureState());
  expect(copyText.outputTrytes()).toEqual([7]);
  saved.memory.fill(0); savedText.output.push(8);
  expect(copy.peek(500)).not.toBe(0); expect(copyText.outputTrytes()).toEqual([7]);
});

test('pending device IRQs remain pending across capture and dispatch at instruction completion', () => {
  const m = cpu('@500\nQ A B\nH 0sAAA Z'), events = new DeviceEvents(1);
  m.poke(-13, 81); m.poke(-12, 9); m.poke(VEC_IRQ_BASE + 4, 1000); m.intMask = fromTrits('TTTT1TTTT');
  m.attach({id: 3, tick: (_cycles, irq) => events.flush(() => irq(4))});
  m.startWorldInstruction(); events.enable(fromTrits('100000000')); events.raise(0);
  const saved = m.captureCpuState(), savedEvents = events.captureState();
  const copy = new Machine(), copyEvents = new DeviceEvents(1);
  copy.attach({id: 3, tick: (_cycles, irq) => copyEvents.flush(() => irq(4))});
  copy.restoreCpuState(saved); copyEvents.restoreState(savedEvents);
  expect(copy.peek(REG_P)).toBe(501);
  expect(copy.finishWorldInstruction()).toBe(m.finishWorldInstruction());
  expect(copy.peek(REG_P)).toBe(1000); expect(copy.captureCpuState()).toEqual(m.captureCpuState());
  expect(copyEvents.captureState()).toEqual(events.captureState());
  let extra = 0; copyEvents.flush(() => extra++); expect(extra).toBe(0);
});

test.each([0, 27])('CPU sleep and deferred H completion replay exactly, duration=%s', duration => {
  const m = cpu('@500\nH A B\nW 400 9\nH 0sAAA Z');
  m.poke(-13, -9841); m.poke(-12, duration); m.startWorldInstruction();
  const copy = new Machine(); copy.restoreCpuState(m.captureCpuState());
  expect(copy.finishWorldInstruction()).toBe(m.finishWorldInstruction());
  for (const elapsed of [1, 7, 19]) {
    if (m.sleep) expect(copy.finishWorldSleep(elapsed)).toBe(m.finishWorldSleep(elapsed));
    expect(copy.captureCpuState()).toEqual(m.captureCpuState());
  }
});

test('text capture retains unread input, transcript and control state without aliasing', () => {
  const text = new TextDevice(); text.queueText('abcd'); expect(text.read(-12, 0)).not.toBe(0);
  text.write(-11, 27); text.write(-11, 7); text.write(-9, 1);
  const saved = text.captureState(), copy = new TextDevice(); copy.restoreState(saved);
  expect(copy.outputText()).toBe(text.outputText()); expect(copy.isUnlocked()).toBe(true);
  expect(copy.hasActivity()).toBe(true);
  for (let i = 0; i < 4; i++) expect(copy.read(-12, 0)).toBe(text.read(-12, 0));
  saved.input.push(9); saved.output[0] = 9; expect(copy.captureState()).toEqual(text.captureState());
  const before = copy.captureState(); expect(() => copy.restoreState({...before, input: [9842]})).toThrow();
  expect(copy.captureState()).toEqual(before);
});

test('display restore preserves sub-scanline phase, scroll latches and an undelivered pad edge', () => {
  const m = new Machine(), display = new DisplayDevice(a => m.peek(a), (a, v) => m.poke(a, v));
  m.poke(REG_BG0_SCX, 37); m.poke(REG_SCANLINE_CMP, 12);
  display.tick(799, () => {}); display.setGamepadState(0, 1);
  const saved = display.captureState(), copy = new Machine(); copy.restoreCpuState(m.captureCpuState());
  const restored = new DisplayDevice(a => copy.peek(a), (a, v) => copy.poke(a, v)); restored.restoreState(saved);
  expect(restored.nextEventCycles()).toBe(display.nextEventCycles());
  const actual: number[] = [], expected: number[] = [];
  for (const cycles of [1, 5, 80, 11_000, 7290]) {
    display.tick(cycles, line => expected.push(line)); restored.tick(cycles, line => actual.push(line));
    expect(restored.captureState()).toEqual(display.captureState()); expect(copy.mem).toEqual(m.mem);
  }
  expect(actual).toEqual(expected); expect(actual.length).toBeGreaterThan(0); expect(copy.peek(REG_PAD1)).toBe(1);
  saved.scroll.bg0x.fill(0); saved.padState[0] = 9;
  expect(restored.captureState()).toEqual(display.captureState());
  const before = restored.captureState();
  expect(() => restored.restoreState({...before, cycleAcc: 729})).toThrow(); expect(restored.captureState()).toEqual(before);
});

test('invalid CPU and event state is rejected before changing live state', () => {
  const m = cpu('@500\nH 0sAAA Z'), before = m.captureCpuState();
  const invalid = [ {...before, cycles: -1}, {...before, deferredDeviceCycles: 1},
    {...before, memory: new Int16Array(3)}, {...before, sleep: {remaining: -1, sleepPC: 500, wakePC: 503}} ];
  for (const state of invalid) { expect(() => m.restoreCpuState(state)).toThrow(); expect(m.captureCpuState()).toEqual(before); }
  const events = new DeviceEvents(2); events.raise(1); const saved = events.captureState();
  expect(() => events.restoreState({...saved, sticky: 4})).toThrow(); expect(events.captureState()).toEqual(saved);
  expect(() => new DeviceEvents(3).restoreState(saved)).toThrow('count mismatch');
});
