import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildWorldBrowser } from '../src/world/browserImages';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeText } from '../src/core/textEncoding';
import { encodeWide } from '../src/core/wide';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { canCheckpoint } from '../src/world/checkpoint';
import { auditClientMemory } from './clientMemoryAudit';
import { worldTestStage } from './worldDiagnostics';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
function runtimePage(data = 81, depth = 27, variables = 27, loop = false) {
  const names = Array.from({length: variables}, (_, i) => `V${i}`);
  let code = `${names.map(n => `VARIABLE ${n}`).join(' ')} ` +
    `: D DUP IF 1 - RECURSE ELSE DROP ${Array.from({length: data}, (_, i) => `${i + 1} `).join('')}${'DROP '.repeat(data)}THEN ; ` +
    `: LOAD ${names.map((n, i) => `${i + 1} ${n} !`).join(' ')} ${depth - 1} D ${loop ? 'BEGIN 0 UNTIL ' : ''};`;
  // Dictionary entries use three header cells, the name and native bytecode.
  // Fill the remaining script cells with an uncalled word; runtime failures
  // must come from the intended arena, not an earlier compiler overflow.
  const compiled = names.reduce((size, name) => size + 4 + name.length, 0) +
    28 + 3 * data + 5 * variables + (loop ? 4 : 0);
  const padding = 729 - compiled - 5; // P's header/name plus RETURN
  code += ` : P ${'0 '.repeat(Math.floor(padding / 2))}${padding % 2 ? 'DROP ' : ''};`;
  const wire = (text: number) => `PAGE 1\nT ${text}:${'x'.repeat(text)}\nC ${code.length}:${code}\n${'B\n'.repeat(25)}`;
  // Fill the wire budget while retaining 27 records and all runtime arenas.
  const text = Array.from({length: 1459}, (_, i) => i).find(n => wire(n).length === 2187);
  if (text === undefined) throw new Error('runtime fixture cannot fill the page wire budget');
  return {body: wire(text), text};
}

test.each([false, true])('network-loaded Forth saturates all runtime arenas and recovers from overflow, programs=%s', programs => {
  const valid = runtimePage();
  const pages = {'/public/index': valid.body, '/public/lab': runtimePage(82).body,
    '/public/game': runtimePage(81, 28).body, '/public/take': runtimePage(81, 27, 28).body,
    '/public/trust': runtimePage(81, 27, 27, true).body};
  const serverDisk = createDiskImage({blocks: 81, volumeId: [0, 0, 2], files: {
    '/net.seq': encodeWide(1), ...Object.fromEntries(Object.entries(pages).map(([path, body]) => [path, encodeText(body)])),
  }});
  const s = createStarterWorld(source, {serverDisk, programs, chat: false}), m = s.machines.client, keys = s.keyboard;
  const audit = auditClientMemory(m, s.programs?.web ?? buildWorldBrowser(source), s.programs?.core);
  let saturated = 0;
  const write = m.write.bind(m);
  m.write = (address, value) => {
    write(address, value);
    if (address === 5305 && value === 81 && m.peek(5364) === 81 && m.peek(5365) === 27 && m.peek(5362) === 27) {
      expect(Array.from({length: 81}, (_, i) => m.peek(5225 + i))).toEqual(Array.from({length: 81}, (_, i) => i + 1));
      expect(Array.from({length: 27}, (_, i) => m.peek(5306 + i)).every(pc => pc >= 4010 && pc < m.peek(5360))).toBe(true);
      expect(Array.from({length: 27}, (_, i) => m.peek(5333 + i))).toEqual(Array.from({length: 27}, (_, i) => i + 1));
      saturated++;
    }
  };
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 50_000_000;
    while (!done() && s.world.cycles < end) { s.world.runCycles(6561); expect(m.peek(2504)).not.toBe(-2); }
    expect(done(), starterScreen(m)).toBe(true);
  };
  const press = (key: number) => { keys.queueTrytes([key]); until(() => canCheckpoint(s)); };
  const open = (path: string) => {
    worldTestStage(`Forth arenas ${path}`);
    if (m.peek(2504) !== 5) press(TEXT_KEYS.console);
    keys.queueText(`open http://bbs.world${path}`); until(() => canCheckpoint(s)); press(TEXT_KEYS.activate);
  };
  const accepted = () => {
    expect(m.peek(2504), starterScreen(m)).toBe(4); expect(m.peek(5434)).toBe(1);
    expect(m.peek(5364)).toBe(0); expect(m.peek(5365)).toBe(0);
    expect(m.peek(5362)).toBe(27); expect(m.peek(5414)).toBe(27);
    expect(m.peek(5360)).toBe(4739);
    expect(m.peek(5420)).toBe(2552 + valid.text);
    expect(saturated).toBeGreaterThan(0);
  };
  until(() => s.machines.server.peek(2381) === 80); keys.queueText(' '); until(() => canCheckpoint(s)); accepted();
  for (const [path, error] of [['/lab', -82], ['/game', -83], ['/take', -91], ['/trust', -84]] as const) {
    open(path); expect(m.peek(2504)).toBe(5); expect(m.peek(5233)).toBe(error);
    expect(m.peek(5364)).toBe(0); expect(m.peek(5365)).toBe(0); expect(m.peek(5368)).toBe(0);
    const before = saturated; open('/index'); accepted(); expect(saturated).toBeGreaterThan(before);
  }
  expect(audit.deepest).toBeGreaterThan(0); expect(audit.deepest).toBeLessThanOrEqual(120);
  console.log(`Simultaneous Forth arenas: 81 data / 27 return / 27 variables; native stack ${audit.deepest}/243; ${audit.phaseLoads} phase loads.`);
}, 120_000);
