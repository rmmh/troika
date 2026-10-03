// Bridges the Machine to the UI: owns the run loop, breakpoints, speed, and
// a tiny external-store subscription so Preact components re-render off a
// generation counter while reading the mutable machine directly.

import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_ORG, type AssembleResult } from '../asm/assemble';

type LoadedProgram = { result: AssembleResult };
import { Machine, REG_P, REG_S, VEC_IRQ_BASE } from '../core/machine';
import { DisplayDevice } from '../core/displayDevice';
import { SoundDevice } from '../core/soundDevice';
import { TextDevice } from '../core/textDevice';
import { CLOCK_HZ, fromTribbles, tritsRaw } from '../core/tryte';
import { AudioOutput } from './audioOutput';

export class EmulatorController {
  readonly machine = new Machine();
  readonly displayDevice: DisplayDevice;
  readonly soundDevice: SoundDevice;
  readonly textDevice = new TextDevice();
  readonly audioOutput = new AudioOutput();
  readonly breakpoints = new Set<number>();
  readonly profileCycles = new Map<number, number>();
  /** Emulated cycles per wall-clock second. */
  speed = CLOCK_HZ;
  profiling = false;
  profileTotalCycles = 0;
  running = false;
  /** Inspector selection (memory address) or null. */
  selected: number | null = null;
  private _status = 'ready';
  labels = new Map<string, number>();

  get status(): string {
    const sleep = this.machine.sleep;
    if (sleep) {
      if (sleep.remaining === Infinity) {
        return 'sleeping';
      }
      const sec = sleep.remaining / CLOCK_HZ;
      return `sleeping (${sec.toFixed(3)}s remaining)`;
    }
    return this._status;
  }

  set status(val: string) {
    this._status = val;
  }
  private lastLoaded: LoadedProgram | null = null;

