// Game-mode compositor: renders a 162x162 pixel frame from VRAM tile/sprite data.
// Called from the web UI after each emulator update when game mode is active.

import {
  BG0_MAP_BASE,
  BG1_MAP_BASE,
  OAM_ATTR_BASE,
  OAM_TILE_BASE,
  OAM_X_BASE,
  OAM_Y_BASE,
  PALETTE_BASE,
  PATTERN_BASE,
  REG_BACKDROP,
  REG_BG0_SCX,
  REG_BG0_SCY,
  REG_BG1_SCX,
  REG_BG1_SCY,
  REG_HIDE_MASK,
  tribyteColorABGR,
} from './display';
import { norm, tribblesOf, TRYTE_MAX, tritsRaw } from './tryte';

const GAME_W = 162;
const GAME_H = 162;
const MAP_SIZE = 243; // virtual canvas: 243x243 pixels (27x27 tiles × 9px each)
const TILE_PX = 9;
const SPRITES = 81;
const MAX_SPRITES_PER_LINE = 9;

/** Read one tile pixel (column px 0..8 of the given tile row tryte). Returns -1=transparent, 0=color0, 1=color1. */
function tilePixel(rowTryte: number, px: number): number {
  // Spec: balanced T(raw 0)→color0, balanced 0(raw 1)→transparent, balanced 1(raw 2)→color1
  // Zeroed memory (raw 1 everywhere) is therefore all-transparent (ground state).
  return ([0, -1, 1] as const)[tritsRaw(rowTryte)[px]!]!;
}

/** Decode a tilemap entry: returns [paletteIdx (-13..13), tileIdx]. */
function decodeTilemapEntry(entry: number): [number, number] {
  const [hi, mid, lo] = tribblesOf(entry);
  const tileIdx = norm(mid * 27 + lo);
  return [hi, tileIdx];
}

/** Look up a palette colour (0 or 1) as an ABGR uint32. */
function paletteColor(mem: Int16Array, palIdx: number, which: 0 | 1): number {
  const base = PALETTE_BASE + TRYTE_MAX;
  const palOff = 2 * (palIdx + 13); // palIdx -13..13 → 0..52
  return tribyteColorABGR(mem[base + palOff + which]!);
}

/** Sample one BG layer pixel at virtual (vy, vx). Returns ABGR or -1 if transparent. */
function sampleBG(mem: Int16Array, mapBase: number, vx: number, vy: number): number {
  const tileRow = Math.floor(vy / TILE_PX);
  const tileCol = Math.floor(vx / TILE_PX);
  const entry = mem[mapBase + TRYTE_MAX + tileRow * 27 + tileCol]!;
  const [palIdx, tileIdx] = decodeTilemapEntry(entry);
  if (tileIdx < -243 || tileIdx > 242) return -1; // out-of-range → transparent
  const patternAddr = PATTERN_BASE + TRYTE_MAX + tileIdx * TILE_PX;
  const rowWithinTile = vy % TILE_PX;
  const colWithinTile = vx % TILE_PX;
  const rowTryte = mem[patternAddr + rowWithinTile]!;
  const p = tilePixel(rowTryte, colWithinTile);
  if (p < 0) return -1; // transparent
  return paletteColor(mem, palIdx, p as 0 | 1);
}

interface SpriteInfo {
  x: number;
  y: number;
  tileIdx: number;
  palIdx: number;
  flipH: boolean;
  flipV: boolean;
  priority: number; // balanced: 0=front, 1=behind opaque BG, T=-1=hidden
  w: number; // pixel width
  h: number; // pixel height
}

function collectSprites(mem: Int16Array): SpriteInfo[] {
  const sprites: SpriteInfo[] = [];
  const oamY = OAM_Y_BASE + TRYTE_MAX;
  const oamX = OAM_X_BASE + TRYTE_MAX;
  const oamTile = OAM_TILE_BASE + TRYTE_MAX;
  const oamAttr = OAM_ATTR_BASE + TRYTE_MAX;
  for (let i = 0; i < SPRITES; i++) {
    const attr = mem[oamAttr + i]!;
    const attrTrits = tritsRaw(attr);
    const priorityRaw = attrTrits[2]! - 1; // balanced: T=-1(hidden), 0=front, 1=behind
    if (priorityRaw === -1) continue; // hidden
    const sizeRaw = attrTrits[3]! - 1; // balanced: T=-1 → 9×18tall, 0→9×9, 1→18×18
    const w = sizeRaw === 1 ? 18 : 9;
    const h = sizeRaw === -1 ? 18 : sizeRaw === 1 ? 18 : 9;
    const tileEntry = mem[oamTile + i]!;
    const [palIdx, tileIdx] = decodeTilemapEntry(tileEntry);
    sprites.push({
      x: mem[oamX + i]!,
      y: mem[oamY + i]!,
      tileIdx,
      palIdx,
      flipH: attrTrits[0]! === 2, // balanced 1 → flipH
      flipV: attrTrits[1]! === 2, // balanced 1 → flipV
      priority: priorityRaw,
      w,
      h,
    });
  }
  return sprites;
}

