import {expect,test,vi} from 'vitest';
import {World} from '../src/core/world';
import {BlockMedium,BLOCK_IO_CYCLES} from '../src/core/blockDevice';
import {assemble} from '../src/asm/assemble';
import {Machine,REG_P} from '../src/core/machine';
function cpu(){const a=assemble('@500\nloop: J loop');expect(a.diagnostics).toEqual([]);const m=new Machine();for(const c of a.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,500);return m;}
function setup(){const w=new World(),media=new BlockMedium(27);w.addMachine('b',cpu());w.addMachine('a',cpu());const b=w.addDisk('b',[media]),a=w.addDisk('a',[media]);return{w,a,b,media};}
const write=(disk:ReturnType<typeof setup>['a'],v:number)=>{disk.write(-10,0);disk.write(-9,v);disk.write(-8,2);};

test('idle controllers are neither scanned nor advanced at CPU boundaries',()=>{
 const{w,a,b,media}=setup();const aTime=vi.spyOn(a,'cyclesUntilCompletion'),bTime=vi.spyOn(b,'cyclesUntilCompletion'),aAdvance=vi.spyOn(a,'advance'),bAdvance=vi.spyOn(b,'advance');
 w.advanceTo(w.cycles+1000);expect(aTime).not.toHaveBeenCalled();expect(bTime).not.toHaveBeenCalled();expect(aAdvance).not.toHaveBeenCalled();expect(bAdvance).not.toHaveBeenCalled();
 write(a,19);aTime.mockClear();bTime.mockClear();w.advanceTo(w.cycles+BLOCK_IO_CYCLES-1);expect(media.read(0)[0]).toBe(0);expect(aAdvance).toHaveBeenCalled();expect(bAdvance).not.toHaveBeenCalled();expect(bTime).not.toHaveBeenCalled();
 w.advanceTo(w.cycles+1);expect(media.read(0)[0]).toBe(19);aTime.mockClear();bTime.mockClear();aAdvance.mockClear();w.advanceTo(w.cycles+1000);expect(aTime).not.toHaveBeenCalled();expect(bTime).not.toHaveBeenCalled();expect(aAdvance).not.toHaveBeenCalled();
});

test('simultaneous completions retain host order independent of start order and shared media',()=>{
 const{w,a,b,media}=setup();write(b,22);write(a,11);w.advanceTo(w.cycles+BLOCK_IO_CYCLES);expect(media.read(0)[0]).toBe(22);
 expect(a.cyclesUntilCompletion()).toBe(Infinity);expect(b.cyclesUntilCompletion()).toBe(Infinity);
});

test('direct reset, command reset, hotplug cancellation and direct advance remove active transfers',()=>{
 const{w,a,media}=setup();const advance=vi.spyOn(a,'advance');
 for(const cancel of[()=>a.reset(),()=>a.write(-8,4),()=>a.setMedium(0),()=>a.advance(BLOCK_IO_CYCLES)]){
  a.setMedium(0,media);write(a,31);cancel();advance.mockClear();w.advanceTo(w.cycles+100);expect(advance).not.toHaveBeenCalled();expect(a.cyclesUntilCompletion()).toBe(Infinity);
 }
});

test('individual controller restore and whole-world restore rebuild the active set',()=>{
 const{w,a,b,media}=setup();write(a,41);w.advanceTo(w.cycles+100);const saved=w.captureState(),disk=a.captureState([media]);
 a.reset();w.advanceTo(w.cycles+100);a.restoreState(disk,[media]);w.advanceTo(w.cycles+BLOCK_IO_CYCLES-101);expect(media.read(0)[0]).toBe(0);w.advanceTo(w.cycles+1);expect(media.read(0)[0]).toBe(41);
 write(b,82);w.restoreState(saved);expect(media.read(0)[0]).toBe(0);expect(b.cyclesUntilCompletion()).toBe(Infinity);
 w.advanceTo(w.cycles+BLOCK_IO_CYCLES-101);expect(media.read(0)[0]).toBe(0);w.advanceTo(w.cycles+1);expect(media.read(0)[0]).toBe(41);
});
