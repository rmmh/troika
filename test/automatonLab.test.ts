import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {AUTOMATON_LAB} from '../src/world/software/automatonLab';

import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {FirmwareProbe} from './firmwareProbe';
import {settleSoftwareUi} from './softwareUiDriver';
import {automatonLabVectors} from './automatonLabVectors';
const source=(n:string)=>readFileSync(new URL(`../firmware/include/${n}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const app=AUTOMATON_LAB, vectors=[...app.examples,...automatonLabVectors(app.id)];
// Preserve the full exhaustive corpus while yielding between bounded batches.
for(let offset=0;offset<vectors.length;offset+=128)test(`${app.id} native keyboard/model cases ${offset+1}..${Math.min(offset+128,vectors.length)}`,()=>{
 const built=buildNativeSoftware(core,source,app),m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const unit of[core.image,built.image])for(const chunk of unit.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);settle();const guards=[2862,2999,3012,3019,3026,3099,3103,3199,3249];guards.forEach(a=>m.poke(a,728));
 for(const example of vectors.slice(offset,offset+128)){
 keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));settle();keyboard.queueText(example.input);keyboard.queueTrytes([TEXT_KEYS.activate]);settle();
 for(let repeat=0;repeat<2;repeat++){
 expect(m.peek(2621),example.input).toBe(example.error?-1:0);expect(m.peek(2620)).toBeLessThanOrEqual(162);
 if(example.output!==undefined)expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i))),example.input).toBe(example.output);
 keyboard.queueTrytes([TEXT_KEYS.activate]);settle();}
 guards.forEach(a=>expect(m.peek(a),`${example.input} guard ${a}`).toBe(728));
 }
 keyboard.queueTrytes([TEXT_KEYS.home]);m.run(200_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);
},60_000);

test('Automaton vector helper ignores unrelated IDs',()=>{expect(automatonLabVectors('unrelated')).toEqual([])});
