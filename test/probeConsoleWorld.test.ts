import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { linkFirmware } from '../src/firmware/link';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
import { REG_P } from '../src/core/machine';
import { worldTestStage } from './worldDiagnostics';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('console ping and trace resolve names, cross the router and return to usable browsing',()=>{
  const s=createStarterWorld(source),m=s.machines.client,k=s.keyboard;
  const silentImage=linkFirmware([{name:'boot',source:'J entry'},...WORLD_BASIC_MODULES.map(name=>({name,source:source(name)})),{name:'app',source:`
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 6
loop: C S net_poll C S net_discard_input C S net_service J loop`}]);
  const silent=s.world.addMachine('silent');
  for(const c of silentImage.image.chunks)c.data.forEach((v,i)=>silent.poke(c.addr+i,v));silent.poke(REG_P,silentImage.image.entry!);
  s.world.addInterface('silent',4,[0,0,66],'b');
  let deepest=0;const write=m.write.bind(m),slot=s.images.client.image.labels.get('image_slot')!;
  m.write=(address,value)=>{
    const code=(address>=-9112&&address<=-3686)||(address>=-3631&&address<=-365)||(address>=365&&address<=1336)||(address>=7007&&address<=9841);
    if(code&&!(address>=slot&&address<slot+1906&&m.peek(2488)===1))throw new Error(`probe wrote code at ${address}`);
    const sp=m.peek(6); deepest=Math.max(deepest,5710-sp);
    if(sp<5468||sp>5710)throw new Error(`probe stack escaped: ${sp}`);
    write(address,value);
  };
  const until=(done:()=>boolean)=>{const end=s.world.cycles+30_000_000;while(!done()&&s.world.cycles<end){s.world.runCycles(6561);expect(m.peek(2504)).not.toBe(-2);}expect(done(),starterScreen(m)).toBe(true);};
  const idle=()=>m.peek(2505)===1&&m.peek(2488)===0&&m.read(68)!==4;
  const press=(key:number)=>{k.queueTrytes([key]);until(idle);};
  const command=(text:string)=>{worldTestStage(text);k.queueText(text);until(idle);k.queueTrytes([TEXT_KEYS.activate]);};
  until(()=>s.machines.server.peek(2381)===80);k.queueText(' ');until(idle);press(TEXT_KEYS.console);
  command('ping bbs.world');until(()=>starterScreen(m).includes('Enter: continue'));
  expect(starterScreen(m)).toContain('27 1.3.2 E');expect(m.peek(2488)).toBe(2);
  press(TEXT_KEYS.activate);expect(m.peek(2504)).toBe(5);
  command('trace bbs.world');until(()=>starterScreen(m).includes('Enter: continue'));
  expect(starterScreen(m)).toContain('1 1.2.9 T');expect(starterScreen(m)).toContain('2 1.3.2 E');
  press(TEXT_KEYS.activate);
  for(const input of ['ping','trace','ping http://bbs.world/','ping bbs.world extra']){
    command(input);until(idle);expect(starterScreen(m)).toContain('error -137');
  }
  command('put ping bbs.world');until(idle);expect(starterScreen(m)).toContain('error -15');
  command('ping missing.world');until(idle);expect(starterScreen(m)).toContain('error -51');
  command('ping [__N.__Q.__N]');until(()=>starterScreen(m).includes('Enter: continue'));
  expect(starterScreen(m)).toContain('1.2.9 U');press(TEXT_KEYS.activate);
  command('ping [__N.__P.__S]');until(()=>starterScreen(m).includes('Enter: continue'));
  expect(starterScreen(m)).toContain('27 * *');press(TEXT_KEYS.activate);
  expect(starterScreen(m)).toContain('error -141');
  command('trace [__N.__P.__S]');until(()=>m.peek(5251)===2&&m.peek(5225)===2&&m.peek(2488)===2);
  press(TEXT_KEYS.home);expect(starterScreen(m)).toContain('error -133');
  expect(m.peek(2125)).toBe(0);expect(m.peek(2290)).toBe(0);
  command('open http://bbs.world/index');until(()=>idle()&&m.peek(2504)===4);
  expect(starterScreen(m)).toContain('Welcome to Troika World');
  expect(deepest).toBeGreaterThan(0); expect(deepest).toBeLessThanOrEqual(120);
  expect(s.images.client.reserved).toBeLessThanOrEqual(12501);
},120_000);
