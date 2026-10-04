import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { readNativeDisk } from './nativeDiskReader';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('download every distributed native PRG and execute utilities from multiple websites', () => {
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
  key(TEXT_KEYS.console);
  for (const app of s.web!.catalog.software) {
    command(`get http://${app.site}.world${app.path} /tool`);
    expect(starterScreen(m), app.id).toContain('ok');
    expect(readNativeDisk(s.disks.client.image(), '/tool'), app.id).toEqual(app.program.file);
    if (!['gcd', 'recipe-scale', 'nim', 'crc8', 'slug', 'brackets', 'weekday', 'coin-change', 'hamming-decode'].includes(app.id)) continue;
    command('programs');
    k.queueText('4'); until(() => m.peek(2504) === 15);
    k.queueText('/tool'); k.queueTrytes([TEXT_KEYS.activate]);
    until(() => m.peek(2532) === 4 && m.peek(2514) === 1);
    expect(m.peek(2533)).toBe(app.number);
    if (app.kind === 'text') {
      const example = app.examples[0]!;
      k.queueText(example.input); k.queueTrytes([TEXT_KEYS.activate]);
      until(() => m.peek(2620) === example.output!.length && m.peek(2621) === 0 && m.peek(2514) === 1);
      expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
    } else {
      const example = app.examples[app.id === 'crc8' ? 1 : 0]!;
      example.input.forEach((value, i) => {if (i) k.queueTrytes([TEXT_KEYS.next]); k.queueText(String(value));});
      k.queueTrytes([TEXT_KEYS.activate]);
      until(() => example.output!.every((value, i) => m.peek(2560 + i) === value) && m.peek(2559) === 0 && m.peek(2514) === 1);
    }
    expect(starterScreen(m)).toContain(app.title);
    k.queueTrytes([TEXT_KEYS.home]); until(() => m.peek(2504) === 11 && m.peek(2514) === 1);
    k.queueText('1'); until(() => idle() && m.peek(2532) === 1);
    expect(starterScreen(m)).toContain('Welcome to Troika World');
    key(TEXT_KEYS.console);
  }
}, 240_000);
