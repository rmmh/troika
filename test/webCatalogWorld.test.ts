import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { decodeText, encodeText } from '../src/core/textEncoding';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('production keyboard navigation reaches the atlas, reads a site, follows its ring and crosses native servers', () => {
  const s = createStarterWorld(source, {programs: true}), m = s.machines.client;
  expect(s.web?.servers).toHaveLength(5); expect(s.machines.dns.peek(2280)).toBe(107);
  for (const server of s.web!.servers) {
    expect(server.image.reserved).toBeLessThanOrEqual(12501);
    const write = server.machine.write.bind(server.machine);
    server.machine.write = (address, value) => {
      if ((address >= -9112 && address <= -3686) || (address >= -3631 && address <= -365) ||
          (address >= 365 && address <= 1336) || address >= 7007) throw new Error(`${server.id} changed code at ${address}`);
      write(address, value);
    };
  }
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 40_000_000;
    while (!done() && s.world.cycles < end) {
      s.world.runCycles(6561);
      expect(m.peek(2504), starterScreen(m)).not.toBe(-2);
      for (const server of s.web!.servers) expect(server.machine.peek(2199), server.id).toBe(0);
    }
    expect(done(), starterScreen(m)).toBe(true);
  };
  until(() => s.web!.servers.every(server => server.machine.peek(2198) === 1 && server.machine.sleep?.remaining === Infinity));
  // The live catalog grows with each published program. Its original 10m
  // assertion measured five 243-block disks, not today's software collection.
  // Keep the 40m watchdog above; fixed-size FAT and thousand-program fixtures
  // enforce startup performance without conflating content growth with cost.
  console.info('Production disk blocks:', s.web!.catalog.clusters.map(c=>`${c.server}:${c.blocks}`).join(', '));
  console.info(`Five populated virtual servers ready and sleeping at ${s.world.cycles} world cycles`);
  s.world.queueAction({kind: 'text', host: 'client', cells: encodeText(' ')});
  const idle = () => !s.world.hasPendingActions && m.read(68) !== 4 && m.peek(2488) === 0 &&
    m.peek(2504) === 4 && m.peek(5446) === 1 && m.peek(5368) === 0;
  until(idle);
  const press = (key: number) => {s.world.queueAction({kind: 'text', host: 'client', cells: [key]}); until(idle);};
  const read = (pointer: number, count: number) => decodeText(Array.from({length: count}, (_, i) => m.peek(pointer + i)));
  const openLink = (label: string) => {
    let target = -1;
    for (let i = 0; i < m.peek(5414); i++) {
      const record = 4739 + i * 18;
      if (m.peek(record) === 4 && read(m.peek(record + 1), m.peek(record + 2)) === label) target = i;
    }
    expect(target, label).toBeGreaterThanOrEqual(0);
    for (let i = 0; m.peek(5444) !== target && i < 27; i++) press(TEXT_KEYS.next);
    expect(m.peek(5444), label).toBe(target); press(TEXT_KEYS.activate);
    expect(m.peek(6225), label).toBe(200);
  };
  openLink('Small Web: 100 sites'); expect(starterScreen(m)).toContain('The Small Web Atlas');
  openLink('Out in the Field'); expect(starterScreen(m)).toContain('The Moss Ledger');
  openLink('The Moss Ledger'); expect(starterScreen(m)).toContain('north wall');
  openLink('A wall after rain'); expect(starterScreen(m)).toContain('pale cushions');
  const before = starterScreen(m); press(TEXT_KEYS.down); expect(starterScreen(m)).not.toBe(before);
  press(TEXT_KEYS.home); expect(starterScreen(m)).toContain('The Moss Ledger');
  expect(read(6062, m.peek(6117))).toBe('moss.world');
  openLink('Next: Low Water Notebook'); expect(read(6062, m.peek(6117))).toBe('tide.world');
  openLink('Previous: The Moss Ledger'); expect(read(6062, m.peek(6117))).toBe('moss.world');
  openLink('Listening Corners'); expect(read(6062, m.peek(6117))).toBe('soundmap.world');
  openLink('Market, before opening'); expect(starterScreen(m)).toContain('broom scratching');
  press(TEXT_KEYS.home); openLink('The Small Web Atlas'); openLink('A Page of My Own');
  openLink('Kit\'s Unsorted Corner'); expect(read(6062, m.peek(6117))).toBe('kit.world');
  openLink('A good afternoon, itemized'); expect(starterScreen(m)).toContain('Found a pencil');
}, 180_000);
