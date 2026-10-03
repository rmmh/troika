import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { linkFirmware } from '../src/firmware/link';

declare const FIRMWARE_ROOT: string;
console.log('Client RAM allocation (trytes; allocation is not proof of implementation fit):');
for (const r of CLIENT_LAYOUT) console.log(`${r.name.padEnd(18)} ${String(r.start).padStart(6)}..${String(r.start + r.size - 1).padStart(5)} ${String(r.size).padStart(5)}`);
console.log('\nMeasured linked library inventory (excludes application entrypoints):');
const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'fatMutate', 'fatGrow', 'serial', 'netDevice', 'frame', 'network', 'router', 'dns', 'dnsClient', 'dnsServer', 'dhcpServer', 'dhcpClient', 'stream', 'streamData', 'forthVm', 'forthPage', 'forthLex', 'forthCompile'].map(name => ({
  name, source: readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8'),
}));
const hooks = { name: 'applicationHooks', source: 'dhcp_lease_lost: O S P\nf_validate_navigation: M A -87 O S P' };
// The all-role inventory is deliberately charged to margin when necessary;
// DNS/DHCP servers and a browser do not share their page arenas in a real role.
const linked = linkFirmware([...modules, hooks], { allowMargin: true });
for (const m of linked.modules) {
  console.log(`${m.name.padEnd(12)} ${String(m.address).padStart(6)} ${m.region.padEnd(16)} ${String(m.emitted).padStart(5)} emitted / ${String(m.reserved).padStart(5)} reserved`);
}
console.log(`Total: ${linked.emitted} emitted / ${linked.reserved} reserved; margin used: ${linked.marginReserved}.`);
const browserModules = [...modules.filter(m => !['router', 'dnsServer', 'dhcpServer'].includes(m.name)), hooks];
let browser: ReturnType<typeof linkFirmware>;
try { browser = linkFirmware(browserModules); }
catch (error) {
  if (!(error instanceof Error) || !/budget|contiguous/.test(error.message)) throw error;
  console.log(`Browser subset requires explicit margin: ${error.message}`);
  browser = linkFirmware(browserModules, { allowMargin: true });
}
console.log(`Browser-library subset: ${browser.emitted} emitted / ${browser.reserved} reserved; margin used: ${browser.marginReserved}.`);
const codeCapacity = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || r.name === 'margin').reduce((n, r) => n + r.size, 0);
console.log(`Browser subset leaves ${codeCapacity - browser.reserved} total code cells across resident extents and margin after relinking; application code is still missing.`);
console.log('Forth compiler/VM/page words share the allocated 243-cell state arena; URL validation still absent.');
console.log('Navigation inventory hook rejects all URLs; it is not an implemented URL parser.');
console.log('DNS server table: 1701 trytes at 2552..4252, replacing browser page arenas (not additional RAM).');
console.log('DNS client: 31 protocol-state trytes; names/result use 111 URL-state trytes at 6320..6430.');
console.log('DHCP server: 108 lease cells and 9 pool cells at 4739..4855; 14 protocol metadata cells.');
console.log('DHCP client: 35 protocol-state cells at 2344..2378; inventory lease callback is a return stub.');
console.log('Stream transport reserves 105 protocol-state trytes at 2380..2484 (including one 28-cell control header).');
console.log('Cooperative disk service reserves two protocol-state cells at 2485..2486; disabled by default.');
console.log('\nFull browser/router/server fit: UNPROVEN (remaining native firmware not assembled).');
