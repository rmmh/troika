import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { worldTestStage } from './worldDiagnostics';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('native terminal resolves a routed echo server, edits/submits text, scrolls and disconnects',()=>{
  const s=createStarterWorld(source),m=s.machines.client,k=s.keyboard;
  const until=(done:()=>boolean)=>{const end=s.world.cycles+30_000_000;while(!done()&&s.world.cycles<end){s.world.runCycles(6561);expect(m.peek(2504)).not.toBe(-2);expect(s.machines.telnet.peek(2199)).toBe(0);}expect(done(),starterScreen(m)).toBe(true);};
  const idle=()=>m.peek(2505)===1&&m.peek(2488)===0&&m.read(68)!==4;
  const press=(cell:number)=>{k.queueTrytes([cell]);until(idle);};
  const command=(text:string)=>{worldTestStage(text);k.queueText(text);until(idle);k.queueTrytes([TEXT_KEYS.activate]);};
  until(()=>s.machines.server.peek(2381)===80&&s.machines.telnet.peek(2381)===23);
  k.queueText(' ');until(idle);press(TEXT_KEYS.console);
  command('telnet echo.world');until(()=>starterScreen(m).includes('Native echo.'));
  k.queueText('Hello X');k.queueTrytes([TEXT_KEYS.backspace]);k.queueText('World');k.queueTrytes([TEXT_KEYS.activate]);
  until(()=>starterScreen(m).includes('\nHello World'));
  expect(m.peek(2488)).toBe(2);
  for(let i=0;i<28;i++){k.queueText(`line ${i}`);k.queueTrytes([TEXT_KEYS.activate]);until(()=>starterScreen(m).includes(`\nline ${i}`));}
  expect(starterScreen(m)).not.toContain('Native echo.');expect(starterScreen(m)).toContain('line 27');
  press(TEXT_KEYS.home);expect(starterScreen(m)).toContain('ok');
  command('open http://bbs.world/index');until(()=>idle()&&m.peek(2504)===4);
  expect(starterScreen(m)).toContain('Welcome to Troika World');
  expect(s.images.client.reserved).toBeLessThanOrEqual(12501);
},120_000);
