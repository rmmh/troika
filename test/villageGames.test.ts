import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {VILLAGE_GAMES} from '../src/world/software/villageGames';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {villageGamesReference,JUG_SOLUTION,BOX_SOLUTION,BADGE_SOLUTION,PANCAKE_SOLUTION} from './villageGamesReference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of VILLAGE_GAMES)test(`${app.id}: native keyboard games agree with independent rules`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);m.poke(2899,717);m.poke(2900+app.rows*app.columns,313);m.poke(3199,117);m.poke(3214,719);m.poke(3299,711);m.poke(3313,377);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
 const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 const board=()=>String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)));
 settle();expect(starterScreen(m)).toContain(app.title);
 let model=villageGamesReference(app.id)!;let seed=app.number;
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const[a,v]of[[2899,717],[2900+app.rows*app.columns,313],[3199,117],[3214,719],[3299,711],[3313,377]])expect(m.peek(a!)).toBe(v);};
 check();for(let turn=0;turn<256;turn++){seed=seed*48271%2147483647;const square=seed%(app.rows*app.columns);if(app.stepKey&&turn%3===2){keyboard.queueText('n');settle();model.step!();}else{play(square);model.play(square);}check();if(model.status){keyboard.queueText('r');settle();model=villageGamesReference(app.id)!;check();}}
 for(const example of app.examples){keyboard.queueText('r');settle();for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++){keyboard.queueText('n');settle();}expect(board()).toBe(example.board);expect(m.peek(2631)).toBe(example.movesMade);expect(m.peek(2632)).toBe(example.status);}

 const reset=()=>{keyboard.queueText('r');settle();model=villageGamesReference(app.id)!;check();};
 const doPlay=(square:number)=>{play(square);model.play(square);check();};
 if(app.id==='pancake-stack'){reset();for(const square of PANCAKE_SOLUTION)doPlay(square);expect(model.status).toBe(1);}
 if(app.id==='three-jugs'){reset();for(const square of JUG_SOLUTION)doPlay(square);expect(model.status).toBe(1);expect(model.moves).toBe(7);}
 if(app.id==='badge-pairs'){reset();for(const square of BADGE_SOLUTION)doPlay(square);expect(model.status).toBe(1);expect(model.moves).toBe(8);}
 if(app.id==='shut-the-box'){
 reset();for(const selection of BOX_SOLUTION){for(const square of selection)doPlay(square);keyboard.queueText('n');settle();model.step!();check();}expect(model.status).toBe(1);
 reset();for(let turn=0;turn<9&&!model.status;turn++){
 const current=model.board,target=Number(current[10])+Number(current[11]);let selection:number[]=[];
 for(let mask=1;mask<512;mask++){const indices=Array.from({length:9},(_,i)=>i).filter(i=>mask>>i&1);if(indices.every(i=>current[i]!=='.')&&indices.reduce((a,i)=>a+i+1,0)===target){selection=indices;break;}}
 for(const square of selection)doPlay(square);keyboard.queueText('n');settle();model.step!();check();
 }expect(model.status).toBe(2);
 }
 if(model.status){const saved=board(),count=m.peek(2631);for(let square=0;square<app.columns*app.rows;square++)play(square);if(app.stepKey){keyboard.queueText('n');settle();}expect(board()).toBe(saved);expect(m.peek(2631)).toBe(count);}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(starterScreen(m)).toContain('Troika programs');
});
