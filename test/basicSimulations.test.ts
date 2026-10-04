import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {BASIC_SIMULATIONS} from '../src/world/software/basicSimulations';
import {basicSimulationsReference} from './basicSimulationsReference';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const routes:Record<string,number[][]>={
 'seed-steward':[[...Array(8).fill(32)],[...Array(8).fill(40)],[24,24,24]],
 'roof-lemonade':[[32,24,40,32,40,24,40,32],Array(8).fill(24),Array(8).fill(40)],
 'canal-trader':[[...Array(10).fill(40),56,...Array(10).fill(48),56,56,...Array(9).fill(40),56,...Array(9).fill(48),56,56],Array(6).fill(56)],
 'cave-lantern':[[16,56],[16,32],[16,24,24],[40,40,40],[24,56]],
};
for(const app of BASIC_SIMULATIONS)test(`${app.id}: full native scenarios, illegal actions, repeat and reset`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of [core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 m.poke(2899,733);m.poke(2900+app.rows*8,377);m.poke(3199,911);m.poke(3205,719);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(n:number)=>{keyboard.queueTrytes([n]);settle();};
 settle();keyboard.queueText('n');settle();expect(starterScreen(m)).toContain(({ 'seed-steward':'Grain pays feed and seed','roof-lemonade':'Batch costs 10 coins','canal-trader':'Your spendable trade coins','cave-lantern':'Your current cave number'} as Record<string,string>)[app.id]!);let model=basicSimulationsReference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.rows*8},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);expect(m.peek(2899)).toBe(733);expect(m.peek(2900+app.rows*8)).toBe(377);expect(m.peek(3199)).toBe(911);expect(m.peek(3205)).toBe(719);};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/8)-Math.floor(current/8),dc=square%8-current%8;for(let i=0;i<Math.abs(dr);i++)key(dr<0?TEXT_KEYS.up:TEXT_KEYS.down);for(let i=0;i<Math.abs(dc);i++)key(dc<0?TEXT_KEYS.left:TEXT_KEYS.right);key(TEXT_KEYS.activate);model.play(square);check();if(app.id==='cave-lantern'&&model.moves===1&&square===24)expect(starterScreen(m)).toContain('Bats to 2; beast smell!');if(app.id==='cave-lantern'&&!model.status&&square>=40)expect(starterScreen(m)).toContain('Miss;');};
 for(const route of routes[app.id]!){keyboard.queueText('r');settle();model=basicSimulationsReference(app.id)!;check();play(0);for(const square of route)play(square);expect(model.status).toBeGreaterThan(0);play(24);play(40);}
 // Each decision row and every column are reachable through the real keyboard.
 let seed=app.number;
 for(let i=0;i<160;i++){if(model.status){keyboard.queueText('r');settle();model=basicSimulationsReference(app.id)!;}seed=(seed*48271)%2147483647;play(seed%(app.rows*8));}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);
});
