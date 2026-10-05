import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { ENGINEERING_WORKSHOP as TEXT_SOFTWARE } from '../src/world/software/engineeringWorkshop';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { WEB_SITES } from '../src/world/catalog';
import { starterScreen } from '../src/world/starter';
import { engineeringWorkshopVectors as textSoftwareVectors, engineeringWorkshopReference, cubicRootCounts } from './engineeringWorkshopReference';
import { settleSoftwareUi } from './softwareUiDriver';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
const core = buildProgramCore(source, {name:'menu',source:source('programMenu')});

for (const app of TEXT_SOFTWARE) {
  const vectors = textSoftwareVectors(app);
  // Bound wall-clock work per test as the native input corpus grows. Each
  // individual run retains its existing guest cycle and memory checks.
  for (let offset = 0; offset < vectors.length; offset += 32) test(`${app.id} processes text through native keyboard input ${offset + 1}..${Math.min(offset + 32, vectors.length)}`, () => {
  expect(WEB_SITES.some(site => site.slug === app.site)).toBe(true);
  const built = buildNativeSoftware(core, source, app);
  expect(core.image.reserved + built.image.reserved).toBeLessThanOrEqual(9666);
  for (const example of vectors.slice(offset, offset + 32)) {
    const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
    for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i) => m.poke(chunk.addr+i,v));
    m.poke(REG_P,built.image.image.labels.get('app_entry')!);
    const keyLoop = built.image.image.labels.get('app_key')!;
    const arenaGuards = [3990,4000,4009];
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



test('engineering vectors ignore unrelated apps and preserve own example prefix',()=>{
 for(const app of TEXT_SOFTWARE){expect(textSoftwareVectors({...app,id:'unrelated'})).toEqual([]);expect(textSoftwareVectors(app).slice(0,app.examples.length)).toEqual(app.examples);}
});

test('engineering metadata fits the native page and text geometry',()=>{
 for(const app of TEXT_SOFTWARE){expect(app.id.length).toBeLessThanOrEqual(16);expect(app.title.length).toBeLessThanOrEqual(27);for(const label of app.inputs)expect(label.length).toBeLessThanOrEqual(16);for(const label of app.outputs)expect(label.length).toBeLessThanOrEqual(27);for(const example of textSoftwareVectors(app)){if(example.output!==undefined){expect(example.output.length).toBeLessThanOrEqual(162);expect(example.output).toMatch(/^[ -~]*$/);}}}
});

test('engineering worked examples agree with independent references',()=>{
 for(const app of TEXT_SOFTWARE)for(const example of app.examples){const result=engineeringWorkshopReference(app.id,example.input);expect(result,`${app.id}: ${example.input}`).toBe(example.error?undefined:example.output);}
});


// Audit the entire cubic domain with an independent complex-root oracle.
test('every allowed cubic classification agrees with Cardano root real parts',()=>{
 for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(let c=-9;c<=9;c++)for(let d=-9;d<=9;d++){
  const actual=cubicRootCounts([a,b,c,d]),delta=b*c-a*d;
  const axis=d===0?(c===0?2:1):delta===0&&d>0?2:0;
  const right=d<0?1:d===0?(c<0?1:0):delta<0?2:0;
  expect(actual,`${a} ${b} ${c} ${d}`).toEqual({right,axis,left:3-right-axis});
 }
});

test('section pair terms satisfy the native moment arithmetic bound',()=>{
 const rectangles:number[][]=[];for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let w=1;w<=2;w++)for(let h=1;h<=2;h++)rectangles.push([x,y,w,h]);
 let maximum=0;for(const a of rectangles)for(const b of rectangles){const area=a[2]!*a[3]!*b[2]!*b[3]!;for(const axis of[0,1])maximum=Math.max(maximum,area*(2*a[axis]!+a[axis+2]!-2*b[axis]!-b[axis+2]!)**2);}
 expect(maximum).toBe(1024);expect(12*48+3*3*maximum).toBeLessThanOrEqual(9841);
});
