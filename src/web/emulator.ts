// Bridges the Machine to the UI: owns the run loop, breakpoints, speed, and
// a tiny external-store subscription so Preact components re-render off a
// generation counter while reading the mutable machine directly.

import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_ORG, type AssembleResult } from '../asm/assemble';
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
  status = 'ready';
  labels = new Map<string, number>();

  private version = 0;
  private listeners = new Set<() => void>();
  private rafId = 0;
  private lastTime = 0;

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
    const frame = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(t - this.lastTime, 100); // clamp after tab-out
      this.lastTime = t;
      const cycles = Math.max(1, Math.round((this.speed * dt) / 1000));
      const r = this.machine.run(cycles, this.breakpoints);
      if (r === 'breakpoint') {
        this.running = false;
        this.status = 'hit breakpoint';
      } else if (r === 'sleep-forever') {
        this.running = false;
        this.status = 'sleeping (no timer)';
      } else if (this.running) {
        this.rafId = requestAnimationFrame(frame);
      }
      this.notify();
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
