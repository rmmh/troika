import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assemble } from '../src/asm/assemble';
import { CLIENT_LAYOUT, auditClientImage } from '../src/firmware/layout';

declare const FIRMWARE_ROOT: string;
console.log('Client RAM allocation (trytes; allocation is not proof of implementation fit):');
for (const r of CLIENT_LAYOUT) console.log(`${r.name.padEnd(18)} ${String(r.start).padStart(6)}..${String(r.start + r.size - 1).padStart(5)} ${String(r.size).padStart(5)}`);
console.log('\nMeasured native modules (cumulative assembly; excludes callers):');
let source = '@-9112\n';
let previous = 0;
for (const path of ['firmware/include/block.asm', 'firmware/include/fat.asm', 'firmware/include/fatCheck.asm', 'firmware/include/fatWrite.asm', 'firmware/include/serial.asm', 'firmware/include/netDevice.asm', 'firmware/include/frame.asm']) {
  source += readFileSync(join(FIRMWARE_ROOT, path), 'utf8') + '\n';
  const result = assemble(source);
  if (result.diagnostics.length) throw new Error(JSON.stringify(result.diagnostics));
  const report = auditClientImage(result.chunks);
  console.log(`${path}: ${report.used - previous} added trytes; ${report.used} combined`);
  previous = report.used;
}
console.log('\nFull browser/router/server fit: UNPROVEN (remaining native firmware not assembled).');
