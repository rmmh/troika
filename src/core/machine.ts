// The Troika machine: 3^9 trytes of memory, registers stored in memory at
// addresses -13..13, all state architecturally visible.

import * as tryte from './tryte';
import { instructionLength } from './decode';
import type { Device } from './devices';
import { stateBoolean, stateInteger, stateTrytes } from './stateValidation';

// These arithmetic definitions are immutable; keep hot CPU accesses local.
const {
  DIGITS,
  MEM_SIZE,
  TRYTE_MAX,
  TRYTE_MIN,
  digitValue,
  fromTribbles,
  norm,
  tribblesOf,
  tritMap,
  tritsRaw,
} = tryte;

export const REG_P = digitValue('P'); // program counter, +3
export const REG_S = digitValue('S'); // conventional stack pointer, +6
export const REG_Z = digitValue('Z'); // always reads zero, +13

export const VEC_DIV0 = fromTribbles('_NA'); // 14: division-by-zero trap
export const VEC_IRQ_BASE = fromTribbles('_NB'); // 15..23: interrupt lines 0..8
export const REG_INT_MASK = fromTribbles('_NM');
export const REG_INT_PENDING = fromTribbles('_NP');
export const REG_INT_SAVED_MASK = fromTribbles('_NY');
export const VEC_RETURN = fromTribbles('_NZ'); // 40: PC saved here on dispatch

// A resolved operand place. Memory/register places are the address itself
// (-9841..9841); immediates are IMM_TAG + value, and writes to them vanish.
const MEM_TAG = 1 << 19;
const MEM_TEST = MEM_TAG - MEM_SIZE;
const IMM_TAG = 1 << 20;
const IMM_TEST = IMM_TAG - MEM_SIZE;

// Instruction words have only 3^9 possible values. Decode by word, not PC, so
// self-modifying code and MMIO fetches retain their normal read semantics.
const instructionTribbles = new Int8Array(MEM_SIZE * 3);
for (let i = 0; i < MEM_SIZE; i++) instructionTribbles.set(tribblesOf(i - TRYTE_MAX), i * 3);

export interface SleepState {
  /** Cycles left to sleep; Infinity for timer 0. */
  remaining: number;
  /** Address of the H instruction (interrupt return target when mask trit is 0). */
  sleepPC: number;
  /** Address after the H instruction (return target for mask trit 1, or timer expiry). */
  wakePC: number;
}

/** CPU state only. World snapshots must also capture the scheduler and every
 * attached peripheral; restoring this alone is not a live-world restore. */
export interface CpuState {
  memory: Int16Array;
  cycles: number;
  sleep: SleepState | null;
  interruptsEnabled: boolean;
  deferredDeviceCycles: number | undefined;
}

export type RunResult = 'cycles' | 'breakpoint' | 'sleep-forever';
export type StepProfile = (pc: number, cycles: number) => void;

/** Balanced division: round to nearest, ties toward zero (Q opcode, F right shifts). */
export function divRound(a: number, b: number): number {
  const sign = Math.sign(a) * Math.sign(b);
  const abs = Math.abs(a);
  const div = Math.abs(b);
  let q = Math.floor(abs / div);
  if (2 * (abs - q * div) > div) q++;
  return norm(sign * q);
}

/** F opcode: shifts ±1..±8, rotate left 9..13 → 1..5, rotate right -9..-12 → 1..4, A=abs. */
export function fShift(v: number, n: number): number {
  if (n === -13) return Math.abs(v); // 'A': absolute value
  if (n >= 1 && n <= 8) return norm(v * 3 ** n);
  if (n <= -1 && n >= -8) return divRound(v, 3 ** -n); // low trits drop: rounds to nearest
  if (n >= 9 || n <= -9) {
    const k = (((n > 0 ? n - 8 : n + 8) % 9) + 9) % 9;
    const u = norm(v) + TRYTE_MAX;
    const split = 3 ** (9 - k);
    return (u % split) * 3 ** k + Math.floor(u / split) - TRYTE_MAX;
  }
  return norm(v); // n === 0: identity
}

export class Machine {
  /** Raw memory, index = address + 9841. Exposed for bulk rendering. */
  readonly mem = new Int16Array(MEM_SIZE);
  cycles = 0;
  sleep: SleepState | null = null;
  private interruptsEnabled = true;
  private deferredDeviceCycles: number | undefined;
  private startingDeferredStep = false;
  private devices = new Map<number, Device>();
  private readonly deviceList: Device[] = [];
  private readonly deviceSlots: number[] = [];
  private readonly deviceInterrupt = (line: number) => this.latchInterrupt(line);

