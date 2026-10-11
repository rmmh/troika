import {expect,test,vi} from 'vitest';
import {NetworkFabric,NETWORK_TICK_CYCLES,type NetworkDevice} from '../src/core/networkDevice';
const send=(nic:NetworkDevice,tag=7)=>{const frame=new Int16Array(243);frame[0]=1;frame[1]=2;frame[7]=9;frame[26]=1;frame[27]=tag;nic.write(-7,0);for(const cell of frame)nic.write(-6,cell);nic.write(-3,1);};

test('idle and in-flight event queries reuse the minimum until a device changes its deadline',()=>{
 const f=new NetworkFabric(),a=f.add(4,[0,0,1],'lan'),b=f.add(4,[0,0,2],'lan');
 const readA=vi.spyOn(a,'completionTime','get'),readB=vi.spyOn(b,'completionTime','get');
 expect(f.nextEventTime).toBe(Infinity);
 for(let i=0;i<100;i++){f.advanceTo(i);expect(f.nextEventTime).toBe(Infinity);}
 expect(readA).toHaveBeenCalledTimes(1);expect(readB).toHaveBeenCalledTimes(1);
 send(a);const due=99+NETWORK_TICK_CYCLES;expect(f.nextEventTime).toBe(due);
 for(let i=100;i<200;i++){f.advanceTo(i);expect(f.nextEventTime).toBe(due);}
 expect(readA).toHaveBeenCalledTimes(2);expect(readB).toHaveBeenCalledTimes(2);
 a.write(-3,1); // rejected busy SEND must retain the real deadline
 expect(f.nextEventTime).toBe(due);expect(readA).toHaveBeenCalledTimes(2);
 readA.mockRestore();readB.mockRestore();
});

test('reset, command reset, link cancellation and direct completion expose the next sender',()=>{
 const f=new NetworkFabric(),a=f.add(4,[0,0,1],'lan'),b=f.add(4,[0,0,2],'lan');
 send(a);f.advanceTo(10);send(b);expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES);
 a.reset();expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES+10);
 b.write(-3,4);expect(f.nextEventTime).toBe(Infinity);
 send(a);expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES+10);
 a.setLink(false);expect(f.nextEventTime).toBe(Infinity);
 a.setLink(true);expect(f.nextEventTime).toBe(Infinity);
 send(a);expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES+10);
 const delivered:number[]=[];a.complete(NETWORK_TICK_CYCLES+10,frame=>delivered.push(frame[27]!));
 expect(delivered).toEqual([7]);expect(f.nextEventTime).toBe(Infinity);
});

test('direct NIC restore and whole-fabric time rewind invalidate an already cached minimum',()=>{
 const f=new NetworkFabric(),a=f.add(4,[0,0,2],'lan'),b=f.add(4,[0,0,1],'lan'),receiver=f.add(4,[0,0,9],'lan');
 send(a,22);send(b,11);const saved=f.captureState(),nic=a.captureState();
 expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES);
 f.advanceTo(NETWORK_TICK_CYCLES);expect(f.nextEventTime).toBe(Infinity);
 a.restoreState(nic);expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES);
 a.reset();expect(f.nextEventTime).toBe(Infinity);
 f.restoreState(saved);expect(f.cycles).toBe(0);expect(f.nextEventTime).toBe(NETWORK_TICK_CYCLES);
 f.advanceTo(NETWORK_TICK_CYCLES-1);expect(receiver.inspect(-9)).toBe(0);
 f.advanceTo(NETWORK_TICK_CYCLES);expect(receiver.inspect(-9)).toBe(2);
 receiver.write(-5,27);expect(receiver.read(-4)).toBe(11);receiver.write(-3,2);
 receiver.write(-5,27);expect(receiver.read(-4)).toBe(22);expect(f.nextEventTime).toBe(Infinity);
});

test('adding a NIC after an empty cached fabric and restoring a new earlier deadline work',()=>{
 const f=new NetworkFabric();expect(f.nextEventTime).toBe(Infinity);f.advanceTo(100);
 const a=f.add(4,[0,0,1],'lan');send(a);expect(f.nextEventTime).toBe(100+NETWORK_TICK_CYCLES);
 const b=f.add(4,[0,0,2],'lan');send(b);const earlier=b.captureState();earlier.due=101;
 b.restoreState(earlier);expect(f.nextEventTime).toBe(101);f.advanceTo(101);
 expect(f.nextEventTime).toBe(100+NETWORK_TICK_CYCLES);
});
