import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {EDITORIAL_TOOLS} from '../src/world/software/editorialTools';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {FirmwareProbe} from './firmwareProbe';
import {settleSoftwareUi} from './softwareUiDriver';
import {editorialToolVectors} from './editorialToolVectors';
const source=(n:string)=>readFileSync(new URL(`../firmware/include/${n}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of EDITORIAL_TOOLS)test(`${app.id} native keyboard, independent vectors, repeat and guard checks`,()=>{
 const built=buildNativeSoftware(core,source,app),m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const unit of[core.image,built.image])for(const chunk of unit.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);settle();const guards=[2862,2999,3027,3057,3087,3199,3254,3299,3314];guards.forEach(a=>m.poke(a,728));
 for(const example of[...app.examples,...editorialToolVectors(app.id)]){
 keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));settle();keyboard.queueText(example.input);keyboard.queueTrytes([TEXT_KEYS.activate]);settle();
 for(let repeat=0;repeat<2;repeat++){
 expect(m.peek(2621),example.input).toBe(example.error?-1:0);expect(m.peek(2620)).toBeLessThanOrEqual(162);
 if(example.output!==undefined)expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i))),example.input).toBe(example.output);
 keyboard.queueTrytes([TEXT_KEYS.activate]);settle();}
 guards.forEach(a=>expect(m.peek(a),`${example.input} guard ${a}`).toBe(728));
 }
 keyboard.queueTrytes([TEXT_KEYS.home]);m.run(200_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);
},60_000);
