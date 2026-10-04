import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld } from '../src/world/starter';
import { buildWorldBrowser } from '../src/world/browserImages';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeText } from '../src/core/textEncoding';
import { encodeWide } from '../src/core/wide';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { canCheckpoint } from '../src/world/checkpoint';
import { auditClientMemory } from './clientMemoryAudit';
import { worldTestStage } from './worldDiagnostics';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
// A is deliberately not called: compiling its literal pairs fills the dictionary;
// the empty LOAD handler still executes after the complete page is accepted.
const page = (text: number, literals: number, blanks = 25, padding = '') => {
  const code = `: A ${'0 '.repeat(literals)}; : LOAD ;${padding}`;
  return `PAGE 1\nT ${text}:${'x'.repeat(text)}\nC ${code.length}:${code}\n${'B\n'.repeat(blanks)}`;
};

test.each([false, true])('routed browser fills coupled page arenas and recovers from each overflow, programs=%s', programs => {
  const fullText = page(1458, 321, 25, ' '), fullScript = page(1385, 358);
  expect(fullText.length).toBe(2187); expect(fullScript.length).toBe(2187);
  const fixtures = {
    '/public/index': fullText, '/public/lab': fullScript,
    '/public/game': page(1459, 300), '/public/take': page(1300, 359),
    '/public/trust': page(100, 10, 26), '/public/files': page(1458, 321, 25, '  '),
  };
  const serverDisk = createDiskImage({ blocks: 81, volumeId: [0, 0, 2], files: {
    '/net.seq': encodeWide(1), ...Object.fromEntries(Object.entries(fixtures).map(([path, body]) => [path, encodeText(body)])),
  }});
  const s = createStarterWorld(source, { serverDisk, programs, chat: false }), m = s.machines.client, k = s.keyboard;
  const audit = auditClientMemory(m, s.programs?.web ?? buildWorldBrowser(source), s.programs?.core);
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 50_000_000;
    while (!done() && s.world.cycles < end) {
      s.world.runCycles(6561); expect(m.peek(2504)).not.toBe(-2);
      expect(s.machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  };
  const press = (key: number) => { k.queueTrytes([key]); until(() => canCheckpoint(s)); };
  const open = (path: string) => {
    worldTestStage(`arena ${path}`);
    if (m.peek(2504) !== 5) press(TEXT_KEYS.console);
    k.queueText(`open http://bbs.world${path}`); until(() => canCheckpoint(s)); press(TEXT_KEYS.activate);
  };
  const accepted = (text: number, script: number) => {
    expect(m.peek(2504)).toBe(4); expect(m.peek(5434)).toBe(1);
    expect(m.peek(5420)).toBe(2552 + text); expect(m.peek(5360)).toBe(4010 + script);
    expect(m.peek(5414)).toBe(27);
    expect(m.peek(5364)).toBe(0); expect(m.peek(5365)).toBe(0);
    expect(Array.from({length: text}, (_, i) => m.peek(2552 + i))).toEqual(encodeText('x'.repeat(text)));
  };
  until(() => s.machines.server.peek(2381) === 80); k.queueText(' '); until(() => canCheckpoint(s));
  accepted(1458, 655);
  open('/lab'); accepted(1385, 729);
  for (const [path, error] of [['/game', -111], ['/take', -91], ['/trust', -111], ['/files', -111]] as const) {
    open(path); expect(m.peek(2504)).toBe(5); expect(m.peek(5233)).toBe(error);
    open('/index'); accepted(1458, 655);
  }
  expect(audit.deepest).toBeGreaterThan(0); expect(audit.deepest).toBeLessThanOrEqual(120);
  console.log(`Maximum coupled arenas: ${audit.deepest}/243 native stack cells; ${audit.phaseLoads} production phase loads.`);
}, 120_000);
