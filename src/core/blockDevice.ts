import type { Device } from './devices';
import { DeviceEvents } from './deviceEvents';
import { norm, TRYTE_MAX, TRYTE_MIN } from './tryte';
import { encodeWide, type Wide } from './wide';

export const BLOCK_SIZE = 243;
export const BLOCK_IO_CYCLES = 6561;
export const BLOCK_FLUSH_CYCLES = 27;
export const BLOCK_DEVICE_ID = -12;
export const BLOCK_IRQ = 5;

/** Explicit peripheral media. The controller never interprets its contents. */
export class BlockMedium {
  private readonly data: Int16Array;
  readonly blocks: number;

  constructor(blocks = 729, readonly readOnly = false, image?: ArrayLike<number>) {
    if (!Number.isInteger(blocks) || blocks < 27 || blocks > 9841) throw new RangeError('block capacity must be 27..9841');
    this.blocks = blocks;
    this.data = new Int16Array(blocks * BLOCK_SIZE);
    if (image) {
      if (image.length !== this.data.length) throw new RangeError('media image size');
      for (let i = 0; i < image.length; i++) {
        const v = image[i]!;
        if (!Number.isInteger(v) || v < TRYTE_MIN || v > TRYTE_MAX) throw new RangeError('media image contains an invalid tryte');
        this.data[i] = v;
      }
    }
  }

  private offset(block: number): number {
    if (!Number.isInteger(block) || block < 0 || block >= this.blocks) throw new RangeError('block address');
    return block * BLOCK_SIZE;
  }
  read(block: number): Int16Array { const offset = this.offset(block); return this.data.slice(offset, offset + BLOCK_SIZE); }
  write(block: number, data: Int16Array): void {
    const offset = this.offset(block);
    if (this.readOnly) throw new Error('read-only medium');
    if (data.length !== BLOCK_SIZE) throw new RangeError('block size');
    for (const v of data) if (v < TRYTE_MIN || v > TRYTE_MAX) throw new RangeError('invalid stored tryte');
    this.data.set(data, offset);
  }
  image(): Int16Array { return this.data.slice(); }
}

interface Operation {
  command: 1 | 2 | 3;
  unit: number;
  generation: number;
  block: number;
  remaining: number;
  data?: Int16Array;
}

/** Selected-unit, atomic-block hardware from specs/storage.txt. */
export class BlockDevice implements Device {
  readonly id = BLOCK_DEVICE_ID;
  private readonly media: (BlockMedium | undefined)[] = Array.from({ length: 27 });
  private readonly generations = new Array<number>(27).fill(0);
  private readonly changed = [new DeviceEvents(9), new DeviceEvents(9), new DeviceEvents(9)];
  private readonly events = new DeviceEvents(2);
  private readonly buffer = new Int16Array(BLOCK_SIZE);
  private selected = 0;
  private address = 0;
  private cursor = 0;
  private result = 0;
  private completion = 0;
  private completedUnit = -1;
  private generationLatch: Wide = [0, 0, 0];
  private operation: Operation | undefined;

  /** In a world, only the coordinator advances hardware time. */
  constructor(initial: readonly (BlockMedium | undefined)[] = [new BlockMedium()], readonly externalClock = false) {
    if (initial.length > 27) throw new RangeError('too many block units');
    initial.forEach((medium, unit) => { this.media[unit] = medium; });
  }

  /** Scenario hotplug, not guest filesystem access. Replacement is remove+insert. */
  setMedium(unit: number, medium?: BlockMedium): void {
    if (!Number.isInteger(unit) || unit < 0 || unit > 26) throw new RangeError('block unit');
    if (this.media[unit] === medium) return;
    const changes = Number(!!this.media[unit]) + Number(!!medium);
    encodeWide(this.generations[unit]! + changes); // fail before mutating on exhaustion
    if (this.media[unit]) {
      this.media[unit] = undefined;
      this.generations[unit]!++;
      if (this.operation?.unit === unit) this.finish(-2);
      this.markChanged(unit);
    }
    if (medium) {
      this.media[unit] = medium;
      this.generations[unit]!++;
      this.markChanged(unit);
    }
  }

  private markChanged(unit: number): void {
    this.changed[Math.floor(unit / 9)]!.raise(unit % 9);
    this.events.raise(1);
  }

