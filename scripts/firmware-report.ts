import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { linkFirmware } from '../src/firmware/link';

declare const FIRMWARE_ROOT: string;
console.log('Client RAM allocation (trytes; allocation is not proof of implementation fit):');
for (const r of CLIENT_LAYOUT) console.log(`${r.name.padEnd(18)} ${String(r.start).padStart(6)}..${String(r.start + r.size - 1).padStart(5)} ${String(r.size).padStart(5)}`);
console.log('\nMeasured linked library inventory (excludes application entrypoints):');
const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network', 'router'].map(name => ({
  name, source: readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8'),
}));
const linked = linkFirmware(modules);
for (const m of linked.modules) {
  console.log(`${m.name.padEnd(12)} ${String(m.address).padStart(6)} ${m.region.padEnd(16)} ${String(m.emitted).padStart(5)} emitted / ${String(m.reserved).padStart(5)} reserved`);
}
console.log(`Total: ${linked.emitted} emitted / ${linked.reserved} reserved; margin used: ${linked.marginReserved}.`);
console.log('\nFull browser/router/server fit: UNPROVEN (remaining native firmware not assembled).');
