import type { Device } from './devices';
import { decodeText, encodeText } from './textEncoding';

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
  private output: number[] = [];
  private unlocked = false;

  reset(): void {
    this.input = [];
    this.output = [];
    this.unlocked = false;
  }

  queueText(s: string): void {
    this.input.push(...encodeText(s));
  }

  queueTrytes(values: Iterable<number>): void {
    this.input.push(...values);
  }

  outputTrytes(): readonly number[] {
    return this.output;
  }

  outputText(): string {
    return decodeText(this.output);
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  hasActivity(): boolean {
    return this.input.length > 0 || this.output.length > 0 || this.unlocked;
  }

  read(reg: number, backing: number): number {
    if (reg === OFF_RX) return this.input.shift() ?? 0;
    return this.inspect(reg, backing);
  }

  inspect(reg: number, backing: number): number {
    if (reg === OFF_STATUS) return TX_READY + (this.input.length > 0 ? RX_READY : 0);
    if (reg === OFF_RX) return this.input[0] ?? 0;
    if (reg === OFF_UNLOCK) return this.unlocked ? 1 : 0;
    return backing;
  }

  write(reg: number, v: number): boolean {
    if (reg === OFF_TX) {
      this.output.push(v);
      return true;
    }
    if (reg === OFF_CONTROL) {
      if (v === 0) this.reset();
      return true;
    }
    if (reg === OFF_UNLOCK) {
      this.unlocked = v !== 0;
      return true;
    }
    return false;
  }
}

export { OFF_CONTROL, OFF_RX, OFF_STATUS, OFF_TX, OFF_UNLOCK };
