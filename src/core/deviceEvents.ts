import { tritsRaw } from './tryte';

/** Sticky, MSB-first device events; CPU interrupt state is independent. */
export class DeviceEvents {
  private sticky = 0;
  private enabled = 0;
  private pending = false;

  constructor(private readonly count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 9) throw new RangeError('event count');
  }

  private mask(value: number, enabledOnly: boolean): number {
    const trits = tritsRaw(value);
    let mask = 0;
    for (let i = 0; i < this.count; i++) {
      if (enabledOnly ? trits[i] === 2 : trits[i] !== 1) mask |= 1 << i;
    }
    return mask;
  }

  private encode(mask: number): number {
    let value = 0;
    for (let i = 0; i < this.count; i++) if (mask & (1 << i)) value += 3 ** (8 - i);
    return value;
  }

  get events(): number { return this.encode(this.sticky); }
  get enables(): number { return this.encode(this.enabled); }
  clear(value: number): void { this.sticky &= ~this.mask(value, false); }
  enable(value: number): void {
    const next = this.mask(value, true);
    if (next & ~this.enabled & this.sticky) this.pending = true;
    this.enabled = next;
  }
  raise(event: number): void {
    this.sticky |= 1 << event;
    if (this.enabled & (1 << event)) this.pending = true;
  }
  flush(irq: () => void): void {
    if (!this.pending) return;
    this.pending = false;
    irq();
  }
  reset(): void { this.sticky = this.enabled = 0; this.pending = false; }
}
