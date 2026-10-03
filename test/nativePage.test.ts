import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const names = ['dns', 'url', 'forthVm', 'forthPage', 'forthLex', 'forthCompile', 'page'];
const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...names.map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })), { name: 'app', source: `
entry: M S 5710 M A @origin M B 23 C S url_parse R A 2209 C S page_init J done
feed: M A 1337 R B 2201 C S page_feed J done
finish: C S page_finish J done
run: R E pp_valid N E 1 J pp_bad M A @hook M B 4 C S f_find N A Z J done M A C C S f_invoke
done: W 2200 A H 0sAAA Z
origin: "http://home.world/index"
hook: "LOAD"` }]);
const str = (s: string) => `${s.length}:${s}`;
function loader(plain = false) {
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'network.state', 'page.text', 'page.script', 'page.records', 'forth.state']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(2209, plain ? 1 : 2);
  function execute(label: string) {
    m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null;
    expect(m.run(2_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(100); return m.peek(2200);
  }
  expect(execute('entry')).toBe(0);
  function feed(text: string | number[], chunk = 216) {
    const cells = typeof text === 'string' ? encodeText(text) : text; let status = 0;
    for (let i = 0; i < cells.length; i += chunk) {
      const part = cells.slice(i, i + chunk); part.forEach((v, j) => m.poke(1337 + j, v));
      m.poke(2201, part.length); status = execute('feed'); if (status !== 0) break;
    }
    return status;
  }
  const text = (pointer: number, count: number) => decodeText(Array.from({ length: count }, (_, i) => m.peek(pointer + i)));
  return { m, execute, feed, text };
}
const page = (records: string[]) => 'PAGE 1\n' + records.join('\n') + (records.length ? '\n' : '');
const form = `F ${str('/app/lock')}`;

test.each([1, 2, 3, 7, 27, 216])('native page loader compiles C and retains bounded records in %i-cell chunks', chunk => {
  const r = loader(); const wire = page([`H ${str('Door')}`, `T ${str('locked')}`, form,
    `I ${str('state')} ${str('locked')}`, `S ${str('Set')}`, `C ${str('VARIABLE n : LOAD 7 n ! ;')}`]);
  expect(r.feed(wire, chunk)).toBe(0); expect(r.m.peek(5363)).toBe(0); expect(r.m.peek(5434)).toBe(0); expect(r.m.peek(5333)).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(r.m.peek(5434)).toBe(1); expect(r.m.peek(5414)).toBe(6);
  expect(r.m.peek(5420)).toBe(2552 + 81); expect(r.m.peek(5415)).toBe(1); expect(r.m.peek(5429)).toBe(1);
  const input = 4739 + 3 * 18; expect(r.m.peek(input + 3)).toBe(54);
  expect(r.text(r.m.peek(input + 1), r.m.peek(input + 2))).toBe('locked');
  expect(r.text(r.m.peek(input + 4), r.m.peek(input + 5))).toBe('state');
  expect(r.execute('run')).toBe(0); expect(r.m.peek(5333)).toBe(7);
});
test('counted literal newlines and apparent code remain inert text', () => {
  const literal = '\nC 20:: LOAD SEND ;\nPAGE 1'; const r = loader();
  expect(r.feed(page([`T ${str(literal)}`]), 1)).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(r.text(2552, literal.length)).toBe(literal); expect(r.m.peek(5361)).toBe(0); expect(r.execute('run')).toBe(1);
});
test('C records share compiler token/comment/definition state with a logical LF separator', () => {
  const r = loader(); expect(r.feed(page([`C ${str('VARIABLE n : LOAD ( comment')}`, `C ${str('continued ) 9 n ! ;')}`]), 2)).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(r.execute('run')).toBe(0); expect(r.m.peek(5333)).toBe(9);
});
test.each(['http://Other.World.:80/index', '/index', 'http://bad..world/'])('link validation preserves the pending navigation and stays inside the native stack: %s', url => {
  const r = loader(); const before = [...Array.from({ length: 108 }, (_, i) => r.m.peek(5954 + i)), ...Array.from({ length: 73 }, (_, i) => r.m.peek(6123 + i))];
  const result = r.feed(page([`L ${str('Link')} ${str(url)}`]), 1);
  expect(result).toBe(url.includes('bad..') ? -100 : 0);
  const after = [...Array.from({ length: 108 }, (_, i) => r.m.peek(5954 + i)), ...Array.from({ length: 73 }, (_, i) => r.m.peek(6123 + i))];
  expect(after).toEqual(before);
});
test.each([
  '', 'PAGE 2\n', 'page 1\n', 'PAGE 1', 'PAGE 1\nX 0:\n', 'PAGE 1\nB \n',
  'PAGE 1\nT x:a\n', 'PAGE 1\nT :\n', 'PAGE 1\nT 3:ab', 'PAGE 1\nT 1:a x\n',
  page([`I ${str('x')} ${str('v')}`]), page([`S ${str('Go')}`]), page([form, form]),
  page([form, `S ${str('Go')}`, `S ${str('Again')}`]), page([`F ${str('/index')}`]),
  page([`F ${str('http://else.world/app/a')}`]), page([form, `I ${str('Bad')} ${str('x')}`]),
  page([form, `I ${str('a-b')} ${str('x')}`]), page([form, `I ${str('')} ${str('x')}`]),
  page([form, `I ${str('x')} ${str('1')}`, `I ${str('x')} ${str('2')}`]),
  page([`L ${str('x')} ${str('')}`]), page([`L ${str('x')} ${str('/..')}`]),
  page([`C ${str(': LOAD missing ;')}`]), page([`C ${str(': LOAD 7')}`]),
])('malformed/incomplete pages never enable handlers: %s', wire => {
  const r = loader(); const fed = r.feed(wire, 1); const result = fed || r.execute('finish');
  expect(result).toBeLessThan(0); expect(r.m.peek(5434)).toBe(0); expect(r.m.peek(5363)).toBe(0);
});
test('text arena admits exactly 1458 cells; empty boundaries fit but a new cell fails', () => {
  const r = loader(); expect(r.feed(page([`T ${str('a'.repeat(1458))}`, 'B', 'T 0:']), 17)).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(r.m.peek(5420)).toBe(4010);
  const full = loader(); expect(full.feed(page([`T ${str('a'.repeat(1458))}`, 'T 1:b']))).toBe(-111);
});
test('27 records, three fields and fixed 54-cell input reservations are enforced', () => {
  const r = loader(); expect(r.feed(page(Array(27).fill('B')))).toBe(0); expect(r.execute('finish')).toBe(0); expect(r.m.peek(5414)).toBe(27);
  expect(loader().feed(page(Array(28).fill('B')))).toBe(-111);
  const fields = [form, ...[0, 1, 2].map(i => `I ${str('v' + i)} ${str('')}`)];
  const inputs = loader(); expect(inputs.feed(page(fields))).toBe(0); expect(inputs.execute('finish')).toBe(0);
  expect(inputs.m.peek(5420)).toBe(2552 + 9 + 3 * (2 + 54));
  expect(loader().feed(page([...fields, `I ${str('four')} ${str('')}`]))).toBe(-111);
  expect(loader().feed(page([form, `I ${str('x')} ${str('a'.repeat(55))}`]))).toBe(-111);
});
test('page wire-size limit includes discarded C source and record prefixes', () => {
  const r = loader(); expect(r.feed(page([`C ${str('(' + 'a'.repeat(2180) + ')')}`]), 27)).toBe(-111);
});
test('plain text is bounded, literal, and never enables source execution', () => {
  const r = loader(true); const text = 'PAGE 1\nC 14:: LOAD SEND ;'; expect(r.feed(text, 1)).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(r.text(2552, text.length)).toBe(text); expect(r.m.peek(5414)).toBe(0); expect(r.m.peek(5363)).toBe(0);
  const max = loader(true); expect(max.feed('x'.repeat(1458))).toBe(0); expect(max.execute('finish')).toBe(0);
  expect(loader(true).feed('x'.repeat(1459))).toBe(-111);
});
test('extra content after acceptance invalidates the page and clears its ready flag', () => {
  const r = loader(); expect(r.feed(page([`C ${str(': LOAD ;')}`]))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(r.feed('B\n')).toBe(-110); expect(r.m.peek(5434)).toBe(0); expect(r.m.peek(5363)).toBe(0);
});

test('exactly 2187 wire cells fit even when most are discarded source comments', () => {
  const r = loader(); const wire = page([`C ${str('(' + 'x'.repeat(2170) + ')')}`]); expect(wire.length).toBe(2187);
  expect(r.feed(wire, 216)).toBe(0); expect(r.execute('finish')).toBe(0); expect(r.m.peek(5360)).toBe(4010);
  expect(loader().feed(page([`C ${str('(' + 'x'.repeat(2171) + ')')}`]))).toBe(-111);
});
test('compiled FIELD@ consumes the actual parser-created input descriptor', () => {
  const r = loader(); expect(r.feed(page([form, `I ${str('state')} ${str('locked')}`,
    `C ${str('VARIABLE n : LOAD 0 FIELD@ DROP @ n ! ;')}`]), 1)).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(r.execute('run')).toBe(0); expect(r.m.peek(5333)).toBe(encodeText('l')[0]);
});
test('new page initialization clears old text, records, code, variables and readiness', () => {
  const r = loader(); expect(r.feed(page([`T ${str('old page')}`, `C ${str('VARIABLE n : LOAD 7 n ! ;')}`]))).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(r.execute('run')).toBe(0); expect(r.execute('entry')).toBe(0);
  expect([2552, 4010, 4739, 5333, 5363, 5414, 5434].map(a => r.m.peek(a))).toEqual(Array(7).fill(0));
});
