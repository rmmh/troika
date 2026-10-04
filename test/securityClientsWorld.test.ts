import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildWorldBrowser } from '../src/world/browserImages';
import { createDiskImage } from '../src/firmware/diskImage';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { REG_P } from '../src/core/machine';
import { encodeWide } from '../src/core/wide';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('three native camera clients retain independent responses and lost replies do not repeat motion', () => {
  const s = createStarterWorld(source), server = s.machines.security;
  const clients = [20, 21, 22].map((host, i) => {
    const built = buildWorldBrowser(name => name === 'npcBrowser' ? `
npc_entry: R E 68 N E 4 J npc_entry R E 69 M S 5710
W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 ${host} W 2545 ${host}
W 2070 1 W 2071 3 W 2072 9 W 2073 1 W 2074 3 W 2075 3
C S browser_init ifl A Z J failed end W 2207 1
start: R E 2208 E E Z J start
M A @target M B 27 C S browser_open ifl A Z J failed end
loop: C S browser_step W 2210 A ifl A Z J failed end J loop
failed: W 2199 A H 0sAAA Z
dhcp_client_input: O S P
dhcp_client_service: O S P
target: "http://security.world/index"` : source(name), true);
    const id = `camera-client-${host}`, m = s.world.addMachine(id);
    for (const c of built.resident.image.chunks) c.data.forEach((v, j) => m.poke(c.addr + j, v));
    m.poke(REG_P, built.resident.image.entry!);
    const nic = s.world.addInterface(id, 4, [0, 2, i + 1], 'b');
    s.world.addDisk(id, [new BlockMedium(81, false, createDiskImage({blocks: 81, volumeId: [0, 0, host], files: {
      '/net.seq': encodeWide(1), ...Object.fromEntries(Object.entries(built.phases).map(([name, p]) => [`/${name}`, p.file])),
    }}))]);
    const keyboard = new TextDevice(); m.attach(keyboard); m.attach(new DisplayDevice(a => m.peek(a), (a, v) => m.poke(a, v)));
    return {m, nic, keyboard};
  });
  let simultaneous = 0, hold = true, dropReply = false, dropped = 0;
  for (const [i, c] of clients.entries()) {
    const receive = c.nic.receive.bind(c.nic);
    c.nic.receive = frame => {
      if (frame[1] === 3 && frame[25] === 4) {
        if (hold) return;
        if (i === 0 && dropReply) { dropReply = false; dropped++; return; }
      }
      receive(frame);
    };
  }
  const until = (done: () => boolean) => { const end = s.world.cycles + 50_000_000;
    while (!done() && s.world.cycles < end) {
      s.world.runCycles(6561); expect(server.peek(2199)).toBe(0);
      for (const c of clients) expect(c.m.peek(2199)).toBe(0);
      const current = server.peek(2300);
      simultaneous = Math.max(simultaneous, [0, 1, 2].filter(i => {
        const state = server.peek(i === current ? 2380 : server.peek(2312 + i) + 518);
        return state >= 2 && state <= 5;
      }).length);
    }
    expect(done()).toBe(true);
  };
  const ready = () => clients.every(({m}) => m.peek(2210) === 1 && m.peek(2504) === 4 && m.peek(5446) === 1 && m.peek(2488) === 0);
  until(() => server.peek(2381) === 80 && server.peek(2326) !== 0);
  for (const c of clients) c.keyboard.queueText(' ');
  until(() => clients.every(c => c.m.peek(2207) === 1));
  for (const c of clients) c.m.poke(2208, 1);
  until(() => simultaneous === 3); hold = false; until(ready);
  expect(clients.every(c => starterScreen(c.m).includes('@........'))).toBe(true);
  dropReply = true;
  for (const c of clients) c.keyboard.queueTrytes([TEXT_KEYS.activate]);
  until(() => ready() && clients.every(c => /Moves: [1-3]/.test(starterScreen(c.m))));
  expect(dropped).toBe(1); expect(server.peek(2510)).toBe(3); expect(server.peek(2511)).toBe(3);
  expect(clients.map(c => starterScreen(c.m).match(/Moves: [1-3]/)![0]).sort()).toEqual(['Moves: 1', 'Moves: 2', 'Moves: 3']);
}, 120_000);