  inspect(reg: number): number {
    switch (reg + 13) {
      case 0: return Number(!!this.media[this.selected]);
      case 1: return this.media[this.selected]?.blocks ?? 0;
      case 2: return this.address;
      case 3: return this.cursor;
      case 4: return this.operation ? 0 : this.buffer[this.cursor]!;
      case 6: return Number(!!this.operation);
      case 7: return this.result;
      case 8: return this.completion;
      case 9: return this.events.events;
      case 10: return this.events.enables;
      case 11: return this.selected;
      case 12: case 13: case 14: return this.changed[reg + 1]!.events;
      case 15: return encodeWide(this.generations[this.selected]!)[0];
      case 16: return this.generationLatch[1];
      case 17: return this.generationLatch[2];
      case 18: return this.completedUnit;
      default: return 0;
    }
  }

  read(reg: number): number {
    if (reg + 13 === 15) this.generationLatch = encodeWide(this.generations[this.selected]!);
    const value = this.inspect(reg);
    if (reg + 13 === 4 && !this.operation) this.cursor = (this.cursor + 1) % BLOCK_SIZE;
    return value;
  }

  write(reg: number, value: number): boolean {
    const v = norm(value);
    switch (reg + 13) {
      case 2: if (!this.operation) this.address = v; break;
      case 3: if (!this.operation && v >= 0 && v < BLOCK_SIZE) this.cursor = v; break;
      case 4:
        if (!this.operation) { this.buffer[this.cursor] = v; this.cursor = (this.cursor + 1) % BLOCK_SIZE; }
        break;
      case 5: this.command(v); break;
      case 9: this.events.clear(v); break;
      case 10: this.events.enable(v); break;
      case 11: if (!this.operation && v >= 0 && v < 27) this.selected = v; break;
      case 12: case 13: case 14: this.changed[reg + 1]!.clear(v); break;
    }
    return true;
  }

  reset(): void {
    this.operation = undefined;
    this.selected = this.address = this.cursor = this.result = this.completion = 0;
    this.completedUnit = -1;
    this.generationLatch = [0, 0, 0];
    this.buffer.fill(0);
    this.events.reset();
    for (const mask of this.changed) mask.reset();
  }

  private command(command: number): void {
    if (command === 0) { this.result = 0; return; }
    if (command === 4) { this.reset(); return; }
    if (command !== 1 && command !== 2 && command !== 3) { this.result = -5; return; }
    if (this.operation) { this.result = -1; return; }
    const medium = this.media[this.selected];
    if (!medium) { this.result = -2; return; }
    if (command !== 3 && (this.address < 0 || this.address >= medium.blocks)) { this.result = -3; return; }
    if (command === 2 && medium.readOnly) { this.result = -4; return; }
    this.result = 0;
    this.operation = {
      command, unit: this.selected, generation: this.generations[this.selected]!, block: this.address,
      remaining: command === 3 ? BLOCK_FLUSH_CYCLES : BLOCK_IO_CYCLES,
      data: command === 2 ? this.buffer.slice() : undefined,
    };
  }

  private finish(result: number): void {
    this.completedUnit = this.operation!.unit;
    this.completion = result;
    this.operation = undefined;
    this.events.raise(0);
  }

  /** The world calls this once per elapsed interval, never once per machine. */
  advance(cycles: number): void {
    if (!Number.isSafeInteger(cycles) || cycles < 0) throw new RangeError('invalid device time');
    const op = this.operation;
    if (!op) return;
    op.remaining -= cycles;
    if (op.remaining > 0) return;
    const medium = this.media[op.unit];
    if (!medium || this.generations[op.unit] !== op.generation) { this.finish(-2); return; }
    if (op.command === 1) { this.buffer.set(medium.read(op.block)); this.cursor = 0; }
    else if (op.command === 2) medium.write(op.block, op.data!);
    this.finish(0);
  }

  tick(cycles: number, irq: (line: number) => void): void {
    if (!this.externalClock) this.advance(cycles);
    this.events.flush(() => irq(BLOCK_IRQ));
  }

  nextEventCycles(): number { return this.externalClock ? Infinity : this.cyclesUntilCompletion(); }
  cyclesUntilCompletion(): number { return this.operation?.remaining ?? Infinity; }
}
