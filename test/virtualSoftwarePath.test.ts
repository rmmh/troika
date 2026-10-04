import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { linkFirmware } from '../src/firmware/link';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { REG_P } from '../src/core/machine';
import { FirmwareProbe } from './firmwareProbe';

const linked = linkFirmware([
  {name:'config', source:`$h_host_match: 2200
$h_path_len: 2201
$h_path: 2210
$url_kind: 2300
$url_port: 2301
$url_host_len: 2302
$url_host: 2310
$virtual_host_count: 1`},
  {name:'virtual', source:readFileSync(new URL('../firmware/include/httpVirtual.asm', import.meta.url), 'utf8')},
  {name:'probe', source:`entry: M S 5710 W h_host_match @directory C S http_virtual_lookup W 2199 A H 0sAAA Z
; The first lookup misses; the second captures the path without touching scratch.
fs_lookup: R E 2190 I E 1 W 2190 E ife E 1 M A -12 O S P end
 W 2191 A W 2192 B M A Z O S P
net_copy: E C Z O S P D A B I C -1 J net_copy
dns_equal: M A Z O S P
http_ok: M A Z O S P
hs_index: "/index"
virtual_hosts: 1 "axxx"
directory: "xxx"`},
]);

test.each([
  ['/p0026', '/public/xxx/apps/a/a/p0026'],
  ['/c0027', '/public/xxx/apps/a/b/c0027'],
  ['/s0728', '/public/xxx/apps/a/_/s0728'],
  ['/s0729', '/public/xxx/apps/b/a/s0729'],
  ['/p9840', '/public/xxx/apps/n/n/p9840'],
])('native software fallback confines %s to its physical bucket', (path, expected) => {
  const m = new FirmwareProbe(['mmio', 'network.state', 'native.stack', 'scratch']);
  for (const chunk of linked.image.chunks) chunk.data.forEach((v,i) => m.poke(chunk.addr+i,v));
  m.poke(REG_P, linked.image.labels.get('entry')!); m.poke(2201,path.length);
  encodeText(path).forEach((v,i) => m.poke(2210+i,v));
  for (let address=5737; address<=5954; address++) m.poke(address,733);
  expect(m.run(100_000)).toBe('sleep-forever');
  expect(m.peek(2199)).toBe(0); expect(m.peek(2190)).toBe(2);
  expect(m.peek(2191)).toBe(5711); expect(m.peek(2192)).toBe(26);
  expect(decodeText(Array.from({length:26}, (_,i) => m.peek(5711+i)))).toBe(expected);
  for (let address=5737; address<=5954; address++) expect(m.peek(address), String(address)).toBe(733);
  expect(decodeText(Array.from({length:path.length}, (_,i) => m.peek(2210+i)))).toBe(path);
});
