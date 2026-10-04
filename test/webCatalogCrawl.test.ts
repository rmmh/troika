import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld } from '../src/world/starter';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
import { linkFirmware } from '../src/firmware/link';
import { REG_P } from '../src/core/machine';
import { createDiskImage } from '../src/firmware/diskImage';
import { BlockMedium } from '../src/core/blockDevice';
import { encodeWide } from '../src/core/wide';
import { FirmwareProbe } from './firmwareProbe';
import { worldTestStage } from './worldDiagnostics';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('five native crawlers resolve and fetch every catalog page across the router with exact bodies', () => {
  const s = createStarterWorld(source, {web: true}), catalog = s.web!.catalog;
  const crawlers = catalog.clusters.map((cluster, index) => {
    const host = 40 + index, pages = catalog.pages.filter(page => cluster.hosts.some(entry => entry.name === page.host));
    const image = linkFirmware([{name: 'boot', source: 'J entry'},
      ...[...WORLD_BASIC_MODULES, 'netWait', 'dns', 'dnsClient', 'stream', 'streamData', 'url', 'http', 'httpClient', 'httpSend', 'browserConnect']
        .map(name => ({name, source: source(name)})),
      {name: 'crawler', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
W 2067 1 W 2068 2 W 2069 ${host} W 2545 ${host}
W 2070 1 W 2071 2 W 2072 9 W 2073 1 W 2074 3 W 2075 3
W 2190 @targets C S net_wait_init
gate: M A 6561 C S net_wait R E 2188 E E Z J gate
next: R I 2190 R B I E B Z J finished
I I 1 R E I W 2191 E I I 1 M A I A I B W 2196 I
C S url_parse N A Z J failed W 2193 Z
R A 2198 A A 243 C S browser_connect_begin ifl A Z J failed end
connecting: C S service C S browser_connect_step ifl A Z J failed end E A Z J connecting
sending: C S service M A 1 M B Z C S http_request_header N A Z J failed
M A C C S stream_send E A -1 J sending N A Z J failed
M A 1 C S http_init N A Z J failed
receiving: C S service C S stream_peek ifl A Z J failed end
ifn B Z
 W 2195 B C S http_feed N A Z J failed R A 2195 C S stream_consume N A Z J failed J receiving
end
N C 1 J receiving
C S stream_shutdown E A -1 J receiving N A Z J failed
R E st_state N E 6 J receiving
M A 5711 M B 1 C S stream_read ifl A Z J failed end
C S http_eof N A Z J failed
R E h_status ifn E 200 M A -181 J failed end
R E h_type ifn E 2 M A -182 J failed end
R E h_length R F 2191 ifn E F M A -183 J failed end
R E 2193 ifn E F M A -184 J failed end
draining: C S service R E st_state N E 6 J draining R E net_pending N E Z J draining
; Test observation barrier: retain the actual wire body until its bytes have
; been compared. The next URL and all protocol state still belong to this CPU.
W 2187 1
review: C S service R E 2187 N E Z J review
R E 2198 I E 1 W 2198 E R E 2196 W 2190 E J next
finished: W 2186 1 H 0sAAA Z
failed: W 2199 A H 0sAAA Z
service:
C S net_poll ifg A Z C S dns_client_input C S stream_input E A 2 C S net_discard_input end
; Wake on NIC input, with a sub-tick timer for bounded neighbour/stream work.
C S dns_client_service C S stream_service M A 729 C S net_wait O S P
http_body:
R E 2193 ifge E 2187 M A -102 O S P end
M F 2552 A F E W F A I E 1 W 2193 E M A Z O S P
targets:
${pages.map(page => {
  const url = `http://${page.host}${page.path}`;
  return `${url.length} ${page.cells.length} "${url}"`;
}).join('\n')}
0`}], {allowMargin: true});
    const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack', 'url.state', 'scratch', 'page.text', 'page.script']);
    for (const chunk of image.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
    m.poke(REG_P, image.image.entry!);
    const id = `crawler${index}`;
    s.world.addMachine(id, m); s.world.addInterface(id, 4, [0, 4, host], 'a');
    s.world.addDisk(id, [new BlockMedium(27, false, createDiskImage({blocks: 27, volumeId: [0, 0, host], files: {'/net.seq': encodeWide(1)}}))]);
    return {m, pages, checked: new Set<number>(), image};
  });
  const until = (done: () => boolean, limit: number) => {
    const end = s.world.cycles + limit;
    while (!done() && s.world.cycles < end) {
      s.world.runCycles(6561);
      for (const crawler of crawlers) {
        const {m} = crawler, index = m.peek(2198);
        expect(m.peek(2199), `crawler at ${crawler.pages[index]?.host}${crawler.pages[index]?.path}`).toBe(0);
        if (m.peek(2187) === 1) {
          expect(crawler.checked.has(index)).toBe(false);
          const expected = crawler.pages[index]!;
          expect(Array.from({length: m.peek(2193)}, (_, i) => m.peek(2552 + i)), `${expected.host}${expected.path}`).toEqual(expected.cells);
          crawler.checked.add(index); m.poke(2187, 0);
          const count = crawlers.reduce((sum, c) => sum + c.checked.size, 0);
          worldTestStage(`native crawl: ${count}/211 pages verified`);
          if (count % 25 === 0) console.info(`${count}/211 native pages verified at ${s.world.cycles} cycles`);
        }
      }
      for (const server of s.web!.servers) expect(server.machine.peek(2199), server.id).toBe(0);
    }
    expect(done(), JSON.stringify({cycles: s.world.cycles, clients: crawlers.map(({m}) => ({done: m.peek(2198), state: m.peek(2380), dns: m.peek(2290), phase: m.peek(2493)}))})).toBe(true);
  };
  until(() => s.web!.servers.every(server => server.machine.peek(2198) === 1), 10_000_000);
  for (const {m} of crawlers) m.poke(2188, 1);
  until(() => crawlers.every(({m}) => m.peek(2186) === 1), 300_000_000);
  expect(crawlers.reduce((sum, crawler) => sum + crawler.checked.size, 0)).toBe(211);
  expect(new Set(crawlers.flatMap(crawler => [...crawler.checked].map(i => crawler.pages[i]!.host))).size).toBe(101);
  for (const crawler of crawlers) {
    expect(crawler.m.stackHighWater).toBeLessThan(243); expect(crawler.image.reserved).toBeLessThanOrEqual(12501);
  }
  console.info(`Native routed crawl verified all 211 pages at ${s.world.cycles} world cycles`);
}, 1_200_000);
