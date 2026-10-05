import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { FINITE_ALGEBRA as TEXT_SOFTWARE } from '../src/world/software/finiteAlgebra';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { finiteAlgebraVectors as textSoftwareVectors } from './finiteAlgebraReference';
import { settleSoftwareUi } from './softwareUiDriver';
import {ternaryFactorsReference,multiplyTernaryPolynomials} from './finiteAlgebraReference';

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
    const arenaGuards = app.id === 'group-table' ? [2999,3036,3049,3056,3069,3076,3089,3097] : [2999,2908,2919,2928,2939,2948,2979,2988,3049,3057,3089,3098,3099,3108];
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



test('finite algebra vector helper ignores unrelated app identities and keeps own examples first',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'not-an-algebra-tool'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('multiplication sieve reconstructs every monic polynomial through degree seven',()=>{
 const irreducibles=Array<number>(8).fill(0);
 for(let degree=1;degree<=7;degree++)for(let tail=0;tail<3**degree;tail++){
  const input='1'+tail.toString(3).padStart(degree,'0');
  const factors=ternaryFactorsReference(input)!.slice(54,81).trim().split('*');
  expect(factors.reduce(multiplyTernaryPolynomials,'1')).toBe(input);
  if(factors.length===1)irreducibles[degree]=irreducibles[degree]!+1;
 }
 // Counts from (1/n) sum_{d|n} mu(d) 3^(n/d), independently of the sieve.
 expect(irreducibles.slice(1)).toEqual([3,3,8,18,48,116,312]);
});
