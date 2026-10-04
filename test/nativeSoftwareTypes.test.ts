import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { buildVirtualHostFirmware } from '../src/world/virtualHostImage';
import { FirmwareProbe } from './firmwareProbe';

const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const hosts=Array.from({length:20},(_,i)=>({name:`site-${i}.world`,directory:`s${String(i).padStart(2,'0')}`}));
function fixture(paths:string[]) {
  const image=buildVirtualHostFirmware(source,hosts,100,paths);
  const m=new FirmwareProbe(['mmio','native.stack']);
  for(const chunk of image.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  const classify=(path:string)=>{
    const input=encodeText(path);input.forEach((v,i)=>m.poke(4010+i,v));
    m.poke(-13,4010);m.poke(-12,input.length);m.poke(REG_S,5709);m.poke(5709,image.image.labels.get('failed')!);
    m.sleep=null;m.poke(REG_P,image.image.labels.get('http_file_type')!);
    const start=m.cycles;expect(m.run(4000,new Set([image.image.labels.get('failed')!])),path).toBe('breakpoint');
    expect(m.peek(REG_S)).toBe(5710);
    expect(input.map((_,i)=>m.peek(4010+i))).toEqual(input);
    return {type:m.peek(-13),cycles:m.cycles-start};
  };
  return {image,m,classify};
}

test('native compact allowlist matches all four-digit paths exactly, including sparse high indices',()=>{
  const paths=[...Array.from({length:9},(_,i)=>`/p000${i}`),'/p0000','/c0001','/p0009','/c0010','/p0017','/p0080','/p0081','/c0984','/c0985','/p9840','/c9840','/raw','/p9841','/c9999','/p01234','/cfoo'];
  const allowed=new Set(paths),f=fixture(paths);
  expect(f.image.reserved).toBeLessThanOrEqual(12501);
  expect(f.m.peek(f.image.image.labels.get('software_p_bits')!)).toBe(9841);
  let slowest=0;
  for(let n=0;n<10000;n++)for(const prefix of ['p','c']) {
    const path=`/${prefix}${String(n).padStart(4,'0')}`,result=f.classify(path);
    expect(result.type,path).toBe(allowed.has(path)?1:2);slowest=Math.max(slowest,result.cycles);
  }
  for(const path of ['/raw','/p01234','/cfoo','/p000','/p00000','/P0000','/c00a1','p0000','/p0000/','/p+001','/p-001','/c0000','/index',''])expect(f.classify(path).type,path).toBe(allowed.has(path)?1:2);
  expect(slowest).toBeLessThan(1500);
  expect(f.m.stackHighWater).toBeLessThan(243);
},60_000);

test('two thousand software routes fit a compact immutable index and bounded native lookup',()=>{
  // This is a classifier capacity fixture, not 1000 claimed applications.
  const paths=Array.from({length:1000},(_,i)=>['p','c'].map(prefix=>`/${prefix}${String(i).padStart(4,'0')}`)).flat();
  const f=fixture(paths),bare=buildVirtualHostFirmware(source,hosts,100);
  expect(f.image.reserved-bare.reserved).toBeLessThan(600);
  expect(f.image.reserved).toBeLessThanOrEqual(12501);
  for(const path of paths)expect(f.classify(path).type,path).toBe(1);
  for(const path of ['/p1000','/c1000','/p9840','/raw','/s0999'])expect(f.classify(path).type,path).toBe(2);
  console.info('1000 binary/source pairs:',f.image.reserved-bare.reserved,'additional resident cells');
},60_000);

test('empty bitmaps and literal-only policies preserve existing type behavior',()=>{
  for(const paths of [[],['/raw'],['/c0000'],['/p0000']]) {
    const f=fixture(paths);
    for(const path of ['/raw','/p0000','/c0000','/index'])expect(f.classify(path).type).toBe(paths.includes(path)?1:2);
  }
});
