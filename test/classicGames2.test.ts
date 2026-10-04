import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {CLASSIC_GAMES_2} from '../src/world/software/classicGames2';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {classicGames2Reference,HANOI_SOLUTION} from './classicGames2Reference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of CLASSIC_GAMES_2)test(`${app.id}: native keyboard games agree with independent rules`,()=>{
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
 let model=classicGames2Reference(app.id)!;let seed=app.number;
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const[a,v]of[[2899,717],[2900+app.rows*app.columns,313],[3199,117],[3211,719]])expect(m.peek(a!)).toBe(v);};
 check();for(let turn=0;turn<256;turn++){seed=seed*48271%2147483647;const square=seed%(app.rows*app.columns);if(app.stepKey&&turn%3===2){keyboard.queueText('n');settle();model.step!();}else{play(square);model.play(square);}check();if(model.status){keyboard.queueText('r');settle();model=classicGames2Reference(app.id)!;check();}}
 for(const example of app.examples){keyboard.queueText('r');settle();for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++){keyboard.queueText('n');settle();}expect(board()).toBe(example.board);expect(m.peek(2631)).toBe(example.movesMade);expect(m.peek(2632)).toBe(example.status);}

 if(app.id==='acey-deucey'){
 keyboard.queueText('r');settle();model=classicGames2Reference(app.id)!;for(const stake of [0,5,9,1,1,1,9]){const square=stake===0?38:stake===1?32:stake===5?34:36;play(square);model.play(square);check();}expect(model.status).toBe(2);expect(model.board.startsWith('BANK0000')).toBe(true);
 }
 if(app.id==='four-disk-hanoi'){
 keyboard.queueText('r');settle();model=classicGames2Reference(app.id)!;for(const square of HANOI_SOLUTION){play(square);model.play(square);check();}expect(model.moves).toBe(15);expect(model.status).toBe(1);
 }
 if(app.id==='lantern-word')for(let puzzle=0;puzzle<4;puzzle++)for(const win of[true,false]){
 keyboard.queueText('r');settle();model=classicGames2Reference(app.id)!;for(let i=0;i<puzzle;i++){keyboard.queueText('n');settle();model.step!();check();}
 const word=['TERNARY','LANTERN','ORBITAL','SEEDBED'][puzzle]!;
 const letters=win?[...new Set(word)]:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c=>!word.includes(c)).slice(0,6);
 for(const c of letters){const square=c.charCodeAt(0)-65+8;play(square);model.play(square);check();play(square);model.play(square);check();}
 expect(model.status).toBe(win?1:2);
 }
 if(app.id==='pig-bank')for(const threshold of[1,5,10,15,20,25,50]){
 keyboard.queueText('r');settle();model=classicGames2Reference(app.id)!;for(let turn=0;turn<300&&!model.status;turn++){const square=Number(model.board.slice(12,16))>=threshold?36:32;play(square);model.play(square);check();}expect(model.status).not.toBe(0);
 }
 if(model.status){const saved=board(),count=m.peek(2631);for(let square=0;square<app.columns*app.rows;square++)play(square);if(app.stepKey){keyboard.queueText('n');settle();}expect(board()).toBe(saved);expect(m.peek(2631)).toBe(count);}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(starterScreen(m)).toContain('Troika programs');
});
