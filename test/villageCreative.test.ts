import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {VILLAGE_CREATIVE} from '../src/world/software/villageCreative';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {SoundDevice} from '../src/core/soundDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {villageCreativeReference,BEACON_SEQUENCE,SEARCH_SOLUTION} from './villageCreativeReference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of VILLAGE_CREATIVE)test(`${app.id}: native creative workbench matches independent rules`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const sound=app.id==='pocket-sequencer'?new SoundDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)):undefined;if(sound)m.attach(sound);
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
 const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 const board=()=>String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)));
 const step=()=>{keyboard.queueText('n');settle();};
 let model=villageCreativeReference(app.id)!;
 const reset=()=>{keyboard.queueText('r');settle();model=villageCreativeReference(app.id)!;};
 const guards=[[2899,717],[2900+app.rows*app.columns,313],[2999,117],[3036,719],[3099,613],[3136,511],[3199,177],[3208,299],[3299,373],[3304,199]];
 for(const[a,v]of guards)m.poke(a!,v!);
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const[a,v]of guards)expect(m.peek(a!),String(a)).toBe(v);};
 settle();expect(starterScreen(m)).toContain(app.title);check();let seed=app.number;
 for(let turn=0;turn<(sound?36:256);turn++){seed=seed*48271%2147483647;const square=seed%(app.rows*app.columns);if(turn%3===2){step();model.step!();}else{play(square);model.play(square);}check();sound?.drainSamples();if(model.status){reset();check();}}
 for(const example of app.examples){reset();for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++)step();expect(board()).toBe(example.board);expect(m.peek(2631)).toBe(example.movesMade);expect(m.peek(2632)).toBe(example.status);}
 if(app.id==='matchbox-room'){
  reset();play(7);model.play(7);check();const before=board();play(9);model.play(9);check();expect(board()).toBe(before);expect(starterScreen(m)).toContain('Would block');
  play(14);model.play(14);check();play(9);model.play(9);check();expect(model.status).toBe(1);
  for(let square=0;square<36;square++){play(square);model.play(square);check();}step();model.step!();check();
 }
 if(app.id==='beacon-echo'){
  reset();for(let length=1;length<=8;length++){step();model.step!();check();step();model.step!();check();for(const digit of BEACON_SEQUENCE.slice(0,length)){play(15+digit);model.play(15+digit);check();}}expect(model.status).toBe(1);
  reset();step();step();play(16);expect(m.peek(2632)).toBe(2);
 }
 if(app.id==='gazette-search'){
  reset();for(const pair of SEARCH_SOLUTION)for(const square of pair){play(square);model.play(square);check();}expect(model.status).toBe(1);
 }
 if(sound){
  for(const tempoSquare of[12,13,14]){reset();play(tempoSquare);sound.drainSamples();const before=m.cycles;step();expect(m.cycles-before).toBeLessThan(800_000);const audio=sound.drainSamples();expect(audio.some(v=>v>0)).toBe(true);expect(audio.some(v=>v<0)).toBe(true);if(tempoSquare!==12){const first=audio.findIndex(v=>v!==0);expect(audio.slice(first+75,first+375)).toEqual(audio.slice(first,first+300));}expect(m.peek(154)).toBe(37);expect(m.peek(150)).toBe(0);expect(m.peek(2631)).toBe(1);}
  reset();for(const [square,presses] of [[0,8],[2,6],[4,4],[6,1]])for(let i=0;i<presses!;i++)play(square!);expect(board().slice(0,8)).toBe('........');sound.drainSamples();step();expect(sound.drainSamples().every(v=>v===0)).toBe(true);
  reset();keyboard.queueText('n ');settle();expect(m.peek(150)).toBe(0);expect(m.peek(2631)).toBe(0);expect(starterScreen(m)).toContain('Stopped');
  reset();keyboard.queueText('n');keyboard.queueTrytes([TEXT_KEYS.home]);m.run(800_000);expect(m.peek(2504)).toBe(11);expect(m.peek(150)).toBe(0);
 }else{keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);}
 expect(m.stackHighWater).toBeLessThan(243);
},60_000);