  constructor() {
    this.intMask = TRYTE_MIN;
  }

  /** Live interrupt mask (_NM); trit i governs interrupt line i. */
  get intMask(): number { return this.peek(REG_INT_MASK); }
  set intMask(value: number) { this.poke(REG_INT_MASK, value); }

  reset(): void {
    this.mem.fill(0);
    this.cycles = 0;
    this.sleep = null;
    this.deferredDeviceCycles = undefined;
    this.startingDeferredStep = false;
    this.intMask = TRYTE_MIN;
  }

  /** Call at a host boundary, never from a device callback during execution. */
  captureCpuState(): CpuState {
    if (this.startingDeferredStep) throw new Error('cannot capture an executing instruction');
    return {memory: this.mem.slice(), cycles: this.cycles,
      sleep: this.sleep ? {...this.sleep} : null, interruptsEnabled: this.interruptsEnabled,
      deferredDeviceCycles: this.deferredDeviceCycles};
  }

  /** Does not tick devices, dispatch IRQs, or repeat committed instruction effects. */
  restoreCpuState(state: CpuState): void {
    if (this.startingDeferredStep) throw new Error('cannot restore an executing instruction');
    stateTrytes(state.memory, MEM_SIZE); stateInteger(state.cycles, 0);
    stateBoolean(state.interruptsEnabled);
    if (state.deferredDeviceCycles !== undefined) stateInteger(state.deferredDeviceCycles, 0, state.cycles);
    if (state.sleep !== null) {
      if (state.sleep.remaining !== Infinity) stateInteger(state.sleep.remaining, 0);
      stateInteger(state.sleep.sleepPC, TRYTE_MIN, TRYTE_MAX);
      stateInteger(state.sleep.wakePC, TRYTE_MIN, TRYTE_MAX);
    }
    // Validate the entire record before mutating any live state.
    this.mem.set(state.memory); this.cycles = state.cycles;
    this.sleep = state.sleep ? {...state.sleep} : null;
    this.interruptsEnabled = state.interruptsEnabled;
    this.deferredDeviceCycles = state.deferredDeviceCycles;
  }

  attachedDevices(): readonly Device[] { return this.deviceList.slice(); }

  attach(dev: Device): void {
    if (!Number.isInteger(dev.id) || dev.id === 0 || dev.id === 1 || dev.id < -13 || dev.id > 13) throw new Error(`bad device id ${dev.id}`);
    // Mutate this array in place: callbacks may append devices or replace a
    // not-yet-visited slot during iteration, exactly as with Map.values().
    const index = this.deviceSlots.indexOf(dev.id);
    if (index < 0) { this.deviceSlots.push(dev.id); this.deviceList.push(dev); }
    else this.deviceList[index] = dev;
    this.devices.set(dev.id, dev);
  }

  /** Raw memory access: no Z masking, no MMIO, no cycles. For tooling/UI. */
  peek(addr: number): number {
    return this.mem[norm(addr) + TRYTE_MAX]!;
  }

  poke(addr: number, v: number): void {
    this.mem[norm(addr) + TRYTE_MAX] = norm(v);
  }

  /** Architectural read (Z reads 0, MMIO honored); does not consume cycles. */
  read(addr: number): number {
    return this.readMemory(addr, false);
  }

  /** Side-effect-free architectural view for debuggers (including live MMIO). */
  inspect(addr: number): number {
    return this.readMemory(addr, true);
  }

  private readMemory(addr: number, inspect: boolean): number {
    addr = norm(addr);
    if (addr === REG_Z) return 0;
    if (this.devices.size && addr >= -364 && addr <= 364 && (addr > 13 || addr < -13)) {
      const mid = Math.round(addr / 27);
      const dev = this.devices.get(mid);
      const read = inspect ? dev?.inspect : dev?.read;
      if (read) return norm(read.call(dev, addr - mid * 27, this.mem[addr + TRYTE_MAX]!));
    }
    return this.mem[addr + TRYTE_MAX]!;
  }

  /** Architectural write; does not consume cycles. */
  write(addr: number, v: number): void {
    addr = norm(addr);
    v = norm(v);
    if (this.devices.size && addr >= -364 && addr <= 364 && (addr > 13 || addr < -13)) {
      const mid = Math.round(addr / 27);
      const dev = this.devices.get(mid);
      if (dev?.write?.(addr - mid * 27, v)) return;
    }
    this.mem[addr + TRYTE_MAX] = v;
  }

