import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { worldTestStage } from './worldDiagnostics';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
function boot() {
  const r=createStarterWorld(source);
  function until(done:()=>boolean) {const end=r.world.cycles+100_000_000;while(!done()&&r.world.cycles<end) {r.world.runCycles(6561);expect(r.machines.client.peek(2504)).not.toBe(-2);expect(r.machines.door.peek(2199)).toBe(0);}expect(done()).toBe(true);}
  const idle=()=>canCheckpoint(r);
  function press(...keys:number[]) {r.keyboard.queueTrytes(keys);until(idle);}
  function type(text:string) {r.keyboard.queueText(text);until(idle);}
  const screen=()=>starterScreen(r.machines.client);
  until(()=>r.machines.door.peek(2381)===80 && r.machines.server.peek(2381)===80 && r.machines.archive.peek(2381)===80);type(' ');
  expect(screen()).toContain('Welcome to Troika World');
  press(...Array(10).fill(TEXT_KEYS.next),TEXT_KEYS.activate);
  expect(screen()).toContain('Door station');
  return {...r,press,type,screen};
}
test('a separate native door server accepts routed forms, rings the bell and cold-boots closed',async()=>{
  const r=boot();worldTestStage('read maintenance manual');
  expect(r.screen()).toContain('Door: CLOSED');
  r.press(...Array(4).fill(TEXT_KEYS.next),TEXT_KEYS.activate);expect(r.screen()).toContain('Demo code: 314');
  r.press(TEXT_KEYS.home);worldTestStage('open door');r.type('314');r.press(TEXT_KEYS.next,TEXT_KEYS.backspace);r.type('1');r.press(TEXT_KEYS.activate);
  expect(r.machines.client.peek(6225)).toBe(200);expect(r.screen()).toContain('Door: OPEN');expect(r.machines.door.peek(2508)).toBe(1);
  worldTestStage('ring bell');r.press(...Array(3).fill(TEXT_KEYS.next),TEXT_KEYS.activate);expect(r.screen()).toContain('Door bell');r.press(TEXT_KEYS.activate);
  expect(r.screen()).toContain('Bell: 1');expect(r.screen()).toContain('Door: OPEN');
  worldTestStage('reject wrong code');r.type('000');r.press(TEXT_KEYS.activate);expect(r.machines.client.peek(6225)).toBe(403);expect(r.machines.door.peek(2508)).toBe(1);
  r.press(TEXT_KEYS.home);expect(r.screen()).toContain('Door: OPEN');
  worldTestStage('close door');r.type('314');r.press(TEXT_KEYS.activate);expect(r.screen()).toContain('Door: CLOSED');
  r.type('314');r.press(TEXT_KEYS.next,TEXT_KEYS.backspace);r.type('1');r.press(TEXT_KEYS.activate);expect(r.machines.door.peek(2508)).toBe(1);
  await new Promise<void>(resolve=>setImmediate(resolve));worldTestStage('cold device boot');const cold=boot();
  expect(cold.screen()).toContain('Door: CLOSED');expect(cold.screen()).toContain('Bell: 0');
},120_000);
