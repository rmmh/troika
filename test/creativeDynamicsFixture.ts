import {readFileSync} from 'node:fs';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware,type TextSoftware} from '../src/world/software/native';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {FirmwareProbe} from './firmwareProbe';
import {settleSoftwareUi} from './softwareUiDriver';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
export function creativeFixture(app:TextSoftware){const core=buildProgramCore(source,{name:'menu',source:source('programMenu')}),built=buildNativeSoftware(core,source,app);const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state','page.records','page.script','forth.state']);for(const image of[core.image,built.image])for(const c of image.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));m.poke(REG_P,built.image.image.labels.get('app_entry')!);const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!,800_000);const key=(k:number)=>{keyboard.queueTrytes([k]);settle();};const type=(s:string)=>{keyboard.queueText(s);settle();};const read=(start:number,n:number)=>Array.from({length:n},(_,i)=>m.peek(start+i));settle();return{m,built,keyboard,settle,key,type,read};}
