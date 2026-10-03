import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { REG_P, REG_S } from '../src/core/machine';
import { REG_BG0_SCX, REG_PAD1, REG_SCANLINE } from '../src/core/display';
import { EmulatorController } from '../src/web/emulator';

describe('debugger controller', () => {
  let now: number;
  let nextId: number;
  let frames: Map<number, FrameRequestCallback>;
  let emu: EmulatorController;

  function frame(dt: number): void {
    now += dt;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
  }

  beforeEach(() => {
    now = 0;
    nextId = 0;
    frames = new Map();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    emu = new EmulatorController();
    vi.spyOn(emu.audioOutput, 'start').mockImplementation(() => {});
    vi.spyOn(emu.audioOutput, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    emu.pause();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits for accumulated cycles at 1 Hz', () => {
    emu.speed = 1;
    emu.start();
    for (let i = 0; i < 63; i++) frame(16);
    expect(emu.machine.cycles).toBe(1);
    for (let i = 0; i < 62; i++) frame(16);
    expect(emu.machine.cycles).toBe(2);
  });

  it.each([10, 20, 40])('preserves fractional cycles with %i ms frames', (dt) => {
    emu.speed = 73;
    emu.start();
    for (let i = 0; i < 2000 / dt; i++) frame(dt);
    expect(emu.machine.cycles).toBe(146);
  });

  it('repays the extra cycles of an indivisible instruction', () => {
    emu.load(assemble('M A 83\nM B 83\n'));
    emu.speed = 10;
    emu.start();
    frame(100);
    expect(emu.machine.cycles).toBe(2);
    frame(100);
    expect(emu.machine.cycles).toBe(2);
    frame(100);
    expect(emu.machine.cycles).toBe(4);
  });

  it('does not execute for repeated frame timestamps', () => {
    emu.start();
    frame(0);
    expect(emu.machine.cycles).toBe(0);
  });

  it('does not accumulate paused wall time or duplicate animation loops', () => {
    emu.speed = 10;
    emu.start();
    emu.start();
    expect(frames.size).toBe(1);
    frame(100);
    emu.pause();
    expect(frames.size).toBe(0);
    frame(10_000);
    emu.start();
    frame(100);
    expect(emu.machine.cycles).toBe(2);
    expect(frames.size).toBe(1);
  });

  it('clamps elapsed time after a background-tab delay', () => {
    emu.speed = 100;
    emu.start();
    frame(60_000);
    expect(emu.machine.cycles).toBe(10);
  });

  it('clears display timing, scroll latches, and input when loading a program', () => {
    emu.machine.poke(REG_BG0_SCX, 42);
    emu.displayDevice.setGamepadState(0, 1);
    emu.machine.run(100);
    expect(emu.machine.read(REG_SCANLINE)).toBe(1);
    expect(emu.displayDevice.scroll.bg0x[1]).toBe(42);

    emu.load(assemble('M A 83'));

    expect(emu.machine.read(REG_SCANLINE)).toBe(0);
    expect(emu.machine.read(REG_PAD1)).toBe(0);
    expect([...emu.displayDevice.scroll.bg0x]).toEqual(Array(243).fill(0));
    expect(emu.displayDevice.nextEventCycles()).toBe(72);
    expect(emu.machine.cycles).toBe(0);
  });

  it('loads and resets at the source entry point even when data is at a lower address', () => {
    const result = assemble('@200\nM A 83\n@-1000\n42');
    expect(result.entry).toBe(200);
    expect(result.chunks[0]!.addr).toBe(-1000);
    emu.load(result);
    expect(emu.machine.inspect(REG_P)).toBe(200);
    emu.step();
    expect(emu.machine.inspect(-13)).toBe(83);
    emu.reset();
    expect(emu.machine.inspect(REG_P)).toBe(200);
    expect(emu.machine.peek(-1000)).toBe(42);
  });

  it('preserves register initializers consistently on Load and Reset', () => {
    emu.load(assemble('@200\nM A 83\n@6\n123'));
    expect(emu.machine.inspect(REG_S)).toBe(123);
    emu.machine.poke(REG_S, 456);
    emu.reset();
    expect(emu.machine.inspect(REG_S)).toBe(123);
    expect(emu.machine.inspect(REG_P)).toBe(200);
  });

  it('starts wrapped programs at their first source instruction', () => {
    emu.load(assemble('@9841\nI A 1\nI B 1'));
    expect(emu.machine.inspect(REG_P)).toBe(9841);
    emu.step();
    expect(emu.machine.inspect(REG_P)).toBe(-9841);
    expect(emu.machine.inspect(-13)).toBe(1);
    expect(emu.machine.inspect(-12)).toBe(0);
  });
});
