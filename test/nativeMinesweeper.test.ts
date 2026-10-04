import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { MINESWEEPER_SOFTWARE } from '../src/world/software/minesweeper';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { starterScreen } from '../src/world/starter';
import { settleSoftwareUi } from './softwareUiDriver';
import { minesweeperReference } from './minesweeperReference';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const built=buildNativeSoftware(core,source,MINESWEEPER_SOFTWARE);
function guest() {
  const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
  for(const image of [core.image,built.image])for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  m.poke(REG_P,built.image.image.labels.get('app_entry')!);
  const guards=[2899,2936,3099,3136,3199,3213];for(const a of guards)m.poke(a,713);
  const k=new TextDevice();m.attach(k);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
  const settle=()=>settleSoftwareUi(m,k,built.image.image.labels.get('app_key')!);
  const board=()=>String.fromCharCode(...Array.from({length:36},(_,i)=>m.peek(2900+i)));
  const ref=minesweeperReference();
  function action(square:number,flag=false) {
    const current=m.peek(2630),dr=Math.floor(square/6)-Math.floor(current/6),dc=square%6-current%6;
    k.queueTrytes([...Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down),...Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right)]);
    if(flag){k.queueText('n');ref.flag(square);}else{k.queueTrytes([TEXT_KEYS.activate]);ref.play(square);}settle();
    expect(board()).toBe(ref.board);expect(m.peek(2631)).toBe(ref.moves);expect(m.peek(2632)).toBe(ref.status);
    for(const a of guards)expect(m.peek(a),String(a)).toBe(713);
    expect(m.peek(3202)).toBeLessThanOrEqual(30);expect(m.stackHighWater).toBeLessThan(243);
  }
  settle();return {m,k,settle,board,action};
}
test('native Minesweeper flood fill preserves flags and wins only after every safe cell opens',()=>{
  const g=guest();expect(starterScreen(g.m)).toContain('N:flag');
  g.action(6,true);g.action(2,true);g.action(2);g.action(0);
  expect(g.board()[6]).toBe('F');expect(g.m.peek(2631)).toBe(1);
  for(let i=0;i<36;i++)if(![2,9,16,24,29,34,6].includes(i))g.action(i);
  expect(g.m.peek(2632)).toBe(0);expect(g.m.peek(3200)).toBe(29);
  g.action(6,true);g.action(6);expect(g.m.peek(2632)).toBe(1);expect(g.m.peek(3200)).toBe(30);
  expect(starterScreen(g.m)).toContain('All 30 safe squares open!');
  const won=g.board();g.action(2,true);g.action(2);expect(g.board()).toBe(won);
  g.k.queueText('r');g.settle();expect(g.board()).toBe('.'.repeat(36));expect(g.m.peek(3200)).toBe(0);
});
test('native Minesweeper exposes every mine on loss and ignores subsequent flag/open attempts',()=>{
  const g=guest();g.action(0);g.action(9);expect(g.m.peek(2632)).toBe(2);expect(g.board().split('*')).toHaveLength(7);
  expect(starterScreen(g.m)).toContain('Mine! R starts again');g.action(35,true);g.action(35);
});
test('native Minesweeper reveals the same safe solution in ascending and descending order',()=>{
  for(const order of [Array.from({length:36},(_,i)=>i),Array.from({length:36},(_,i)=>35-i)]) {
    const g=guest();for(const i of order)if(![2,9,16,24,29,34].includes(i))g.action(i);
    expect(g.m.peek(2632)).toBe(1);expect(g.m.peek(3200)).toBe(30);
  }
});
test('custom board control hints reject oversized and nonprintable labels',()=>{
  for(const controls of ['', 'x'.repeat(28), 'bad\nlabel'])expect(()=>buildNativeSoftware(core,source,{...MINESWEEPER_SOFTWARE,controls})).toThrow('Invalid board controls');
});
