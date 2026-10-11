import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {renderBitmapPixels} from '../src/core/display';
import {STRING_ART_CIRCLE} from '../src/world/software/stringArtCircle';
import {visualFixture} from './visualCanvasFixture';
const points=Array.from({length:72},(_,i)=>[81+Math.round(57*Math.cos(i*Math.PI/36)),81+Math.round(57*Math.sin(i*Math.PI/36))]);
function reference(factor:number,shift:number){
  const field=new Int8Array(162*126);
  const pixel=(x:number,y:number,ink:number)=>{field[(y-18)*162+x]=ink;};
  for(let i=0;i<72;i++){
    let [x,y]=points[i]!;const [tx,ty]=points[(i*factor+shift)%72]!;
    const dx=Math.abs(tx!-x!),dy=-Math.abs(ty!-y!),sx=x!<tx!?1:-1,sy=y!<ty!?1:-1;let error=dx+dy;
    for(;;){pixel(x!,y!,i%2?1:-1);if(x===tx&&y===ty)break;const twice=2*error;if(twice>=dy){error+=dy;x!+=sx;}if(twice<=dx){error+=dx;y!+=sy;}}
  }
  for(const[x,y]of points)pixel(x!,y!,1);
  return Array.from(field);
}
function nativePixels(f:ReturnType<typeof visualFixture>){return Array.from({length:162*126},(_,i)=>{let value=f.m.peek(-9517+Math.floor(i/9));for(let j=0;j<8-i%9;j++)value=Math.round(value/3);const r=((value%3)+3)%3;return r===2?-1:r;});}
test('native multiplication chords match every independent Bresenham pixel across factors and shifts',()=>{
  const f=visualFixture(STRING_ART_CIRCLE,4_000_000);
  for(const[factor,shift]of [[2,0],[3,17],[5,71],[11,36],[23,5],[24,70]]){
    f.m.poke(2700,factor!);f.m.poke(2701,(shift!+71)%72);f.type('n');
    expect(f.m.peek(2701)).toBe(shift);expect(nativePixels(f)).toEqual(reference(factor!,shift!));
    const pixels=new Uint32Array(162*162);renderBitmapPixels(pixels,f.m.mem,a=>f.m.peek(a));
    const bytes=Buffer.alloc(pixels.length*3);pixels.forEach((v,i)=>{bytes[i*3]=v&255;bytes[i*3+1]=(v>>>8)&255;bytes[i*3+2]=(v>>>16)&255;});
    writeFileSync(`/tmp/string-art-${factor}.ppm`,Buffer.concat([Buffer.from('P6\n162 162\n255\n'),bytes]));
  }
},60_000);
test('keyboard bounds, reverse wrap, complete help restoration and exit',()=>{
  const f=visualFixture(STRING_ART_CIRCLE,4_000_000),code=f.built.image.image.chunks.map(c=>f.read(c.addr,c.data.length));
  f.key(89);expect(f.m.peek(2701)).toBe(71);f.type('n');expect(f.m.peek(2701)).toBe(0);
  f.key(88);f.type('n');expect(f.read(2700,3)).toEqual([2,71,-1]);
  f.key(83);f.key(83);expect(f.m.peek(2700)).toBe(1);
  f.m.poke(2700,24);f.key(84);expect(f.m.peek(2700)).toBe(24);
  f.key(81);const pixels=f.read(-9841,2916),state=f.read(2700,3);
  f.type('h');f.type('h');expect(f.read(-9841,2916)).toEqual(pixels);expect(f.read(2700,3)).toEqual(state);
  expect(f.built.image.image.chunks.map(c=>f.read(c.addr,c.data.length))).toEqual(code);
  f.type('g');f.m.run(800_000);expect(f.m.peek(2603)).toBeGreaterThan(2);f.type(' ');expect(f.m.peek(2606)).toBe(0);
  f.type('r');expect(f.read(2700,3)).toEqual([2,0,1]);f.keyboard.queueTrytes([91]);f.m.run(200_000);expect(f.m.peek(2504)).toBe(11);
},60_000);
