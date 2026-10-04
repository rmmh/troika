import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { World } from '../src/core/world';
import { addChat, ChatClient } from '../src/world/chat';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('native chat keeps simultaneous clients and room histories independent',()=>{
  const world=new World();const chat=addChat(world,source,{bots:false});
  const until=(done:()=>boolean)=>{const end=world.cycles+20_000_000;while(!done()&&world.cycles<end){world.runCycles(6561);}expect(done()).toBe(true);};
  until(()=>chat.clients.every(c=>c.joined));
  chat.clients[0]!.say('hello lobby');chat.clients[1]!.say('hello from ada');chat.clients[2]!.say('games only');chat.clients[3]!.say('workshop only');
  until(()=>chat.clients.every(c=>c.messages.length>0)&&chat.clients[0]!.messages.length===2&&chat.clients[1]!.messages.length===2);
  expect(chat.clients[0]!.messages.map(m=>m.text).sort()).toEqual(['hello from ada','hello lobby']);
  expect(chat.clients[2]!.messages.map(m=>m.text)).toEqual(['games only']);
  chat.clients[0]!.join(2);until(()=>chat.clients[0]!.messages.some(m=>m.text==='games only'));
  chat.clients[0]!.say('joining games');until(()=>chat.clients[2]!.messages.some(m=>m.text==='joining games'));
  expect(chat.clients[1]!.messages.some(m=>m.text==='joining games')).toBe(false);
},90_000);

test('a lost SAY acknowledgement retries without duplicating the native event',()=>{
  const world=new World();const chat=addChat(world,source,{bots:false});const client=chat.clients[0]!;
  const until=(done:()=>boolean)=>{const end=world.cycles+15_000_000;while(!done()&&world.cycles<end){world.runCycles(6561);}expect(done()).toBe(true);};
  until(()=>client.joined);
  const receive=client.nic.receive.bind(client.nic);let dropped=false;
  client.nic.receive=frame=>{if(!dropped&&frame[29]===2){dropped=true;return;}receive(frame);};
  client.say('exactly once');until(()=>client.messages.length===1);
  expect(dropped).toBe(true);expect(chat.machine.peek(5256)).toBe(1);
  expect(client.messages[0]!.text).toBe('exactly once');
  expect(chat.image.marginReserved).toBe(0);
  for(const chunk of chat.image.image.chunks)expect(chunk.addr+chunk.data.length).toBeLessThanOrEqual(1337);
},90_000);

test('nine sessions coexist, excess clients get busy, abandoned leases are reclaimed',()=>{
  const world=new World();const chat=addChat(world,source,{bots:false});
  const clients=[...chat.clients,...Array.from({length:6},(_,i)=>new ChatClient(world,source,`guest${i}`,30+i,1))];
  const until=(done:()=>boolean)=>{const end=world.cycles+30_000_000;while(!done()&&world.cycles<end){world.runCycles(6561);}expect(done()).toBe(true);};
  until(()=>clients.filter(c=>c.joined).length===9&&clients.some(c=>c.status==='Server full'));
  const rejected=clients.find(c=>!c.joined)!;
  // Disconnect physical NICs; the CPUs continue executing their native clients.
  for(const c of clients)if(c!==rejected)c.nic.setLink(false);
  world.runCycles(9842*6561);
  rejected.join(1);
  const end=world.cycles+10_000_000;
  while(!rejected.joined&&world.cycles<end){world.runCycles(6561);}
  expect(rejected.joined).toBe(true);
},90_000);

test('ring history stays bounded and a quiet native server sleeps on NIC interrupts',()=>{
  const world=new World();const chat=addChat(world,source,{bots:false});const client=chat.clients[0]!;
  const until=(done:()=>boolean)=>{const end=world.cycles+15_000_000;while(!done()&&world.cycles<end){world.runCycles(6561);}expect(done()).toBe(true);};
  until(()=>client.joined);
  for(let i=0;i<31;i++){client.say(`message ${i}`);until(()=>chat.machine.peek(5256)===i+1);}
  until(()=>client.messages.some(m=>m.text==='message 30'));
  expect(chat.machine.peek(5255)).toBe(7007+4*81);
  const retained=Array.from({length:27},(_,i)=>chat.machine.peek(7007+i*81)).sort((a,b)=>a-b);
  expect(retained).toEqual(Array.from({length:27},(_,i)=>i+5));
  for(const c of chat.clients)c.nic.setLink(false);
  world.runCycles(2_000_000);
  expect(chat.machine.sleep).not.toBeNull();
  let instructions=0;const step=chat.machine.startWorldInstruction.bind(chat.machine);
  chat.machine.startWorldInstruction=()=>{instructions++;return step();};
  world.runCycles(1_000_000);expect(instructions).toBe(0);
},90_000);

