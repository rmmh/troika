import { setTimeout as yieldToRunner } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';
// Let the runner drain IPC between CPU-bound world scenarios.
afterEach(() => new Promise<void>(resolve => setImmediate(resolve)));
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
function boot(serverDisk?: Int16Array) {
  const session = createStarterWorld(source, { serverDisk });
  const { world, machines, keyboard } = session;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(2488) === 0 && machines.client.peek(5368) === 0 && machines.client.read(68) !== 4;
  const press = (...keys: number[]) => { keyboard.queueTrytes(keys); until(idle); };
  const type = (text: string) => { keyboard.queueText(text); until(idle); };
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(machines.client)).toContain('Noticeboard');
  return { ...session, press, type };
}
test('native noticeboard posts survive a cold world boot from the server disk', async () => {
  const r = boot(); await yieldToRunner(0);
  r.press(TEXT_KEYS.activate); // Empty message: native application returns 400.
  expect(r.machines.client.peek(6225)).toBe(400);
  r.press(TEXT_KEYS.home); expect(starterScreen(r.machines.client)).toContain('Welcome to Troika World');
  r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  const first = 'Hello, world!';
  r.type(first); r.press(TEXT_KEYS.activate);
  expect(r.machines.client.peek(6225)).toBe(200); expect(r.machines.server.peek(6976)).toBe(1);
  expect(starterScreen(r.machines.client)).toContain(first);
  // The response reloads a blank input, preserving old posts in the disk file.
  r.type('A second note.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain(first);
  expect(starterScreen(r.machines.client)).toContain('A second note.');
  expect(r.machines.client.peek(5361)).toBe(0); // Board messages are data; no C records.
  expect(r.machines.server.peek(6960)).toBe(0);
  const disk = r.disks.server.image();
  // Cold boot discards CPUs and traffic. This is file persistence, not a live
  // snapshot or restoration of serial counters into an existing network.
  await yieldToRunner(0);
  const rebooted = boot(disk); await yieldToRunner(0);
  expect(starterScreen(rebooted.machines.client)).toContain(first);
  expect(starterScreen(rebooted.machines.client)).toContain('A second note.');
  expect(rebooted.images.server.reserved).toBeLessThanOrEqual(9666);
}, 40_000);


test('forum topics retain independent replies through HTTP and a cold server-disk reboot', async () => {
  function topics(r: ReturnType<typeof boot>) {
    r.press(TEXT_KEYS.home);
    r.press(...Array(6).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
    expect(starterScreen(r.machines.client)).toContain('Troika forums');
  }
  const r = boot(); await yieldToRunner(0); topics(r);
  r.press(TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Game discussion');
  r.type('My score is nine.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('My score is nine.');
  r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Troika forums');
  r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Building Troika');
  expect(starterScreen(r.machines.client)).not.toContain('My score is nine.');
  r.type('A new Forth program.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('A new Forth program.');
  expect(r.machines.client.peek(5361)).toBe(0);
  await yieldToRunner(0);
  const rebooted = boot(r.disks.server.image()); await yieldToRunner(0);
  expect(starterScreen(rebooted.machines.client)).not.toContain('A new Forth program.');
  topics(rebooted); rebooted.press(TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(rebooted.machines.client)).toContain('My score is nine.');
  expect(starterScreen(rebooted.machines.client)).not.toContain('A new Forth program.');
  rebooted.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  rebooted.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(rebooted.machines.client)).toContain('A new Forth program.');
  expect(starterScreen(rebooted.machines.client)).not.toContain('My score is nine.');
}, 90_000);