  /** Load whitespace-insensitive tribble text; validates before changing memory. */
  loadTribbles(data: string, at: number | string = '_AA'): number {
    if (typeof at === 'number' && !Number.isSafeInteger(at)) throw new Error('load address must be an exact integer');
    let addr = typeof at === 'string' ? fromTribbles(at) : norm(at);
    const compact = data.replace(/\s+/g, '');
    if (!/^[A-Za-z_]*$/.test(compact)) throw new Error('tribble data may only contain A-Z, _, and whitespace');
    const clean = compact.toUpperCase();
    if (clean.length % 3 !== 0) throw new Error('tribble data length must be a multiple of 3');
    for (let i = 0; i < clean.length; i += 3) {
      this.poke(addr, fromTribbles(clean.slice(i, i + 3)));
      addr = norm(addr + 1);
    }
    return clean.length / 3;
  }

  // --- cycle-charged accessors used during execution ---

  private regRead(idx: number): number {
    return idx === REG_Z ? 0 : this.mem[idx + TRYTE_MAX]!;
  }

  private regWrite(idx: number, v: number): void {
    this.mem[idx + TRYTE_MAX] = norm(v);
  }

  private readData(addr: number): number {
    this.cycles++;
    return this.read(norm(addr));
  }

  private writeData(addr: number, v: number): void {
    this.cycles++;
    addr = norm(addr);
    this.write(addr, v);
  }

  /** Read the tryte at PC and advance PC. Always 1 cycle. */
  private fetch(): number {
    const pc = this.regRead(REG_P);
    this.cycles++;
    this.regWrite(REG_P, pc + 1);
    return this.read(pc);
  }

  /** Resolve one operand slot to a place, consuming operand trytes in order. */
  private resolveSlot(t: number): number {
    if (t === 0) return IMM_TAG + this.fetch(); // '_' immediate
    if (t === -1) return MEM_TAG + norm(this.fetch()); // 'M' memory
    if (t === 2) {
      // 'O' offset: next tryte is register + 2-tribble displacement
      const [r, m, l] = tribblesOf(this.fetch());
      return MEM_TAG + norm(this.regRead(r) + m * 27 + l);
    }
    return t; // register: tribble value is its memory address
  }

  private readPlace(p: number): number {
    if (p >= IMM_TEST) return p - IMM_TAG;
    if (p >= MEM_TEST) return this.readData(p - MEM_TAG);
    return this.regRead(p);
  }

  private writePlace(p: number, v: number): void {
    if (p >= IMM_TEST) return;
    if (p >= MEM_TEST) this.writeData(p - MEM_TAG, v);
    else this.regWrite(p, v);
  }

  /** Save PC to _NZ and jump through a vector (traps and interrupts). */
  private dispatch(vector: number, returnPC: number): void {
    // Controller latches do not issue CPU bus accesses. Vector fetch and the
    // saved return-PC write retain their two memory-cycle cost.
    this.poke(REG_INT_SAVED_MASK, this.intMask);
    this.intMask = TRYTE_MIN;
    this.writeData(VEC_RETURN, returnPC);
    this.regWrite(REG_P, this.readData(vector));
  }

  /**
   * Signal hardware interrupt line 0..8. The live _NM mask trit selects:
   * T = latched only; 0 = handle, then resume the H sleep (handler returns to the H
   * instruction itself); 1 = handle and wake (handler returns past the H).
   * Called between instructions; returns whether an enabled pending line was
   * dispatched. Device tick callbacks latch events until the shared boundary.
   */
  raiseInterrupt(line: number): boolean {
    this.latchInterrupt(line);
    if (this.deferredDeviceCycles !== undefined) return false;
    const before = this.cycles;
    const taken = this.dispatchPending();
    if (taken) this.tickDevices(this.cycles - before);
    return taken;
  }

  private latchInterrupt(line: number): void {
    if (!Number.isInteger(line) || line < 0 || line > 8) throw new Error(`bad interrupt line ${line}`);
    const place = 3 ** (8 - line);
    const pending = this.peek(REG_INT_PENDING);
    const trit = Math.floor((pending + TRYTE_MAX) / place) % 3 - 1;
    this.poke(REG_INT_PENDING, pending + (1 - trit) * place);
  }

