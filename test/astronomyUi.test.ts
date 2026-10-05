import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { ASTRONOMY } from '../src/world/software/astronomy';
import { FirmwareProbe } from './firmwareProbe';
import { REG_P } from '../src/core/machine';
import { TextDevice, OFF_STATUS } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { starterScreen } from '../src/world/starter';
import { astroMedium, ephemerisReference } from './astroEphemerisReference';
import { astroDecode, ASTRO_SCALE, nearest } from './astroMathReference';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const built=buildNativeSoftware(core,source,ASTRONOMY);
function fixture(mounted=true){
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','page.script','page.records','scratch','network.state']);
 for(const image of[core.image,built.image])for(const c of image.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));
 const guards=[4343,4399,4790,4799,5090,5190,5224];for(const p of guards)m.poke(p,811);
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const cells=astroMedium(2000),media=Array<BlockMedium|undefined>(27);media[0]=new BlockMedium(27);if(mounted)media[1]=new BlockMedium(cells.length/243,true,cells);const disk=new BlockDevice(media);m.attach(disk);
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const keyLoop=built.image.image.labels.get('app_key')!;
 function settle(waiting=false){const end=m.cycles+30_000_000,stops=new Set([keyLoop]);while(m.cycles<end){const result=m.run(end-m.cycles,stops);if(result!=='breakpoint')break;m.step();if(keyboard.inspect(OFF_STATUS,0)===3&&m.peek(2514)===1&&(waiting?m.peek(3990)>0:m.peek(4810)===0))return;}throw Error(`Not settled ${m.peek(REG_P)} loading=${m.peek(4810)} error=${m.peek(4812)} screen=${starterScreen(m)}`);}
 const key=(key:number|string)=>{typeof key==='string'?keyboard.queueText(key):keyboard.queueTrytes([key]);settle();};
 return{m,keyboard,disk,cells,settle,key,guards,screen:()=>starterScreen(m),word:(p:number)=>astroDecode(Array.from({length:10},(_,i)=>m.peek(p+i)))};
}
test('Native DE441 viewer loads all bodies, corrects Earth and formats exact native coordinates',()=>{
 expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const f=fixture();f.settle();expect(f.m.peek(4812)).toBe(0);expect(f.screen()).toContain('Solar System / DE441');expect(f.screen()).toContain('Barycentric ICRF XYZ / km');
 for(let body=0;body<11;body++){const expected=ephemerisReference(f.cells,[2000,1,1,12,0,0,0],body).xyz;expect([f.word(4400+30*body),f.word(4410+30*body),f.word(4420+30*body)]).toEqual(expected);}
 const ratio=nearest(ASTRO_SCALE*10000000000000000n,823005682214972154n);
 for(let axis=0;axis<3;axis++){const expected=f.word(4460+10*axis)-nearest(f.word(4670+10*axis)*ratio,ASTRO_SCALE);expect(f.word(4730+10*axis)).toBe(expected);const abs=expected<0n?-expected:expected,s=`${expected<0n?'-':''}${abs/1000000n}.${String(abs%1000000n).padStart(6,'0')}`;expect(f.screen()).toContain(s);}
 f.key(TEXT_KEYS.right);expect(f.screen()).toContain('Mars system barycenter');f.key('f');expect(f.screen()).toContain('Mean radius: 3389.5 km');f.key('h');expect(f.screen()).toContain('No apparent-sky correction');f.key('m');expect(f.screen()).toContain('ICRF XY projection');f.key('z');expect(f.screen()).toContain('Outer:1200 million km/cell');
 for(const p of f.guards)expect(f.m.peek(p),`guard ${p}`).toBe(811);
 f.keyboard.queueTrytes([TEXT_KEYS.home]);f.m.run(100_000);expect(f.m.peek(2504)).toBe(11);
},60_000);
test('Native date editor rejects malformed and non-Gregorian dates, accepts leap day and milliseconds',()=>{
 const f=fixture();f.settle();for(const value of['2000-02-30 12:00:00','1900-02-29 00:00:00','2000/01/01 00:00:00','-','','-0001-13-01 00:00:00','']){f.key('d');f.keyboard.queueText(value);f.keyboard.queueTrytes([TEXT_KEYS.activate]);f.settle();expect(f.screen()).toContain('Invalid Gregorian TDB date');}
 f.key('d');f.keyboard.queueText('2000-02-29 12:34:56.788');f.keyboard.queueTrytes([TEXT_KEYS.left,TEXT_KEYS.delete]);f.keyboard.queueText('9');f.keyboard.queueTrytes([TEXT_KEYS.activate]);f.settle();expect(f.m.peek(4812)).toBe(0);expect(f.screen()).toContain('2000-02-29 12:34:56.789');expect([f.word(4400),f.word(4410),f.word(4420)]).toEqual(ephemerisReference(f.cells,[2000,2,29,12,34,56,789],0).xyz);
 expect(f.m.stackHighWater).toBeLessThan(243);
},60_000);
test('Missing media remains interruptible, failed downloads require explicit retry',()=>{
 const f=fixture(false);f.settle(true);expect(f.screen()).toContain('Loading native ephemeris');expect(f.m.peek(3990)).toBe(41);f.m.poke(3990,-41);f.settle();expect(f.screen()).toContain('Archive download failed');const cells=astroMedium(2000);f.disk.setMedium(1,new BlockMedium(cells.length/243,true,cells));f.key(TEXT_KEYS.activate);expect(f.m.peek(4812)).toBe(0);expect(f.screen()).toContain('Barycentric ICRF');
 const g=fixture(false);g.settle(true);g.keyboard.queueTrytes([TEXT_KEYS.home]);g.m.run(100_000);expect(g.m.peek(2504)).toBe(11);
},60_000);

