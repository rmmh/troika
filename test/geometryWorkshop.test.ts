import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {geometryWorkshopVectors} from './geometryWorkshopVectors';
import {GEOMETRY_WORKSHOP} from '../src/world/software/geometryWorkshop';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {FirmwareProbe} from './firmwareProbe';
import {settleSoftwareUi} from './softwareUiDriver';

const source=(n:string)=>readFileSync(new URL(`../firmware/include/${n}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of GEOMETRY_WORKSHOP)test(`${app.id} native keyboard, independent vectors, repeat and guard checks`,()=>{
 const built=buildNativeSoftware(core,source,app),m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const unit of[core.image,built.image])for(const chunk of unit.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);settle();const guards=[2862,2920,2999,3013,3070,3089,3099,3429,3470];guards.forEach(a=>m.poke(a,728));
 for(const example of [...app.examples,...geometryWorkshopVectors(app.id)]){
 keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));settle();keyboard.queueText(example.input);keyboard.queueTrytes([TEXT_KEYS.activate]);settle();
 for(let repeat=0;repeat<2;repeat++){
 expect(m.peek(2621),example.input).toBe(example.error?-1:0);expect(m.peek(2620)).toBeLessThanOrEqual(162);
 if(example.output!==undefined)expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i))),example.input).toBe(example.output);
 keyboard.queueTrytes([TEXT_KEYS.activate]);settle();}
 guards.forEach(a=>expect(m.peek(a),`${example.input} guard ${a}`).toBe(728));
 }
 keyboard.queueTrytes([TEXT_KEYS.home]);m.run(200_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);
},60_000);


test('geometry vector helper rejects unrelated catalog IDs',()=>expect(geometryWorkshopVectors('unrelated')).toEqual([]));
test('all possible small-grid circumcircle arithmetic stays within signed trytes',()=>{
 const p=Array.from({length:25},(_,i)=>[i%5-2,Math.floor(i/5)-2] as const);let maxRadius=0,triples=0;
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)for(let k=j+1;k<p.length;k++){
 const [x,y]=p[i]!,[u,v]=p[j]!,[s,t]=p[k]!;const dx=u-x,dy=v-y,ex=s-x,ey=t-y,b=u*u+v*v-x*x-y*y,c=s*s+t*t-x*x-y*y;
 let d=dx*ey-dy*ex,U=b*ey-c*dy,V=dx*c-ex*b;if(!d)continue;
 const partial=d*(x*x+y*y)-U*x;let w=partial-V*y;if(d<0){d=-d;U=-U;V=-V;w=-w;}
 const values=[dx*ey,dy*ex,b*ey,c*dy,dx*c,ex*b,d*(x*x+y*y),partial,w,U*U,V*V,U*U+V*V,4*w*d,U*U+V*V+4*w*d,4*d*d];
 expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(9841);expect(Math.abs(U)).toBeLessThanOrEqual(32);expect(Math.abs(V)).toBeLessThanOrEqual(32);maxRadius=Math.max(maxRadius,U*U+V*V+4*w*d);triples++;
 }
 expect(maxRadius).toBe(8192);expect(triples).toBeGreaterThan(2000);
});