  private dispatchPending(): boolean {
    if (!this.interruptsEnabled || this.intMask === TRYTE_MIN) return false;
    const pendingValue = this.peek(REG_INT_PENDING);
    if (pendingValue === 0) return false;
    const mask = tritsRaw(this.intMask);
    const pending = tritsRaw(pendingValue);
    const line = pending.findIndex((trit, i) => trit === 2 && mask[i] !== 0);
    if (line < 0) return false;
    this.poke(REG_INT_PENDING, pendingValue - 3 ** (8 - line));
    const trit = mask[line]! - 1;
    let ret: number;
    if (this.sleep) {
      ret = trit === 1 ? this.sleep.wakePC : this.sleep.sleepPC;
      this.sleep = null;
    } else {
      ret = this.regRead(REG_P);
    }
    this.dispatch(VEC_IRQ_BASE + line, ret);
    return true;
  }

  /**
   * Advance sleep time, stopping at the first device event boundary so an
   * interrupt raised there hands control back to the CPU before the next one.
   * Without this cap a single batched tick would coalesce many scanline
   * events before their handler can run and re-arm its mask.
   */
  private tickSleep(maxCycles: number): void {
    const s = this.sleep!;
    let n = Math.min(maxCycles, s.remaining === Infinity ? maxCycles : s.remaining);
    for (const dev of this.deviceList) {
      const ne = dev.nextEventCycles?.();
      if (ne !== undefined && ne > 0 && ne < n) n = ne;
    }
    this.cycles += n;
    this.tickDevices(n);
    if (this.sleep !== s) return; // an interrupt was taken; the sleep already ended
    if (s.remaining !== Infinity) {
      s.remaining -= n;
      if (s.remaining <= 0) {
        this.regWrite(REG_P, s.wakePC);
        this.sleep = null;
      }
    }
  }

  /** Devices share the CPU clock, including memory cycles spent entering IRQs. */
  private tickDevices(cycles: number): void {
    if (this.deferredDeviceCycles !== undefined) {
      this.deferredDeviceCycles += cycles;
      return;
    }
    for (const dev of this.deviceList) dev.tick?.(cycles, this.deviceInterrupt);
    // Collect all events at this instruction/event boundary before choosing
    // the lowest enabled line, independent of device attachment order.
    const before = this.cycles;
    if (this.dispatchPending()) {
      const entryCycles = this.cycles - before;
      for (const dev of this.deviceList) dev.tick?.(entryCycles, this.deviceInterrupt);
    }
  }

