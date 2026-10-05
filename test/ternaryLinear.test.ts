import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { TERNARY_LINEAR as TEXT_SOFTWARE } from '../src/world/software/ternaryLinear';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { ternaryLinearVectors as textSoftwareVectors } from './ternaryLinearReference';
import { settleSoftwareUi } from './softwareUiDriver';
import {reduceTernaryMatrix,ternaryRecurrenceDetails} from './ternaryLinearReference';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name:'menu',source:source('programMenu')});

for (const app of TEXT_SOFTWARE) {
  const vectors = textSoftwareVectors(app);
  // Bound wall-clock work per test as the native input corpus grows. Each
  // individual run retains its existing guest cycle and memory checks.
  for (let offset = 0; offset < vectors.length; offset += 128) test(`${app.id} processes text through native keyboard input ${offset + 1}..${Math.min(offset + 128, vectors.length)}`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  for (const example of vectors.slice(offset, offset + 128)) {
    const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
    for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i) => m.poke(chunk.addr+i,v));
    m.poke(REG_P,built.image.image.labels.get('app_entry')!);
    const keyLoop = built.image.image.labels.get('app_key')!;
    const arenaGuards = app.id === 'ternary-matrix' ? [2999,3020,3029,3034,3049,3055,3079,3085] : [2999,3030,3039,3065,3079,3105,3119,3145,3159,3167];
    for(const address of arenaGuards) m.poke(address,919);
    for (let address = 2862; address < 2900; address++) m.poke(address,733);
    const keyboard = new TextDevice(); m.attach(keyboard); m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
    settleSoftwareUi(m,keyboard,keyLoop,8_000_000); keyboard.queueText(example.input); keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,8_000_000);
    expect(m.peek(2533)).toBe(app.number); expect(m.peek(2514)).toBe(1);
    expect(starterScreen(m)).toContain(app.inputs[0]+' (max 54)');
    expect(starterScreen(m)).toContain(app.outputs[0]!);
    expect(m.peek(2621),example.input).toBe(example.error ? -1 : 0);
    expect(m.peek(2620)).toBeLessThanOrEqual(162);
    expect(Array.from({length:38},(_,i)=>m.peek(2862+i))).toEqual(Array(38).fill(733));
    expect(String.fromCharCode(...Array.from({length:m.peek(2610)},(_,i)=>m.peek(2552+i)))).toBe(example.input);
    if (example.output !== undefined) {
      expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i))),example.input).toBe(example.output);
      expect(starterScreen(m)).toContain(app.title);
    }
    keyboard.queueTrytes([TEXT_KEYS.activate]); settleSoftwareUi(m,keyboard,keyLoop,8_000_000);
    expect(m.peek(2621)).toBe(example.error ? -1 : 0);
    if (example.output !== undefined) expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
    for(const address of arenaGuards) expect(m.peek(address),`arena guard ${address}`).toBe(919);
    keyboard.queueTrytes([TEXT_KEYS.home]); m.run(100_000); expect(m.peek(2504)).toBe(11);
    expect(m.stackHighWater).toBeLessThan(243);
  }
});
}



test('ternary linear vector helper ignores unrelated app identities and keeps own examples first',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'not-a-ternary-linear-tool'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('row reduction preserves row spaces and its basis spans every brute-force kernel',()=>{
 const vectors=(n:number)=>Array.from({length:3**n},(_,code)=>Array.from({length:n},(_,i)=>Math.floor(code/3**i)%3));
 const span=(rows:number[][],width:number)=>new Set(vectors(rows.length).map(coeff=>Array.from({length:width},(_,j)=>coeff.reduce((s,c,i)=>s+c*rows[i]![j]!,0)%3).join('')));
 for(let code=0;code<729;code++){
  const digits=code.toString(3).padStart(6,'0'),matrix=[[...digits.slice(0,3)].map(Number),[...digits.slice(3)].map(Number)];
  const reduced=reduceTernaryMatrix(matrix),kernel=new Set(vectors(3).filter(v=>matrix.every(r=>r.reduce((s,c,j)=>s+c*v[j]!,0)%3===0)).map(v=>v.join('')));
  expect(span(reduced.basis,3)).toEqual(kernel);expect(span(matrix,3)).toEqual(span(reduced.a,3));
  expect(kernel.size).toBe(3**(3-reduced.rank));
 }
});

test('recurrence order is minimal by exhaustive coefficient search for every prefix through length six',()=>{
 for(let length=1;length<=6;length++)for(let code=0;code<3**length;code++){
  const input=code.toString(3).padStart(length,'0'),sequence=[...input].map(Number),result=ternaryRecurrenceDetails(input);
  let minimum=length;
  outer:for(let order=0;order<=length;order++)for(let rule=0;rule<3**order;rule++){
   const c=Array.from({length:order},(_,i)=>Math.floor(rule/3**i)%3);
   if(sequence.slice(order).every((x,i)=>(x+c.reduce((s,v,j)=>s+v*sequence[i+order-j-1]!,0))%3===0)){minimum=order;break outer;}
  }
  expect(result.order,input).toBe(minimum);
  for(let n=result.order;n<length;n++)expect(result.coefficients.reduce((s,c,j)=>s+c*sequence[n-j]!,0)%3,input).toBe(0);
 }
});
