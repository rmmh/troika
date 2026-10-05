import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {World} from '../src/core/world';
import {addChat} from '../src/world/chat';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const IDLE=729*6561;
test('native personas rotate three idle messages, stop, and resume only for human conversation',()=>{
 const world=new World(),chat=addChat(world,source),bots=chat.clients.slice(1),you=chat.clients[0]!;
 const until=(done:()=>boolean)=>{const end=world.cycles+20_000_000;while(!done()&&world.cycles<end)world.runCycles(6561);expect(done()).toBe(true);};
 for(const bot of bots){expect(bot.image.marginReserved).toBe(0);expect(bot.image.reserved).toBeLessThanOrEqual(9666);const write=bot.machine.write.bind(bot.machine);bot.machine.write=(address,value)=>{if(address>=-9112&&address<=-3686||address>=-3631&&address<=-365||address>=365&&address<=1336)throw new Error('bot wrote code');const sp=bot.machine.peek(6);if(sp<5468||sp>5710)throw new Error('bot stack escaped');write(address,value);};}
 until(()=>bots.every(b=>b.messages.filter(m=>m.nick===b.nick).length===3));
 const greetings=['Hello. How are you feeling today?','Anyone up for a game of take-away?','What are you building today?'];
 for(const [index,bot] of bots.entries()){const messages=bot.messages.filter(m=>m.nick===bot.nick);expect(messages[0]!.text).toBe(greetings[index]);expect(new Set(messages.map(m=>m.text)).size).toBe(3);expect(new Set(messages.map(m=>m.id)).size).toBe(3);expect(bot.machine.peek(5229)).toBe(3);}
 const before=chat.machine.peek(5256);world.runCycles(IDLE*2);expect(chat.machine.peek(5256)).toBe(before);
 // A manually typed message from another bot does not restart Ada's allowance.
 bots[1]!.join(1);until(()=>bots[1]!.room===1);bots[1]!.say('hello from lin');until(()=>you.messages.some(m=>m.text==='hello from lin'));world.runCycles(IDLE+100_000);expect(bots[0]!.machine.peek(5229)).toBe(3);expect(chat.machine.peek(5256)).toBe(before+1);
 you.say('I feel curious');until(()=>you.messages.some(m=>m.text==='Why do you feel curious?'));expect(bots[0]!.machine.peek(5229)).toBe(0);
 until(()=>bots[0]!.machine.peek(5229)===3&&bots[1]!.machine.peek(5229)===3);world.runCycles(300_000);const after=chat.machine.peek(5256);world.runCycles(IDLE*2);expect(chat.machine.peek(5256)).toBe(after);
 const ada=you.messages.filter(m=>m.nick==='ada').map(m=>m.text);expect(ada).toContain('We can start with a small story.');expect(ada).toContain('Has anything surprised you today?');
},90_000);
test('lost native bot SAY acknowledgement retries without advancing idle rotation twice',()=>{
 const world=new World(),chat=addChat(world,source),ada=chat.clients[1]!,you=chat.clients[0]!;
 const receive=ada.nic.receive.bind(ada.nic);let dropped=false;
 ada.nic.receive=frame=>{if(!dropped&&ada.machine.peek(2512)===2&&frame[29]===ada.machine.peek(2508)){dropped=true;return;}receive(frame);};
 const end=20_000_000;while(!you.messages.some(m=>m.nick==='ada')&&world.cycles<end)world.runCycles(6561);expect(dropped).toBe(true);
 world.runCycles(2_000_000);expect(you.messages.filter(m=>m.nick==='ada')).toHaveLength(1);expect(ada.machine.peek(5229)).toBe(1);expect(ada.machine.peek(5228)).toBe(1);
},90_000);
