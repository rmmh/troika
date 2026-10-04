import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { AUDIO_SOFTWARE } from '../src/world/software/audio';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { SoundDevice } from '../src/core/soundDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { settleSoftwareUi } from './softwareUiDriver';

const source = (name:string) => readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of AUDIO_SOFTWARE) test(`${app.id} drives native APU output, releases and silences on exit`,()=>{
  const built=buildNativeSoftware(core,source,app);
  const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
  for(const image of [core.image,built.image]) for(const chunk of image.image.chunks) chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  const keys=new TextDevice(), sound=new SoundDevice(a=>m.peek(a),(a,v)=>m.poke(a,v));
  m.attach(keys); m.attach(sound); m.poke(REG_P,built.image.image.labels.get('app_entry')!);
  const settle=()=>settleSoftwareUi(m,keys,built.image.image.labels.get('app_key')!);
  const samples=(count:number)=>{sound.drainSamples(); sound.tick(count*27,()=>{}); return sound.drainSamples();};
  settle(); expect(samples(500).every(v=>v===0)).toBe(true);
  app.examples[0]!.input.forEach((v,i)=>{if(i) keys.queueTrytes([TEXT_KEYS.next]); keys.queueText(String(v));});
  keys.queueTrytes([TEXT_KEYS.activate]); settle();
  const playing=samples(10000); expect(playing.some(v=>v>0)).toBe(true); expect(playing.some(v=>v<0)).toBe(true);
  if(app.id==='pulse-tone') {
    expect(m.peek(154)).toBe(44);
    expect(playing.slice(45)).toEqual(playing.slice(0,-45));
  }
  if(app.id==='interval-tone') {expect(m.peek(150)).toBe(8748);expect(m.peek(158)).toBe(29);}
  if(app.id==='wave-forge') expect(Array.from({length:27},(_,i)=>m.peek(2900+i))).toEqual(Array.from({length:27},(_,i)=>i-13));
  keys.queueText(' '); settle();
  expect([153,157,161,166,170].map(a=>m.peek(a))).toEqual([0,0,0,0,0]);
  if(app.id==='envelope-lab') expect(samples(100).some(v=>v!==0)).toBe(true);
  expect(samples(12000).slice(-1000).every(v=>v===0)).toBe(true);
  keys.queueTrytes([TEXT_KEYS.activate]); settle(); expect(samples(10000).some(v=>v!==0)).toBe(true);
  // Turn the first input into an invalid value while a note is active.
  keys.queueTrytes([TEXT_KEYS.next]); keys.queueText('9999'); keys.queueTrytes([TEXT_KEYS.activate]); settle();
  expect(m.peek(2559)).toBe(-1); expect(samples(100).every(v=>v===0)).toBe(true);
  m.write(150,6561);m.write(153,3);m.write(155,8); // Exit must silence even a still-active channel.
  keys.queueTrytes([TEXT_KEYS.home]);
  const end=m.cycles+100000;
  while(m.peek(2504)!==11 && m.cycles<end) m.step();
  expect(m.peek(2504)).toBe(11); expect(m.peek(150)).toBe(0);
  expect(samples(100).every(v=>v===0)).toBe(true);
});
