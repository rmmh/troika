import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { TextDevice } from '../src/core/textDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const names = ['dns', 'url', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'pageState', 'page', 'pageForm', 'text', 'pageView', 'pageInput', 'pageUi', 'pageKeys', 'pageRequest', 'pageTransmit', 'pageInteractPhase', 'http', 'httpClient', 'httpSend'];
const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...names.map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })), { name: 'app', source: `
entry: M S 5710 M A @origin M B 23 C S url_parse R A 2209 C S page_init J done
feed: M A 1337 R B 2201 C S page_feed J done
finish: C S page_finish J done
form_body: C S page_form_body W 2202 B W 2203 C J done
view: R A 2204 R B 2205 C S page_view W 2206 B J done
focus: R A 2204 R B 2205 C S page_focus W 2206 B J done
edit: R A 2204 R B 2205 R C 2207 R D 2208 C S page_edit W 2206 B J done
request_header: C S page_request_header W 2202 B W 2203 C J done
request_body: C S page_request_body W 2202 B W 2203 C J done
request_clear: C S page_request_clear J done
poll: C S page_poll J done
ui: R A 2204 R B 2205 C S page_ui J done
accept_origin: C S url_commit J done
run: R E pp_valid N E 1 J pp_bad M A @hook M B 4 C S f_find N A Z J done M A C C S f_invoke J done
stream_send: M A -60 O S P
stream_shutdown: M A -60 O S P
http_body: M A Z O S P
done: W 2200 A H 0sAAA Z
origin: "http://home.world/index"
hook: "LOAD"` }]);
const str = (s: string) => `${s.length}:${s}`;
function loader(plain = false) {
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'network.state', 'page.text', 'page.script', 'page.records', 'forth.state', 'screen', 'palette']);
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

