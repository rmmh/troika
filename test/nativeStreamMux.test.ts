import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { World } from '../src/core/world';
import { REG_P } from '../src/core/machine';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeWide } from '../src/core/wide';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
function setup(count=3, hold=false, routed=false, audit=false) {
  const world=new World();
  function add(name:string,host:number,body:string,mux=false) {
    const image=linkFirmware([{name:'boot',source:'$mx_slots: 2552\n$mx_frame: 3818\nJ entry'},...[...WORLD_BASIC_MODULES,'stream','streamData',...(mux?['streamMux']:[]),...(name==='router'?['router']:[])].map(name=>({name,source:source(name)})),{name:'application',source:`
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 ${routed&&name==='server'?3:2} W 2069 ${host} W 2545 ${host}
${routed?`W 2070 1 W 2071 ${name==='server'?3:2} W 2072 8`:""}
${body}`}]);
    const m=world.addMachine(name, audit ? new FirmwareProbe(['mmio','network.buffers','network.state','filesystem','native.stack','page.text','page.script','page.records']) : undefined);for(const c of image.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,image.image.entry!);
    const nic=world.addInterface(name,4,[0,0,host*10],routed&&name==='server'?'remote':'lan');
    world.addDisk(name,[new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,host],files:{'/net.seq':encodeWide(1)}}))]);
    return {m,nic,image};
  }
  const server=add('server',9,`W 2311 ${hold?1:0} M A 80 C S mux_init
loop: C S mux_step
W 2310 Z
next: R A 2310 C S mux_select
R E 2387 ife E 1 R F 2311 N F Z J app_next end
C S stream_peek ifg B Z
  R E st_tx_waiting ife E Z
    C S stream_send ife A Z R A st_rx_left C S stream_consume end
  end
end
app_next: R E 2310 I E 1 W 2310 E N E 3 J next
J loop`,true);
  const clients=Array.from({length:count},(_,i)=>add(`client${i}`,i+1,`
${i===3?"gate: R E 2209 E E Z J gate":""}
W 2200 1 W 2201 ${routed?3:2} W 2202 9 M A 2200 M B 80 M C 243 C S stream_connect
loop: C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end C S stream_service
R E 2210 ife E Z R E st_state ife E 4
M A @payload M B 216 C S stream_send ife A Z W 2210 1 end end end
C S stream_peek ifg B Z
  M E A/0 W 2211 E W 2213 B
  M C B M B A M A 5000 C S net_copy R A st_rx_left C S stream_consume R E 2213 W 2212 E
end
J loop
payload: ${Array.from({length:216},(_,n)=>i*1000+n+1).join(' ')}`));
  if(routed){
    add('router',8,`W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 8
W router_route_count 2 W 2200 1 W 2201 1 W 2202 2 W 2207 1 W 2208 1 W 2209 3 W 2210 1 C S router_init C S serial_alloc
loop: C S net_poll E A 1 C S router_input C S router_service J loop`);
    world.addInterface('router',5,[0,0,81],'remote');
  }
  return {world,server,clients};
}
test('three native clients retain independent frames and exchange data concurrently',()=>{
  const s=setup(3,false,false,true);const end=20_000_000;
  while(!s.clients.every(c=>c.m.peek(2212)===216)&&s.world.cycles<end)s.world.runCycles(6561);
  expect(s.clients.map(c=>c.m.peek(2212))).toEqual([216,216,216]);
  expect(s.clients.map(c=>c.m.peek(2211))).toEqual([1,1001,2001]);
  s.clients.forEach((c,i)=>expect(Array.from({length:216},(_,n)=>c.m.peek(5000+n))).toEqual(Array.from({length:216},(_,n)=>i*1000+n+1)));
  expect(s.clients.map(c=>c.m.peek(2418))).toEqual([1,1,1]);
  for(const {m} of [s.server,...s.clients]) {expect(m).toBeInstanceOf(FirmwareProbe);expect((m as FirmwareProbe).stackHighWater).toBeLessThan(243);}
},30_000);

test('an unread client frame does not block other clients or get overwritten',()=>{
  const s=setup(3,true);
  const until=(done:()=>boolean)=>{const end=s.world.cycles+15_000_000;while(!done()&&s.world.cycles<end)s.world.runCycles(6561);expect(done()).toBe(true);};
  until(()=>s.clients.slice(1).every(c=>c.m.peek(2212)===216));
  expect(s.clients[0]!.m.peek(2212)).toBe(0);
  s.server.m.poke(2311,0);
  until(()=>s.clients[0]!.m.peek(2212)===216);
  expect(Array.from({length:216},(_,i)=>s.clients[0]!.m.peek(5000+i))).toEqual(Array.from({length:216},(_,i)=>i+1));
},30_000);

test('a dropped response retries from its own retained frame while other clients finish',()=>{
  const s=setup();const nic=s.clients[0]!.nic;const receive=nic.receive.bind(nic);let lost=false;
  nic.receive=frame=>{if(!lost&&frame[1]===3&&frame[25]===4){lost=true;return;}receive(frame);};
  const end=20_000_000;while(!s.clients.every(c=>c.m.peek(2212)===216)&&s.world.cycles<end)s.world.runCycles(6561);
  expect(lost).toBe(true);expect(s.clients.map(c=>c.m.peek(2212))).toEqual([216,216,216]);
  s.clients.forEach((c,i)=>expect(Array.from({length:216},(_,n)=>c.m.peek(5000+n))).toEqual(Array.from({length:216},(_,n)=>i*1000+n+1)));
},30_000);

test('a fourth connection gets BUSY while the three admitted clients stay connected',()=>{
  const s=setup(4);
  const until=(done:()=>boolean)=>{const end=s.world.cycles+15_000_000;while(!done()&&s.world.cycles<end)s.world.runCycles(6561);expect(done()).toBe(true);};
  until(()=>s.clients.slice(0,3).every(c=>c.m.peek(2212)===216));
  s.clients[3]!.m.poke(2209,1);
  until(()=>s.clients[3]!.m.peek(2418)<0);
  expect(s.clients[3]!.m.peek(2418)).toBe(-61);expect(s.clients[3]!.m.peek(2473)).toBe(2);
  expect(s.clients.slice(0,3).map(c=>c.m.peek(2380))).toEqual([4,4,4]);
},30_000);

test('three clients exchange full frames through a native router',()=>{
  const s=setup(3,false,true);
  const end=25_000_000;while(!s.clients.every(c=>c.m.peek(2212)===216)&&s.world.cycles<end)s.world.runCycles(6561);
  expect(s.clients.map(c=>c.m.peek(2212)),JSON.stringify(s.clients.map(c=>[c.m.peek(2380),c.m.peek(2418),c.m.peek(2141)]))).toEqual([216,216,216]);
  s.clients.forEach((c,i)=>expect(Array.from({length:216},(_,n)=>c.m.peek(5000+n))).toEqual(Array.from({length:216},(_,n)=>i*1000+n+1)));
},40_000);
