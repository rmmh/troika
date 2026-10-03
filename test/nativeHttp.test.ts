import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['dns', 'url', 'http', 'httpEmit'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 M A @origin M B 17 C S url_parse C S url_commit R A 2189 C S http_init J done
feed: R A 2202 R B 2201 C S http_feed J done
eof: C S http_eof J done
reset: R A 2189 C S http_init J done
emit: R A 2203 R B 2204 R C 2205 C S http_response_header
done: W 2200 A H 0sAAA Z
http_body:
      W 2197 A R E 2190
      ifl E 216 M F 2552 A F E W F A end
      I E 1 W 2190 E R E 2191 A E A W 2191 E
      R E 2193 ifn E Z M A -109 O S P end
      M A Z C S http_init W 2194 A
      M A 1337 M B Z C S http_feed W 2195 A
      C S http_eof W 2196 A M A Z O S P
origin: "http://bbs.world/"` }]);
function parser(response = false) {
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'network.state', 'page.text']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(2189, response ? 1 : 0);
  function execute(label: string) {
    m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null;
    expect(m.run(1_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(16); return m.peek(2200);
  }
  expect(execute('entry')).toBe(0);
  function feed(input: string | number[], chunk = 216, pointer = 1337) {
    const cells = typeof input === 'string' ? encodeText(input) : input;
    if (!cells.length) { m.poke(2201, 0); m.poke(2202, pointer); return execute('feed'); }
    let status = 0;
    for (let i = 0; i < cells.length; i += chunk) {
      const part = cells.slice(i, i + chunk); part.forEach((v, j) => m.poke(pointer + j, v));
      m.poke(2201, part.length); m.poke(2202, pointer); status = execute('feed'); if (status !== 0) break;
    }
    return status;
  }
  const body = () => Array.from({ length: Math.min(m.peek(2190), 216) }, (_, i) => m.peek(2552 + i));
  const path = () => decodeText(Array.from({ length: m.peek(6226) }, (_, i) => m.peek(6196 + i)));
  return { m, execute, feed, body, path };
}
const get = 'GET /index HTTP/T1\nHost: bbs.world\nContent-Length: 0\n\n';
const reply = 'HTTP/T1 200\nContent-Length: 5\nContent-Type: text/plain\n\nhello';

describe('native incremental HTTP/T1', () => {
  test.each([1, 2, 3, 7, 27, 81, 216])('parses request/response split into %i-cell chunks', chunk => {
    const request = parser(); expect(request.feed(get, chunk)).toBe(0); expect(request.m.peek(6215)).toBe(3);
    expect(request.m.peek(6219)).toBe(1); expect(request.m.peek(6314)).toBe(1); expect(request.path()).toBe('/index'); expect(request.execute('eof')).toBe(0);
    const response = parser(true); expect(response.feed(reply, chunk)).toBe(0); expect(response.m.peek(6215)).toBe(3);
    expect(response.m.peek(6225)).toBe(200); expect(response.m.peek(6218)).toBe(1); expect(decodeText(response.body())).toBe('hello'); expect(response.execute('eof')).toBe(0);
  });
  test('body callbacks receive binary trytes and cannot reenter/reset the parser', () => {
    const r = parser(); const body = [1, 1, ...encodeText('x'), 2, 0, -9841];
    const header = `POST /app/save HTTP/T1\nHost: BBS.World.:80\nContent-Length: ${body.length}\nContent-Type: APPLICATION/X-TROIKA-FORM\n\n`;
    expect(r.feed([...encodeText(header), ...body], 1)).toBe(0); expect(r.body()).toEqual(body);
    expect(r.m.peek(6215)).toBe(3); expect(r.m.peek(6218)).toBe(3); expect(r.m.peek(6314)).toBe(1);
    expect([2194, 2195, 2196].map(a => r.m.peek(a))).toEqual([-105, -105, -105]); expect(r.m.peek(6229)).toBe(0);
  });
  test('host mismatch is explicit and cannot select the configured default virtual host', () => {
    const r = parser(); expect(r.feed(get.replace('bbs.world', 'other.world'))).toBe(0);
    expect(r.m.peek(6314)).toBe(0); expect(r.m.peek(6215)).toBe(3); expect(r.m.peek(6122)).toBe(1);
  });
  test('response Host cannot change the current or pending URL origin', () => {
    const r = parser(true); const before = Array.from({ length: 134 }, (_, i) => r.m.peek(6062 + i));
    expect(r.feed(reply.replace('Content-Length:', 'Host: other.world\nContent-Length:'))).toBe(0);
    expect(Array.from({ length: 134 }, (_, i) => r.m.peek(6062 + i))).toEqual(before);
  });
  test('unknown methods remain identifiable for a 405 response after bounded framing', () => {
    const r = parser(); expect(r.feed(get.replace('GET', 'DELETE'))).toBe(0); expect(r.m.peek(6219)).toBe(3); expect(r.path()).toBe('/index');
  });
  test('unknown well-formed headers, including empty values and token punctuation, are ignored', () => {
    const r = parser(); expect(r.feed(get.replace('Host:', "X-Custom: some value\nX-Empty: \nX_!#$%&'*+.^`|~: x\nHost:"), 3)).toBe(0);
    expect(r.m.peek(6215)).toBe(3);
  });
  test.each([
    'GET / HTTP/T1\nContent-Length: 0\n\n',
    'GET / HTTP/T1\nHost: bbs.world\n\n',
    'GET / HTTP/T1\nHost: bbs.world\nHost: bbs.world\nContent-Length: 0\n\n',
    get.replace('Content-Length: 0', 'Content-Length: 0\ncontent-length: 0'),
    reply.replace('Content-Type: text/plain', 'Content-Type: text/plain\ncontent-type: text/plain'),
    get.replace('Host: bbs.world', 'Host:bbs.world'),
    get.replace('Host: bbs.world', 'Host:  bbs.world'),
    get.replace('Host: bbs.world', 'Host: bbs.world '),
    get.replace('Host: bbs.world', ' Host: bbs.world'),
    get.replace('Host: bbs.world', 'Host: bbs..world'),
    get.replace('Content-Length: 0', 'Content-Length: -1'),
    get.replace('Content-Length: 0', 'Content-Length: 9842'),
    get.replace('Content-Length: 0', 'Content-Length: 1x'),
    get.replace('Content-Length: 0', 'Content-Length: '),
    get.replace('Host:', 'Transfer-Encoding: chunked\nHost:'),
    get.replace('/index', '/../x'), get.replace('GET ', 'GET  '), get.replace(' HTTP/T1', ' HTTP/1.1'),
    reply.replace('Content-Type: text/plain\n', ''), reply.replace('200', '20'), reply.replace('200', '020'),
    reply.replace('200', '200 OK'), reply.replace('Content-Type: text/plain', 'Content-Type: '),
  ])('rejects malformed framing %s', text => {
    const r = parser(text.startsWith('HTTP/')); expect(r.feed(text, 1)).toBe(-101); expect(r.m.peek(6215)).toBe(-1);
    expect(r.feed(get)).toBe(-101); expect(r.execute('eof')).toBe(-101);
  });
  test('POST bounds path, content type and body size before delivering any body cells', () => {
    const message = (path: string, length: number, type: string) => `POST ${path} HTTP/T1\nHost: bbs.world\nContent-Length: ${length}\nContent-Type: ${type}\n\n`;
    for (const [wire, error] of [[message('/index', 0, 'application/x-troika-form'), -104], [message('/app/save', 0, 'text/plain'), -103], [message('/app/save', 217, 'application/x-troika-form'), -102]] as const) {
      const r = parser(); expect(r.feed(wire)).toBe(error); expect(r.m.peek(2190)).toBe(0);
    }
    const getBody = parser(); expect(getBody.feed(get.replace('Content-Length: 0', 'Content-Length: 1\nContent-Type: text/plain'))).toBe(-101);
  });
  test('extra bytes and early EOF fail without invoking the body callback again', () => {
    const r = parser(true); expect(r.feed(reply)).toBe(0); expect(r.feed('x')).toBe(-101); expect(r.m.peek(2190)).toBe(5);
    const truncated = parser(true); expect(truncated.feed(reply.slice(0, -1))).toBe(0); expect(truncated.execute('eof')).toBe(-106); expect(truncated.m.peek(2190)).toBe(4);
    const header = parser(); expect(header.feed(get.slice(0, -1))).toBe(0); expect(header.execute('eof')).toBe(-106);
    const sameChunk = parser(true); expect(sameChunk.feed(reply + 'x')).toBe(-101); expect(sameChunk.m.peek(2190)).toBe(5);
  });
  test('body callback errors are sticky and release the parser guard', () => {
    const r = parser(true); r.m.poke(2193, 1); expect(r.feed(reply)).toBe(-109); expect(r.m.peek(2190)).toBe(1);
    expect(r.m.peek(6229)).toBe(0); expect(r.feed('remaining')).toBe(-109);
    expect(r.execute('reset')).toBe(0); expect(r.m.peek(6311)).toBe(0);
  });
  test('81-cell lines and exactly 486 header cells fit; the next cell is rejected', () => {
    const base = get.slice(0, -1); let padding = ''; let left = 486 - base.length - 1;
    while (left > 0) { const n = Math.min(82, left); padding += 'X: ' + 'a'.repeat(n - 4) + '\n'; left -= n; }
    const wire = base + padding + '\n'; expect(wire.length).toBe(486);
    const r = parser(); expect(r.feed(wire, 17)).toBe(0); expect(r.m.peek(6224)).toBe(486);
    expect(parser().feed(base + 'X: ' + 'a'.repeat(79) + '\n\n')).toBe(-102);
    expect(parser().feed(wire.slice(0, -1) + 'X: x\n\n')).toBe(-102);
  });
  test('raw body length 9841 is counted exactly without retaining it in hidden memory', () => {
    const r = parser(true); expect(r.feed('HTTP/T1 200\nContent-Length: 9841\nContent-Type: application/octet-stream\n\n')).toBe(0);
    expect(r.feed(Array(9841).fill(1))).toBe(0); expect(r.m.peek(6217)).toBe(9841); expect(r.m.peek(6215)).toBe(3); expect(r.execute('eof')).toBe(0);
  });
  test('rejects source aliasing the scratch/header arenas before processing it', () => {
    const r = parser(); expect(r.feed(get, 216, 5711)).toBe(-101); expect(r.m.peek(6224)).toBe(0);
  });
});


