import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {MISPLACED_AFTERNOON,DINNER_SEATING} from '../src/world/software/afterDarkGames';
import {documentAppFixture} from './documentAppFixture';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {AFTERNOON_SOLUTION,afternoonReference,afterDarkGamesReference,DINNER_TARGET,DINNER_CELLS,dinnerConflict} from './afterDarkGamesReference';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {settleSoftwareUi} from './softwareUiDriver';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');

test('native parser adventure solves connected puzzles and handles invalid commands without changing world state',()=>{
 const f=documentAppFixture(MISPLACED_AFTERNOON);let model=afternoonReference();const guards=[3809,3823,3899,3910,3949,3999,4699,4755];guards.forEach(a=>f.m.poke(a,731));
 const command=(text:string)=>{f.type('c');expect(f.m.peek(2612)).toBe(1);expect(f.m.peek(2610)).toBe(0);f.type(text);f.key(TEXT_KEYS.activate);const accepted=model.command(text);expect(f.m.peek(2612)).toBe(accepted?0:1);expect(f.record(11),text).toBe(model.record);expect(f.record(0)).toBe(`Room: ${model.room}`);if(model.room==='Courtyard'&&model.record[6]!=='0')expect(f.record(3)).not.toContain('oil');for(const name of model.inventory)expect(f.record(4)).toContain(name);if(!accepted)f.key(TEXT_KEYS.home);for(const a of guards)expect(f.m.peek(a),`guard ${a}`).toBe(731);};
 for(const text of['take afternoon','combine wick oil','go east','go north','use key clock','go west','dance','',':new','north east'])command(text);
 command('new');for(const [i,text]of AFTERNOON_SOLUTION.entries())command(i%2?'  '+text.toUpperCase().replace(/ /g,'   ')+'  ':text);
 expect(model.won).toBe(true);expect(f.report().replace(/\s+/g,' ')).toContain('You have your time back');const won=f.record(11);for(const text of['north','take afternoon','give afternoon clerk','use key clock'])command(text);expect(f.record(11)).toBe(won);
 command('new');expect(model.won).toBe(false);let seed=215;const options=[...AFTERNOON_SOLUTION,'look','inventory','help','new','bad command'];for(let i=0;i<256;i++){seed=seed*48271%2147483647;command(options[seed%options.length]!);}
 expect(f.m.stackHighWater).toBeLessThan(243);
},60_000);

test('adventure save/load restores native inventory and world, and raw state edits are rejected',()=>{
 const f=documentAppFixture(MISPLACED_AFTERNOON);const command=(s:string)=>{f.type('c');f.type(s);f.key(TEXT_KEYS.activate);};
 for(const s of AFTERNOON_SOLUTION.slice(0,10))command(s);const checkpoint=f.record(11),allRecords=Array.from({length:660},(_,i)=>f.m.peek(3000+i));expect(f.record(4)).toContain('lamp');f.type('s');expect(f.m.peek(2614)).toBe(0);
 const restored=documentAppFixture(MISPLACED_AFTERNOON,f.medium.image());expect(restored.record(11)).toBe(checkpoint);expect(Array.from({length:660},(_,i)=>restored.m.peek(3000+i))).toEqual(allRecords);expect(restored.record(4)).toContain('lamp');
 restored.edit(11,'R0000000000');expect(restored.m.peek(2612)).toBe(1);expect(restored.record(11)).toBe(checkpoint);restored.key(TEXT_KEYS.home);
 for(const s of AFTERNOON_SOLUTION.slice(10)){restored.type('c');restored.type(s);restored.key(TEXT_KEYS.activate);}expect(restored.report().replace(/\s+/g,' ')).toContain('You have your time back');restored.type('s');
 const won=documentAppFixture(MISPLACED_AFTERNOON,restored.medium.image());expect(won.record(11).endsWith('2')).toBe(true);won.keyboard.queueTrytes([TEXT_KEYS.home]);won.m.run(100_000);expect(won.m.peek(2504)).toBe(11);
},60_000);

test('Dinner Seating swaps through the keyboard and checks circular constraints',()=>{
 const app=DINNER_SEATING,core=buildProgramCore(source,{name:'menu',source:source('programMenu')}),built=buildNativeSoftware(core,source,app);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);for(const unit of[core.image,built.image])for(const c of unit.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const guards=[2899,2925,3199,3209,3299,3308];guards.forEach(a=>m.poke(a,719));const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/5)-Math.floor(current/5),dc=square%5-current%5;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);};
 let model=afterDarkGamesReference(app.id)!;const check=()=>{expect(String.fromCharCode(...Array.from({length:25},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);for(const a of guards)expect(m.peek(a)).toBe(719);};settle();check();let seed=216;
 for(let i=0;i<256;i++){seed=seed*48271%2147483647;if(i%3===2){keyboard.queueText('n');settle();model.step!();}else{const square=seed%25;play(square);model.play(square);}check();}
 keyboard.queueText('r');settle();model=afterDarkGamesReference(app.id)!;const current=Array.from({length:8},(_,i)=>i);for(let i=0;i<8;i++){const other=current.indexOf(DINNER_TARGET[i]!);if(i===other)continue;for(const seat of[i,other]){play(DINNER_CELLS[seat]!);model.play(DINNER_CELLS[seat]!);check();}[current[i],current[other]]=[current[other]!,current[i]!];}
 keyboard.queueText('n');settle();model.step!();check();expect(model.status).toBe(1);expect(starterScreen(m)).toContain('Everyone enjoys the dinner!');for(let i=0;i<25;i++)play(i);check();expect(m.stackHighWater).toBeLessThan(243);
 keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);
});

test('Dinner Seating solution and its rotated/reflected arrangements satisfy all six social rules',()=>{
 for(let rotation=0;rotation<8;rotation++){const rotated=DINNER_TARGET.slice(rotation).concat(DINNER_TARGET.slice(0,rotation));expect(dinnerConflict(rotated)).toBe(-1);expect(dinnerConflict(rotated.reverse())).toBe(-1);}expect(dinnerConflict([0,1,2,3,4,5,6,7])).toBeGreaterThanOrEqual(0);
});