function formBody(r: ReturnType<typeof loader>) {
  expect(r.execute('form_body')).toBe(0); expect(r.m.peek(2203)).toBe(5711);
  return Array.from({ length: r.m.peek(2202) }, (_, i) => r.m.peek(5711 + i));
}
test('native form encoder preserves page order, empty values and counted literal text', () => {
  const r = loader(); const values = ['line\nC 12:: LOAD ;', '', 'final']; const names = ['z', 'a', 'm'];
  expect(r.feed(page([form, ...names.flatMap((name, i) => [`I ${str(name)} ${str(values[i]!)}`, `T ${str('ignored')}`])]))).toBe(0);
  expect(r.execute('form_body')).toBe(-113); expect(r.execute('finish')).toBe(0);
  const expected = [3, ...names.flatMap((name, i) => [name.length, ...encodeText(name), values[i]!.length, ...encodeText(values[i]!)])];
  expect(formBody(r)).toEqual(expected); expect(r.m.peek(5368)).toBe(0); expect(r.m.peek(6122)).toBe(0);
});
test('native form encoder emits the exact 208-cell maximum within shared scratch', () => {
  const r = loader(); const names = ['abcdefghijklm', 'nopqrstuvwxyz', '0123456789___']; const value = 'x'.repeat(54);
  expect(r.feed(page([form, ...names.map(name => `I ${str(name)} ${str(value)}`)]))).toBe(0); expect(r.execute('finish')).toBe(0);
  r.m.poke(5919, 777); const body = formBody(r); expect(body).toHaveLength(208); expect(r.m.peek(5919)).toBe(777);
  expect(body).toEqual([3, ...names.flatMap(name => [13, ...encodeText(name), 54, ...encodeText(value)])]);
});
test('native form encoder reads current input values and does not reuse a stale scratch body', () => {
  const r = loader(); expect(r.feed(page([form, 'I 1:x 3:old']))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(formBody(r)).toEqual([1, 1, ...encodeText('x'), 3, ...encodeText('old')]);
  const record = 4739 + 18, pointer = r.m.peek(record + 1);
  encodeText('new value').forEach((v, i) => r.m.poke(pointer + i, v)); r.m.poke(record + 2, 9);
  expect(formBody(r)).toEqual([1, 1, ...encodeText('x'), 9, ...encodeText('new value')]);
  r.m.poke(record + 2, 0); expect(formBody(r)).toEqual([1, 1, ...encodeText('x'), 0]);
});
test('a validated form with no inputs serializes to one count cell', () => {
  const r = loader(); expect(r.feed(page([form, 'S 2:Go']))).toBe(0); expect(r.execute('finish')).toBe(0); expect(formBody(r)).toEqual([0]);
});
test.each([0, 54, -41, 58])('native form encoder refuses invalid edited text code %i without invalidating the page', code => {
  const r = loader(); expect(r.feed(page([form, 'I 1:x 1:v']))).toBe(0); expect(r.execute('finish')).toBe(0);
  const pointer = r.m.peek(4739 + 19); r.m.poke(pointer, code);
  expect(r.execute('form_body')).toBe(-113); expect(r.m.peek(5434)).toBe(1); expect(r.m.peek(5368)).toBe(0);
  r.m.poke(pointer, encodeText('v')[0]!); expect(formBody(r)).toEqual([1, 1, ...encodeText('x'), 1, ...encodeText('v')]);
});
test.each([-1, 55, 9841])('native form encoder refuses out-of-bound edited value length %i', length => {
  const r = loader(); expect(r.feed(page([form, 'I 1:x 1:v']))).toBe(0); expect(r.execute('finish')).toBe(0);
  r.m.poke(4739 + 20, length); expect(r.execute('form_body')).toBe(-113);
});
test('form serialization is unavailable for plain text, absent forms, active loading or running Forth', () => {
  const plain = loader(true); expect(plain.feed('text')).toBe(0); expect(plain.execute('finish')).toBe(0); expect(plain.execute('form_body')).toBe(-113);
  const none = loader(); expect(none.feed(page(['T 1:x']))).toBe(0); expect(none.execute('finish')).toBe(0); expect(none.execute('form_body')).toBe(-113);
  const r = loader(); expect(r.feed(page([form]))).toBe(0); expect(r.execute('finish')).toBe(0);
  for (const active of [5436, 5372]) { r.m.poke(active, 1); expect(r.execute('form_body')).toBe(-112); r.m.poke(active, 0); }
  expect(formBody(r)).toEqual([0]);
});
test.each([2551, 4010, 9841])('native form encoder rejects an invalid nonempty value pointer %i without address wrap', pointer => {
  const r = loader(); expect(r.feed(page([form, 'I 1:x 1:v']))).toBe(0); expect(r.execute('finish')).toBe(0);
  r.m.poke(4739 + 19, pointer); expect(r.execute('form_body')).toBe(-113);
});

function view(r: ReturnType<typeof loader>, top = 0, focus = -1) {
  r.m.poke(2204, top); r.m.poke(2205, focus); return r.execute('view');
}
function screenRows(r: ReturnType<typeof loader>) {
  return Array.from({ length: 27 }, (_, row) => Array.from({ length: 27 }, (_, col) => {
    const cell = r.m.peek(-9841 + row * 27 + col), code = cell - Math.floor((cell + 364) / 729) * 729;
    return code >= 32 && code <= 126 ? String.fromCharCode(code) : ' ';
  }).join('').trimEnd());
}
test('native viewport draws visible records, highlights focus and leaves page code inert', () => {
  const r = loader(); const source = 'VARIABLE n : LOAD 77 n ! ;';
  expect(r.feed(page(['H 5:Title', `T ${str('hello\nworld')}`, 'B', 'L 5:other 6:/index', form, 'I 1:x 7:initial', 'S 4:send', `C ${str(source)}`]))).toBe(0);
  expect(r.execute('finish')).toBe(0);
  const retained = Array.from({ length: 2887 }, (_, i) => r.m.peek(2552 + i));
  expect(view(r, 0, 5)).toBe(0); expect(r.m.peek(2206)).toBe(7);
  expect(screenRows(r).slice(0, 8)).toEqual(['Title', 'hello', 'world', '', '[other]', 'x = initial', '[send]', '']);
  expect(r.m.peek(-9841 + 5 * 27)).toBe(729 + 'x'.charCodeAt(0)); expect(r.m.peek(-9841)).toBe('T'.charCodeAt(0));
  expect(Array.from({ length: 2887 }, (_, i) => r.m.peek(2552 + i))).toEqual(retained);
  expect(r.m.peek(5333)).toBe(0); expect(r.m.peek(5368)).toBe(0);
});
test('native viewport scrolls a long record without allocating wrapped-line records', () => {
  const r = loader(); const lines = Array.from({ length: 35 }, (_, i) => `row${i}`);
  expect(r.feed(page([`T ${str(lines.join('\n'))}`]))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(view(r, 5)).toBe(0); expect(screenRows(r)).toEqual(lines.slice(5, 32)); expect(r.m.peek(2206)).toBe(35);
  expect(view(r, 34)).toBe(0); expect(screenRows(r)).toEqual(['row34', ...Array(26).fill('')]);
  expect(view(r, 35)).toBe(0); expect(screenRows(r)).toEqual(Array(27).fill('')); expect(r.m.peek(2206)).toBe(35);
});
test('exact-width wrapping and empty records each consume the intended row', () => {
  const r = loader(); expect(r.feed(page([`T ${str('A'.repeat(27))}`, 'T 1:B', 'T 0:', 'T 1:C']))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(view(r)).toBe(0); expect(screenRows(r).slice(0, 5)).toEqual(['A'.repeat(27), 'B', '', 'C', '']); expect(r.m.peek(2206)).toBe(4);
});
test('maximum retained text renders as 54 rows and clips within the screen page', () => {
  const r = loader(); expect(r.feed(page([`T ${str('z'.repeat(1458))}`]))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(view(r, 27)).toBe(0); expect(r.m.peek(2206)).toBe(54); expect(screenRows(r)).toEqual(Array(27).fill('z'.repeat(27)));
});
test('plain text stays literal in the native viewport and empty pages have one blank row', () => {
  const r = loader(true); const literal = 'PAGE 1\nC 8:LOAD ;'; expect(r.feed(literal)).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(view(r)).toBe(0); expect(screenRows(r).slice(0, 2)).toEqual(literal.split('\n')); expect(r.m.peek(5363)).toBe(0);
  const empty = loader(); expect(empty.feed(page([]))).toBe(0); expect(empty.execute('finish')).toBe(0); expect(view(empty)).toBe(0);
  expect(empty.m.peek(2206)).toBe(1); expect(screenRows(empty)).toEqual(Array(27).fill(''));
});
test.each([[-1,-1],[1486,-1],[0,-2],[0,1]])('viewport rejects invalid top/focus %j without changing the display', (top, focus) => {
  const r = loader(); expect(r.feed(page(['T 1:x']))).toBe(0); expect(r.execute('finish')).toBe(0); r.m.poke(-9841, 777);
  expect(view(r, top, focus)).toBe(-120); expect(r.m.peek(-9841)).toBe(777);
});
test('viewport requires accepted page state and refuses active parser/handler reentry', () => {
  const r = loader(); expect(view(r)).toBe(-120); expect(r.feed(page(['T 1:x']))).toBe(0); expect(r.execute('finish')).toBe(0);
  for (const active of [5436, 5372]) { r.m.poke(active, 1); expect(view(r)).toBe(-112); r.m.poke(active, 0); }
});

function focus(r: ReturnType<typeof loader>, current: number, direction: number) {
  r.m.poke(2204, current); r.m.poke(2205, direction);
  const status = r.execute('focus'); return [status, r.m.peek(2206)];
}
function edit(r: ReturnType<typeof loader>, record: number, cursor: number, operation: number, cell = 0) {
  r.m.poke(2204, record); r.m.poke(2205, cursor); r.m.poke(2207, operation); r.m.poke(2208, cell);
  const status = r.execute('edit'); return [status, r.m.peek(2206)];
}
function editable(initial = 'abc') {
  const r = loader(); expect(r.feed(page(['T 6:before', form, `I 1:x ${str(initial)}`, 'S 4:send', 'T 5:after']))).toBe(0);
  expect(r.execute('finish')).toBe(0); return r;
}
function value(r: ReturnType<typeof loader>) { return r.text(r.m.peek(4776), r.m.peek(4777)); }
test('native focus traversal wraps across links, inputs and submit records only', () => {
  const r = loader(); expect(r.feed(page(['T 1:a', 'L 1:b 6:/index', 'B', form, 'I 1:x 0:', 'S 1:s', 'C 0:']))).toBe(0);
  expect(r.execute('finish')).toBe(0);
  expect(focus(r, -1, 1)).toEqual([0, 1]); expect(focus(r, 1, 1)).toEqual([0, 4]); expect(focus(r, 4, 1)).toEqual([0, 5]);
  expect(focus(r, 5, 1)).toEqual([0, 1]); expect(focus(r, -1, -1)).toEqual([0, 5]); expect(focus(r, 1, -1)).toEqual([0, 5]);
  expect(focus(r, 5, -1)).toEqual([0, 4]); expect(focus(r, 4, -1)).toEqual([0, 1]);
});
test.each([false, true])('native focus returns no target for inert pages, plain=%s', plain => {
  const r = loader(plain); expect(r.feed(plain ? 'text' : page(['T 1:x']))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(focus(r, -1, 1)).toEqual([0, -1]); expect(focus(r, -1, -1)).toEqual([0, -1]);
});
test('native insertion, backspace and delete update only the input value and length', () => {
  const r = editable(); const before = Array.from({ length: 2887 }, (_, i) => r.m.peek(2552 + i));
  expect(edit(r, 2, 1, 0, encodeText('X')[0])).toEqual([0, 2]); expect(value(r)).toBe('aXbc');
  expect(edit(r, 2, 2, 1)).toEqual([0, 1]); expect(value(r)).toBe('abc');
  expect(edit(r, 2, 1, 2)).toEqual([0, 1]); expect(value(r)).toBe('ac');
  expect(edit(r, 2, 0, 0, encodeText('Y')[0])).toEqual([0, 1]);
  expect(edit(r, 2, 3, 0, encodeText('Z')[0])).toEqual([0, 4]); expect(value(r)).toBe('YacZ');
  const pointer = r.m.peek(4776);
  for (let addr = 2552; addr < 5439; addr++) if (addr !== 4777 && !(addr >= pointer && addr < pointer + 54)) expect(r.m.peek(addr)).toBe(before[addr - 2552]);
  expect(r.execute('form_body')).toBe(0); expect(r.m.peek(5714)).toBe(4); expect(r.text(5715, 4)).toBe('YacZ');
  expect(view(r, 0, 2)).toBe(0); expect(screenRows(r)[1]).toBe('x = YacZ');
});
test('native input capacity is exactly 54; deletion clears the vacated cell and permits another insert', () => {
  const r = editable('a'.repeat(54)); const pointer = r.m.peek(4776);
  expect(edit(r, 2, 27, 0, encodeText('x')[0])).toEqual([-122, 27]); expect(value(r)).toBe('a'.repeat(54));
  expect(edit(r, 2, 54, 1)).toEqual([0, 53]); expect(r.m.peek(pointer + 53)).toBe(0);
  expect(edit(r, 2, 0, 0, encodeText('x')[0])).toEqual([0, 1]); expect(value(r)).toBe('x' + 'a'.repeat(53));
});
test('empty input and edge deletion are no-ops with stable cursors', () => {
  const r = editable(''); expect(edit(r, 2, 0, 1)).toEqual([0, 0]); expect(edit(r, 2, 0, 2)).toEqual([0, 0]);
  expect(edit(r, 2, 0, 0, encodeText('x')[0])).toEqual([0, 1]); expect(edit(r, 2, 1, 2)).toEqual([0, 1]);
  expect(edit(r, 2, 0, 1)).toEqual([0, 0]); expect(value(r)).toBe('x');
  expect(edit(r, 2, 0, 2)).toEqual([0, 0]); expect(value(r)).toBe('');
});
test.each([-41, 0, 54, 58])('invalid inserted text cell %s preserves the value', cell => {
  const r = editable(); expect(edit(r, 2, 1, 0, cell)).toEqual([-121, 1]); expect(value(r)).toBe('abc');
});
test.each([[-1,0,0],[5,0,0],[0,0,0],[2,-1,0],[2,4,0],[2,0,-1],[2,0,3]])('invalid edit request %j preserves page storage', (record, cursor, op) => {
  const r = editable(); const before = Array.from({ length: 2673 }, (_, i) => r.m.peek(2552 + i));
  expect(edit(r, record, cursor, op, 1)[0]).toBe(-121);
  expect(Array.from({ length: 2673 }, (_, i) => r.m.peek(2552 + i))).toEqual(before);
});
test.each([[4776,2551],[4776,3957],[4777,-1],[4777,55],[4778,53]])('corrupt input field %j is rejected before editing', (address, invalid) => {
  const r = editable(); r.m.poke(address, invalid); const before = Array.from({ length: 2673 }, (_, i) => r.m.peek(2552 + i));
  expect(edit(r, 2, 0, 0, 1)[0]).toBe(-121); expect(Array.from({ length: 2673 }, (_, i) => r.m.peek(2552 + i))).toEqual(before);
});
test('native input helpers reject unaccepted pages and active parser/handler reentry', () => {
  const r = loader(); expect(focus(r, -1, 1)[0]).toBe(-121); expect(edit(r, 0, 0, 0, 1)[0]).toBe(-121);
  const accepted = editable();
  for (const address of [5436, 5372]) { accepted.m.poke(address, 1); expect(focus(accepted, -1, 1)[0]).toBe(-112); expect(edit(accepted, 2, 0, 0, 1)[0]).toBe(-112); accepted.m.poke(address, 0); }
});

function ui(r: ReturnType<typeof loader>, event: number, text = 0) {
  r.m.poke(2204, event); r.m.poke(2205, text); return r.execute('ui');
}
test('native UI initializes focus, edits at a movable cursor, renders and freezes a deferred submission', () => {
  const r = editable(); expect(ui(r, 0)).toBe(0); expect(r.m.peek(5444)).toBe(2); expect(r.m.peek(5445)).toBe(3);
  expect(ui(r, 3)).toBe(0); expect(ui(r, 5, encodeText('X')[0])).toBe(0); expect(value(r)).toBe('abXc');
  expect(screenRows(r)[1]).toBe('x = abXc'); expect(ui(r, 6)).toBe(0); expect(value(r)).toBe('abc');
  expect(ui(r, 7)).toBe(0); expect(value(r)).toBe('ab');
  expect(ui(r, 4)).toBe(0); expect(r.m.peek(5445)).toBe(2);
  expect(ui(r, 1)).toBe(0); expect(r.m.peek(5444)).toBe(3);
  expect(ui(r, 8)).toBe(0); expect(r.m.peek(5368)).toBe(1);
  expect(ui(r, 2)).toBe(-123); expect(ui(r, 5, 1)).toBe(-123); expect(value(r)).toBe('ab');
  r.m.poke(5368, 0); expect(ui(r, 2)).toBe(0); expect(r.m.peek(5444)).toBe(2);
});
test('native UI link activation resolves against accepted origin and defers navigation once', () => {
  const r = loader(); expect(r.feed(page(['L 4:next 5:/next']))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(r.execute('accept_origin')).toBe(0); expect(ui(r, 0)).toBe(0); expect(ui(r, 8)).toBe(0);
  expect(r.m.peek(5368)).toBe(2); expect(r.m.peek(5369)).toBe(5954);
  expect(r.text(5954, r.m.peek(5370))).toBe('http://home.world/next'); expect(ui(r, 8)).toBe(-123);
});
test('native UI follows distant focus and clamps manual scroll to document bounds', () => {
  const r = loader(); const lines = Array.from({ length: 35 }, (_, i) => `line${i}`).join('\n');
  expect(r.feed(page(['L 3:top 6:/index', `T ${str(lines)}`, 'L 6:bottom 6:/index']))).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(ui(r, 0)).toBe(0); expect(r.m.peek(5443)).toBe(0);
  expect(ui(r, 1)).toBe(0); expect(r.m.peek(5444)).toBe(2); expect(r.m.peek(5443)).toBe(10); expect(screenRows(r)[26]).toBe('[bottom]');
  expect(ui(r, 10)).toBe(0); expect(r.m.peek(5443)).toBe(10);
  expect(ui(r, 9)).toBe(0); expect(r.m.peek(5443)).toBe(9);
  expect(ui(r, 2)).toBe(0); expect(r.m.peek(5443)).toBe(0); expect(screenRows(r)[0]).toBe('[top]');
  expect(ui(r, 9)).toBe(0); expect(r.m.peek(5443)).toBe(0);
});
test('native UI handles inert pages without inventing focus or executing source-like text', () => {
  const r = loader(true); expect(r.feed(': SUBMIT SEND ;')).toBe(0); expect(r.execute('finish')).toBe(0);
  expect(ui(r, 0)).toBe(0); expect(r.m.peek(5444)).toBe(-1);
  for (const event of [1,2,3,4,5,6,7,8,9,10]) expect(ui(r, event, 1)).toBe(0);
  expect(r.m.peek(5368)).toBe(0); expect(screenRows(r)[0]).toBe(': SUBMIT SEND ;');
});
test('native UI enforces initialized accepted state and rejects active parser/handler reentry', () => {
  const r = loader(); expect(ui(r, 0)).toBe(-124);
  const accepted = editable(); expect(ui(accepted, 1)).toBe(-124); expect(ui(accepted, -1)).toBe(-124); expect(ui(accepted, 11)).toBe(-124);
  for (const address of [5436, 5372]) { accepted.m.poke(address, 1); expect(ui(accepted, 0)).toBe(-112); accepted.m.poke(address, 0); }
});
test.each([': SUBMIT ;', ': SUBMIT SEND ;', ': SUBMIT 1 ;'])('native UI activation honors SUBMIT semantics: %s', source => {
  const r = loader(); expect(r.feed(page([form, 'S 2:go', `C ${str(source)}`]))).toBe(0); expect(r.execute('finish')).toBe(0); expect(ui(r, 0)).toBe(0);
  expect(ui(r, 8)).toBe(source.includes('1') ? -86 : 0); expect(r.m.peek(5368)).toBe(source.includes('SEND') ? 1 : 0);
});
test('native UI redraws local SUBMIT text changes without requiring a navigation action', () => {
  const r = loader(); const source = ': SUBMIT 0 FIELD@ 0 TEXT! ;';
  expect(r.feed(page(['T 6:before', form, 'I 1:x 5:after', 'S 2:go', `C ${str(source)}`]))).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(ui(r, 0)).toBe(0); expect(ui(r, 8)).toBe(0);
  expect(r.m.peek(5368)).toBe(0); expect(screenRows(r)[0]).toBe('after');
});
test('native keyboard polling consumes real device cells, edits values and preserves queued input during SEND', () => {
  const r = editable(''); const keyboard = new TextDevice(); r.m.attach(keyboard);
  expect(r.execute('poll')).toBe(-124); expect(ui(r, 0)).toBe(0); expect(r.execute('poll')).toBe(1);
  keyboard.queueText('ab'); keyboard.queueTrytes([TEXT_KEYS.left, encodeText('X')[0]!, TEXT_KEYS.delete, TEXT_KEYS.backspace, TEXT_KEYS.activate, encodeText('z')[0]!]);
  for (let i = 0; i < 6; i++) expect(r.execute('poll')).toBe(0);
  expect(value(r)).toBe('a'); expect(r.execute('poll')).toBe(0); expect(r.m.peek(5368)).toBe(1);
  expect(r.execute('poll')).toBe(-123); expect(keyboard.inspect(-12, 0)).toBe(encodeText('z')[0]);
  r.m.poke(5368, 0); expect(r.execute('poll')).toBe(0); expect(value(r)).toBe('az'); expect(r.execute('poll')).toBe(1);
});
test('native keyboard polling leaves queued cells untouched during parser/handler activity and rejects unknown controls', () => {
  const r = editable(); const keyboard = new TextDevice(); r.m.attach(keyboard); expect(ui(r, 0)).toBe(0);
  keyboard.queueTrytes([85, 54, 0, 91, -41]);
  for (const active of [5436, 5372]) { r.m.poke(active, 1); expect(r.execute('poll')).toBe(-112); expect(keyboard.inspect(-12, 0)).toBe(85); r.m.poke(active, 0); }
  for (let i = 0; i < 5; i++) expect(r.execute('poll')).toBe(-125);
  expect(value(r)).toBe('abc'); expect(r.execute('poll')).toBe(1);
});
function caret(r: ReturnType<typeof loader>) {
  const cells: number[] = [];
  for (let i = 0; i < 729; i++) if (Math.floor((r.m.peek(-9841 + i) + 364) / 729) === 2) cells.push(i);
  return cells;
}
test('native UI caret follows cursor movement without changing text and disappears on non-input focus', () => {
  const r = editable(); expect(ui(r, 0)).toBe(0); expect(caret(r)).toEqual([27 + 7]);
  expect(ui(r, 3)).toBe(0); expect(caret(r)).toEqual([27 + 6]);
  expect(r.m.peek(-9841 + 27 + 6)).toBe(1458 + 'c'.charCodeAt(0)); expect(value(r)).toBe('abc');
  expect(ui(r, 5, encodeText('X')[0])).toBe(0); expect(caret(r)).toEqual([27 + 7]); expect(value(r)).toBe('abXc');
  expect(ui(r, 1)).toBe(0); expect(caret(r)).toEqual([]);
});
test('exact-width input ending reserves a caret cell without overwriting the following record', () => {
  const r = editable('a'.repeat(23)); expect(ui(r, 0)).toBe(0);
  expect(caret(r)).toEqual([54]); expect(screenRows(r)[3]).toBe('[send]');
  expect(ui(r, 3)).toBe(0); expect(caret(r)).toEqual([53]); expect(screenRows(r)[3]).toBe('[send]');
});
test('native UI follows a caret across literal newlines and back to the first row', () => {
  const r = editable('\n'.repeat(54)); expect(ui(r, 0)).toBe(0);
  expect(r.m.peek(5450)).toBe(55); expect(r.m.peek(5443)).toBe(31); expect(caret(r)).toEqual([24 * 27]);
  for (let i = 0; i < 54; i++) expect(ui(r, 3)).toBe(0);
  expect(r.m.peek(5450)).toBe(1); expect(r.m.peek(5443)).toBe(1); expect(caret(r)).toEqual([4]);
  expect(ui(r, 10)).toBe(0); expect(caret(r)).toEqual([]); expect(value(r)).toBe('\n'.repeat(54));
});
test('native deferred SEND prepares same-origin header then the frozen current form body', () => {
  const r = editable('abc'); expect(r.execute('accept_origin')).toBe(0); expect(ui(r, 0)).toBe(0);
  expect(ui(r, 5, encodeText('X')[0])).toBe(0); expect(ui(r, 8)).toBe(0);
  expect(r.execute('request_header')).toBe(0);
  expect(r.text(5711, r.m.peek(2202))).toBe('POST /app/lock HTTP/T1\nHost: home.world\nContent-Length: 8\nContent-Type: application/x-troika-form\n\n');
  expect(r.m.peek(5453)).toBe(1); expect(r.execute('request_header')).toBe(-126);
  expect(edit(r, 2, 0, 0, 1)[0]).toBe(-123); expect(value(r)).toBe('abcX');
  expect(r.execute('request_body')).toBe(0); expect(r.m.peek(2202)).toBe(8); expect(r.m.peek(2203)).toBe(5711);
  expect(Array.from({ length: 8 }, (_, i) => r.m.peek(5711 + i))).toEqual([1, 1, ...encodeText('x'), 4, ...encodeText('abcX')]);
  expect(r.execute('request_body')).toBe(-126); expect(ui(r, 5, 1)).toBe(-123);
  expect(r.execute('request_clear')).toBe(0); expect(r.m.peek(5453)).toBe(0); expect(r.m.peek(5368)).toBe(0); expect(ui(r, 5, 1)).toBe(0);
});
test('native deferred GO prepares a GET without changing the committed origin', () => {
  const r = loader(); const target = 'http://other.world/next'; expect(r.feed(page([`L 4:next ${str(target)}`]))).toBe(0);
  expect(r.execute('finish')).toBe(0); expect(r.execute('accept_origin')).toBe(0); expect(ui(r, 0)).toBe(0); expect(ui(r, 8)).toBe(0);
  expect(r.execute('request_header')).toBe(0); expect(r.text(5711, r.m.peek(2202))).toBe('GET /next HTTP/T1\nHost: other.world\nContent-Length: 0\n\n');
  expect(r.text(6062, r.m.peek(6117))).toBe('home.world'); expect(r.execute('request_body')).toBe(0); expect(r.m.peek(2202)).toBe(0);
  expect(r.execute('request_clear')).toBe(0); expect(r.m.peek(5369)).toBe(0); expect(r.m.peek(5370)).toBe(0);
});
test('request preparation rejects absent actions, missing origin and wrong ordering; cancellation releases input', () => {
  const r = editable(); expect(r.execute('request_header')).toBe(-126); expect(r.execute('request_body')).toBe(-126);
  expect(ui(r, 0)).toBe(0); expect(ui(r, 8)).toBe(0); expect(r.execute('request_header')).toBe(-100);
  expect(r.m.peek(5453)).toBe(0); expect(ui(r, 5, 1)).toBe(-123); expect(r.execute('request_clear')).toBe(0); expect(ui(r, 5, 1)).toBe(0);
});
test('request body detects a changed encoded length before allowing completion', () => {
  const r = editable(); expect(r.execute('accept_origin')).toBe(0); expect(ui(r, 0)).toBe(0); expect(ui(r, 8)).toBe(0);
  expect(r.execute('request_header')).toBe(0); r.m.poke(4777, 2); // Simulated controller violation, not guest input.
  expect(r.execute('request_body')).toBe(-127); expect(r.m.peek(5453)).toBe(1); expect(r.execute('request_clear')).toBe(0);
});
