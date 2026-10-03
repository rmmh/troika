import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld } from '../src/world/starter';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { REG_P, REG_S } from '../src/core/machine';
function driver() {
  const r=createStarterWorld(name=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8'));
  const m=r.machines.door, labels=r.images.door.image.labels;
  function call(label:string,a=0,b=0) {
    m.poke(-13,a);m.poke(-12,b);m.poke(REG_S,5709);m.poke(5709,labels.get('failed')!);
    m.sleep=null;m.poke(REG_P,labels.get(label)!);expect(m.run(100_000)).toBe('sleep-forever');expect(m.peek(REG_S)).toBe(5710);return m.peek(2199);
  }
  function route(path:string) {encodeText(path).forEach((v,i)=>m.poke(6196+i,v));m.poke(6226,path.length);}
  function post(fields:Record<string,string>,path='/app/door') {
    const entries=Object.entries(fields),body=[entries.length,...entries.flatMap(([k,v])=>[k.length,...encodeText(k),v.length,...encodeText(v)])];
    body.forEach((v,i)=>m.poke(4010+i,v));expect(call('http_form_parse',4010,body.length)).toBe(0);route(path);return call('http_file_post');
  }
  function page(path='/index') {route(path);expect(call('door_prepare')).toBe(1);return decodeText(Array.from({length:m.peek(-11)},(_,i)=>m.peek(2552+i)));}
  return {r,m,post,page};
}
test('native door validates credentials and state before changing device state',()=>{
  const d=driver(),before=d.r.disks.door.image();
  expect(d.page()).toContain('Door: CLOSED');
  expect(d.post({code:'314',state:'1'})).toBe(0);expect(d.m.peek(2508)).toBe(1);expect(d.page()).toContain('Door: OPEN  ');
  for(const code of ['','31','315','3140']) {expect(d.post({code,state:'0'})).toBe(403);expect(d.m.peek(2508)).toBe(1);}
  const invalid: Record<string,string>[] = [{code:'314',state:'2'},{code:'314',state:''},{code:'314',state:'10'},{code:'314'},{code:'314',other:'0'}];
  for(const fields of invalid) {
    expect(d.post(fields)).toBe(400);expect(d.m.peek(2508)).toBe(1);
  }
  expect(d.post({code:'314',state:'0'})).toBe(0);expect(d.page('/')).toContain('Door: CLOSED');
  expect(d.r.disks.door.image()).toEqual(before);expect(d.r.images.door.reserved).toBeLessThanOrEqual(9666);
});
test('public bell validates its request and saturates at nine without changing the door',()=>{
  const d=driver();expect(d.post({ring:'0'},'/app/bell')).toBe(400);
  expect(d.post({code:'314',state:'1'},'/app/nope')).toBe(404);
  for(let i=0;i<12;i++)expect(d.post({ring:'1'},'/app/bell')).toBe(0);
  expect(d.page()).toContain('Bell: 9');expect(d.m.peek(2508)).toBe(0);
});
