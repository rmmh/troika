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
import { encodeText, decodeText } from '../src/core/textEncoding';
import { encodeWide } from '../src/core/wide';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test.each(['catalog','post'] as const)('production BBS serves three native clients; requests=%s',(mode)=>{
  const names=Array.from({length:19},(_,i)=>`topic${String(i).padStart(5,'0')}`);
  const files:Record<string,number[]>={'/net.seq':[...encodeWide(1)],'/public/board':encodeText('PAGE 1\nH 5:Board\nF 9:/app/post\nI 3:msg 0:\nS 4:Post\n')};
  for(const name of names)files[`/public/t_${name}`]=encodeText(`PAGE 1\nT 10:${name}\n`);
  const s=createStarterWorld(source,{serverDisk:createDiskImage({blocks:81,volumeId:[0,0,2],files})});
  const machine=s.machines.server,image=s.images.server;
  expect(image.reserved).toBeLessThanOrEqual(12501);
  const write=machine.write.bind(machine);
  machine.write=(address,value)=>{
    const code=(address>=-9112&&address<=-3686)||(address>=-3631&&address<=-365)||(address>=365&&address<=1336)||(address>=7007&&address<=9841);
    if(address>=-9215&&address<=-9113)throw new Error(`BBS overflowed headless buffers at ${address}`);
    if(code)throw new Error(`BBS context overwrote code at ${address}`);
    write(address,value);
  };
  const clients=(mode==='post'?['board','board','board']:['topics','topics2',`t_${names[0]}`]).map((path,i)=>{
    const host=20+i,url=`http://bbs.world/${path}`;
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
    s.world.addDisk(id,[new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,host],files:{'/net.seq':[...encodeWide(1)],...Object.fromEntries(Object.entries(built.phases).map(([name,phase])=>[`/${name}`,phase.file]))}}))]);
    const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    return {m,keyboard,nic};
  });
  let simultaneous=0, holdGets=mode==='catalog';
  if(holdGets)for(const client of clients){
    const receive=client.nic.receive.bind(client.nic);
    client.nic.receive=frame=>{if(holdGets&&frame[1]===3&&frame[25]===4)return;receive(frame);};
  }
  function until(done:()=>boolean){const end=s.world.cycles+50_000_000;while(!done()&&s.world.cycles<end){
    s.world.runCycles(6561);
    const m=s.machines.server,current=m.peek(2300);
    const active=[0,1,2].filter(i=>{const state=m.peek(i===current?2380:m.peek(2312+i)+518);return state>=2&&state<=5;}).length;
    simultaneous=Math.max(simultaneous,active);
    for(const {m} of clients)expect(m.peek(2199)).toBe(0);
  }expect(done()).toBe(true);}
  until(()=>s.machines.server.peek(2381)===80&&s.machines.server.peek(2326)!==0);
  for(const c of clients)c.keyboard.queueText(' ');
  until(()=>clients.every(c=>c.m.peek(2207)===1));
  for(const c of clients)c.m.poke(2208,1);
  if(holdGets){until(()=>simultaneous===3);holdGets=false;}
  until(()=>clients.every(({m})=>m.peek(2210)===1&&m.peek(2504)===4&&m.peek(5446)===1&&m.peek(2488)===0));
  expect(clients.map(({m})=>m.peek(6225))).toEqual([200,200,200]);
  const recordText=(i:number)=>{const m=clients[i]!.m;return Array.from({length:27},(_,n)=>{const p=4739+n*18;const len=m.peek(p+2),at=m.peek(p+1);return len>0&&len<=1458?decodeText(Array.from({length:len},(_,j)=>m.peek(at+j))):'';}).join('\n');};
  if(mode==='post'){
    for(const [i,c] of clients.entries()){c.keyboard.queueText(`message ${i}`);c.keyboard.queueTrytes([TEXT_KEYS.activate]);}
    until(()=>clients.every(({m},i)=>m.peek(2210)===1&&m.peek(2504)===4&&m.peek(2488)===0&&starterScreen(m).includes(`message ${i}`)));
    const replies=clients.map((_,i)=>recordText(i));
    for(const i of [0,1,2])expect(replies[i]).toContain(`message ${i}`);
    expect(replies.some(text=>[0,1,2].every(i=>text.includes(`message ${i}`)))).toBe(true);
  }else{
    expect(simultaneous).toBe(3);
    expect(recordText(0)).toContain(names[0]);expect(recordText(0)).toContain(names[17]);
    expect(recordText(0)).not.toContain(names[18]);
    expect(recordText(1)).toContain(names[18]);expect(recordText(1)).not.toContain(names[0]);
    expect(recordText(2)).toContain(names[0]);
    expect(clients[0]!.m.peek(6216)).toBe(688);
  }
  expect(clients.map(({m})=>m.peek(6225))).toEqual([200,200,200]);
},120_000);
