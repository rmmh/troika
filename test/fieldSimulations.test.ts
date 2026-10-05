import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {FIELD_SIMULATIONS} from '../src/world/software/fieldSimulations';
import {fieldSimulationsReference} from './fieldSimulationsReference';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const routes:Record<string,number[][]>={
 'orbit-bench':[Array(64).fill(-1),[24,-1,-1,-1],[3,...Array(12).fill(-1)]],
 'contour-notebook':[[0,-1,8,-1,16,-1]],
};
for(const app of FIELD_SIMULATIONS)test(`${app.id}: full native scenarios, illegal actions, repeat and reset`,()=>{
 const built=buildNativeSoftware(core,source,app);expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
 for(const image of [core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 m.poke(2899,733);m.poke(2900+app.rows*app.columns,377);m.poke(3199,911);m.poke(3198,719);m.poke(3219,771);m.poke(3049,933);m.poke(3322,993);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(n:number)=>{keyboard.queueTrytes([n]);settle();};
 settle();let model=fieldSimulationsReference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.rows*app.columns},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);expect(m.peek(2899)).toBe(733);expect(m.peek(2900+app.rows*app.columns)).toBe(377);expect(m.peek(3199)).toBe(911);expect(m.peek(3198)).toBe(719);expect(m.peek(3219)).toBe(771);expect(m.peek(3049)).toBe(933);expect(m.peek(3322)).toBe(993);};
 const play=(square:number)=>{
  if(square<0){keyboard.queueText('n');settle();model.step!();check();return;}
  const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;
  for(let i=0;i<Math.abs(dr);i++)key(dr<0?TEXT_KEYS.up:TEXT_KEYS.down);for(let i=0;i<Math.abs(dc);i++)key(dc<0?TEXT_KEYS.left:TEXT_KEYS.right);
  key(TEXT_KEYS.activate);model.play(square);check();
 };
 if(app.id==='contour-notebook'){
  play(27);play(-1);expect(starterScreen(m)).toContain('Contours; +/- changes level');
  for(const delta of [1,-1])for(let n=0;n<12;n++){keyboard.queueText(delta>0?'+':'-');settle();model.adjustLevel(delta);check();}
  play(-1);expect(model.board.slice(48,54)).toBe('247052');expect(starterScreen(m)).toContain('Enter picks row; N:heights');play(-1);expect(model.board[27]).toBe('0');
 }
 for(const [routeIndex,route] of routes[app.id]!.entries()){keyboard.queueText('r');settle();model=fieldSimulationsReference(app.id)!;check();for(const square of route)play(square);expect(model.status).toBe(app.id==='contour-notebook'?0:routeIndex===0?1:2);play(0);play(12);}
 for(const example of app.examples){keyboard.queueText('r');settle();model=fieldSimulationsReference(app.id)!;for(const square of example.moves)play(square);for(let i=0;i<(example.steps??0);i++)play(-1);expect(model.board).toBe(example.board);expect(model.moves).toBe(example.movesMade);expect(model.status).toBe(example.status);}
 if(app.id==='orbit-bench'){
  const outcomes=new Set<number>();
  for(let square=0;square<49;square++){play(square);for(let tick=0;tick<64&&!model.status;tick++)play(-1);expect(model.status).toBeGreaterThan(0);outcomes.add(model.status);}
  expect([...outcomes].sort()).toEqual([1,2]);
 }
 // Each decision row and every column are reachable through the real keyboard.
 let seed=app.number;
 for(let i=0;i<160;i++){if(model.status){keyboard.queueText('r');settle();model=fieldSimulationsReference(app.id)!;}seed=(seed*48271)%2147483647;play(i%3===2?-1:seed%(app.rows*app.columns));}
 expect(m.stackHighWater).toBeLessThan(243);keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);
});
