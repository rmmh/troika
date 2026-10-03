import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeWide, decodeWide } from '../src/core/wide';
import { FirmwareProbe } from './firmwareProbe';
import { auditClientImage } from '../src/firmware/layout';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network', 'router'].map(name =>
  readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8')).join('\n');
const clientAddress = [1, 2, 3];
function writes(address: number, values: readonly number[]): string { return values.map((v, i) => `W ${address + i} ${v}`).join('\n'); }
function firmware(body: string, address: readonly number[], volume: number, base = 95, gateway = [0, 0, 0]) {
  const result = assemble(`@-9112\nJ entry\n${modules}
entry: M S 5710
      W net_iface_count 1
      W net_ifaces ${base}
      ${writes(2067, address)}
      ${writes(2070, gateway)}
      W serial_unit Z
      W 2545 ${volume}
      ${body}`);
  expect(result.diagnostics).toEqual([]);
  const usage = auditClientImage(result.chunks);
  expect(usage.used).toBeLessThan(4800);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack']);
  for (const c of result.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, result.entry!);
  return m;
}
function disk(volume: number, next = 1) {
  return new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, volume], files: { '/net.seq': encodeWide(next) } }));
}
function client(destination = [1, 2, 4], gateway = [0, 0, 0], protocol = 2, hop = 27) {
  return firmware(`
      C S serial_alloc
      ifn D Z
        M A D
        J failed
      end
      W 1840 A
      W 1841 B
      W 1842 C
      W 1823 1
      W 1824 ${protocol}
      ${writes(1831, clientAddress)}
      ${writes(1834, destination)}
      W 1837 ${hop}
      W 1838 ${protocol === 4 ? 0 : 243}
      W 1839 ${protocol === 4 ? 0 : 7}
      W 1848 ${protocol === 4 ? 1 : 0}
      W 1849 3
      W 1850 123
      W 1851 -9841
      W 1852 9841
      M A 1823
      M B net_ifaces
      C S net_begin_send
      N A Z J failed
loop: C S net_poll
      ife A 1
        W 2170 1
        C S net_consume
        H 0sAAA Z
      end
      C S net_service
      L A Z J failed
      J loop
failed: W 2170 A
      H 0sAAA Z`, clientAddress, 1, 95, gateway);
}
function echo(address = [1, 2, 4], gateway = [0, 0, 0]) {
  return firmware(`
loop: C S net_poll
      ife A 1
        R I net_input
        E I/1 2 J echo_input
        C S net_consume
        J loop
      end
      J progress
echo_input:
      C S net_reverse
      C S net_begin_send
      N A Z J failed
      C S net_consume
progress:
      C S net_service
      L A Z J failed
      ife A 1
        W 2170 1
        H 0sAAA Z
      end
      J loop
failed: W 2170 A
      H 0sAAA Z`, address, 2, 122, gateway);
}
function scenario(destination = [1, 2, 4], gateway = [0, 0, 0], next = 1) {
  const w = new World(); const c = client(destination, gateway); const s = echo(destination);
  w.addMachine('client', c); w.addMachine('server', s);
  const clientNic = w.addInterface('client', 4, [7, 0, -10], 'lan');
  const serverNic = w.addInterface('server', 5, [-3, 4, 8], 'lan');
  w.addDisk('client', [disk(1, next)]); w.addDisk('server', [disk(2)]);
  return { w, c, s, clientNic, serverNic };
}

function router(first: number[], second: number[], routes: number[][], volume: number) {
  return firmware(`
      W net_iface_count 2
      W 2093 122
      ${writes(2094, second)}
      W router_route_count ${routes.length}
      ${writes(2200, routes.flat())}
      C S router_init
      ifn A Z
        W 2170 A
        H 0sAAA Z
      end
      W 2170 1
loop: C S net_poll
      E A 1 C S router_input
      C S net_poll
      E A 1 C S router_input
      C S router_service
      J loop`, first, volume);
}

