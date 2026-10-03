import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { fromTribbles } from '../src/core/tryte';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['dns', 'url'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710
parse: R A 6202 R B 6201 C S url_parse J done
form: R A 6202 R B 6201 C S url_form J done
commit: C S url_commit J done
same: C S url_same_origin
done: W 6200 A H 0sAAA Z` }]);
function browser() {
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  function execute(label: string) {
    m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null;
    expect(m.run(100_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(8); return m.peek(6200);
  }
  function parse(text: string, label = 'parse', pointer = 2552) {
    const cells = encodeText(text); cells.forEach((v, i) => m.poke(pointer + i, v));
    m.poke(6201, cells.length); m.poke(6202, pointer); return execute(label);
  }
  const string = (pointer: number, length: number) => decodeText(Array.from({ length }, (_, i) => m.peek(pointer + i)));
  const canonical = () => string(5954, m.peek(6187));
  const path = () => string(m.peek(6183), m.peek(6184));
  return { m, execute, parse, canonical, path };
}

describe('native world URL parsing', () => {
  test.each([
    ['http://bbs.world/', 'http://bbs.world/', '/'],
    ['HTTP://BBS.World.:00080/index', 'http://bbs.world/index', '/index'],
    ['http://a:00001/x', 'http://a:1/x', '/x'],
    ['http://a:9841/app/notice', 'http://a:9841/app/notice', '/app/notice'],
    ['http://a:999/file-name_1.x', 'http://a:999/file-name_1.x', '/file-name_1.x'],
    ['http://[___.___.__N]/index', 'http://[___.___.__N]/index', '/index'],
    ['http://[AAA.ZZZ.M_N]:9841/', 'http://[AAA.ZZZ.M_N]:9841/', '/'],
  ])('canonicalizes %s', (input, canonical, path) => {
    const r = browser(); expect(r.parse(input)).toBe(0); expect(r.canonical()).toBe(canonical); expect(r.path()).toBe(path);
    expect(r.m.peek(6185)).toBe(1); expect(r.m.peek(6122)).toBe(0);
  });
  test('decodes numeric address groups as signed trytes without lowercasing them', () => {
    const r = browser(); expect(r.parse('http://[AAA.ZZZ.M_N]/')).toBe(0);
    expect([6180, 6181, 6182].map(a => r.m.peek(a))).toEqual(['AAA', 'ZZZ', 'M_N'].map(fromTribbles));
    expect(r.m.peek(6177)).toBe(1); expect(r.m.peek(6178)).toBe(13);
  });
  test.each([
    '', '/', 'https://a/', 'file://a/', 'http://a', 'http:///', 'http://a//',
    'http://a/../x', 'http://a/.', 'http://a/..', 'http://a/app/', 'http://a/app/a/b',
    'http://a/path?x', 'http://a/path#x', 'http://a/%2e', 'http://a/Upper',
    'http://a/abcdefghijklmn', 'http://a/b/c', 'http://-a/', 'http://a-/',
    'http://a..b/', 'http://.a/', 'http://a_/', 'http://a../', 'http://a:0/',
    'http://a:9842/', 'http://a:99999/', 'http://a:/', 'http://a:+80/',
    'http://a:80x/', 'http://a:80:80/', 'http://user@a/', 'http://a b/',
    'http://[aaa.___.__N]/', 'http://[AA.___.__N]/', 'http://[AAAA.___.__N]/',
    'http://[AAA.___.__N/', 'http://[AAA.___.__N]x/', 'http://[AAA.___.__N]:0/',
  ])('rejects invalid URL %s', input => { const r = browser(); expect(r.parse(input)).toBe(-100); expect(r.m.peek(6185)).toBe(0); });
  test('bounds raw input and DNS host length independently', () => {
    const r = browser(); expect(r.parse('http://' + 'a'.repeat(54) + '/')).toBe(0);
    expect(r.parse('http://' + 'a'.repeat(55) + '/')).toBe(-100);
    expect(r.parse('http://a:' + '0'.repeat(100) + '80/')).toBe(-100);
  });
  test.each([5711, 5712, 5710, 5954])('supports aliased input at %i without clobbering its unread tail', pointer => {
    const r = browser(); expect(r.parse('http://BBS.World.:8080/app/send', 'parse', pointer)).toBe(0);
    expect(r.canonical()).toBe('http://bbs.world:8080/app/send');
  });
});

describe('native URL origin and form checks', () => {
  test('absolute paths inherit only an explicitly committed origin', () => {
    const r = browser(); expect(r.parse('/index')).toBe(-100);
    expect(r.parse('http://bbs.world:8080/')).toBe(0); expect(r.parse('/index')).toBe(-100);
    expect(r.parse('http://bbs.world:8080/')).toBe(0); expect(r.execute('commit')).toBe(0);
    expect(r.parse('/index')).toBe(0); expect(r.canonical()).toBe('http://bbs.world:8080/index'); expect(r.execute('same')).toBe(0);
  });
  test('canonical names and effective ports define origins; aliases and numeric hosts remain distinct', () => {
    const r = browser(); expect(r.parse('http://BBS.World.:80/')).toBe(0); expect(r.execute('commit')).toBe(0);
    for (const [url, same] of [['http://bbs.world/index', 0], ['http://BBS.WORLD:00080/', 0], ['http://alias.world/', 1], ['http://bbs.world:81/', 1], ['http://[___.___.__N]/', 1]] as const) {
      expect(r.parse(url)).toBe(0); expect(r.execute('same')).toBe(same);
    }
  });
  test('numeric origins compare all three components and support relative navigation', () => {
    const r = browser(); expect(r.parse('http://[AAA.___.__N]:9/')).toBe(0); expect(r.execute('commit')).toBe(0);
    expect(r.parse('/index')).toBe(0); expect(r.canonical()).toBe('http://[AAA.___.__N]:9/index'); expect(r.execute('same')).toBe(0);
    expect(r.parse('http://[AAB.___.__N]:9/')).toBe(0); expect(r.execute('same')).toBe(1);
  });
  test('forms require an absolute app path on the current origin', () => {
    const r = browser(); expect(r.parse('/app/post', 'form')).toBe(-100);
    expect(r.parse('http://bbs.world/')).toBe(0); expect(r.execute('commit')).toBe(0);
    expect(r.parse('/app/post', 'form')).toBe(0); expect(r.path()).toBe('/app/post'); expect(r.execute('same')).toBe(0);
    for (const path of ['/', '/index', '/app/', 'http://bbs.world/app/post', 'http://else.world/app/post']) expect(r.parse(path, 'form')).toBe(-100);
  });
  test('failed parsing invalidates only the pending origin and cannot replace the current page origin', () => {
    const r = browser(); expect(r.parse('http://bbs.world/')).toBe(0); expect(r.execute('commit')).toBe(0);
    const before = Array.from({ length: 61 }, (_, i) => r.m.peek(6062 + i));
    expect(r.parse('http://bad..world/')).toBe(-100); expect(r.execute('commit')).toBe(-100);
    expect(Array.from({ length: 61 }, (_, i) => r.m.peek(6062 + i))).toEqual(before);
    expect(r.parse('/ok')).toBe(0); expect(r.canonical()).toBe('http://bbs.world/ok');
  });
});

test.each([
  ['http://BBS.World.:00080/index', 'http://bbs.world/index'],
  ['/app/post', 'http://home.world:8080/app/post'],
  ['http://a:9842/', ''],
])('compiled GO uses native URL normalization and snapshots its action: %s', (input, canonical) => {
  const names = ['dns', 'url', 'forthVm', 'forthPage', 'forthLex', 'forthCompile'];
  const source = `: LOAD 2552 ${input.length} GO 2552 1 0 TEXT! ;`;
  const origin = 'http://home.world:8080/';
  const built = linkFirmware([{ name: 'boot', source: 'J entry' }, ...names.map(name => ({ name,
    source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })), { name: 'app', source: `
entry: M S 5710 M A @origin M B ${origin.length} C S url_parse C S url_commit
      C S f_reset W f_records 1 W 4739 2 W 4740 2552 W 4741 ${input.length} W 4742 ${input.length}
      M A @source M B ${source.length} C S f_feed N A Z J done C S f_seal N A Z J done
      M A @hook M B 4 C S f_find N A Z J done M A C C S f_invoke
done: W 6200 A H 0sAAA Z
origin: ${JSON.stringify(origin)}
source: ${JSON.stringify(source)}
hook: "LOAD"` }]);
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'forth.state', 'page.script', 'page.text', 'page.records']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  encodeText(input).forEach((v, i) => m.poke(2552 + i, v)); m.poke(REG_P, built.image.entry!);
  expect(m.run(300_000)).toBe('sleep-forever'); expect(m.peek(6200)).toBe(canonical ? 0 : -100);
  if (!canonical) { expect(m.peek(5368)).toBe(0); expect(m.peek(6118)).toBe(8080); return; }
  expect(m.peek(5368)).toBe(2); expect(m.peek(5369)).toBe(5954); expect(m.peek(5370)).toBe(canonical.length);
  expect(decodeText(Array.from({ length: canonical.length }, (_, i) => m.peek(5954 + i)))).toBe(canonical);
  expect(m.peek(4741)).toBe(1); expect(m.peek(6118)).toBe(8080);
  expect(m.stackHighWater).toBeLessThanOrEqual(18);
});

test.each([1, 9, 10, 19, 79, 80, 81, 99, 100, 101, 499, 500, 999, 1000, 1001, 9499, 9500, 9501, 9839, 9840, 9841])(
  'renders port %i canonically despite native rounded division', port => {
    const r = browser(); expect(r.parse(`http://a:000${port}/`)).toBe(0);
    expect(r.canonical()).toBe(`http://a${port === 80 ? '' : ':' + port}/`);
  });
