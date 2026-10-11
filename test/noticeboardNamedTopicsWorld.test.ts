import {setTimeout as yieldToRunner} from 'node:timers/promises';
import {expect, test} from 'vitest';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {boot} from './noticeboardFixture';

test('visitors create named topics and reply through the browser across a cold boot', async () => {
  function directory(r: ReturnType<typeof boot>) {
    r.press(TEXT_KEYS.home);
    r.press(...Array(6).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
    r.press(...Array(4).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
    expect(starterScreen(r.machines.client)).toContain('Community topics');
  }
  const r = boot(); await yieldToRunner(0); directory(r);
  r.press(TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('New community topic');
  r.type('demo'); r.press(TEXT_KEYS.next); r.type('First visitor post.'); r.press(TEXT_KEYS.activate);
  expect(r.machines.client.peek(6225)).toBe(200);
  expect(starterScreen(r.machines.client)).toContain('First visitor post.');
  r.press(TEXT_KEYS.next); r.type('L 4:Home 6:/index'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('L 4:Home 6:/index');
  expect(r.machines.client.peek(5361)).toBe(0);
  directory(r); r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('First visitor post.');
  const retained = r.disks.server.image(); await yieldToRunner(0);
  const cold = boot(retained); await yieldToRunner(0); directory(cold);
  cold.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(cold.machines.client)).toContain('First visitor post.');
  expect(starterScreen(cold.machines.client)).toContain('L 4:Home 6:/index');
  expect(cold.machines.server.peek(6960)).toBe(0);
}, 90_000);
