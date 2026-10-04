import { World } from '../core/world';
import { BlockMedium } from '../core/blockDevice';
import { createDiskImage } from '../firmware/diskImage';
import { encodeWide } from '../core/wide';
import { REG_P } from '../core/machine';
import { type NetworkDevice } from '../core/networkDevice';
import { TextDevice } from '../core/textDevice';
import { TEXT_KEYS } from '../core/textKeyboard';
import { decodeText } from '../core/textEncoding';
import { linkFirmware } from '../firmware/link';
import { WORLD_BASIC_MODULES } from './browserImages';

export const CHAT_ROOMS = ['lobby', 'games', 'workshop'] as const;
export interface ChatMessage { id: number; room: number; nick: string; text: string }
export interface ChatView { nick: string; room: number; joined: boolean; status: string; messages: ChatMessage[] }

/** Physical keyboard adapter and read-only view of a native guest client. */
export class ChatClient {
  inputError?: string;
  readonly id: string;
  readonly machine;
  readonly image;
  readonly nic: NetworkDevice;
  readonly keyboard = new TextDevice();
  constructor(world: World, source: (name: string) => string, readonly nick: string, readonly host: number, room = 1, persona = 0) {
    if (!/^[a-zA-Z0-9_]{1,12}$/.test(nick)) throw new Error('Nickname must be 1–12 letters, digits or underscores');
    this.id = `chat-${host}-${nick}`;
    this.image = linkFirmware([{name:'boot',source:'J cc_entry'}, ...[...WORLD_BASIC_MODULES,'dns','netWait','netEcho','chatClient','chatBot'].map(name=>({name,source:source(name)})),{name:'startup',source:`
cc_entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 ${host}
W 2545 ${host} W cc_host ${host} W cc_room ${room} W cc_nick_len ${nick.length} W cc_persona ${persona}
M A cc_nick M B @cc_name M C ${nick.length} C S net_copy
C S net_wait_init C S chat_client_init
cc_loop: C S net_echo_service C S net_poll
ifg A Z C S net_echo_input ife A Z C S chat_client_input C S net_discard_input end end
C S chat_client_keys C S chat_client_queue C S chat_bot_service C S chat_client_service
M A 6561 C S net_wait J cc_loop
chat_client_program_exit: O S P
cc_name: "${nick}"`}]);
    this.machine = world.addMachine(this.id);
    for(const c of this.image.image.chunks)c.data.forEach((v,i)=>this.machine.poke(c.addr+i,v));
    this.machine.poke(REG_P,this.image.image.entry!);
    this.nic = world.addInterface(this.id,4,[0,1,host],'b');
    world.addDisk(this.id,[new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,host],files:{'/net.seq':encodeWide(1)}}))]);
    this.machine.attach(this.keyboard);
  }
  private command(text: string) { this.inputError=undefined; this.keyboard.queueText(text); this.keyboard.queueTrytes([TEXT_KEYS.activate]); }
  join(room: number) {
    if (!Number.isInteger(room) || room < 1 || room > 3) throw new Error('Unknown chat room');
    this.command(`/join ${room}`);
  }
  say(text: string) {
    if (!text.length || text.length > 54 || /[^\x20-\x7e]/.test(text)) throw new Error('Use 1–54 printable ASCII characters');
    this.command(`/say ${text}`);
  }
  leave() { this.command('/quit'); }
  retry() { this.command('/retry'); }
  get room() { return this.machine.peek(2510) || 1; }
  get joined() { return this.machine.peek(2511) === 1; }
  get status() {
    if(this.inputError)return this.inputError;
    return ({0:'Connecting',1:'Connected',2:'Left','-1':'Invalid chat request','-2':'Server full','-3':'Join a room first','-4':'Sequence rejected','-6':'History sequence exhausted','-7':'Nickname in use','-8':'Timed out; retry pending request','-9':'Invalid command','-10':'Input queue full'} as Record<number,string>)[this.machine.peek(2514)] ?? 'Chat error';
  }
  get messages(): ChatMessage[] {
    const m=this.machine, count=Math.max(0,Math.min(27,m.peek(5251))), head=m.peek(5250);
    if(head<7007||head>9113)return [];
    return Array.from({length:count},(_,i)=>{
      const at=7007+((head-7007)/81-count+i+27)%27*81;
      const nickLength=m.peek(at+2),textLength=m.peek(at+15);
      return {id:m.peek(at),room:m.peek(at+1),nick:decodeText(Array.from({length:Math.max(0,Math.min(12,nickLength))},(_,j)=>m.peek(at+3+j))),text:decodeText(Array.from({length:Math.max(0,Math.min(54,textLength))},(_,j)=>m.peek(at+16+j)))};
    }).filter(message=>message.id>0);
  }
  snapshot(): ChatView { return {nick:this.nick,room:this.room,joined:this.joined,status:this.status,messages:this.messages}; }
}

export function addChat(world: World, source: (name: string) => string, options: {bots?: boolean} = {}) {
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
  const clients=[['you',1],['ada',1],['lin',2],['sam',3]].map(([nick,room],i)=>new ChatClient(world,source,String(nick),20+i,Number(room),options.bots===false?0:i));
  return {machine,image,clients};
}
