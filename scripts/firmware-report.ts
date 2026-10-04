import { buildSecurityFirmware } from '../src/world/securityImage';
import { buildVirtualHostFirmware } from '../src/world/virtualHostImage';
import { buildWebCatalog } from '../src/world/catalog/pages';
import { buildSoftwareDistribution } from '../src/world/software/native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { linkPhasedFirmware } from '../src/firmware/phases';
import { linkFirmware } from '../src/firmware/link';
import { buildWorldPrograms } from '../src/world/programImages';
import { buildTerminalFirmware } from '../src/world/terminalImage';
import { createStarterWorld } from '../src/world/starter';

declare const FIRMWARE_ROOT: string;
console.log('Client RAM allocation (trytes; allocation is not proof of implementation fit):');
for (const r of CLIENT_LAYOUT) console.log(`${r.name.padEnd(18)} ${String(r.start).padStart(6)}..${String(r.start + r.size - 1).padStart(5)} ${String(r.size).padStart(5)}`);
const names = ['block', 'fat', 'fatCheck', 'fatWrite', 'fatMutate', 'fatGrow', 'fatAdmin', 'serial', 'netDevice', 'frame', 'network', 'netWait', 'netEcho', 'chatServer', 'chatClient', 'chatBot', 'probe', 'router',
  'dns', 'dnsClient', 'dnsServer', 'dhcpServer', 'dhcpClient', 'stream', 'streamData', 'streamMux', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'url', 'http', 'httpRequest', 'httpClient', 'httpSend', 'httpEmit', 'pageState', 'page', 'pageForm', 'text', 'image', 'pageCompilePhase', 'pageInteractPhase', 'pageView', 'pageInput', 'pageUi', 'pageKeys', 'pageRequest', 'pageTransmit', 'browserConnect', 'browserResponse', 'downloadPhase', 'browser', 'browserDhcpBoot', 'downloadBody', 'httpForm', 'httpFiles', 'httpMux', 'httpMuxUpload', 'httpTypes', 'noticeboard', 'topics', 'topicCatalog','xssPreview','door','security','npcBrowser', 'share', 'catalog', 'consolePhase', 'console', 'copyPhase', 'fatCopy', 'fatAppend', 'fatRename', 'fatSpace', 'upload', 'uploadPhase', 'probeConsole', 'telnetPhase', 'telnetServer', 'terminal', 'program', 'programMenu', 'ircProgram', 'pageForthPhase', 'webProgram'];
