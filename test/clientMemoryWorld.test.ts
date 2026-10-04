import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildWorldBrowser } from '../src/world/browserImages';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { norm } from '../src/core/tryte';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { canCheckpoint } from '../src/world/checkpoint';
import { readNativeDisk } from './nativeDiskReader';
import { encodeText } from '../src/core/textEncoding';
import { worldTestStage } from './worldDiagnostics';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('one production client exercises every disk phase within its RAM and native stack budget', () => {
  const s = createStarterWorld(source), m = s.machines.client, k = s.keyboard;
  const built = buildWorldBrowser(source), slot = built.base;
  const phases = new Set<string>(), touched = new Set<string>();
  let deepest = 0, phaseLoads = 0, currentPhase = '';
  const downloadData = built.phases.download!.assembly.labels.get('dd_saved_buffer')!;
  const downloadDataEnd = built.phases.download!.assembly.labels.get('dd_saved_lookup')! + 23;
  const write = m.write.bind(m);
  m.write = (address, value) => {
    const addr = norm(address);
    const region = CLIENT_LAYOUT.find(r => addr >= r.start && addr < r.start + r.size)!;
    if (region.name.startsWith('resident.') || region.name === 'margin') {
      // Only the download phase declares mutable storage inside its image:
      // 243 parked file cells and 23 lookup/handle cells for serial refill.
      const privateData = currentPhase === 'download' && m.peek(2488) === 2 &&
        addr >= downloadData && addr < downloadDataEnd;
      if (!privateData && !(addr >= slot && addr < slot + 1906 && m.peek(2488) === 1)) {
        throw new Error(`client changed immutable code at ${addr}`);
      }
    }
    // Register instructions bypass Machine.write; inspect the live S register
    // at every bus write instead of waiting for a write to register address 6.
    const sp = m.peek(6);
    if (sp < 5468 || sp > 5710) throw new Error(`native stack escaped: ${sp}`);
    deepest = Math.max(deepest, 5710 - sp);
    if (region.name === 'native.stack') deepest = Math.max(deepest, 5710 - addr);
    touched.add(region.name);
    write(addr, value);
    if (addr === 2487 && value === 1) {
      const length = m.peek(2489);
      const match = Object.entries(built.phases).find(([, p]) =>
        p.file.length === length + 4 && p.file.slice(4).every((cell, i) => cell === m.peek(slot + i)));
      if (!match) throw new Error('loaded phase is not one of the production images');
      currentPhase = match[0]; phases.add(currentPhase); phaseLoads++;
    }
  };
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
  k.queueText('telnet echo.world'); until(idle); k.queueTrytes([TEXT_KEYS.activate]);
  until(() => m.peek(2514) === 1 && starterScreen(m).includes('Native echo.'));
  k.queueText('z'.repeat(80) + 'OVERFLOW'); k.queueTrytes([TEXT_KEYS.activate]);
  until(() => starterScreen(m).replaceAll('\n', '').includes('z'.repeat(80)));
  expect(starterScreen(m)).not.toContain('OVERFLOW'); press(TEXT_KEYS.home);
  expect(command('open http://bbs.world/index')).toContain('Welcome to Troika World');
  expect([...phases].sort()).toEqual(Object.keys(built.phases).sort());
  expect(phaseLoads).toBeGreaterThan(7);
  expect(deepest).toBeGreaterThan(0); expect(deepest).toBeLessThanOrEqual(120);
  expect(touched).toContain('network.buffers'); expect(touched).toContain('page.script');
  expect(s.images.client.reserved).toBeLessThanOrEqual(12501);
  console.log(`Production client: ${phaseLoads} phase loads; native stack high-water ${deepest}/243 cells; all seven phases exercised.`);
}, 120_000);
