import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { linkFirmware } from '../src/firmware/link';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
import { buildWorldBrowser } from '../src/world/browserImages';
import { createDiskImage } from '../src/firmware/diskImage';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { REG_P } from '../src/core/machine';
import { encodeWide } from '../src/core/wide';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test.each(['get','post','mixed'] as const)('production door HTTP serves three native browsers; requests=%s',(mode)=>{
  const posts=mode==='post';
  const s=createStarterWorld(source);
  const image=s.images.door, machine=s.machines.door;
  const banks=[['door_transport_park',1266],['door_http_park',587]] as const;
  const ranges=banks.map(([name,size])=>[image.image.labels.get(name)!,size]);
  expect(image.reserved).toBeLessThanOrEqual(12501);
  const write=machine.write.bind(machine);
  machine.write=(address,value)=>{
    const resident=(address>=-9112&&address<=-3686)||(address>=-3631&&address<=-365)||(address>=365&&address<=1336)||(address>=7007&&address<=9841);
    if(resident&&!ranges.some(([base,size])=>address>=base!&&address<base!+size!))throw new Error(`HTTP context overwrote code at ${address}`);
    write(address,value);
  };
  const clients=(posts?['bell','bell','bell']:mode==='mixed'?['manual','bell','manual']:['index','manual','bell']).map((path,i)=>{
    const host=20+i,url=`http://door.world/${path}`;
    const built=buildWorldBrowser(name=>name==='npcBrowser'?`
npc_entry: R E 68 N E 4 J npc_entry R E 69 M S 5710
W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 ${host}
W 2070 1 W 2071 3 W 2072 9 W 2073 1 W 2074 3 W 2075 3 W 2545 ${host}
C S browser_init ifl A Z J failed end
W 2207 1
gate: R E 2208 E E Z J gate
M A @target M B ${url.length} C S browser_open ifl A Z J failed end
loop: C S browser_network C S browser_step W 2210 A ifl A Z J failed end J loop
failed: W 2199 A H 0sAAA Z
dhcp_client_input: O S P
dhcp_client_service: O S P
target: "${url}"`:source(name),true);
    const id=`reader${i}`,m=s.world.addMachine(id);
    for(const chunk of built.resident.image.chunks)chunk.data.forEach((v,j)=>m.poke(chunk.addr+j,v));m.poke(REG_P,built.resident.image.entry!);
    const nic=s.world.addInterface(id,4,[0,2,i+1],'b');
    s.world.addDisk(id,[new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,host],files:{'/net.seq':encodeWide(1),...Object.fromEntries(Object.entries(built.phases).map(([name,phase])=>[`/${name}`,phase.file]))}}))]);
    const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    return {m,keyboard,nic};
  });
  // A separate native CPU probes across the router while all HTTP slots are held.
  const probe = mode === 'get' ? (() => {
    const firmware = linkFirmware([{name: 'boot', source: 'J entry'},
      ...[...WORLD_BASIC_MODULES, 'probe'].map(name => ({name, source: source(name)})),
      {name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
W 2067 1 W 2068 2 W 2069 8 W 2070 1 W 2071 2 W 2072 9 W 2545 8
C S serial_alloc N D Z J fail
; Warm the route before intentionally withholding HTTP DATA. The measured
; probe still traverses the router while every server slot is occupied.
M A @target M B 27 C S probe_begin N A Z J fail
warm: C S net_poll ifg A Z C S probe_input C S net_discard_input end
C S probe_service E A Z J warm N A 1 J fail W 2202 1
gate: R E 2203 E E Z J gate
M A @target M B 27 C S probe_begin N A Z J fail
loop: C S net_poll ifg A Z C S probe_input C S net_discard_input end
C S probe_service E A Z J loop N A 1 J fail W 2200 1 H 0sAAA Z
fail: W 2201 A H 0sAAA Z
target: 1 3 5`}]);
    const m = s.world.addMachine('probe');
    for (const chunk of firmware.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
    m.poke(REG_P, firmware.image.entry!);
    s.world.addInterface('probe', 4, [0,0,80], 'a');
    s.world.addDisk('probe', [new BlockMedium(27, false, createDiskImage({blocks: 27, volumeId: [0,0,8], files: {'/net.seq': encodeWide(1)}}))]);
    return m;
  })() : undefined;
  const activeSlots = () => {
    const current = machine.peek(2300);
    return [0,1,2].filter(i => {
      const state = machine.peek(i === current ? 2380 : machine.peek(2312 + i) + 518);
      return state >= 2 && state <= 5;
    }).length;
  };
  let simultaneous=0, holdGets=mode==='get';
  if(holdGets)for(const client of clients){
    const receive=client.nic.receive.bind(client.nic);
    client.nic.receive=frame=>{if(holdGets&&frame[1]===3&&frame[25]===4)return;receive(frame);};
  }
  function until(done:()=>boolean){const end=s.world.cycles+50_000_000;while(!done()&&s.world.cycles<end){
    s.world.runCycles(6561);
    const m=s.machines.door,current=m.peek(2300);
    const active=[0,1,2].filter(i=>{const state=m.peek(i===current?2380:m.peek(2312+i)+518);return state>=2&&state<=5;}).length;
    simultaneous=Math.max(simultaneous,active);
    for(const {m} of clients)expect(m.peek(2199)).toBe(0);
  }expect(done(), JSON.stringify({bell:machine.peek(2509),writer:machine.peek(2331),clients:clients.map(c=>({screen:starterScreen(c.m),state:c.m.peek(2380),action:c.m.peek(5368),status:c.m.peek(2418)}))})).toBe(true);}
  until(()=>s.machines.door.peek(2381)===80&&s.machines.door.peek(2326)!==0);
  if(probe){until(()=>probe.peek(2202)===1 || probe.peek(2201)!==0);expect(probe.peek(2201)).toBe(0);}
  if(mode==='mixed'){
    const ready=(i:number)=>{const m=clients[i]!.m;return m.peek(2210)===1&&m.peek(2504)===4&&m.peek(5446)===1&&m.peek(2488)===0;};
    const readers=()=>[0,1,2].filter(i=>machine.peek(i===machine.peek(2320)?6960:machine.peek(2325+i)+583)===1).length;
    for(const c of clients)c.keyboard.queueText(' ');
    until(()=>clients.every(c=>c.m.peek(2207)===1));
    clients[1]!.m.poke(2208,1);until(()=>ready(1));
    // Drop server DATA for one reader: its retained response and file handle
    // must survive while the other connections continue receiving requests.
    let hold=true,dropped=0;
    const receive=clients[0]!.nic.receive.bind(clients[0]!.nic);
    clients[0]!.nic.receive=frame=>{if(hold&&frame[1]===3&&frame[25]===4){dropped++;return;}receive(frame);};
    clients[0]!.m.poke(2208,1);until(()=>readers()>0&&dropped>0);
    clients[1]!.keyboard.queueTrytes([TEXT_KEYS.activate]);
    until(()=>machine.peek(2331)!==-1);
    expect(machine.peek(2509)).toBe(0);expect(readers()).toBeGreaterThan(0);
    clients[2]!.m.poke(2208,1);simultaneous=0;until(()=>simultaneous===3);
    expect(machine.peek(2509)).toBe(0);
    hold=false;
    until(()=>clients.every((_,i)=>ready(i))&&starterScreen(clients[1]!.m).includes('Bell: 1'));
    expect(machine.peek(2509)).toBe(1);
    expect(starterScreen(clients[0]!.m)).toContain('Demo code: 314');
    expect(starterScreen(clients[2]!.m)).toContain('Demo code: 314');
    expect(clients.map(({m})=>m.peek(6225))).toEqual([200,200,200]);
    return;
  }
  for(const c of clients)c.keyboard.queueText(' ');
  until(()=>clients.every(c=>c.m.peek(2207)===1));
  for(const c of clients)c.m.poke(2208,1);
  if(holdGets){
    until(()=>simultaneous===3 && probe!.peek(2202)===1);
    expect(activeSlots()).toBe(3);
    probe!.poke(2203,1);
    until(()=>probe!.peek(2200)===1 || probe!.peek(2201)!==0);
    expect(probe!.peek(2201)).toBe(0); expect(probe!.peek(2200)).toBe(1);
    expect(activeSlots()).toBe(3);
    holdGets=false;
  }
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
