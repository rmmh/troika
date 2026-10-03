import { World } from '../core/world';
import { REG_P } from '../core/machine';
import { BlockMedium } from '../core/blockDevice';
import { TextDevice } from '../core/textDevice';
import { DisplayDevice } from '../core/displayDevice';
import { encodeWide } from '../core/wide';
import { createDiskImage } from '../firmware/diskImage';
import { buildWorldBrowser } from './browserImages';

/** Install only before the first world cycle. The host supplies no browsing logic. */
export function addNpcBrowser(world: World, source:(name:string)=>string) {
  const built=buildWorldBrowser(source,true);
  const machine=world.addMachine('npc');
  for(const chunk of built.resident.image.chunks) chunk.data.forEach((v,i)=>machine.poke(chunk.addr+i,v));
  machine.poke(REG_P,built.resident.image.entry!);
  const disk=new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,7],files:{
    '/net.seq':encodeWide(1),...Object.fromEntries(Object.entries(built.phases).map(([name,phase])=>[`/${name}`,phase.file])),
  }}));
  const controller=world.addDisk('npc',[disk]);const nic=world.addInterface('npc',4,[0,0,70],'b');
  const keyboard=new TextDevice();machine.attach(keyboard);
  const display=new DisplayDevice(a=>machine.peek(a),(a,v)=>machine.poke(a,v));machine.attach(display);
  return {machine,disk,controller,nic,keyboard,display,image:built.resident};
}
