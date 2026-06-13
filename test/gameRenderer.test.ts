import { describe, expect, test } from 'vitest';
import { Machine } from '../src/core/machine';
import {
  BG0_MAP_BASE,
  BG1_MAP_BASE,
  DISPLAY_CTRL,
  DISPLAY_GAME,
  OAM_ATTR_BASE,
  OAM_TILE_BASE,
  OAM_X_BASE,
  OAM_Y_BASE,
  PALETTE_BASE,
  PATTERN_BASE,
  REG_BACKDROP,
  REG_BG0_SCX,
  REG_HIDE_MASK,
  tribyteColorABGR,
} from '../src/core/display';
import { sampleGameFrame } from '../src/core/gameRenderer';
import { fromTribbles, TRYTE_MAX } from '../src/core/tryte';

// hide-mask value: trit i balanced-1 (raw 2 = non-zero) hides layer i.
// 1*3^8 + 1*3^7 + 1*3^6 = 9477 hides all three layers.
const HIDE_ALL = 9477;

// ---- helpers -----------------------------------------------------------------

function make(): Machine {
  const m = new Machine();
  m.poke(DISPLAY_CTRL, DISPLAY_GAME);
  return m;
}

function sample(m: Machine): Uint32Array {
  return sampleGameFrame(m.mem, (a) => m.peek(a));
}

function pixel(frame: Uint32Array, x: number, y: number): number {
  return frame[y * 162 + x]!;
}

/** Write a solid-color1 9×9 tile at slot tileNum. */
function writeSolidTile(m: Machine, tileNum: number): void {
  for (let row = 0; row < 9; row++) m.poke(PATTERN_BASE + tileNum * 9 + row, TRYTE_MAX);
}

/** Tilemap entry for (palIdx, tileNum) where tileNum is in -13..13. */
function tilemapEntry(palIdx: number, tileNum: number): number {
  return palIdx * 729 + tileNum;
}

/** Set one of a palette's two colours. palIdx -13..13, which 0=color0 1=color1. */
function setPaletteColor(m: Machine, palIdx: number, which: 0 | 1, color: number): void {
  m.poke(PALETTE_BASE + 2 * (palIdx + 13) + which, color);
}

/** Fill an entire 27×27 tilemap layer with the same entry. */
function fillTilemap(m: Machine, mapBase: number, entry: number): void {
  for (let i = 0; i < 27 * 27; i++) m.poke(mapBase + i, entry);
}

// ---- tests -------------------------------------------------------------------

