import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {NEIGHBORHOOD_CREATIVE} from '../src/world/software/neighborhoodCreative';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {neighborhoodCreativeReference,WALK_SOLUTION,SKY_SOLUTION,spiroReference} from './neighborhoodCreativeReference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
for(const app of NEIGHBORHOOD_CREATIVE)test(`${app.id}: native creative program agrees with independent rules`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
 const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 const board=()=>String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)));
 const step=()=>{keyboard.queueText('n');settle();};
 let model=neighborhoodCreativeReference(app.id)!;
 const reset=()=>{keyboard.queueText('r');settle();model=neighborhoodCreativeReference(app.id)!;};
 const guards=[[2899,717],[2900+app.rows*app.columns,313],[2999,117],[3192,719],[3199,613],[3225,511],[3299,177],[3312,299]];
 for(const[a,v]of guards)m.poke(a!,v!);
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const[a,v]of guards)expect(m.peek(a!),String(a)).toBe(v);};
 settle();expect(starterScreen(m)).toContain(app.title);check();let seed=app.number;
 for(let turn=0;turn<256;turn++){seed=seed*48271%2147483647;const square=seed%(app.rows*app.columns);if(app.stepKey&&turn%3===2){step();model.step!();}else{play(square);model.play(square);}check();if(model.status){reset();check();}}
 for(const example of app.examples){reset();for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++)step();expect(board()).toBe(example.board);expect(m.peek(2631)).toBe(example.movesMade);expect(m.peek(2632)).toBe(example.status);}
 if(app.id==='three-ink-print'){
  for(let mask=0;mask<8;mask++){
   reset();for(let layer=0;layer<3;layer++){if(mask&(1<<layer)){play(0);model.play(0);}check();expect(m.peek(-3658)).toBe([9815,9139,-9113][layer]);step();model.step!();check();}
   expect(board()[0]).toBe('.YMRCGBK'[mask]);const saved=board(),edits=m.peek(2631);play(0);expect(board()).toBe(saved);expect(m.peek(2631)).toBe(edits);expect(m.peek(-3658)).toBe(9841);
  }
 }
 if(app.id==='one-stroke-walk'){
  reset();for(const square of WALK_SOLUTION){play(square);model.play(square);check();}expect(model.status).toBe(1);
  for(let square=0;square<25;square++){play(square);model.play(square);check();}
  reset();for(const square of[0,2,10,0]){play(square);model.play(square);check();}expect(model.status).toBe(2);expect(model.moves).toBe(3);
 }
 if(app.id==='cardboard-sky'){
  reset();step();expect(starterScreen(m)).toContain('Fill all sixteen heights');
  for(let index=0;index<16;index++){const square=(Math.floor(index/4)+1)*6+index%4+1;for(let n=0;n<SKY_SOLUTION[index]!;n++){play(square);model.play(square);check();}}
  step();model.step!();check();expect(model.status).toBe(1);expect(model.moves).toBe(40);
  for(let square=0;square<36;square++){play(square);model.play(square);check();}
  reset();for(let row=1;row<=4;row++)for(let col=1;col<=4;col++)play(row*6+col);step();expect(m.peek(2632)).toBe(0);expect(starterScreen(m)).toContain('A row or column repeats');
  // A valid Latin square can still disagree with its skyline clues.
  reset();for(let row=0;row<4;row++)for(let col=0;col<4;col++)for(let n=0;n<(row+col)%4+1;n++)play((row+1)*6+col+1);step();expect(m.peek(2632)).toBe(0);expect(starterScreen(m)).toContain('A skyline clue disagrees');
 }
 if(app.id==='spiro-notebook'){
  const proofs=new Set<string>();for(let radius=1;radius<=3;radius++)for(let harmonic=1;harmonic<=7;harmonic++){
   reset();for(let i=0;i<(harmonic+4)%7;i++)play(0);for(let i=1;i<radius;i++)play(56);
   expect(starterScreen(m)).toContain(`Step ${harmonic}  Radius ${radius}`);step();expect(board()).toBe(spiroReference(harmonic,radius));expect(m.peek(2631)).toBe(1);expect(board()).toContain('*');proofs.add(board());
  }expect(proofs.size).toBeGreaterThanOrEqual(8);
 }
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(m.peek(-3658)).toBe(9841);expect(starterScreen(m)).toContain('Troika programs');
},60_000);