test('native nickname admission rejects collisions; QUIT and rejoin remain usable',()=>{
  const world=new World();const chat=addChat(world,source,{bots:false});const first=chat.clients[0]!;
  const duplicate=new ChatClient(world,source,'you',40,1);
  const until=(done:()=>boolean)=>{const end=world.cycles+15_000_000;while(!done()&&world.cycles<end){world.runCycles(6561);}expect(done()).toBe(true);};
  until(()=>first.joined);until(()=>duplicate.status==='Nickname in use');
  expect(duplicate.joined).toBe(false);
  first.leave();until(()=>first.status==='Left');
  duplicate.join(1);until(()=>duplicate.joined);
  duplicate.say('nickname transferred');until(()=>duplicate.messages.length===1);
  expect(duplicate.messages[0]!.nick).toBe('you');
},90_000);

test('messages queued during JOIN use the new room and membership errors allow recovery',()=>{
  const world=new World();const chat=addChat(world,source,{bots:false});const client=chat.clients[0]!;
  const until=(done:()=>boolean)=>{const end=world.cycles+15_000_000;while(!done()&&world.cycles<end){world.runCycles(6561);}expect(done()).toBe(true);};
  until(()=>client.joined);
  client.join(3);client.say('queued after joining');
  until(()=>client.messages.some(m=>m.text==='queued after joining'));
  expect(client.messages[0]!.room).toBe(3);
  client.leave();until(()=>client.status==='Left');client.say('invalid while away');
  until(()=>client.status==='Join a room first');client.join(1);until(()=>client.joined);
  client.say('back again');until(()=>client.messages.some(m=>m.text==='back again'));
},90_000);

test('native client CPUs generate dialogue, react to keyboard messages and fit their own RAM',()=>{
  const world=new World(), chat=addChat(world,source);
  for(const c of chat.clients){
    expect(c.image.reserved).toBeLessThanOrEqual(9666);expect(c.image.marginReserved).toBe(0);
    const write=c.machine.write.bind(c.machine);
    c.machine.write=(address,value)=>{
      const code=(address>=-9112&&address<=-3686)||(address>=-3631&&address<=-365)||(address>=365&&address<=1336);
      if(code)throw new Error(`chat client wrote code at ${address}`);
      const sp=c.machine.peek(6); if(sp<5468||sp>5710)throw new Error(`chat stack escaped: ${sp}`);
      write(address,value);
    };
  }
  const until=(done:()=>boolean)=>{const end=world.cycles+20_000_000;while(!done()&&world.cycles<end)world.runCycles(6561);expect(done()).toBe(true);};
  until(()=>chat.clients.every(c=>c.joined)&&chat.clients[0]!.messages.some(m=>m.nick==='ada'));
  expect(chat.clients.every(c=>c.machine.cycles>0)).toBe(true);
  const you=chat.clients[0]!;
  for(const [prompt,reply] of [['I feel worried','Why do you feel worried?'],['I am tired','How long have you been tired?'],['I want rest','Why do you want rest?']]){
    you.say(prompt!);
    until(()=>you.messages.some(m=>m.nick==='ada'&&m.text===reply));
  }
  you.join(2);until(()=>you.room===2);you.say('What should we play?');
  until(()=>you.messages.some(m=>m.nick==='lin'&&m.text.includes('take-away')));
  you.join(3);until(()=>you.room===3);you.say('I am making a network');
  until(()=>you.messages.some(m=>m.nick==='sam'&&m.text==='What have you tried so far?'));
},90_000);

test('native timeout/retry preserves queued messages and room commands without duplicate sends',()=>{
  const world=new World(),chat=addChat(world,source,{bots:false}),client=chat.clients[0]!;
  const until=(done:()=>boolean)=>{const end=world.cycles+20_000_000;while(!done()&&world.cycles<end)world.runCycles(6561);expect(done()).toBe(true);};
  until(()=>client.joined&&client.machine.peek(2512)===0);
  const receive=client.nic.receive.bind(client.nic);let hold=true;
  client.nic.receive=frame=>{if(!hold)receive(frame);};
  client.say('first retained request');until(()=>chat.machine.peek(5256)===1);
  client.say('queued second request');client.join(2);client.say('queued room change');
  until(()=>client.status.startsWith('Timed out'));
  expect(client.machine.peek(5261)).toBe(3);expect(chat.machine.peek(5256)).toBe(1);
  hold=false;client.retry();
  until(()=>chat.clients[2]!.messages.some(m=>m.text==='queued room change'));
  expect(chat.machine.peek(5256)).toBe(3);
  expect(chat.clients[1]!.messages.filter(m=>m.text==='first retained request')).toHaveLength(1);
  expect(chat.clients[1]!.messages.filter(m=>m.text==='queued second request')).toHaveLength(1);
},90_000);
