import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {TERNARY_CODEC} from '../src/world/software/ternaryCodec';
import {FirmwareProbe} from './firmwareProbe';
import {REG_P,REG_S} from '../src/core/machine';
import {TextDevice} from '../src/core/textDevice';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
const source=(n:string)=>readFileSync(new URL(`../firmware/include/${n}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const built=buildNativeSoftware(core,source,TERNARY_CODEC);
function machine(){const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));return m;}
const result=(m:FirmwareProbe)=>String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)));
test('all 19683 balanced trytes encode and decode independently enumerated trit strings',()=>{
 const m=machine(),entry=built.image.image.labels.get('app_compute')!,stop=built.image.image.labels.get('app_key')!;
 const call=(s:string)=>{[...s].forEach((c,i)=>m.poke(2552+i,c.charCodeAt(0)));m.poke(2610,s.length);m.poke(2620,0);m.poke(REG_S,5709);m.poke(5709,stop);m.poke(REG_P,entry);expect(m.run(30_000,new Set([stop]))).toBe('breakpoint');expect(m.peek(-13)).toBe(0);return result(m);};
 m.poke(2899,728);m.poke(2909,728);
 for(let index=0;index<19683;index++){
  const trits=index.toString(3).padStart(9,'0').replace(/0/g,'T').replace(/1/g,'0').replace(/2/g,'1');
  const n=[...trits].reduce((sum,c)=>sum*3+(c==='T'?-1:Number(c)),0);
  expect(call(`enc ${n}`),String(n)).toBe(trits);expect(call(`dec ${trits}`),trits).toBe(String(n));
 }
 expect(m.peek(2899)).toBe(728);expect(m.peek(2909)).toBe(728);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
},60_000);
test('codec keyboard errors, repeat execution, extremes and protected menu return',()=>{
 const m=machine(),k=new TextDevice();m.attach(k);m.poke(REG_P,built.image.image.labels.get('app_entry')!);const settle=()=>settleSoftwareUi(m,k,built.image.image.labels.get('app_key')!);settle();
 const cases=[...TERNARY_CODEC.examples,...['','enc ','enc -','enc +1','enc 00000','enc -9842','ENC 1','enc  1','dec t00000000','dec 000000002','dec 00000000','dec 0000000000','enc 1 ','dec 000000000 '].map(input=>({input,error:true as const})),{input:'enc -0',output:'000000000'},{input:'enc 0001',output:'000000001'},{input:'dec 000000000',output:'0'}];
 for(const item of cases){k.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));k.queueText(item.input);k.queueTrytes([TEXT_KEYS.activate]);settle();for(let repeat=0;repeat<2;repeat++){expect(m.peek(2621),item.input).toBe(item.error?-1:0);if('output'in item&&item.output!==undefined)expect(result(m),item.input).toBe(item.output);k.queueTrytes([TEXT_KEYS.activate]);settle();}}
 k.queueTrytes([TEXT_KEYS.home]);m.run(200_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);
});
