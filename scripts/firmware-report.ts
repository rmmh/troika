import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { linkPhasedFirmware } from '../src/firmware/phases';
import { linkFirmware } from '../src/firmware/link';

declare const FIRMWARE_ROOT: string;
console.log('Client RAM allocation (trytes; allocation is not proof of implementation fit):');
for (const r of CLIENT_LAYOUT) console.log(`${r.name.padEnd(18)} ${String(r.start).padStart(6)}..${String(r.start + r.size - 1).padStart(5)} ${String(r.size).padStart(5)}`);
const names = ['block', 'fat', 'fatCheck', 'fatWrite', 'fatMutate', 'fatGrow', 'fatAdmin', 'serial', 'netDevice', 'frame', 'network', 'router',
  'dns', 'dnsClient', 'dnsServer', 'dhcpServer', 'dhcpClient', 'stream', 'streamData', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'url', 'http', 'httpRequest', 'httpClient', 'httpSend', 'httpEmit', 'pageState', 'page', 'pageForm', 'text', 'image', 'pageCompilePhase', 'pageInteractPhase', 'pageView'];
const modules = names.map(name => ({ name, source: readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8') }));
const basic = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network'];
const files = [...basic, 'fatMutate', 'fatGrow'];
const profiles: Record<string, string[]> = {
  browser: [...files, 'dns', 'dnsClient', 'dhcpClient', 'stream', 'streamData', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'url', 'http', 'httpClient', 'httpSend', 'pageState', 'page', 'pageForm', 'text'],
  imageLoader: ['block', 'fat', 'fatCheck', 'fatWrite', 'image'],
  httpServer: [...files, 'fatAdmin', 'dns', 'stream', 'streamData', 'url', 'http', 'httpRequest', 'httpEmit'],
  router: [...basic, 'router'],
  dnsServer: [...basic, 'dns', 'dnsServer'],
  dhcpServer: [...basic, 'dhcpServer'],
};
const codeCapacity = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || r.name === 'margin').reduce((n, r) => n + r.size, 0);
console.log('\nMeasured role-library subsets (exclude actual application entrypoints):');
console.log('Each role is a separate machine image; combining every role is not a client RAM requirement.');
let failedRole = false;
for (const [role, selected] of Object.entries(profiles)) {
  const input = [
    ...(role === 'imageLoader' ? [{ name: 'imageConfig', source: '$image_capacity: 1906' }] : []),
    ...modules.filter(m => selected.includes(m.name)),
    ...(role === 'imageLoader' ? [{ name: 'imageSlot', source: 'image_slot//1906' }] : []),
    { name: 'applicationHooks', source: 'dhcp_lease_lost: O S P\nhttp_body: M A Z O S P' },
  ];
  let linked: ReturnType<typeof linkFirmware>;
  try { linked = linkFirmware(input); }
  catch (error) {
    if (!(error instanceof Error) || !/budget|contiguous/.test(error.message)) throw error;
    console.log(`${role}: requires explicit margin (${error.message}).`);
    try { linked = linkFirmware(input, { allowMargin: true }); }
    catch (marginError) {
      if (!(marginError instanceof Error) || !/budget|contiguous/.test(marginError.message)) throw marginError;
      console.log(`${role}: CANNOT LINK even with explicit margin (${marginError.message}).`);
      failedRole = true;
      continue;
    }
  }
  console.log(`${role}: ${linked.emitted} emitted / ${linked.reserved} reserved; margin used ${linked.marginReserved}; total code cells left after relinking ${codeCapacity - linked.reserved}.`);
  if (role === 'browser') for (const m of linked.modules) console.log(`  ${m.name.padEnd(16)} ${String(m.address).padStart(6)} ${m.region.padEnd(16)} ${String(m.reserved).padStart(5)}`);
}
const phasePrivate = new Set(['forthLex', 'forthCompile', 'page', 'httpSend', 'pageForm', 'text']);
const byName = (name: string) => modules.find(module => module.name === name)!;
const phased = linkPhasedFirmware({ capacity: 1906, allowMargin: true,
  resident: [...profiles.browser!.filter(name => !phasePrivate.has(name)).map(byName), byName('image'),
    { name: 'applicationHooks', source: 'dhcp_lease_lost: O S P\nhttp_body: M A Z O S P' }],
  phases: {
    compile: ['pageCompilePhase', 'forthLex', 'forthCompile', 'page'].map(byName),
    interact: ['pageInteractPhase', 'httpSend', 'pageForm', 'text', 'pageView'].map(byName),
  },
});
console.log(`phasedBrowser: ${phased.resident.emitted} resident emitted / ${phased.resident.reserved} reserved including one ${phased.capacity}-cell phase slot; ${codeCapacity - phased.resident.reserved} code cells remain.`);
for (const [name, phase] of Object.entries(phased.phases)) console.log(`  ${name}: ${phase.length} cells loaded into the same slot at ${phased.base} (${phased.capacity - phase.length} cells free in this phase); disk header is not retained there.`);
console.log('Phased browser libraries include both dispatchers, the native disk loader and page viewport, but exclude the browser controller, input handling and application entrypoint.');
console.log('\nInventory hooks are return stubs, not application behavior. Response encoding is charged to the server role.');
console.log('imageLoader is a separate loader fixture with a 1906-cell RAM slot, separate from the phased browser inventory. Loader state uses six protocol cells at 2487..2492.');
console.log('Request headers use at most 159 cells of existing scratch; form bodies use at most 208 cells of the same scratch after sending/copying the header.');
console.log('Page parsing uses 19 cells at 5420..5438 within Forth metadata; full-URL link validation temporarily uses 73 native stack cells and existing scratch.');
console.log('Forth compiler/VM/page words share the allocated 243-cell state arena.');
console.log('URL output: 108 cells at 5954; current/pending origins and parser state at 6062..6195.');
console.log('HTTP path, line buffer and parser state: 124 cells at 6196..6319, outside DNS storage.');
console.log('DNS server table: 1701 cells at 2552..4252, replacing browser page arenas.');
console.log('DNS client: 31 protocol cells; names/result use 111 URL-state cells at 6320..6430.');
console.log('DHCP server: 108 lease cells and 9 pool cells at 4739..4855; 14 protocol cells.');
console.log('DHCP client: 35 protocol-state cells at 2344..2378.');
console.log('Stream: 105 protocol-state cells at 2380..2484, including one 28-cell control header.');
console.log('Cooperative disk service: two protocol-state cells at 2485..2486, disabled by default.');
console.log(failedRole
  ? '\nCurrent role-library fit: FAILED. Full application fit remains UNPROVEN; browser input and application code are still missing.'
  : '\nFull browser/router/server application fit: UNPROVEN (browser input and application code remain).');
if (failedRole) process.exitCode = 1;
