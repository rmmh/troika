import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildWorldBrowser } from '../src/world/browserImages';
import { auditClientMemory } from './clientMemoryAudit';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { canCheckpoint } from '../src/world/checkpoint';
import { readNativeDisk } from './nativeDiskReader';
import { addLongOriginServer } from './longOriginServer';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { worldTestStage } from './worldDiagnostics';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test.each([false, true])('one client exercises every disk phase within its RAM and native stack budget, programs=%s', programs => {
  const s = createStarterWorld(source, {programs, chat: false}), m = s.machines.client, k = s.keyboard;
  const built = s.programs?.web ?? buildWorldBrowser(source);
  const audit = auditClientMemory(m, built, s.programs?.core);
  const long = addLongOriginServer(s, source);
  expect(long.host.length).toBe(54); expect(long.path.length).toBe(18);
  expect(long.raw.length).toBe(108); expect(long.body.length).toBe(2187);
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 40_000_000;
    while (!done() && s.world.cycles < end) {
      s.world.runCycles(6561);
      expect(m.peek(2504)).not.toBe(-2);
    }
    expect(done(), starterScreen(m)).toBe(true);
  };
  const idle = () => canCheckpoint(s);
  const press = (key: number) => { k.queueTrytes([key]); until(idle); };
  const command = (text: string) => {
    worldTestStage(text); k.queueText(text); until(idle); press(TEXT_KEYS.activate);
    return starterScreen(m);
  };
  until(() => s.machines.server.peek(2381) === 80);
  k.queueText(' '); until(idle);
  expect(starterScreen(m)).toContain('Welcome to Troika World');
  press(TEXT_KEYS.console);
  // Retain a maximum-length current origin while parsing the maximum raw URL
  // again, then compile a full page through DNS and the routed native server.
  for (let i = 0; i < 2; i++) {
    command(`open ${long.raw}`);
    expect(m.peek(2504), starterScreen(m)).toBe(4);
    expect(m.peek(6117)).toBe(54); expect(m.peek(6178)).toBe(54);
    expect(m.peek(6118)).toBe(9841); expect(m.peek(6184)).toBe(18);
    expect(decodeText(Array.from({length: 54}, (_, j) => m.peek(6062 + j)))).toBe(long.host);
    expect(decodeText(Array.from({length: long.canonical.length}, (_, j) => m.peek(5954 + j)))).toBe(long.canonical);
    expect(m.peek(5420)).toBe(4010); expect(m.peek(5360)).toBe(4665); expect(m.peek(5414)).toBe(27);
    expect(long.machine.peek(2199)).toBe(0);
    press(TEXT_KEYS.console);
  }
  expect(command(`open ${long.raw.replace(':0', ':00')}`)).toContain('error -100');
  // The physical console input is capped at 180 cells, before file publication.
  const prefix = 'write /maximum ';
  expect(command(prefix + 'x'.repeat(180 - prefix.length) + 'OVERFLOW')).toContain('ok');
  expect(readNativeDisk(s.disks.client.image(), '/maximum')).toEqual(encodeText('x'.repeat(180 - prefix.length)));
  expect(command('copy /maximum /copied')).toContain('ok');
  expect(command('put /copied http://files.world/shared/audit')).toContain('ok');
  expect(command('get http://files.world/shared/audit /received')).toContain('ok');
  expect(readNativeDisk(s.disks.client.image(), '/received')).toEqual(readNativeDisk(s.disks.client.image(), '/maximum'));
  // Exercise the local Forth handler after network traffic and phase replacement.
  expect(command('open http://bbs.world/game')).toContain('Hint:');
  k.queueText('6'); until(idle); press(TEXT_KEYS.activate);
  expect(starterScreen(m)).toContain('Wins: 1');
  press(TEXT_KEYS.console);
  k.queueText('ping bbs.world'); until(idle); k.queueTrytes([TEXT_KEYS.activate]);
  until(() => m.peek(2514) === 1 && starterScreen(m).includes('Enter: continue'));
  expect(starterScreen(m)).toContain('27 1.3.2 E'); press(TEXT_KEYS.activate);
  if (!programs) {
    k.queueText('telnet echo.world'); until(idle); k.queueTrytes([TEXT_KEYS.activate]);
    until(() => m.peek(2514) === 1 && starterScreen(m).includes('Native echo.'));
    k.queueText('z'.repeat(80) + 'OVERFLOW'); k.queueTrytes([TEXT_KEYS.activate]);
    until(() => starterScreen(m).replaceAll('\n', '').includes('z'.repeat(80)));
    expect(starterScreen(m)).not.toContain('OVERFLOW'); press(TEXT_KEYS.home);
  }
  expect(command('open http://bbs.world/index')).toContain('Welcome to Troika World');
  const {phases, phaseLoads, deepest, touched} = audit;
  expect([...phases].sort()).toEqual(Object.keys(built.phases).sort());
  expect(phaseLoads).toBeGreaterThan(7);
  expect(deepest).toBeGreaterThan(0); expect(deepest).toBeLessThanOrEqual(120);
  expect(touched).toContain('network.buffers'); expect(touched).toContain('page.script');
  expect(built.resident.reserved + (s.programs?.core.image.reserved ?? 0)).toBeLessThanOrEqual(12501);
  console.log(`Client programs=${programs}: ${phaseLoads} phase loads; native stack high-water ${deepest}/243 cells; all seven phases exercised.`);
}, 120_000);
