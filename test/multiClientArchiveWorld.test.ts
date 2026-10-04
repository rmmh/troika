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
import { readNativeDisk } from './nativeDiskReader';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test.each(['get','put','mixed','cancel'] as const)('production archive serves three native clients; requests=%s',mode=>{
  const old=Array.from({length:600},(_,i)=>i-300);
  const s=createStarterWorld(source,{archiveDisk:createDiskImage({blocks:81,volumeId:[0,0,5],files:{'/net.seq':encodeWide(1),'/public/shared/old':old}})});
  const machine=s.machines.archive;
  expect(s.images.archive.reserved).toBeLessThanOrEqual(12501);
  const write=machine.write.bind(machine);
  machine.write=(address,value)=>{
    const code=(address>=-9112&&address<=-3686)||(address>=-3631&&address<=-365)||(address>=365&&address<=1336)||(address>=7007&&address<=9841);
    if(code)throw new Error(`archive overwrote code at ${address}`);
    if(address>=-9215&&address<=-9113)throw new Error(`archive overflowed headless buffers at ${address}`);
    write(address,value);
  };
  const clients=[0,1,2].map(i=>{
    const host=20+i,body=Array.from({length:600},(_,n)=>[-9841,0,9841,host][n%4]!);
    const built=buildWorldBrowser(name=>name==='npcBrowser'?`
npc_entry: R E 68 N E 4 J npc_entry R E 69 M S 5710
W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 ${host}
W 2070 1 W 2071 3 W 2072 9 W 2073 1 W 2074 3 W 2075 3 W 2545 ${host}
C S browser_init ifl A Z J failed end
M A Z C S bu_console_result ifl A Z J failed end
loop: C S browser_step W 2210 A ifl A Z J failed end J loop
failed: W 2199 A H 0sAAA Z
dhcp_client_input: O S P
dhcp_client_service: O S P`:source(name),true);
    const id=`archive-client${i}`,m=s.world.addMachine(id);
    for(const chunk of built.resident.image.chunks)chunk.data.forEach((v,j)=>m.poke(chunk.addr+j,v));m.poke(REG_P,built.resident.image.entry!);
    const nic=s.world.addInterface(id,4,[0,2,i+1],'b');
    const disk=new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,host],files:{'/net.seq':encodeWide(1),'/raw':body,...Object.fromEntries(Object.entries(built.phases).map(([name,phase])=>[`/${name}`,phase.file]))}}));
    s.world.addDisk(id,[disk]);const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    return {m,keyboard,nic,disk,body};
  });
  let simultaneous=0;
  function until(done:()=>boolean){const end=s.world.cycles+75_000_000;while(!done()&&s.world.cycles<end){
    s.world.runCycles(6561);
    const current=machine.peek(2300);
    simultaneous=Math.max(simultaneous,[0,1,2].filter(i=>{const state=machine.peek(i===current?2380:machine.peek(2312+i)+518);return state>=2&&state<=5;}).length);
    expect(machine.peek(2199)).toBe(0);for(const c of clients)expect(c.m.peek(2199)).toBe(0);
  }expect(done()).toBe(true);}
  const ready=(i:number)=>{const c=clients[i]!;return c.m.peek(2504)===5&&c.m.peek(2210)===1&&c.m.peek(2488)===0&&c.m.read(68)!==4;};
  const command=(i:number,text:string)=>{const k=clients[i]!.keyboard;k.queueText(text);k.queueTrytes([TEXT_KEYS.activate]);};
  const completed=(i:number)=>ready(i)&&starterScreen(clients[i]!.m).includes('ok');
  until(()=>machine.peek(2381)===80&&machine.peek(2326)!==0);
  for(const c of clients)c.keyboard.queueText(' ');
  until(()=>clients.every((_,i)=>ready(i)));
  if(mode==='cancel'){
    command(0,'put /raw http://files.world/shared/old');
    until(()=>machine.peek(2335)>=0&&machine.peek(6960)===3&&machine.peek(6972)>=1);
    clients[0]!.nic.setLink(false);
    command(1,'put /raw http://files.world/shared/new');
    command(2,'get http://files.world/shared/old /copy');
    until(()=>completed(1)&&completed(2));
    expect(machine.peek(2335)).toBe(-1);
    expect(readNativeDisk(s.disks.archive.image(),'/public/shared/old')).toEqual(old);
    expect(readNativeDisk(s.disks.archive.image(),'/public/shared/new')).toEqual(clients[1]!.body);
    expect(readNativeDisk(clients[2]!.disk.image(),'/copy')).toEqual(old);
  }else if(mode==='mixed'){
    let hold=true,dropped=0;
    const receive=clients[0]!.nic.receive.bind(clients[0]!.nic);
    clients[0]!.nic.receive=frame=>{if(hold&&frame[1]===3&&frame[25]===4){dropped++;return;}receive(frame);};
    const readers=()=>[0,1,2].filter(i=>machine.peek(i===machine.peek(2320)?6960:machine.peek(2325+i)+379)===1).length;
    command(0,'get http://files.world/shared/old /copy');until(()=>readers()>0&&dropped>0);
    command(1,'put /raw http://files.world/shared/old');until(()=>machine.peek(2331)!==-1);
    expect(machine.peek(2335)).toBe(-1);expect(readers()).toBeGreaterThan(0);
    command(2,'get http://files.world/shared/old /copy');until(()=>simultaneous===3);
    expect(machine.peek(2335)).toBe(-1);
    hold=false;until(()=>clients.every((_,i)=>completed(i)));
    expect(readNativeDisk(clients[0]!.disk.image(),'/copy')).toEqual(old);
    expect(readNativeDisk(clients[2]!.disk.image(),'/copy')).toEqual(clients[1]!.body);
    expect(readNativeDisk(s.disks.archive.image(),'/public/shared/old')).toEqual(clients[1]!.body);
  }else{
    for(let i=0;i<3;i++)command(i,mode==='put'?`put /raw http://files.world/shared/new${i}`:'get http://files.world/shared/old /copy');
    until(()=>clients.every((_,i)=>completed(i)));
    expect(simultaneous).toBe(3);
    for(let i=0;i<3;i++)expect(readNativeDisk(mode==='put'?s.disks.archive.image():clients[i]!.disk.image(),mode==='put'?`/public/shared/new${i}`:'/copy')).toEqual(mode==='put'?clients[i]!.body:old);
  }
},120_000);
