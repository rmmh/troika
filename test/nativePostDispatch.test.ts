import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built = linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','dns','stream','streamData','url','http','httpRequest','httpEmit','httpForm','httpFiles'].map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'app', source: `
entry: M A @origin M B 17 C S url_parse N A Z J done C S url_commit C S hs_reset J done
feed: M A 1337 R B 2201 C S http_feed J done
eof: W st_eof 1 C S http_files_step J done
http_file_type: M A 1 O S P
http_file_post: W 2198 1 M A 204 O S P
done: W 2200 A H 0sAAA Z
origin: "http://bbs.world/"` }]));
function driver() {
  const m = new FirmwareProbe(['mmio','native.stack','network.state','network.buffers','url.state','scratch','filesystem','page.script','page.records']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(100_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(24); return m.peek(2200);
  }
  expect(run('entry')).toBe(0);
  function feed(body: number[], declared = body.length) {
    const request = [...encodeText(`POST /app/post HTTP/T1\nHost: bbs.world\nContent-Length: ${declared}\nContent-Type: application/x-troika-form\n\n`), ...body];
    for (let i = 0; i < request.length; i += 7) {
      const part = request.slice(i, i + 7); part.forEach((v, j) => m.poke(1337 + j, v)); m.poke(2201, part.length);
      expect(run('feed')).toBe(0); expect(m.peek(2198)).toBe(0);
    }
  }
  return { m, run, feed };
}
test.each([{ body: [0], status: 204, dispatched: 1 }, { body: [4], status: 400, dispatched: 0 },
  { body: [1,1,...encodeText('x'),1,0], status: 400, dispatched: 0 },
  { body: [0,1], status: 400, dispatched: 0 }])('POST dispatch requires validated compact data: $body', ({ body, status, dispatched }) => {
  const r = driver(); r.feed(body); expect(r.run('eof')).toBe(0);
  expect(r.m.peek(2198)).toBe(dispatched); expect(r.m.peek(6225)).toBe(status); expect(r.m.peek(2493)).toBe(1);
});
test('valid compact data cannot dispatch before HTTP framing reaches EOF', () => {
  const r = driver(); r.feed([0], 2); expect(r.run('eof')).toBe(0);
  expect(r.m.peek(2198)).toBe(0); expect(r.m.peek(2494)).toBe(-106); expect(r.m.peek(2493)).toBe(5);
});
