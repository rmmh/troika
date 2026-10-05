import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {MICROCOMPUTER_GAMES} from '../src/world/software/microcomputerGames';
import {microcomputerGamesReference,pantrySolutions,BUS_SOLUTION} from './microcomputerGamesReference';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
function fixture(index:number){
 const app=MICROCOMPUTER_GAMES[index]!,core=buildProgramCore(source,{name:'menu',source:source('programMenu')}),built=buildNativeSoftware(core,source,app);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);for(const unit of[core.image,built.image])for(const c of unit.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const guards=index===0?[2899,2948,3199,3206,3299,3312,3399,3422]:[2899,2964,3199,3209,3299,3306,3399,3419];guards.forEach(a=>m.poke(a,719));const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};let model=microcomputerGamesReference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.columns*app.rows},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const a of guards)expect(m.peek(a),`guard ${a}`).toBe(719);};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);model.play(square);check();};
 const letter=(s:string)=>{keyboard.queueText(s);settle();if(s.toLowerCase()==='n')model.step!();else model.key(s.toLowerCase());check();};
 const reset=()=>{keyboard.queueText('r');settle();model=microcomputerGamesReference(app.id)!;check();};settle();check();
 return {m,play,letter,reset,check,get model(){return model;},screen:()=>starterScreen(m),exit(){keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);}};
}
test('Bus Pilot edits and executes a bounded native program, diagnoses faults and completes its route',()=>{
 const f=fixture(0),program=(s:string)=>{f.reset();[...s].forEach((v,i)=>{for(let j=0;j<'.FLRJS'.indexOf(v);j++)f.play(36+i);});};
 f.play(7);expect(f.screen()).toContain('Edit the two bottom rows');f.letter('n');expect(f.screen()).toContain('Stopped short');f.letter('g');f.letter('b');expect(f.model.status).toBe(0);
 program('FFFF');f.letter('G');expect(f.screen()).toContain('Wall collision');expect(f.model.moves).toBe(4);
 program('LJ');f.letter('g');expect(f.screen()).toContain('64 ticks: loop?');expect(f.model.moves).toBe(64);f.letter('B');expect(f.model.moves).toBe(0);expect(f.model.board.endsWith('lJ..........')).toBe(true);
 program('S');f.letter('g');expect(f.screen()).toContain('Stopped short');program('RRRRRRRRRRRR');f.letter('g');expect(f.model.moves).toBe(12);expect(f.model.status).toBe(2);
 program(BUS_SOLUTION);f.letter('n');f.letter('n');f.letter('n');expect(f.model.board[10]).toBe('>');expect(f.screen()).toContain('stops 1/3');f.letter('g');expect(f.model.status).toBe(1);expect(f.screen()).toContain('All stops served; home!');expect(f.model.moves).toBe(18);f.letter('n');f.letter('g');f.play(0);expect(f.model.status).toBe(1);
 f.play(47);expect(f.model.status).toBe(0);expect(f.model.moves).toBe(0);f.reset();let seed=222;for(let i=0;i<256;i++){seed=seed*48271%2147483647;if(i%5===0)f.letter(['n','g','b'][seed%3]!);else f.play(seed%48);}f.exit();
},60_000);
test('Pantry Cover shows actionable overlap/missing feedback and verifies every solution of all three pantries',()=>{
 const f=fixture(1);expect(f.screen()).toContain('P1 missing: ABCDEF');f.play(0);expect(f.screen()).toContain('P1 missing: CDEF');f.play(24);expect(f.screen()).toContain('P1 overlap: A');f.letter('n');expect(f.model.status).toBe(0);f.play(24);f.play(0);expect(f.screen()).toContain('P1 missing: ABCDEF');
 for(let puzzle=0;puzzle<3;puzzle++){const solutions=pantrySolutions(puzzle);expect(solutions.length).toBeGreaterThan(0);for(const solution of solutions){f.reset();for(let p=0;p<puzzle;p++)f.letter('p');for(const row of solution)f.play(row*8+7);expect(f.model.status).toBe(0);f.letter('N');expect(f.model.status).toBe(1);expect(f.screen()).toContain(`Pantry ${puzzle+1} covered!`);for(let row=0;row<8;row++)f.play(row*8);f.letter('n');expect(f.model.status).toBe(1);}}
 f.letter('P');expect(f.model.status).toBe(0);f.reset();let seed=223;for(let i=0;i<256;i++){seed=seed*48271%2147483647;if(i%7===0)f.letter('p');else if(i%3===0)f.letter('n');else f.play(seed%64);}f.exit();
},60_000);
