import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeWide } from '../src/core/wide';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network', 'dns', 'dnsServer', 'dnsClient', 'router'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
function writes(at: number, values: readonly number[]) { return values.map((v, i) => `W ${at + i} ${v}`).join('\n'); }
function firmware(body: string, host = 1) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'application', source: `
entry: M S 5710
      W net_iface_count 1
      W net_ifaces 95
      W 2067 1
      W 2068 2
      W 2069 ${host}
      W 2545 ${host}
      ${body}` }]);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack', 'scratch', 'url.state', 'page.text', 'page.script']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, linked.image.entry!);
  return m;
}
function record(name: string, address = [1, 3, 4], ttl = 81) {
  const result = Array<number>(63).fill(0); result[0] = name.length;
  result.splice(1, name.length, ...encodeText(name)); result.splice(55, 4, ...address, ttl);
  return result;
}
function installRecords(m: FirmwareProbe, records: number[][]) {
  m.poke(2280, records.length); records.flat().forEach((v, i) => m.poke(2552 + i, v));
}
function disk(volume: number) {
  return new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, volume], files: { '/net.seq': encodeWide(1) } }));
}
const stop = 'W 2170 A H 0sAAA Z';
describe('native DNS hostname grammar', () => {
  test.each(['bbs', 'Forum.Troika.', 'a-1.b2', 'a'.repeat(54), 'A'.repeat(54) + '.'])('normalizes %s', name => {
    const m = firmware(`M A 5954 M B ${name.length} M C 6010 C S dns_normalize W 2171 B ${stop}`);
    encodeText(name).forEach((v, i) => m.poke(5954 + i, v)); m.run(100_000);
    expect(m.peek(2170)).toBe(0); const n = m.peek(2171);
    expect(decodeText(Array.from({ length: n }, (_, i) => m.peek(6010 + i)))).toBe(name.toLowerCase().replace(/\.$/, ''));
  });
  test.each(['', '.', '-a', 'a-', '.a', 'a..b', 'a.-b', 'a-.b', 'a_b', 'a b', 'a'.repeat(55), 'x..'])('rejects %s', name => {
    const m = firmware(`M A 5954 M B ${name.length} M C 6010 C S dns_normalize ${stop}`);
    encodeText(name).forEach((v, i) => m.poke(5954 + i, v)); m.run(100_000);
    expect(m.peek(2170)).toBe(-50);
  });
});
describe('native DNS server', () => {
  test('validates a full 27-record table in guest RAM', () => {
    const m = firmware(`C S dns_server_init ${stop}`);
    installRecords(m, Array.from({ length: 27 }, (_, i) => record(`host-${i}`)));
    m.run(300_000); expect(m.peek(2170)).toBe(0); expect(m.peek(2281)).toBe(1);
  });
  test.each(['duplicate', 'uppercase', 'padding', 'reserved', 'address', 'ttl', 'count'])('refuses invalid configuration: %s', fault => {
    const m = firmware(`C S dns_server_init ${stop}`);
    const rows = [record('bbs'), record(fault === 'duplicate' ? 'bbs' : fault === 'uppercase' ? 'Forum' : 'forum')];
    if (fault === 'padding') rows[1]![30] = 1;
    if (fault === 'reserved') rows[1]![62] = 1;
    if (fault === 'address') rows[1]!.splice(55, 3, 0, 0, 0);
    if (fault === 'ttl') rows[1]![58] = 0;
    installRecords(m, rows); if (fault === 'count') m.poke(2280, 28);
    m.run(100_000); expect(m.peek(2170)).toBe(-50); expect(m.peek(2281)).toBe(0);
  });
  test.each(['bbs.world', 'missing.world', 'Bad.world', 'bad..world'])('answers or drops %s using two guest CPUs', name => {
    const c = firmware(`
      C S serial_alloc
      W 1840 A W 1841 B W 1842 C
      W 1823 1 W 1824 2
      W 1831 1 W 1832 2 W 1833 1
      W 1834 1 W 1835 2 W 1836 2
      W 1837 27 W 1838 243 W 1839 53
      W 1849 ${name.length + 3}
      W 1850 1 W 1851 1 W 1852 ${name.length}
      ${writes(1853, encodeText(name))}
      M A 1823 M B net_ifaces C S net_begin_send
loop: C S net_poll
      ife A 1 W 2170 1 H 0sAAA Z end
      C S net_service
      J loop`);
    const s = firmware(`
      C S dns_server_init
      N A Z J failed
loop: C S net_poll
      ife A 1
        C S dns_server_input
        C S net_consume
      end
      C S net_service
      J loop
failed: ${stop}`, 2);
    installRecords(s, [record('bbs.world', [-2, 3, 4], 729)]);
    const w = new World(); w.addMachine('client', c); w.addMachine('server', s);
    w.addInterface('client', 4, [0, 0, 10], 'lan'); w.addInterface('server', 4, [0, 0, 20], 'lan');
    w.addDisk('client', [disk(1)]); w.addDisk('server', [disk(2)]);
    w.advanceTo(2_000_000);
    const valid = !['Bad.world', 'bad..world'].includes(name);
    expect(c.peek(2170)).toBe(valid ? 1 : 0);
    if (valid) {
      expect(c.peek(1366)).toBe(name === 'bbs.world' ? 0 : 1);
      expect(Array.from({ length: 4 }, (_, i) => c.peek(1367 + i))).toEqual(name === 'bbs.world' ? [-2, 3, 4, 729] : [0, 0, 0, 0]);
      expect(c.peek(1363)).toBe(8 + name.length);
      expect(decodeText(Array.from({ length: name.length }, (_, i) => c.peek(1372 + i)))).toBe(name);
      expect(Array.from({ length: 3 }, (_, i) => c.peek(1354 + i))).toEqual([0, 0, 1]);
    }
  });
});

