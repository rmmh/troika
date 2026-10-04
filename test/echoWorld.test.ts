import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { linkFirmware } from '../src/firmware/link';
import { createDiskImage } from '../src/firmware/diskImage';
import { REG_P } from '../src/core/machine';
import { BlockMedium } from '../src/core/blockDevice';
import { TextDevice } from '../src/core/textDevice';
import { encodeWide } from '../src/core/wide';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('native ICMP probes reach sleeping HTTP, DNS and DHCP servers and leave browsing usable', () => {
  const s=createStarterWorld(source);
  const image=linkFirmware([{name:'boot',source:'J entry'},...[...WORLD_BASIC_MODULES,'probe'].map(name=>({name,source:source(name)})),{name:'app',source:`
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 2 W 2069 8
W 2070 1 W 2071 2 W 2072 9 W 2545 8
wait: R E 68 N E 4 J wait R E 69 W 2202 @targets W 2203 6
next: R A 2202 M B 27 C S probe_begin N A Z J fail
loop: C S net_poll ifg A Z C S probe_input C S net_discard_input end
C S probe_service E A Z J loop N A 1 J fail
R E 2200 I E 1 W 2200 E R E 2202 I E 3 W 2202 E
R E 2203 I E -1 W 2203 E N E Z J next H 0sAAA Z
fail: W 2201 A H 0sAAA Z
targets: 1 3 2 1 3 4 1 3 5 1 3 13 1 3 3 1 2 3`}]);
  const m=s.world.addMachine('diagnostic');for(const c of image.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,image.image.entry!);
  const key=new TextDevice();m.attach(key);s.world.addInterface('diagnostic',4,[0,0,80],'a');
  s.world.addDisk('diagnostic',[new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,8],files:{'/net.seq':encodeWide(1)}}))]);
  function until(done:()=>boolean) {const end=s.world.cycles+30_000_000;while(!done()&&s.world.cycles<end)s.world.runCycles(6561);expect(done()).toBe(true);}
  until(()=>s.machines.server.peek(2381)===80&&s.machines.archive.peek(2381)===80&&s.machines.door.peek(2381)===80);
  key.queueText(' ');until(()=>!!m.sleep);expect(m.peek(2201)).toBe(0);expect(m.peek(2200)).toBe(6);
  for(const name of ['server','archive','door','security','dns','dhcp'] as const) expect(s.machines[name].peek(2529)).toBe(0);
  s.keyboard.queueText(' ');until(()=>s.machines.client.peek(2504)===4&&s.machines.client.peek(5446)===1&&s.machines.client.peek(2488)===0);
  expect(starterScreen(s.machines.client)).toContain('Welcome to Troika World');
},60_000);

test('ICMP replies progress during an HTTP connection without replacing its retained frame',()=>{
  const s=createStarterWorld(source);
  const nic=s.world.network.add(4,[0,0,100],'b');
  const server=s.machines.server;
  const until=(done:()=>boolean)=>{const end=s.world.cycles+30_000_000;while(!done()&&s.world.cycles<end)s.world.runCycles(6561);expect(done()).toBe(true);};
  until(()=>server.peek(2381)===80&&s.machines.archive.peek(2381)===80&&s.machines.door.peek(2381)===80);
  s.keyboard.queueText(' ');
  until(()=>[4,5].includes(server.peek(2380))&&server.peek(2402)===1);
  const send=(frame:Int16Array)=>{nic.write(-7,0);for(const cell of frame)nic.write(-6,cell);nic.write(-3,1);};
  const request=new Int16Array(243);request[0]=1;request[1]=4;request.set([0,0,20],5);request.set([1,3,10],8);request.set([1,3,2],11);request[14]=27;request[19]=777;request[25]=1;request[26]=27;
  request.set(Array.from({length:27},(_,i)=>i-13),27);send(request);
  let reply:Int16Array|undefined,overlap=false;
  const echoEntry=s.images.server.image.labels.get('net_echo_input')!;
  const echoDrop=s.images.server.image.labels.get('echo_drop')!;
  let retained:number[]|undefined;
  const step=server.startWorldInstruction.bind(server);
  server.startWorldInstruction=()=>{
    if(server.peek(REG_P)===echoEntry&&server.peek(server.peek(2143)+1)===4)retained=Array.from({length:243},(_,i)=>server.peek(1580+i));
    if(retained&&server.peek(REG_P)===echoDrop)expect(Array.from({length:243},(_,i)=>server.peek(1580+i))).toEqual(retained);
    return step();
  };
  const end=s.world.cycles+30_000_000;
  while((!reply||s.machines.client.peek(2504)!==4||s.machines.client.peek(2488)!==0)&&s.world.cycles<end){
    s.world.runCycles(6561);
    if(server.peek(2529)&&[4,5].includes(server.peek(2380)))overlap=true;
    while(nic.inspect(-9)){
      nic.write(-5,0);const frame=Int16Array.from({length:243},()=>nic.read(-4));nic.write(-3,2);
      if(frame[1]===1&&frame[25]===1){
        const response=frame.slice();response.set(frame.slice(2,5),5);response.set(frame.slice(8,11),11);response.set([1,3,10],8);response[25]=2;send(response);
      }else if(frame[1]===4&&frame[25]===2)reply=frame;
    }
  }
  expect(overlap).toBe(true);expect(retained).toBeDefined();expect(reply?.slice(27,54)).toEqual(request.slice(27,54));
  expect(starterScreen(s.machines.client)).toContain('Welcome to Troika World');
},60_000);
