import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { decodeText } from '../src/core/textEncoding';

test('native Forth Takeaway validates moves, plays winning and losing rounds, restarts and downloads rules', () => {
  const r = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const deadline = world.cycles + 100_000_000;
    while (!done() && world.cycles < deadline) {
      world.runCycles(6561);
      expect(machines.client.peek(2504)).not.toBe(-2);
      expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => canCheckpoint(r);
  const screen = () => starterScreen(machines.client);
  function press(...keys: number[]) { keyboard.queueTrytes(keys); until(idle); }
  function command(text: string) { keyboard.queueText(text); until(idle); press(TEXT_KEYS.activate); return screen(); }
  const openGame = () => press(...Array(8).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  until(() => machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80);
  keyboard.queueText(' '); until(idle); openGame();
  expect(screen()).toContain('Takeaway'); expect(screen()).toContain('Pile: 21 Bot: 0');
  expect(machines.client.peek(5362)).toBe(18);
  expect(machines.client.peek(5360)).toBeLessThanOrEqual(4739);
  expect(machines.client.peek(5414)).toBe(13);
  const script = Array.from({length:729},(_,i)=>machines.client.peek(4010+i));
  const latest = machines.client.peek(5361);
  let previous = '';
  function move(value: string, pile: number, bot: number, status: string) {
    keyboard.queueTrytes(Array(previous.length).fill(TEXT_KEYS.backspace)); keyboard.queueText(value); until(idle);
    press(TEXT_KEYS.activate); previous = value;
    expect(screen()).toContain(`Pile: ${String(pile).padStart(2,'0')} Bot: ${bot}`);
    expect(decodeText([machines.client.peek(machines.client.peek(4776))])).toBe(status);
    expect(machines.client.peek(5364)).toBe(0); expect(machines.client.peek(5365)).toBe(0);
    expect(machines.client.peek(5368)).toBe(0); expect(machines.client.peek(6225)).toBe(200);
    expect(machines.client.peek(5361)).toBe(latest);
    expect(Array.from({length:729},(_,i)=>machines.client.peek(4010+i))).toEqual(script);
  }
  for (const bad of ['', '0', '4', '12', 'x']) move(bad,21,0,'?');
  move('1',19,1,'.'); move('3',15,1,'.'); move('3',11,1,'.'); move('3',7,1,'.'); move('3',3,1,'.');
  move('x',3,1,'?'); move('3',0,1,'W'); move('1',0,1,'W');
  // The first tab selects Take; the second selects the explicit Restart link.
  press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate); previous = '';
  expect(screen()).toContain('Pile: 21 Bot: 0');
  move('2',16,3,'.'); move('1',12,3,'.'); move('1',8,3,'.'); move('1',4,3,'.'); move('1',0,3,'L'); move('x',0,3,'L');
  press(TEXT_KEYS.home); openGame();
  expect(screen()).toContain('Pile: 21 Bot: 0');
  press(TEXT_KEYS.console);
  expect(command('get /takerules /rules')).toContain('ok');
  expect(command('type /rules')).toContain('Start with 21 stones.');
  expect(r.images.client.reserved).toBeLessThanOrEqual(12501);
  expect(r.images.server.reserved).toBeLessThanOrEqual(12501);
},60_000);
