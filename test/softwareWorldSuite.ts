import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { readNativeDisk } from './nativeDiskReader';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

export function registerSoftwareWorldTest(server: number) {
test(`download every native PRG on web${server} and execute its representative programs`, () => {
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
  const hosts = new Set(s.web!.catalog.hosts.filter(host=>host.server===server).map(host=>host.name));
  const apps = s.web!.catalog.software.filter(app=>hosts.has(`${app.site}.world`));
  expect(apps.length).toBeGreaterThan(0);
  for (const app of apps) {
    command(`get http://${app.site}.world${app.path} /tool`);
    expect(starterScreen(m), app.id).toContain('ok');
    expect(readNativeDisk(s.disks.client.image(), '/tool'), app.id).toEqual(app.program.file);
    if (app.kind !== 'board' && !['gcd', 'recipe-scale', 'nim', 'crc8', 'slug', 'brackets', 'weekday', 'coin-change', 'hamming-decode', 'uri-encode', 'json-unquote', 'csv-unquote', 'find-all', 'edit-distance', 'glob-match', 'word-sort'].includes(app.id)) continue;
    command('programs');
    k.queueText('4'); until(() => m.peek(2504) === 15);
    k.queueText('/tool'); k.queueTrytes([TEXT_KEYS.activate]);
    until(() => m.peek(2532) === 4 && m.peek(2514) === 1);
    expect(m.peek(2533)).toBe(app.number);
    if (app.kind === 'board') {
      const example = app.examples[0]!, cells = app.columns*app.rows;
      let cursor = 0;
      for (const square of example.moves) {
        k.queueTrytes(Array((square-cursor+cells)%cells).fill(TEXT_KEYS.next));
        k.queueTrytes([TEXT_KEYS.activate]); cursor = square;
      }
      until(() => m.peek(2632)===example.status && m.peek(2631)===example.movesMade && m.peek(2514)===1 &&
        String.fromCharCode(...Array.from({length:cells},(_,i)=>m.peek(2900+i)))===example.board);
    } else if (app.kind === 'text') {
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
}, 180_000);
}
