import type { Device } from './devices';
import { decodeChar, encodeChar } from './textEncoding';

const OFF_STATUS = -13; // _PA
const OFF_RX = -12; // _PB
const OFF_TX = -11; // _PC
const OFF_CONTROL = -10; // _PD
const OFF_UNLOCK = -9; // _PE

const TX_READY = 3;
const RX_READY = 1;

export class TextDevice implements Device {
  readonly id = 3; // tribble P: _PA.._PZ

  private input: number[] = [];
  private inputHead = 0;
  private output: number[] = [];
  private outputCache = '';
  private unlocked = false;
  private active = false;

  reset(): void {
    this.clearBuffers();
    this.unlocked = false;
    this.active = false;
  }

  /** Clear the terminal transcript and queued input without resetting hardware. */
  clearBuffers(): void {
    this.input = [];
    this.inputHead = 0;
    this.output = [];
    this.outputCache = '';
  }

  queueText(s: string): void {
    for (const char of s) this.input.push(encodeChar(char));
    if (s.length) this.active = true;
  }

  queueTrytes(values: Iterable<number>): void {
    for (const value of values) {
      this.input.push(value);
      this.active = true;
    }
  }

  outputTrytes(): readonly number[] {
    return this.output;
  }

  outputText(): string {
    return this.outputCache;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  hasActivity(): boolean {
    return this.active;
  }

  read(reg: number, backing: number): number {
    if (reg === OFF_STATUS || reg === OFF_RX || reg === OFF_UNLOCK) this.active = true;
    if (reg === OFF_RX) {
      const value = this.input[this.inputHead] ?? 0;
      if (this.inputHead < this.input.length) this.inputHead++;
      if (this.inputHead === this.input.length) {
        this.input = [];
        this.inputHead = 0;
      } else if (this.inputHead >= 4096 && this.inputHead * 2 >= this.input.length) {
        this.input = this.input.slice(this.inputHead);
        this.inputHead = 0;
      }
      return value;
    }
    return this.inspect(reg, backing);
  }

  inspect(reg: number, backing: number): number {
    if (reg === OFF_STATUS) return TX_READY + (this.inputHead < this.input.length ? RX_READY : 0);
    if (reg === OFF_RX) return this.input[this.inputHead] ?? 0;
    if (reg === OFF_UNLOCK) return this.unlocked ? 1 : 0;
    return backing;
  }

  write(reg: number, v: number): boolean {
    if (reg === OFF_TX) {
      this.active = true;
      this.output.push(v);
      this.outputCache += decodeChar(v);
      return true;
    }
    if (reg === OFF_CONTROL) {
      if (v === 0) this.reset();
      return true;
    }
    if (reg === OFF_UNLOCK) {
      this.active = true;
      this.unlocked = v !== 0;
      return true;
    }
    return false;
  }
}

export { OFF_CONTROL, OFF_RX, OFF_STATUS, OFF_TX, OFF_UNLOCK };
