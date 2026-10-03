import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText, textEncodingEntries } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const linked = linkFirmware([{ name: 'text', source: readFileSync(new URL('../firmware/include/text.asm', import.meta.url), 'utf8') }, { name: 'app', source: `
ascii: R A 2201 C S text_ascii J done
write: R A 2201 R B 2202 R C 2203 R D 2204 C S text_write W 2202 B W 2203 C
done: W 2200 A H 0sAAA Z` }]);
function driver() {
  const m = new FirmwareProbe(['mmio', 'screen', 'native.stack', 'network.state']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v)); m.poke(REG_S, 5710);
  function execute(label: string) { m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null;
    expect(m.run(100_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710); return m.peek(2200); }
  function write(s: string | number[], cursor = 0, palette = 0) {
    const cells = typeof s === 'string' ? encodeText(s) : s;
    cells.forEach((v, i) => m.poke(2552 + i, v)); m.poke(2201, 2552); m.poke(2202, cells.length); m.poke(2203, cursor); m.poke(2204, palette);
    return execute('write');
  }
  return { m, execute, write };
}
test('native conversion matches every defined Troika text cell, with ASCII LF', () => {
  const r = driver(); for (const { char, value } of textEncodingEntries()) {
    r.m.poke(2201, value); expect(r.execute('ascii'), char).toBe(char.charCodeAt(0));
  }
});
test.each([-9841, -41, 0, 54, 58, 9841])('undefined text %i is rejected', cell => {
  const r = driver(); r.m.poke(2201, cell); expect(r.execute('ascii')).toBe(-115);
});
test('native drawing wraps rows and treats LF as layout rather than a visible character', () => {
  const r = driver(); expect(r.write('AB\ncd', 26, -13)).toBe(0);
  expect([26, 27, 54, 55].map(i => r.m.peek(-9841 + i))).toEqual([65, 66, 99, 100].map(c => c - 13 * 729));
  expect(r.m.peek(2203)).toBe(56); expect(r.m.peek(2202)).toBe(0); expect(r.m.peek(-9841 + 28)).toBe(0);
});
test('last screen cell clips a remaining suffix without changing code memory', () => {
  const r = driver(); expect(r.write('AB', 728, 13)).toBe(1); expect(r.m.peek(-9113)).toBe(13 * 729 + 65);
  expect(r.m.peek(2203)).toBe(729); expect(r.m.peek(2202)).toBe(1);
  expect(r.write('', 729)).toBe(0); expect(r.write('A', 729)).toBe(1);
});
test('invalid text stops before consuming it but preserves the drawn prefix', () => {
  const r = driver(); expect(r.write([...encodeText('A'), 0, ...encodeText('B')])).toBe(-115);
  expect(r.m.peek(-9841)).toBe(65); expect(r.m.peek(-9840)).toBe(0); expect(r.m.peek(2203)).toBe(1); expect(r.m.peek(2202)).toBe(2);
});
test.each([[2552,-1,0,0],[2552,1459,0,0],[2552,1,-1,0],[2552,1,730,0],[2552,1,0,-14],[2552,1,0,14],[-9841,1,0,0],[9841,2,0,0]])('drawing rejects invalid span/cursor/palette %j', (ptr, count, cursor, palette) => {
  const r = driver(); [ptr,count,cursor,palette].forEach((v,i)=>r.m.poke(2201+i,v)); expect(r.execute('write')).toBe(-115);
  expect(r.m.peek(-9841)).toBe(0);
});
