import { DISPLAY_PX, PALETTE_BASE, tribyteColorABGR } from './display';

// Device character ROM: ASCII 32..126, five 5-bit rows per glyph. The sixth
// row and column are blank spacing. This fixed bitmap is independent of host
// fonts and contains no page parsing or browser behavior.
const rows = `
0000000000 0404040004 0a0a000000 0a1f0a1f0a 0f141e051e 1902040813 0c120d121d 0404000000
0204040402 0804040408 00150e1500 00041f0400 0000000408 00001f0000 0000000004 0102040810
0e1315190e 040c04040e 0e010e101f 1e0106011e 02060a1f02 1f101e011e 0e101e110e 1f01020408
0e110e110e 0e110f010e 0004000400 0004000408 0204080402 001f001f00 0804020408 0e11020404
0e1117150e 0e111f1111 1e111e111e 0f1010100f 1e1111111e 1f101e101f 1f101e1010 0f1013110f
11111f1111 0e0404040e 070202120c 1112141211 101010101f 111b151111 1119151311 0e1111110e
1e111e1010 0e1111150f 1e111e1211 0f100e011e 1f04040404 111111110e 1111110a04 1111151b11
110a040a11 110a040404 1f0204081f 0604040406 1008040201 0c0404040c 040a110000 000000001f
0804000000 000e01130f 101e11111e 000f10100f 010f11110f 000e1f100f 06080e0808 000f110f0e
101e111111 04000c040e 020002120c 1012141a11 0c0404040e 001a151515 001e111111 000e11110e
001e111e10 000e131301 0016101010 000f0c031e 080e080806 001111130d 0011110a04 001115150a
00110a0a11 00110f010e 001f02041f 06040c0406 0404040404 0c0406040c 000d160000
`.trim().split(/\s+/).map(glyph => Uint8Array.from(glyph.match(/../g)!, row => parseInt(row, 16)));

/** Render mode T from page 0 only; palette selectors use the signed high tribble. */
export function renderTextPixels(out: Uint32Array, mem: ArrayLike<number>, peek: (address: number) => number): void {
  const colors = new Uint32Array(54);
  for (let i = 0; i < colors.length; i++) colors[i] = tribyteColorABGR(peek(PALETTE_BASE + i));
  for (let cell = 0; cell < 729; cell++) {
    const value = mem[cell]!;
    const attribute = Math.floor((value + 364) / 729);
    const code = value - attribute * 729;
    const glyph = code >= 32 && code <= 126 ? rows[code - 32] : undefined;
    const palette = (attribute + 13) * 2;
    const background = colors[palette]!, foreground = colors[palette + 1]!;
    const x = (cell % 27) * 6, y = Math.floor(cell / 27) * 6;
    for (let gy = 0; gy < 6; gy++) {
      const bits = gy < 5 && glyph ? glyph[gy]! : 0;
      for (let gx = 0; gx < 6; gx++) {
        out[(y + gy) * DISPLAY_PX + x + gx] = gx < 5 && (bits & (16 >> gx)) !== 0 ? foreground : background;
      }
    }
  }
}
