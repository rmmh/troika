import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeWide, decodeWide } from '../src/core/wide';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
import type { NetworkDevice } from '../src/core/networkDevice';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network', 'stream', 'router'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
function firmware(host: number, body: string) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'application', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
      W 2067 1 W 2068 2 W 2069 ${host} W 2545 ${host}
      ${body}` }]);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, linked.image.entry!); return m;
}
const loop = `
loop: R E 2174
      ife E 1 C S fs_close W 2174 Z end
      C S net_poll
      ifn A Z
        C S stream_handshake_input
        E A 2 C S net_discard_input
      end
      C S stream_service
      R E st_status
      ife E 1
        R E 2170 I E 1 W 2170 E
        W st_status Z
      end
      J loop`;
function pair(listener = 80, clientNext = 1, serverNext = 1, serverPrefix = '', routed = false) {
  const c = firmware(1, `W 2175 1 W 2176 ${routed ? 3 : 2} W 2177 2 ${routed ? "W 2070 1 W 2071 2 W 2072 9" : ""} M A 2175 M B 80 M C 243 C S stream_connect ${loop}`);
  const s = firmware(2, `${routed ? "W 2068 3 W 2070 1 W 2071 3 W 2072 9" : ""} M A ${listener} C S stream_listen ${serverPrefix} ${loop}`);
  const w = new World(); w.addMachine('client', c); w.addMachine('server', s);
  const clientNic = w.addInterface('client', 4, [0, 0, 10], 'lan');
  const serverNic = w.addInterface('server', 4, [0, 0, 20], routed ? 'remote' : 'lan');
  if (routed) {
    const router = firmware(9, `
      W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 9
      W router_route_count 2
      W 2200 1 W 2201 1 W 2202 2
      W 2207 1 W 2208 1 W 2209 3 W 2210 1
      C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`);
    w.addMachine('router', router); w.addInterface('router', 4, [0, 0, 30], 'lan'); w.addInterface('router', 5, [0, 0, 31], 'remote');
    w.addDisk('router', [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, 9], files: { '/net.seq': encodeWide(1) } }))]);
  }
  for (const [id, volume, next] of [['client', 1, clientNext], ['server', 2, serverNext]] as const) {
    w.addDisk(id, [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, volume], files: { '/net.seq': encodeWide(next), '/held': [123] } }))]);
  }
  return { w, c, s, clientNic, serverNic };
}
function until(r: ReturnType<typeof pair>, predicate: () => boolean, budget = 3_000_000) {
  const end = r.w.cycles + budget;
  while (!predicate() && r.w.cycles < end) r.w.runCycles(6561);
  expect(predicate()).toBe(true);
}
function drop(d: NetworkDevice, kind: number, count = 1) {
  const receive = d.receive.bind(d); let lost = 0; const seen: Int16Array[] = [];
  d.receive = frame => {
    if (frame[1] === 3 && frame[25] === kind) {
      seen.push(frame.slice()); if (lost++ < count) return;
    }
    receive(frame);
  };
  return seen;
}
function peerFrame(kind: number, fromServer: boolean, a = 1, b = 1) {
  const f = new Int16Array(243); f[0] = 1; f[1] = 3;
  f.set([0, 0, fromServer ? 20 : 10], 2); f.set([0, 0, fromServer ? 10 : 20], 5);
  f.set([1, 2, fromServer ? 2 : 1], 8); f.set([1, 2, fromServer ? 1 : 2], 11);
  f[14] = 27; f[15] = fromServer ? 80 : 243; f[16] = fromServer ? 243 : 80;
  f.set(encodeWide(a), 17); f.set(encodeWide(kind === 1 ? 0 : b), 20); f[25] = kind;
  return f;
}
describe('native reliable-stream handshake core', () => {
  test('establishes across a guest router while retaining end-to-end identity', () => {
    const r = pair(80, 1, 1, '', true);
    until(r, () => r.c.peek(2170) === 1 && r.s.peek(2170) === 1, 4_000_000);
    expect([r.c.peek(2385), r.c.peek(2386), r.c.peek(2387)]).toEqual([1, 3, 2]);
    expect([r.s.peek(2385), r.s.peek(2386), r.s.peek(2387)]).toEqual([1, 2, 1]);
    expect(r.c.peek(1351)).toBe(26); expect(r.s.peek(1351)).toBe(26);
  });
  test('allocates both serials durably and establishes exactly once on each CPU', () => {
    const r = pair(); until(r, () => r.c.peek(2170) === 1 && r.s.peek(2170) === 1);
    expect(r.c.peek(2380)).toBe(4); expect(r.s.peek(2380)).toBe(4);
    expect([r.c.peek(2390), r.c.peek(2391), r.c.peek(2392)]).toEqual([0, 0, 1]);
    expect([r.c.peek(2393), r.c.peek(2394), r.c.peek(2395)]).toEqual([0, 0, 1]);
    expect(r.c.peek(2536)).toBe(3); expect(r.s.peek(2536)).toBe(3); // identity + neighbour query
    expect(r.c.stackHighWater).toBeLessThanOrEqual(24); expect(r.s.stackHighWater).toBeLessThanOrEqual(24);
  });
  test.each([1, 2, 3])('recovers one lost handshake kind %s without new connection serials', kind => {
    const r = pair(); const seen = drop(kind === 2 ? r.clientNic : r.serverNic, kind);
    until(r, () => r.c.peek(2170) === 1 && r.s.peek(2170) === 1, 4_000_000);
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(Array.from(seen[0]!.slice(17, 23))).toEqual(Array.from(seen[1]!.slice(17, 23)));
    expect(r.c.peek(2392)).toBe(1); expect(r.s.peek(2395)).toBe(1);
    expect(r.c.peek(2170)).toBe(1); expect(r.s.peek(2170)).toBe(1);
  });
  test('reserves a tuple while a native file handle delays B, coalescing duplicates and serving busy', () => {
    const r = pair(80, 1, 1, `
      M B Z C S fs_mount C S fs_check
      M A @held_path M B 5 C S fs_lookup C S fs_open
      J held_ready
