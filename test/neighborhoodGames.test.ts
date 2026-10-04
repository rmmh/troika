import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {NEIGHBORHOOD_GAMES} from '../src/world/software/neighborhoodGames';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {neighborhoodGamesReference,SCRAP_SOLUTION,MASK_SOLUTION,HOTEL_SOLUTION} from './neighborhoodGamesReference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of NEIGHBORHOOD_GAMES)test(`${app.id}: native keyboard games agree with independent rules`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);m.poke(2899,717);m.poke(2900+app.rows*app.columns,313);m.poke(3199,117);m.poke(3214,719);m.poke(3299,711);m.poke(3308,377);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
 const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 const board=()=>String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)));
 settle();expect(starterScreen(m)).toContain(app.title);
 let model=neighborhoodGamesReference(app.id)!;let seed=app.number;
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const[a,v]of[[2899,717],[2900+app.rows*app.columns,313],[3199,117],[3214,719],[3299,711],[3308,377]])expect(m.peek(a!)).toBe(v);};
 check();for(let turn=0;turn<256;turn++){seed=seed*48271%2147483647;const square=seed%(app.rows*app.columns);if(app.stepKey&&turn%3===2){keyboard.queueText('n');settle();model.step!();}else{play(square);model.play(square);}check();if(model.status){keyboard.queueText('r');settle();model=neighborhoodGamesReference(app.id)!;check();}}
 for(const example of app.examples){keyboard.queueText('r');settle();for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++){keyboard.queueText('n');settle();}expect(board()).toBe(example.board);expect(m.peek(2631)).toBe(example.movesMade);expect(m.peek(2632)).toBe(example.status);}

 const reset=()=>{keyboard.queueText('r');settle();model=neighborhoodGamesReference(app.id)!;check();};
 const doPlay=(square:number)=>{play(square);model.play(square);check();};
 if(app.id==='scrap-slider'){reset();for(const square of SCRAP_SOLUTION)doPlay(square);expect(model.status).toBe(1);expect(model.moves).toBe(8);}
 if(app.id==='mask-logic'){
 reset();keyboard.queueText('n');settle();model.step!();check();expect(starterScreen(m)).toContain('An act still has a blank');doPlay(0);expect(starterScreen(m)).toContain('Lowercase clues are fixed');
 for(let i=0;i<16;i++)if(model.board[i]==='.')doPlay(i);keyboard.queueText('n');settle();model.step!();check();expect(model.status).toBe(0);expect(starterScreen(m)).toContain('repeats a mask');
 reset();for(let i=0;i<16;i++)if(model.board[i]==='.')for(let n=0;n<MASK_SOLUTION.charCodeAt(i)-64;n++)doPlay(i);keyboard.queueText('n');settle();model.step!();check();expect(model.status).toBe(1);
 }
 if(app.id==='hotel-elevator'){
 reset();for(const square of HOTEL_SOLUTION)doPlay(square);expect(model.status).toBe(1);expect(model.moves).toBe(9);
 reset();for(let turn=0;turn<10;turn++)doPlay(turn%2?36:32);expect(model.status).toBe(2);
 }
 if(app.id==='pebble-mancala'){
 const endings=new Set<number>();for(const game of [...Array(12).keys(),19]){reset();let seed=game+1;for(let turn=0;turn<150&&!model.status;turn++){seed=seed*48271%2147483647;const b=model.board,player=b[28]==='B',choices=[0,1,2].map(i=>(player?1:17)+i*2).filter(i=>Number(b.slice(i,i+2))>0);const square=choices[seed%choices.length]!;doPlay(square);const values=[1,3,5,9,14,17,19,21].map(i=>Number(model.board.slice(i,i+2)));expect(values.reduce((a,b)=>a+b,0)).toBe(18);}expect(model.status).not.toBe(0);endings.add(model.status);}expect(endings.has(1)).toBe(true);expect(endings.has(2)).toBe(true);expect(endings.has(3)).toBe(true);
 }
 if(model.status){const saved=board(),count=m.peek(2631);for(let square=0;square<app.columns*app.rows;square++)play(square);if(app.stepKey){keyboard.queueText('n');settle();}expect(board()).toBe(saved);expect(m.peek(2631)).toBe(count);}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(starterScreen(m)).toContain('Troika programs');
});

test('Mask Logic casting clues determine exactly one Latin assignment',()=>{
 const initial='a..d.c....a.d...',grid=Array<string>(16).fill('.'),solutions:string[]=[];
 const search=(i:number)=>{if(i===16){solutions.push(grid.join(''));return;}const clue=initial[i]!;for(const value of clue==='.'?'ABCD':clue.toUpperCase()){
 if(grid.slice(i-i%4,i).includes(value))continue;let blocked=false;for(let j=i%4;j<i;j+=4)if(grid[j]===value)blocked=true;if(blocked)continue;grid[i]=value;search(i+1);grid[i]='.';
 }};search(0);expect(solutions).toEqual([MASK_SOLUTION]);
});
