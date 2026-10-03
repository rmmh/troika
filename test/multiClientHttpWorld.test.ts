import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildWorldBrowser } from '../src/world/browserImages';
import { createDiskImage } from '../src/firmware/diskImage';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { REG_P } from '../src/core/machine';
import { encodeWide } from '../src/core/wide';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test.each([false,true])('production door HTTP serves three native browsers; concurrent POSTs=%s',(posts)=>{
  const s=createStarterWorld(source);
  const image=s.images.door, machine=s.machines.door;
  const banks=[['door_transport_park',1266],['door_http_park',803]] as const;
  const ranges=banks.map(([name,size])=>[image.image.labels.get(name)!,size]);
  expect(image.reserved).toBeLessThanOrEqual(12501);
  const write=machine.write.bind(machine);
  machine.write=(address,value)=>{
    const resident=(address>=-9112&&address<=-3686)||(address>=-3631&&address<=-365)||(address>=365&&address<=1336)||(address>=7007&&address<=9841);
    if(resident&&!ranges.some(([base,size])=>address>=base!&&address<base!+size!))throw new Error(`HTTP context overwrote code at ${address}`);
    write(address,value);
  };
  const clients=(posts?['bell','bell','bell']:['index','manual','bell']).map((path,i)=>{
    const host=20+i,url=`http://door.world/${path}`;
    const built=buildWorldBrowser(name=>name==='npcBrowser'?`
npc_entry: R E 68 N E 4 J npc_entry R E 69 M S 5710
W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 ${host}
W 2070 1 W 2071 3 W 2072 9 W 2073 1 W 2074 3 W 2075 3 W 2545 ${host}
C S browser_init ifl A Z J failed end
M A @target M B ${url.length} C S browser_open ifl A Z J failed end
loop: C S browser_network C S browser_step W 2210 A ifl A Z J failed end J loop
failed: W 2199 A H 0sAAA Z
dhcp_client_input: O S P
dhcp_client_service: O S P
target: "${url}"`:source(name),true);
    const id=`reader${i}`,m=s.world.addMachine(id);
    for(const chunk of built.resident.image.chunks)chunk.data.forEach((v,j)=>m.poke(chunk.addr+j,v));m.poke(REG_P,built.resident.image.entry!);
    s.world.addInterface(id,4,[0,2,i+1],'b');
    s.world.addDisk(id,[new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,host],files:{'/net.seq':encodeWide(1),...Object.fromEntries(Object.entries(built.phases).map(([name,phase])=>[`/${name}`,phase.file]))}}))]);
    const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    return {m,keyboard};
  });
  let simultaneous=0;
  function until(done:()=>boolean){const end=s.world.cycles+50_000_000;while(!done()&&s.world.cycles<end){
    s.world.runCycles(6561);
    const m=s.machines.door,current=m.peek(2300);
    const active=[0,1,2].filter(i=>{const state=m.peek(i===current?2380:m.peek(2312+i)+518);return state>=2&&state<=5;}).length;
    simultaneous=Math.max(simultaneous,active);
    for(const {m} of clients)expect(m.peek(2199)).toBe(0);
  }expect(done()).toBe(true);}
  until(()=>s.machines.door.peek(2381)===80&&s.machines.door.peek(2326)!==0);
  for(const c of clients)c.keyboard.queueText(' ');
  until(()=>clients.every(({m})=>m.peek(2210)===1&&m.peek(2504)===4&&m.peek(5446)===1&&m.peek(2488)===0));
  expect(clients.map(({m})=>m.peek(6225))).toEqual([200,200,200]);
  if(posts){
    simultaneous=0;
    for(const c of clients)c.keyboard.queueTrytes([TEXT_KEYS.activate]);
    until(()=>clients.every(({m})=>m.peek(2210)===1&&m.peek(2504)===4&&m.peek(2488)===0&&starterScreen(m).includes('Bell: ')));
    expect(simultaneous).toBeGreaterThanOrEqual(2);
    expect(s.machines.door.peek(2509)).toBe(3);
    expect(clients.map(({m})=>starterScreen(m).match(/Bell: [1-3]/)?.[0]).sort()).toEqual(['Bell: 1','Bell: 2','Bell: 3']);
  }else{
  expect(simultaneous).toBe(3);
  expect(starterScreen(clients[0]!.m)).toContain('Door: CLOSED');
  expect(starterScreen(clients[1]!.m)).toContain('Demo code: 314');
  expect(starterScreen(clients[2]!.m)).toContain('Door bell');
  }
  expect(clients.map(({m})=>m.peek(6225))).toEqual([200,200,200]);
},120_000);
