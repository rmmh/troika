import { World } from '../core/world';
import { BlockMedium } from '../core/blockDevice';
import { createDiskImage } from '../firmware/diskImage';
import { encodeWide } from '../core/wide';
import { REG_P } from '../core/machine';
import { type NetworkDevice } from '../core/networkDevice';
import { encodeText, decodeText } from '../core/textEncoding';
import { linkFirmware } from '../firmware/link';
import { WORLD_BASIC_MODULES } from './browserImages';

export const CHAT_ROOMS = ['lobby', 'games', 'workshop'] as const;
export interface ChatMessage { id: number; room: number; nick: string; text: string }
export interface ChatView { nick: string; room: number; joined: boolean; status: string; messages: ChatMessage[] }

/** Explicit JS protocol client, not a substitute for native server state. */
export class ChatClient {
  readonly messages: ChatMessage[] = [];
  room = 1;
  joined = false;
  status = 'Connecting';
  private sequence = 1;
  private cursor = 0;
  private next = 0;
  private pending?: { frame: Int16Array; attempts: number; deadline: number; op: number };
  private queue: { op: number; room: number; text: string }[] = [];
  constructor(readonly nic: NetworkDevice, readonly nick: string, readonly host: number, room = 1) {
    if (!/^[a-zA-Z0-9_]{1,12}$/.test(nick)) throw new Error('Nickname must be 1–12 letters, digits or underscores');
    this.join(room);
  }
  join(room: number) {
    if (!Number.isInteger(room) || room < 1 || room > 3) throw new Error('Unknown chat room');
    this.enqueue(1, room, '');
  }
  say(text: string) {
    if (!text.length || text.length > 54 || /[^\x20-\x7e]/.test(text)) throw new Error('Use 1–54 printable ASCII characters');
    this.enqueue(2, this.wantedRoom(), text);
  }
  retry() { if (this.pending) { this.pending.attempts=0; this.pending.deadline=0; this.status='Retrying'; } }
  private wantedRoom() { return this.queue.at(-1)?.room ?? (this.pending?.op === 1 ? this.pending.frame[31]! : this.room); }
  leave() { this.enqueue(4, this.wantedRoom(), ''); }
  private enqueue(op: number, room: number, text: string) {
    if (this.queue.length >= 27) throw new Error('Chat send queue is full');
    this.queue.push({ op, room, text });
  }
  snapshot(): ChatView { return {nick:this.nick, room:this.room, joined:this.joined, status:this.status, messages:[...this.messages]}; }
  step(now: number) {
    while (this.nic.inspect(-9)) {
      this.nic.write(-5, 0);
      const frame = Int16Array.from({length:243}, () => this.nic.read(-4));
      this.nic.write(-3, 2);
      const p = this.pending;
      if (!p || frame[0] !== 1 || frame[1] !== 2 || frame[15] !== 194 || frame[16] !== 1000 + this.host || frame[26] !== 73 || frame[27] !== 1 || frame[29] !== this.sequence || frame[8] !== 1 || frame[9] !== 3 || frame[10] !== 8 || frame[11] !== 1 || frame[12] !== 3 || frame[13] !== this.host) continue;
      const status = frame[28]!;
      this.pending = undefined;
      this.sequence = this.sequence === 9841 ? 1 : this.sequence + 1;
      this.next = now + (27 + this.host) * 6561;
      if (status !== 0) { this.status = ({'-2':'Server full', '-3':'Join a room first', '-4':'Sequence rejected', '-6':'History sequence exhausted', '-7':'Nickname in use'} as Record<string,string>)[status] ?? `Chat error ${status}`; continue; }
      if (p.op === 1) { this.room = p.frame[31]!; this.cursor = 0; this.joined = true; }
      if (p.op === 4) this.joined = false;
      this.status = this.joined ? 'Connected' : 'Left';
      const id = frame[30]!;
      if (id > this.cursor && frame[31] === this.room && frame[32]! >= 1 && frame[32]! <= 12 && frame[45]! >= 1 && frame[45]! <= 54) {
        this.cursor = id;
        if (!this.messages.some(m => m.id === id)) this.messages.push({id,room:this.room,nick:decodeText(frame.slice(33,33+frame[32]!)),text:decodeText(frame.slice(46,46+frame[45]!))});
        if (this.messages.length > 81) this.messages.shift();
      }
    }
    if (!this.pending && (this.queue.length || (this.joined && now >= this.next))) {
      const request = this.queue.shift() ?? {op:3,room:this.room,text:''};
      const frame = new Int16Array(243);
      frame[0]=1;frame[1]=2;frame.set([0,0,80],5);frame.set([1,3,this.host],8);frame.set([1,3,8],11);
      frame[14]=27;frame[15]=1000+this.host;frame[16]=194;frame[19]=this.sequence;frame[26]=73;
      frame.set([1,request.op,this.sequence,this.cursor,request.room,this.nick.length],27);
      frame.set(encodeText(this.nick),33);frame[45]=request.text.length;frame.set(encodeText(request.text),46);
      this.pending={frame,op:request.op,attempts:0,deadline:now};
    }
    const p = this.pending;
    if (!p || now < p.deadline || this.nic.inspect(-8)) return;
    if (p.attempts === 12) { this.status='Timed out; retry pending request'; p.deadline=Infinity; return; }
    this.nic.write(-7,0);for (const cell of p.frame) this.nic.write(-6,cell);this.nic.write(-3,1);
    p.attempts++; p.deadline=now+(81+this.host*3)*6561;
  }
}

export function addChat(world: World, source: (name: string) => string) {
  const image=linkFirmware([{name:'boot',source:'J chat_entry'}, ...[...WORLD_BASIC_MODULES,'netWait','netEcho','chatServer'].map(name=>({name,source:source(name)})),{name:'startup',source:`
chat_entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 8
C S net_wait_init C S chat_init
chat_loop: C S net_echo_service C S chat_service
R E chat_pending ife E Z C S net_poll ifg A Z C S net_echo_input ife A Z C S chat_input C S net_discard_input end end end
M A Z R E chat_pending ifn E Z M A 6561 end R E echo_pending ifn E Z M A 6561 end C S net_wait J chat_loop`}]);
  const machine=world.addMachine('chat');
  for(const c of image.image.chunks)c.data.forEach((v,i)=>machine.poke(c.addr+i,v));
  machine.poke(REG_P,image.image.entry!);world.addInterface('chat',4,[0,0,80],'b');
  world.addDisk('chat',[new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,8],files:{'/net.seq':encodeWide(1)}}))]);
  const clients=[['you',1],['ada',1],['lin',2],['sam',3]].map(([nick,room],i)=>new ChatClient(world.network.add(4,[0,1,i+1],'b'),String(nick),20+i,Number(room)));
  let nextBot=0, turn=0;
  return {machine,image,clients,step(now:number) {
    for (const client of clients) client.step(now);
    if(now>=nextBot) {
      const lines=['Hello from my own NIC.','Anyone building something today?','Try another room with the room selector.'];
      const bot=clients[1+turn%3]!; if (bot.joined && bot.status === 'Connected') bot.say(lines[turn%3]!); turn++;nextBot=now+729*6561;
    }
  }};
}
