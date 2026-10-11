import {expect,test} from 'vitest';
import type {TextSoftware} from '../src/world/software/native';
import {visualFixture} from './visualCanvasFixture';
import {Machine,REG_P} from '../src/core/machine';
import {renderTextPixels} from '../src/core/textDisplay';
import {PALETTE_BASE,tribyteColorABGR,DISPLAY_TEXT} from '../src/core/display';
import {TEXT_KEYS} from '../src/core/textKeyboard';
const app:TextSoftware={number:445,id:'visual-fixture',site:'gallery',title:'Visual Test',kind:'text',bitmapVram:true,uiModule:'visualCanvasUi',inputs:['Keyboard'],outputs:['Bitmap'],description:'Framework fixture, not a published application.',examples:[],algorithm:`
canvas_init: W 2700 Z W 2701 Z W 2702 Z O S P
canvas_step: R E 2700 I E 1 W 2700 E O S P
canvas_key: W 2701 A ife A 112 W 2702 1 R A 3000 R B 3001 R C 3002 J vc_pixel end O S P
canvas_draw: R E 2702 N E Z O S P R E 2611 ifn E Z C S vc_clear end M A Z M B 18 M C 161 M D 143 M E 1 C S vc_line M A 161 M B 18 M C Z M D 143 M E -1 C S vc_line O S P
canvas_help: M A Z M B 24 M C @help M D 1 J vc_text
help: 72 69 76 80 0
`};
test('shared native bitmap canvas draws, dispatches, preserves state through help and restores palette on exit',()=>{const f=visualFixture(app);expect(f.read(-9517,2268).some(Boolean)).toBe(true);f.type('n');expect(f.m.peek(2700)).toBe(1);f.type('g');expect(f.m.peek(2606)).toBe(1);f.key(TEXT_KEYS.left);expect(f.m.peek(2606)).toBe(1);f.type(' ');expect(f.m.peek(2606)).toBe(0);expect(f.m.peek(2701)).toBe(TEXT_KEYS.left);const before=f.read(-9517,2268);f.type('h');expect(f.m.peek(2602)).toBe(1);f.type('n');expect(f.m.peek(2700)).toBe(1);f.type('h');expect(f.read(-9517,2268)).toEqual(before);f.key(TEXT_KEYS.next);expect(f.m.peek(2612)).toBe(1);f.type('r');expect(f.m.peek(2700)).toBe(0);f.keyboard.queueTrytes([TEXT_KEYS.home]);f.m.run(200_000);expect(f.m.peek(2504)).toBe(11);expect(f.m.peek(0)).toBe(DISPLAY_TEXT);expect([47,49,50].map(a=>f.m.peek(a))).toEqual([0,0,0]);expect(f.m.stackHighWater).toBeLessThan(243);},30_000);

test('bitmap plot clips to pane, replaces ternary digits exactly and cannot overwrite adjacent native code',()=>{const f=visualFixture(app);const code=f.built.image.image.chunks.flatMap(c=>Array.from(c.data,(v,i)=>[c.addr+i,v] as const));const expected=f.read(-9841,2916);for(const[x,y,ink]of[[0,18,1],[8,18,-1],[9,18,1],[161,143,-1],[0,18,0],[-1,18,1],[162,18,1],[20,17,1],[20,144,1],[20,24,2],[20,24,-2]]){f.m.poke(3000,x!);f.m.poke(3001,y!);f.m.poke(3002,ink!);f.type('p');if(x!>=0&&x!<162&&y!>=18&&y!<=143&&ink!>=-1&&ink!<=1){const offset=y!*18+Math.floor(x!/9),power=3**(8-x!%9);let n=expected[offset]!;const digit=((Math.round(n/power)+1)%3+3)%3-1;expected[offset]=n+(ink!-digit)*power;} expect(f.read(-9841,2916)).toEqual(expected);
for(const[a,v]of code)expect(f.m.peek(a),'code '+a).toBe(v);}expect(f.m.peek(-6926)).toBe(expected[2915]);},30_000);

test('visual bitmap glyphs match refined terminal ROM, with bounded text origins and right edge',()=>{const f=visualFixture(app),m=f.m,terminal=new Machine(),pixels=new Uint32Array(162*162);terminal.poke(PALETTE_BASE+27,9841);const foreground=tribyteColorABGR(9841);const call=(x:number,y:number)=>{m.poke(-13,x);m.poke(-12,y);m.poke(-11,3000);m.poke(-10,1);m.poke(6,5708);m.poke(5708,1234);m.poke(REG_P,f.built.image.image.labels.get('vc_text')!);expect(m.run(100_000,new Set([1234]))).toBe('breakpoint');};for(let code=32;code<=90;code++){for(let i=0;i<2916;i++)m.poke(-9841+i,0);m.poke(3000,code);m.poke(3001,0);call(0,0);terminal.poke(-9841,code);renderTextPixels(pixels,terminal.mem,a=>terminal.peek(a));for(let y=0;y<6;y++)for(let x=0;x<6;x++){const nativeInk=Math.floor(m.peek(-9841+y*18)/3**(8-x))%3!==0;expect(nativeInk,`ASCII ${code}, ${x},${y}`).toBe(pixels[y*162+x]===foreground);}}const before=f.read(-9841,2916);for(const[x,y]of[[-1,0],[157,0],[0,-1],[0,158]]){call(x!,y!);expect(f.read(-9841,2916)).toEqual(before);}m.poke(3000,65);m.poke(3001,66);m.poke(3002,0);const codeGuard=f.read(-6925,27);call(156,157);expect(f.read(-6925,27)).toEqual(codeGuard);},30_000);
