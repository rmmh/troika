import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { REVERSI_SOFTWARE } from '../src/world/software/reversi';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { starterScreen } from '../src/world/starter';
import { settleSoftwareUi } from './softwareUiDriver';
import { reversiReference } from './reversiReference';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
const built=buildNativeSoftware(core,source,REVERSI_SOFTWARE);
function guest() {
  const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
  for(const image of [core.image,built.image]) for(const chunk of image.image.chunks) chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  m.poke(REG_P,built.image.image.labels.get('app_entry')!);
  for(const a of [2899,2964,3199,3211,3299,3318]) m.poke(a,713);
  const k=new TextDevice();m.attach(k);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
  const settle=()=>settleSoftwareUi(m,k,built.image.image.labels.get('app_key')!);
  const board=()=>String.fromCharCode(...Array.from({length:64},(_,i)=>m.peek(2900+i)));
  function play(square:number) {
    const current=m.peek(2630),dr=Math.floor(square/8)-Math.floor(current/8),dc=square%8-current%8;
    k.queueTrytes([...Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down),...Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right),TEXT_KEYS.activate]);settle();
    for(const a of [2899,2964,3199,3211,3299,3318]) expect(m.peek(a),String(a)).toBe(713);
    expect(m.stackHighWater).toBeLessThan(243);
  }
  settle();return {m,k,board,play,settle};
}
// Select deterministic complete games covering both winners, a draw and a pass.
const fixtures=new Map<string,number[]>();
for(let seed=1;seed<=256&&fixtures.size<4;seed++) {
  const ref=reversiReference(),moves:number[]=[];let random=seed;
  while(!ref.status && moves.length<60) {random=random*48271%2147483647;const legal=ref.legal;const square=legal[random%legal.length]!;moves.push(square);ref.play(square);}
  if(!ref.status) throw new Error('Reversi reference did not finish within 60 moves');
  const outcome=['','X wins','O wins','draw'][ref.status]!;
  if(!fixtures.has(outcome)) fixtures.set(outcome,moves);
  if(ref.passes&&!fixtures.has('automatic pass')) fixtures.set('automatic pass',moves);
}
test('complete-game fixtures include both winners, draw and forced pass',()=>expect(fixtures.size).toBe(4));
for(const [name,moves] of fixtures) test(`native Reversi complete game: ${name}`,()=>{
  const g=guest(),ref=reversiReference();let priorPasses=0;
  for(const square of moves) {
    g.play(square);ref.play(square);
    expect(g.board()).toBe(ref.board);expect(g.m.peek(2631)).toBe(ref.moves);expect(g.m.peek(2632)).toBe(ref.status);
    if(!ref.status) expect(g.m.peek(3200)).toBe(ref.player.charCodeAt(0));
    if(ref.passes>priorPasses) {expect(starterScreen(g.m)).toContain('passes');priorPasses=ref.passes;}
  }
  const score=(c:string)=>String([...ref.board].filter(v=>v===c).length).padStart(2,'0');
  expect(starterScreen(g.m)).toContain(`X=${score('X')} O=${score('O')}`);
  expect(starterScreen(g.m)).toContain(ref.status===3?'Draw':ref.status===1?'X wins':'O wins');
  g.play(0);expect(g.board()).toBe(ref.board);expect(g.m.peek(2631)).toBe(ref.moves);
  g.k.queueText('r');g.settle();expect(g.board()).toBe(reversiReference().board);expect(g.m.peek(2632)).toBe(0);
});
test('native Reversi captures all eight rays and finishes with vacant squares',()=>{
  const g=guest();for(let i=0;i<64;i++)g.m.poke(2900+i,46);
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){g.m.poke(2900+(3+dr)*8+3+dc,79);g.m.poke(2900+(3+2*dr)*8+3+2*dc,88);}
  g.play(27);expect([...g.board()].filter(c=>c==='X')).toHaveLength(17);expect(g.board()).not.toContain('O');
  expect(g.m.peek(2632)).toBe(1);expect(starterScreen(g.m)).toContain('X=17 O=00');
});
