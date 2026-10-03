import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { World } from '../src/core/world';
import { decodeWide, encodeWide } from '../src/core/wide';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
import type { NetworkDevice } from '../src/core/networkDevice';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network', 'dhcpServer', 'dhcpClient'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
function decodeTicks(values: number[]) { return decodeWide([values[0]!, values[1]!, values[2]!]); }
const writes = (at: number, values: number[]) => values.map((v, i) => `W ${at + i} ${v}`).join('\n');
function firmware(body: string) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'application', source: `
entry: M S 5710
      W net_iface_count 1 W net_ifaces 95
      ${body}
dhcp_lease_lost: R E 2172 I E 1 W 2172 E O S P` }]);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'page.records', 'native.stack', 'filesystem']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, linked.image.entry!); return m;
}
function setup(pool = [3, 4, 5], duration = 4860, extra = '', clientBody = 'H 0sAAA Z') {
  const s = firmware(`
      ${writes(2067, [1, 2, 2, 1, 2, 1, 1, 3, 2])}
      W dhcps_duration ${duration} W dhcps_count ${pool.length}
      ${writes(4847, pool)}
      ${extra}
      C S dhcp_server_init W 2170 A
      N A Z J stopped
loop: C S net_poll
      ife A 1 C S dhcp_server_input W 2171 A C S net_consume end
      J loop
stopped: H 0sAAA Z`);
  const c = firmware(clientBody);
  const w = new World(); w.addMachine('server', s); w.addMachine('client', c);
  const serverNic = w.addInterface('server', 4, [0, 0, 2], 'lan');
  const clientNic = w.addInterface('client', 4, [0, 0, 10], 'lan');
  w.addDisk('client', [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, 1], files: { '/net.seq': encodeWide(1) } }))]);
  w.runCycles(40_000);
  return { w, s, c, serverNic, clientNic };
}
function packet(kind = 1, id = [0, 0, 10], host = 3, serial = 1, configured = false) {
  const f = new Int16Array(243); f[0] = 1; f[1] = 2; f.set(id, 2);
  f[14] = 27; f[15] = 68; f[16] = 67; f.set(encodeWide(serial), 17);
  f[26] = 27; f[27] = 1; f[28] = kind; f.set(id, 29);
  if (kind !== 1) { f.set([1, 2, 2], 32); f.set([1, 2, host], 35); }
  if (configured) { f.set([0, 0, 2], 5); f.set([1, 2, host], 8); f.set([1, 2, 2], 11); }
  return f;
}
function take(d: NetworkDevice) {
  if (d.read(-9) === 0) return undefined;
  d.write(-5, 0); const f = Int16Array.from({ length: 243 }, () => d.read(-4)); d.write(-3, 2); return f;
}
function exchange(run: ReturnType<typeof setup>, f: Int16Array) {
  run.serverNic.receive(f); run.w.runCycles(50_000); return take(run.clientNic);
}
function slot(m: FirmwareProbe, index = 0) { return Array.from({ length: 12 }, (_, i) => m.peek(4739 + index * 12 + i)); }

