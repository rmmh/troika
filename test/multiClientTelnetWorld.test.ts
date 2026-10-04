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
import { decodeText } from '../src/core/textEncoding';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('three native terminals keep independent echoes through loss and sleep while connected idle',()=>{
  const s=createStarterWorld(source),server=s.machines.telnet;
  const clients=[0,1,2].map(i=>{
    const host=20+i,built=buildWorldBrowser(name=>name==='npcBrowser'?`
npc_entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 ${host}
W 2070 1 W 2071 3 W 2072 9 W 2073 1 W 2074 3 W 2075 3 W 2545 ${host}
C S browser_init ifl A Z J failed end M A Z C S bu_console_result ifl A Z J failed end
loop: C S browser_step ifl A Z J failed end J loop
failed: W 2199 A H 0sAAA Z
dhcp_client_input: O S P
dhcp_client_service: O S P`:source(name),true);
    const id=`terminal${i}`,m=s.world.addMachine(id);
    for(const c of built.resident.image.chunks)c.data.forEach((v,j)=>m.poke(c.addr+j,v));m.poke(REG_P,built.resident.image.entry!);
    const nic=s.world.addInterface(id,4,[0,2,i+1],'b');
    s.world.addDisk(id,[new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,host],files:{'/net.seq':encodeWide(1),...Object.fromEntries(Object.entries(built.phases).map(([n,p])=>[`/${n}`,p.file]))}}))]);
    const key=new TextDevice();m.attach(key);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    const slot=built.base,write=m.write.bind(m);
    m.write=(addr,value)=>{
      const code=(addr>=-9112&&addr<=-3686)||(addr>=-3631&&addr<=-365)||(addr>=365&&addr<=1336)||(addr>=7007&&addr<=9841);
      if(code&&!(addr>=slot&&addr<slot+1906&&m.peek(2488)===1))throw new Error(`terminal wrote code at ${addr}`);
      if(addr===6)expect(value).toBeGreaterThanOrEqual(5590);
      write(addr,value);
    };
    return {m,nic,key};
  });
  const swrite=server.write.bind(server);
  server.write=(a,v)=>{if((a>=-9112&&a<=-3686)||(a>=-3631&&a<=-365)||(a>=365&&a<=1336)||(a>=7007&&a<=9841))throw new Error(`echo server wrote code at ${a}`);swrite(a,v);};
  const until=(done:()=>boolean)=>{const end=s.world.cycles+40_000_000;while(!done()&&s.world.cycles<end){s.world.runCycles(6561);for(const c of clients)expect(c.m.peek(2199)).toBe(0);expect(server.peek(2199)).toBe(0);}expect(done()).toBe(true);};
  until(()=>server.peek(2381)===23&&clients.every(c=>c.m.peek(2505)===1&&c.m.peek(2488)===0));
  for(const c of clients){c.key.queueText('telnet echo.world');c.key.queueTrytes([TEXT_KEYS.activate]);}
  until(()=>clients.every(c=>starterScreen(c.m).includes('Native echo.')));
  let hold=true,dropped=0;const received:string[][]=[[],[],[]];
  clients.forEach((c,i)=>{const receive=c.nic.receive.bind(c.nic);const seen=new Set<number>();c.nic.receive=frame=>{
    if(frame[1]===3&&frame[25]===4){
      if(i===0&&hold){dropped++;return;}
      if(!seen.has(frame[23]!)){seen.add(frame[23]!);received[i]!.push(decodeText(frame.slice(27,27+frame[26]!)));}
    }receive(frame);
  };});
  for(const [i,c] of clients.entries()){c.key.queueText(`client ${i} ${'x'.repeat(71)}ignored`);c.key.queueTrytes([TEXT_KEYS.activate]);}
  until(()=>dropped>0&&received[1]!.length===1&&received[2]!.length===1);
  expect(received[0]).toEqual([]);hold=false;
  until(()=>received[0]!.length===1);
  for(let i=0;i<3;i++)expect(received[i]!.join('')).toBe(`client ${i} ${'x'.repeat(71)}\n`);
  s.world.runCycles(2_000_000);expect(server.sleep?.remaining).toBe(Infinity);
  let instructions=0;const step=server.startWorldInstruction.bind(server);
  server.startWorldInstruction=()=>{instructions++;return step();};
  s.world.runCycles(1_000_000);expect(instructions).toBe(0);
  for(const c of clients)c.key.queueTrytes([TEXT_KEYS.home]);
  until(()=>clients.every(c=>c.m.peek(2488)===0&&starterScreen(c.m).includes('ok')));
  expect(s.images.telnet.reserved).toBeLessThanOrEqual(9666);
},120_000);
