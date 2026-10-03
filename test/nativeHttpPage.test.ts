import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const names = ['dns', 'url', 'http', 'forthVm', 'forthPage', 'forthLex', 'forthCompile', 'page'];
const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...names.map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })), { name: 'app', source: `
entry: M S 5710 M A @origin M B 23 C S url_parse M A 1 C S http_init J done
feed: M A 1337 R B 2201 C S http_feed N A Z C S pp_fail J done
finish: C S http_eof N A Z J invalid
      R E pp_mode ife E Z R A h_type C S page_init N A Z J invalid end
      C S page_finish N A Z J invalid
      R E f_ready E E Z J done
      M A @hook M B 4 C S f_find ife A 1 M A Z J done end
      N A Z J invalid M A C C S f_invoke N A Z J invalid
      R E 2207 I E 1 W 2207 E J done
invalid: C S pp_fail
done: W 2200 A H 0sAAA Z
http_body:
      R E pp_mode
      ife E Z
        U S A R A h_type C S page_init
        ifn A Z O S E O S P end
        O S A
      end
      J page_char
origin: "http://home.world/index"
hook: "LOAD"` }]);
function receive(message: string, chunk = 1) {
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'network.state', 'page.text', 'page.script', 'page.records', 'forth.state']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  function execute(label: string) {
    m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null; expect(m.run(1_000_000)).toBe('sleep-forever');
    expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(110); return m.peek(2200);
  }
  expect(execute('entry')).toBe(0); const cells = encodeText(message); let status = 0;
  for (let i = 0; i < cells.length; i += chunk) {
    const part = cells.slice(i, i + chunk); part.forEach((v, j) => m.poke(1337 + j, v)); m.poke(2201, part.length);
    status = execute('feed'); expect(m.peek(2207)).toBe(0); expect(m.peek(5333)).toBe(0); if (status !== 0) break;
  }
  return { m, status, finish: () => execute('finish') };
}
const string = (text: string) => `${text.length}:${text}`;
const source = 'VARIABLE result : LOAD 77 result ! ;';
const body = `PAGE 1\nL ${string('Other')} ${string('http://other.world/index')}\nC ${string(source)}\n`;
const response = (text: string, type = 'text/troika-page', length = text.length) => `HTTP/T1 200\nContent-Length: ${length}\nContent-Type: ${type}\n\n${text}`;
test.each([1, 7, 81, 216])('native HTTP/page/Forth integration enables LOAD only after complete validation, chunks=%i', chunk => {
  const r = receive(response(body), chunk); expect(r.status).toBe(0); expect(r.m.peek(5363)).toBe(0); expect(r.m.peek(5434)).toBe(0);
  expect(r.finish()).toBe(0); expect(r.m.peek(2207)).toBe(1); expect(r.m.peek(5333)).toBe(77); expect(r.m.peek(5434)).toBe(1);
  expect(r.m.peek(6185)).toBe(1); // link validation preserved the pending requested origin
});
test.each([
  response(body.slice(0, -1), 'text/troika-page', body.length),
  response(body + 'x', 'text/troika-page', body.length),
  response(body.replace('PAGE 1', 'PAGE 2')),
  response(body).replace('Content-Length:', 'Content-Length: 0\nContent-Length:'),
  response(`PAGE 1\nC ${string(': LOAD missing ;')}\n`),
])('native framing/page failures cannot execute a previously compiled handler: %s', message => {
  const r = receive(message); const status = r.status || r.finish(); expect(status).toBeLessThan(0);
  expect(r.m.peek(2207)).toBe(0); expect(r.m.peek(5333)).toBe(0); expect(r.m.peek(5363)).toBe(0); expect(r.m.peek(5434)).toBe(0);
});
test('HTTP text/plain never treats page-looking content as source', () => {
  const r = receive(response(body, 'text/plain'), 13); expect(r.status).toBe(0); expect(r.finish()).toBe(0);
  expect(r.m.peek(2207)).toBe(0); expect(r.m.peek(5363)).toBe(0); expect(r.m.peek(5414)).toBe(0);
});