describe('native DHCP server', () => {
  test('allocates all nine configured slots with signed host and full identity tuples', () => {
    const hosts = [-4, -3, -2, -1, 0, 3, 4, 5, 6];
    const r = setup(hosts);
    for (let i = 0; i < 9; i++) {
      exchange(r, packet(1, [i, -1, -10], hosts[i]!, i + 1));
      expect(slot(r.s, i).slice(0, 6)).toEqual([i, -1, -10, 1, 2, hosts[i]!]);
      expect(slot(r.s, i)[9]).toBe(1);
    }
    exchange(r, packet(1, [9, -1, -10], 3, 10)); expect(r.s.peek(2334)).toBe(5);
    exchange(r, packet(1, [4, -1, -10], 0, 11)); expect(r.s.peek(2334)).toBe(2);
    expect(slot(r.s, 4).slice(0, 6)).toEqual([4, -1, -10, 1, 2, 0]);
  });
  test('offers, binds, renews and releases an address without additional allocations', () => {
    const r = setup(); expect(r.s.peek(2170)).toBe(0);
    const offer = exchange(r, packet())!;
    expect(offer[28]).toBe(2); expect(Array.from(offer.slice(29, 45))).toEqual([0, 0, 10, 1, 2, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 4860]);
    expect(Array.from(offer.slice(5, 8))).toEqual([0, 0, 10]); expect(Array.from(offer.slice(11, 14))).toEqual([0, 0, 0]);
    expect(slot(r.s)[9]).toBe(1); const expiry = slot(r.s).slice(6, 9);
    const repeat = exchange(r, packet(1, [0, 0, 10], 3, 2))!;
    expect(repeat[28]).toBe(2); expect(slot(r.s).slice(6, 9)).toEqual(expiry);
    const ack = exchange(r, packet(3, [0, 0, 10], 3, 3))!;
    expect(ack[28]).toBe(4); expect(Array.from(ack.slice(17, 20))).toEqual([0, 0, 3]); expect(slot(r.s)[9]).toBe(2);
    const boundUntil = decodeTicks(slot(r.s).slice(6, 9));
    const renewal = exchange(r, packet(3, [0, 0, 10], 3, 4, true))!;
    expect(renewal[28]).toBe(4); expect(decodeTicks(slot(r.s).slice(6, 9))).toBeGreaterThan(boundUntil);
    expect(Array.from(renewal.slice(11, 14))).toEqual([1, 2, 3]); expect(slot(r.s, 1)[9]).toBe(0);
    expect(exchange(r, packet(6, [0, 0, 10], 3, 5, true))).toBeUndefined(); expect(slot(r.s)[9]).toBe(0);
  });
  test('full pool NAKs DISCOVER and an unowned REQUEST without replacing the owner', () => {
    const r = setup([3]); exchange(r, packet());
    // Fixture ingress from another identity; inspect its native reply in scratch.
    exchange(r, packet(1, [0, 1, 10])); expect(r.s.peek(2334)).toBe(5);
    expect(slot(r.s).slice(0, 3)).toEqual([0, 0, 10]);
    exchange(r, packet(3, [0, 1, 10])); expect(r.s.peek(2334)).toBe(5);
    expect(slot(r.s)[9]).toBe(1);
  });
  test('NAKs a requested address that is not owned and ignores an incorrect RELEASE', () => {
    const r = setup(); exchange(r, packet());
    expect(exchange(r, packet(3, [0, 0, 10], 4))![28]).toBe(5);
    expect(exchange(r, packet(6, [0, 0, 10], 4, 2, true))).toBeUndefined(); expect(slot(r.s)[9]).toBe(1);
    expect(exchange(r, packet(6, [0, 0, 10], 3, 3, true))).toBeUndefined(); expect(slot(r.s)[9]).toBe(1);
  });
  test('reclaims expired offered and bound slots using full-width ticks', () => {
    const r = setup([3], 81); exchange(r, packet());
    // Expired timestamp injection avoids millions of unrelated idle loop cycles.
    encodeWide(0).forEach((v, i) => r.s.poke(4745 + i, v));
    exchange(r, packet(1, [0, 1, 10])); expect(slot(r.s).slice(0, 3)).toEqual([0, 1, 10]);
    exchange(r, packet(3, [0, 1, 10])); expect(slot(r.s)[9]).toBe(2);
    r.w.runCycles(81 * 6561);
    exchange(r, packet(1)); expect(slot(r.s).slice(0, 3)).toEqual([0, 0, 10]); expect(slot(r.s)[9]).toBe(1);
  });
  test.each(['identity', 'reserved', 'duration', 'source', 'destination', 'server', 'length', 'version'])('rejects malformed request %s before allocating', fault => {
    const r = setup(); const f = packet(fault === 'server' ? 3 : 1);
    if (fault === 'identity') f[29] = 1;
    if (fault === 'reserved') f[53] = 1;
    if (fault === 'duration') f[44] = 1;
    if (fault === 'source') f[8] = 1;
    if (fault === 'destination') f[11] = 1;
    if (fault === 'server') f[32] = 2;
    if (fault === 'length') f[26] = 28;
    if (fault === 'version') f[27] = 2;
    expect(exchange(r, f)).toBeUndefined(); expect(slot(r.s)[9]).toBe(0);
  });
  test.each([
    { pool: [3, 3], duration: 4860, extra: '' },
    { pool: [2], duration: 4860, extra: '' },
    { pool: [1], duration: 4860, extra: '' },
    { pool: [], duration: 4860, extra: '' },
    { pool: [3], duration: 80, extra: '' },
    { pool: [3], duration: 4860, extra: 'W 2071 5' },
    { pool: [3], duration: 4860, extra: 'W 2073 Z W 2074 Z W 2075 Z' },
  ])('refuses invalid pool/configuration $pool $duration $extra', ({ pool, duration, extra }) => {
    const r = setup(pool, duration, extra); expect(r.s.peek(2170)).toBe(-55); expect(r.s.peek(2323)).toBe(0);
  });
});

