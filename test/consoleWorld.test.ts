import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';

test('native file console creates, lists and removes directories, reports errors, then returns to browsing', () => {
  const r = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-1); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => (machines.client.peek(2504) === 5 || (machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(5368) === 0)) && machines.client.peek(2488) === 0 && machines.client.read(68) !== 4;
  function press(key: number) { keyboard.queueTrytes([key]); until(idle); }
  function command(text: string) { keyboard.queueText(text); until(idle); press(TEXT_KEYS.activate); return starterScreen(machines.client); }
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  press(TEXT_KEYS.console);
  expect(machines.client.peek(2504)).toBe(5); expect(machines.client.peek(5434)).toBe(0);
  expect(starterScreen(machines.client)).toContain('dir type del mkdir rmdir');
  expect(command('DIR /')).toContain('console');
  expect(command('mkdir /docs')).toContain('ok');
  expect(command('dir /')).toContain('docs/');
  expect(command('type /missing')).toContain('error -12');
  expect(machines.client.peek(6960)).toBe(0);
  expect(command('unknown')).toContain('error -137');
  expect(command('rmdir /docs')).toContain('ok');
  expect(command('dir /')).not.toContain('docs/');
  expect(command('exit')).toContain('Welcome to Troika World');
  expect(machines.client.peek(2504)).toBe(4); expect(r.images.client.reserved).toBeLessThanOrEqual(12501);
}, 30_000);
