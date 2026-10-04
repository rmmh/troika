import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { World } from '../src/core/world';
import { REG_P } from '../src/core/machine';
import { BlockMedium } from '../src/core/blockDevice';
import { encodeWide } from '../src/core/wide';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware, type LinkedFirmware } from '../src/firmware/link';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
import { buildVirtualHostFirmware } from '../src/world/virtualHostImage';
import { FirmwareProbe } from './firmwareProbe';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const hosts = Array.from({length: 20}, (_, i) => ({name: `site-${i}.world`, directory: `s${String(i).padStart(2, '0')}`}));
hosts[18]!.name = 'a'.repeat(48) + '.world';
const bodies = hosts.map((_, i) => encodeText(`PAGE 1\nH 7:Site ${String(i).padStart(2, '0')}\nT 500:${String(i % 10).repeat(500)}\n`));
const serverImage = buildVirtualHostFirmware(source, hosts, 100);

function install(world: World, id: string, image: LinkedFirmware, host: number, files: Record<string, number[]>, blocks: number) {
  const m = new FirmwareProbe([...(id === 'server' ? ['screen' as const] : []), 'mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack',
    'page.text', 'page.script', 'page.records', 'forth.state', 'scratch', 'url.state']);
  for (const chunk of image.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
  m.poke(REG_P, image.image.entry!); world.addMachine(id, m);
  const nic = world.addInterface(id, 4, [0, 0, host], 'lan');
  world.addDisk(id, [new BlockMedium(blocks, false, createDiskImage({blocks, volumeId: [0, 0, host],
    files: {'/net.seq': encodeWide(1), ...files}}))]);
  return {m, nic};
}

function fixture(requests: string[], image = serverImage, extraFiles: Record<string,number[]> = {}) {
  const world = new World();
  const server = install(world, 'server', image, 100,
    {...Object.fromEntries(hosts.map((entry, i) => [`/public/${entry.directory}/index`, bodies[i]!])),...extraFiles}, 243);
  const clients = requests.map((request, index) => {
    const host = index + 1;
    const image = linkFirmware([{name: 'boot', source: 'J entry'},
      ...[...WORLD_BASIC_MODULES, 'dns', 'stream', 'streamData', 'url', 'http', 'httpClient'].map(name => ({name, source: source(name)})),
      {name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
W 2067 1 W 2068 3 W 2069 ${host} W 2545 ${host}
gate: R E 2190 E E Z J gate
M A 1 C S http_init M A @address M B 80 M C 243 C S stream_connect N A Z J failed
loop: C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end C S stream_service
R E 2191
ife E Z
 R E st_state N E 4 J loop
 M A @request M B ${request.length} C S stream_send E A -1 J loop N A Z J failed W 2191 1
end
R E 2191 ife E 1 C S stream_shutdown ifl A -1 J failed end E A Z W 2191 2 end
R E 2198 N E Z J loop
C S stream_peek ifl A Z J failed end
ifn B Z
 W 2192 B C S http_feed N A Z J failed R A 2192 C S stream_consume N A Z J failed
end
R E h_phase
ife E 3 W 2198 1 end
J loop
http_body: R E 2197 M F 2552 A F E W F A I E 1 W 2197 E M A Z O S P
failed: W 2199 A H 0sAAA Z
address: 1 3 100
request: "${request.replaceAll('\n', '\\n')}"`}]);
    return install(world, `client${index}`, image, host, {}, 27);
  });
  const until = (done: () => boolean) => {
    const end = world.cycles + 20_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561);
      expect(server.m.peek(2199)).toBe(0);
      expect(server.m.peek(6)).toBeGreaterThanOrEqual(5468);
    }
    expect(done(), JSON.stringify({cycles: world.cycles, server: [server.m.peek(2198), server.m.peek(2494)],
      clients: clients.map(({m}) => [m.peek(2198), m.peek(2199), m.peek(2380), m.peek(6225), m.peek(2197)])})).toBe(true);
  };
  until(() => server.m.peek(2198) === 1);
  const bootCycles = world.cycles;
  for (const {m} of clients) m.poke(2190, 1);
  return {world, server, clients, until, bootCycles};
}
const get = (host: string, path = '/index') => `GET ${path} HTTP/T1\nHost: ${host}\nContent-Length: 0\n\n`;

test('native virtual hosts preserve three independent roots across stalled concurrent responses', () => {
  const f = fixture([get('site-0.world', '/'), get('SITE-10.WORLD.:80'), get('site-19.world')]);
  let hold = true, dropped = 0;
  for (const client of f.clients) {
    const receive = client.nic.receive.bind(client.nic);
    client.nic.receive = frame => { if (hold && frame[1] === 3 && frame[25] === 4) { dropped++; return; } receive(frame); };
  }
  const active = () => [0, 1, 2].filter(i => {
    const state = f.server.m.peek(i === f.server.m.peek(2300) ? 2380 : f.server.m.peek(2312 + i) + 518);
    return state >= 2 && state <= 5;
  }).length;
  f.until(() => active() === 3 && dropped > 0); hold = false;
  f.until(() => f.clients.every(({m}) => m.peek(2198) === 1));
  for (const [i, site] of [0, 10, 19].entries()) {
    const m = f.clients[i]!.m;
    expect(m.peek(2199)).toBe(0); expect(m.peek(6225)).toBe(200);
    expect(Array.from({length: m.peek(2197)}, (_, n) => m.peek(2552 + n))).toEqual(bodies[site]);
  }
  expect(serverImage.reserved).toBeLessThanOrEqual(12501);
  expect(f.server.m.stackHighWater).toBeLessThan(243);
  expect(f.bootCycles).toBeLessThan(3_100_000);
}, 60_000);

test.each([
  ['unknown', get('site-1.world.evil')],
  ['wrong port', get('site-0.world:81')],
  ['numeric alias', get('[__N.__P._CQ]')],
  ['other root', get('site-0.world', '/s19')],
])('native virtual hosts cannot expose another origin via %s', (_, request) => {
  const f = fixture([request]); f.until(() => f.clients[0]!.m.peek(2198) === 1);
  const m = f.clients[0]!.m;
  expect(m.peek(2199)).toBe(0); expect(m.peek(6225)).toBe(404); expect(m.peek(2197)).toBe(0);
}, 60_000);

test('read-only virtual hosts reject mutations without corrupting another client context', () => {
  const f = fixture([
    'POST /app/save HTTP/T1\nHost: site-0.world\nContent-Length: 1\nContent-Type: application/x-troika-form\n\n0',
    'PUT /index HTTP/T1\nHost: site-19.world\nContent-Length: 3\nContent-Type: text/plain\n\nabc',
    get(hosts[18]!.name),
  ]);
  f.until(() => f.clients.every(({m}) => m.peek(2198) === 1));
  expect(f.clients.map(({m}) => m.peek(2199))).toEqual([0, 0, 0]);
  expect(f.clients.map(({m}) => m.peek(6225))).toEqual([405, 405, 200]);
  const m = f.clients[2]!.m;
  expect(Array.from({length: m.peek(2197)}, (_, i) => m.peek(2552 + i))).toEqual(bodies[18]);
}, 60_000);

test.each(['/s19/index', '/../s19/index', '/%2e%2e'])('virtual host parser rejects root traversal via %s', path => {
  const f = fixture([get('site-0.world', path)]);
  const m = f.clients[0]!.m;
  f.until(() => m.peek(2199) !== 0);
  expect(m.peek(6225)).toBe(0); expect(m.peek(2197)).toBe(0);
}, 60_000);

test('virtual host configuration supports full protocol names and rejects unsafe or ambiguous roots', () => {
  expect(buildVirtualHostFirmware(source, [{name: 'a'.repeat(48) + '.world', directory: 's00'}], 100).reserved).toBeLessThanOrEqual(12501);
  for (const entries of [[{name: 'a.world', directory: '../'}], [hosts[0]!, hosts[0]!],
    [{name: 'A.world', directory: 's00'}], [], Array(28).fill(hosts[0]!)]) {
    expect(() => buildVirtualHostFirmware(source, entries, 100)).toThrow();
  }
});


test('compact software MIME membership stays exact across concurrent virtual hosts', () => {
  const paths=['/p0000','/c0001','/raw'],image=buildVirtualHostFirmware(source,hosts,100,paths);
  const binary=encodeText('raw program data'),code=encodeText('native source');
  const f=fixture([get('site-0.world','/p0000'),get('site-10.world','/c0001'),get('site-19.world','/p0001')],image,{
    '/public/s00/p0000':binary,'/public/s10/c0001':code,'/public/s19/p0001':bodies[19]!,
  });
  f.until(()=>f.clients.every(({m})=>m.peek(2198)===1));
  expect(f.clients.map(({m})=>m.peek(2199))).toEqual([0,0,0]);
  expect(f.clients.map(({m})=>m.peek(6225))).toEqual([200,200,200]);
  expect(f.clients.map(({m})=>m.peek(6218))).toEqual([1,1,2]);
  for(const [i,expected] of [binary,code,bodies[19]!].entries()) {
    const m=f.clients[i]!.m;expect(Array.from({length:m.peek(2197)},(_,n)=>m.peek(2552+n))).toEqual(expected);
  }
},60_000);
