import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { decodeText } from '../src/core/textEncoding';
import { TEXT_KEYS } from '../src/core/textKeyboard';

test('a selected link prepares a native download that can be cancelled or saved to a chosen path', () => {
  const r = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => (machines.client.peek(2504) === 5 || (machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(5368) === 0)) && machines.client.peek(2488) === 0 && machines.client.read(68) !== 4;
  const screen = () => starterScreen(machines.client);
  function press(...keys: number[]) { keyboard.queueTrytes(keys); until(idle); return screen(); }
  function type(text: string) { keyboard.queueText(text); until(idle); }
  function command(text: string) { type(text); return press(TEXT_KEYS.activate); }
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  press(TEXT_KEYS.next, TEXT_KEYS.activate); expect(screen()).toContain('Public file library');
  const origin = Array.from({ length: 61 }, (_, i) => machines.client.peek(6062 + i));
  function download() {
    press(TEXT_KEYS.download); expect(machines.client.peek(2504)).toBe(5);
    expect(decodeText(Array.from({ length: machines.client.peek(5225) }, (_, i) => machines.client.peek(2552 + i)))).toBe('get http://bbs.world/readme ');
    expect(machines.client.peek(5434)).toBe(0); expect(machines.client.peek(6960)).toBe(0);
    expect(Array.from({ length: 61 }, (_, i) => machines.client.peek(6062 + i))).toEqual(origin);
  }
  download(); expect(press(TEXT_KEYS.home)).toContain('Welcome to Troika World');
  press(TEXT_KEYS.next, TEXT_KEYS.activate); download();
  expect(command('/copy')).toContain('ok'); expect(command('type /copy')).toContain('Files live on the server');
  expect(press(TEXT_KEYS.home)).toContain('Welcome to Troika World');
}, 40_000);