  private version = 0;
  private listeners = new Set<() => void>();
  private rafId = 0;
  private lastTime = 0;
  private lastRender = 0;
  private cyclesPerFrame = 1000;
  /** Measured frames per second (UI renders, not emulated). */
  fps = 0;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor() {
    this.displayDevice = new DisplayDevice(
      (addr) => this.machine.peek(addr),
      (addr, v) => this.machine.poke(addr, v),
    );
    this.soundDevice = new SoundDevice(
      (addr) => this.machine.peek(addr),
      (addr, v) => this.machine.poke(addr, v),
    );
    this.machine.attach(this.displayDevice);
    this.machine.attach(this.soundDevice);
    this.machine.attach(this.textDevice);
    this.initRegs();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  getVersion(): number {
    return this.version;
  }

  notify(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  private initRegs(): void {
    this.machine.poke(REG_P, DEFAULT_ORG);
    this.machine.poke(REG_S, fromTribbles('_ZZ'));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.status = 'running';
    this.audioOutput.start(this.soundDevice);
    this.lastTime = performance.now();
    this.lastRender = this.lastTime;
    this.fpsTime = this.lastTime;
    this.fpsFrames = 0;
    const frame = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(t - this.lastTime, 100); // clamp after tab-out
      this.lastTime = t;

      // Compute how many cycles we want to run this frame based on speed setting
      const targetCycles = Math.max(1, Math.round((this.speed * dt) / 1000));
      // But cap by cyclesPerFrame (adaptive budget to keep run() under ~8ms)
      const cycles = Math.min(targetCycles, Math.max(1, this.cyclesPerFrame));

      const wallStart = performance.now();
      const r = this.machine.run(
        cycles,
        this.breakpoints,
        this.profiling ? (pc, dcycles) => this.recordProfile(pc, dcycles) : undefined,
      );
      const wallMs = performance.now() - wallStart;

      // Adjust cyclesPerFrame to target ~8ms of CPU time per frame
      const ratio = 8 / Math.max(wallMs, 0.1);
      const adjusted = cycles * ratio;
      // Smooth exponential moving average; also respect speed ceiling
      const maxCycles = Math.max(1, Math.round(this.speed / 30));
      this.cyclesPerFrame = Math.round(
        Math.min(maxCycles, Math.max(1, this.cyclesPerFrame * 0.85 + adjusted * 0.15)),
      );

      if (r === 'breakpoint') {
        this.running = false;
        this.status = 'hit breakpoint';
        this.audioOutput.pause();
      } else if (r === 'sleep-forever' && !hasPendingWakeup(this.machine)) {
        this.running = false;
        this.status = 'sleeping';
        this.audioOutput.pause();
      } else if (this.running) {
        this.rafId = requestAnimationFrame(frame);
      }

      // Cap UI renders at ~60fps
      if (t - this.lastRender >= 16 || !this.running) {
        this.lastRender = t;
        this.fpsFrames++;
        const fpsElapsed = t - this.fpsTime;
        if (fpsElapsed >= 500) {
          this.fps = Math.round((this.fpsFrames * 1000) / fpsElapsed);
          this.fpsFrames = 0;
          this.fpsTime = t;
        }
        this.notify();
      }
    };
    this.rafId = requestAnimationFrame(frame);
    this.notify();
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.status = 'paused';
    this.audioOutput.pause();
    cancelAnimationFrame(this.rafId);
    this.notify();
  }

  step(): void {
    const pc = this.machine.read(REG_P);
    const before = this.machine.cycles;
    this.machine.step();
    if (this.profiling) this.recordProfile(pc, this.machine.cycles - before);
    this.status = 'stepped';
    this.notify();
  }

  reset(): void {
    this.pause();
    this.machine.reset();
    this.displayDevice.reset();
    this.soundDevice.reset();
    this.audioOutput.reset();
    this.textDevice.reset();
    this.initRegs();
    if (this.lastLoaded) {
      const { result } = this.lastLoaded;
      for (const c of result.chunks) c.data.forEach((v, i) => this.machine.poke(c.addr + i, v));
      this.machine.poke(REG_P, result.chunks[0]?.addr ?? DEFAULT_ORG);
      this.labels = result.labels;
    }
    this.status = 'reset';
    this.clearProfile();
    this.notify();
  }

  toggleProfiling(): void {
    this.profiling = !this.profiling;
    this.notify();
  }

  private recordProfile(pc: number, dcycles: number): void {
    if (dcycles <= 0) return;
    this.profileCycles.set(pc, (this.profileCycles.get(pc) ?? 0) + dcycles);
    this.profileTotalCycles += dcycles;
  }

  private clearProfile(): void {
    this.profiling = false;
    this.profileCycles.clear();
    this.profileTotalCycles = 0;
  }

  toggleBreakpoint(addr: number): void {
    if (this.breakpoints.has(addr)) this.breakpoints.delete(addr);
    else this.breakpoints.add(addr);
    this.notify();
  }

  select(addr: number | null): void {
    this.selected = addr;
    this.notify();
  }

  /** Load an assembly result: clears memory, writes chunks, points PC at the program. */
  load(result: AssembleResult): void {
    this.pause();
    this.machine.reset();
    this.soundDevice.reset();
    this.audioOutput.reset();
    this.textDevice.reset();
    this.clearProfile();
    for (const c of result.chunks) c.data.forEach((v, i) => this.machine.poke(c.addr + i, v));
    this.initRegs();
    this.machine.poke(REG_P, result.chunks[0]?.addr ?? DEFAULT_ORG);
    this.labels = result.labels;
    this.lastLoaded = { result };
    this.status = 'loaded';
    this.notify();
  }
}

/**
 * True when the machine's sleep has at least one unmasked interrupt line
 * with a handler installed — meaning something can actually wake it.
 */
function hasPendingWakeup(machine: Machine): boolean {
  const mask = tritsRaw(machine.intMask);
  for (let line = 0; line < 9; line++) {
    if (mask[line]! !== 0 && machine.peek(VEC_IRQ_BASE + line) !== 0) return true;
  }
  return false;
}

/** Re-render the calling component whenever the emulator state advances. */
export function useEmulator(emu: EmulatorController): number {
  const [, setV] = useState(0);
  const version = emu.getVersion();
  useEffect(() => {
    if (emu.getVersion() !== version) {
      setV((x) => x + 1);
    }
    return emu.subscribe(() => setV((x) => x + 1));
  }, [emu, version]);
  return version;
}
