import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {buildNativeSoftware} from '../src/world/software/native';
import {ECLIPSE_EXPLORER} from '../src/world/software/eclipseExplorer';
import {createEclipseCartridge} from '../src/world/astronomy/eclipseCartridge';
import {buildEclipseCartridge} from '../src/world/astronomy/eclipseCartridgePacking';
import {unpackEclipseCentury} from '../src/world/astronomy/eclipsePacking';
import {BlockDevice,BlockMedium} from '../src/core/blockDevice';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {FirmwareProbe} from './firmwareProbe';
import {settleSoftwareUi} from './softwareUiDriver';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const built=buildNativeSoftware(core,source,ECLIPSE_EXPLORER);
function fixture(medium:BlockMedium|undefined=createEclipseCartridge()){
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state','page.script']);
 for(const img of[core.image,built.image])for(const c of img.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));
 const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));const disk=new BlockDevice([]);if(medium)disk.setMedium(22,medium);m.attach(disk);
 m.poke(REG_P,built.image.image.labels.get('app_entry')!);const loop=built.image.image.labels.get('app_key')!;
 const settle=()=>settleSoftwareUi(m,keyboard,loop);
 const key=(k:number)=>{keyboard.queueTrytes([k]);settle();};const type=(s:string)=>{keyboard.queueText(s);settle();};
 const run=(s:string)=>{keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));keyboard.queueText(s);keyboard.queueTrytes([TEXT_KEYS.activate]);settle();};
 const output=()=>String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)));
 settle();return{m,disk,key,type,run,output,keyboard};
}
test('immutable cartridge directory reaches all102 independently validated century files',()=>{
 const input=JSON.parse(readFileSync(new URL('../src/world/astronomy/data/nasa-eclipses.json',import.meta.url),'utf8'));const image=buildEclipseCartridge(input);expect([...image.slice(0,4)]).toEqual([69,67,2,102]);let next=1;
 for(let i=0;i<102;i++){const start=image[4+i*2]!,len=image[5+i*2]!;expect(start).toBe(next);const f=unpackEclipseCentury(image.slice(start*243,start*243+len));expect(f.startYear).toBe(-2000+i%51*100);expect(f.kind).toBe(i<51?'solar':'lunar');next+=Math.ceil(len/243);}
 expect(image.length).toBe(next*243);expect(createEclipseCartridge().image()).toEqual(image);expect(createEclipseCartridge().readOnly).toBe(true);
});
test('native eclipse keyboard selects and formats independent NASA solar/lunar anchors',()=>{
 const f=fixture();expect(f.output()).toContain('UT=TD minus dT');f.run('S2024');expect(f.m.peek(2621)).toBe(0);expect(f.output()).toContain('2024-04-08 Gregorian');expect(f.output()).toContain('18:18:29 TD Solar T');expect(f.output()).toContain('Magnitude 1.0566');expect(f.output()).toContain('Gamma 0.3431');
 f.type('d');expect(f.output()).toContain('Saros 139 Catalog 9561');expect(f.output()).toContain('DeltaT 74 seconds');f.type('d');expect(f.output()).toContain('Path km 198');expect(f.output()).toContain('Central seconds 268');f.key(TEXT_KEYS.right);expect(f.output()).toContain('2024-10-02');
 f.run('L2025');expect(f.output()).toContain('2025-03-14');expect(f.output()).toContain('Pen magnitude 2.2595');f.type('dd');expect(f.output()).toContain('Umb mag 1.1784');expect(f.output()).toContain('Partial min 218.3');expect(f.output()).toContain('Total min 65.4');
 console.log('Eclipse reserved',core.image.reserved,built.image.reserved);
});
test('native century boundaries, every event record, limb formatting and navigation agree with source data',()=>{
 const sourceData=JSON.parse(readFileSync(new URL('../src/world/astronomy/data/nasa-eclipses.json',import.meta.url),'utf8')) as {solar:{year:number;month:number;day:number;gamma1e4:number;magnitude1e4:number;deltaTSeconds:number}[];lunar:{year:number;month:number;day:number;gamma1e4:number;penumbralMagnitude1e4:number;deltaTSeconds:number}[]};
 const f=fixture(), guards=[2862,2899,3199,3225,3249,3255,3299,3462,3999,4243];for(const a of guards)f.m.poke(a,731);
 const years=[...Array.from({length:50},(_,i)=>-1900+i*100),-1999,-1,0,1,99,1099,1582,1699,1860,2024,2025,2099,2999];
 for(const kind of['solar','lunar']as const)for(const year of years){const rows=sourceData[kind].filter(r=>r.year===year);f.run((kind==='solar'?'S':'L')+(year<0?'-':'')+String(Math.abs(year)).padStart(4,'0'));expect(f.m.peek(2621)).toBe(0);expect(f.m.peek(3200)).toBe(rows.length);
  for(const [i,r] of rows.entries()){const text=f.output();expect(text).toContain(`${year<0?'-':''}${String(Math.abs(year)).padStart(4,'0')}-${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`);expect(text).toContain(`Event ${i+1}/${rows.length}`);expect(text).toContain(`Gamma ${(r.gamma1e4/1e4).toFixed(4)}`);const magnitude='magnitude1e4'in r?r.magnitude1e4:r.penumbralMagnitude1e4;expect(text).toContain(`${kind==='solar'?'Magnitude':'Pen magnitude'} ${(magnitude/1e4).toFixed(4)}`);expect(f.m.peek(2620)).toBeLessThanOrEqual(162);f.key(TEXT_KEYS.right);}
  expect(f.m.peek(3201)).toBe(0);f.key(TEXT_KEYS.left);expect(f.m.peek(3201)).toBe(rows.length-1);
 }
 expect(guards.map(a=>f.m.peek(a))).toEqual(guards.map(()=>731));
},30_000);
test('invalid input, missing/truncated/corrupt cartridges never expose stale event selection',()=>{
 const f=fixture();f.run('S2024');for(const input of['','S','X2024','S-2000','S3001','S9999','S20?4','L2025 extra']){f.run(input);expect(f.m.peek(2621)).toBe(-1);expect(f.m.peek(3200)).toBe(0);}f.run('L3000');expect(f.m.peek(2621)).toBe(0);
 for(const corrupt of['missing','header','index','checksum','truncated'] as const){const image=createEclipseCartridge().image();const start=image[84]!; // solar2000 entry40: directory cell84.
  if(corrupt==='header')image[0]=0;if(corrupt==='index')image[start*243+16+24]=999;if(corrupt==='checksum')image[start*243+200]!+=1;
  const medium=corrupt==='truncated'?new BlockMedium(27,true,image.slice(0,27*243)):new BlockMedium(image.length/243,true,image);
  const t=fixture(medium);if(corrupt==='missing')t.disk.setMedium(22);t.run('S2024');expect(t.output()).toContain('Eclipse cartridge');expect(t.m.peek(3200)).toBe(0);t.key(TEXT_KEYS.right);expect(t.m.peek(3200)).toBe(0);
 }
});
test('help/details remain bounded, input survives navigation, F1 exits to protected menu',()=>{
 const f=fixture();f.run('L2025');f.type('ddd');expect(f.output()).toContain('Penumbral min 362.6');expect(f.output()).toContain('Type T Class -p');f.type('h');expect(f.output()).toContain('Julian before 1582-10-15');f.key(TEXT_KEYS.right);expect(f.output()).toContain('2025-09-07');expect(String.fromCharCode(...Array.from({length:5},(_,i)=>f.m.peek(2552+i)))).toBe('L2025');
 f.keyboard.queueTrytes([TEXT_KEYS.home]);expect(f.m.run(200_000,new Set([core.image.image.labels.get('program_menu')!]))).toBe('breakpoint');
});

test('native BCE details retain large DeltaT/lunation and signed-year editing',()=>{
 const f=fixture();f.run('S-1999');expect(f.output()).toContain('Date -1999-06-12 Julian');expect(f.output()).toContain('03:14:51 TD Solar T');expect(f.output()).toContain('Magnitude 1.0733');f.type('d');expect(f.output()).toContain('DeltaT 46438 seconds');f.type('dd');expect(f.output()).toContain('Lunation -49456');
 f.run('S-1997');f.type('d');expect(f.output()).toContain('Saros -13');f.run('L0000');expect(f.output()).toContain('Date 0000-');f.run('S-0001');expect(f.output()).toContain('Date -0001-');
 for(const bad of['S-0000','S-2000','L-9999','S+0001','S-001','S00000']){f.run(bad);expect(f.m.peek(2621),bad).toBe(-1);}
});
