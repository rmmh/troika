import {setTimeout as yieldToRunner} from 'node:timers/promises';
import {expect, test} from 'vitest';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {boot} from './noticeboardFixture';

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
  expect(rebooted.images.server.reserved).toBeLessThanOrEqual(12501);
}, 90_000);