const clientLoop = `
      W 2545 1
      C S dhcp_client_start
loop: C S net_poll
      ife A 1
        C S dhcp_client_input
        ife A 1
          R E 2170 I E 1 W 2170 E
        end
        C S net_consume
      end
      C S dhcp_client_service
      L A Z W 2171 A
      J loop`;
function advanceUntil(r: ReturnType<typeof setup>, predicate: () => boolean, budget = 2_000_000) {
  const end = r.w.cycles + budget;
  while (!predicate() && r.w.cycles < end) r.w.runCycles(6561);
  expect(predicate()).toBe(true);
}
describe('native DHCP client', () => {
  test('completes DISCOVER/OFFER/REQUEST/ACK using distinct durable transactions', () => {
    const r = setup([3, 4], 4860, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    expect(Array.from({ length: 9 }, (_, i) => r.c.peek(2067 + i))).toEqual([1, 2, 3, 1, 2, 1, 1, 3, 2]);
    expect(r.c.peek(2344)).toBe(3); expect(slot(r.s)[9]).toBe(2);
    expect([r.c.peek(2360), r.c.peek(2361), r.c.peek(2362)]).toEqual([0, 0, 2]);
    expect(r.c.peek(2536)).toBe(3); expect(r.c.peek(2172)).toBe(1);
    expect(r.c.stackHighWater).toBeLessThanOrEqual(24);
  });
  test('client expiry never exceeds the server binding expiry', () => {
    const r = setup([3], 81, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    const until = decodeTicks(Array.from({ length: 3 }, (_, i) => r.c.peek(2354 + i)));
    expect(until).toBeLessThanOrEqual(decodeTicks(slot(r.s).slice(6, 9)));
    expect(until).toBe(decodeTicks(Array.from({ length: 3 }, (_, i) => r.c.peek(2376 + i))) + 81);
  });
  test('does not publish a lease from a delayed ACK beyond its conservative expiry', () => {
    const r = setup([3], 81, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2344) === 2); r.serverNic.setLink(false);
    const ack = Int16Array.from({ length: 243 }, (_, i) => r.c.peek(1337 + i));
    ack[28] = 4;
    advanceUntil(r, () => r.c.peek(2369) === 1 && r.c.peek(2375) === 1);
    ack.set(Array.from({ length: 3 }, (_, i) => r.c.peek(2360 + i)), 17);
    r.w.runCycles(82 * 6561);
    r.clientNic.receive(ack); r.w.runCycles(50_000);
    expect(r.c.peek(2170)).toBe(0); expect(r.c.peek(2069)).toBe(0);
    expect(r.c.peek(2344)).toBe(1); expect(r.c.peek(2172)).toBe(2);
  });
  test('keeps configuration zero until ACK and preserves retained application TX', () => {
    const r = setup([3], 4860, '', clientLoop);
    const retained = Array.from({ length: 243 }, (_, i) => i - 121);
    retained.forEach((v, i) => r.c.poke(1580 + i, v));
    advanceUntil(r, () => r.c.peek(2344) === 2);
    expect(Array.from({ length: 9 }, (_, i) => r.c.peek(2067 + i))).toEqual(Array(9).fill(0));
    advanceUntil(r, () => r.c.peek(2170) === 1);
    expect(Array.from({ length: 243 }, (_, i) => r.c.peek(1580 + i))).toEqual(retained);
  });
  test('renews at floor of half an odd duration without allocating another slot', () => {
    const r = setup([3, 4], 81, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    const expiry = decodeTicks(Array.from({ length: 3 }, (_, i) => r.c.peek(2354 + i)));
    const renew = decodeTicks(Array.from({ length: 3 }, (_, i) => r.c.peek(2357 + i)));
    expect(expiry - renew).toBe(41);
    advanceUntil(r, () => r.c.peek(2170) === 2, 1_000_000);
    expect(decodeTicks(Array.from({ length: 3 }, (_, i) => r.c.peek(2354 + i)))).toBeGreaterThan(expiry);
    expect(slot(r.s, 1)[9]).toBe(0); expect(r.c.peek(2172)).toBe(1);
    expect(r.c.peek(2362)).toBe(3);
  });
  test('expires a lease when renewal replies are lost, clears routes, and restarts discovery', () => {
    const r = setup([3], 81, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    r.serverNic.setLink(false);
    advanceUntil(r, () => r.c.peek(2172) === 2, 1_000_000);
    expect(Array.from({ length: 9 }, (_, i) => r.c.peek(2067 + i))).toEqual(Array(9).fill(0));
    expect(r.c.peek(2085)).toBe(0); expect([0, 1]).toContain(r.c.peek(2344));
    r.serverNic.setLink(true);
    advanceUntil(r, () => r.c.peek(2170) === 2, 3_000_000);
    expect(r.c.peek(2344)).toBe(3);
  });
  test('link loss clears the lease once and link restoration starts fresh discovery', () => {
    const r = setup([3], 4860, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    r.clientNic.setLink(false); r.w.runCycles(100_000);
    expect(r.c.peek(2344)).toBe(5); expect(r.c.peek(2172)).toBe(2);
    expect(Array.from({ length: 9 }, (_, i) => r.c.peek(2067 + i))).toEqual(Array(9).fill(0));
    r.clientNic.setLink(true); advanceUntil(r, () => r.c.peek(2170) === 2);
    expect(r.c.peek(2344)).toBe(3); expect(r.c.peek(2362)).toBe(4);
  });
  test('retries a lost OFFER with the same serial, then uses a fresh REQUEST serial', () => {
    const r = setup([3], 4860, '', clientLoop); r.serverNic.setLink(false);
    advanceUntil(r, () => r.c.peek(2369) === 1);
    const first = Array.from({ length: 3 }, (_, i) => r.c.peek(2360 + i));
    r.w.runCycles(6561); r.serverNic.setLink(true);
    advanceUntil(r, () => r.c.peek(2344) === 1 && r.c.peek(2369) === 2, 2_000_000);
    expect(r.c.peek(2369)).toBe(2);
    expect(Array.from({ length: 3 }, (_, i) => r.c.peek(2360 + i))).toEqual(first);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    expect(r.c.peek(2362)).toBe(2);
  });
  test('limits an unanswered transaction to three sends and restarts with a fresh serial', () => {
    const r = setup([3], 4860, '', clientLoop); r.serverNic.setLink(false);
    advanceUntil(r, () => r.c.peek(2369) === 3, 4_000_000);
    const serial = r.c.peek(2362);
    advanceUntil(r, () => r.c.peek(2171) === -53, 2_000_000);
    advanceUntil(r, () => r.c.peek(2362) > serial, 100_000);
    expect(r.c.peek(2362)).toBe(serial + 1);
    expect(r.c.peek(2170)).toBe(0);
  });
  test('a failed renewal waits for original expiry without renewing the transaction indefinitely', () => {
    const r = setup([3], 4860, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2170) === 1);
    const until = Array.from({ length: 3 }, (_, i) => r.c.peek(2354 + i));
    r.serverNic.setLink(false);
    encodeWide(0).forEach((v, i) => r.c.poke(2357 + i, v));
    advanceUntil(r, () => r.c.peek(2344) === 6, 6_000_000);
    const serial = r.c.peek(2362); r.w.runCycles(1_000_000);
    expect(r.c.peek(2344)).toBe(6); expect(r.c.peek(2362)).toBe(serial);
    expect(Array.from({ length: 3 }, (_, i) => r.c.peek(2354 + i))).toEqual(until);
    expect(r.c.peek(2069)).toBe(3); expect(r.c.peek(2172)).toBe(1);
  });
  test.each(['serial', 'server-link', 'server-address', 'client-address', 'dns', 'reserved'])('requires a matching ACK: %s', fault => {
    const r = setup([3], 4860, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2344) === 2);
    r.serverNic.setLink(false);
    const ack = Int16Array.from({ length: 243 }, (_, i) => r.c.peek(1337 + i));
    ack[28] = 4;
    advanceUntil(r, () => r.c.peek(2375) === 1);
    ack.set(Array.from({ length: 3 }, (_, i) => r.c.peek(2360 + i)), 17);
    const bad = ack.slice();
    if (fault === 'serial') bad[17] = 1;
    if (fault === 'server-link') bad[2] = 1;
    if (fault === 'server-address') { bad[34] = 5; bad[10] = 5; }
    if (fault === 'client-address') bad[37] = 4;
    if (fault === 'dns') bad.fill(0, 41, 44);
    if (fault === 'reserved') bad[50] = 1;
    r.clientNic.receive(bad); r.w.runCycles(50_000);
    expect(r.c.peek(2344)).toBe(2); expect(r.c.peek(2069)).toBe(0);
    r.clientNic.receive(ack); advanceUntil(r, () => r.c.peek(2170) === 1, 100_000);
    expect(r.c.peek(2069)).toBe(3);
  });
  test('matching NAK clears configuration and restarts discovery', () => {
    const r = setup([3], 4860, '', clientLoop);
    advanceUntil(r, () => r.c.peek(2344) === 2); r.serverNic.setLink(false);
    const nak = Int16Array.from({ length: 243 }, (_, i) => r.c.peek(1337 + i));
    nak[28] = 5; nak.fill(0, 35, 45);
    advanceUntil(r, () => r.c.peek(2375) === 1);
    nak.set(Array.from({ length: 3 }, (_, i) => r.c.peek(2360 + i)), 17);
    r.clientNic.receive(nak); r.w.runCycles(50_000);
    expect(r.c.peek(2344)).toBe(1); expect(r.c.peek(2172)).toBe(2);
    expect(r.c.peek(2069)).toBe(0); expect(r.c.peek(2362)).toBe(3);
  });
  test.each(['serial', 'identity', 'server', 'subnet', 'gateway', 'ttl', 'reserved', 'source', 'address'])('ignores invalid offer %s without installing configuration', fault => {
    const r = setup([3], 4860, '', clientLoop); r.serverNic.setLink(false);
    advanceUntil(r, () => r.c.peek(2369) === 1);
    const f = new Int16Array(243); f[0] = 1; f[1] = 2;
    f.set([0, 0, 2], 2); f.set([0, 0, 10], 5); f.set([1, 2, 2], 8);
    f[14] = 27; f[15] = 67; f[16] = 68; f.set([0, 0, 1], 17);
    f[26] = 27; f[27] = 1; f[28] = 2;
    f.set([0, 0, 10, 1, 2, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 4860], 29);
    if (fault === 'serial') f[17] = 1;
    if (fault === 'identity') f[30] = 1;
    if (fault === 'server') f[32] = 3;
    if (fault === 'subnet') f[36] = 4;
    if (fault === 'gateway') f[39] = 4;
    if (fault === 'ttl') f[44] = 80;
    if (fault === 'reserved') f[53] = 1;
    if (fault === 'source') f[9] = 3;
    if (fault === 'address') f.fill(0, 35, 38);
    const deadline = Array.from({ length: 3 }, (_, i) => r.c.peek(2363 + i));
    r.clientNic.receive(f); r.w.runCycles(50_000);
    expect(r.c.peek(2344)).toBe(1);
    expect(Array.from({ length: 9 }, (_, i) => r.c.peek(2067 + i))).toEqual(Array(9).fill(0));
    expect(Array.from({ length: 3 }, (_, i) => r.c.peek(2363 + i))).toEqual(deadline);
  });
});
