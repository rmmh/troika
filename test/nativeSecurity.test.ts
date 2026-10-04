import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld } from '../src/world/starter';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { REG_P, REG_S } from '../src/core/machine';
function driver() {
  const r=createStarterWorld(name=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8'));
  const m=r.machines.security, labels=r.images.security.image.labels;
  function call(label:string,a=0,b=0) {
    m.poke(-13,a);m.poke(-12,b);m.poke(REG_S,5709);m.poke(5709,labels.get('failed')!);
    m.sleep=null;m.poke(REG_P,labels.get(label)!);expect(m.run(100_000)).toBe('sleep-forever');expect(m.peek(REG_S)).toBe(5710);return m.peek(2199);
  }
  function route(path:string) {encodeText(path).forEach((v,i)=>m.poke(6196+i,v));m.poke(6226,path.length);}
  function post(fields:Record<string,string>,path='/app/device') {
    const entries=Object.entries(fields),body=[entries.length,...entries.flatMap(([k,v])=>[k.length,...encodeText(k),v.length,...encodeText(v)])];
    body.forEach((v,i)=>m.poke(4010+i,v));expect(call('http_form_parse',4010,body.length)).toBe(0);route(path);return call('http_file_post');
  }
  function page(path='/index') {route(path);expect(call('security_prepare')).toBe(1);return decodeText(Array.from({length:m.peek(-11)},(_,i)=>m.peek(2552+i)));}
  return {r,m,post,page};
}
test('native camera wraps through every pixel, saturates its count and leaves disk unchanged', () => {
  const d = driver(), before = d.r.disks.security.image();
  for (let i = 1; i <= 28; i++) {
    expect(d.post({code: '', action: '0'})).toBe(0);
    expect(d.m.peek(2510)).toBe(i % 27); expect(d.m.peek(2511)).toBe(Math.min(i, 9));
    const rows = d.page().split('\n').filter(row => row.startsWith('T 9:')).map(row => row.slice(4)).join('');
    expect(rows).toHaveLength(27); expect(rows.indexOf('@')).toBe(i % 27);
    expect(rows.replace('@', '')).toBe('.'.repeat(26));
  }
  expect(d.r.disks.security.image()).toEqual(before);
});
test('invalid native alarm requests cannot arm, disarm or acknowledge', () => {
  const d = driver(); expect(d.post({code: '271', action: '1'})).toBe(0);
  expect(d.post({code: '', action: '0'})).toBe(0);
  for (const action of ['1', '2', '3']) for (const code of ['', '27', '272', '2710']) {
    expect(d.post({code, action})).toBe(403); expect(d.m.peek(2508)).toBe(1); expect(d.m.peek(2509)).toBe(1);
  }
  const invalid: Record<string, string>[] = [{code: '271', action: '4'}, {code: '271', action: ''}, {code: '271', action: '10'}, {action: '0'}, {code: '271'}];
  for (const fields of invalid) {
    expect(d.post(fields)).toBe(400); expect(d.m.peek(2508)).toBe(1); expect(d.m.peek(2509)).toBe(1);
  }
  expect(d.post({code: '271', action: '2'}, '/app/other')).toBe(404);
});
