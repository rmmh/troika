import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {BASIC_GAMES} from '../src/world/software/basicGames';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {basicGamesReference} from './basicGamesReference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of BASIC_GAMES)test(`${app.id}: native keyboard games agree with independent rules`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);m.poke(2899,717);m.poke(2900+app.rows*app.columns,313);m.poke(3199,117);m.poke(3211,719);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
 const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 const board=()=>String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)));
 settle();expect(starterScreen(m)).toContain(app.title);
 let model=basicGamesReference(app.id)!;let seed=app.number;
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const[a,v]of[[2899,717],[2900+app.rows*app.columns,313],[3199,117],[3211,719]])expect(m.peek(a!)).toBe(v);};
 check();for(let turn=0;turn<256;turn++){seed=seed*48271%2147483647;const square=seed%(app.rows*app.columns);if(app.stepKey&&turn%3===2){keyboard.queueText('n');settle();model.step!();}else{play(square);model.play(square);}check();if(model.status){keyboard.queueText('r');settle();model=basicGamesReference(app.id)!;check();}}
 for(const example of app.examples){keyboard.queueText('r');settle();for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++){keyboard.queueText('n');settle();}expect(board()).toBe(example.board);expect(m.peek(2631)).toBe(example.movesMade);expect(m.peek(2632)).toBe(example.status);}
 if(app.id==='fuel-landing') {
 keyboard.queueText('r');settle();model=basicGamesReference(app.id)!;
 const step=(n:number)=>{for(let i=0;i<n;i++){keyboard.queueText('n');settle();model.step!();check();}};
 step(4);play(22);model.play(22);step(4);play(18);model.play(18);step(1);play(20);model.play(20);step(3);expect(model.status).toBe(1);
 }
 if(app.id==='hurkle-hunt')for(const [square,hint] of [[0,'southeast'],[5,'south'],[7,'southwest'],[16,'east'],[23,'west'],[56,'northeast'],[61,'north'],[63,'northwest']] as const){
 keyboard.queueText('r');settle();play(square);expect(starterScreen(m)).toContain(`Look ${hint}`);play(square);expect(m.peek(2631)).toBe(1);
 }
 if(app.id==='cannon-range')for(let x=1;x<=9;x++)for(let y=1;y<=9;y++){
 keyboard.queueText('r');settle();model=basicGamesReference(app.id)!;
 for(let i=0;i<(x+6)%9;i++){play(0);model.play(0);}for(let i=0;i<(y+6)%9;i++){play(4);model.play(4);}keyboard.queueText('n');settle();model.step!();check();
 }
 if(app.id==='twenty-one')for(let deal=16;deal<=19;deal++)for(let hits=0;hits<=4;hits++){
 keyboard.queueText('r');settle();model=basicGamesReference(app.id)!;play(deal);model.play(deal);check();for(let i=0;i<hits;i++){play(0);model.play(0);check();}keyboard.queueText('n');settle();model.step!();check();
 }
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(starterScreen(m)).toContain('Troika programs');
});
