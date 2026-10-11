import {worldTestStage} from './worldDiagnostics';
import {setTimeout as yieldToRunner} from 'node:timers/promises';
import {expect, test} from 'vitest';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {boot} from './noticeboardFixture';

test('forum topics retain independent replies through HTTP and a cold server-disk reboot', async () => {
  function topics(r: ReturnType<typeof boot>) {
    r.press(TEXT_KEYS.home);
    r.press(...Array(6).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
    expect(starterScreen(r.machines.client)).toContain('Troika forums');
  }
  worldTestStage('boot and navigate to independent forum sections');
  const r = boot(); await yieldToRunner(0); topics(r);
  r.press(TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Game discussion');
  worldTestStage('post a game reply');
  r.type('My score is nine.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('My score is nine.');
  r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Troika forums');
  r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Building Troika');
  expect(starterScreen(r.machines.client)).not.toContain('My score is nine.');
  worldTestStage('post a build reply');
  r.type('A new Forth program.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('A new Forth program.');
  expect(r.machines.client.peek(5361)).toBe(0);
  r.press(...Array(4).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Building Troika (2/5)');
  worldTestStage('post to the second build page');
  r.type('Page two build note.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Page two build note.');
  expect(starterScreen(r.machines.client)).not.toContain('A new Forth program.');
  await yieldToRunner(0);
  worldTestStage('cold boot retained server disk');
  const rebooted = boot(r.disks.server.image()); await yieldToRunner(0);
  expect(starterScreen(rebooted.machines.client)).not.toContain('A new Forth program.');
  worldTestStage('verify retained game and build replies');
  topics(rebooted); rebooted.press(TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(rebooted.machines.client)).toContain('My score is nine.');
  expect(starterScreen(rebooted.machines.client)).not.toContain('A new Forth program.');
  rebooted.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  rebooted.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(rebooted.machines.client)).toContain('A new Forth program.');
  expect(starterScreen(rebooted.machines.client)).not.toContain('My score is nine.');
  worldTestStage('verify retained second build page');
  rebooted.press(...Array(4).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  expect(starterScreen(rebooted.machines.client)).toContain('Building Troika (2/5)');
  expect(starterScreen(rebooted.machines.client)).toContain('Page two build note.');
// Two boots and multiple routed disk-phase loads exceed 90s on slower runs.
// Diagnostic samples confirmed progress through the final fetch, not a wedge.
}, 120_000);
