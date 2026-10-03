import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';

test('console copy and rename load their disk phase and return to file and network commands', () => {
  const session = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const { world, machines, keyboard } = session;
  function until(done: () => boolean) {
    const deadline = world.cycles + 100_000_000;
    while (!done() && world.cycles < deadline) {
      world.runCycles(6561);
      expect(machines.client.peek(2504)).not.toBe(-2);
      expect(machines.server.peek(2199)).toBe(0); expect(machines.archive.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => canCheckpoint(session);
  function press(cell: number) { keyboard.queueTrytes([cell]); until(idle); }
  function command(text: string) { keyboard.queueText(text); until(idle); press(TEXT_KEYS.activate); return starterScreen(machines.client); }
  until(() => machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80);
  keyboard.queueText(' '); until(idle); press(TEXT_KEYS.console);
  for (const text of ['copy', 'copy /readme', 'copy   ']) expect(command(text)).toContain('error -137');
  expect(command('copy /missing /out')).toContain('error -12');
  expect(command('get /readme /source')).toContain('ok');
  expect(command('mkdir /docs')).toContain('ok');
  expect(command('copy /source   /docs/kept')).toContain('ok');
  expect(command('del /source')).toContain('ok');
  expect(command('type /docs/kept')).toContain('Files live on the server');
  expect(command('copy /docs/kept /docs/kept')).toContain('ok');
  expect(command('type /docs/kept')).toContain('Files live on the server');
  expect(command('copy /docs/kept relative')).toContain('error -15');
  expect(command('open http://files.world/')).toContain('Files World archive');
  press(TEXT_KEYS.console);
  expect(command('get /readme /source')).toContain('ok');
  expect(command('copy /source /docs/kept')).toContain('ok');
  expect(command('type /docs/kept')).toContain('Files World owns this disk.');
  expect(command('ren /docs/kept SAVED')).toContain('ok');
  expect(command('type /docs/kept')).toContain('error -12');
  expect(command('type /docs/saved')).toContain('Files World owns this disk.');
  expect(command('ren /docs archive')).toContain('ok');
  expect(command('type /archive/saved')).toContain('Files World owns this disk.');
  expect(machines.client.peek(2488)).toBe(0); expect(machines.client.peek(6960)).toBe(0);
  expect(session.images.client.reserved).toBeLessThanOrEqual(12501);
}, 60_000);
