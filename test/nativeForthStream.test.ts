import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { encodeWide } from '../src/core/wide';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network',
  'stream', 'streamData', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
const source = 'VARIABLE result : twice DUP + ; : LOAD ( native stream ) 21 twice result ! ;';
function machine(host: number, body: string, text: string) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
      W 2067 1 W 2068 2 W 2069 ${host} W 2545 ${host}
      ${body}
f_validate_navigation: M A -87 O S P
source: ${JSON.stringify(text)}
hook: "LOAD"` }]);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack',
    'forth.state', 'page.script', 'scratch', 'url.state']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, linked.image.entry!); return m;
}
const service = `C S net_poll ifn A Z C S stream_input E A 2 C S net_discard_input end C S stream_service`;
test.each([false, true])('native stream source seals only after a complete EOF; truncated=%s', truncated => {
  const text = truncated ? 'VARIABLE result : LOAD 7 result !' : source;
  const sender = machine(1, `
      W 2190 1 W 2191 2 W 2192 2 W 2196 ${text.length}
      M A 2190 M B 80 M C 243 C S stream_connect
send_loop: ${service}
      R E st_state N E 4 J send_loop
      R E st_tx_waiting N E Z J send_loop
      R B 2196 E B Z J finish
      ifg B 13 M B 13 end
      W 2197 B M A @source R E 2195 A A E C S stream_send N A Z J send_loop
      R E 2195 R F 2197 A E F W 2195 E
      R E 2196 S E F W 2196 E J send_loop
finish: C S stream_shutdown J send_loop`, text);
  const receiver = machine(2, `
      C S f_reset M A 80 C S stream_listen
receive_loop: ${service}
      M A 5711 M B 7 C S stream_read W 2194 B
      ifg A Z M B A M A 5711 C S f_feed N A Z J failed end
      R E 2194 E E 1 J sealed
      J receive_loop
sealed: C S f_seal N A Z J failed
      M A @hook M B 4 C S f_find N A Z J failed M A C C S f_invoke N A Z J failed
      W 2198 1 J completed
failed: W 2199 A W 2198 -1
completed: ${service} J completed`, text);
  const world = new World();
  for (const [name, m, id] of [['sender', sender, 1], ['receiver', receiver, 2]] as const) {
    world.addMachine(name, m); world.addInterface(name, 4, [0, 0, id * 10], 'lan');
    world.addDisk(name, [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, id], files: { '/net.seq': encodeWide(1) } }))]);
  }
  world.runCycles(6561);
  while (world.cycles < 3_000_000 && sender.peek(2196) !== 0) world.runCycles(6561);
  expect(receiver.peek(5363)).toBe(0); expect(receiver.peek(5333)).toBe(0);
  while (world.cycles < 3_000_000 && receiver.peek(2198) === 0) world.runCycles(6561);
  expect(receiver.peek(2199)).toBe(truncated ? -90 : 0); expect(receiver.peek(2198)).toBe(truncated ? -1 : 1);
  expect(receiver.peek(5333)).toBe(truncated ? 0 : 42); expect(receiver.peek(5363)).toBe(truncated ? 0 : 1);
  expect(receiver.peek(5360)).toBeLessThanOrEqual(4739); expect(receiver.stackHighWater).toBeLessThanOrEqual(30);
  expect(sender.peek(2196)).toBe(0);
});