function routed(two = false, destination = two ? [1, 4, 4] : [1, 3, 4], protocol = 2, hop = 27, loop = false) {
  const w = new World();
  const c = client(destination, [1, 2, 1], protocol, hop);
  const s = echo(two ? [1, 4, 4] : [1, 3, 4], two ? [1, 4, 1] : [1, 3, 1]);
  const r1 = router([1, 2, 1], [1, 3, 1], [
    [1, 1, 2, 0, 0, 0, 0], [1, 1, 3, 1, 0, 0, 0],
    ...(two ? [[2, 1, 4, 1, 1, 3, 2]] : []),
    ...(loop ? [[3, 0, 0, 1, 1, 3, 2]] : []),
  ], 3);
  w.addMachine('client', c); w.addMachine('server', s); w.addMachine('r1', r1);
  w.addInterface('client', 4, [0, 0, 1], 'a');
  const serverNic = w.addInterface('server', 5, [0, 0, 2], two ? 'c' : 'b');
  w.addInterface('r1', 4, [0, 0, 10], 'a'); w.addInterface('r1', 5, [0, 0, 11], 'b');
  w.addDisk('client', [disk(1)]); w.addDisk('server', [disk(2)]); w.addDisk('r1', [disk(3)]);
  let r2: FirmwareProbe | undefined;
  if (two) {
    r2 = router([1, 3, 2], [1, 4, 1], [
      [1, 1, 3, 0, 0, 0, 0], [1, 1, 4, 1, 0, 0, 0], [2, 1, 2, 0, 1, 3, 1],
      ...(loop ? [[3, 0, 0, 0, 1, 3, 1]] : []),
    ], 4);
    w.addMachine('r2', r2); w.addInterface('r2', 4, [0, 0, 12], 'b'); w.addInterface('r2', 5, [0, 0, 13], 'c');
    w.addDisk('r2', [disk(4)]);
  }
  return { w, c, s, r1, r2, serverNic };
}

describe('native next-hop resolution', () => {
  test('resolves link identities through guest requests/replies and preserves end-to-end addresses', () => {
    const { w, c, s } = scenario(); w.advanceTo(2_000_000);
    expect(c.peek(2170)).toBe(1); expect(s.peek(2170)).toBe(1);
    expect(c.sleep?.remaining).toBe(Infinity);
    expect([c.peek(2079), c.peek(2080), c.peek(2081)]).toEqual([-3, 4, 8]);
    expect([s.peek(2079), s.peek(2080), s.peek(2081)]).toEqual([7, 0, -10]);
    expect([c.peek(1345), c.peek(1346), c.peek(1347)]).toEqual([1, 2, 4]);
    expect([c.peek(1348), c.peek(1349), c.peek(1350)]).toEqual(clientAddress);
    expect([c.peek(1364), c.peek(1365), c.peek(1366)]).toEqual([123, -9841, 9841]);
    expect([c.peek(1607), c.peek(1608), c.peek(1609)]).toEqual([123, -9841, 9841]);
    expect(decodeWide([c.peek(2534), c.peek(2535), c.peek(2536)])).toBe(3);
  });

  test('matches whole wide serials across a middle-to-high carry', () => {
    const start = 9841 * 19683 + 9841;
    const { w, c } = scenario([1, 2, -4], [0, 0, 0], start); w.advanceTo(2_000_000);
    expect(c.peek(2170)).toBe(1);
    expect(decodeWide([c.peek(1354), c.peek(1355), c.peek(1356)])).toBe(start);
    expect(decodeWide([c.peek(2130), c.peek(2131), c.peek(2132)])).toBe(start + 1);
    expect(c.peek(2078)).toBe(-4);
  });

  test('compares both subnet components and refuses an absent or off-subnet gateway', () => {
    for (const gateway of [[0, 0, 0], [1, 9, 1]]) {
      const { w, c } = scenario([1, 3, 4], gateway); w.advanceTo(1_000_000);
      expect(c.peek(2170)).toBe(-43);
      expect(c.peek(2125)).toBe(0);
    }
  });

  test('retries a lost neighbour request using the same serial and retained application buffer', () => {
    const run = scenario(); run.serverNic.setLink(false);
    while (run.w.cycles < 1_000_000 && run.c.peek(2139) < 1) run.w.runCycles(6561);
    expect(run.c.peek(2139)).toBe(1);
    const serial = [run.c.peek(2130), run.c.peek(2131), run.c.peek(2132)];
    run.w.runCycles(6561); // first broadcast has been lost on the disconnected receiver
    run.serverNic.setLink(true); run.w.runCycles(2_000_000);
    expect(run.c.peek(2170)).toBe(1);
    expect(run.c.peek(2139)).toBe(2);
    expect([run.c.peek(2130), run.c.peek(2131), run.c.peek(2132)]).toEqual(serial);
    expect([run.c.peek(1607), run.c.peek(1608), run.c.peek(1609)]).toEqual([123, -9841, 9841]);
  });

  test('fails bounded resolution after three sends without a responding peer', () => {
    const run = scenario(); run.serverNic.setLink(false); run.w.advanceTo(2_000_000);
    expect(run.c.peek(2170)).toBe(-42);
    expect(run.c.peek(2139)).toBe(3);
    expect(run.c.peek(2125)).toBe(0);
    expect(run.c.peek(2085)).toBe(0);
  });

  test('expires a cached mapping before use and replaces it through a new query', () => {
    const run = scenario();
    [1, 2, 4, 9, 9, 9, 0, 0, 0, 1].forEach((v, i) => run.c.poke(2076 + i, v));
    run.w.advanceTo(2_000_000);
    expect(run.c.peek(2170)).toBe(1);
    expect([run.c.peek(2079), run.c.peek(2080), run.c.peek(2081)]).toEqual([-3, 4, 8]);
    expect(run.c.peek(2139)).toBe(1);
  });

  test('resolves control traffic while preserving both an owned RX frame and an unacknowledged TX frame', () => {
    const c = firmware(`
      ${writes(2173, [1, 2, 4])}
      W net_rx_owned 1
      M B net_ifaces
      M C 2173
      C S net_begin_control_route
      N A Z J done
loop: C S net_poll
      C S net_service
      E A 2 J done
      L A Z J done
      J loop
done: W 2170 A
      H 0sAAA Z`, clientAddress, 1);
    const originalRx = Int16Array.from({ length: 243 }, (_, i) => i - 121);
    const originalTx = Int16Array.from({ length: 243 }, (_, i) => 121 - i);
    originalRx.forEach((v, i) => c.poke(1337 + i, v));
    originalTx.forEach((v, i) => c.poke(1580 + i, v));
    const w = new World(); w.addMachine('client', c); w.addMachine('server', echo());
    w.addInterface('client', 4, [0, 0, 1], 'lan'); w.addInterface('server', 5, [0, 0, 2], 'lan');
    w.addDisk('client', [disk(1)]);
    w.advanceTo(1_000_000);
    expect(c.peek(2170)).toBe(2);
    expect(Int16Array.from({ length: 243 }, (_, i) => c.peek(1337 + i))).toEqual(originalRx);
    expect(Int16Array.from({ length: 243 }, (_, i) => c.peek(1580 + i))).toEqual(originalTx);
    expect(c.peek(2142)).toBe(1);
  });

  test('delivers to its own address using the NIC identity without a neighbour query', () => {
    const c = client(clientAddress);
    const w = new World(); w.addMachine('self', c);
    w.addInterface('self', 4, [4, 5, 6], 'lan'); w.addDisk('self', [disk(1)]);
    w.advanceTo(1_000_000);
    expect(c.peek(2170)).toBe(1);
    expect([c.peek(2079), c.peek(2080), c.peek(2081)]).toEqual([4, 5, 6]);
    expect(c.peek(2139)).toBe(0);
    expect(decodeWide([c.peek(2534), c.peek(2535), c.peek(2536)])).toBe(2);
  });
});