function resolver(name = 'BBS.World.', serverAction = 'C S dns_server_input', after = '', routed = false) {
  const c = firmware(`
      W 2073 1 W 2074 ${routed ? 3 : 2} W 2075 2
      ${routed ? writes(2070, [1, 2, 9]) : ""}
      M A 5954 M B ${name.length} C S dns_client_begin
      N A Z J done
loop: C S net_poll
      ife A 1
        C S dns_client_input
        C S net_consume
      end
      C S dns_client_service
      E A Z J loop
done: W 2170 A
      ${after}
      H 0sAAA Z`);
  encodeText(name).forEach((v, i) => c.poke(5954 + i, v));
  const s = firmware(`
      ${routed ? writes(2067, [1, 3, 2, 1, 3, 9]) : ""}
      C S dns_server_init
loop: C S net_poll
      ife A 1
        R E 2175 I E 1 W 2175 E
        ${serverAction}
        C S net_consume
      end
      C S net_service
      J loop`, 2);
  installRecords(s, [record('bbs.world', [-2, 3, 4], 81)]);
  const w = new World(); w.addMachine('client', c); w.addMachine('server', s);
  const nic = w.addInterface('client', 4, [0, 0, 10], 'lan'); w.addInterface('server', 4, [0, 0, 20], routed ? 'remote' : 'lan');
  if (routed) {
    const r = firmware(`
      W net_iface_count 2
      W 2069 9
      W 2093 122
      ${writes(2094, [1, 3, 9])}
      W router_route_count 2
      ${writes(2200, [1, 1, 2, 0, 0, 0, 0, 1, 1, 3, 1, 0, 0, 0])}
      C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`, 3);
    w.addMachine('router', r);
    w.addInterface('router', 4, [0, 0, 30], 'lan'); w.addInterface('router', 5, [0, 0, 31], 'remote');
    w.addDisk('router', [disk(3)]);
  }
  w.addDisk('client', [disk(1)]); w.addDisk('server', [disk(2)]);
  return { w, c, s, nic };
}