test('Native numeric formatting and map projection handle balanced-limb cancellation and far Pluto',()=>{
 const f=fixture(false),m=f.m;
 function encode(value:bigint){return Array.from({length:10},()=>{let r=value%81n;if(r>40n)r-=81n;if(r< -40n)r+=81n;value=(value-r)/81n;return Number(r);});}
 function call(label:string,value:bigint){encode(value).forEach((v,i)=>m.poke(4400+i,v));m.poke(-13,4400);m.poke(6,5708);m.poke(5708,1234);m.poke(REG_P,built.image.image.labels.get(label)!);expect(m.run(200_000,new Set([1234]))).toBe('breakpoint');expect(f.word(4400)).toBe(value);}
 for(const value of[0n,809n,-809n,810n,-810n,811n,-811n,999999n,1000000n,-1000000n,6673808449792784n]){call('au_format_mm',value);const abs=value<0n?-value:value,expected=`${value<0n?'-':''}${abs/1000000n}.${String(abs%1000000n).padStart(6,'0')}`;let actual='';for(let i=5060;m.peek(i)!==0;i++)actual+=String.fromCharCode(m.peek(i));expect(actual).toBe(expected);}
 m.poke(4809,1);for(const value of[6673808449792784n,-6673808449792784n]){call('au_map_coordinate',value);expect(m.peek(-13)).toBe(value<0n?-6:6);}
});

test('Native animation advances completed frames at explicit speeds and reverses without queued work',()=>{
 const f=fixture();f.settle();expect(f.screen()).toContain('Paused +1 hour/frame');f.key(' ');expect(f.m.peek(4830)).toBe(1);f.settle();expect(f.screen()).toContain('2000-01-01 13:00:00.000');f.key(' ');expect(f.m.peek(4830)).toBe(0);f.key('+');f.key('+');f.key('+');f.key('+');expect(f.screen()).toContain('+365 days/frame');f.key('R');expect(f.screen()).toContain('-365 days/frame');f.key('-');f.key('-');f.key('-');f.key('-');f.key(' ');f.settle();f.key(' ');expect(f.screen()).toContain('2000-01-01 12:00:00.000');
},60_000);

test('Signed astronomical date entry and native formatter preserve BCE/year-zero notation',()=>{
 const f=fixture();f.settle();f.key('D');f.keyboard.queueText('-0001-12-31 23:59:59.999');f.keyboard.queueTrytes([TEXT_KEYS.activate]);f.settle(true);expect(f.m.peek(4800)).toBe(-1);expect(f.m.peek(3990)).toBe(20);expect(f.screen()).toContain('-0001-12-31 23:59:59.999');
 // Format the next era directly; ep_step has independent Gregorian boundary tests.
 f.m.poke(4800,0);f.m.poke(4801,1);f.m.poke(4802,1);f.m.poke(4803,0);f.m.poke(6,5708);f.m.poke(5708,1234);f.m.poke(REG_P,built.image.image.labels.get('au_date_string')!);expect(f.m.run(100_000,new Set([1234]))).toBe('breakpoint');expect(String.fromCharCode(...Array.from({length:f.m.peek(4814)},(_,i)=>f.m.peek(2552+i)))).toBe('0000-01-01 00:59:59.999');
},60_000);

test('Animation pauses atomically at the final supported date and every fact page stays within VRAM',()=>{
 const f=fixture();f.settle();f.key('F');for(let i=0;i<12;i++){expect(f.screen()).toContain('JPL physical parameters');f.key(TEXT_KEYS.right);}f.key('M');
 const last=astroMedium(3000);f.disk.setMedium(1,new BlockMedium(last.length/243,true,last));f.key('D');f.keyboard.queueText('3000-12-31 23:59:59.999');f.keyboard.queueTrytes([TEXT_KEYS.activate]);f.settle();f.key(' ');f.settle();expect(f.m.peek(4830)).toBe(0);expect(f.m.peek(4833)).toBe(1);expect(f.screen()).toContain('Date limit; reverse to play');expect(f.screen()).toContain('3000-12-31 23:59:59.999');for(const p of f.guards)expect(f.m.peek(p),`guard ${p}`).toBe(811);
},60_000);

test('BCE coordinates are native and animation crosses year zero with an archive swap',()=>{
 const f=fixture();f.settle();const ancient=astroMedium(-1999);f.disk.setMedium(1,new BlockMedium(ancient.length/243,true,ancient));f.key('D');f.keyboard.queueText('-1999-01-01 00:00:00.000');f.keyboard.queueTrytes([TEXT_KEYS.activate]);f.settle();expect(f.m.peek(4812)).toBe(0);expect([f.word(4670),f.word(4680),f.word(4690)]).toEqual(ephemerisReference(ancient,[-1999,1,1,0,0,0,0],9).xyz);
 const before=astroMedium(-1);f.disk.setMedium(1,new BlockMedium(before.length/243,true,before));f.key('D');f.keyboard.queueText('-0001-12-31 23:00:00.000');f.keyboard.queueTrytes([TEXT_KEYS.activate]);f.settle();f.key(' ');f.settle(true);expect(f.m.peek(4800)).toBe(0);expect(f.m.peek(3990)).toBe(21);expect(f.m.peek(4810)).toBe(1);const after=astroMedium(0);f.disk.setMedium(1,new BlockMedium(after.length/243,true,after));f.settle();f.key(' ');expect(f.screen()).toContain('0000-01-01 00:00:00.000');expect([f.word(4670),f.word(4680),f.word(4690)]).toEqual(ephemerisReference(after,[0,1,1,0,0,0,0],9).xyz);for(const p of f.guards)expect(f.m.peek(p)).toBe(811);
},60_000);