const modules = names.map(name => ({ name, source: readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8') }));
const basic = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network'];
const files = [...basic, 'fatMutate', 'fatGrow'];
const profiles: Record<string, string[]> = {
  browser: [...files, 'dns', 'dnsClient', 'dhcpClient', 'stream', 'streamData', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'url', 'http', 'httpClient', 'httpSend', 'pageState', 'page', 'pageForm', 'text'],
  imageLoader: ['block', 'fat', 'fatCheck', 'fatWrite', 'image'],
  httpServer: [...files, 'fatAdmin', 'dns', 'stream', 'streamData', 'url', 'http', 'httpRequest', 'httpEmit'],
  router: [...basic, 'router'],
  streamMux: [...basic, 'stream', 'streamData', 'streamMux'],
  icmpProbe: [...basic, 'probe'],
  dnsServer: [...basic, 'dns', 'dnsServer'],
  dhcpServer: [...basic, 'dhcpServer'],
};
const codeCapacity = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || r.name === 'margin').reduce((n, r) => n + r.size, 0);
console.log('\nMeasured role-library subsets (exclude actual application entrypoints):');
console.log('Each role is a separate machine image; combining every role is not a client RAM requirement.');
let failedRole = false;
for (const [role, selected] of Object.entries(profiles)) {
  const input = [
    ...(role === 'streamMux' ? [{name:'muxConfig', source:'$mx_slots: 2552\n$mx_frame: 3818'}] : []),
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
  if (role === 'streamMux') console.log(`  scheduler: ${linked.modules.find(m => m.name === 'streamMux')!.reserved} code cells; 1266 parked contexts + 243 ingress + 15 control cells. HTTP application contexts are not included.`);
  if (role === 'icmpProbe') console.log(`  probe core: ${linked.modules.find(m => m.name === 'probe')!.reserved} code cells; 25 inactive-Forth state cells; integrated console utilities are measured in the network/PUT disk phase below.`);
  if (role === 'browser') for (const m of linked.modules) console.log(`  ${m.name.padEnd(16)} ${String(m.address).padStart(6)} ${m.region.padEnd(16)} ${String(m.reserved).padStart(5)}`);
}
const fileServer = linkFirmware([
  ...[...basic, 'dns', 'stream', 'streamData', 'url', 'http', 'httpRequest', 'httpEmit', 'httpForm', 'httpFiles'].map(name => modules.find(m => m.name === name)!),
  { name: 'fileTypePolicy', source: 'http_file_type: M A 1 O S P\nhttp_file_post: M A 405 O S P' },
]);
console.log(`httpFiles: ${fileServer.emitted} emitted / ${fileServer.reserved} reserved cells, including file/form validation, dispatch and stream loop; excludes NIC/origin startup and custom MIME policy.`);
const phasePrivate = new Set(['fatMutate', 'fatGrow', 'forthLex', 'forthCompile', 'page', 'httpSend', 'pageForm', 'text']);
const byName = (name: string) => modules.find(module => module.name === name)!;
const browserRecipe = { capacity: 1906, allowMargin: true,
  resident: [...profiles.browser!.filter(name => !phasePrivate.has(name)).map(byName), byName('image'), byName('browserConnect'), byName('browserResponse'), byName('browser')],
  phases: {
    telnet: ['telnetPhase','text'].map(byName),
    upload: ['uploadPhase','probe','probeConsole','text'].map(byName),
    filecopy: ['copyPhase','fatMutate','fatGrow','fatCopy','fatRename','fatAdmin'].map(byName),
    console: ['consolePhase', 'fatSpace', 'text', 'console'].map(byName),
    download: ['downloadPhase', 'fatMutate', 'fatGrow', 'downloadBody'].map(byName),
    compile: ['pageCompilePhase', 'forthLex', 'forthCompile', 'page'].map(byName),
    interact: ['pageInteractPhase', 'httpSend', 'pageForm', 'text', 'pageView', 'pageInput', 'pageUi', 'pageKeys', 'pageRequest', 'pageTransmit'].map(byName),
  },
};
const phased = linkPhasedFirmware(browserRecipe);
const booted = linkPhasedFirmware({ ...browserRecipe, resident: [{ name: 'boot', source: 'J browser_entry' }, ...browserRecipe.resident, byName('browserDhcpBoot')] });
console.log(`browserDhcpPrototype: ${booted.resident.emitted} resident emitted / ${booted.resident.reserved} reserved including phase slot; ${codeCapacity - booted.resident.reserved} code cells remain. Includes DHCP startup and home URL. Verified GET/POST prototype, not the complete ecosystem.`);
console.log(`phasedBrowser: ${phased.resident.emitted} resident emitted / ${phased.resident.reserved} reserved including one ${phased.capacity}-cell phase slot; ${codeCapacity - phased.resident.reserved} code cells remain.`);
for (const [name, phase] of Object.entries(phased.phases)) console.log(`  ${name}: ${phase.length} cells loaded into the same slot at ${phased.base} (${phased.capacity - phase.length} cells free in this phase); disk header is not retained there.`);
console.log('Phased browser libraries include all six dispatchers, the native disk loader, page viewport, UI controller, keyboard polling, action preparation, connection setup, request transmission, response loading, atomic HTTP download assembly, the file console, atomic local file copy and rename, streamed console uploads, selected-link download entry and the navigation loop, but exclude startup configuration.');
console.log('\nInventory hooks are return stubs, not application behavior. Response encoding is charged to the server role.');
console.log('imageLoader is a separate loader fixture with a 1906-cell RAM slot, separate from the phased browser inventory. Loader state uses six protocol cells at 2487..2492.');
console.log('Request headers use at most 159 cells of existing scratch; form bodies use at most 208 cells of the same scratch after sending/copying the header.');
console.log('Page parsing uses 19 cells at 5420..5438 within Forth metadata; full-URL link validation temporarily uses 73 native stack cells and existing scratch.');
console.log('Forth compiler/VM/page words share the allocated 243-cell state arena.');
console.log('URL output: 108 cells at 5954; current/pending origins and parser state at 6062..6195.');
console.log('HTTP path, line buffer and parser state: 124 cells at 6196..6319, outside DNS storage.');
console.log('DNS server table: 1701 cells at 2552..4252, replacing browser page arenas.');
console.log('DNS client: 31 protocol cells; names/result use 111 URL-state cells at 6320..6430.');
console.log('Router: routes/state at 2200..2287; six native ingress frames at 2552..4009 replace its unused page-text arena.');
console.log('DHCP server: 108 lease cells and 9 pool cells at 4739..4855; 14 protocol cells.');
console.log('DHCP client: 35 protocol-state cells at 2344..2378.');
console.log('Stream: 105 protocol-state cells at 2380..2484, including one 28-cell control header.');
console.log('HTTP form server (separate CPU): 216 body cells at 4010..4225 by default (multiplexed servers reuse idle TX payload at 1607..1822), eight parser cells at 2500..2507 and twelve descriptor cells at 4739..4750.');
console.log('Browser navigation loop: state/status at 2504..2505 and download intent/destination at 2511..2513; network pump remains resident during phase replacement. Cell 2514 is a native interactive-input hint, never checkpoint permission.');
console.log('Browser response loading: four protocol cells at 2500..2503; compiler phase handles page cells through the image gate; download mode/assembly use 2506..2510.');
console.log('Browser connection setup: seven protocol cells at 2493..2499; DNS results do not overwrite URL origin metadata.');
console.log('Cooperative disk service: two protocol-state cells at 2485..2486, disabled by default.');
const starter = createStarterWorld(name => byName(name).source);
console.log('Runnable starter world (complete initial images, including startup):');
for (const [name, linked] of Object.entries(starter.images)) console.log(`  ${name}: ${linked.emitted} emitted / ${linked.reserved} reserved; ${codeCapacity - linked.reserved} code cells remain including margin.`);
const npc = createStarterWorld(name => byName(name).source, {npc:true}).npc!;
console.log(`  optional npc: ${npc.image.emitted} emitted / ${npc.image.reserved} reserved; ${codeCapacity - npc.image.reserved} code cells remain including margin.`);
const terminal = buildTerminalFirmware(name => byName(name).source);
console.log(`  standalone terminal: ${terminal.reserved} code cells; ${9666-terminal.reserved} resident cells free; no HTTP, page or Forth modules.`);
const chat = createStarterWorld(name => byName(name).source, {chat:true}).chat!;
console.log(`  chat: ${chat.image.emitted} emitted / ${chat.image.reserved} reserved resident cells; ${9666-chat.image.reserved} resident code cells free. Margin holds history, not code.`);
for (const c of chat.clients) console.log(`  ${c.id}: ${c.image.reserved} native client code cells; ${9666-c.image.reserved} resident cells free; 2187 history cells in margin.`);
const programs = buildWorldPrograms(name => byName(name).source);
console.log('Production program overlays (same CPU/RAM, separate disk programs):');
console.log(`  core: ${programs.core.image.reserved} protected resident cells.`);
for (const [name, program] of [['web', programs.web.resident], ['terminal', programs.terminal.image], ['irc', programs.irc.image]] as const) {
  const total = programs.core.image.reserved + program.reserved;
  const capacity = name === 'web' ? 12501 : 9666;
  console.log(`  ${name}: ${total}/${capacity} core+program code cells; ${capacity-total} eligible code cells free.`);
}
for (const [name, phase] of Object.entries(programs.web.phases)) console.log(`  web /${name}: ${phase.length}/1906 phase cells (shared slot, already charged above).`);
console.log('Program desktop: 243-block client disk; server/archive remain 81 blocks. IRC margin is history, not code. Forth runs in its own web phase.');
console.log('Server ICMP reply state: 2 protocol cells plus 57 inactive-Forth cells at 5333..5389; HTTP pump hook at 2530.');
console.log('Chat RAM: 243 session cells (2552..2794), 900 cached reply cells (2800..3699), 100 transient reply cells (3800..3899), 11 control cells (5250..5260), 2187 history cells (7007..9193). Shared network, ICMP, stack and filesystem retain their normal addresses.');
console.log('Console upload phase: 243 parked source cells at 4739..4981 and three read-cursor cells at 5232..5234, freeing the filesystem between packet sends for control-plane serial refill.');
console.log('Door HTTP: three clients; one 587-cell parked HTTP context at 2756..3342, ingress at 3560..3802, and 1853 linked data cells for two parked transports plus the other HTTP context. Each generated response is bounded at 204 cells.');
console.log('BBS HTTP: three clients; one shared 688-cell generated body at 2552..3239, parked transports at 3240..4505, and a 383-cell HTTP context at 4751..5133. A second HTTP context (-9598..-9216) and ingress (-9841..-9599) use 626 cells of headless screen RAM; no display device is attached.');
console.log('Archive HTTP: three clients; shared 748-cell generated body at 2552..3299, parked transports at 3300..4565, and the same headless ingress/383-cell HTTP banks as the BBS. PUT ownership serializes mutation through EOF or cancellation.');
const security = buildSecurityFirmware(name => byName(name).source);
console.log(`Security camera/alarm: three clients; ${security.bodyCells} generated cells at 2552, ${security.bankCells} parked HTTP cells at ${security.bankA}, ingress at ${security.ingress}; 1266 transport + ${security.bankCells} HTTP cells charged to linked code/data. Five device/control cells at 2508..2512.`);
const virtual = buildVirtualHostFirmware(name => readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8'),
  Array.from({length: 20}, (_, i) => ({name: `site-${i}.world`, directory: `s${String(i).padStart(2, '0')}`})), 100);
console.log(`Static virtual-host reference (20 names): ${virtual.reserved} linked cells; ${codeCapacity - virtual.reserved} code cells free. Three clients; HTTP banks 2552..3317, ingress 3318..3560, stream banks 3561..4826. Offline checker dedicates headless screen RAM -9841..-9113 to 729 reference cells. Host-selected root pointer is parked in HTTP state.`);
const software = buildSoftwareDistribution(programs.core, name => readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8'));
console.log(`Production Small Web: 100 authored sites plus atlas and ${software.length} native software downloads:`);
for (const app of software) console.log(`  ${app.site}/${app.id}: ${app.program.file.length} file cells; ${programs.core.image.reserved + app.program.image.reserved}/9666 core+program cells.`);
for (const cluster of buildWebCatalog(software).clusters) {
  const image = buildVirtualHostFirmware(name => readFileSync(join(FIRMWARE_ROOT, `firmware/include/${name}.asm`), 'utf8'), cluster.hosts, cluster.server, cluster.plainPaths);
  console.log(`  web${cluster.server}: ${cluster.hosts.length} names; ${image.reserved}/${codeCapacity} linked cells; ${cluster.free}/${cluster.blocks} disk blocks free.`);
}
console.log('Download control service: 266 private phase cells park partial file data and lookup/handle state during durable serial refill; accepted page arenas remain intact.');
console.log('Initial disk capacity (free 243-cell blocks; atomic replacement also needs temporary space):');
for (const [name, disk] of Object.entries(starter.disks)) {
  const media = disk.image(), blocks = media[5]!;
  const free = media.slice(243, 243 + blocks).filter(cell => cell === 0).length;
  console.log(`  ${name}: ${free} free / ${blocks} physical blocks.`);
}
console.log(failedRole
  ? '\nCurrent role-library fit: FAILED. Full ecosystem fit remains UNPROVEN; remaining services and world features are unfinished.'
  : '\nImplemented image budgets fit. Network-active boundary evidence: clientMemoryWorld, clientArenaWorld and forthArenaWorld.\nLive snapshot/replay evidence: worldState, worldActions, worldSnapshot, starterReplay and the world browser tests. This report checks static image budgets only.');
if (failedRole) process.exitCode = 1;