  /** Execute one instruction (or one cycle of sleep). */
  step(): void {
    if (this.deferredDeviceCycles !== undefined && !this.startingDeferredStep) throw new Error('world instruction is still in flight');
    if (this.sleep) {
      this.tickSleep(1);
      return;
    }
    const startPC = this.regRead(REG_P);
    const startCycles = this.cycles;
    const decoded = (this.fetch() + TRYTE_MAX) * 3;
    const op = instructionTribbles[decoded]!;
    const hi = instructionTribbles[decoded + 1]!;
    const lo = instructionTribbles[decoded + 2]!;
    const opC = DIGITS[op + 13]!;
    switch (opC) {
      case '_': // NOP
        break;

      case 'M':
      case 'A':
      case 'S':
      case 'Z':
      case 'P':
      case 'Q':
      case 'B':
      case 'Y': {
        const dst = this.resolveSlot(hi);
        const b = this.readPlace(this.resolveSlot(lo));
        if (opC === 'M') {
          this.writePlace(dst, b);
        } else if (opC === 'Q') {
          this.cycles += 8;
          if (b === 0) {
            this.dispatch(VEC_DIV0, this.regRead(REG_P));
          } else {
            this.writePlace(dst, divRound(this.readPlace(dst), b));
          }
        } else {
          const a = this.readPlace(dst);
          let r: number;
          if (opC === 'A') r = a + b;
          else if (opC === 'S') r = a - b;
          else if (opC === 'Z') r = b - a;
          else if (opC === 'P') r = a * b;
          else if (opC === 'B') r = tritMap(a, b, AND_TABLE);
          else r = tritMap(a, b, OR_TABLE);
          this.writePlace(dst, norm(r));
        }
        break;
      }

      case 'X': {
        const pa = this.resolveSlot(hi);
        const pb = this.resolveSlot(lo);
        const a = this.readPlace(pa);
        const b = this.readPlace(pb);
        this.writePlace(pa, b);
        this.writePlace(pb, a);
        break;
      }

      case 'T': {
        const dst = this.resolveSlot(hi);
        const b = this.readPlace(this.resolveSlot(lo));
        const table = tritsRaw(this.fetch());
        this.writePlace(dst, tritMap(this.readPlace(dst), b, table));
        break;
      }

      case 'R': {
        const dst = this.resolveSlot(hi);
        const addr = this.readPlace(this.resolveSlot(lo));
        this.writePlace(dst, this.readData(addr));
        break;
      }

      case 'W': {
        const addr = this.readPlace(this.resolveSlot(hi));
        const v = this.readPlace(this.resolveSlot(lo));
        this.writeData(addr, v);
        break;
      }

      case 'U': {
        const spP = this.resolveSlot(hi);
        const v = this.readPlace(this.resolveSlot(lo));
        const sp = norm(this.readPlace(spP) - 1);
        this.writePlace(spP, sp);
        this.writeData(sp, v);
        break;
      }

      case 'O': {
        const spP = this.resolveSlot(hi);
        const dst = this.resolveSlot(lo);
        const sp = this.readPlace(spP);
        this.writePlace(dst, this.readData(sp));
        this.writePlace(spP, norm(sp + 1));
        break;
      }

      case 'C': {
        const spP = this.resolveSlot(hi);
        const target = this.readPlace(this.resolveSlot(lo));
        const sp = norm(this.readPlace(spP) - 1);
        this.writePlace(spP, sp);
        this.writeData(sp, this.regRead(REG_P));
        this.regWrite(REG_P, target);
        break;
      }

      case 'D': {
        // Operands are register designators; '_' uses register _ without incrementing.
        const dst = this.regRead(hi);
        const src = this.regRead(lo);
        this.writeData(dst, this.readData(src));
        if (hi !== 0) this.regWrite(hi, dst + 1);
        if (lo !== 0) this.regWrite(lo, src + 1);
        break;
      }

      case 'K': {
        const start = this.readPlace(this.resolveSlot(hi));
        const count = this.readPlace(this.resolveSlot(lo));
        for (let i = 0; i < count; i++) this.writeData(start + i, 0);
        break;
      }

      case 'H': {
        this.intMask = this.readPlace(this.resolveSlot(hi));
        const timer = this.readPlace(this.resolveSlot(lo));
        this.sleep = {
          remaining: timer === 0 ? Infinity : timer > 0 ? timer : 9841 * -timer,
          sleepPC: startPC,
          wakePC: this.regRead(REG_P),
        };
        break;
      }

      case 'G':
      case 'L':
      case 'E':
      case 'N': {
        const a = this.readPlace(this.resolveSlot(hi));
        const b = this.readPlace(this.resolveSlot(lo));
        const taken =
          opC === 'G' ? a >= b : opC === 'L' ? a < b : opC === 'E' ? a === b : a !== b;
        if (!taken) {
          // Skip the entire following instruction, 1 cycle per skipped tryte.
          const pc = this.regRead(REG_P);
          const len = instructionLength((x) => this.read(x), pc);
          this.regWrite(REG_P, pc + len);
          this.cycles += len;
        }
        break;
      }

      case 'V':
      case 'I':
      case 'F': {
        const dst = this.resolveSlot(hi);
        if (opC === 'V') this.writePlace(dst, lo);
        else if (opC === 'I') this.writePlace(dst, norm(this.readPlace(dst) + lo));
        else this.writePlace(dst, fShift(this.readPlace(dst), lo));
        break;
      }

      case 'J': {
        this.regWrite(REG_P, this.regRead(REG_P) + hi * 27 + lo);
        break;
      }
    }

    this.tickDevices(this.cycles - startCycles);
  }

  private previewStepAt(addr: number): { cycles: number; nextPC: number } {
    const probe = new Machine();
    probe.mem.set(this.mem);
    for (const id of this.devices.keys()) {
      for (let reg = -13; reg <= 13; reg++) {
        const address = id * 27 + reg;
        probe.poke(address, this.inspect(address));
      }
    }
    probe.poke(REG_P, addr);
    probe.intMask = this.intMask;
    // Instruction timing excludes asynchronous hardware interrupt entry.
    probe.interruptsEnabled = false;
    probe.step();
    return { cycles: probe.cycles, nextPC: probe.read(REG_P) };
  }