describe('native DNS resolver', () => {
  test('resolves a server on another LAN through guest router firmware', () => {
    const { w, c } = resolver('bbs.world', 'C S dns_server_input', '', true);
    w.advanceTo(3_000_000);
    expect(c.peek(2170)).toBe(1); expect(c.peek(1351)).toBe(26);
    expect([c.peek(6428), c.peek(6429), c.peek(6430)]).toEqual([-2, 3, 4]);
  });
  test('normalizes names, matches reply, and serves the same cached name without allocating a serial', () => {
    const { w, c, s } = resolver('BBS.World.', 'C S dns_server_input', `
      R E 2536 W 2172 E
      M A 5954 M B 10 C S dns_client_begin
      W 2171 A R E 2536 W 2173 E`);
    w.advanceTo(2_000_000);
    expect(c.peek(2170)).toBe(1); expect(c.peek(2171)).toBe(1);
    expect(c.peek(2172)).toBe(c.peek(2173)); expect(s.peek(2175)).toBe(1);
    expect([c.peek(6428), c.peek(6429), c.peek(6430)]).toEqual([-2, 3, 4]);
    expect(c.peek(2292)).toBe(9); expect(c.peek(2290)).toBe(0);
    expect(c.stackHighWater).toBeLessThanOrEqual(24);
  });
  test('unknown names report not-found without creating a cache entry', () => {
    const { w, c } = resolver('missing.world'); w.advanceTo(2_000_000);
    expect(c.peek(2170)).toBe(-51); expect(c.peek(2292)).toBe(0);
  });
  test('lost query response is retried with the same complete serial and succeeds', () => {
    const { w, c, s } = resolver('bbs.world', 'R E 2175 ifg E 1 C S dns_server_input end');
    w.advanceTo(3_000_000);
    expect(c.peek(2170)).toBe(1); expect(s.peek(2175)).toBe(2);
    expect(c.peek(2311)).toBe(2); expect([c.peek(2296), c.peek(2297), c.peek(2298)]).toEqual([0, 0, 1]);
    expect([c.peek(1354), c.peek(1355), c.peek(1356)]).toEqual([0, 0, 1]);
  });
  test('three unanswered sends time out without extending the original deadline', () => {
    const { w, c, s } = resolver('bbs.world', ''); w.advanceTo(6_000_000);
    expect(c.peek(2170)).toBe(-53); expect(s.peek(2175)).toBe(3); expect(c.peek(2311)).toBe(3);
    expect(c.peek(2290)).toBe(0); expect(c.peek(2125)).toBe(0);
  });
  test.each(['serial', 'name', 'source', 'destination', 'port', 'length', 'zero-address', 'zero-ttl', 'error-address'])('ignores malformed or mismatched reply: %s', fault => {
    const { w, c, s, nic } = resolver('bbs.world', '');
    while (w.cycles < 1_000_000 && s.peek(2175) === 0) w.runCycles(6561);
    expect(s.peek(2175)).toBe(1);
    const before = Array.from({ length: 3 }, (_, i) => c.peek(2305 + i));
    const f = new Int16Array(243); f[0] = 1; f[1] = 2;
    f.set([0, 0, 20], 2); f.set([0, 0, 10], 5); f.set([1, 2, 2], 8); f.set([1, 2, 1], 11);
    f[14] = 27; f[15] = 53; f[16] = 243; f.set([0, 0, 1], 17);
    f[26] = 17; f[27] = 1; f[28] = 2; f.set([1, 3, 4], 30); f[33] = 81; f[34] = 9; f.set(encodeText('bbs.world'), 35);
    if (fault === 'serial') f[17] = 1;
    if (fault === 'name') f[35] = encodeText('x')[0]!;
    if (fault === 'source') f[9] = 3;
    if (fault === 'destination') f[12] = 3;
    if (fault === 'port') f[15] = 54;
    if (fault === 'length') f[26] = 18;
    if (fault === 'zero-address') f.fill(0, 30, 33);
    if (fault === 'zero-ttl') f[33] = 0;
    if (fault === 'error-address') { f[29] = 1; f[33] = 0; }
    nic.receive(f); w.runCycles(30_000);
    expect(c.peek(2290)).toBe(1); expect(c.peek(2292)).toBe(0); expect(c.peek(2170)).toBe(0);
    expect(Array.from({ length: 3 }, (_, i) => c.peek(2305 + i))).toEqual(before);
  });
  test('invalidates an outstanding query when its configured address changes', () => {
    const { w, c, s } = resolver('bbs.world', '');
    while (w.cycles < 1_000_000 && s.peek(2175) === 0) w.runCycles(6561);
    c.poke(2069, 7); w.runCycles(30_000);
    expect(c.peek(2170)).toBe(-54); expect(c.peek(2290)).toBe(0); expect(c.peek(2292)).toBe(0);
  });
  test('expires the cache and resolves again with a fresh transaction', () => {
    const { w, c, s } = resolver('bbs.world', 'C S dns_server_input', `
wait: C S net_now
      M A net_tick M B dnsc_cache_until C S wide_compare
      E A -1 J wait
      M A 5954 M B 9 C S dns_client_begin
      W 2171 A
again: C S net_poll
      ife A 1 C S dns_client_input C S net_consume end
      C S dns_client_service
      E A Z J again
      W 2172 A`);
    w.advanceTo(2_000_000);
    expect(c.peek(2170)).toBe(1); expect(c.peek(2171)).toBe(0); expect(c.peek(2172)).toBe(1);
    expect(s.peek(2175)).toBe(2); expect(c.peek(2298)).toBe(3);
  });
});
