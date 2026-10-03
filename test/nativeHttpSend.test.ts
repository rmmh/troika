import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['dns', 'url', 'http', 'httpRequest', 'httpSend', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'pageState', 'page', 'pageForm'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
const built = linkFirmware([{ name: 'boot', source: 'J done' }, ...modules, { name: 'app', source: `
parse: M A 1337 R B 2203 C S url_parse J done
commit: C S url_commit J done
page_begin: M A 2 C S page_init J done
app_page_feed: M A 1337 R B 2203 C S page_feed J done
page_end: C S page_finish J done
form_body: C S page_form_body W 2201 B W 2202 C J done
emit: R A 2204 R B 2205 C S http_request_header W 2201 B W 2202 C J done
reset: M A Z C S http_init J done
feed: M A 1337 R B 2203 C S http_feed J done
eof: C S http_eof J done
http_body: R E 2206 M F 3000 A F E W F A I E 1 W 2206 E M A Z O S P
done: W 2200 A H 0sAAA Z` }]);
function client() {
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'network.state', 'page.text', 'page.script', 'page.records', 'forth.state']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  function execute(label: string) {
    m.poke(REG_P, built.image.labels.get(label)!); m.sleep = null;
    expect(m.run(1_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(16); return m.peek(2200);
  }
  function input(s: string | number[]) {
    const cells = typeof s === 'string' ? encodeText(s) : s;
    cells.forEach((v, i) => m.poke(1337 + i, v)); m.poke(2203, cells.length);
  }
  function parse(url: string) { input(url); return execute('parse'); }
  function emit(method = 1, length = 0) {
    m.poke(2204, method); m.poke(2205, length); const status = execute('emit');
    const count = status === 0 ? m.peek(2201) : 0;
    return { status, cells: Array.from({ length: count }, (_, i) => m.peek(m.peek(2202) + i)) };
  }
  function feed(cells: number[]) { input(cells); return execute('feed'); }
  function loadPage(wire: string) {
    expect(execute('page_begin')).toBe(0); const cells = encodeText(wire);
    for (let i = 0; i < cells.length; i += 216) { input(cells.slice(i, i + 216)); expect(execute('app_page_feed')).toBe(0); }
    expect(execute('page_end')).toBe(0);
  }
  return { m, execute, parse, emit, feed, loadPage };
}

describe('native browser request emission', () => {
  test.each([
    ['http://BBS.World.:00080/index', 'bbs.world', '/index'],
    ['http://bbs.world:9841/app/save', 'bbs.world:9841', '/app/save'],
    ['http://[AAA.___.__N]:9/', '[AAA.___.__N]:9', '/'],
    [`http://${'a'.repeat(27)}.${'b'.repeat(26)}:9841/app/abcdefghijklm`, `${'a'.repeat(27)}.${'b'.repeat(26)}:9841`, '/app/abcdefghijklm'],
  ])('GET canonicalizes %s and round-trips through the native server', (url, host, path) => {
    const r = client(); expect(r.parse(url)).toBe(0); expect(r.execute('commit')).toBe(0);
    const origin = Array.from({ length: 134 }, (_, i) => r.m.peek(6062 + i));
    const result = r.emit(); expect(result.status).toBe(0);
    expect(decodeText(result.cells)).toBe(`GET ${path} HTTP/T1\nHost: ${host}\nContent-Length: 0\n\n`);
    expect(Array.from({ length: 134 }, (_, i) => r.m.peek(6062 + i))).toEqual(origin);
    expect(r.execute('reset')).toBe(0);
    for (const cell of result.cells) expect(r.feed([cell])).toBe(0);
    expect(r.execute('eof')).toBe(0); expect(r.m.peek(6314)).toBe(1); expect(r.m.peek(6219)).toBe(1);
  });
  test.each([0, 1, 5, 9, 10, 15, 19, 50, 95, 99, 100, 105, 109, 150, 195, 199, 200, 215, 216])('POST body length %i is exact and accepted by the native parser', length => {
    const r = client(); expect(r.parse('http://bbs.world:8080/index')).toBe(0); expect(r.execute('commit')).toBe(0);
    expect(r.parse('/app/save')).toBe(0); const result = r.emit(2, length); expect(result.status).toBe(0);
    expect(decodeText(result.cells)).toBe(`POST /app/save HTTP/T1\nHost: bbs.world:8080\nContent-Length: ${length}\nContent-Type: application/x-troika-form\n\n`);
    expect(r.execute('reset')).toBe(0); expect(r.feed(result.cells)).toBe(0);
    expect(r.feed(Array(length).fill(-9841))).toBe(0); expect(r.execute('eof')).toBe(0);
    expect(r.m.peek(2206)).toBe(length); expect(r.m.peek(6314)).toBe(1); expect(r.m.peek(6218)).toBe(3);
  });
  test('maximum header uses exactly 159 scratch cells without touching the next cell', () => {
    const host = `${'a'.repeat(27)}.${'b'.repeat(26)}:9841`;
    const r = client(); expect(r.parse(`http://${host}/app/abcdefghijklm`)).toBe(0); expect(r.execute('commit')).toBe(0);
    r.m.poke(5711 + 159, 777); const result = r.emit(2, 216);
    expect(result.status).toBe(0); expect(result.cells).toHaveLength(159); expect(r.m.peek(5711 + 159)).toBe(777);
    expect(r.execute('reset')).toBe(0); expect(r.feed(result.cells)).toBe(0); expect(r.feed(Array(216).fill(1))).toBe(0); expect(r.execute('eof')).toBe(0);
  });
  test.each([
    [0, 0, -104], [3, 0, -104], [1, 1, -101], [1, -1, -101], [2, -1, -101], [2, 217, -102],
  ])('rejects method/length %i/%i before emitting output', (method, length, error) => {
    const r = client(); expect(r.parse('http://bbs.world/app/save')).toBe(0); expect(r.execute('commit')).toBe(0);
    r.m.poke(5711, 777); expect(r.emit(method, length).status).toBe(error); expect(r.m.peek(5711)).toBe(777);
  });
  test.each(['http://other.world/app/save', 'http://bbs.world:81/app/save', 'http://[AAA.___.__N]/app/save', '/index', '/'])('POST refuses a foreign origin or non-app path: %s', url => {
    const r = client(); expect(r.parse('http://bbs.world/')).toBe(0); expect(r.execute('commit')).toBe(0); expect(r.parse(url)).toBe(0);
    r.m.poke(5711, 777); expect(r.emit(2).status).toBe(-104); expect(r.m.peek(5711)).toBe(777);
  });
  test('GET needs a valid pending URL, and POST additionally needs an accepted origin', () => {
    const r = client(); expect(r.emit().status).toBe(-101);
    expect(r.parse('http://bbs.world/app/save')).toBe(0); expect(r.emit(2).status).toBe(-104);
    expect(r.emit().status).toBe(0);
  });
  test('parser callback reentry cannot overwrite scratch or emitter metadata', () => {
    const r = client(); expect(r.parse('http://bbs.world/')).toBe(0);
    r.m.poke(6229, 1); r.m.poke(5711, 777); r.m.poke(6316, 888);
    expect(r.emit().status).toBe(-105); expect(r.m.peek(5711)).toBe(777); expect(r.m.peek(6316)).toBe(888);
  });
});


test('native page form and request encoders share scratch and deliver a maximum binary POST intact', () => {
  const r = client(); expect(r.parse('http://bbs.world/index')).toBe(0); expect(r.execute('commit')).toBe(0);
  const names = ['abcdefghijklm', 'nopqrstuvwxyz', '0123456789___']; const value = '\n'.repeat(54);
  r.loadPage('PAGE 1\nF 9:/app/save\n' + names.map(name => `I 13:${name} 54:${value}\n`).join(''));
  expect(r.execute('form_body')).toBe(0); const length = r.m.peek(2201); expect(length).toBe(208);
  expect(r.parse('/app/save')).toBe(0); const header = r.emit(2, length); expect(header.status).toBe(0);
  // The header has overwritten scratch. Once it is sent/copied, serialize the
  // frozen page again rather than retaining a second hidden guest buffer.
  expect(r.execute('form_body')).toBe(0); expect(r.m.peek(2201)).toBe(length);
  const body = Array.from({ length }, (_, i) => r.m.peek(5711 + i));
  const expected = [3, ...names.flatMap(name => [13, ...encodeText(name), 54, ...encodeText(value)])];
  expect(body).toEqual(expected); expect(r.execute('reset')).toBe(0); expect(r.feed(header.cells)).toBe(0);
  for (let i = 0; i < body.length; i += 7) expect(r.feed(body.slice(i, i + 7))).toBe(0);
  expect(r.execute('eof')).toBe(0); expect(r.m.peek(2206)).toBe(208); expect(r.m.peek(6314)).toBe(1);
  expect(Array.from({ length }, (_, i) => r.m.peek(3000 + i))).toEqual(expected);
});
