import { readFileSync } from 'node:fs';
import { setTimeout as yieldToRunner } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeText } from '../src/core/textEncoding';
import { encodeWide } from '../src/core/wide';
import { TEXT_KEYS } from '../src/core/textKeyboard';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const index = 'PAGE 1\nT 10:Error test\nL 6:Broken 4:/lab\n';
function boot(indexPage: string, brokenPage = 'PAGE 2\n') {
  const serverDisk = createDiskImage({ blocks: 81, volumeId: [0,0,2], files: {
    '/net.seq': encodeWide(1), '/public/index': encodeText(indexPage),
    '/public/lab': encodeText(brokenPage), '/public/news': encodeText('Recovered through native HTTP.\n'),
  } });
  const r = createStarterWorld(source, { serverDisk });
  const { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561);
      expect(machines.client.peek(2504)).not.toBe(-2);
      expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => ((machines.client.peek(2504) === 5 && machines.client.peek(2505) === 1) || (machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(5368) === 0)) && machines.client.peek(2488) === 0 && machines.client.read(68) !== 4;
  const screen = () => starterScreen(machines.client);
  function press(key: number) { keyboard.queueTrytes([key]); until(idle); return screen(); }
  function command(text: string) { keyboard.queueText(text); until(idle); return press(TEXT_KEYS.activate); }
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  return { ...r, screen, press, command };
}

test.each(['PAGE 2\n', 'PAGE 1\nC 13:: LOAD DROP ;\n'])('failed linked page shows a native error console and recovers through Home or another URL: %s', async brokenPage => {
  const r = boot(index, brokenPage); await yieldToRunner(0);
  expect(r.screen()).toContain('Error test');
  expect(r.press(TEXT_KEYS.activate)).toContain(brokenPage.includes('DROP') ? 'error -81' : 'error -110');
  expect(r.machines.client.peek(2504)).toBe(5);
  expect(r.screen()).toContain('F1: home');
  expect(r.machines.client.peek(5434)).toBe(0); expect(r.machines.client.peek(5363)).toBe(0);
  expect(r.press(TEXT_KEYS.home)).toContain('Error test');
  expect(r.press(TEXT_KEYS.activate)).toContain(brokenPage.includes('DROP') ? 'error -81' : 'error -110');
  expect(r.command('open /news')).toContain('Recovered through native');
  expect(r.machines.client.peek(2504)).toBe(4);
}, 40_000);

test('a failed initial page still allows explicit address entry without an accepted origin', async () => {
  const r = boot('PAGE 2\n'); await yieldToRunner(0);
  expect(r.screen()).toContain('error'); expect(r.machines.client.peek(2504)).toBe(5);
  expect(r.command('open http://files.world/index')).toContain('Files World archive');
  expect(r.machines.client.peek(2504)).toBe(4);
}, 40_000);


test('missing startup firmware remains a terminal native boot failure', () => {
  const clientDisk = createDiskImage({ blocks: 81, volumeId: [0,0,1], files: { '/net.seq': encodeWide(1) } });
  const r = createStarterWorld(source, { clientDisk });
  r.keyboard.queueText(' ');
  const end = r.world.cycles + 20_000_000;
  while (r.machines.client.peek(2504) !== -2 && r.world.cycles < end) r.world.runCycles(6561);
  expect(r.machines.client.peek(2504)).toBe(-2);
  expect(r.machines.client.peek(2505)).toBe(-12);
  expect(r.machines.client.sleep).not.toBeNull();
});
