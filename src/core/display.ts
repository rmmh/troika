// Display framebuffer geometry and the software display-enable control.
//
// The framebuffer is the first nine memory pages (0-8), a row-major 81x81
// grid of trytes (see display.txt). The debugger normally shows memory as a
// page-tiled map; software opts the top-left region into a true framebuffer
// view by writing the DISPLAY_ON signature to the control register.
//
// Game mode (DMG) uses all 9 VRAM pages for a tile+sprite GPU pipeline
// outputting a 162x162 pixel composited image; see gameRenderer.ts.

import { fromTribbles, TRYTE_MAX } from './tryte';

/** Framebuffer base address (page 0, tribble AAA). */
export const VRAM_BASE = fromTribbles('AAA'); // -9841
export const VRAM_COLS = 81;
export const VRAM_ROWS = 81;
export const VRAM_SIZE = VRAM_COLS * VRAM_ROWS; // 6561

/**
 * Display-enable control register: the '_' register at address 0 (tribble
 * ___). It is otherwise unused (address 0 is an addressing-mode tribble, not
 * a general register), so it doubles as a one-tryte video-mode latch.
 *
 *   W Z DPN   ; enable the framebuffer view  (Z reads 0, so writes to addr 0)
 *   W Z DP_   ; disable it
 *   W Z DMG   ; enable game mode (tile/sprite compositor)
 */
export const DISPLAY_CTRL = fromTribbles('___'); // 0
export const DISPLAY_ON = fromTribbles('DPN'); // -7208: raw framebuffer enabled
export const DISPLAY_OFF = fromTribbles('DP_'); // -7209: framebuffer disabled
export const DISPLAY_GAME = fromTribbles('DMG'); // -7324: game mode (tile+sprite GPU)

/** True when software has latched the raw framebuffer view on. */
export function displayEnabled(read: (addr: number) => number): boolean {
  return read(DISPLAY_CTRL) === DISPLAY_ON;
}

/** True when game mode (tile/sprite compositor) is active. */
export function gameEnabled(read: (addr: number) => number): boolean {
  return read(DISPLAY_CTRL) === DISPLAY_GAME;
}

// --- Game mode MMIO register addresses (device O, _OA.._OZ) ---
export const REG_BG0_SCX = 41; // _OA: BG0 scroll X (mod 243)
export const REG_BG0_SCY = 42; // _OB: BG0 scroll Y
export const REG_BG1_SCX = 43; // _OC: BG1 scroll X
export const REG_BG1_SCY = 44; // _OD: BG1 scroll Y
export const REG_SCANLINE = 45; // _OE: current scanline 0..242 (read-only)
export const REG_SCANLINE_CMP = 46; // _OF: scanline compare trigger
export const REG_BACKDROP = 47; // _OG: backdrop colour tryte
export const REG_HIDE_MASK = 48; // _OH: layer hide mask (trit 0=BG0, 1=BG1, 2=sprites)
export const REG_PAD1 = 51; // _OK: gamepad 1 (read-only)
export const REG_PAD2 = 52; // _OL: gamepad 2 (read-only)

// --- Game mode VRAM layout (addresses) ---
export const PATTERN_BASE = fromTribbles('DAA'); // -7654: tile t at PATTERN_BASE + 9*t
export const BG0_MAP_BASE = fromTribbles('GAA'); // -5467: 27x27 BG0 tilemap
export const BG1_MAP_BASE = fromTribbles('HAA'); // -4738: 27x27 BG1 tilemap
export const OAM_Y_BASE = fromTribbles('IAA'); // -4009: sprite y[81]
export const OAM_X_BASE = fromTribbles('IDA'); // -3928: sprite x[81]
export const OAM_TILE_BASE = fromTribbles('IGA'); // -3847: sprite tile[81]
export const OAM_ATTR_BASE = fromTribbles('IJA'); // -3766: sprite attr[81]
export const PALETTE_BASE = fromTribbles('IMA'); // -3685: 27 palettes × 2 colours

/** Convert a tryte value to a packed ABGR Uint32 (little-endian) for canvas ImageData. */
export function tribyteColorABGR(v: number): number {
  const t = v + TRYTE_MAX; // 0..19682
  const b = t % 27;
  const g = Math.floor(t / 27) % 27;
  const r = Math.floor(t / 729);
  const u = (x: number) => Math.round((x * 255) / 26);
  return (0xff000000 | (u(b) << 16) | (u(g) << 8) | u(r)) >>> 0;
}