/**
 * Sample one pixel from a sprite at screen offset (dy, dx) relative to sprite origin.
 * Returns ABGR colour or -1 if transparent.
 */
function spriteSample(mem: Int16Array, sp: SpriteInfo, dy: number, dx: number): number {
  let row = dy;
  let col = dx;
  // flipV / flipH: reflect within the sprite bounds
  if (sp.flipV) row = sp.h - 1 - row;
  if (sp.flipH) col = sp.w - 1 - col;

  // Determine which tile and row/col within tile for multi-tile sprites
  let tileIdx = sp.tileIdx;
  const tileRow = Math.floor(row / TILE_PX);
  const tileCol = Math.floor(col / TILE_PX);
  const rowInTile = row % TILE_PX;
  const colInTile = col % TILE_PX;

  if (sp.w === 18 && sp.h === 18) {
    // 2×2 tile grid: t, t+1 (top row L/R), t+2, t+3 (bottom row L/R)
    tileIdx = tileIdx + tileRow * 2 + tileCol;
  } else if (sp.h === 18) {
    // 1×2 tall: t (top 9 rows), t+1 (bottom 9 rows)
    tileIdx = tileIdx + tileRow;
  }
  // 9×9: single tile, no adjustment

  if (tileIdx < -243 || tileIdx > 242) return -1;
  const patternAddr = PATTERN_BASE + TRYTE_MAX + tileIdx * TILE_PX;
  const rowTryte = mem[patternAddr + rowInTile]!;
  const p = tilePixel(rowTryte, colInTile);
  if (p < 0) return -1;
  return paletteColor(mem, sp.palIdx, p as 0 | 1);
}

/**
 * Compute one complete 162×162 game frame as a flat ABGR Uint32Array.
 * Pure function: reads VRAM, OAM, palette, and scroll/hide/backdrop registers
 * from `mem`/`peek` and returns the pixel data without touching the DOM.
 */
export function sampleGameFrame(mem: Int16Array, peek: (addr: number) => number): Uint32Array {
  const px = new Uint32Array(GAME_W * GAME_H);

  const backdrop = tribyteColorABGR(peek(REG_BACKDROP));
  const scrollBG0X = norm(peek(REG_BG0_SCX));
  const scrollBG0Y = norm(peek(REG_BG0_SCY));
  const scrollBG1X = norm(peek(REG_BG1_SCX));
  const scrollBG1Y = norm(peek(REG_BG1_SCY));
  const hideMask = tritsRaw(peek(REG_HIDE_MASK));
  const showBG0 = hideMask[0]! === 1; // balanced 0 (unbal 1) = visible
  const showBG1 = hideMask[1]! === 1;
  const showSprites = hideMask[2]! === 1;

  // Collect all non-hidden sprites once (ordered by OAM index for priority)
  const allSprites = showSprites ? collectSprites(mem) : [];

  for (let y = 0; y < GAME_H; y++) {
    // Per-scanline sprite culling: keep first MAX_SPRITES_PER_LINE that overlap this row
    const lineSprites: SpriteInfo[] = [];
    for (const sp of allSprites) {
      if (lineSprites.length >= MAX_SPRITES_PER_LINE) break;
      if (y >= sp.y && y < sp.y + sp.h) lineSprites.push(sp);
    }

    for (let x = 0; x < GAME_W; x++) {
      let color = backdrop;

      // BG0
      if (showBG0) {
        const vx = ((x + scrollBG0X) % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
        const vy = ((y + scrollBG0Y) % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
        const c = sampleBG(mem, BG0_MAP_BASE, vx, vy);
        if (c >= 0) color = c;
      }

      // BG1
      if (showBG1) {
        const vx = ((x + scrollBG1X) % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
        const vy = ((y + scrollBG1Y) % MAP_SIZE + MAP_SIZE) % MAP_SIZE;
        const c = sampleBG(mem, BG1_MAP_BASE, vx, vy);
        if (c >= 0) color = c;
      }

      // Behind-BG sprites (priority balanced 1)
      for (const sp of lineSprites) {
        if (sp.priority !== 1) continue;
        const dx = x - sp.x;
        if (dx < 0 || dx >= sp.w) continue;
        const c = spriteSample(mem, sp, y - sp.y, dx);
        if (c >= 0) color = c;
      }

      // Front sprites (priority balanced 0)
      for (const sp of lineSprites) {
        if (sp.priority !== 0) continue;
        const dx = x - sp.x;
        if (dx < 0 || dx >= sp.w) continue;
        const c = spriteSample(mem, sp, y - sp.y, dx);
        if (c >= 0) color = c;
      }

      px[y * GAME_W + x] = color;
    }
  }

  return px;
}

/**
 * Render one complete 162×162 game frame into `out` (a 162×162 offscreen canvas).
 * Reads VRAM, OAM, palette, and scroll/hide/backdrop registers directly from `mem`.
 */
export function renderGameFrame(
  out: HTMLCanvasElement,
  mem: Int16Array,
  peek: (addr: number) => number,
): void {
  const frame = sampleGameFrame(mem, peek);
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(GAME_W, GAME_H);
  new Uint32Array(img.data.buffer).set(frame);
  ctx.putImageData(img, 0, 0);
}
