import type { Device } from './devices';
import { DeviceEvents, type DeviceEventState } from './deviceEvents';
import { norm, TRYTE_MAX, TRYTE_MIN } from './tryte';
import { decodeWide, encodeWide, WIDE_MAX, type Wide } from './wide';

import { stateBoolean, stateInteger, stateTrytes } from './stateValidation';

export interface BlockMediumState { blocks: number; readOnly: boolean; data: Int16Array; }

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

  captureState(): BlockMediumState { return {blocks: this.blocks, readOnly: this.readOnly, data: this.image()}; }
  validateState(state: BlockMediumState): void {
    stateBoolean(state.readOnly);
    if (state.blocks !== this.blocks || state.readOnly !== this.readOnly) throw new Error('snapshot medium geometry mismatch');
    stateTrytes(state.data, this.data.length);
  }
  /** Host restore also restores read-only media, without issuing guest writes. */
  restoreState(state: BlockMediumState): void { this.validateState(state); this.data.set(state.data); }

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

export interface BlockDeviceState {
  externalClock: boolean;
  media: (number | null)[];
  generations: number[];
  changed: DeviceEventState[];
  events: DeviceEventState;
  buffer: Int16Array;
  selected: number; address: number; cursor: number;
  result: number; completion: number; completedUnit: number;
  generationLatch: Wide;
  operation: Operation | undefined;
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
  constructor(initial: readonly (BlockMedium | undefined)[] = [new BlockMedium()], readonly externalClock = false,
    private readonly operationChanged?: () => void) {
    if (initial.length > 27) throw new RangeError('too many block units');
    initial.forEach((medium, unit) => { this.media[unit] = medium; });
  }

  /** A world-wide pool preserves shared media identity across units/controllers. */
  attachedMedia(): readonly (BlockMedium | undefined)[] { return this.media.slice(); }
  captureState(pool: readonly BlockMedium[]): BlockDeviceState {
    const media = this.media.map(medium => {
      if (!medium) return null;
      const id = pool.indexOf(medium);
      if (id < 0) throw new Error('snapshot medium missing from pool');
      return id;
    });
    return {externalClock: this.externalClock, media, generations: [...this.generations],
      changed: this.changed.map(event => event.captureState()), events: this.events.captureState(),
      buffer: this.buffer.slice(), selected: this.selected, address: this.address, cursor: this.cursor,
      result: this.result, completion: this.completion, completedUnit: this.completedUnit,
      generationLatch: [...this.generationLatch],
      operation: this.operation && {...this.operation, data: this.operation.data?.slice()}};
  }
  validateState(state: BlockDeviceState, pool: readonly BlockMedium[]): void {
    if (state.externalClock !== this.externalClock) throw new Error('snapshot disk clock mismatch');
    if (!Array.isArray(state.media) || state.media.length !== 27 ||
        !Array.isArray(state.generations) || state.generations.length !== 27 ||
        !Array.isArray(state.changed) || state.changed.length !== 3) throw new Error('snapshot disk unit count');
    for (const id of state.media) if (id !== null) {
      stateInteger(id, 0, pool.length - 1);
      if (!(pool[id] instanceof BlockMedium)) throw new Error('snapshot medium missing from pool');
    }
    for (const generation of state.generations) stateInteger(generation, 0, WIDE_MAX);
    for (const event of state.changed) new DeviceEvents(9).restoreState(event);
    new DeviceEvents(2).restoreState(state.events);
    stateTrytes(state.buffer, BLOCK_SIZE);
    stateInteger(state.selected, 0, 26); stateInteger(state.address, TRYTE_MIN, TRYTE_MAX);
    stateInteger(state.cursor, 0, BLOCK_SIZE - 1); stateInteger(state.result, -5, 0);
    if (state.completion !== 0 && state.completion !== -2) throw new Error('snapshot disk completion');
    stateInteger(state.completedUnit, -1, 26);
    stateTrytes(state.generationLatch, 3); decodeWide(state.generationLatch);
    const op = state.operation;
    if (op !== undefined) {
      stateInteger(op.command, 1, 3); stateInteger(op.unit, 0, 26);
      stateInteger(op.remaining, 1, op.command === 3 ? BLOCK_FLUSH_CYCLES : BLOCK_IO_CYCLES);
      const id = state.media[op.unit], medium = id === null ? undefined : pool[id!];
      if (!medium || op.unit !== state.selected || op.generation !== state.generations[op.unit] ||
          op.block !== state.address) throw new Error('snapshot disk operation mismatch');
      stateInteger(op.block, op.command === 3 ? TRYTE_MIN : 0, op.command === 3 ? TRYTE_MAX : medium.blocks - 1);
      if (op.command === 2) {
        if (medium.readOnly) throw new Error('snapshot write to read-only medium');
        stateTrytes(op.data!, BLOCK_SIZE);
      } else if (op.data !== undefined) throw new Error('snapshot unexpected operation data');
    }
  }
  restoreState(state: BlockDeviceState, pool: readonly BlockMedium[]): void {
    this.validateState(state, pool);
    state.media.forEach((id, unit) => { this.media[unit] = id === null ? undefined : pool[id]; });
    state.generations.forEach((generation, unit) => { this.generations[unit] = generation; });
    state.changed.forEach((event, index) => this.changed[index]!.restoreState(event));
    this.events.restoreState(state.events); this.buffer.set(state.buffer);
    this.selected = state.selected; this.address = state.address; this.cursor = state.cursor;
    this.result = state.result; this.completion = state.completion; this.completedUnit = state.completedUnit;
    this.generationLatch = [...state.generationLatch];
    this.setOperation(state.operation && {...state.operation, data: state.operation.data?.slice()});
  }

  private setOperation(operation: Operation | undefined): void {
    this.operation = operation;
    this.operationChanged?.();
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
    this.setOperation(undefined);
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
    this.setOperation({
      command, unit: this.selected, generation: this.generations[this.selected]!, block: this.address,
      remaining: command === 3 ? BLOCK_FLUSH_CYCLES : BLOCK_IO_CYCLES,
      data: command === 2 ? this.buffer.slice() : undefined,
    });
  }

  private finish(result: number): void {
    this.completedUnit = this.operation!.unit;
    this.completion = result;
    this.setOperation(undefined);
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
