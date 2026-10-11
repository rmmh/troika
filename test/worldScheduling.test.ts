import {expect, test} from 'vitest';
import {assemble} from '../src/asm/assemble';
import {Machine, REG_P} from '../src/core/machine';
import {World, type ScheduledWorldAction} from '../src/core/world';
import {BlockDevice, BlockMedium} from '../src/core/blockDevice';
import {NetworkDevice, NetworkFabric} from '../src/core/networkDevice';
import {TextDevice} from '../src/core/textDevice';

type Host = {readyAt: number; phase: 'ready' | 'instruction' | 'sleep' | 'interrupt'};
type OriginalScheduler = {
  time: number; started: boolean; ordered: Host[];
  network: NetworkFabric; disks: {device: BlockDevice}[];
  actions: ScheduledWorldAction[];
  applyAction(action: ScheduledWorldAction['action']): void;
  boundary(host: Host): void;
};
// The original coordinator, deliberately scanning every disk and every host.
// CPU boundary semantics remain shared: this oracle tests scheduling, not ISA.
function originalAdvance(world: World, target: number) {
  const w = world as unknown as OriginalScheduler;
  w.started = true;
  for (const h of w.ordered) if (h.phase === 'sleep') h.readyAt = Math.min(h.readyAt, w.time);
  for (;;) {
    let hardware = w.network.nextEventTime;
    for (const {device} of w.disks) hardware = Math.min(hardware, w.time + device.cyclesUntilCompletion());
    const actionTime = w.actions[0]?.at ?? Infinity;
    let next = Math.min(target, hardware, actionTime);
    for (const h of w.ordered) next = Math.min(next, h.readyAt);
    const elapsed = next - w.time;
    w.network.advanceTo(next);
    for (const {device} of w.disks) device.advance(elapsed);
    w.time = next;
    while (w.actions[0]?.at === next) w.applyAction(w.actions.shift()!.action);
    if (hardware <= next || actionTime <= next || next === target) {
      for (const h of w.ordered) if (h.phase === 'sleep' && h.readyAt > next) h.readyAt = next;
    }
    for (const h of w.ordered) if (h.readyAt <= next) w.boundary(h);
    if (next === target) return;
  }
}
function cpu(source: string) {
  const a = assemble(`@500\n${source}`); expect(a.diagnostics).toEqual([]);
  const m = new Machine();
  for (const c of a.chunks) c.data.forEach((v,i) => m.poke(c.addr+i,v));
  m.poke(REG_P,500); return m;
}
function frame(nic: NetworkDevice) {
  const cells = new Int16Array(243); cells[0]=1; cells[1]=2;
  nic.write(-7,0); for (const value of cells) nic.write(-6,value);
}
function fixture(equal = false) {
  const world = new World(), medium = new BlockMedium(27);
  const source = 'M A 81\nQ A 9\nW 105 1\nW -333 73\nW -332 2\nloop: R B 110\nR B 112\nW 400 B\nI A 1\nQ A 2\nJ loop';
  // Reverse registration order and NIC order exercise the documented tie rules.
  const b = world.addMachine('b',cpu(equal ? source : 'H 0sAAA Z'));
  const a = world.addMachine('a',cpu(source));
  const bn = world.addInterface('b',4,[0,0,1],'lan');
  const an = world.addInterface('a',4,[0,0,2],'lan'); frame(an); frame(bn);
  const bd = world.addDisk('b',[medium]), ad = world.addDisk('a',[medium]);
  const text = new TextDevice(); b.attach(text);
  world.queueAction({kind:'text',host:'b',cells:[31]},6561);
  world.queueAction({kind:'text',host:'b',cells:[32]},6561);
  world.queueAction({kind:'link',host:'b',slot:4,connected:false},7000);
  world.queueAction({kind:'link',host:'b',slot:4,connected:true},7000);
  return {world,a,b,an,bn,ad,bd,medium,text};
}
function compare(a: ReturnType<typeof fixture>, b: ReturnType<typeof fixture>, at: number) {
  a.world.advanceTo(at); originalAdvance(b.world,at);
  expect(a.world.captureState(),`snapshot at ${at}`).toEqual(b.world.captureState());
}

test('scheduler matches the original coordinator across guest SEND/disk starts, clocks and irregular in-flight horizons',()=>{
  const a=fixture(),b=fixture();
  for(const at of [0,1,4,8,9,17,29,137,999,6560,6561,6562,6590,7000,7001,13121,13122,19003]) compare(a,b,at);
  expect(a.medium.read(0)[0]).toBe(73);
  expect(a.a.peek(400)).toBe(2);
  expect(a.text.captureState().input).toEqual([31,32]);
  const saved=a.world.captureState();
  expect(saved.hosts.some(h=>h.phase==='instruction')).toBe(true);
  const clone=fixture(); clone.world.restoreState(saved);
  compare(clone,b,23017);
});

test('equal CPU, NIC, disk and action boundaries retain original ordering',()=>{
  const a=fixture(true),b=fixture(true);
  for(const f of [a,b]) {
    // Simultaneous shared-medium writes: host b must complete last.
    f.bd.write(-9,22); f.bd.write(-8,2);
    f.ad.write(-9,11); f.ad.write(-8,2);
    f.bn.write(-3,1); f.an.write(-3,1);
    f.world.queueAction({kind:'mount',host:'a',unit:0,medium:null},6561);
  }
  for(const at of [0,3,8,27,6559,6560,6561,6562,7000,13001]) compare(a,b,at);
  expect(a.medium.read(0)[0]).toBe(22);
  expect(a.ad.attachedMedia()[0]).toBeUndefined();
  expect(a.bn.captureState().rx[0]![4]).toBe(2);
});

test('direct MMIO, cancellations and restored transfers between calls remain observable',()=>{
  const a=fixture(),b=fixture(); compare(a,b,211);
  for(const f of [a,b]) {
    f.an.reset(); frame(f.an); f.an.write(-3,1);
    f.ad.reset(); f.ad.write(-9,91); f.ad.write(-8,2);
    f.bn.receive(new Int16Array(243));
    f.world.queueAction({kind:'text',host:'b',cells:[99]});
  }
  compare(a,b,211); compare(a,b,300);
  const saved=a.world.captureState();
  for(const f of [a,b]) { f.an.setLink(false); f.ad.reset(); }
  compare(a,b,401);
  a.world.restoreState(saved); b.world.restoreState(saved);
  for(const at of [301,6771,6772,6773,9001]) compare(a,b,at);
  expect(a.medium.read(0)[0]).toBe(91);
});