describe('sampleGameFrame', () => {
  test('ground state shows backdrop — zeroed tiles are transparent', () => {
    // Default machine: all tiles zeroed (balanced-0 per trit = transparent),
    // all OAM sprites reference transparent tile 0, hide mask = 0 (all visible).
    // The entire frame should be the backdrop color.
    const m = make();
    const red = fromTribbles('ZAA');
    m.poke(REG_BACKDROP, red);
    const expected = tribyteColorABGR(red);
    const frame = sample(m);
    for (let i = 0; i < 162 * 162; i++) expect(frame[i]).toBe(expected);
  });

  test('hide mask suppresses all layers', () => {
    const m = make();
    const red = fromTribbles('ZAA');
    m.poke(REG_BACKDROP, red);
    writeSolidTile(m, 1);
    setPaletteColor(m, 0, 1, fromTribbles('AAZ'));
    fillTilemap(m, BG0_MAP_BASE, tilemapEntry(0, 1)); // would show blue without mask
    m.poke(REG_HIDE_MASK, HIDE_ALL);
    const frame = sample(m);
    const expected = tribyteColorABGR(red);
    for (let i = 0; i < 162 * 162; i++) expect(frame[i]).toBe(expected);
  });

  test('BG0 solid tile covers backdrop', () => {
    const m = make();
    m.poke(REG_BACKDROP, fromTribbles('ZAA')); // red — should not show through
    writeSolidTile(m, 1);
    setPaletteColor(m, 0, 1, fromTribbles('AAZ')); // pal 0 color1 = blue
    fillTilemap(m, BG0_MAP_BASE, tilemapEntry(0, 1));
    const expected = tribyteColorABGR(fromTribbles('AAZ'));
    const frame = sample(m);
    expect(pixel(frame, 0, 0)).toBe(expected);
    expect(pixel(frame, 80, 80)).toBe(expected);
    expect(pixel(frame, 161, 161)).toBe(expected);
  });

  test('BG1 renders on top of BG0', () => {
    const m = make();
    writeSolidTile(m, 1);
    writeSolidTile(m, 2);
    const blue = fromTribbles('AAZ');
    const red = fromTribbles('ZAA');
    setPaletteColor(m, 0, 1, blue); // tile 1 pal 0 color1 = blue (BG0)
    setPaletteColor(m, 1, 1, red);  // tile 2 pal 1 color1 = red  (BG1 brick)
    fillTilemap(m, BG0_MAP_BASE, tilemapEntry(0, 1)); // solid blue everywhere
    // BG1 map defaults to tile 0 (transparent) — place one red brick at cell (row=2, col=3)
    // Screen pixels: x = col*9 = 27..35, y = row*9 = 18..26
    m.poke(BG1_MAP_BASE + 2 * 27 + 3, tilemapEntry(1, 2));
    const frame = sample(m);
    expect(pixel(frame, 27, 18)).toBe(tribyteColorABGR(red)); // inside brick
    expect(pixel(frame, 35, 26)).toBe(tribyteColorABGR(red));
    expect(pixel(frame, 0, 0)).toBe(tribyteColorABGR(blue));   // outside brick → BG0
    expect(pixel(frame, 26, 17)).toBe(tribyteColorABGR(blue));
    expect(pixel(frame, 36, 18)).toBe(tribyteColorABGR(blue));
  });

  test('BG0 hide mask exposes backdrop', () => {
    const m = make();
    const red = fromTribbles('ZAA');
    m.poke(REG_BACKDROP, red);
    // 1*3^8 = 6561 sets trit 0 non-zero → hides BG0 only
    m.poke(REG_HIDE_MASK, 6561);
    writeSolidTile(m, 1);
    setPaletteColor(m, 0, 1, fromTribbles('AAZ')); // blue — hidden with BG0
    fillTilemap(m, BG0_MAP_BASE, tilemapEntry(0, 1));
    const frame = sample(m);
    expect(pixel(frame, 0, 0)).toBe(tribyteColorABGR(red));
    expect(pixel(frame, 80, 80)).toBe(tribyteColorABGR(red));
  });

  test('front sprite renders at correct screen position', () => {
    const m = make();
    const white = fromTribbles('ZZZ');
    writeSolidTile(m, 1);
    setPaletteColor(m, 0, 1, white);
    // Sprite 0: (x=10, y=20), tile 1 pal 0, attr 0 = 9×9 front priority
    m.poke(OAM_Y_BASE + 0, 20);
    m.poke(OAM_X_BASE + 0, 10);
    m.poke(OAM_TILE_BASE + 0, tilemapEntry(0, 1));
    m.poke(OAM_ATTR_BASE + 0, 0);
    // Other 80 sprites default to tile 0 (transparent) — no interference
    const frame = sample(m);
    const expected = tribyteColorABGR(white);
    for (let dy = 0; dy < 9; dy++)
      for (let dx = 0; dx < 9; dx++)
        expect(pixel(frame, 10 + dx, 20 + dy)).toBe(expected);
    expect(pixel(frame, 9, 20)).not.toBe(expected);   // one outside each edge
    expect(pixel(frame, 19, 20)).not.toBe(expected);
  });

  test('transparent sprite pixels pass through to layer below', () => {
    const m = make();
    const blue = fromTribbles('AAZ');
    m.poke(REG_BACKDROP, blue);
    // Sprite 0 at (0,0) references tile 0 (transparent, value 0 = all balanced-0).
    // All other sprites also default to tile 0. Backdrop should show through.
    m.poke(OAM_Y_BASE + 0, 0);
    m.poke(OAM_X_BASE + 0, 0);
    m.poke(OAM_TILE_BASE + 0, tilemapEntry(0, 0));
    m.poke(OAM_ATTR_BASE + 0, 0);
    const frame = sample(m);
    expect(pixel(frame, 0, 0)).toBe(tribyteColorABGR(blue));
    expect(pixel(frame, 8, 8)).toBe(tribyteColorABGR(blue));
  });

  test('BG0 scroll X shifts the tile viewport', () => {
    const m = make();
    writeSolidTile(m, 1);
    writeSolidTile(m, 2);
    setPaletteColor(m, 0, 1, fromTribbles('ZAA')); // tile 1 pal 0 = red  (col 0)
    setPaletteColor(m, 1, 1, fromTribbles('AAZ')); // tile 2 pal 1 = blue (col 1+)
    for (let row = 0; row < 27; row++) {
      m.poke(BG0_MAP_BASE + row * 27 + 0, tilemapEntry(0, 1));
      for (let col = 1; col < 27; col++)
        m.poke(BG0_MAP_BASE + row * 27 + col, tilemapEntry(1, 2));
    }
    // No scroll: pixel (0,0) is tile-col 0 → red
    expect(pixel(sample(m), 0, 0)).toBe(tribyteColorABGR(fromTribbles('ZAA')));
    // Scroll X by 9: tile-col 0 scrolls off left, pixel (0,0) is now tile-col 1 → blue
    m.poke(REG_BG0_SCX, 9);
    expect(pixel(sample(m), 0, 0)).toBe(tribyteColorABGR(fromTribbles('AAZ')));
  });
});
