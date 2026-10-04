import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildIrcOverlay } from '../src/world/ircImage';
import { buildTerminalOverlay } from '../src/world/terminalImage';
import { createDiskImage } from '../src/firmware/diskImage';
import { BlockMedium } from '../src/core/blockDevice';
import { encodeWide } from '../src/core/wide';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { REG_P } from '../src/core/machine';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test('native selector switches terminal and IRC on one CPU and recovers from a missing program', () => {
  const s = createStarterWorld(source,{chat:true}), core = buildProgramCore(source, {name:'menu',source:source('programMenu')});
  const terminal = buildTerminalOverlay(core, source), irc = buildIrcOverlay(core, source);
  expect(irc.image.modules.some(module => /^(forth|page|http)/i.test(module.name))).toBe(false);
  expect(irc.image.marginReserved).toBe(0);
  const m = s.world.addMachine('program-client');
  for (const c of core.image.image.chunks) c.data.forEach((v,i)=>m.poke(c.addr+i,v));
  m.poke(REG_P,core.image.image.entry!);
  s.world.addInterface('program-client',4,[0,2,1],'a');
  s.world.addDisk('program-client',[new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,1],files:{'/net.seq':encodeWide(1),'/terminal':terminal.file,'/irc':irc.file}}))]);
  const k = new TextDevice(); m.attach(k); m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
  const until = (done:()=>boolean) => {
    const end=s.world.cycles+30_000_000;
    while(!done()&&s.world.cycles<end){s.world.runCycles(6561);expect(m.peek(2504)).not.toBe(-2);}
    expect(done(),starterScreen(m)).toBe(true);
  };
  const menu=()=>m.peek(2504)===11&&m.peek(2514)===1&&starterScreen(m).includes('Press 1, 2 or 3');
  until(menu);
  k.queueText('1'); until(()=>menu()&&starterScreen(m).includes('Load failed'));
  expect(m.peek(2506)).toBe(-12);
  for(let i=0;i<2;i++){
    k.queueText('2');until(()=>m.peek(2504)===10&&m.peek(2514)===1);
    k.queueText('echo.world');k.queueTrytes([TEXT_KEYS.activate]);until(()=>starterScreen(m).includes('Native echo.'));
    k.queueText(`overlay ${i}`);k.queueTrytes([TEXT_KEYS.activate]);until(()=>starterScreen(m).includes(`\noverlay ${i}`));
    k.queueTrytes([TEXT_KEYS.home]);until(()=>m.peek(2505)===1&&starterScreen(m).includes('Host (Enter):'));
    k.queueTrytes([TEXT_KEYS.console]);until(menu);
    expect(m.peek(2506)).toBe(0);expect(m.peek(2125)).toBe(0);expect(m.peek(2440)).toBe(0);expect(m.inspect(100)).toBe(0);
  }
  k.queueText('3'); until(()=>m.peek(2504)===12&&m.peek(2511)===1);
  const firstPort=m.peek(2527);
  k.queueText('/say hello from overlay');k.queueTrytes([TEXT_KEYS.activate]);
  until(()=>s.chat!.clients[0]!.messages.some(message=>message.nick==='guest'&&message.text==='hello from overlay'));
  until(()=>starterScreen(m).includes('hello from overlay'));
  k.queueText('/join 2');k.queueTrytes([TEXT_KEYS.activate]);until(()=>m.peek(2510)===2&&m.peek(2512)===0);
  k.queueText('/say room two');k.queueTrytes([TEXT_KEYS.activate]);
  until(()=>s.chat!.clients[2]!.messages.some(message=>message.nick==='guest'&&message.text==='room two'));
  k.queueTrytes([TEXT_KEYS.console]);until(menu);
  expect(m.peek(2511)).toBe(0);expect(m.peek(2512)).toBe(0);expect(m.inspect(100)).toBe(0);
  k.queueText('2');until(()=>m.peek(2504)===10&&m.peek(2514)===1);
  expect(starterScreen(m)).toContain('Host (Enter):');
  k.queueTrytes([TEXT_KEYS.console]);until(menu);
  k.queueText('3');until(()=>m.peek(2504)===12&&m.peek(2511)===1);
  expect(m.peek(2527)).not.toBe(firstPort);
  k.queueText('/say back after reload');k.queueTrytes([TEXT_KEYS.activate]);
  until(()=>s.chat!.clients[0]!.messages.some(message=>message.nick==='guest'&&message.text==='back after reload'));
  k.queueTrytes([TEXT_KEYS.console]);until(menu);
  console.log(`Program menu: core ${core.image.reserved}; core+terminal ${core.image.reserved+terminal.image.reserved}; core+IRC ${core.image.reserved+irc.image.reserved}/9666 cells.`);
  expect(core.image.reserved+irc.image.reserved).toBeLessThanOrEqual(9666);
  expect(core.image.reserved+terminal.image.reserved).toBeLessThanOrEqual(9666);
},120_000);
