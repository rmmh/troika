import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {RULE_LOOM} from '../src/world/software/ruleLoom';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {ruleLoomReference} from './ruleLoomReference';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');

test('all 256 rules grow native circular patterns, retain history and accept keyboard seed edits',()=>{
 const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
 const built=buildNativeSoftware(core,source,RULE_LOOM);
 expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of[core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
 const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const text=(s:string)=>{keyboard.queueText(s);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/8)-Math.floor(current/8),dc=square%8-current%8;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 const board=()=>String.fromCharCode(...Array.from({length:64},(_,i)=>m.peek(2900+i)));
 const guards=[[2899,717],[2964,313],[2999,117],[3008,719]];
 for(const[a,v]of guards)m.poke(a!,v!);
 settle();expect(starterScreen(m)).toContain(RULE_LOOM.title);
 let model=ruleLoomReference();
 const check=()=>{expect(board()).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(0);for(const[a,v]of guards)expect(m.peek(a!),String(a)).toBe(v);};
 check();key(TEXT_KEYS.previous);expect(m.peek(2630)).toBe(63);key(TEXT_KEYS.next);expect(m.peek(2630)).toBe(0);
 for(let rule=0;rule<256;rule++){
  text('r');model=ruleLoomReference();
  for(let bit=0;bit<8;bit++)if(((rule^30)>>bit)&1){play(bit);model.play(bit);check();}
  // Different asymmetric seed patterns exercise both wraparound boundaries.
  for(let bit=0;bit<8;bit++)if(((rule^0xa5)>>bit)&1){play(56+bit);model.play(56+bit);check();}
  play(24);model.play(24);check();
  for(let n=0;n<12;n++){text(n%2?'N':'n');model.step!();check();}
  play(63);model.play(63);check();text('n');model.step!();check();
 }
 text('r');text('n');expect(board()).toBe(RULE_LOOM.examples[0]!.board);
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(starterScreen(m)).toContain('Troika programs');
},180_000);