held_path: "/held"
held_ready:`);
    until(r, () => r.s.peek(2380) === 2);
    expect(r.s.peek(6960)).toBe(1); expect(r.s.peek(2395)).toBe(0);
    const deadline = Array.from({ length: 3 }, (_, i) => r.s.peek(2404 + i));
    r.serverNic.receive(peerFrame(1, false)); r.w.runCycles(30_000);
    expect(r.s.peek(2380)).toBe(2);
    expect(Array.from({ length: 3 }, (_, i) => r.s.peek(2404 + i))).toEqual(deadline);
    // Known cache entry permits a control reply without allocating a neighbour serial.
    [1, 2, 1, 0, 0, 10, ...encodeWide(2430), 1].forEach((v, i) => r.s.poke(2076 + i, v));
    const busyReplies = drop(r.clientNic, 6, 0);
    const other = peerFrame(1, false, 77); other[15] = 244;
    r.serverNic.receive(other); r.w.runCycles(100_000);
    expect(busyReplies).toHaveLength(1); expect(busyReplies[0]![27]).toBe(2);
    expect(r.s.peek(2380)).toBe(2); expect(r.s.peek(2392)).toBe(1); expect(r.s.peek(2395)).toBe(0);
    r.s.poke(2174, 1);
    until(r, () => r.c.peek(2170) === 1 && r.s.peek(2170) === 1);
    expect(r.s.peek(2395)).toBe(1); expect(r.s.peek(2536)).toBe(2);
  });
  test('compares full durable connection serials across balanced-digit carries', () => {
    const a = 9841 * 19683 + 9841, b = 9841;
    const r = pair(80, a, b);
    until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
    expect(Array.from({ length: 3 }, (_, i) => r.c.peek(2390 + i))).toEqual(encodeWide(a));
    expect(Array.from({ length: 3 }, (_, i) => r.c.peek(2393 + i))).toEqual(encodeWide(b));
    const f = peerFrame(6, true, a, b); f[26] = 1; f[27] = 4;
    r.clientNic.receive(f); until(r, () => r.c.peek(2418) === -61, 100_000);
  });
  test('matching DATA(1) confirms OPEN-RECEIVED while retaining input for the payload layer', () => {
    const r = pair(); drop(r.serverNic, 3, 99);
    until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 3);
    const data = peerFrame(4, false); data[23] = 1; data[26] = 3; data.set([7, 8, 9], 27);
    r.serverNic.receive(data); until(r, () => r.s.peek(2380) === 4, 100_000);
    expect(r.s.peek(2402)).toBe(0); expect(r.s.peek(2170)).toBe(1);
    expect([r.s.peek(1364), r.s.peek(1365), r.s.peek(1366)]).toEqual([7, 8, 9]);
  });
  test('returns a matching refused RESET for an unbound port', () => {
    const r = pair(0); until(r, () => r.c.peek(2418) === -61);
    expect(r.c.peek(2473)).toBe(1); expect(r.c.peek(2380)).toBe(0); expect(r.s.peek(2380)).toBe(0);
    expect(r.s.peek(2547)).toBe(1); // only route resolution allocates on refusal
  });
  test('accelerated duplicate-OPEN replies still stop at the third send retry deadline', () => {
    const r = pair(); const seen = drop(r.clientNic, 2, 99);
    until(r, () => r.s.peek(2403) === 1);
    r.serverNic.receive(peerFrame(1, false)); until(r, () => r.s.peek(2403) === 2, 100_000);
    r.serverNic.receive(peerFrame(1, false)); until(r, () => r.s.peek(2403) === 3, 100_000);
    const deadline = decodeWide([r.s.peek(2404), r.s.peek(2405), r.s.peek(2406)]);
    const retry = [r.s.peek(2407), r.s.peek(2408), r.s.peek(2409)];
    r.serverNic.receive(peerFrame(1, false)); r.w.runCycles(30_000);
    expect([r.s.peek(2407), r.s.peek(2408), r.s.peek(2409)]).toEqual(retry);
    until(r, () => r.s.peek(2418) === -62, 2_000_000);
    expect(seen).toHaveLength(3); expect(Math.floor(r.w.cycles / 6561)).toBeLessThan(deadline);
  });
  test('expires an unanswered OPEN after exactly three successful sends', () => {
    const r = pair(); const seen = drop(r.serverNic, 1, 99);
    until(r, () => r.c.peek(2418) === -62, 6_000_000);
    expect(seen).toHaveLength(3); expect(r.c.peek(2380)).toBe(0); expect(r.c.peek(2125)).toBe(0);
  });
  test('duplicate OPEN and OPEN-ACK preserve established state, serials, and retained data', () => {
    const r = pair(); until(r, () => r.c.peek(2170) === 1 && r.s.peek(2170) === 1);
    const data = Array.from({ length: 243 }, (_, i) => i - 121);
    data.forEach((v, i) => { r.c.poke(1580 + i, v); r.s.poke(1580 + i, v); });
    const cNext = r.c.peek(2536), sNext = r.s.peek(2536);
    r.serverNic.receive(peerFrame(1, false)); r.clientNic.receive(peerFrame(2, true));
    r.w.runCycles(150_000);
    expect(r.c.peek(2170)).toBe(1); expect(r.s.peek(2170)).toBe(1);
    expect(r.c.peek(2536)).toBe(cNext); expect(r.s.peek(2536)).toBe(sNext);
    expect(Array.from({ length: 243 }, (_, i) => r.c.peek(1580 + i))).toEqual(data);
    expect(Array.from({ length: 243 }, (_, i) => r.s.peek(1580 + i))).toEqual(data);
  });
  test('a competing OPEN gets busy without altering the reserved connection', () => {
    const r = pair(); until(r, () => r.s.peek(2380) === 4);
    const other = peerFrame(1, false, 77); other[15] = 244;
    r.serverNic.receive(other); r.w.runCycles(100_000);
    expect(r.s.peek(2380)).toBe(4); expect(r.s.peek(2392)).toBe(1); expect(r.s.peek(2389)).toBe(243);
    expect(r.s.peek(2468)).toBe(6); expect(r.s.peek(2470)).toBe(2);
    expect(r.c.peek(2380)).toBe(4);
  });
  test.each(['a-high', 'b-middle', 'peer', 'port'])('ignores a foreign established RESET: %s', fault => {
    const r = pair(); until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
    const f = peerFrame(6, true); f[26] = 1; f[27] = 4;
    if (fault === 'a-high') f[17] = 1;
    if (fault === 'b-middle') f[21] = 1;
    if (fault === 'peer') f[9] = 3;
    if (fault === 'port') f[15] = 81;
    r.clientNic.receive(f); r.w.runCycles(30_000); expect(r.c.peek(2380)).toBe(4);
    const correct = peerFrame(6, true); correct[26] = 1; correct[27] = 4;
    r.clientNic.receive(correct); until(r, () => r.c.peek(2418) === -61, 100_000);
    expect(r.c.peek(2380)).toBe(0); expect(r.c.peek(2473)).toBe(4);
  });
});
