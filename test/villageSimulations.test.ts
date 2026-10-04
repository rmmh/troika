import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {VILLAGE_SIMULATIONS} from '../src/world/software/villageSimulations';
import {villageSimulationsReference} from './villageSimulationsReference';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const pipeSolution=[0,3,4,7,8,11,15].flatMap(i=>[i*2,i*2,i*2]).concat([1,2,5,6,9,10,12,13,14].map(i=>i*2),[-1]);
const routes:Record<string,number[][]>={
 'tram-dispatch':[[24,...Array(10).fill(-1)],Array(4).fill(-1),[0,32,...Array(12).fill(-1)]],
 'pipe-workshop':[pipeSolution],
 'parcel-round':[[1,2,8,2,3,4,5,4,10,16,15,14,20,26,25,24,30,31,32,33,34,35],Array.from({length:24},(_,i)=>i%2?0:1)],
 'star-alignment':[[14,-1,-1,-1]],
};
for(const app of VILLAGE_SIMULATIONS)test(`${app.id}: full native scenarios, illegal actions, repeat and reset`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of [core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 m.poke(2899,733);m.poke(2900+app.rows*app.columns,377);m.poke(3199,911);m.poke(3198,719);m.poke(3219,771);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(n:number)=>{keyboard.queueTrytes([n]);settle();};
 settle();let model=villageSimulationsReference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);expect(m.peek(2899)).toBe(733);expect(m.peek(2900+app.rows*app.columns)).toBe(377);expect(m.peek(3199)).toBe(911);expect(m.peek(3198)).toBe(719);expect(m.peek(3219)).toBe(771);};
 const play=(square:number)=>{
  if(square<0){keyboard.queueText('n');settle();model.step!();check();return;}
  const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;
  for(let i=0;i<Math.abs(dr);i++)key(dr<0?TEXT_KEYS.up:TEXT_KEYS.down);for(let i=0;i<Math.abs(dc);i++)key(dc<0?TEXT_KEYS.left:TEXT_KEYS.right);
  key(TEXT_KEYS.activate);model.play(square);check();
 };
 if(app.id==='parcel-round'){
  expect(starterScreen(m)).toContain('24 moves; hold 2 Bag:---');
  for(const cell of [1,2,8])play(cell);expect(starterScreen(m)).toContain('Parcel picked up Bag:a--');
  for(const cell of [9,10,16,15,14,20,26])play(cell);expect(starterScreen(m)).toContain('Full; parcel stays Bag:ab-');
  play(20);expect(model.board[26]).toBe('c');play(-1);expect(starterScreen(m)).toContain('24 moves; hold 2 Bag:ab-');
 }
 if(app.id==='pipe-workshop'){play(-1);expect(starterScreen(m)).toContain('A joint has unmatched ports');play(0);play(0);play(-1);expect(starterScreen(m)).toContain('Water leaks off an edge');}
 if(app.id==='star-alignment'){play(35);expect(starterScreen(m)).toContain('Three-by-three must fit sky');expect(model.moves).toBe(0);}
 for(const [routeIndex,route] of routes[app.id]!.entries()){keyboard.queueText('r');settle();model=villageSimulationsReference(app.id)!;check();for(const square of route)play(square);expect(model.status).toBe(routeIndex===0?1:2);play(0);play(12);}
 for(const example of app.examples){keyboard.queueText('r');settle();model=villageSimulationsReference(app.id)!;for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++)play(-1);expect(model.board).toBe(example.board);expect(model.moves).toBe(example.movesMade);expect(model.status).toBe(example.status);}
 // Each decision row and every column are reachable through the real keyboard.
 let seed=app.number;
 for(let i=0;i<160;i++){if(model.status){keyboard.queueText('r');settle();model=villageSimulationsReference(app.id)!;}seed=(seed*48271)%2147483647;play(i%3===2?-1:seed%(app.rows*app.columns));}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);
});
