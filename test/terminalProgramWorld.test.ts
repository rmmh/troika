import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildTerminalFirmware } from '../src/world/terminalImage';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeWide } from '../src/core/wide';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { REG_P } from '../src/core/machine';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('standalone terminal boots with DHCP and exchanges routed text without a web or Forth runtime', () => {
  const s = createStarterWorld(source), image = buildTerminalFirmware(source);
  expect(image.modules.some(module => /^(forth|page|http|console)/i.test(module.name))).toBe(false);
  expect(image.reserved).toBeLessThanOrEqual(9666);
  const m = s.world.addMachine('terminal');
  for (const c of image.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, image.image.entry!);
  s.world.addInterface('terminal', 4, [0, 2, 1], 'a');
  s.world.addDisk('terminal', [new BlockMedium(27, false, createDiskImage({blocks: 27, volumeId: [0, 0, 1], files: {'/net.seq': encodeWide(1)}}))]);
  const keys = new TextDevice(); m.attach(keys); m.attach(new DisplayDevice(a => m.peek(a), (a, v) => m.poke(a, v)));
  let deepest = 0;
  const write = m.write.bind(m);
  m.write = (a, v) => {
    if ((a >= -9112 && a <= -3686) || (a >= -3631 && a <= -365) || (a >= 365 && a <= 1336) || a >= 7007) throw new Error(`terminal modified code: ${a}`);
    const sp = m.peek(6); if (sp < 5468 || sp > 5710) throw new Error(`terminal stack escaped: ${sp}`);
    deepest = Math.max(deepest, 5710 - sp); write(a, v);
  };
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 30_000_000;
    while (!done() && s.world.cycles < end) { s.world.runCycles(6561); expect(m.peek(2504)).not.toBe(-2); }
    expect(done(), starterScreen(m)).toBe(true);
  };
  until(() => m.peek(2514) === 1 && starterScreen(m).includes('Host (Enter):'));
  expect(m.peek(2344)).toBe(3);
  for (let i = 0; i < 2; i++) {
    keys.queueText('echo.world'); keys.queueTrytes([TEXT_KEYS.activate]);
    until(() => starterScreen(m).includes('Native echo.'));
    keys.queueText(`Standalone ${i}`); keys.queueTrytes([TEXT_KEYS.activate]);
    until(() => starterScreen(m).includes(`\nStandalone ${i}`));
    keys.queueTrytes([TEXT_KEYS.home]);
    until(() => m.peek(2505) === 1 && m.peek(2514) === 1);
    expect(m.peek(2506)).toBe(0); expect(starterScreen(m)).toContain('Host (Enter):');
  }
  expect(deepest).toBeGreaterThan(0); expect(deepest).toBeLessThanOrEqual(120);
  console.log(`Standalone terminal: ${image.reserved}/9666 code cells; native stack ${deepest}/243; no Forth or HTTP.`);
}, 120_000);
