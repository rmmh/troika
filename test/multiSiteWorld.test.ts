import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';

test('native address entry visits independent sites and preserves the correct origin across downloads and errors', () => {
  const r = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561);
      expect(machines.client.peek(2504)).not.toBe(-2);
      expect(machines.server.peek(2199)).toBe(0); expect(machines.archive.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => (machines.client.peek(2504) === 5 || (machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(5368) === 0)) && machines.client.peek(2488) === 0 && machines.client.read(68) !== 4;
  const screen = () => starterScreen(machines.client);
  const origin = () => Array.from({ length: 61 }, (_, i) => machines.client.peek(6062 + i));
  function press(...keys: number[]) { keyboard.queueTrytes(keys); until(idle); return screen(); }
  function command(text: string) { keyboard.queueText(text); until(idle); return press(TEXT_KEYS.activate); }
  until(() => machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80);
  keyboard.queueText(' '); until(idle);
  const bbsOrigin = origin();
  press(TEXT_KEYS.console);
  expect(command('open')).toContain('error');
  expect(command('open http://')).toContain('error');
  expect(command('open http://missing.world/')).toContain('error -51');
  expect(origin()).toEqual(bbsOrigin);
  expect(command('open http://files.world/index')).toContain('Files World archive');
  expect(machines.client.peek(2504)).toBe(4); const archiveOrigin = origin(); expect(archiveOrigin).not.toEqual(bbsOrigin);
  press(TEXT_KEYS.console);
  expect(command('get /readme /archive')).toContain('ok');
  expect(command('type /archive')).toContain('Files World owns this disk.');
  expect(command('get http://bbs.world/readme /bbs')).toContain('ok');
  expect(command('type /bbs')).toContain('Files live on the server');
  expect(origin()).toEqual(archiveOrigin);
  expect(command('get /sample /sample')).toContain('ok');
  expect(command('type /sample')).toContain('error -115');
  expect(machines.client.peek(6960)).toBe(0);
  expect(command('open /readme')).toContain('Files World owns this disk.');
  expect(press(TEXT_KEYS.home)).toContain('Files World archive');
  expect(press(TEXT_KEYS.next, TEXT_KEYS.activate)).toContain('Wins: 0');
  expect(machines.client.peek(5363)).toBe(1);
  expect(press(TEXT_KEYS.home)).toContain('Files World archive');
  // Follow a genuine cross-origin page link back to the independently served BBS.
  expect(press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate)).toContain('Welcome to Troika World');
  expect(origin()).toEqual(bbsOrigin);
  expect(r.images.client.reserved).toBeLessThanOrEqual(12501);
  expect(r.images.archive.reserved).toBeLessThanOrEqual(9666);
}, 60_000);
