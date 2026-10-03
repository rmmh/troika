import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { REG_P, REG_S } from '../src/core/machine';
import { World } from '../src/core/world';
import { auditClientImage } from '../src/firmware/layout';
import { FirmwareProbe } from './firmwareProbe';
import { decodeWide } from '../src/core/wide';

const driver = readFileSync(new URL('../firmware/include/netDevice.asm', import.meta.url), 'utf8');
const validation = readFileSync(new URL('../firmware/include/frame.asm', import.meta.url), 'utf8');
function machine(code: string) {
  const program = assemble(`@-9112\nJ entry\n${driver}\n${validation}\nentry: M S 5710\n${code}`);
  expect(program.diagnostics).toEqual([]);
  expect(auditClientImage(program.chunks).used).toBeLessThan(1200);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'native.stack']);
  for (const c of program.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, program.entry!);
  return m;
}
function base(protocol = 2): Int16Array {
  const f = new Int16Array(243);
  f.set([1, protocol, 0, 0, 1, 0, 0, 2, 1, 2, 3, 1, 2, 4, 27, 243, 80, 0, 0, 1]);
  return f;
}
function validate(frame: Int16Array) {
  const m = machine('M A 1337\nC S frame_validate\nH 0sAAA Z');
  frame.forEach((v, i) => m.poke(1337 + i, v));
  expect(m.run(100_000)).toBe('sleep-forever');
  expect(m.peek(REG_S)).toBe(5710);
  return m.peek(-13);
}

describe('native packet validation', () => {
  test('accepts datagrams, bootstrap DHCP and full signed address tuples', () => {
    expect(validate(base())).toBe(0);
    const dhcp = base(); dhcp.fill(0, 5, 14); dhcp[15] = 68; dhcp[16] = 67;
    expect(validate(dhcp)).toBe(0);
    const signed = base(); signed.set([-2, 0, -9841], 8); signed.set([1, -9841, -9841], 17);
    expect(validate(signed)).toBe(0);
  });

  test.each([1, 2])('accepts neighbour kind %i with the correct link-address convention', kind => {
    const f = base(1); f[15] = f[16] = 0; f[25] = kind;
    if (kind === 1) f.fill(0, 5, 8);
    expect(validate(f)).toBe(0);
    if (kind === 1) f[7] = 1; else f.fill(0, 5, 8);
    expect(validate(f)).toBe(-40);
  });

  test.each([1, 2, 3, 4, 5, 6])('checks stream kind %i field ranges', kind => {
    const f = base(3); f[25] = kind;
    if (kind !== 1) f[22] = 1;
    if (kind === 3) f[24] = 9841;
    if (kind === 4) { f[23] = 9840; f[26] = 216; }
    if (kind === 5) f[23] = 9841;
    if (kind === 6) { f[26] = 1; f[27] = 2; }
    expect(validate(f)).toBe(0);
    f[22] = -1;
    expect(validate(f)).toBe(-40);
  });

  test.each([1, 2, 3, 4])('checks ICMP kind %i payload bounds', kind => {
    const f = base(4); f[15] = f[16] = 0; f[25] = kind;
    f[26] = kind <= 2 ? 27 : 28;
    if (kind === 3) f[27] = 1;
    if (kind > 2) f.set(base().slice(0, 27), 28);
    expect(validate(f)).toBe(0);
    f[26] = kind <= 2 ? 28 : 27;
    expect(validate(f)).toBe(-40);
  });

  test.each([[0, 0], [1, 5], [14, 0], [14, 28], [15, 0], [16, -1], [17, -1],
    [19, 0], [20, 1], [23, 1], [24, 1], [25, 1], [26, -1], [26, 217], [242, 1]])(
    'rejects invalid datagram field %i=%i', (offset, value) => {
      const f = base(); f[offset!] = value!; expect(validate(f)).toBe(-40);
    },
  );

  test('rejects unspecified/broadcast non-DHCP endpoints and allows RESET before acceptance', () => {
    for (const offset of [2, 5, 8, 11]) {
      const f = base(); f.fill(0, offset, offset + 3); expect(validate(f)).toBe(-40);
    }
    const reset = base(3); reset[25] = 6; reset[26] = 1; reset[27] = 1;
    expect(validate(reset)).toBe(0);
    reset[27] = 7; expect(validate(reset)).toBe(-40);
  });

  test('rejects ICMP errors about errors, broadcasts, or a mismatched serial', () => {
    const f = base(4); f[15] = f[16] = 0; f[25] = 3; f[26] = 28; f[27] = 1;
    f.set(base().slice(0, 27), 28);
    expect(validate(f)).toBe(0);
    const mismatch = f.slice(); mismatch[47] = 2; expect(validate(mismatch)).toBe(-40);
    const broadcast = f.slice(); broadcast.fill(0, 33, 36); expect(validate(broadcast)).toBe(-40);
    const recursive = f.slice(); recursive[29] = 4; recursive[53] = 3; expect(validate(recursive)).toBe(-40);
    const neighbour = f.slice(); neighbour[29] = 1; expect(validate(neighbour)).toBe(-40);
  });
});

