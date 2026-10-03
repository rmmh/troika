import { Machine } from '../src/core/machine';
import { norm } from '../src/core/tryte';
import { CLIENT_LAYOUT, type RegionName } from '../src/firmware/layout';

/** Test instrumentation only: guest state still lives solely in Machine RAM. */
export class FirmwareProbe extends Machine {
  readonly touched = new Set<number>();
  stackHighWater = 0;

  constructor(private readonly writable: readonly RegionName[]) { super(); }

  override write(address: number, value: number): void {
    const addr = norm(address);
    const region = CLIENT_LAYOUT.find(r => addr >= r.start && addr < r.start + r.size)!;
    if (!this.writable.includes(region.name)) throw new Error(`guest wrote outside its budget: ${addr} (${region.name})`);
    this.touched.add(addr);
    if (region.name === 'native.stack') this.stackHighWater = Math.max(this.stackHighWater, 5710 - addr);
    super.write(addr, value);
  }
}
