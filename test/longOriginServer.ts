import type { StarterSession } from '../src/world/checkpoint';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
import { linkFirmware } from '../src/firmware/link';
import { createDiskImage } from '../src/firmware/diskImage';
import { BlockMedium } from '../src/core/blockDevice';
import { REG_P } from '../src/core/machine';
import { encodeWide } from '../src/core/wide';
import { encodeText } from '../src/core/textEncoding';

/** Initial guest firmware/media/configuration only; all request handling is native. */
export function addLongOriginServer(s: StarterSession, source: (name: string) => string) {
  const host = `${'a'.repeat(27)}.${'b'.repeat(26)}`, path = '/app/abcdefghijklm';
  const origin = `http://${host}:9841/`, canonical = `http://${host}:9841${path}`;
  const raw = `HTTP://${host.toUpperCase()}.:${'0'.repeat(23)}9841${path}`;
  const script = `: A ${'0 '.repeat(321)}; : LOAD ; `;
  const body = `PAGE 1\nT 1458:${'x'.repeat(1458)}\nC ${script.length}:${script}\n${'B\n'.repeat(25)}`;
  const image = linkFirmware([
    ...[...WORLD_BASIC_MODULES, 'netWait', 'dns', 'stream', 'streamData', 'url',
      'http', 'httpRequest', 'httpEmit', 'httpForm', 'httpFiles'].map(name => ({name, source: source(name)})),
    {name: 'startup', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
W 2067 1 W 2068 3 W 2069 8 W 2545 12 W 2070 1 W 2071 3 W 2072 9
M A @origin M B ${origin.length} C S url_parse N A Z J failed C S url_commit
C S http_files_init N A Z J failed M A 9841 C S stream_listen N A Z J failed
C S net_wait_init
loop: C S http_files_step C S http_server_wait J loop
http_file_type: M A 2 O S P
http_file_post: M A 405 O S P
failed: W 2199 A H 0sAAA Z
origin: "${origin}"`},
  ]);
  const id = 'long-origin', machine = s.world.addMachine(id);
  for (const chunk of image.image.chunks) chunk.data.forEach((v, i) => machine.poke(chunk.addr + i, v));
  machine.poke(REG_P, image.image.labels.get('entry')!);
  s.world.addInterface(id, 4, [0, 0, 120], 'b');
  s.world.addDisk(id, [new BlockMedium(81, false, createDiskImage({blocks: 81, volumeId: [0, 0, 12],
    files: {'/net.seq': encodeWide(1), [`/public${path}`]: encodeText(body)}}))]);
  // Append one static record before the native DNS server validates its table.
  const index = s.machines.dns.peek(2280), base = 2552 + index * 63;
  s.machines.dns.poke(2280, index + 1); s.machines.dns.poke(base, host.length);
  encodeText(host).forEach((v, i) => s.machines.dns.poke(base + 1 + i, v));
  [1, 3, 8, 729].forEach((v, i) => s.machines.dns.poke(base + 55 + i, v));
  return {machine, host, path, raw, canonical, body};
}
