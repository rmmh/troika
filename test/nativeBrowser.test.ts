import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { encodeWide } from '../src/core/wide';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { linkPhasedFirmware } from '../src/firmware/phases';
import { createDiskImage } from '../src/firmware/diskImage';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { FirmwareProbe } from './firmwareProbe';
const module = (name: string) => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') });
const counted = (s: string) => `${s.length}:${s}`;
const code = ': LOAD 0 FIELD@ 0 TEXT! ;';
const body = `PAGE 1\nT 6:before\nF 9:/app/save\nI 1:x 5:hello\nS 4:send\nC ${counted(code)}\n`;
const clientImage = linkPhasedFirmware({ capacity: 1906, allowMargin: true,
  resident: ['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','dns','dnsClient','dhcpClient',
    'stream','streamData','url','forthVm','forthPage','forthLookup','pageState','http','httpClient','image','browserConnect','browserResponse','browser'].map(module).concat([{ name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 2 W 2069 1 W 2545 1
      C S browser_init ifl A Z J failed end M A @url M B 26 C S browser_open ifl A Z J failed end
loop: C S browser_step ifl A Z J failed end J loop
failed: W 2199 A H 0sAAA Z
url: "http://[__N.__O.__O]/index"` }]),
  phases: {
    compile: ['pageCompilePhase','forthLex','forthCompile','page'].map(module),
    interact: ['pageInteractPhase','httpSend','pageForm','text','pageView','pageInput','pageUi','pageKeys','pageRequest','pageTransmit'].map(module),
    download: ['downloadPhase','fatMutate','fatGrow'].map(module),
  },
});
const serverImage = linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','stream','streamData','dns','url','http','httpRequest','httpEmit'].map(module).concat([{ name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 2 W 2069 2 W 2545 2
      M A @origin M B 21 C S url_parse C S url_commit M A Z C S http_init M A 80 C S stream_listen
loop: C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end C S stream_service
      R E 2191 E E 1 J header E E 2 J body E E 3 J close E E 4 J closed
      C S stream_peek ifl A Z J failed end
      ifn B Z W 2190 B C S http_feed N A Z J failed R A 2190 C S stream_consume end
      R E h_phase N E 3 J loop R E h_host_match N E 1 J failed
      R E 2198 I E 1 W 2198 E R E h_length W 2196 E
      R E h_method
      ife E 1 M E @page W 2193 E W 2194 ${body.length} M C 2
      else M E @saved W 2193 E W 2194 5 M C 1 end
      M A 200 R B 2194 C S http_response_header N A Z J failed W 2191 1
header: M A h_line R B h_line_len C S stream_send E A -1 J loop N A Z J failed W 2191 2
body: R A 2193 R B 2194 C S stream_send E A -1 J loop N A Z J failed W 2191 3
close: C S stream_shutdown E A -1 J loop N A Z J failed W 2191 4
closed: R E st_state N E 6 J loop
      M A Z C S http_init W 2191 Z W 2197 Z J loop
http_body: R E 2197 M F 2552 A F E W F A I E 1 W 2197 E M A Z O S P
failed: W 2199 A H 0sAAA Z
origin: "http://[__N.__O.__O]/"
page: "${body.replaceAll('\n', '\\n')}"
saved: "Saved"` }]));
function fixture(corruptCompiler = false) {
  class Client extends FirmwareProbe {
    phaseLoads = 0;
    receivedDuringLoad = false;
    override write(address: number, value: number) {
      const region = CLIENT_LAYOUT.find(r => address >= r.start && address < r.start + r.size);
      if ((region?.name.startsWith('resident.') || region?.name === 'margin') && (address < clientImage.base || address >= clientImage.base + clientImage.capacity)) throw new Error('browser wrote resident code');
      if (address === 2142 && value === 1 && this.peek(2488) === 1) this.receivedDuringLoad = true;
      if (address === 2487 && value === 1) this.phaseLoads++;
      super.write(address, value);
    }
  }
  const client = new Client(CLIENT_LAYOUT.map(r => r.name));
  const server = new FirmwareProbe(['mmio','network.state','network.buffers','filesystem','native.stack','url.state','scratch','page.text']);
  for (const [m, linked] of [[client, clientImage.resident], [server, serverImage]] as const) {
    for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    m.poke(REG_P, linked.image.labels.get('entry')!);
  }
  const keyboard = new TextDevice(); client.attach(keyboard);
  const world = new World();
  const phaseFiles = Object.fromEntries(Object.entries(clientImage.phases).map(([name, phase]) => [`/${name}`, [...phase.file]]));
  if (corruptCompiler) phaseFiles['/compile']![3] = phaseFiles['/compile']![3] === 0 ? 1 : 0;
  for (const [name, m, id, files] of [['client', client, 1, phaseFiles], ['server', server, 2, {}]] as const) {
    world.addMachine(name, m); world.addDisk(name, [new BlockMedium(54, false, createDiskImage({ blocks: 54, volumeId: [0,0,id], files: { '/net.seq': encodeWide(1), ...files } }))]);
    world.addInterface(name, 4, [0,0,id * 10], 'lan');
  }
  function until(predicate: () => boolean) {
    const end = world.cycles + 15_000_000;
    while (world.cycles < end && !predicate() && client.peek(2199) === 0 && server.peek(2199) === 0) world.runCycles(6561);
    expect(client.peek(2199)).toBe(0); expect(server.peek(2199)).toBe(0); expect(predicate()).toBe(true);
  }
  return { client, server, keyboard, world, until };
}
test('native browser navigates, runs LOAD, edits and POSTs across live disk phase transitions', () => {
  const r = fixture(); r.until(() => r.client.peek(2504) === 4 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(decodeText(Array.from({ length: 5 }, (_, i) => r.client.peek(2552 + i)))).toBe('hello');
  expect(r.client.peek(5444)).toBe(2); expect(r.client.phaseLoads).toBeGreaterThanOrEqual(4);
  expect(r.client.peek(-9841)).toBe('h'.charCodeAt(0));
  r.keyboard.queueText('!\n'); r.until(() => r.client.peek(2504) === 4 && r.client.peek(5427) === 1 && r.client.peek(5446) === 1 && r.client.peek(2488) === 0);
  expect(decodeText(Array.from({ length: 5 }, (_, i) => r.client.peek(2552 + i)))).toBe('Saved');
  expect(r.server.peek(2198)).toBe(2); expect(r.server.peek(2196)).toBe(10);
  expect(Array.from({ length: 10 }, (_, i) => r.server.peek(2552 + i))).toEqual([1,1,...encodeText('x'),6,...encodeText('hello!')]);
  expect(r.client.phaseLoads).toBeGreaterThanOrEqual(6); expect(r.client.stackHighWater).toBeLessThanOrEqual(120);
  expect(r.client.receivedDuringLoad).toBe(true);
});

test('live browser rejects a corrupt compiler image without accepting the response or running LOAD', () => {
  const r = fixture(true);
  while (r.world.cycles < 15_000_000 && r.client.peek(2199) === 0) r.world.runCycles(6561);
  expect(r.client.peek(2199)).toBe(-116); expect(r.client.peek(2504)).toBe(-1);
  expect(r.client.peek(5434)).toBe(0); expect(r.client.peek(5363)).toBe(0); expect(r.client.peek(6122)).toBe(0);
});
