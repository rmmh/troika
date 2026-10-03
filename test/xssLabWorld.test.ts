import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { decodeText } from '../src/core/textEncoding';
import { XSS_LAB_SAMPLE } from '../src/world/xssLab';
import { worldTestStage } from './worldDiagnostics';
const source = (name:string) => readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
function boot(serverDisk?:Int16Array) {
  const r=createStarterWorld(source,{serverDisk});
  function until(done:()=>boolean) {
    const end=r.world.cycles+100_000_000;
    while(!done()&&r.world.cycles<end) {r.world.runCycles(6561);expect(r.machines.client.peek(2504)).not.toBe(-2);expect(r.machines.server.peek(2199)).toBe(0);}
    expect(done()).toBe(true);
  }
  const idle=()=>canCheckpoint(r);
  function press(...keys:number[]) {r.keyboard.queueTrytes(keys);until(idle);}
  function type(text:string) {r.keyboard.queueText(text);until(idle);}
  function record(index:number) {const at=4739+18*index;const m=r.machines.client;return decodeText(Array.from({length:m.peek(at+2)},(_,i)=>m.peek(m.peek(at+1)+i))).trimEnd();}
  function lab() {press(TEXT_KEYS.home);press(...Array(9).fill(TEXT_KEYS.next),TEXT_KEYS.activate);expect(starterScreen(r.machines.client)).toContain('Template lab');}
  until(()=>r.machines.server.peek(2381)===80);type(' ');
  return {...r,press,type,record,lab};
}
test('the same submitted Forth runs only in the unsafe template and persists across a server cold boot', async()=>{
  const r=boot();r.lab();worldTestStage('unsafe preview');
  r.press(TEXT_KEYS.activate);expect(r.record(1)).toBe('unchanged');r.press(TEXT_KEYS.activate);
  expect(r.record(1)).toBe(XSS_LAB_SAMPLE);expect(r.machines.client.peek(5361)).not.toBe(0);
  expect(r.machines.client.peek(5364)).toBe(0);expect(r.machines.client.peek(5365)).toBe(0);
  r.lab();worldTestStage('literal preview');r.press(TEXT_KEYS.next,TEXT_KEYS.activate);r.press(TEXT_KEYS.activate);
  expect(r.record(1)).toBe('unchanged');expect(r.record(6)).toBe(XSS_LAB_SAMPLE);expect(r.machines.client.peek(5361)).toBe(0);
  const disk=r.disks.server.image();await new Promise<void>(resolve=>setImmediate(resolve));
  const cold=boot(disk);cold.lab();worldTestStage('cold saved unsafe preview');
  cold.press(TEXT_KEYS.next,TEXT_KEYS.next,TEXT_KEYS.activate);
  expect(cold.record(1)).toBe(XSS_LAB_SAMPLE);expect(cold.machines.client.peek(5361)).not.toBe(0);
  cold.lab();cold.press(TEXT_KEYS.next,TEXT_KEYS.activate);
  expect(cold.record(1)).toBe('unchanged');expect(cold.record(6)).toBe(XSS_LAB_SAMPLE);
  expect(cold.machines.client.peek(5361)).toBe(0);expect(cold.machines.server.peek(6960)).toBe(0);
  expect(cold.images.server.reserved).toBeLessThanOrEqual(12501);
},120_000);

test('invalid stored source returns to the console and a clean editor can repair the unsafe preview',()=>{
  const r=boot();r.lab();r.press(TEXT_KEYS.activate);worldTestStage('invalid unsafe source');
  r.press(...Array(XSS_LAB_SAMPLE.length).fill(TEXT_KEYS.backspace));r.type('not_a_word');r.press(TEXT_KEYS.activate);
  expect(r.machines.client.peek(2504)).toBe(5);expect(starterScreen(r.machines.client)).toContain('error');
  worldTestStage('repair through clean editor');r.lab();r.press(TEXT_KEYS.activate);r.press(TEXT_KEYS.activate);
  expect(r.record(1)).toBe(XSS_LAB_SAMPLE);expect(r.machines.client.peek(2504)).toBe(4);
},90_000);
