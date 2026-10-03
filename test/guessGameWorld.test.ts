import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';

test('disk-served Forth game handles invalid, low, high and winning guesses entirely on the client', () => {
  const { world, machines, keyboard } = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(2488) === 0 && machines.client.peek(5368) === 0 && machines.client.read(68) !== 4;
  const press = (...keys: number[]) => { keyboard.queueTrytes(keys); until(idle); };
  const openGame = () => press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle); openGame();
  expect(starterScreen(machines.client)).toContain('Hint: ?'); expect(starterScreen(machines.client)).toContain('Wins: 0');
  expect(machines.client.peek(5362)).toBe(17); expect(machines.client.peek(5360)).toBeLessThanOrEqual(4739);
  let previous = '';
  function guess(value: string, hint: string, wins: number) {
    keyboard.queueTrytes(Array(previous.length).fill(TEXT_KEYS.backspace)); keyboard.queueText(value); until(idle);
    press(TEXT_KEYS.activate); previous = value;
    expect(starterScreen(machines.client)).toContain(`Hint: ${hint}`);
    expect(starterScreen(machines.client)).toContain(`Wins: ${wins}`);
    expect(machines.client.peek(5364)).toBe(0); expect(machines.client.peek(5365)).toBe(0);
    expect(machines.client.peek(6225)).toBe(200); expect(machines.client.peek(5368)).toBe(0);
  }
  guess('', '?', 0); guess('0', '?', 0); guess('12', '?', 0); guess('a', '?', 0);
  guess('1', '<', 0); guess('9', '>', 0); guess('6', '=', 1);
  guess('6', '<', 1); guess('8', '=', 2); guess('5', '=', 3);
  ['8','7','8','1','8','4'].forEach((digit, i) => guess(digit, i === 5 ? '!' : '=', i + 4));
  guess('a', '!', 9); // Finished game ignores further guesses until reloaded.
  press(TEXT_KEYS.home); openGame();
  expect(starterScreen(machines.client)).toContain('Wins: 0'); expect(starterScreen(machines.client)).toContain('Hint: ?');
}, 30_000);
