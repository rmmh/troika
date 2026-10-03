import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';

// This is the production scenario, not a protocol fixture or alternate server.
test('starter world boots native routed services and runs Forth and file navigation from physical keys', () => {
  const session = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const { world, machines, keyboard, images } = session;
  const reads = { client: 0, server: 0 };
  for (const name of ['client', 'server'] as const) {
    const disk = session.disks[name], read = disk.read.bind(disk);
    disk.read = block => { reads[name]++; return read(block); };
  }
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561);
      expect(machines.client.peek(2504)).not.toBe(-2);
      expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(2488) === 0 && machines.client.peek(5368) === 0 && machines.client.read(68) !== 4;
  const press = (...keys: number[]) => { keyboard.queueTrytes(keys); until(idle); };
  until(() => machines.server.peek(2381) === 80);
  keyboard.queueText(' '); until(idle);
  // Physical I/O and guest cycles catch repeated full-tree scans without a flaky wall timer.
  expect(world.cycles).toBeLessThan(10_000_000);
  expect(reads.server).toBeLessThan(350);
  expect(reads.client).toBeLessThan(250);
  expect(starterScreen(machines.client)).toContain('Welcome to Troika World');
  expect(Array.from({ length: 9 }, (_, i) => machines.client.peek(2067 + i))).toEqual([1,2,7,1,2,9,1,3,3]);
  expect(images.client.reserved).toBeLessThanOrEqual(12501);
  expect(images.server.reserved).toBeLessThanOrEqual(12501);
  expect(images.archive.reserved).toBeLessThanOrEqual(12501);
  for (const name of ['router','dns','dhcp'] as const) expect(images[name].reserved).toBeLessThanOrEqual(9666);
  press(TEXT_KEYS.activate);
  expect(starterScreen(machines.client)).toContain('Hello from native Forth');
  keyboard.queueText('!'); until(idle); press(TEXT_KEYS.activate);
  expect(starterScreen(machines.client).split('\n')[0]).toBe('Hello from native Forth!');
  // Defined SUBMIT ran locally. The server would reject a POST to this local-only form route.
  expect(machines.client.peek(6225)).toBe(200); expect(machines.client.peek(5363)).toBe(1);
  press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(machines.client)).toContain('Welcome to Troika World');
  press(TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(machines.client)).toContain('Public file library');
  press(TEXT_KEYS.activate);
  expect(starterScreen(machines.client)).toContain('Files live on the server');
  expect(machines.client.peek(5427)).toBe(1); expect(machines.server.peek(2494)).toBe(0);
  press(TEXT_KEYS.home);
  expect(starterScreen(machines.client)).toContain('Welcome to Troika World');
}, 60_000);
