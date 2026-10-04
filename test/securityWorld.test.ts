import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { buildSecurityFirmware } from '../src/world/securityImage';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { worldTestStage } from './worldDiagnostics';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('native camera motion triggers an armed alarm; controls validate credentials and reset on cold boot', () => {
  const s = createStarterWorld(source, {programs: true, chat: false}), m = s.machines.security, k = s.keyboard;
  const layout = buildSecurityFirmware(source), labels = layout.image.image.labels;
  const banks = [[labels.get('security_transport_park')!, 1266], [labels.get('security_http_park')!, layout.bankCells]];
  let deepest = 0;
  const write = m.write.bind(m);
  m.write = (address, value) => {
    const code = (address >= -9112 && address <= -3686) || (address >= -3631 && address <= -365) || (address >= 365 && address <= 1336) || address >= 7007;
    if (code && !banks.some(([start, count]) => address >= start! && address < start! + count!)) throw new Error(`security server changed code: ${address}`);
    const sp = m.peek(6); if (sp < 5468 || sp > 5710) throw new Error(`security stack escaped: ${sp}`);
    deepest = Math.max(deepest, 5710 - sp); write(address, value);
  };
  const screen = () => starterScreen(s.machines.client);
  const until = (done: () => boolean) => { const end = s.world.cycles + 50_000_000;
    while (!done() && s.world.cycles < end) { s.world.runCycles(6561); expect(m.peek(2199)).toBe(0); expect(s.machines.client.peek(2504)).not.toBe(-2); }
    expect(done(), screen()).toBe(true);
  };
  const press = (...keys: number[]) => { k.queueTrytes(keys); until(() => canCheckpoint(s)); };
  const type = (text: string) => { k.queueText(text); until(() => canCheckpoint(s)); };
  const action = (command: number, code = '') => {
    worldTestStage(`security action ${command}, code ${code}`);
    type(code); press(TEXT_KEYS.next, TEXT_KEYS.backspace); type(String(command)); press(TEXT_KEYS.activate);
  };
  until(() => m.peek(2381) === 80); type(' '); press(TEXT_KEYS.console); type('open http://security.world/index'); press(TEXT_KEYS.activate);
  expect(screen()).toContain('Security station'); expect(screen()).toContain('@........');
  action(0); expect(screen()).toContain('.@.......'); expect(m.peek(2511)).toBe(1); expect(m.peek(2509)).toBe(0);
  action(1, '000'); expect(s.machines.client.peek(6225)).toBe(403); expect(m.peek(2508)).toBe(0);
  press(TEXT_KEYS.home); action(1, '271'); expect(m.peek(2508)).toBe(1); expect(m.peek(2509)).toBe(0);
  action(0); expect(m.peek(2510)).toBe(2); expect(m.peek(2509)).toBe(1); expect(screen()).toContain('Alarm: 1');
  action(3, '271'); expect(m.peek(2508)).toBe(1); expect(m.peek(2509)).toBe(0);
  action(0); expect(m.peek(2509)).toBe(1);
  action(2, '271'); expect(m.peek(2508)).toBe(0); expect(m.peek(2509)).toBe(0);
  // Reject unsupported actions before any device state changes.
  const before = [2508, 2509, 2510, 2511].map(a => m.peek(a));
  action(9, '271'); expect(s.machines.client.peek(6225)).toBe(400);
  expect([2508, 2509, 2510, 2511].map(a => m.peek(a))).toEqual(before);
  expect(layout.image.reserved).toBeLessThanOrEqual(12501); expect(deepest).toBeGreaterThan(0); expect(deepest).toBeLessThanOrEqual(120);
  const cold = createStarterWorld(source);
  while (cold.machines.security.peek(2381) !== 80 && cold.world.cycles < 20_000_000) cold.world.runCycles(6561);
  expect(cold.machines.security.peek(2381)).toBe(80);
  expect([2508, 2509, 2510, 2511].map(a => cold.machines.security.peek(a))).toEqual([0, 0, 0, 0]);
  console.log(`Security station: ${layout.image.reserved}/12501 linked cells including parked clients; ${deepest}/243 stack; ${layout.bodyCells}-cell generated pages.`);
}, 120_000);