test.each([0, 1, 9, 10, 99, 100, 999, 1000, 9841])('native response encoder renders Content-Length %i within the line arena', length => {
  const r = parser(true); r.m.poke(2203, 200); r.m.poke(2204, length); r.m.poke(2205, 2);
  expect(r.execute('emit')).toBe(0);
  const header = decodeText(Array.from({ length: r.m.peek(6223) }, (_, i) => r.m.peek(6230 + i)));
  expect(header).toBe(`HTTP/T1 200\nContent-Length: ${length}\nContent-Type: text/troika-page\n\n`);
  const receiver = parser(true); expect(receiver.feed(header, 1)).toBe(0); expect(receiver.m.peek(6216)).toBe(length);
});
test.each([[404, 0, 0], [503, 216, 3], [500, 17, 1]])('native response encoder round-trips status/length/type %j', (status, length, type) => {
  const r = parser(true); r.m.poke(2203, status); r.m.poke(2204, length); r.m.poke(2205, type); expect(r.execute('emit')).toBe(0);
  const header = Array.from({ length: r.m.peek(6223) }, (_, i) => r.m.peek(6230 + i));
  const receiver = parser(true); expect(receiver.feed(header)).toBe(0);
  expect(receiver.m.peek(6225)).toBe(status); expect(receiver.m.peek(6216)).toBe(length); expect(receiver.m.peek(6218)).toBe(type);
});
test.each([0, 54, 58, -41])('undefined text code %i is rejected in headers but permitted as a raw body cell', code => {
  const bad = parser(); expect(bad.feed([...encodeText('X'), code, ...encodeText(' / HTTP/T1\n')])).toBe(-101);
  const body = parser(true); expect(body.feed([...encodeText('HTTP/T1 200\nContent-Length: 1\nContent-Type: text/plain\n\n'), code])).toBe(0); expect(body.body()).toEqual([code]);
});
