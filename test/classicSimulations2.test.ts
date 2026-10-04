import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {CLASSIC_SIMULATIONS_2} from '../src/world/software/classicSimulations2';
import {classicSimulations2Reference} from './classicSimulations2Reference';
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
 'ferry-crossing':[[16,32,8,16,24,32,16],[8],[24],[32]],
 'forest-firebreak':[[15,...Array(12).fill(-1)],Array(14).fill(-1)],
 'fishing-season':[[48,48,56,48,48,56,48,48,56,48,56,56],Array(12).fill(48)],
 'crop-rotation':[[...Array(4).fill(-1)],[2,6,8,12,-1,0,0,2,2,4,4,6,6,8,8,10,10,12,12,14,14,-1,-1,-1]],
};
for(const app of CLASSIC_SIMULATIONS_2)test(`${app.id}: full native scenarios, illegal actions, repeat and reset`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of [core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 m.poke(2899,733);m.poke(2900+app.rows*app.columns,377);m.poke(3199,911);m.poke(3036,719);m.poke(3213,771);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(n:number)=>{keyboard.queueTrytes([n]);settle();};
 settle();let model=classicSimulations2Reference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);expect(m.peek(2899)).toBe(733);expect(m.peek(2900+app.rows*app.columns)).toBe(377);expect(m.peek(3199)).toBe(911);expect(m.peek(3036)).toBe(719);expect(m.peek(3213)).toBe(771);};
 const play=(square:number)=>{
  if(square<0){keyboard.queueText('n');settle();model.step!();check();return;}
  const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;
  for(let i=0;i<Math.abs(dr);i++)key(dr<0?TEXT_KEYS.up:TEXT_KEYS.down);for(let i=0;i<Math.abs(dc);i++)key(dc<0?TEXT_KEYS.left:TEXT_KEYS.right);
  key(TEXT_KEYS.activate);model.play(square);check();
 };
 if(app.id==='crop-rotation'){
  play(0);expect(starterScreen(m)).toContain('B: food +1, soil +1');
  play(0);expect(starterScreen(m)).toContain('R: no food, soil +2');
  play(0);expect(starterScreen(m)).toContain('G: soil x2(/2 crowd),soil-2');
  play(16);expect(starterScreen(m)).toContain('G/B/R crops; 60 food, 4 yrs');
 }
 for(const [routeIndex,route] of routes[app.id]!.entries()){keyboard.queueText('r');settle();model=classicSimulations2Reference(app.id)!;check();for(const square of route)play(square);expect(model.status).toBe(app.id==='crop-rotation'?(routeIndex===1?1:2):(routeIndex===0?1:2));play(0);play(12);}
 for(const example of app.examples){keyboard.queueText('r');settle();model=classicSimulations2Reference(app.id)!;for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++)play(-1);expect(model.board).toBe(example.board);expect(model.moves).toBe(example.movesMade);expect(model.status).toBe(example.status);}
 // Each decision row and every column are reachable through the real keyboard.
 let seed=app.number;
 for(let i=0;i<160;i++){if(model.status){keyboard.queueText('r');settle();model=classicSimulations2Reference(app.id)!;}seed=(seed*48271)%2147483647;play(i%3===2?-1:seed%(app.rows*app.columns));}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);
});