test('two native machines exchange a datagram using Q/R hardware and the shared world clock', () => {
  const client = machine(`
      ; Build the whole request in guest RAM; hardware supplies only link source.
      W 1823 1
      W 1824 2
      W 1830 2
      W 1831 1
      W 1832 2
      W 1833 3
      W 1834 1
      W 1835 2
      W 1836 4
      W 1837 27
      W 1838 243
      W 1839 7
      W 1840 1
      W 1841 -9841
      W 1842 -9841
      W 1849 2
      W 1850 -9841
      W 1851 9841
      M A 1823
      M B 95
      C S net_send
      N A Z J done
wait: M A 1337
      M B 95
      C S net_receive
      E A -4 J wait
      N A Z J done
      M A 1337
      C S frame_validate
      N A Z J done
      M A 2090
      M B 95
      C S net_clock
done: W 2066 A
      H 0sAAA Z`);
  const server = machine(`
listen: M A 1337
      M B 122
      C S net_receive
      E A -4 J listen
      N A Z J listen
      M A 1337
      C S frame_validate
      N A Z J listen
      M A 1823
      M B 1337
      M C 243
copy: D A B
      I C -1
      N C Z J copy
      ; Swap link and network endpoints and ports using guest instructions.
      M A 1828
      M B 1339
      M C 3
link: D A B
      I C -1
      N C Z J link
      M A 1831
      M B 1348
      M C 3
source: D A B
      I C -1
      N C Z J source
      M A 1834
      M B 1345
      M C 3
destination: D A B
      I C -1
      N C Z J destination
      R E 1353
      W 1838 E
      R E 1352
      W 1839 E
      M A 1823
      M B 122
      C S net_send
      W 2066 A
      H 0sAAA Z`);
  const w = new World(); w.addMachine('client', client); w.addMachine('server', server);
  w.addInterface('client', 4, [0, 0, 1], 'lan'); w.addInterface('server', 5, [0, 0, 2], 'lan');
  w.advanceTo(100_000);
  expect(client.sleep?.remaining).toBe(Infinity); expect(server.sleep?.remaining).toBe(Infinity);
  expect(client.peek(2066)).toBe(0); expect(server.peek(2066)).toBe(0);
  expect([client.peek(1364), client.peek(1365)]).toEqual([-9841, 9841]);
  expect([client.peek(1354), client.peek(1355), client.peek(1356)]).toEqual([1, -9841, -9841]);
  expect([client.peek(1345), client.peek(1346), client.peek(1347)]).toEqual([1, 2, 4]);
  expect([client.peek(1348), client.peek(1349), client.peek(1350)]).toEqual([1, 2, 3]);
  expect(client.peek(1352)).toBe(7); expect(client.peek(1353)).toBe(243);
  expect(decodeWide([client.peek(2090), client.peek(2091), client.peek(2092)])).toBeGreaterThanOrEqual(2);
  expect(client.stackHighWater).toBeLessThanOrEqual(3);
  expect(server.stackHighWater).toBeLessThanOrEqual(3);
});
