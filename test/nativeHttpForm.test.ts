import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built = linkFirmware(['dns', 'httpForm'].map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'app', source: `
parse: R A 2201 R B 2202 C S http_form_parse J done
find: M A 1337 R B 2202 C S http_form_find W 2203 B W 2204 C J done
done: W 2200 A H 0sAAA Z` }]));
const field = (name: string, value: string | number[]) => [name.length, ...encodeText(name), value.length, ...(typeof value === 'string' ? encodeText(value) : value)];
function driver() {
  const m = new FirmwareProbe(['mmio', 'network.state', 'network.buffers', 'page.script', 'page.records', 'native.stack']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(100_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(4);
    return m.peek(2200);
  }
  function parse(body: number[], source = 4010) {
    body.forEach((v, i) => m.poke(source + i, v)); m.poke(2201, source); m.poke(2202, body.length);
    return run('parse');
  }
  function find(name: string) {
    encodeText(name).forEach((v, i) => m.poke(1337 + i, v)); m.poke(2202, name.length);
    const status = run('find');
    return { status, value: status === 0 ? Array.from({ length: m.peek(2204) }, (_, i) => m.peek(m.peek(2203) + i)) : [] };
  }
  return { m, run, parse, find };
}
test('native form parser validates and finds fields by name, including empty values', () => {
  const r = driver(); const body = [3, ...field('note_2', 'hello\nworld'), ...field('x', ''), ...field('last', 'T 3:raw')];
  expect(r.parse(body)).toBe(0); expect(r.m.peek(2500)).toBe(3);
  expect(r.find('last')).toEqual({ status: 0, value: encodeText('T 3:raw') });
  expect(r.find('note_2').value).toEqual(encodeText('hello\nworld')); expect(r.find('x')).toEqual({ status: 0, value: [] });
  expect(r.find('missing').status).toBe(-135); expect(r.find('Note_2').status).toBe(-135);
  expect(Array.from({ length: body.length }, (_, i) => r.m.peek(4010 + i))).toEqual(body);
  expect(r.parse([0])).toBe(0); expect(r.find('last').status).toBe(-135);
});
test('maximum three-field body occupies exactly 208 cells', () => {
  const r = driver(); const body = [3, ...field('a'.repeat(13), 'x'.repeat(54)), ...field('b'.repeat(13), 'y'.repeat(54)), ...field('c'.repeat(13), 'z'.repeat(54))];
  expect(body.length).toBe(208); expect(r.parse(body)).toBe(0); expect(r.find('c'.repeat(13)).value).toEqual(encodeText('z'.repeat(54)));
});
test.each([
  [], [-1], [4], [0,1], [1,0,0], [1,14,...encodeText('a'.repeat(14)),0],
  [1,...field('A','x')], [1,...field('a-b','x')], [1,...field('x',[0])],
  [1,...field('x',[54])], [1,...field('x',[-41])], [1,...field('x',[58])],
  [1,1,...encodeText('x'),-1], [1,...field('x','a'.repeat(55))],
  [2,...field('x','a'),...field('x','b')], [1,...field('x','ok'),1],
].map(body => ({ body })))('invalid compact form revokes previous descriptors: $body', ({ body }) => {
  const r = driver(); expect(r.parse([1,...field('old','value')])).toBe(0);
  expect(r.parse(body)).toBe(-134); expect(r.m.peek(2500)).toBe(0); expect(r.find('old').status).toBe(-135);
});
test('every truncated prefix of a nonempty form fails', () => {
  const r = driver(); const body = [2,...field('a','one'),...field('b','two')];
  for (let i = 0; i < body.length; i++) expect(r.parse(body.slice(0,i))).toBe(-134);
});
test.each([0,364,2500,2507,4739,4750,9841])('unsafe source span is rejected: %s', source => {
  const r = driver(); r.m.poke(2201, source); r.m.poke(2202, 1);
  expect(r.run('parse')).toBe(-134); expect(r.m.peek(2500)).toBe(0);
});
