import {expect,test} from 'vitest';
import {CUE_CARDS} from '../src/world/software/cueCards';
import {BlockDevice,BlockMedium} from '../src/core/blockDevice';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {norm} from '../src/core/tryte';
import {createDiskImage} from '../src/firmware/diskImage';
import {documentAppFixture} from './documentAppFixture';

const records=(f:ReturnType<typeof documentAppFixture>)=>Array.from({length:12},(_,i)=>f.record(i));
function replaceMedium(f:ReturnType<typeof documentAppFixture>,medium:BlockMedium){
 f.m.attach(new BlockDevice([medium]));
 f.m.poke(6927,0);
}
function container(text='Disk text'){
 const cells=new Int16Array(666);cells.set([0,1,214,12,660,0]);
 // Obtain magic from a native save, rather than duplicating assembler string packing.
 const f=documentAppFixture(CUE_CARDS);f.type('s');
 cells[0]=f.m.peek(4010);cells[6]=text.length;cells.set([...text].map(c=>c.charCodeAt(0)),7);
 checksum(cells);return cells;
}
function checksum(cells:Int16Array){cells[5]=norm(cells.slice(6).reduce((sum,v)=>sum+v,0));}
const disk=(cells:Int16Array)=>createDiskImage({blocks:27,volumeId:[0,0,1],files:{'/cues':cells}});

test('document editor inserts/deletes at caret, caps at54, cancels and guards adjacent arenas',()=>{
 const f=documentAppFixture(CUE_CARDS);
 const guards=[2551,2606,2999,3660,4676,5225];
 guards.forEach(a=>f.m.poke(a,728));
 f.edit(0,'AC');f.key(TEXT_KEYS.activate);f.key(TEXT_KEYS.left);f.type('B');f.key(TEXT_KEYS.activate);expect(f.record(0)).toBe('ABC');
 f.key(TEXT_KEYS.activate);f.key(TEXT_KEYS.left);f.key(TEXT_KEYS.backspace);f.type('x');f.key(TEXT_KEYS.delete);f.key(TEXT_KEYS.activate);expect(f.record(0)).toBe('Ax');
 f.key(TEXT_KEYS.activate);f.type('discard');f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('Ax');expect(f.m.peek(2612)).toBe(0);
 f.edit(11,'Z'.repeat(54));f.key(TEXT_KEYS.activate);f.type('overflow');expect(f.m.peek(2610)).toBe(54);f.key(TEXT_KEYS.activate);expect(f.record(11)).toBe('Z'.repeat(54));
 f.key(TEXT_KEYS.next);expect(f.m.peek(2613)).toBe(0);f.key(TEXT_KEYS.previous);expect(f.m.peek(2613)).toBe(11);
 f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);expect(f.m.peek(2614)).toBe(1);
 guards.forEach(a=>expect(f.m.peek(a),`guard ${a}`).toBe(728));expect(f.m.stackHighWater).toBeLessThan(243);
},60_000);

test('native load rejects malformed headers, checksums, shape, ASCII and padding without partial publication',()=>{
 const valid=container(),variants:[string,(c:Int16Array)=>Int16Array][]=[
 ['magic',c=>{c[0]=c[0]!+1;return c;}],['version',c=>{c[1]=c[1]!+1;return c;}],['app',c=>{c[2]=c[2]!-1;return c;}],
 ['count',c=>{c[3]=c[3]!-1;return c;}],['payload',c=>{c[4]=c[4]!-1;return c;}],['checksum',c=>{c[5]=c[5]!+1;return c;}],
 ['negative length',c=>{c[6]=-1;checksum(c);return c;}],['long length',c=>{c[6]=55;checksum(c);return c;}],
 ['control',c=>{c[7]=31;checksum(c);return c;}],['high ASCII',c=>{c[7]=127;checksum(c);return c;}],
 ['padding',c=>{c[60]=65;checksum(c);return c;}],['tail record',c=>{c[611]=-1;checksum(c);return c;}],
 ['short',c=>c.slice(0,665)],['long',c=>{const x=new Int16Array(667);x.set(c);return x;}],
 ];
 const f=documentAppFixture(CUE_CARDS);f.edit(0,'Unsaved live text');const before=records(f);
 for(const[name,mutate]of variants){replaceMedium(f,new BlockMedium(27,false,disk(mutate(valid.slice()))));f.type('l');f.type('d');expect(records(f),name).toEqual(before);expect(f.m.peek(2614),name).toBe(1);expect(f.screen(),name).toContain('Load failed');}
 replaceMedium(f,new BlockMedium(27,false,disk(valid)));f.type('l');f.type('d');expect(f.record(0)).toBe('Disk text');expect(f.m.peek(2614)).toBe(0);
},60_000);

test('read-only and full disks retain edits and previous saved document',()=>{
 const saved=container('Previously saved');
 const images=[new BlockMedium(27,true,disk(saved)),new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,1],files:{'/cues':saved,'/filler':new Int16Array(13*243)}}))];
 for(const medium of images){const f=documentAppFixture(CUE_CARDS,medium.image());f.edit(0,'Keep these changes');const before=medium.image();replaceMedium(f,medium);f.type('s');expect(f.m.peek(2614)).toBe(1);expect(f.record(0)).toBe('Keep these changes');expect(f.screen()).toContain('Save failed');expect(medium.image()).toEqual(before);const cold=documentAppFixture(CUE_CARDS,medium.image());expect(cold.record(0)).toBe('Previously saved');}
},60_000);

class TracedMedium extends BlockMedium {
 readonly snapshots:Int16Array[]=[];
 override write(block:number,data:Int16Array){super.write(block,data);this.snapshots.push(this.image());}
}
test('every durable native replacement boundary cold-loads a complete old or new document',()=>{
 const f=documentAppFixture(CUE_CARDS);f.edit(0,'Old complete document');f.type('s');
 const medium=new TracedMedium(27,false,f.medium.image());replaceMedium(f,medium);
 f.edit(0,'New complete document');f.edit(11,'New tail');f.type('s');expect(f.m.peek(2614)).toBe(0);expect(medium.snapshots.length).toBeGreaterThan(6);
 for(const image of medium.snapshots){const cold=documentAppFixture(CUE_CARDS,image);const first=cold.record(0);expect(['Old complete document','New complete document']).toContain(first);expect(cold.record(11)).toBe(first.startsWith('New')?'New tail':'');}
},60_000);

class WriteProtectedAfter extends BlockMedium {
 writes=0;
 constructor(image:Int16Array,private readonly stop:(block:number,n:number)=>boolean){super(27,false,image);}
 override write(block:number,data:Int16Array){super.write(block,data);if(this.stop(block,++this.writes))Object.defineProperty(this,'readOnly',{value:true});}
}
test('native I/O failures distinguish unpublished edits from published replacement cleanup',()=>{
 const original=documentAppFixture(CUE_CARDS);original.edit(0,'Old value');original.type('s');const image=original.medium.image();
 for(const committed of [false,true]){
  const f=documentAppFixture(CUE_CARDS,image),medium=new WriteProtectedAfter(image,(block,n)=>committed?block===2:n===1);
  replaceMedium(f,medium);f.edit(0,'New value');f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.type('s');
  expect(f.m.peek(2612)).toBe(0);expect(f.m.peek(2614)).toBe(committed?0:1);expect(f.record(0)).toBe('New value');
  expect(f.screen()).toContain(committed?'Saved; disk check needed':'Save failed');
  const cold=documentAppFixture(CUE_CARDS,medium.image());expect(cold.record(0)).toBe(committed?'New value':'Old value');
 }
},60_000);
