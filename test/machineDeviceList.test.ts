import {expect,test} from 'vitest';
import {Machine} from '../src/core/machine';
import type {Device} from '../src/core/devices';

test('tick iteration visits appended slots and replacements not yet visited in insertion order',()=>{
 const m=new Machine(),seen:string[]=[];let first=true;
 const a:Device={id:2,tick(){seen.push('a');if(first){first=false;m.attach({id:3,tick(){seen.push('new b');}});m.attach({id:4,tick(){seen.push('c');}});m.attach({id:2,tick(){seen.push('new a');}});}}};
 m.attach(a);m.attach({id:3,tick(){seen.push('old b');}});
 m.pollWorldBoundary();expect(seen).toEqual(['a','new b','c']);seen.length=0;
 m.pollWorldBoundary();expect(seen).toEqual(['new a','new b','c']);
});

test('mutable tick hooks and defensive attached-device snapshots remain live',()=>{
 const m=new Machine(),seen:string[]=[];const b:Device={id:3};
 m.attach({id:2,tick(){b.tick=()=>seen.push('b');}});m.attach(b);
 const devices=m.attachedDevices();(devices as Device[]).pop();
 m.pollWorldBoundary();expect(seen).toEqual(['b']);expect(m.attachedDevices()).toHaveLength(2);
 delete b.tick;m.attach({id:2});m.pollWorldBoundary();expect(seen).toEqual(['b']);
});

test('attachment slot identity stays independent of a mutable Device.id or duplicate object',()=>{
 const m=new Machine(),seen:string[]=[];const device:Device={id:2,tick(){seen.push('shared');},read(){return 12;}};
 m.attach(device);device.id=3;m.attach(device);m.attach({id:2,tick(){seen.push('replacement');},read(){return 34;}});
 m.pollWorldBoundary();expect(seen).toEqual(['replacement','shared']);expect(m.read(54)).toBe(34);expect(m.read(81)).toBe(12);
 expect(m.attachedDevices()[1]).toBe(device);
});

test('sleep-event iteration includes appended devices and observes replacement next-event methods',()=>{
 const m=new Machine();m.sleep={remaining:Infinity,sleepPC:500,wakePC:503};let first=true;
 m.attach({id:2,nextEventCycles(){if(first){first=false;m.attach({id:3,nextEventCycles(){return 9;}});m.attach({id:4,nextEventCycles(){return 3;}});}return 20;}});
 m.attach({id:3,nextEventCycles(){return 30;}});
 expect(m.cyclesUntilSleepEvent()).toBe(3);expect(m.attachedDevices().map(d=>d.id)).toEqual([2,3,4]);
});
