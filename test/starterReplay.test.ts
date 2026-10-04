import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';

// Production firmware, including native IRC peers and the disk-loaded desktop.
test('native program world replays boot IO and physical input from one coherent hardware capture', () => {
  const session = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'), {programs: true, chat: true});
  const {world, keyboard, machines} = session;
  world.advanceTo(100_003);
  const boot = world.captureState();
  keyboard.queueText(' ');
  world.runCycles(200_003);
  const after = world.captureState();
  world.restoreState(boot);
  keyboard.queueText(' ');
  world.runCycles(200_003);
  expect(world.captureState()).toEqual(after);
  const end = world.cycles + 20_000_000;
  while (!starterScreen(machines.client).includes('Welcome to Troika World') && world.cycles < end) world.runCycles(6561);
  expect(starterScreen(machines.client)).toContain('Welcome to Troika World');
  const ready = world.captureState();
  keyboard.queueText('hello'); world.runCycles(20_003);
  const typed = world.captureState();
  world.restoreState(ready);
  keyboard.queueText('hello'); world.runCycles(20_003);
  expect(world.captureState()).toEqual(typed);
}, 120_000);