  /**
   * Preview how many cycles the instruction at addr would consume if stepped
   * by the interpreter from the current machine state. This runs on a scratch
   * copy and does not mutate the machine.
   */
  previewCyclesAt(addr: number): number {
    return this.previewStepAt(addr).cycles;
  }

  /**
   * Cycle bounds for the instruction at addr. Ordinary instructions are exact;
   * predicates report the current-path cost and the false-path cost.
   */
  cycleBoundsAt(addr: number): { min: number; max: number } {
    const preview = this.previewStepAt(addr);
    const [op] = tribblesOf(this.inspect(addr));
    const opC = DIGITS[op + 13]!;
    if (opC !== 'G' && opC !== 'L' && opC !== 'E' && opC !== 'N') {
      return { min: preview.cycles, max: preview.cycles };
    }

    const curLen = instructionLength((x) => this.inspect(x), addr);
    const nextAddr = norm(addr + curLen);
    const skipLen = instructionLength((x) => this.inspect(x), nextAddr);
    const base = preview.nextPC === nextAddr ? preview.cycles : preview.cycles - skipLen;
    return { min: base, max: base + skipLen };
  }

  /**
   * Run for up to maxCycles emulated cycles. Stops early at a breakpoint
   * (checked against PC after each instruction or wakeup) or a timerless sleep.
   */
  run(maxCycles: number, breakpoints?: ReadonlySet<number>, onStep?: StepProfile): RunResult {
    if (this.deferredDeviceCycles !== undefined) throw new Error('world instruction is still in flight');
    const end = this.cycles + maxCycles;
    while (this.cycles < end) {
      if (this.sleep) {
        // Advance one device-event boundary at a time so each per-scanline
        // interrupt is dispatched and its handler runs (it may re-arm with H).
        this.tickSleep(end - this.cycles);
        if (!this.sleep && breakpoints?.has(this.regRead(REG_P))) return 'breakpoint';
        continue;
      }
      const pc = this.regRead(REG_P);
      const before = this.cycles;
      this.step();
      onStep?.(pc, this.cycles - before);
      if (breakpoints?.has(this.regRead(REG_P))) return 'breakpoint';
    }
    // Out of budget: report a stuck timerless sleep so the UI can idle.
    return this.sleep && this.sleep.remaining === Infinity ? 'sleep-forever' : 'cycles';
  }

  /** World scheduler: commit one atomic instruction, defer devices/IRQ until its completion time. */
  startWorldInstruction(): number {
    if (this.sleep || this.deferredDeviceCycles !== undefined) throw new Error('CPU is not ready for a world instruction');
    const before = this.cycles;
    this.deferredDeviceCycles = 0;
    this.startingDeferredStep = true;
    try { this.step(); } finally { this.startingDeferredStep = false; }
    return this.cycles - before;
  }

  /** Complete the reserved instruction interval; return extra IRQ-entry cycles. */
  finishWorldInstruction(): number {
    if (this.deferredDeviceCycles === undefined) throw new Error('no world instruction to complete');
    const elapsed = this.deferredDeviceCycles;
    this.deferredDeviceCycles = undefined;
    const before = this.cycles;
    this.tickDevices(elapsed);
    return this.cycles - before;
  }

  /** Poll externally clocked device events at a CPU boundary, before another instruction. */
  pollWorldBoundary(): number {
    if (this.deferredDeviceCycles !== undefined) throw new Error('cannot poll an in-flight instruction');
    const before = this.cycles;
    this.tickDevices(0);
    return this.cycles - before;
  }

  cyclesUntilSleepEvent(): number {
    if (!this.sleep) return 0;
    let cycles = this.sleep.remaining;
    for (const dev of this.deviceList) cycles = Math.min(cycles, dev.nextEventCycles?.() ?? Infinity);
    return Math.max(1, cycles);
  }

  /** Advance a world-scheduled sleep boundary without running handler instructions. */
  finishWorldSleep(cycles: number): number {
    if (!this.sleep || this.deferredDeviceCycles !== undefined || !Number.isSafeInteger(cycles) || cycles < 0) throw new Error('invalid world sleep boundary');
    const before = this.cycles;
    if (cycles) this.tickSleep(cycles);
    else this.tickDevices(0);
    return this.cycles - before;
  }
}

// Tritwise truth tables (index a*3+b, unbalanced digits 0|1|2).
const AND_TABLE = [0, 0, 0, 0, 1, 1, 0, 1, 2]; // min
const OR_TABLE = [0, 1, 2, 1, 1, 2, 2, 2, 2]; // max
