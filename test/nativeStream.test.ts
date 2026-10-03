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

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'fatMutate', 'fatGrow', 'serial', 'netDevice', 'frame', 'network', 'stream', 'streamData', 'router'].map(name =>
  ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
function firmware(host: number, body: string) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'application', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
      W 2067 1 W 2068 2 W 2069 ${host} W 2545 ${host}
      ${body}` }]);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack', 'page.text']);
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
function pair(listener = 80, clientNext = 1, serverNext = 1, serverPrefix = '', routed: boolean | 2 = false, programLoop = loop, diskImages?: readonly Int16Array[]) {
  const c = firmware(1, `W 2175 1 W 2176 ${routed === 2 ? 4 : routed ? 3 : 2} W 2177 2 ${routed ? "W 2070 1 W 2071 2 W 2072 9" : ""} M A 2175 M B 80 M C 243 C S stream_connect W 2179 A ${programLoop}`);
  const s = firmware(2, `${routed ? `W 2068 ${routed === 2 ? 4 : 3} W 2070 1 W 2071 ${routed === 2 ? 4 : 3} W 2072 9` : ""} M A ${listener} C S stream_listen ${serverPrefix} ${programLoop}`);
  const w = new World(); w.addMachine('client', c); w.addMachine('server', s);
  const clientNic = w.addInterface('client', 4, [0, 0, 10], 'lan');
  const serverNic = w.addInterface('server', 4, [0, 0, 20], routed === 2 ? 'far' : routed ? 'remote' : 'lan');
  let router: FirmwareProbe | undefined;
  if (routed) {
    router = firmware(9, `
      W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 9
      W router_route_count ${routed === 2 ? 3 : 2}
      W 2200 1 W 2201 1 W 2202 2
      W 2207 1 W 2208 1 W 2209 3 W 2210 1
      ${routed === 2 ? "W 2214 2 W 2215 1 W 2216 4 W 2217 1 W 2218 1 W 2219 3 W 2220 8" : ""}
      C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`);
    w.addMachine('router', router); w.addInterface('router', 4, [0, 0, 30], 'lan'); w.addInterface('router', 5, [0, 0, 31], 'remote');
    w.addDisk('router', [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, 9], files: { '/net.seq': encodeWide(1) } }))]);
  }
  if (routed === 2) {
    const second = firmware(8, `
      W 2068 3 W net_iface_count 2 W 2093 122 W 2094 1 W 2095 4 W 2096 9
      W router_route_count 3
      W 2200 1 W 2201 1 W 2202 3
      W 2207 1 W 2208 1 W 2209 4 W 2210 1
      W 2214 2 W 2215 1 W 2216 2 W 2218 1 W 2219 3 W 2220 9
      C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`);
    w.addMachine('second-router', second);
    w.addInterface('second-router', 4, [0, 0, 40], 'remote'); w.addInterface('second-router', 5, [0, 0, 41], 'far');
    w.addDisk('second-router', [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, 8], files: { '/net.seq': encodeWide(1) } }))]);
  }
  const media: BlockMedium[] = [];
  for (const [id, volume, next] of [['client', 1, clientNext], ['server', 2, serverNext]] as const) {
    const medium = new BlockMedium(27, false, diskImages?.[volume - 1] ?? createDiskImage({ blocks: 27, volumeId: [0, 0, volume], files: { '/net.seq': encodeWide(next), '/held': [123] } }));
    media.push(medium); w.addDisk(id, [medium]);
  }
  return { w, c, s, clientNic, serverNic, router, media };
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

const dataLoop = `
      W 2180 3000
loop: C S net_poll
      N A Z C S stream_input
      C S stream_service
      R E st_status
      ife E 1 R E 2170 I E 1 W 2170 E W st_status Z end
      R E 2171
      E E 1 J send_data
      E E 2 J send_fin
      E E 3 J abort_connection
      E E 4 J read_once
      E E 6 J reconnect
      E E 7 J custom_send
      E E 8 J custom_read
      R B 2181
      N B Z C S app_read
      J loop
send_data: M A 2552 R B 2178 C S stream_send
      W 2179 A W 2171 Z J loop
send_fin: C S stream_shutdown W 2179 A W 2171 Z J loop
abort_connection: M A 4 C S stream_abort W 2179 A W 2171 Z J loop
custom_send: R A 2187 R B 2178 C S stream_send W 2179 A W 2171 Z J loop
custom_read: R A 2187 R B 2178 C S stream_read W 2179 A W 2188 B W 2171 Z J loop
reconnect: M A 2175 M B 80 M C 243 C S stream_connect W 2179 A W 2171 Z J loop
read_once: R B 2178 C S app_read W 2179 A W 2171 Z J loop
app_read: R A 2180 C S stream_read W 2186 A
      ifg A Z
        R E 2180 A E A W 2180 E
        R E 2183 A E A W 2183 E
      end
      ife B 1 R E 2182 I E 1 W 2182 E end
      O S P`;
function connected(routed: boolean | 2 = false) {
  const r = pair(80, 1, 1, '', routed, dataLoop);
  until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
  return r;
}
function send(r: ReturnType<typeof pair>, m: FirmwareProbe, cells: number[]) {
  cells.forEach((v, i) => m.poke(2552 + i, v)); m.poke(2178, cells.length); m.poke(2171, 1);
  until(r, () => m.peek(2171) === 0, 100_000); return m.peek(2179);
}
function command(r: ReturnType<typeof pair>, m: FirmwareProbe, cmd: number, count = 216) {
  m.poke(2178, count); m.poke(2171, cmd);
  until(r, () => m.peek(2171) === 0, 100_000); return m.peek(2179);
}
function output(m: FirmwareProbe) { return Array.from({ length: m.peek(2183) }, (_, i) => m.peek(3000 + i)); }

describe('native stream DATA and backpressure', () => {
  test.each([false, true, 2] as const)('transfers all 216 cells each direction simultaneously, routed=%s', routed => {
    const r = connected(routed);
    const a = Array.from({ length: 216 }, (_, i) => i - 108), b = a.map(v => v === 0 ? 0 : -v * 27);
    r.c.poke(2181, 17); r.s.poke(2181, 13);
    expect(send(r, r.c, a)).toBe(0); expect(send(r, r.s, b)).toBe(0);
    until(r, () => r.c.peek(2396) === 2 && r.s.peek(2396) === 2);
    expect(output(r.s)).toEqual(a); expect(output(r.c)).toEqual(b);
    expect(r.c.peek(2414)).toBe(0); expect(r.s.peek(2414)).toBe(0);
    expect(r.c.peek(2142)).toBe(0); expect(r.s.peek(2142)).toBe(0);
    expect(r.c.stackHighWater).toBeLessThanOrEqual(27); expect(r.s.stackHighWater).toBeLessThanOrEqual(27);
  });
  test('partial reads retain RX, withhold ACK, and never redeliver a consumed prefix', () => {
    const r = connected(); expect(send(r, r.c, [11, 22, 33, 44, 55])).toBe(0);
    until(r, () => r.s.peek(2414) === 5);
    expect(command(r, r.s, 4, 2)).toBe(2);
    expect(output(r.s)).toEqual([11, 22]); expect(r.s.peek(2414)).toBe(3); expect(r.s.peek(2142)).toBe(1);
    until(r, () => r.c.peek(2403) === 2, 2_000_000); r.w.runCycles(30_000);
    expect(r.s.peek(2414)).toBe(3); expect(output(r.s)).toEqual([11, 22]); expect(r.c.peek(2402)).toBe(1);
    expect(command(r, r.s, 4, 216)).toBe(3);
    until(r, () => r.c.peek(2402) === 0, 100_000);
    expect(output(r.s)).toEqual([11, 22, 33, 44, 55]); expect(r.s.peek(2397)).toBe(2);
  });
  test('lost DATA and lost ACK retry the same sequence without delivering twice', () => {
    const r = connected(); r.s.poke(2181, 216);
    const data = drop(r.serverNic, 4), ack = drop(r.clientNic, 3);
    expect(send(r, r.c, [9841, -9841, 0])).toBe(0);
    until(r, () => r.c.peek(2396) === 2, 4_000_000);
    expect(data).toHaveLength(3); expect(ack).toHaveLength(2);
    expect(output(r.s)).toEqual([9841, -9841, 0]);
    for (const f of data) { expect(f[23]).toBe(1); expect(Array.from(f.slice(17, 23))).toEqual([0, 0, 1, 0, 0, 1]); }
  });
  test('would-block send preserves the retained frame and caller data', () => {
    const r = connected(); expect(send(r, r.c, [1, 2, 3])).toBe(0);
    until(r, () => r.s.peek(2414) === 3);
    const retained = Array.from({ length: 243 }, (_, i) => r.c.peek(1580 + i));
    expect(send(r, r.c, [4, 5])).toBe(-1);
    expect(Array.from({ length: 243 }, (_, i) => r.c.peek(1580 + i))).toEqual(retained);
    expect([r.c.peek(2552), r.c.peek(2553)]).toEqual([4, 5]);
  });
  test('processes outgoing ACK while a partially consumed incoming frame remains owned', () => {
    const r = connected(); expect(send(r, r.c, [1, 2, 3])).toBe(0); expect(send(r, r.s, [7, 8, 9])).toBe(0);
    until(r, () => r.c.peek(2414) === 3 && r.s.peek(2414) === 3);
    expect(command(r, r.c, 4, 1)).toBe(1); expect(command(r, r.s, 4, 216)).toBe(3);
    until(r, () => r.c.peek(2402) === 0, 100_000);
    expect(r.c.peek(2414)).toBe(2); expect(r.c.peek(2142)).toBe(1); expect(output(r.c)).toEqual([7]);
    expect(command(r, r.c, 4, 216)).toBe(2);
    until(r, () => r.s.peek(2402) === 0, 100_000); expect(output(r.c)).toEqual([7, 8, 9]);
  });
  test('ignores out-of-order DATA and unrelated ACK without changing ownership or timers', () => {
    const r = connected(); expect(send(r, r.c, [1, 2])).toBe(0);
    until(r, () => r.s.peek(2414) === 2);
    const ack = peerFrame(3, true); ack[24] = 2;
    r.clientNic.receive(ack);
    const data = peerFrame(4, false); data[23] = 3; data[26] = 1; data[27] = 99;
    r.serverNic.receive(data); r.w.runCycles(40_000);
    expect(r.c.peek(2402)).toBe(1); expect(r.s.peek(2414)).toBe(2);
    expect(command(r, r.s, 4)).toBe(2); expect(output(r.s)).toEqual([1, 2]);
  });
});

describe('native stream closing and failure', () => {
  test('half-close delivers EOF once while allowing a response in the other direction', () => {
    const r = connected(); r.c.poke(2181, 216); r.s.poke(2181, 216);
    expect(send(r, r.c, [1, 2])).toBe(0); until(r, () => r.c.peek(2396) === 2);
    expect(command(r, r.c, 2)).toBe(0);
    until(r, () => r.c.peek(2399) === 1 && r.s.peek(2182) === 1);
    expect(r.s.peek(2399)).toBe(0); expect(r.s.peek(2380)).toBe(5);
    expect(send(r, r.s, [3, 4])).toBe(0); until(r, () => r.s.peek(2396) === 2);
    expect(command(r, r.s, 2)).toBe(0);
    until(r, () => r.c.peek(2380) === 6 && r.s.peek(2380) === 6);
    expect(output(r.c)).toEqual([3, 4]); expect(output(r.s)).toEqual([1, 2]);
    expect(r.c.peek(2182)).toBe(1); expect(r.s.peek(2182)).toBe(1);
    expect(r.c.peek(2418)).toBe(2); expect(r.s.peek(2418)).toBe(2);
  });
  test.each([3, 5])('recovers loss of closing packet kind %s without duplicate EOF', kind => {
    const r = connected(); r.c.poke(2181, 216); r.s.poke(2181, 216);
    const seen = drop(r.serverNic, kind);
    expect(command(r, r.c, 2)).toBe(0); expect(command(r, r.s, 2)).toBe(0);
    until(r, () => r.c.peek(2380) === 6 && r.s.peek(2380) === 6, 3_000_000);
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(r.c.peek(2182)).toBe(1); expect(r.s.peek(2182)).toBe(1);
  });
  test('tombstone re-ACKs a duplicate final FIN without extending its lifetime', () => {
    const r = connected(); r.c.poke(2181, 216); r.s.poke(2181, 216);
    command(r, r.c, 2); command(r, r.s, 2);
    until(r, () => r.c.peek(2380) === 6 && r.s.peek(2380) === 6);
    const expiry = [r.s.peek(2425), r.s.peek(2426), r.s.peek(2427)];
    r.w.runCycles(20_000); const acks = drop(r.clientNic, 3, 0);
    const fin = peerFrame(5, false); fin[23] = 1;
    r.serverNic.receive(fin); r.w.runCycles(50_000);
    expect(acks).toHaveLength(1); expect(acks[0]![24]).toBe(1);
    expect([r.s.peek(2425), r.s.peek(2426), r.s.peek(2427)]).toEqual(expiry);
    expect(r.s.peek(2182)).toBe(1);
    until(r, () => r.c.peek(2380) === 0 && r.s.peek(2380) === 0, 6_000_000);
    expect(r.s.peek(2418)).toBe(2);
  });
  test('a new connection replaces the tombstone and rejects the old serial pair', () => {
    const r = connected(); r.c.poke(2181, 216); r.s.poke(2181, 216);
    command(r, r.c, 2); command(r, r.s, 2);
    until(r, () => r.c.peek(2380) === 6 && r.s.peek(2380) === 6);
    expect(command(r, r.c, 6)).toBe(0);
    until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
    expect(r.c.peek(2392)).toBe(3); expect(r.c.peek(2395)).toBe(3);
    const old = peerFrame(5, false); old[23] = 1; r.serverNic.receive(old); r.w.runCycles(30_000);
    expect(r.s.peek(2400)).toBe(0); expect(r.s.peek(2380)).toBe(4);
    expect(send(r, r.c, [7, 8])).toBe(0); until(r, () => r.c.peek(2396) === 2);
    expect(output(r.s)).toEqual([7, 8]);
  });
  test('DATA after accepted FIN aborts, except a duplicate of already-consumed DATA', () => {
    const r = connected(); r.s.poke(2181, 216);
    send(r, r.c, [5]); until(r, () => r.c.peek(2396) === 2);
    command(r, r.c, 2); until(r, () => r.s.peek(2400) === 1);
    const duplicate = peerFrame(4, false); duplicate[23] = 1; duplicate[26] = 1; duplicate[27] = 5;
    r.serverNic.receive(duplicate); r.w.runCycles(40_000); expect(r.s.peek(2380)).toBe(5);
    duplicate[23] = 2; duplicate[27] = 99;
    r.serverNic.receive(duplicate); until(r, () => r.s.peek(2418) === -64, 100_000);
    until(r, () => r.c.peek(2418) === -61, 100_000);
    expect(r.c.peek(2473)).toBe(3); expect(output(r.s)).toEqual([5]);
  });
  test('sequence 9840 permits its final DATA then FIN(9841), without wraparound', () => {
    const r = connected(); r.s.poke(2181, 216); r.c.poke(2181, 216);
    r.c.poke(2396, 9840); r.s.poke(2397, 9840); r.s.poke(2398, 9839);
    expect(send(r, r.c, [7])).toBe(0); until(r, () => r.c.peek(2396) === 9841);
    expect(send(r, r.c, [8])).toBe(-63); expect(r.c.peek(2380)).toBe(4);
    command(r, r.c, 2); command(r, r.s, 2);
    until(r, () => r.c.peek(2380) === 6 && r.s.peek(2380) === 6);
    expect(r.c.peek(2396)).toBe(9841); expect(r.s.peek(2397)).toBe(9841);
    expect(output(r.s)).toEqual([7]);
  });
  test('sender timeout resets the peer and releases its partially consumed RX without EOF', () => {
    const r = connected(); send(r, r.c, [1, 2, 3]); until(r, () => r.s.peek(2414) === 3);
    expect(command(r, r.s, 4, 1)).toBe(1);
    until(r, () => r.c.peek(2418) === -62, 6_000_000);
    until(r, () => r.s.peek(2418) === -61, 100_000);
    expect(r.s.peek(2473)).toBe(5); expect(r.s.peek(2414)).toBe(0); expect(r.s.peek(2142)).toBe(0);
    expect(command(r, r.s, 4)).toBe(-61); expect(r.s.peek(2182)).toBe(0); expect(output(r.s)).toEqual([1]);
  });
  test('local abort sends a matching RESET, clears owned RX, and allows a fresh connect', () => {
    const r = connected(); send(r, r.s, [4, 5]); until(r, () => r.c.peek(2414) === 2);
    expect(command(r, r.c, 3)).toBe(-65);
    expect(r.c.peek(2142)).toBe(0); expect(r.c.peek(2414)).toBe(0);
    until(r, () => r.s.peek(2418) === -61, 100_000); expect(r.s.peek(2473)).toBe(4);
    expect(command(r, r.c, 6)).toBe(0);
    until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
  });
  test('closing has a fixed deadline even when the peer never closes its transmit direction', () => {
    const r = connected(); r.s.poke(2181, 216);
    command(r, r.c, 2); until(r, () => r.c.peek(2399) === 1);
    const deadline = [r.c.peek(2410), r.c.peek(2411), r.c.peek(2412)];
    const duplicate = peerFrame(3, true); duplicate[24] = 1;
    r.clientNic.receive(duplicate); r.w.runCycles(100_000);
    expect([r.c.peek(2410), r.c.peek(2411), r.c.peek(2412)]).toEqual(deadline);
    until(r, () => r.c.peek(2418) === -62, 6_000_000);
    expect(r.c.peek(2380)).toBe(0);
  });
});

describe('native stream ingress deadline boundaries', () => {
  test.each(['opening', 'sending', 'closing', 'tombstone'])('cannot revive expired %s state by polling a packet first', phase => {
    const state = phase === 'opening' ? 1 : phase === 'sending' ? 4 : phase === 'closing' ? 5 : 6;
    const m = firmware(1, `
      W st_state ${state} W st_role 1 W st_own 1 W 2383 2 W 2384 1
      W st_peer 1 W 2386 2 W 2387 2 W st_local_port 243 W st_peer_port 80
      W 2392 1 W 2395 ${phase === 'opening' ? 0 : 1}
      W st_send_next 1 W st_receive_next 1
      W st_tx_waiting ${phase === 'opening' || phase === 'sending' ? 1 : 0}
      W st_tx_kind ${phase === 'opening' ? 1 : 4}
      W st_tx_sends 1 W st_closing ${phase === 'closing' ? 1 : 0}
      W st_rx_closed ${phase === 'tombstone' ? 1 : 0}
      W st_status ${phase === 'tombstone' ? 2 : 0}
      W net_input 1337 W net_input_iface net_ifaces W net_rx_owned 1
      M A 1337 C S frame_validate W 2172 A
      C S stream_input
      R E st_status W 2170 E R E st_state W 2171 E
      H 0sAAA Z`);
    const f = peerFrame(phase === 'opening' ? 2 : phase === 'sending' ? 3 : phase === 'closing' ? 4 : 5, true);
    if (phase === 'sending') f[24] = 1;
    if (phase === 'closing') { f[23] = 1; f[26] = 1; f[27] = 99; }
    if (phase === 'tombstone') f[23] = 1;
    f.forEach((v, i) => m.poke(1337 + i, v));
    const w = new World(); w.addMachine('client', m); w.addInterface('client', 4, [0, 0, 10], 'lan'); w.runCycles(50_000);
    expect(m.peek(2172)).toBe(0); expect(m.peek(2171)).toBe(0);
    expect(m.peek(2170)).toBe(phase === 'tombstone' ? 2 : -62);
    expect(m.peek(2396)).toBe(1); expect(m.peek(2414)).toBe(0); expect(m.peek(2417)).toBe(0);
    if (phase === 'tombstone' || phase === 'opening') expect(m.peek(2440)).toBe(0);
  });
  test('invalid receive destinations/capacities do not consume bytes or return EOF', () => {
    const r = connected(); send(r, r.c, [1, 2, 3]); until(r, () => r.s.peek(2414) === 3);
    for (const [pointer, capacity] of [[1337, 1], [1580, 1], [1823, 1], [9841, 2], [3000, 0], [3000, 217]]) {
      r.s.poke(2187, pointer!); expect(command(r, r.s, 8, capacity!)).toBe(-60);
      expect(r.s.peek(2188)).toBe(0); expect(r.s.peek(2414)).toBe(3); expect(r.s.peek(2142)).toBe(1);
    }
    command(r, r.s, 4); until(r, () => r.c.peek(2402) === 0, 100_000);
    expect(output(r.s)).toEqual([1, 2, 3]);
  });
  test('invalid send spans never overwrite the retained frame', () => {
    const r = connected(); const retained = Array.from({ length: 243 }, (_, i) => r.c.peek(1580 + i));
    for (const [pointer, length] of [[1580, 1], [1579, 2], [1822, 1], [9841, 2], [2552, 0], [2552, 217]]) {
      r.c.poke(2187, pointer!); expect(command(r, r.c, 7, length!)).toBe(-60);
      expect(Array.from({ length: 243 }, (_, i) => r.c.peek(1580 + i))).toEqual(retained);
    }
  });
});

describe('native stream ICMP error correlation', () => {
  test('reports native router no-route failure immediately for an outstanding DATA frame', () => {
    const r = connected(true); r.router!.poke(2263, 1); // remove remote route after establishing
    expect(send(r, r.c, [7, 8])).toBe(0);
    until(r, () => r.c.peek(2418) === -67, 500_000);
    expect(r.c.peek(2380)).toBe(0); expect(r.c.peek(2480)).toBe(1);
    expect([r.c.peek(2482), r.c.peek(2483), r.c.peek(2484)]).toEqual([1, 2, 9]);
  });
  test.each(['a-high', 'b-middle', 'source', 'port', 'sequence', 'kind'])('ignores quote mismatch %s, then accepts a matching TIME-EXCEEDED', fault => {
    const r = connected(); send(r, r.c, [7, 8]); until(r, () => r.s.peek(2414) === 2);
    const f = new Int16Array(243); f[0] = 1; f[1] = 4;
    f.set([0, 0, 30], 2); f.set([0, 0, 10], 5); f.set([1, 2, 9], 8); f.set([1, 2, 1], 11);
    f[14] = 27; f[19] = 1; f[25] = 4; f[26] = 28;
    f.set(Array.from({ length: 27 }, (_, i) => r.s.peek(1337 + i)), 28);
    const bad = f.slice();
    if (fault === 'a-high') { bad[45] = 1; bad[17] = 1; }
    if (fault === 'b-middle') bad[49] = 1;
    if (fault === 'source') bad[36] = 2;
    if (fault === 'port') bad[43] = 244;
    if (fault === 'sequence') bad[51] = 2;
    if (fault === 'kind') bad[53] = 5;
    r.clientNic.receive(bad); r.w.runCycles(30_000);
    expect(r.c.peek(2380)).toBe(4); expect(r.c.peek(2402)).toBe(1);
    r.clientNic.receive(f); until(r, () => r.c.peek(2418) === -68, 100_000);
    expect(r.c.peek(2481)).toBe(4); expect(r.c.peek(2380)).toBe(0);
  });
});

describe('native stream reboot separation', () => {
  test('persisted ranges give fresh A/B after reboot, rejecting old OPEN and DATA', () => {
    const before = connected();
    const r = pair(80, 1, 1, '', false, dataLoop, before.media.map(m => m.image()));
    until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
    expect(r.c.peek(2392)).toBe(28); expect(r.c.peek(2395)).toBe(28);
    r.serverNic.receive(peerFrame(1, false));
    const oldData = peerFrame(4, false); oldData[23] = 1; oldData[26] = 2; oldData.set([99, 98], 27);
    r.serverNic.receive(oldData); r.w.runCycles(50_000);
    expect(r.s.peek(2414)).toBe(0); expect(r.s.peek(2380)).toBe(4); expect(r.c.peek(2380)).toBe(4);
    r.s.poke(2181, 216); expect(send(r, r.c, [7, 8])).toBe(0);
    until(r, () => r.c.peek(2396) === 2); expect(output(r.s)).toEqual([7, 8]);
  });
  test('old OPEN arriving first can reserve a slot but old DATA cannot confirm its freshly allocated B', () => {
    const before = connected();
    const r = pair(80, 1, 1, '', false, dataLoop, before.media.map(m => m.image()));
    r.serverNic.receive(peerFrame(1, false));
    until(r, () => r.s.peek(2380) === 3);
    expect(r.s.peek(2392)).toBe(1); expect(r.s.peek(2395)).toBe(28);
    const oldData = peerFrame(4, false); oldData[23] = 1; oldData[26] = 1; oldData[27] = 99;
    r.serverNic.receive(oldData); r.w.runCycles(50_000);
    expect(r.s.peek(2380)).toBe(3); expect(r.s.peek(2414)).toBe(0); expect(r.s.peek(2170)).toBe(0);
  });
  test('serial persistence failure prevents OPEN or OPEN-ACK from exposing an unreserved identity', () => {
    const badClient = pair(80, 0, 1); const opens = drop(badClient.serverNic, 1, 0);
    until(badClient, () => badClient.c.peek(2179) === -31);
    expect(opens).toHaveLength(0); expect(badClient.c.peek(2380)).toBe(0);
    const badServer = pair(80, 1, 0); const replies = drop(badServer.clientNic, 2, 0);
    until(badServer, () => badServer.s.peek(2418) === -31);
    expect(replies).toHaveLength(0); expect(badServer.s.peek(2395)).toBe(0); expect(badServer.s.peek(2380)).toBe(0);
  });
});

test.each([1, 2, 3])('queued ACK(2) coalesces incoming ACK(%s) without restarting equal/older control', seq => {
  const m = firmware(1, `
      W st_control 3 W 2467 2 W st_wire_owner 2 W net_pending 2 W net_resolving 1
      W 1847 ${seq} M A 1823 M B 3 C S stream_queue_control
      H 0sAAA Z`);
  m.run(10_000);
  expect(m.peek(2467)).toBe(Math.max(2, seq));
  expect(m.peek(2423)).toBe(seq > 2 ? 0 : 2);
  expect(m.peek(2125)).toBe(seq > 2 ? 0 : 2);
  expect(m.peek(2140)).toBe(seq > 2 ? 0 : 1);
});

test.each(['link', 'address'])('%s loss aborts a stream and releases owned unread data without EOF', mode => {
  const r = connected(); send(r, r.s, [4, 5, 6]); until(r, () => r.c.peek(2414) === 3);
  if (mode === 'link') r.clientNic.setLink(false);
  else r.c.poke(2069, 7);
  until(r, () => r.c.peek(2418) === -66, 100_000);
  expect(r.c.peek(2380)).toBe(0); expect(r.c.peek(2414)).toBe(0); expect(r.c.peek(2142)).toBe(0);
  expect(command(r, r.c, 4)).toBe(-66); expect(r.c.peek(2182)).toBe(0);
  if (mode === 'link') r.clientNic.setLink(true);
  const old = peerFrame(4, true); old[23] = 1; old[26] = 1; old[27] = 99;
  r.clientNic.receive(old); r.w.runCycles(30_000);
  expect(r.c.peek(2380)).toBe(0); expect(r.c.peek(2414)).toBe(0);
});


test('native disk replacement services stream payloads during block waits without corrupting either buffer', () => {
  const service = `
file_write:
      W block_service_vector @disk_network_service
      M A @disk_path M B 5 M C 10 M D 243 C S fs_replace_begin
      N A Z J file_done
      W 2193 10
file_block:
      M J fs_buffer M K 243
file_fill: W J 77 I J 1 I K -1 N K Z J file_fill
      C S fs_replace_append N A Z J file_done
      R E 2193 I E -1 W 2193 E N E Z J file_block
      C S fs_replace_finish
file_done:
      W 2194 A W block_service_vector Z W 2171 Z
      M A @disk_path M B 5 C S fs_lookup C S fs_open C S fs_read_next
      W 2195 A W 2196 B C S fs_close
      J loop
 disk_path: "/held"
disk_network_service:
      R E 2191 I E 1 W 2191 E
      C S net_poll
      ifn A Z C S stream_input E A 2 C S net_discard_input end
      C S stream_service
      M A 3200 M B 216 C S stream_read
      ifg A Z R E 2190 A E A W 2190 E end
      O S P`;
  const program = dataLoop.replace('R E 2171', 'R E 2171 E E 9 J file_write') + service;
  const r = pair(80, 1, 1, '', false, program);
  until(r, () => r.c.peek(2380) === 4 && r.s.peek(2380) === 4);
  const payload = Array.from({ length: 216 }, (_, i) => i - 108);
  r.s.poke(2171, 9);
  expect(send(r, r.c, payload)).toBe(0);
  until(r, () => r.s.peek(2171) === 0 && r.s.peek(2196) === 243, 3_000_000);
  expect(r.s.peek(2194)).toBe(0); expect(r.s.peek(2195)).toBe(0);
  expect(r.s.peek(2191)).toBeGreaterThan(10); expect(r.s.peek(2190)).toBe(216);
  expect(Array.from({ length: 216 }, (_, i) => r.s.peek(3200 + i))).toEqual(payload);
  expect(Array.from({ length: 243 }, (_, i) => r.s.peek(6440 + i))).toEqual(Array(243).fill(77));
  until(r, () => r.c.peek(2396) === 2, 100_000);
  expect(r.s.peek(2486)).toBe(0); expect(r.s.stackHighWater).toBeLessThanOrEqual(54);
});