describe('native router firmware', () => {
  test.each([false, true])('routes an end-to-end datagram and reply across two routers: %s', two => {
    const run = routed(two); run.w.advanceTo(3_000_000);
    expect(run.r1.peek(2170)).toBe(1);
    expect(run.r1.peek(2269)).toBe(2);
    if (two) expect(run.r2!.peek(2269)).toBe(2);
    expect(run.c.peek(2170)).toBe(1); expect(run.s.peek(2170)).toBe(1);
    expect(run.c.peek(1351)).toBe(two ? 25 : 26);
    expect([run.c.peek(1345), run.c.peek(1346), run.c.peek(1347)]).toEqual(two ? [1, 4, 4] : [1, 3, 4]);
    expect([run.c.peek(1348), run.c.peek(1349), run.c.peek(1350)]).toEqual(clientAddress);
    expect([run.c.peek(1364), run.c.peek(1365), run.c.peek(1366)]).toEqual([123, -9841, 9841]);
  });

  test('returns native ICMP no-route errors with the original header and serial', () => {
    const run = routed(false, [1, 9, 4]); run.w.advanceTo(3_000_000);
    expect(run.c.peek(2170)).toBe(1);
    expect(run.c.peek(1338)).toBe(4); expect(run.c.peek(1362)).toBe(3); expect(run.c.peek(1364)).toBe(1);
    expect(run.c.peek(1365)).toBe(1); // quoted version
    expect(run.c.peek(1384)).toBe(1); // quoted A low digit
    expect(run.c.peek(1356)).toBe(1); // outer A low digit
    expect(run.r1.peek(2269)).toBe(0);
  });

  test('reports failed next-hop resolution without losing the offending frame', () => {
    const run = routed(); run.serverNic.setLink(false); run.w.advanceTo(3_000_000);
    expect(run.c.peek(2170)).toBe(1);
    expect(run.c.peek(1338)).toBe(4); expect(run.c.peek(1362)).toBe(3); expect(run.c.peek(1364)).toBe(2);
    expect(run.c.peek(1379)).toBe(27); // original hop limit, before attempted forwarding
    expect(run.c.peek(1356)).toBe(1);
  });

  test('hop exhaustion is reported before forwarding, while a router address is delivered locally', () => {
    const expired = routed(false, [1, 3, 4], 4, 1); expired.w.advanceTo(3_000_000);
    expect(expired.c.peek(2170)).toBe(1);
    expect(expired.c.peek(1362)).toBe(4); expect(expired.c.peek(1364)).toBe(0);
    const local = routed(false, [1, 2, 1], 4, 1); local.w.advanceTo(3_000_000);
    expect(local.c.peek(2170)).toBe(1);
    expect(local.c.peek(1362)).toBe(2);
    expect([local.c.peek(1364), local.c.peek(1365), local.c.peek(1366)]).toEqual([123, -9841, 9841]);
  });

  test('rejects duplicate subnet routes and gateways on the wrong egress subnet', () => {
    for (const extra of [[2, 1, 2, 1, 1, 3, 2], [2, 1, 9, 1, 1, 8, 2]]) {
      const r = router([1, 2, 1], [1, 3, 1], [[1, 1, 2, 0, 0, 0, 0], [1, 1, 3, 1, 0, 0, 0], extra], 3);
      const w = new World(); w.addMachine('r', r); w.addInterface('r', 4, [0, 0, 1], 'a'); w.addInterface('r', 5, [0, 0, 2], 'b');
      w.advanceTo(10_000); expect(r.peek(2170)).toBe(-44); expect(r.sleep?.remaining).toBe(Infinity);
    }
  });

  test('static routes beat default routes and a default-routing loop terminates at the hop limit', () => {
    const routedNormally = routed(true, [1, 4, 4], 2, 27, true);
    routedNormally.w.advanceTo(3_000_000);
    expect(routedNormally.c.peek(2170)).toBe(1);
    expect(routedNormally.c.peek(1338)).toBe(2);
    expect(routedNormally.c.peek(1351)).toBe(25);
    const looping = routed(true, [1, 9, 4], 2, 27, true);
    looping.w.advanceTo(3_000_000);
    expect(looping.c.peek(2170)).toBe(1);
    expect(looping.c.peek(1338)).toBe(4);
    expect(looping.c.peek(1362)).toBe(4);
    expect(looping.c.peek(1379)).toBe(1);
    expect(looping.r1.peek(2269) + looping.r2!.peek(2269)).toBe(26);
  });

  test('rate-limits ICMP generation and never emits errors about ICMP errors', () => {
    const r = firmware(`
      W net_iface_count 2
      W 2093 122
      ${writes(2094, [1, 3, 1])}
      W router_route_count 2
      ${writes(2200, [1, 1, 2, 0, 0, 0, 0, 1, 1, 3, 1, 0, 0, 0])}
      C S router_init
      N A Z J done
      ; A validated datagram fixture and an already resolved return neighbour.
      ${writes(1337, [1, 2, 0, 0, 1, 0, 0, 10, 1, 2, 3, 1, 9, 4, 27, 243, 7, 0, 0, 1])}
      ${writes(2076, [1, 2, 3, 0, 0, 1, 0, 1, 0, 1])}
      W net_input 1337
      W net_input_iface net_ifaces
      W router_error_kind 3
      W router_error_code 1
      C S router_emit_error
      C S net_service
      C S router_emit_error
      R E net_pending
      W 2171 E
      R E router_dropped
      W 2172 E
      M A 2086
      M B 9
      M C 2300
      C S net_add_ticks
wait: H 0sAAA 6561
      C S net_now
      M A net_tick
      M B 2300
      C S wide_compare
      E A -1 J wait
      ; Convert the fixture to a well-framed ICMP error quoting its old header.
      M A 1365
      M B 1337
      M C 27
      C S net_copy
      W 1338 4
      W 1352 Z
      W 1353 Z
      W 1362 3
      W 1363 28
      W 1364 1
      C S router_emit_error
      R E net_pending
      W 2173 E
      ; A fresh ordinary error is allowed now that the nine-tick window passed.
      W 1338 2
      W 1352 243
      W 1353 7
      W 1362 Z
      W 1363 Z
      M A 1364
      M C 216
      C S net_zero
      C S router_emit_error
      R E net_pending
      W 2174 E
done: W 2170 A
      H 0sAAA Z`, [1, 2, 1], 3);
    const w = new World(); w.addMachine('router', r);
    const peer = new FirmwareProbe(['mmio', 'native.stack']);
    const halt = assemble('@500\nH 0sAAA Z');
    for (const c of halt.chunks) c.data.forEach((v, i) => peer.poke(c.addr + i, v));
    peer.poke(REG_P, halt.entry!); w.addMachine('peer', peer);
    w.addInterface('router', 4, [0, 0, 10], 'a'); w.addInterface('router', 5, [0, 0, 11], 'b');
    const nic = w.addInterface('peer', 4, [0, 0, 1], 'a');
    w.advanceTo(200_000);
    expect(r.peek(2170)).toBe(0);
    expect([r.peek(2171), r.peek(2172), r.peek(2173), r.peek(2174)]).toEqual([0, 1, 0, 1]);
    expect(nic.read(-9)).toBe(1);
  });
});
