import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {TABLETOP_GAMES} from '../src/world/software/tabletopGames';
import {tabletopGamesReference,draughtsReference,DRAUGHTS_INITIAL,SEA_ENEMY,type TabletopReference} from './tabletopGamesReference';
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
 const app=TABLETOP_GAMES[index]!,core=buildProgramCore(source,{name:'menu',source:source('programMenu')}),built=buildNativeSoftware(core,source,app);
 expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);for(const unit of[core.image,built.image])for(const c of unit.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const guards=[[2899,2936,3199,3223,3299,3336],[2899,2925,3199,3205,3299,3325,3399,3425],[2899,2949,3199,3204,3399,3417],[2899,2930,3199,3207,3299,3325,3399,3425,3499,3521]][index]!;guards.forEach(a=>m.poke(a,719));const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};let model:TabletopReference=tabletopGamesReference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.columns*app.rows},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const a of guards)expect(m.peek(a),`guard ${a}`).toBe(719);};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);model.play(square);check();};
 const letter=(s:string)=>{keyboard.queueText(s);settle();if(s.toLowerCase()==='n')model.step!();else model.key(s.toLowerCase());check();};
 const reset=()=>{keyboard.queueText('r');settle();model=tabletopGamesReference(app.id)!;check();};settle();check();
 return {m,play,letter,reset,check,get model(){return model;},screen:()=>starterScreen(m),position(pieces:number[],turn=1,quiet=0){model=draughtsReference(pieces,turn,quiet);pieces.forEach((p,i)=>m.poke(3300+i,p));m.poke(3200,turn);m.poke(3201,-1);m.poke(3202,0);m.poke(3203,quiet);m.poke(2631,0);m.poke(2632,0);/* A click renders the injected test position through native code. */play(pieces.findIndex(p=>(p>2?p-2:p)===turn));},exit(){keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);}};
}
test('Draughts enforces captures, chains, kings and promotions and plays complete native matches',()=>{
 const f=fixture(0);f.play(0);f.play(25);f.play(20);expect(f.model.moves).toBe(1);f.reset();
 const setup=(entries:Record<number,number>,turn=1)=>{const p=Array<number>(36).fill(0);for(const[k,v]of Object.entries(entries))p[Number(k)]=v;f.position(p,turn);};
 setup({25:1,27:1,20:2,10:2,1:2});f.play(27);f.play(22);expect(f.screen()).toContain('A capture is mandatory');expect(f.model.moves).toBe(0);f.play(25);f.play(15);expect(f.screen()).toContain('Continue selected piece');f.play(27);expect(f.model.moves).toBe(1);f.play(5);expect(f.m.peek(3305)).toBe(3);expect(f.model.turn).toBe(2);expect(f.model.moves).toBe(2);
 setup({15:3,20:2,34:2});f.play(15);f.play(25);expect(f.m.peek(3325)).toBe(3);
 setup({13:1,8:2,10:2});f.play(13);f.play(3);expect(f.m.peek(3303)).toBe(3);expect(f.model.turn).toBe(2); // Crowning ends the turn even with a backward capture.
 setup({13:1,8:2});f.play(13);f.play(3);expect(f.model.status).toBe(1);f.play(10);f.check();
 setup({22:2,27:1},2);f.play(22);f.play(32);expect(f.model.status).toBe(2);
 const draw=Array<number>(36).fill(0);draw[13]=3;draw[34]=4;f.position(draw,1,79);f.play(13);f.play(8);expect(f.model.status).toBe(3);expect(f.screen()).toContain('80 moves without take');
 const outcomes=new Set<number>();for(const seed0 of[5,19,73]){f.reset();let seed=seed0;for(let turn=0;turn<240&&!f.model.status;turn++){const model=f.model as ReturnType<typeof draughtsReference>;const choices=model.options();expect(choices.length).toBeGreaterThan(0);seed=seed*48271%2147483647;const[from,to]=choices[seed%choices.length]!;f.play(from);f.play(to);}expect(f.model.status).not.toBe(0);outcomes.add(f.model.status);}expect(outcomes.size).toBeGreaterThan(0);
 f.reset();let seed=229;for(let i=0;i<256;i++){seed=seed*48271%2147483647;f.play(seed%36);}f.exit();
},60_000);
test('Hex finds both edge connections, excludes the other diagonal and ignores occupied cells',()=>{
 const f=fixture(1);for(const square of[0,4,5,9,10,14,15,19,20])f.play(square);expect(f.model.status).toBe(1);expect(f.screen()).toContain('X joins top and bottom!');f.play(24);f.reset();for(const square of[0,10,1,11,5,12,6,13,20,14])f.play(square);expect(f.model.status).toBe(2);expect(f.screen()).toContain('O joins left and right!');f.reset();for(const square of[4,0,8,1,12,2,16,3,20])f.play(square);expect(f.model.status).toBe(1);
 f.reset();for(const square of[0,4,6,3,12,2,18,1,24])f.play(square);expect(f.model.status).toBe(0);
 f.reset();f.play(0);f.play(0);expect(f.model.moves).toBe(1);let seed=230;for(let i=0;i<256;i++){if(i%32===0)f.reset();seed=seed*48271%2147483647;f.play(seed%25);}f.exit();
},60_000);
test('Dots and Boxes scores shared boundaries and extra turns through full keyboard matches',()=>{
 const f=fixture(2);f.play(0);f.play(8);expect(f.model.moves).toBe(0);for(const i of[1,7,15,3,11,17])f.play(i);const turn=f.model.turn;f.play(9);expect(f.model.turn).toBe(turn);expect(f.model.board[8]).toBe(turn===1?'A':'B');expect(f.model.board[10]).toBe(turn===1?'A':'B');expect(f.model.moves).toBe(7);f.play(9);expect(f.model.moves).toBe(7);for(let i=0;i<49;i++)f.play(i);expect(f.model.status).not.toBe(0);expect(f.screen()).toContain('wins!');f.play(1);
 let seed=231;for(let match=0;match<8;match++){f.reset();const cells=Array.from({length:49},(_,i)=>i);for(let i=cells.length-1;i>0;i--){seed=seed*48271%2147483647;const j=seed%(i+1);[cells[i],cells[j]]=[cells[j]!,cells[i]!];}for(const i of cells)f.play(i);expect(f.model.status).not.toBe(0);}f.exit();
},60_000);
test('Sea Battle uses native hunt/target strategy, marks sunk ships, and permits win and loss',()=>{
 const f=fixture(3);f.letter('n');expect(f.model.board).toContain('A');f.play(0);expect(f.model.moves).toBe(0);f.letter('n');f.play(0);f.play(0);expect(f.model.moves).toBe(1);f.play(1);f.play(2);expect(f.model.board.startsWith('###')).toBe(true);expect(f.screen()).toContain('sunkA');f.play(18);f.play(23);expect(f.model.status).toBe(1);expect(f.screen()).toContain('Enemy fleet sunk');f.play(4);f.letter('n');f.reset();
 for(let i=0;i<25;i++)if(!SEA_ENEMY[i])f.play(i);expect(f.model.status).toBe(2);expect(f.screen()).toContain('Your fleet lost');f.letter('n');expect(f.model.board.split('#').length-1).toBe(5);
 f.reset();let seed=232;for(let i=0;i<256;i++){if(i%64===0)f.reset();seed=seed*48271%2147483647;if(i%7===0)f.letter('n');else f.play(seed%30);}f.exit();
},60_000);
