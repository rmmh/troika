import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';

import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { encodeWide } from '../src/core/wide';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { linkPhasedFirmware } from '../src/firmware/phases';
import { createDiskImage } from '../src/firmware/diskImage';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { FirmwareProbe } from './firmwareProbe';

// Yield between CPU-bound worlds so the runner can process pending IPC replies.
afterEach(() => new Promise<void>(resolve => setImmediate(resolve)));

const module = (name: string) => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') });
const counted = (s: string) => `${s.length}:${s}`;
const code = ': LOAD 0 FIELD@ 0 TEXT! ;';
const body = `PAGE 1\nT 6:before\nF 9:/app/save\nI 1:x 5:hello\nS 4:send\nC ${counted(code)}\n`;
function buildClient(routed = false, waitForBootKey = false) { return linkPhasedFirmware({ capacity: 1906, allowMargin: true,
  resident: [{ name: 'boot', source: `J ${routed ? 'browser_entry' : 'entry'}` }, ...['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','dns','dnsClient','dhcpClient',
    'stream','streamData','url','forthVm','forthPage','forthLookup','pageState','http','httpClient','image','browserConnect','browserResponse','browser'].map(module)].concat(routed ? [module('browserDhcpBoot')] : [{ name: 'app', source: `
entry: ${waitForBootKey ? "R E 68 N E 4 J entry R E 69" : ""}
      M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 2 W 2069 1 W 2545 1
      C S browser_init ifl A Z J failed end M A @url M B 26 C S browser_open ifl A Z J failed end
loop: R E 2195 E E 2 J verify_download
      ife E 4 C S browser_cancel J failed end
      C S browser_step ifl A Z J failed end
      R E 2195 ife E 1 R E bu_state ife E 4 R E st_state ife E 6
        W 2195 Z M A @file_url M B 25 M C @destination M D 4
        C S browser_download_open ifl A Z J failed end
      end end end J loop
verify_download: M A @destination M B 4 C S fs_lookup N A Z J failed
      C S fs_open N A Z J failed C S fs_read_next N A Z J failed
      W 2194 B M A 2200 M C B M B fs_buffer C S net_copy C S fs_close
      W 2195 3 H 0sAAA Z
failed: W 2199 A
wait_verify: R E 2195 N E 2 J wait_verify J verify_download
destination: "/out"
file_url: "http://[__N.__O.__O]/file"
url: "http://[__N.__O.__O]/index"` }]),
  phases: {
    console: ['consolePhase','fatMutate','fatGrow','fatAdmin','text','console'].map(module),
    compile: ['pageCompilePhase','forthLex','forthCompile','page'].map(module),
    interact: ['pageInteractPhase','httpSend','pageForm','text','pageView','pageInput','pageUi','pageKeys','pageRequest','pageTransmit'].map(module),
    download: ['downloadPhase','fatMutate','fatGrow','downloadBody'].map(module),
  },
}); }
const directClient = buildClient();
const routedClient = buildClient(true);
// The file server checks its populated disk before opening the listening port.
const fileClient = buildClient(false, true);
function buildServer(routed = false, downloadStatus = 200) { return linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','stream','streamData','dns','url','http','httpRequest','httpEmit'].map(module).concat([{ name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 ${routed ? 3 : 2} W 2069 2 W 2545 2
      ${routed ? "W 2070 1 W 2071 3 W 2072 9" : ""}
      M A @origin M B ${routed ? 17 : 21} C S url_parse C S url_commit M A Z C S http_init M A 80 C S stream_listen
loop: C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end C S stream_service
      R E 2191 E E 1 J header E E 2 J body E E 3 J close E E 4 J closed
      C S stream_peek ifl A Z J failed end
      ifn B Z W 2190 B C S http_feed N A Z J failed R A 2190 C S stream_consume end
      R E h_phase N E 3 J loop R E h_host_match N E 1 J failed
      R E 2198 I E 1 W 2198 E R E h_length W 2196 E
      R E h_path_len W 2260 E M A 2200 M B h_path M C E C S net_copy
      R E h_method
      ife E 1 M E @page W 2193 E W 2194 ${body.length} M C 2
      else M E @saved W 2193 E W 2194 5 M C 1 end
      M A 200
      R E h_method ife E 1 R E 2198 ife E 2
        M E @binary W 2193 E W 2194 7 M C 1 M A ${downloadStatus}
      end end
      R B 2194 C S http_response_header N A Z J failed W 2191 1
header: M A h_line R B h_line_len C S stream_send E A -1 J loop N A Z J failed W 2191 2
body: R A 2193 R B 2194 C S stream_send E A -1 J loop N A Z J failed W 2191 3
close: C S stream_shutdown E A -1 J loop N A Z J failed W 2191 4
closed: R E st_state N E 6 J loop
      M A Z C S http_init W 2191 Z W 2197 Z J loop
http_body: R E 2197 M F 2552 A F E W F A I E 1 W 2197 E M A Z O S P
failed: W 2199 A H 0sAAA Z
origin: "${routed ? "http://bbs.world/" : "http://[__N.__O.__O]/"}"
page: "${body.replaceAll('\n', '\\n')}"
binary: -9841 0 9841 -54 54 1 -1
saved: "Saved"` }])); }
function buildFileServer() { return linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','stream','streamData','dns','url','http','httpRequest','httpEmit','httpForm','httpFiles'].map(module).concat([{ name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 2 W 2069 2 W 2545 2
      M A @origin M B 21 C S url_parse C S url_commit C S http_files_init N A Z J failed
loop: C S http_files_step J loop
http_file_post: W 2198 1 M A @post_field M B 1 C S http_form_find N A Z O S P
      W 2196 C M A 2552 C S net_copy M A 405 O S P
post_field: "x"
http_file_type: E B 1 J page_type
      ife B 6 M B @index_path M C 6 C S dns_equal E A Z J page_type end
      M A 1 O S P
page_type: M A 2 O S P
index_path: "/index"
failed: W 2199 A H 0sAAA Z
origin: "http://[__N.__O.__O]/"` }])); }
function service(role: string, host: number, subnet: number, body: string) {
  const linked = linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','dns',role].map(module).concat([{ name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 ${subnet} W 2069 ${host}
      W 2545 ${role === 'dnsServer' ? 4 : host} ${body}` }]));
  const m = new FirmwareProbe(['mmio','network.state','network.buffers','filesystem','native.stack','scratch','url.state','page.text','page.script','page.records']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, linked.image.labels.get('entry')!); return m;
}
function fixture(corruptCompiler = false, routed = false, downloadStatus = 200, fileServer = false, fileRoute = '/news') {
  const clientImage = fileServer ? fileClient : routed ? routedClient : directClient;
  const serverImage = fileServer ? buildFileServer() : buildServer(routed, downloadStatus);
  class Client extends FirmwareProbe {
    phaseLoads = 0;
    leaseAcks = 0;
    receivedDuringLoad = false;
    override write(address: number, value: number) {
      const region = CLIENT_LAYOUT.find(r => address >= r.start && address < r.start + r.size);
      if ((region?.name.startsWith('resident.') || region?.name === 'margin') && (address < clientImage.base || address >= clientImage.base + clientImage.capacity)) throw new Error('browser wrote resident code');
      if (address === 2371 && value === 1) this.leaseAcks++;
      if (address === 2142 && value === 1 && this.peek(2488) === 1) this.receivedDuringLoad = true;
      if (address === 2487 && value === 1) this.phaseLoads++;
      super.write(address, value);
    }
  }
  const client = new Client(CLIENT_LAYOUT.map(r => r.name));
  const server = new FirmwareProbe(['mmio','network.state','network.buffers','filesystem','native.stack','url.state','scratch','page.text', ...(fileServer ? ['page.script', 'page.records'] as const : [])]);
  for (const [m, linked] of [[client, clientImage.resident], [server, serverImage]] as const) {
    for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    m.poke(REG_P, m === client ? linked.image.entry! : linked.image.labels.get('entry')!);
  }
  const keyboard = new TextDevice(); client.attach(keyboard);
  const world = new World();
  const phaseFiles = Object.fromEntries(Object.entries(clientImage.phases).map(([name, phase]) => [`/${name}`, [...phase.file]]));
  phaseFiles['/out'] = [1,2,3];
  if (corruptCompiler) phaseFiles['/compile']![3] = phaseFiles['/compile']![3] === 0 ? 1 : 0;
  for (const [name, m, id, files] of [['client', client, 1, phaseFiles], ['server', server, 2, fileServer ? { '/public/index': encodeText(fileRoute === '/app/save' ? body : `PAGE 1\nT 10:file world\nL 4:news ${counted(fileRoute)}\n`), '/public/news': encodeText('n'.repeat(700)), '/public/empty': [], ...(fileRoute === '/huge' ? { '/public/huge': Array(9842).fill(1) } : {}) } : {}]] as const) {
    world.addMachine(name, m); world.addDisk(name, [new BlockMedium(fileServer ? 81 : 54, false, createDiskImage({ blocks: fileServer ? 81 : 54, volumeId: [0,0,id], files: { '/net.seq': encodeWide(1), ...files } }))]);
    world.addInterface(name, 4, [0,0,id * 10], routed ? (name === 'client' ? 'a' : 'b') : 'lan');
  }
  if (routed) {
    const dhcp = service('dhcpServer', 3, 2, `
      W 2070 1 W 2071 2 W 2072 9 W 2073 1 W 2074 3 W 2075 3
      W dhcps_count 1 W dhcps_pool 7 W dhcps_duration 243 C S dhcp_server_init
loop: C S net_poll ifg A Z C S dhcp_server_input C S net_discard_input end J loop`);
    const dns = service('dnsServer', 3, 3, `
      W 2070 1 W 2071 3 W 2072 9 C S dns_server_init
loop: C S net_poll ifg A Z C S dns_server_input C S net_discard_input end C S net_service J loop`);
    dns.poke(2280, 1); dns.poke(2552, 9); encodeText('bbs.world').forEach((v, i) => dns.poke(2553 + i, v));
    [1,3,2,729].forEach((v, i) => dns.poke(2607 + i, v));
    const router = service('router', 9, 2, `
      W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 9
      W router_route_count 2 W 2200 1 W 2201 1 W 2202 2 W 2207 1 W 2208 1 W 2209 3 W 2210 1 C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`);
    for (const [name, m, id, segment] of [['dhcp',dhcp,3,'a'],['dns',dns,4,'b'],['router',router,9,'a']] as const) {
      world.addMachine(name, m); world.addDisk(name, [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0,0,id], files: { '/net.seq': encodeWide(1) } }))]);
      world.addInterface(name, 4, [0,0,id * 10], segment);
    }
    world.addInterface('router', 5, [0,0,91], 'b');
  }
  if (fileServer) {
    // Power on the client through its physical keyboard after the server's
    // offline disk check. No host code answers requests or looks up files.
    while (world.cycles < 100_000_000 && server.peek(6927) !== 2 && server.peek(2199) === 0) world.runCycles(6561);
    expect(server.peek(6927)).toBe(2); expect(server.peek(2199)).toBe(0);
    keyboard.queueText(' ');
  }
  function until(predicate: () => boolean) {
    const end = world.cycles + 15_000_000;
    while (world.cycles < end && !predicate() && client.peek(2199) === 0 && server.peek(2199) === 0 && client.peek(2504) !== -1) world.runCycles(6561);
    expect(client.peek(2199)).toBe(0); expect(client.peek(2505)).toBeGreaterThanOrEqual(0); expect(server.peek(2199)).toBe(0); expect(predicate()).toBe(true);
  }
  return { client, server, keyboard, world, until, clientImage };
}
test.each([false, true])('native browser navigates, runs LOAD, edits and POSTs across live disk phase transitions, routed DHCP/DNS=%s', routed => {
  const r = fixture(false, routed); r.until(() => r.client.peek(2504) === 4 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(decodeText(Array.from({ length: 5 }, (_, i) => r.client.peek(2552 + i)))).toBe('hello');
  expect(r.client.peek(5444)).toBe(2); expect(r.client.phaseLoads).toBeGreaterThanOrEqual(4);
  expect(r.client.peek(-9841)).toBe('h'.charCodeAt(0));
  r.keyboard.queueText('!\n'); r.until(() => r.client.peek(2504) === 4 && r.client.peek(5427) === 1 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(decodeText(Array.from({ length: 5 }, (_, i) => r.client.peek(2552 + i)))).toBe('Saved');
  expect(r.server.peek(2198)).toBe(2); expect(r.server.peek(2196)).toBe(10);
  expect(Array.from({ length: 10 }, (_, i) => r.server.peek(2552 + i))).toEqual([1,1,...encodeText('x'),6,...encodeText('hello!')]);
  expect(r.client.phaseLoads).toBeGreaterThanOrEqual(6); expect(r.client.stackHighWater).toBeLessThanOrEqual(120);
  expect(r.client.receivedDuringLoad).toBe(true);
  if (routed) {
    expect(Array.from({ length: 9 }, (_, i) => r.client.peek(2067 + i))).toEqual([1,2,7,1,2,9,1,3,3]);
    expect(r.client.peek(2292)).toBe(9); expect(r.client.leaseAcks).toBeGreaterThanOrEqual(2);
  }
}, 20_000);

test('live browser rejects a corrupt compiler image without accepting the response or running LOAD', () => {
  const r = fixture(true);
  while (r.world.cycles < 15_000_000 && r.client.peek(2199) === 0) r.world.runCycles(6561);
  expect(r.client.peek(2199)).toBe(-116); expect(r.client.peek(2504)).toBe(-1);
  expect(r.client.peek(5434)).toBe(0); expect(r.client.peek(5363)).toBe(0); expect(r.client.peek(6122)).toBe(0);
});


test.each([200, 404])('native browser downloads over a live stream while retaining its page, HTTP=%s', status => {
  const r = fixture(false, false, status);
  r.until(() => r.client.peek(2504) === 4 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  const page = Array.from({ length: 2916 }, (_, i) => r.client.peek(2552 + i));
  const screen = Array.from({ length: 729 }, (_, i) => r.client.peek(-9841 + i));
  const origin = Array.from({ length: 61 }, (_, i) => r.client.peek(6062 + i));
  r.client.poke(2195, 1);
  const end = r.world.cycles + 15_000_000;
  while (r.world.cycles < end && r.client.peek(2199) === 0 && !(r.client.peek(2195) === 0 && r.server.peek(2198) === 2 && r.client.peek(2504) === 4 && r.client.peek(2488) === 0)) r.world.runCycles(6561);
  expect(r.client.peek(2505)).toBe(status === 200 ? 1 : -132);
  expect(r.client.peek(2504)).toBe(status === 200 ? 4 : -1);
  expect(r.server.peek(2198)).toBe(2); expect(r.server.peek(2199)).toBe(0);
  expect(decodeText(Array.from({ length: r.server.peek(2260) }, (_, i) => r.server.peek(2200 + i)))).toBe('/file');
  expect(Array.from({ length: 2916 }, (_, i) => r.client.peek(2552 + i))).toEqual(page);
  expect(Array.from({ length: 729 }, (_, i) => r.client.peek(-9841 + i))).toEqual(screen);
  expect(Array.from({ length: 61 }, (_, i) => r.client.peek(6062 + i))).toEqual(origin);
  expect(r.client.peek(6960)).toBe(0);
  if (status === 200) {
    r.keyboard.queueText('!\n');
    r.until(() => r.client.peek(2504) === 4 && r.client.peek(5427) === 1 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
    expect(decodeText(Array.from({ length: 5 }, (_, i) => r.client.peek(2552 + i)))).toBe('Saved');
    expect(r.server.peek(2198)).toBe(3);
  }
  r.client.poke(2195, 2);
  const verifyEnd = r.world.cycles + 2_000_000;
  while (r.world.cycles < verifyEnd && r.client.peek(2195) !== 3) r.world.runCycles(6561);
  expect(r.client.peek(2195)).toBe(3);
  const expected = status === 200 ? [-9841,0,9841,-54,54,1,-1] : [1,2,3];
  expect(r.client.peek(2194)).toBe(expected.length);
  expect(Array.from({ length: expected.length }, (_, i) => r.client.peek(2200 + i))).toEqual(expected);
  expect(r.client.stackHighWater).toBeLessThanOrEqual(120);
}, 20_000);


test('native cancellation aborts an unpublished live download before returning a sticky status', () => {
  const r = fixture();
  r.until(() => r.client.peek(2504) === 4 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  const page = Array.from({ length: 2916 }, (_, i) => r.client.peek(2552 + i));
  r.client.poke(2195, 1);
  r.until(() => r.client.peek(6960) === 3);
  r.client.poke(2195, 4);
  const end = r.world.cycles + 3_000_000;
  while (r.world.cycles < end && r.client.peek(2199) === 0) r.world.runCycles(6561);
  expect(r.client.peek(2199)).toBe(-133); expect(r.client.peek(2505)).toBe(-133);
  expect(r.client.peek(2504)).toBe(-1); expect(r.client.peek(6960)).toBe(0);
  expect(r.client.peek(6976)).toBe(0); expect(r.client.peek(5368)).toBe(0);
  expect(Array.from({ length: 2916 }, (_, i) => r.client.peek(2552 + i))).toEqual(page);
  r.client.poke(2195, 2);
  const verifyEnd = r.world.cycles + 2_000_000;
  while (r.world.cycles < verifyEnd && r.client.peek(2195) !== 3) r.world.runCycles(6561);
  expect(r.client.peek(2195)).toBe(3); expect(r.client.peek(2194)).toBe(3);
  expect(Array.from({ length: 3 }, (_, i) => r.client.peek(2200 + i))).toEqual([1,2,3]);
  expect(r.client.stackHighWater).toBeLessThanOrEqual(120);
}, 20_000);


test.each([['/news', 200, 700], ['/empty', 200, 0], ['/net.seq', 404, 0], ['/missing', 404, 0], ['/huge', 413, 0]] as const)('native disk HTTP server serves only bounded public files: %s', (route, status, length) => {
  const r = fixture(false, false, 200, true, route);
  r.until(() => r.client.peek(2504) === 4 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(decodeText(Array.from({ length: 10 }, (_, i) => r.client.peek(2552 + i)))).toBe('file world');
  expect(r.client.peek(5444)).toBe(1);
  r.keyboard.queueText('\n');
  r.until(() => r.client.peek(2504) === 4 && r.client.peek(5427) === 1 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(r.client.peek(6225)).toBe(status); expect(r.client.peek(5420)).toBe(2552 + length);
  expect(Array.from({ length }, (_, i) => r.client.peek(2552 + i))).toEqual(encodeText('n'.repeat(length)));
  expect(r.server.peek(2494)).toBe(0); expect(r.server.peek(6960)).toBe(0);
  expect(r.client.stackHighWater).toBeLessThanOrEqual(120); expect(r.server.stackHighWater).toBeLessThanOrEqual(120);
}, 20_000);


test('native disk HTTP server rejects a fully framed form POST with 405', () => {
  const r = fixture(false, false, 200, true, '/app/save');
  r.until(() => r.client.peek(2504) === 4 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  r.keyboard.queueText('!\n');
  r.until(() => r.client.peek(2504) === 4 && r.client.peek(5427) === 1 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(r.client.peek(6225)).toBe(405); expect(r.client.peek(5420)).toBe(2552);
  expect(r.server.peek(2198)).toBe(1); expect(r.server.peek(2196)).toBe(6);
  expect(decodeText(Array.from({ length: 6 }, (_, i) => r.server.peek(2552 + i)))).toBe('hello!');
  expect(r.server.peek(2494)).toBe(0); expect(r.server.peek(6960)).toBe(0);
}, 20_000);
