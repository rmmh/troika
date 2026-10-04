import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { encodeWide } from '../src/core/wide';
import { FirmwareProbe } from './firmwareProbe';

const names = ['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','router','probe'];
const modules = names.map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
function writes(base: number, values: number[]) { return values.map((v,i) => `W ${base+i} ${v}`).join('\n'); }
function cpu(body: string, address: number[], gateway = [0,0,0]) {
  const linked = linkFirmware([{name:'boot',source:'J entry'}, ...modules, {name:'app',source:`
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W serial_unit Z W 2545 1
${writes(2067,address)}
${writes(2070,gateway)}
${body}`}]);
  const m = new FirmwareProbe(['mmio','network.buffers','network.state','filesystem','native.stack','forth.state','page.text']);
  for (const c of linked.image.chunks) c.data.forEach((v,i) => m.poke(c.addr+i,v));
  m.poke(REG_P,linked.image.entry!);
  return m;
}
function medium() { return new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,1],files:{'/net.seq':encodeWide(1)}})); }
function routed(hops: number, destination = [1,3,9], silent = false) {
  const c = cpu(`${writes(2190,destination)}
M A 2190 M B ${hops} C S probe_begin N A Z J done
loop: C S net_poll ifg A Z C S probe_input C S net_discard_input end
C S probe_service E A Z J loop
done: W 2200 A H 0sAAA Z`,[1,2,7],[1,2,9]);
  const router = cpu(silent ? `loop: C S net_poll C S net_consume C S net_service J loop` : `W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 9
W router_route_count 2 W 2200 1 W 2201 1 W 2202 2 W 2207 1 W 2208 1 W 2209 3 W 2210 1
C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`,[1,2,9]);
  const w = new World();w.addMachine('client',c);w.addMachine('router',router);
  w.addInterface('client',4,[0,0,10],'a');w.addInterface('router',4,[0,0,90],'a');w.addInterface('router',5,[0,0,91],'b');
  w.addDisk('client',[medium()]);w.addDisk('router',[medium()]);
  return {w,c};
}
for (const [label,hops,destination,result,code] of [
  ['echo',27,[1,3,9],1,0],
  ['time exceeded',1,[1,3,8],4,0],
  ['no route',27,[1,4,8],3,1],
] as const) test(`native probe receives routed ${label}`, () => {
  const {w,c} = routed(hops,[...destination]);
  while (!c.sleep && w.cycles < 12_000_000) w.runCycles(6561);
  expect(c.sleep?.remaining).toBe(Infinity);
  expect(c.peek(2200)).toBe(result);expect(c.peek(5227)).toBe(code);
  expect([c.peek(5240),c.peek(5241),c.peek(5242)]).toEqual(result === 1 ? [1,3,9] : [1,2,9]);
  expect(c.peek(REG_S)).toBe(5710);
});

test.each([0,1,2,3,4,5,6,7,8,9])('probe rejects unrelated reply field %i without releasing ingress', field => {
  const m = cpu('C S probe_input W 2200 A H 0sAAA Z',[1,2,7]);
  const w = new World();w.addMachine('client',m);w.addInterface('client',4,[0,0,10],'a');
  const frame = new Int16Array(243);frame.set([1,4,0,0,90,0,0,10,1,3,9,1,2,7,27,0,0,0,0,123]);frame[25]=2;
  const offsets = [8,9,10,11,12,13,17,18,19,26];frame[offsets[field]!]! += 1;
  frame.forEach((v,i)=>m.poke(1337+i,v));m.poke(2143,1337);m.poke(2124,2066);m.poke(2142,1);
  m.poke(5225,2);[1,3,9].forEach((v,i)=>m.poke(5228+i,v));[1,2,7].forEach((v,i)=>m.poke(5231+i,v));m.poke(5236,123);m.poke(5239,972);
  w.runCycles(10000);
  expect(m.peek(2200)).toBe(0);expect(m.peek(5225)).toBe(2);expect(m.peek(2142)).toBe(1);
});

test('a silent native peer resolves its neighbour address but the echo probe times out', () => {
  const {w,c} = routed(27,[1,2,9],true);
  while(!c.sleep && w.cycles < 10_000_000) w.runCycles(6561);
  expect(c.peek(2200)).toBe(-141);expect(c.peek(5225)).toBe(3);
  expect(c.peek(2125)).toBe(0);expect(c.peek(REG_S)).toBe(5710);
});
test.each([2380,2125,2142,2290,2402,2423,2440])('an existing protocol owner at %i prevents a probe from overwriting its buffers', address => {
  const m = cpu(`${writes(2190,[1,2,9])}\nM A 2190 M B 27 C S probe_begin W 2200 A H 0sAAA Z`,[1,2,7]);
  const w = new World();w.addMachine('client',m);w.addInterface('client',4,[0,0,10],'a');
  m.poke(address,address === 2380 ? 4 : 1);
  const retained = Int16Array.from({length:243},(_,i)=>i-121);retained.forEach((v,i)=>m.poke(1580+i,v));
  w.runCycles(10000);
  expect(m.peek(2200)).toBe(-1);
  expect(Array.from({length:243},(_,i)=>m.peek(1580+i))).toEqual([...retained]);
});

test.each([-1,36,37,38,39,40,41,45,46,47,53,54])('ICMP error quotes must match the pending request (changed cell %i)', offset => {
  const m = cpu('M A 1337 C S frame_validate ife A Z C S probe_input else M A Z end W 2200 A H 0sAAA Z',[1,2,7]);
  const w = new World();w.addMachine('client',m);w.addInterface('client',4,[0,0,10],'a');
  const f = new Int16Array(243);
  f.set([1,4,0,0,90,0,0,10,1,2,9,1,2,7,27,0,0,0,0,123]);f[25]=3;f[26]=28;f[27]=1;
  f.set([1,4,0,0,10,0,0,90,1,2,7,1,3,9,27,0,0,0,0,123,0,0,0,0,0,1,0],28);
  if(offset >= 0) f[offset]! += 1;
  f.forEach((v,i)=>m.poke(1337+i,v));m.poke(2143,1337);m.poke(2124,2066);m.poke(2142,1);
  m.poke(5225,2);[1,3,9].forEach((v,i)=>m.poke(5228+i,v));[1,2,7].forEach((v,i)=>m.poke(5231+i,v));m.poke(5236,123);m.poke(5239,972);m.poke(5249,27);
  w.runCycles(10000);
  expect(m.peek(2200)).toBe(offset < 0 ? 1 : 0);
  expect(m.peek(2142)).toBe(offset < 0 ? 0 : 1);
  expect(m.peek(5225)).toBe(offset < 0 ? 3 : 2);
});
