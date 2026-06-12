// Bridges the Machine to the UI: owns the run loop, breakpoints, speed, and
// a tiny external-store subscription so Preact components re-render off a
// generation counter while reading the mutable machine directly.

import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_ORG, type AssembleResult } from '../asm/assemble';

type LoadedProgram = { result: AssembleResult };
import { Machine, REG_P, REG_S } from '../core/machine';
import { CLOCK_HZ, fromTribbles } from '../core/tryte';

export class EmulatorController {
  readonly machine = new Machine();
  readonly breakpoints = new Set<number>();
  /** Emulated cycles per wall-clock second. */
  speed = CLOCK_HZ;
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
      const r = this.machine.run(cycles, this.breakpoints);
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
      } else if (r === 'sleep-forever') {
        this.running = false;
        this.status = 'sleeping';
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
    cancelAnimationFrame(this.rafId);
    this.notify();
  }

  step(): void {
    this.machine.step();
    this.status = 'stepped';
    this.notify();
  }

  reset(): void {
    this.pause();
    this.machine.reset();
    this.initRegs();
    if (this.lastLoaded) {
      const { result } = this.lastLoaded;
      for (const c of result.chunks) c.data.forEach((v, i) => this.machine.poke(c.addr + i, v));
      this.machine.poke(REG_P, result.chunks[0]?.addr ?? DEFAULT_ORG);
      this.labels = result.labels;
    }
    this.status = 'reset';
    this.notify();
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
    for (const c of result.chunks) c.data.forEach((v, i) => this.machine.poke(c.addr + i, v));
    this.initRegs();
    this.machine.poke(REG_P, result.chunks[0]?.addr ?? DEFAULT_ORG);
    this.labels = result.labels;
    this.lastLoaded = { result };
    this.status = 'loaded';
    this.notify();
  }
}

/** Re-render the calling component whenever the emulator state advances. */
export function useEmulator(emu: EmulatorController): number {
  const [, setV] = useState(0);
  useEffect(() => emu.subscribe(() => setV((x) => x + 1)), [emu]);
  return emu.getVersion();
}
