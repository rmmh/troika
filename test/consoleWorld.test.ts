import { worldTestStage } from './worldDiagnostics';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';

test('native console downloads and manages files, recovers from errors and retains downloads across cold boots', async () => {
  let r = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  let { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => ((machines.client.peek(2504) === 5 && machines.client.peek(2505) === 1) || (machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(5368) === 0)) && machines.client.peek(2488) === 0 && machines.client.read(68) !== 4;
  function press(key: number, stage = `key: ${key}`) { worldTestStage(stage); keyboard.queueTrytes([key]); until(idle); }
  function command(text: string) { worldTestStage(`command: ${text}`); keyboard.queueText(text); until(idle); press(TEXT_KEYS.activate, `execute: ${text}`); return starterScreen(machines.client); }
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  press(TEXT_KEYS.console);
  expect(machines.client.peek(2504)).toBe(5); expect(machines.client.peek(5434)).toBe(0);
  expect(starterScreen(machines.client)).toContain('dir [/dir]  type /file');
  expect(command('DIR /')).toContain('console');
  expect(command('get')).toContain('error -137');
  expect(command('get /readme')).toContain('error -137');
  expect(command('get /readme relative')).toContain('error -15');
  expect(command('get http:// /bad')).toContain('error');
  expect(command('get /readme /readme')).toContain('ok');
  expect(command('type /readme')).toContain('Files live on the server');
  expect(command('get /missing /readme')).toContain('error -132');
  expect(command('type /readme')).toContain('Files live on the server');
  expect(command('get http://missing.world/readme /nope')).toContain('error');
  expect(command('get http://bbs.world/readme /readme')).toContain('ok');
  expect(command('del /readme')).toContain('ok');
  expect(command('mkdir /docs')).toContain('ok');
  expect(command('dir /')).toContain('docs/');
  expect(command('get /readme /docs/readme')).toContain('ok');
  expect(command('rmdir /docs')).toContain('error -21');
  expect(command('del /docs/readme')).toContain('ok');
  expect(command('type /missing')).toContain('error -12');
  expect(machines.client.peek(6960)).toBe(0);
  expect(command('unknown')).toContain('error -137');
  expect(command('rmdir /docs')).toContain('ok');
  expect(command('dir /')).not.toContain('docs/');
  expect(command('get /readme /kept')).toContain('ok');
  expect(command('exit')).toContain('Welcome to Troika World');
  expect(machines.client.peek(2504)).toBe(4); expect(r.images.client.reserved).toBeLessThanOrEqual(12501);
  const retained = r.disks.client.image();
  await new Promise<void>(resolve => setImmediate(resolve));
  r = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'), { clientDisk: retained });
  ({ world, machines, keyboard } = r);
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  press(TEXT_KEYS.console);
  expect(command('type /kept')).toContain('Files live on the server');
  expect(command('get /readme /kept')).toContain('ok');
  expect(command('type /kept')).toContain('Files live on the server');
}, 90_000);
