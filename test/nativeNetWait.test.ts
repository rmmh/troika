import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { World } from '../src/core/world';
const source = readFileSync(new URL('../firmware/include/netWait.asm', import.meta.url),'utf8');
function setup(timer = 0) {
  const image = assemble(`@-9112
J entry
$net_ifaces: 2066
$net_iface_count: 2120
$net_pending: 2125
$net_rx_owned: 2142
${source}
entry: M S 5710 W net_ifaces 95 W net_iface_count 2 W 2093 122
C S net_wait_init W 30 Z M A ${timer} C S net_wait
W 2200 1 H 0sAAA Z`);
  expect(image.diagnostics).toEqual([]);
  const m = new Machine();for(const c of image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,image.entry!);
  const w = new World();w.addMachine('cpu',m);
  const nics = [w.addInterface('cpu',4,[0,0,1],'a'),w.addInterface('cpu',5,[0,0,2],'b')];
  return {w,m,nics,halt:image.labels.get('net_wait_halt')!};
}
test('an idle native server executes no polling instructions and wakes on either NIC', () => {
  for(const index of [0,1]) {
    const {w,m,nics} = setup();let instructions = 0;
    const step = m.startWorldInstruction.bind(m);m.startWorldInstruction = () => {instructions++;return step();};
    w.runCycles(1000);expect(m.peek(2200)).toBe(0);expect(m.sleep?.remaining).toBe(Infinity);
    const before = instructions;w.runCycles(1_000_000);expect(instructions).toBe(before);
    nics[index]!.receive(new Int16Array(243));w.runCycles(1000);
    expect(m.peek(2200)).toBe(1);expect(m.peek(REG_S)).toBe(5710);
  }
});
test('a packet arriving between queue inspection and H cannot be lost', () => {
  const {w,m,nics,halt} = setup();let injected = false;
  const step = m.startWorldInstruction.bind(m);m.startWorldInstruction = () => {
    if(m.peek(REG_P) === halt && !injected){injected=true;nics[1]!.receive(new Int16Array(243));}
    return step();
  };
  w.runCycles(1000);expect(injected).toBe(true);expect(m.peek(2200)).toBe(1);expect(m.peek(REG_S)).toBe(5710);
});
test('queued frames bypass sleep, and protocol timers wake without an interrupt', () => {
  const queued = setup();queued.nics[1]!.receive(new Int16Array(243));queued.w.runCycles(1000);expect(queued.m.peek(2200)).toBe(1);
  const timed = setup(6561);timed.w.runCycles(1000);expect(timed.m.peek(2200)).toBe(0);
  timed.w.runCycles(7000);expect(timed.m.peek(2200)).toBe(1);expect(timed.m.peek(REG_S)).toBe(5710);
});
