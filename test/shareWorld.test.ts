import { readFileSync } from 'node:fs';
import { setTimeout as yieldToRunner } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeText } from '../src/core/textEncoding';
import { encodeWide } from '../src/core/wide';
import { TEXT_KEYS } from '../src/core/textKeyboard';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
function boot(archiveDisk?: Int16Array) {
  const r = createStarterWorld(source, { archiveDisk });
  const { world, machines, keyboard } = r;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2);
      expect(machines.server.peek(2199)).toBe(0); expect(machines.archive.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => (machines.client.peek(2504) === 5 || (machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(5368) === 0)) && machines.client.peek(2488) === 0 && machines.client.read(68) !== 4;
  const screen = () => starterScreen(machines.client);
  function press(...keys: number[]) { keyboard.queueTrytes(keys); until(idle); return screen(); }
  function type(text: string) { keyboard.queueText(text); until(idle); }
  function command(text: string) { type(text); return press(TEXT_KEYS.activate); }
  until(() => machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80);
  keyboard.queueText(' '); until(idle);
  return { ...r, screen, press, type, command };
}

test('published archive files can be downloaded and remain available after a cold archive-disk boot', async () => {
  const r = boot(); await yieldToRunner(0);
  function publish(text: string) {
    r.press(TEXT_KEYS.console);
    expect(r.command('open http://files.world/share')).toContain('Share a text file');
    r.type('note'); r.press(TEXT_KEYS.next); r.type(text); r.press(TEXT_KEYS.activate);
    expect(r.machines.client.peek(6225)).toBe(200);
    expect(r.screen()).toContain(text);
    expect(r.machines.client.peek(5361)).toBe(0);
  }
  publish('First shared note'); publish('T 5:hello');
  r.press(TEXT_KEYS.console);
  expect(r.command('open /catalog')).toContain('Shared files');
  expect(r.screen()).toContain('[note]'); expect(r.screen()).toContain('[welcome]');
  expect(r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate)).toContain('T 5:hello');
  r.press(TEXT_KEYS.console);
  expect(r.command('get /shared/note /copy')).toContain('ok');
  expect(r.command('type /copy')).toContain('T 5:hello');
  expect(r.machines.archive.peek(6960)).toBe(0);
  await yieldToRunner(0);
  const restarted = boot(r.disks.archive.image()); await yieldToRunner(0);
  restarted.press(TEXT_KEYS.console);
  expect(restarted.command('open http://files.world/catalog')).toContain('[note]');
  expect(restarted.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate)).toContain('T 5:hello');
  expect(restarted.machines.client.peek(5361)).toBe(0);
  expect(restarted.images.archive.reserved).toBeLessThanOrEqual(12501);
}, 90_000);


test('a generated catalog spans native stream frames and its Next link opens the remaining files', async () => {
  const archiveDisk = createDiskImage({ blocks: 81, volumeId: [0,0,5], files: {
    '/net.seq': encodeWide(1),
    ...Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`/public/shared/f${String(i).padStart(2, '0')}`, encodeText(`file ${i}`)])),
  } });
  const r = boot(archiveDisk); await yieldToRunner(0);
  r.press(TEXT_KEYS.console);
  expect(r.command('open http://files.world/catalog')).toContain('[f00]');
  expect(r.screen()).toContain('[f17]'); expect(r.screen()).toContain('[Next]'); expect(r.screen()).not.toContain('[f18]');
  expect(r.machines.client.peek(6216)).toBeGreaterThan(216);
  r.press(...Array(19).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  expect(r.screen()).toContain('[f18]'); expect(r.screen()).toContain('[f19]'); expect(r.screen()).not.toContain('[Next]');
  expect(r.press(TEXT_KEYS.next, TEXT_KEYS.activate)).toContain('file 18');
}, 60_000);
