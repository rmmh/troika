import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { readNativeDisk } from './nativeDiskReader';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('browse a software shelf, download a native PRG over routed HTTP, launch it and return to the browser', () => {
  const s = createStarterWorld(source, {programs: true, chat: false}), m = s.machines.client, k = s.keyboard;
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 40_000_000;
    while (!done() && s.world.cycles < end) {s.world.runCycles(6561); expect(m.peek(2504), starterScreen(m)).not.toBe(-2);}
    expect(done(), starterScreen(m)).toBe(true);
  };
  const idle = () => canCheckpoint(s);
  const key = (value: number) => {k.queueTrytes([value]); until(idle);};
  const command = (text: string) => {k.queueText(text); until(idle); key(TEXT_KEYS.activate);};
  until(() => s.web!.servers.every(server => server.machine.peek(2198) === 1));
  k.queueText(' '); until(idle); key(TEXT_KEYS.console);
  command('open http://ternary.world/soft');
  expect(starterScreen(m)).toContain('Common divisor');
  key(TEXT_KEYS.console); command('get http://ternary.world/p0000 /tool');
  expect(starterScreen(m)).toContain('ok');
  const app = s.web!.catalog.software.find(app => app.id === 'gcd')!;
  expect(readNativeDisk(s.disks.client.image(), '/tool')).toEqual(app.program.file);
  command('programs');
  k.queueText('4'); until(() => m.peek(2504) === 15);
  k.queueText('/tool'); k.queueTrytes([TEXT_KEYS.activate]);
  until(() => m.peek(2532) === 4 && m.peek(2514) === 1);
  k.queueText('84'); k.queueTrytes([TEXT_KEYS.next]); k.queueText('30'); k.queueTrytes([TEXT_KEYS.activate]);
  until(() => m.peek(2560) === 6 && m.peek(2559) === 0 && m.peek(2514) === 1);
  expect(starterScreen(m)).toContain('Common divisor');
  k.queueTrytes([TEXT_KEYS.home]); until(() => m.peek(2504) === 11 && m.peek(2514) === 1);
  k.queueText('1'); until(() => idle() && m.peek(2532) === 1);
  expect(starterScreen(m)).toContain('Welcome to Troika World');
}, 120_000);
